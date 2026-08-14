# Adventure Nepal

A community-run, non-commercial platform covering every kind of adventure in Nepal — trekking, biking, motorcycle routes, bungee, paragliding, and more. Map layer, wiki-style article layer, and Strava-style trip/social layer, unified under one contributor account.

- **Project overview (for anyone, non-technical)**: [docs/index.md](docs/index.md) — also published via GitHub Pages once enabled (see below).
- **Technical / architecture reference (for developers and AI agents)**: [CLAUDE.md](CLAUDE.md).

## Repo layout

A monorepo with three apps, run together via Docker Compose:

- `apps/api` — NestJS backend (Postgres + PostGIS via Prisma)
- `apps/admin` — React + Vite + Refine + Ant Design admin dashboard
- `apps/public` — TanStack Start (SSR) public site
- `cli/` — a bash ops CLI for docker-compose lifecycle, seeding, and migrations (see `cli/README.md`)

## Quickstart (local dev)

Requires only Docker.

```sh
cp .env.example .env   # fill in Google OAuth credentials, JWT secrets, etc.
docker-compose up
```

This starts Postgres/PostGIS, the API, the admin app, and the public app together, with code bind-mounted for live reload. See `CLAUDE.md` for environment variables, architecture, and conventions in detail.

## Publishing `docs/` to GitHub Pages

`docs/index.md` is set up to render via Jekyll (`docs/_config.yml`). To go live, enable Pages in the repo's **Settings → Pages**, set the source to the `main` branch (or your default branch) and the `/docs` folder — this is a one-time manual step in GitHub's UI, not something automated by the files in this repo.
