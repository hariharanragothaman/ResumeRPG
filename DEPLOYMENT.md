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
| `GITHUB_TOKEN` | Recommended | GitHub PAT for higher API rate limits (5K/hr vs 60/hr anonymous) |
| `PORT` | Auto | Railway sets this |
| `VITE_PUBLIC_SITE_URL` | Recommended | Canonical site URL **without trailing slash**, e.g. `https://resumerpg.app`. Set before `npm run build` so QR codes, README badge snippets, and OG meta tags use the right domain. |
| `PUBLIC_SITE_URL` | Optional | Same as above for **server-rendered** PNG card footer. If unset, defaults to `https://resumerpg.app`. |
| `RATE_LIMIT_GENERATE` | Optional | Default `10` requests/hour/IP for resume parse + GitHub card API |
| `RATE_LIMIT_SHARE` | Optional | Default `30` shares/hour/IP |

## 3. Build and start

Railway should match [railway.json](railway.json):

- Install: Nixpacks runs `npm ci`  
- Build: `npm run build` only (see [railway.json](./railway.json); avoid duplicating `npm ci` — it conflicts with Nixpacks' Docker cache mount)  
- Start: `NODE_ENV=production node server/index.js`  

The production server serves the Vite `dist/` folder, handles `/api/*` routes, serves `/:username/badge.svg` and `/:username/card.png`, injects OG meta tags per route, and falls back to the SPA for all other paths.

## 4. Seed the database (recommended)

After deploying and verifying the app works, seed the database locally for realistic percentile rankings:

```bash
# Run locally with your .env credentials
npm run seed:small     # 1,000 users (~25 min) — good for initial testing
npm run seed           # 10,000 users (~4 hours) — production-ready percentiles
```

The seed script uses the GitHub Search API to discover top developers, fetches their profiles, generates cards with the same deterministic logic as the server, and batch-upserts into Supabase. Safe to re-run (upserts on conflict).

## 5. Health check

`GET /api/health` should return JSON including:

- `status: "ok"`
- `hasSupabase: true` in production
- `githubCards: "database"` when Supabase is configured
- `githubToken: true` if `GITHUB_TOKEN` is set

## 6. Social previews

The server automatically injects `og:title`, `og:description`, `og:image`, and `twitter:card` meta tags for `/:username` routes. When someone shares a card link on Twitter, Slack, or Discord, the preview shows the card image from `/:username/card.png`.

For non-card routes (`/`, `/privacy`, `/share/:id`), default site-level OG tags are served.

Test with: `curl https://yoursite.com/torvalds | grep og:image`

## 7. Legacy routes

Old `/gh/:username/badge.svg` and `/gh/:username/card.png` paths return **301 redirects** to `/:username/badge.svg` and `/:username/card.png`. Existing README badge embeds keep working.

## 8. Custom domain

Point DNS to Railway, then add the exact `https://` origin(s) to `ALLOWED_ORIGINS`.

## 9. Node version

Use **Node 20+** (`package.json` `engines`). Required for `sharp` (PNG card images).
