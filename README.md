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
        RL[Rate Limiter<br/>5 req/IP/hr]
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
    participant API as api.ts / github.ts
    participant AI as Claude / OpenAI / GitHub
    participant S as storage.ts

    U->>HP: Upload PDF / paste text / enter GitHub username
    HP->>API: parseResumeClientSide() or fetchGitHub()
    API->>AI: Send resume text or fetch profile
    AI-->>API: Raw JSON response
    API->>API: normalizeCharacter() — clamp stats, validate class/rarity
    API-->>HP: CharacterSheet object
    HP->>S: saveCharacter() → localStorage
    HP->>HP: Render HolographicCard (front + back)
    U->>HP: Click Export
    HP->>HP: exportTradingCard() → Canvas → PNG download
```

## Features

| Feature | Description |
|---------|-------------|
| **AI Resume Parsing** | Claude Opus 4.6 or GPT-4.1 converts resume text into a structured RPG character |
| **GitHub Mode** | Generate a character from any GitHub username — repos, languages, stars, followers map to stats |
| **5 Visual Themes** | Dark Fantasy, Cyberpunk, Pixel Art, Anime, Corporate — each with unique fonts, colors, and particle effects |
| **3D Holographic Card** | Mouse-tracking tilt with holographic shimmer, click to flip between front (stats) and back (lore/inventory) |
| **Trading Card Export** | 750×1050 PNG with stats, skills, QR code — sized for physical printing |
| **Gallery** | All generated characters saved to localStorage with load/delete |
| **Compare Mode** | Side-by-side radar chart comparison of two characters |
| **Rate Limiting** | 5 generations/IP/hour on server endpoints to prevent API cost abuse |
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
│   └── index.js              # Express API (rate limiting, Claude proxy, share store)
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
│   │   ├── github.ts          # GitHub profile → character conversion
│   │   ├── pdf.ts             # Client-side PDF extraction via pdf.js
│   │   ├── share.ts           # QR generation, share encoding
│   │   └── storage.ts         # localStorage persistence
│   ├── pages/
│   │   ├── HomePage.tsx       # Main app — tabs, theme picker, generation flow
│   │   └── SharePage.tsx      # Shared character viewer
│   └── types/
│       └── character.ts       # TypeScript interfaces (CharacterSheet, StatBlock, etc.)
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

No server API key? The app falls back to "bring your own key" mode — enter an Anthropic or OpenAI key in the UI. Or use GitHub mode, which needs no key at all.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite + Express API together |
| `npm run build` | Production client build (`tsc -b && vite build`) |
| `npm run preview` | Preview built client |
| `npm run lint` | ESLint |

## Tech Stack

**Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 3, Recharts, pdf.js (CDN)
**Backend:** Express, express-rate-limit, Anthropic SDK, pdf-parse, multer
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
