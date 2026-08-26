# Hipppie

<sub>Codename — the brand name isn't decided yet. Rename by updating `app.name`/`app.tagline`/`app.description` in `apps/api/src/settings/settings.constants.ts` (the live app's single source of truth) and `docs/_config.yml`'s `title` (the separate, static GitHub Pages site) once it is.</sub>

A community-run, non-commercial platform covering every kind of adventure in Nepal — trekking, biking, motorcycle routes, bungee, paragliding, and more. Map layer, wiki-style article layer, and Strava-style trip/social layer, unified under one contributor account.

- **Project overview (for anyone, non-technical)**: [docs/index.md](docs/index.md) — also published via GitHub Pages once enabled (see below).
- **Technical / architecture reference (for developers and AI agents)**: [CLAUDE.md](CLAUDE.md).

## Repo layout

A monorepo. `apps/api`/`apps/admin`/`apps/public` run together via Docker Compose; `apps/mobile` runs on the host instead (see below):

- `apps/api` — NestJS backend (Postgres + PostGIS via Prisma)
- `apps/admin` — React + Vite + Refine + Ant Design admin dashboard
- `apps/public` — TanStack Start (SSR) public site
- `apps/mobile` — Expo/React Native app (iOS/Android). Not yet published to the App Store/Play Store — see `MOBILE_PLAN.md` for what's built and what's left (EAS Build/Submit, an Apple Developer account, store listings).
- `packages/api-types` — API response/request shapes shared by `apps/mobile` (and, in principle, any future non-web client) so it isn't a third hand-maintained copy of every endpoint's shape.
- `cli/` — a bash ops CLI for docker-compose lifecycle, seeding, and migrations (see `cli/README.md`)

## Quickstart (local dev)

Requires only Docker.

```sh
cp .env.example .env   # fill in Google OAuth credentials, JWT secrets, etc.
docker-compose up
```

This starts Postgres/PostGIS, the API, the admin app, and the public app together, with code bind-mounted for live reload. See `CLAUDE.md` for environment variables, architecture, and conventions in detail.

`apps/mobile` isn't part of this — React Native can't run meaningfully in Docker (the iOS Simulator needs a macOS host with Xcode, the Android emulator needs host virtualization). Run `docker-compose up` first for the API, then separately `cd apps/mobile && cp .env.example .env` (fill in your LAN IP so a physical device/simulator can reach the containerized API) and `pnpm start` — see `MOBILE_PLAN.md` for the full setup and `apps/mobile/.env.example` for what each variable is for.

## Publishing `docs/` to GitHub Pages

`docs/index.md` is set up to render via Jekyll (`docs/_config.yml`). To go live, enable Pages in the repo's **Settings → Pages**, set the source to the `main` branch (or your default branch) and the `/docs` folder — this is a one-time manual step in GitHub's UI, not something automated by the files in this repo.
