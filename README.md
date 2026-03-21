# ResumeRPG

**Résumé in → RPG character sheet out.** MVP: PDF or pasted text, Claude parses into stats, class, skill tree, inventory, and quest log. Publish a shareable URL (in-memory for dev) and preview a trading-card layout with QR.

## Requirements

- **Node.js 20+** (recommended; several dependencies enforce it)

## Quick start

```bash
npm install
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env for real parsing; omit for demo output
npm run dev
```

- **Web:** http://localhost:5173  
- **API:** http://127.0.0.1:8787 (proxied as `/api/*` from Vite)

## Scripts

| Script        | Description                          |
| ------------- | ------------------------------------ |
| `npm run dev` | Vite + API together                  |
| `npm run build` | Production client build            |
| `npm run preview` | Preview built client               |

## Roadmap (from product vision)

- LinkedIn OAuth + structured import  
- Pixi/HTML Canvas pixel avatar from `pixelArtPrompt` (or image model pipeline)  
- Print-ready 2.5×3.5" export (PNG/PDF) at 300 DPI  
- Supabase (or similar) for durable shares, auth, and “rarity vs cohort”  
- Public compare links for recruiters  

## License

Private / TBD.
