# adventure

"OpenStreetMap + Wikipedia + Strava, for adventure in Nepal" — a community-run, non-commercial platform for discovering, planning, and logging outdoor adventures (trekking, biking, motorcycle routes, paragliding, and more) across Nepal. No bookings, no commission, no pay-to-rank, and no paywalls: success is measured by the coverage and accuracy of Nepal's adventure information, not revenue.

The product combines three inherited layers under one contributor account. Geodata (trails and spots as editable map data, OSM-style), articles (per-adventure info pages with full revision history, Wikipedia-style), and activity (logged trips, trip reports, kudos, and clubs, Strava-style). The core pillars are Discover (a map-first browse experience), Plan (day-by-day itineraries that flex per activity type), and Connect (a free guide directory, including license verification for Nepal's legally restricted trekking regions like Annapurna, Manaslu, and Upper Mustang).

## Structure

This is an npm-workspaces monorepo. apps/public is the community-facing site, built with TanStack Start, React, Leaflet for maps, and i18next for localization. apps/admin is the internal admin panel, built with React, Vite, Refine, and Ant Design. apps/api is the backend, built with NestJS and Prisma against PostgreSQL with the PostGIS extension for geodata. cli holds an ops CLI, written as a bash script, for deployment and maintenance tasks.

## Running locally

The project is Docker-first. Copy .env.example to .env, then run docker compose up to start Postgres/PostGIS, the API, and both frontends together. CLAUDE.md tracks current build status and locked architecture decisions, and SUMMARY.md has the full product spec.

## Status

Actively developed, pre-launch. Deployed via Docker images built in CI and served behind Caddy.
