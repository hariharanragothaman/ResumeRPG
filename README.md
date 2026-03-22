# ⚔️ ResumeRPG

**Transform your resume into a legendary RPG character card.**

Upload a PDF, paste text, or enter a GitHub username — ResumeRPG uses AI to parse your experience into an interactive character sheet with stats, skills, inventory, quests, and a class assignment. Export a physical trading card PNG, share via QR code, or compare two characters side-by-side.

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Client["Browser (React + Vite)"]
        UI[HomePage Tabs]
        PDF[pdf.js CDN]
        GH[GitHub API]
        CS[Client-Side AI Call]
        LS[localStorage / sessionStorage]
        CE[Canvas Export]
    end

    subgraph Server["Express API"]
        RL[Rate Limiter<br/>10 gen/hr]
        EP["/api/parse-resume-text<br/>/api/parse-resume"]
        SH["/api/share"]
        ST["/api/status"]
    end

    subgraph AI["AI Providers"]
        CL[Anthropic Claude]
        OA[OpenAI GPT-4.1]
    end

    UI -->|PDF upload| PDF
    UI -->|GitHub username| GH
    UI -->|resume text| CS
    UI -->|resume text| EP
    CS -->|direct from browser| CL
    CS -->|direct from browser| OA
    EP --> RL --> CL
    UI --> CE -->|PNG download| User((User))
    UI --> LS
    UI --> SH
    ST -->|hasApiKey?| UI

    style Client fill:#0c0c1d,stroke:#a855f7,color:#f1f5f9
    style Server fill:#111128,stroke:#3b82f6,color:#f1f5f9
    style AI fill:#1a0a2e,stroke:#f59e0b,color:#f1f5f9
```

### Two API Key Paths

```mermaid
flowchart LR
    Start([User opens app]) --> Check{Server has<br/>ANTHROPIC_API_KEY?}
    Check -->|Yes| Proxy["Calls go through<br/>Express → Claude"]
    Check -->|No| BYOK["User enters own key<br/>(sessionStorage)"]
    BYOK --> Direct["Browser calls<br/>Anthropic/OpenAI directly"]
    Proxy --> Card([Character Card])
    Direct --> Card

    style Start fill:#0c0c1d,stroke:#a855f7,color:#f1f5f9
    style Card fill:#0c0c1d,stroke:#22c55e,color:#f1f5f9
```

### Component Tree

```mermaid
graph TD
    App --> Layout
    Layout --> Starfield
    App --> HomePage
    App --> SharePage

    HomePage --> ThemePicker["Theme Picker<br/>(5 themes)"]
    HomePage --> Tabs["Tabs: Generate / Gallery / Compare"]

    Tabs --> Generate
    Tabs --> GalleryView
    Tabs --> CompareView

    Generate --> InputMode{"Input Mode"}
    InputMode --> Resume["PDF Upload + Text Paste"]
    InputMode --> GitHub["GitHub Username"]
    Generate --> HolographicCard
    HolographicCard --> CardFront
    HolographicCard --> CardBack

    CardFront --> Particles
    CardFront --> StatBar
    CompareView --> RadarChart["Recharts RadarChart"]
    CompareView --> CardFront2[CardFront x2]

    style App fill:#0c0c1d,stroke:#a855f7,color:#f1f5f9
    style HolographicCard fill:#1a0a2e,stroke:#f59e0b,color:#f1f5f9
```

### Data Flow: Character Generation

```mermaid
sequenceDiagram
    participant U as User
    participant HP as HomePage
    participant API as api.ts
    participant AI as Claude / OpenAI
    participant S as storage.ts

    U->>HP: Upload PDF or paste resume text
    HP->>API: parseResumeText() or parseResumeClientSide()
    API->>AI: Send resume text
    AI-->>API: Raw JSON response
    API->>API: normalizeCharacter() — clamp stats, validate class/rarity
    API-->>HP: CharacterSheet object
    HP->>S: saveCharacter() → localStorage
    HP->>HP: Render HolographicCard (front + back)
    U->>HP: Click Export
    HP->>HP: exportTradingCard() → Canvas → PNG download
```

```mermaid
sequenceDiagram
    participant U as User
    participant HP as HomePage
    participant GH as GitHubCardPage
    participant SRV as Express /api/gh
    participant DB as Supabase

    U->>HP: Enter GitHub username
    HP->>GH: navigate to /gh/username
    GH->>SRV: GET /api/gh/username
    SRV->>DB: Cache + percentile stats
    SRV-->>GH: CharacterSheet + percentiles
    GH->>GH: HolographicCard, badges, duel link
```

## Features

| Feature | Description |
|---------|-------------|
| **AI Resume Parsing** | Claude Opus 4.6 or GPT-4.1 converts resume text into a structured RPG character |
| **GitHub cards** | `/gh/:username` — server-built card from public API data (deterministic stats), Supabase cache, percentile rankings, README SVG badge, PNG preview, duel at `/gh/:user/vs/:other`. Homepage GitHub tab navigates here. |
| **5 Visual Themes** | Dark Fantasy, Cyberpunk, Pixel Art, Anime, Corporate — each with unique fonts, colors, and particle effects |
| **3D Holographic Card** | Mouse-tracking tilt with holographic shimmer, click to flip between front (stats) and back (lore/inventory) |
| **Trading Card Export** | 750×1050 PNG with stats, skills, QR code — sized for physical printing |
| **Gallery** | All generated characters saved to localStorage with load/delete |
| **Compare Mode** | Side-by-side radar chart comparison of two characters |
| **Rate Limiting** | 10 gen/hr + 30 share/hr per IP (configurable via env vars) |
| **Bring Your Own Key** | Client-side key stored in sessionStorage, cleared on tab close, calls go direct to provider |

## Power Profile Stats

| Stat | What it measures |
|------|-----------------|
| **IMPACT** | Leadership, team size, business outcomes, scope of responsibility |
| **CRAFT** | Technical depth, education, publications, certifications |
| **RANGE** | Breadth of skills, languages, frameworks, cross-domain versatility |
| **TENURE** | Years of experience, longevity, career consistency |
| **VISION** | Strategic thinking, architecture decisions, domain expertise |
| **INFLUENCE** | Community presence, speaking, open source, awards |

## Project Structure

```
ResumeRPG/
├── server/
│   ├── index.js              # Express — CORS, rate limit, Claude proxy, share store, GitHub card API, badge/card.png routes, static
│   └── lib/
│       ├── github-cards.js   # GitHub fetch, deterministic character, Supabase cache, percentiles
│       ├── badge.js          # SVG badges for README embeds
│       └── card-image.js     # PNG card image (sharp) for social previews
├── supabase/
│   └── migrations/
│       ├── 001_create_cards.sql   # Shared resume cards table
│       ├── 002_github_cards.sql   # GitHub-sourced cards + percentile RPC
│       └── 003_increment_rpc.sql  # access_count increment helper
├── src/
│   ├── components/
│   │   ├── CardFront.tsx      # Front face — avatar, stats, skills, QR
│   │   ├── CardBack.tsx       # Back face — lore, inventory, quests, boss battles
│   │   ├── HolographicCard.tsx# 3D tilt + flip wrapper
│   │   ├── CompareView.tsx    # Radar chart + side-by-side cards
│   │   ├── GalleryView.tsx    # Saved characters list
│   │   ├── StatBar.tsx        # Animated stat bar (theme-aware)
│   │   ├── Particles.tsx      # Rising particle effects
│   │   ├── Starfield.tsx      # Background star animation
│   │   └── Layout.tsx         # Shell — fonts, animations, theme background
│   ├── lib/
│   │   ├── api.ts             # AI provider calls, system prompt, normalizer
│   │   ├── config.ts          # Themes, class/rarity config, stat names
│   │   ├── export.ts          # Canvas trading card renderer
│   │   ├── pdf.ts             # Client-side PDF extraction via pdf.js
│   │   ├── share.ts           # QR generation, share encoding
│   │   └── storage.ts         # localStorage persistence
│   ├── pages/
│   │   ├── HomePage.tsx       # Main app — tabs, theme picker, resume + link to GitHub card
│   │   ├── GitHubCardPage.tsx # Public GitHub card + percentiles + embed snippet
│   │   ├── GitHubComparePage.tsx # Duel / radar compare
│   │   ├── SharePage.tsx      # Shared character viewer
│   │   └── PrivacyPage.tsx    # Privacy policy
│   └── types/
│       └── character.ts       # TypeScript interfaces (CharacterSheet, StatBlock, etc.)
├── railway.json               # Railway deployment config
└── package.json
```

## Quick Start

```bash
npm install
cp .env.example .env          # optionally add ANTHROPIC_API_KEY
npm run dev
```

- **Web:** http://localhost:5173
- **API:** http://127.0.0.1:8787 (proxied as `/api/*` from Vite)

Use **`npm run dev`** (not `dev:web` only) so `/api/*` and pages like `/gh/torvalds` work. **Supabase is optional locally:** GitHub cards are cached in server RAM without it (no percentile rankings until you add Supabase + migrations `002`/`003`).

**Node.js:** Use **v20+** (see `package.json` `engines`). Older versions (e.g. v19) may not load `sharp`; the API process will still start so `/api/gh` works, but `/gh/*/card.png` may return 503 until you upgrade Node.

No server AI key? Resume generation falls back to "bring your own key" in the UI. GitHub cards need **no** Anthropic/OpenAI key (stats are deterministic). Optional: `GITHUB_TOKEN` in `.env` for a higher GitHub API rate limit.

## Production Deployment (Railway)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full checklist (Supabase migrations **001 → 002 → 003**, env vars, health checks).

### Short version

1. **Supabase** — Run `001_create_cards.sql`, then `002_github_cards.sql`, then `003_increment_rpc.sql` in the SQL Editor.
2. **Railway** — Deploy from GitHub; build runs `npm ci && npm run build`, start runs `node server/index.js` ([railway.json](./railway.json)).
3. **Env vars** — At minimum: `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` (your real `https://` origins). Recommended: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, and **`VITE_PUBLIC_SITE_URL`** (set before build, e.g. `https://yourdomain.com`) so QR codes and README badge copy use the correct domain.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite + Express API together (dev) |
| `npm run build` | Production client build |
| `npm start` | Production server (serves built client + API) |
| `npm run lint` | ESLint |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | For real generation | — | Claude API key |
| `SUPABASE_URL` | For persistent links | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For persistent links | — | Supabase service role key (server only) |
| `ALLOWED_ORIGINS` | In production | — | Comma-separated allowed CORS origins |
| `NODE_ENV` | In production | — | Set to `production` |
| `PORT` | No | `8787` | Server port (Railway sets this automatically) |
| `VITE_PUBLIC_SITE_URL` | Recommended (prod build) | — | Canonical `https://` site URL for QR + README snippets (no trailing slash) |
| `PUBLIC_SITE_URL` | Optional | `https://resumerpg.app` | Server PNG card footer (`/gh/*/card.png`) |
| `GITHUB_TOKEN` | Optional | — | GitHub PAT for higher API rate limits on `/api/gh` |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Model to use |
| `RATE_LIMIT_GENERATE` | No | `10` | Max generations + GitHub card API calls per IP per hour |
| `RATE_LIMIT_SHARE` | No | `30` | Max shares per IP per hour |

## Tech Stack

**Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 3, Recharts, pdf.js (CDN)
**Backend:** Express, Anthropic SDK, Supabase, pdf-parse, multer
**AI:** Claude Opus 4.6 (Anthropic) / GPT-4.1 (OpenAI)
**Storage:** localStorage (characters), sessionStorage (API keys), Supabase Postgres (shared cards)

## Roadmap

- LinkedIn OAuth + structured import
- Pixi/Canvas pixel avatar renderer
- Print-ready 2.5×3.5" export at 300 DPI
- Supabase auth and cohort-based rarity
- Public compare links for recruiters

## License

Private / TBD.
