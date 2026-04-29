# Deploy

The dashboard deploys to Render via the [`render.yaml`](./render.yaml) blueprint at the repo root.

## One-time setup (Render web UI)

1. Open https://dashboard.render.com/
2. Click **New +** → **Blueprint**
3. Connect this repo (`indexing-co/kelpdao-hack-tracker`)
4. Render auto-detects `render.yaml`. Confirm it shows: `kelpdao-hack-tracker` (web service), runtime Node, rootDir `dashboard`, plan `starter`.
5. Apply blueprint. The service will start building.
6. **Set the `DATABASE_URL` secret** under the service's **Environment** tab. Use the **pooled** Neon URL (with `?sslmode=require&channel_binding=require`). The unpooled endpoint is only for the Indexing Co Postgres adapter; the dashboard's `pg` driver works fine on the pooler.
7. (Optional) Custom domain: under **Settings → Custom Domains**, add `observatory.indexing.co` (or whatever URL you want), then create a CNAME at your DNS provider pointing to the Render-provided target.

## After setup

- Pushes to `main` auto-deploy. Build takes ~2-3 min.
- Logs live at the service's **Logs** tab.
- Roll back from the **Events** tab if a deploy goes wrong.

## Plan note

`starter` is $7/month. No idle spin-down. If you want to start on free, change `plan: starter` → `plan: free` in `render.yaml` — the service will spin down after 15 min idle and cold-start in ~30s on next request. Free works for testing but not for a public-facing marketing surface.

## Stack notes

- **Runtime**: Node 20 (set via `NODE_VERSION`).
- **Package manager**: pnpm 10, activated via Corepack at build time.
- **Build**: `pnpm install --frozen-lockfile && pnpm build` runs from `dashboard/` (set via `rootDir`).
- **Start**: `pnpm start` runs `next start`.
- **Health check**: `GET /` (the dashboard's own root, which renders the headline panel).
- **DB pool**: app-side pool sized to 5 connections in `lib/db.ts`. Render free + Neon pooled handles this fine; if traffic grows, raise the pool max and bump the Render plan.

## What does NOT deploy via render.yaml

- The Indexing Co pipelines (filter, transformation, pipeline configs at `pipes/*/`) are deployed separately via curl against `app.indexing.co/dw`. See each pipe's README.
- The Snapshot poller runs on GitHub Actions (`.github/workflows/sync-snapshot.yml`), not Render.
