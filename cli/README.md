# adventure-cli

A terminal menu for running the adventure monorepo's docker-compose environments, database seed scripts, and basic ops commands (migrate deploy, image prune).

Plain bash — no build step, no compiler required, runs anywhere `bash`/`docker`/`npm`/`npx` are available.

## Run

```sh
./cli/adventure-cli.sh
```

or from inside `cli/`:

```sh
./adventure-cli.sh
```

It auto-detects the monorepo root by walking up from the current directory looking for `docker-compose.yml` + `apps/api/prisma/schema.prisma`, so it can be run from anywhere inside the checkout (or copied elsewhere and pointed at a checkout by `cd`-ing there first).

## Menu

Numbered menu, type the number and press enter. `b` goes back a level, `q` quits from anywhere.

- **Run Application** — Dev / Prod: up, down, restart, status, and per-service log following.
- **Seed Database** — all scripts under `apps/api/prisma/scripts`, plus `seed:all`.
- **Operational Commands** — `prisma migrate deploy`, `docker image prune`.

Destructive actions (`down`, `seed:all`, image prune) prompt for confirmation first.
