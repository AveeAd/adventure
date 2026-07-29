# Deployment

Companion to [ROADMAP.md](ROADMAP.md), whose "Deferred" section flagged hosting as "still local-only... revisit once there's something worth showing someone else." This is that revisit: a single-server, docker-compose-based deploy, kept as close as possible to the project's existing "everything runs in containers" philosophy rather than introducing a new orchestration platform.

## Architecture

One VPS runs five containers via `docker-compose.prod.yml`:

- **Caddy** — the only thing with ports open to the internet (80/443). Reverse-proxies each of the three domains to its container and handles TLS automatically (Let's Encrypt) just from having real domains in the `Caddyfile` — no separate certbot setup.
- **api** — compiled NestJS app (`node dist/main`), runs `prisma migrate deploy` on every start.
- **admin** — the Vite SPA build, served as static files by nginx.
- **public** — the TanStack Start SSR build, run via `apps/public/server.prod.mjs` (a small hand-written Node adapter — the framework's Vite build only emits a fetch handler, not a listener or static-file server; see that file's header comment for why).
- **db** — same `postgis/postgis` image as dev, but with a real password and no host-published port.

This is a different file from `docker-compose.yml` (dev), not an override — nearly everything differs: compiled builds instead of bind-mounted source + watch mode, and nothing but Caddy reachable from outside the server.

## One-time server setup

1. **Provision a VPS** (any provider — DigitalOcean, Hetzner, Linode, etc.) with Docker and the Compose plugin installed. Docker's official convenience script (`curl -fsSL https://get.docker.com | sh`) installs both.
2. **DNS**: point three A records at the server's IP — one each for the public site, admin, and API (e.g. `app.example.com`, `admin.example.com`, `api.example.com`). They must resolve *before* the first `docker compose up`, or Caddy's certificate issuance will fail.
3. **Firewall**: only open 22 (SSH), 80, and 443. Nothing else needs to be reachable — Postgres and the app containers aren't published to the host at all in `docker-compose.prod.yml`.
4. **Deploy SSH key**: generate a dedicated keypair for GitHub Actions to use (don't reuse your personal one):
   ```
   ssh-keygen -t ed25519 -f deploy_key -N ""
   ```
   Append `deploy_key.pub` to the target user's `~/.ssh/authorized_keys` on the server. Keep `deploy_key` (the private half) for the GitHub secret below.
5. **Clone the repo** on the server, at whatever path you'll use as `DEPLOY_PATH`:
   ```
   git clone <your-repo-url> /opt/adventure
   ```
6. **Production env file**: copy the template and fill in real values —
   ```
   cd /opt/adventure
   cp .env.production.example .env
   ```
   Generate `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` with `openssl rand -base64 48`. Use a real Postgres password (and keep `POSTGRES_PASSWORD` and the password embedded in `DATABASE_URL` in sync — they're read separately but must match). Set `VITE_API_URL` and the three `*_DOMAIN` vars to your real domains. **`.env` is gitignored — it never gets committed, and `git reset --hard` during deploys (see below) never touches it.**
7. **Google OAuth console**: add the production callback URL (`https://api.example.com/api/v1/auth/google/callback`) to the OAuth client's authorized redirect URIs — this is a manual step in Google Cloud Console, outside the repo.
8. **First boot**, run manually once to confirm everything comes up and Caddy issues certificates successfully:
   ```
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml logs -f caddy
   ```

## GitHub repo secrets

Add these under Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH user (whichever account owns `authorized_keys` above) |
| `DEPLOY_SSH_KEY` | The private half of the deploy keypair (`deploy_key`) |
| `DEPLOY_PATH` | Where the repo lives on the server, e.g. `/opt/adventure` |
| `DEPLOY_PORT` | Optional, only if SSH isn't on 22 |

## How it works day-to-day

`.github/workflows/deploy.yml` runs on every push to `main`: it SSHes in, hard-resets the deploy path to `origin/main`, and runs `docker compose -f docker-compose.prod.yml up -d --build`. Compose only rebuilds and restarts containers whose inputs actually changed, so most deploys are fast after the first one.

A few things worth knowing:

- **`git reset --hard`, not `git pull`** — guarantees the deploy path always matches `main` exactly, even if something was manually edited on the server. This is exactly why nothing should ever be hand-edited there except `.env` (which lives outside git).
- **No zero-downtime rollout.** `docker compose up -d --build` recreates changed containers in place — there's a brief gap while `api`/`public`/`admin` restart. Acceptable for a solo project without real traffic yet; revisit (e.g. a blue-green swap) if that changes.
- **Migrations run automatically** — the `api` container's start command always runs `prisma migrate deploy` before `node dist/main`, so schema changes ship with the same deploy as the code that needs them.
