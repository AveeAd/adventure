# apps/mobile

React Native / Expo client — see [`MOBILE_PLAN.md`](../../MOBILE_PLAN.md) at the repo root for the full plan and phase status, and [`CLAUDE.md`](../../CLAUDE.md)'s "Mobile" section for the current state.

Runs on the host, not in docker-compose (Expo dev builds need a macOS host with Xcode for iOS and host virtualization for the Android emulator). The rest of the stack (`db`, `api`, `admin`, `public`) still runs via `docker-compose up` from the repo root; this app talks to the API container over your machine's LAN IP.

## Setup

1. `cp .env.example .env` and fill in `EXPO_PUBLIC_API_URL` (your host's LAN IP, not `localhost`) and the Google client IDs.
2. From the repo root: `npm install` (installs all workspaces, including this one).
3. `npx expo start` from this directory, then open in a dev build (Expo Go can't load the native modules this app depends on — Google Sign-In, secure-store).
