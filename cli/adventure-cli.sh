#!/usr/bin/env bash
# A terminal menu for running the adventure monorepo's docker-compose
# environments, database seed scripts, and basic ops commands. Plain bash so
# it runs anywhere without a build step. See cli/README.md.
set -uo pipefail

# ---- repo root detection --------------------------------------------------

find_repo_root() {
    local dir
    dir="$(pwd)"
    for _ in 1 2 3 4 5 6; do
        if [[ -f "$dir/docker-compose.yml" && -f "$dir/apps/api/prisma/schema.prisma" ]]; then
            echo "$dir"
            return 0
        fi
        local parent
        parent="$(dirname "$dir")"
        [[ "$parent" == "$dir" ]] && break
        dir="$parent"
    done
    return 1
}

REPO_ROOT="$(find_repo_root)" || {
    echo "adventure-cli: could not locate adventure repo root (looked for docker-compose.yml + apps/api/prisma/schema.prisma) — run from within the adventure monorepo checkout" >&2
    exit 1
}
cd "$REPO_ROOT"

# ---- helpers ---------------------------------------------------------------

# Prints a numbered menu of $2.. under breadcrumb path $1, reads a choice
# into $CHOICE. Return codes: 0 = valid numbered choice, 1 = back ("b") or
# quit ("q", after exiting the process), 2 = invalid input (caller should
# just re-prompt, not treat it as "back").
menu() {
    local path="$1"; shift
    local -a options=("$@")
    echo
    echo "== $path =="
    local i=1
    for opt in "${options[@]}"; do
        printf '  %d) %s\n' "$i" "$opt"
        ((i++))
    done
    if [[ "$path" == "Adventure CLI" ]]; then
        echo "  q) quit"
    else
        echo "  b) back   q) quit"
    fi
    echo -n "> "
    if ! read -r CHOICE; then
        echo
        exit 0
    fi
    case "$CHOICE" in
        q) exit 0 ;;
        b) return 1 ;;
    esac
    if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || (( CHOICE < 1 || CHOICE > ${#options[@]} )); then
        echo "invalid choice"
        return 2
    fi
    return 0
}

confirm() {
    local prompt="$1"
    echo -n "$prompt [y/N] > "
    if ! read -r ans; then
        echo
        exit 0
    fi
    [[ "$ans" == "y" || "$ans" == "Y" ]]
}

# Runs a command, reporting success/failure the way the old TUI did, then
# waits for a keypress so the output doesn't fly by.
run_cmd() {
    local label="$1"; shift
    echo
    echo "--- running: $label ---"
    if "$@"; then
        echo "✓ $label succeeded"
    else
        echo "✗ $label failed (exit $?)"
    fi
    echo
    echo -n "press enter to continue "
    read -r _ || true
}

# ---- docker compose ---------------------------------------------------------

compose_file() {
    [[ "$1" == "prod" ]] && echo "docker-compose.prod.yml" || echo "docker-compose.yml"
}

services_for() {
    if [[ "$1" == "prod" ]]; then
        echo "db api admin public caddy"
    else
        echo "db api admin public"
    fi
}

logs_menu() {
    local path="$1" env="$2" file="$3" label="$4"
    local -a services
    read -ra services <<< "$(services_for "$env")"
    while true; do
        menu "$path" "${services[@]}"; local status=$?
        if [[ $status -eq 0 ]]; then
            local svc="${services[$((CHOICE - 1))]}"
            echo
            echo "--- following logs: $svc ($label) — ctrl+c to stop ---"
            docker compose -f "$file" logs -f --tail=200 "$svc"
        elif [[ $status -eq 1 ]]; then
            break
        fi
    done
}

env_menu() {
    local path="$1" env="$2" label="$3"
    local file; file="$(compose_file "$env")"
    while true; do
        menu "$path" "Up" "Down" "Restart" "Status (ps)" "Logs"; local status=$?
        if [[ $status -eq 0 ]]; then
            case "$CHOICE" in
                1)
                    if [[ "$env" == "prod" ]]; then
                        run_cmd "docker compose up -d --build" docker compose -f "$file" up -d --build
                    else
                        run_cmd "docker compose up -d" docker compose -f "$file" up -d
                    fi
                    ;;
                2)
                    if confirm "Are you sure you want to run: Down?"; then
                        run_cmd "docker compose down" docker compose -f "$file" down
                    fi
                    ;;
                3) run_cmd "docker compose restart" docker compose -f "$file" restart ;;
                4) run_cmd "docker compose ps" docker compose -f "$file" ps ;;
                5) logs_menu "$path > Logs" "$env" "$file" "$label" ;;
            esac
        elif [[ $status -eq 1 ]]; then
            break
        fi
    done
}

run_application_menu() {
    local path="$1"
    while true; do
        menu "$path" "Dev" "Prod"; local status=$?
        if [[ $status -eq 0 ]]; then
            case "$CHOICE" in
                1) env_menu "$path > Dev" "dev" "Dev" ;;
                2) env_menu "$path > Prod" "prod" "Prod" ;;
            esac
        elif [[ $status -eq 1 ]]; then
            break
        fi
    done
}

# ---- seed database -----------------------------------------------------------

# name|label|confirm(0/1) — single source of truth, mirrors the old Go slice.
SEED_SCRIPTS=(
    "seed:all|seed:all (runs 6 scripts in sequence)|1"
    "seed:locations|seed:locations|0"
    "seed:district-boundaries|seed:district-boundaries|0"
    "seed:master-data|seed:master-data|0"
    "seed:system-settings|seed:system-settings|0"
    "seed:dev-data|seed:dev-data|0"
    "backfill:contributions|backfill:contributions|0"
    "recompute:contributions|recompute:contributions|0"
)

seed_database_menu() {
    local path="$1"
    local -a labels=()
    for entry in "${SEED_SCRIPTS[@]}"; do
        IFS='|' read -r _ label _ <<< "$entry"
        labels+=("$label")
    done
    while true; do
        menu "$path" "${labels[@]}"; local status=$?
        if [[ $status -eq 0 ]]; then
            IFS='|' read -r name label needs_confirm <<< "${SEED_SCRIPTS[$((CHOICE - 1))]}"
            if [[ "$needs_confirm" == "1" ]] && ! confirm "Are you sure you want to run: $label?"; then
                continue
            fi
            # Runs inside the api container, not on the host: DATABASE_URL
            # (.env) points at the docker-compose network hostname `db`,
            # which only resolves inside the compose network, and nothing
            # here loads .env into the host shell either way.
            run_cmd "docker compose exec api npm run $name --workspace=apps/api" \
                docker compose exec api npm run "$name" --workspace=apps/api
        elif [[ $status -eq 1 ]]; then
            break
        fi
    done
}

# ---- operational commands ----------------------------------------------------

ops_menu() {
    local path="$1"
    while true; do
        menu "$path" "Migrate Deploy" "Docker Image Prune"; local status=$?
        if [[ $status -eq 0 ]]; then
            case "$CHOICE" in
                1)
                    # Same reasoning as Seed Database above - needs the
                    # container's DATABASE_URL, not the host's (nonexistent) one.
                    run_cmd "docker compose exec api npx prisma migrate deploy" \
                        docker compose exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
                    ;;
                2)
                    if confirm "Are you sure you want to run: Docker Image Prune?"; then
                        run_cmd "docker image prune -f" docker image prune -f
                    fi
                    ;;
            esac
        elif [[ $status -eq 1 ]]; then
            break
        fi
    done
}

# ---- root menu ---------------------------------------------------------------

while true; do
    if menu "Adventure CLI" "Run Application" "Seed Database" "Operational Commands"; then
        case "$CHOICE" in
            1) run_application_menu "Adventure CLI > Run Application" ;;
            2) seed_database_menu "Adventure CLI > Seed Database" ;;
            3) ops_menu "Adventure CLI > Operational Commands" ;;
        esac
    fi
done
