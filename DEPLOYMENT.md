# Production deployment checklist

Target stack: **Railway** (or any Node 20+ host) + **Supabase** + optional **custom domain**.

## 1. Supabase (required for production)

Run these **in order** in the Supabase SQL Editor:

1. `supabase/migrations/001_create_cards.sql` — shared resume card links  
2. `supabase/migrations/002_github_cards.sql` — GitHub cards, percentiles, stats view  
3. `supabase/migrations/003_increment_rpc.sql` — `increment_access_count` RPC  

If you already ran an **older** `002_github_cards.sql` and hit `round(double precision, integer) does not exist`, re-run only the `create or replace function public.recalc_percentiles()` block from the current `002` file in the SQL Editor (the fix is `::numeric` before `round`).

Without Supabase, the API falls back to **in-memory** storage. That is fine for a single local process; it is **not** suitable for multiple Railway instances or restarts (cards and GitHub cache are lost).

## 2. Railway (or host) environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | Yes | `production` |
| `SUPABASE_URL` | Yes (prod) | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Service role — **server only**, never expose to the browser |
| `ALLOWED_ORIGINS` | Yes | Comma-separated origins, e.g. `https://yourdomain.com,https://www.yourdomain.com` |
| `ANTHROPIC_API_KEY` | Recommended | Resume → character via Claude; without it, server returns demo / client BYOK |
| `GITHUB_TOKEN` | Recommended | GitHub PAT for higher `/api/gh` rate limits (5k/hr vs 60/hr anonymous) |
| `PORT` | Auto | Railway sets this |
| `VITE_PUBLIC_SITE_URL` | Recommended | Canonical site URL **without trailing slash**, e.g. `https://resumerpg.app`. Set before `npm run build` so QR codes and README badge snippets use the right domain. |
| `PUBLIC_SITE_URL` | Optional | Same as above for **server-rendered** PNG card footer (`/gh/*/card.png`). If unset, defaults to `https://resumerpg.app`. |
| `RATE_LIMIT_GENERATE` | Optional | Default `10` requests/hour/IP for resume parse + GitHub card API |
| `RATE_LIMIT_SHARE` | Optional | Default `30` shares/hour/IP |

## 3. Build and start

Railway should match [railway.json](railway.json):

- Build: `npm ci && npm run build`  
- Start: `NODE_ENV=production node server/index.js`  

The production server serves the Vite `dist/` folder and handles `/api/*`, `/gh/*/badge.svg`, and `/gh/*/card.png`.

## 4. Health check

`GET /api/health` should return JSON including:

- `status: "ok"`
- `hasSupabase: true` in production
- `githubCards: "database"` when Supabase is configured
- `githubToken: true` if `GITHUB_TOKEN` is set

## 5. Custom domain

Point DNS to Railway, then add the exact `https://` origin(s) to `ALLOWED_ORIGINS`.

## 6. Node version

Use **Node 20+** (`package.json` `engines`). Required for `sharp` (PNG card images).
