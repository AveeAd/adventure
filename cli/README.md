# adventure-cli

A terminal menu for running the adventure monorepo's docker-compose environments, database seed scripts, and basic ops commands (migrate deploy, image prune).

This is its own Go module, separate from the npm workspaces — it is not built or run through npm.

## Run

```sh
cd cli
go run .
```

## Build

```sh
cd cli
go build -o adventure-cli .
./adventure-cli
```

It auto-detects the monorepo root by walking up from the current directory looking for `docker-compose.yml` + `apps/api/prisma/schema.prisma`, so it can be run from `cli/` or after building the binary and moving it elsewhere inside the checkout.

## Menu

- **Run Application** — Dev / Prod: up, down, restart, status, and per-service log following.
- **Seed Database** — all scripts under `apps/api/prisma/scripts`, plus `seed:all`.
- **Operational Commands** — `prisma migrate deploy`, `docker image prune`.

Destructive actions (`down`, `seed:all`, image prune) prompt for confirmation first.
