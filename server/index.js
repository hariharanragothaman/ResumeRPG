import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import express from "express";
import multer from "multer";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  getOrCreateCard,
  getOrCreateCardMemory,
  getGlobalStats,
  startPeriodicRecalc,
} from "./lib/github-cards.js";
import { generateBadge, generateCardBadge } from "./lib/badge.js";
import { generateCardImage } from "./lib/card-image.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || process.env.API_PORT || 8787);
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const IS_PROD = process.env.NODE_ENV === "production";

// ─── Allowed origins ────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!IS_PROD) {
  ALLOWED_ORIGINS.push("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173");
}

// ─── Rate limiter (in-memory — fine for <500 users, swap to Redis later) ──
const rateBuckets = new Map();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_GENERATE = Number(process.env.RATE_LIMIT_GENERATE || 10);
const RATE_MAX_SHARE = Number(process.env.RATE_LIMIT_SHARE || 30);

function rateLimit(namespace, max) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
    const key = `${namespace}:${ip}`;
    const now = Date.now();
    let bucket = rateBuckets.get(key);

    if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
      bucket = { windowStart: now, count: 0 };
      rateBuckets.set(key, bucket);
    }

    bucket.count++;
    if (bucket.count > max) {
      return res.status(429).json({
        error: `Rate limit exceeded. Max ${max} requests per hour.`,
      });
    }

    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    next();
  };
}

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.windowStart < cutoff) rateBuckets.delete(key);
  }
}, 10 * 60 * 1000);

// ─── Supabase ───────────────────────────────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const memoryStore = new Map();

async function saveCard(id, character, ip) {
  if (supabase) {
    const { error } = await supabase.from("cards").insert({
      id,
      character,
      creator_ip: ip || null,
    });
    if (error) throw new Error(`DB insert failed: ${error.message}`);
  } else {
    memoryStore.set(id, { character, created_at: new Date().toISOString() });
  }
}

async function getCard(id) {
  if (supabase) {
    const { data, error } = await supabase
      .from("cards")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", id)
      .select("character")
      .single();
    if (error || !data) return null;
    return data.character;
  } else {
    const entry = memoryStore.get(id);
    return entry ? entry.character : null;
  }
}

// ─── Anthropic ──────────────────────────────────────────────────────
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ─── Character generation ───────────────────────────────────────────
const VALID_CLASSES = [
  "Frontend Sorcerer", "Backend Paladin", "DevOps Ranger", "Data Necromancer",
  "Fullstack Warlock", "Cloud Architect", "Security Sentinel", "ML Alchemist",
  "Embedded Ranger", "Mobile Bard", "Platform Engineer", "QA Monk",
];
const VALID_RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

const SYSTEM_PROMPT = `You are ResumeRPG, an AI that converts resumes into RPG character sheets. Given a resume, generate a JSON response with this EXACT structure (no markdown, no backticks, just raw JSON):
{"name":"Real name","title":"Job title","class":"One of: Frontend Sorcerer, Backend Paladin, DevOps Ranger, Data Necromancer, Fullstack Warlock, Cloud Architect, Security Sentinel, ML Alchemist, Embedded Ranger, Mobile Bard, Platform Engineer, QA Monk","level":<1-99>,"rarity":"Common|Uncommon|Rare|Epic|Legendary","xp_current":<num>,"xp_max":<num>,"stats":{"IMPACT":<1-20>,"CRAFT":<1-20>,"RANGE":<1-20>,"TENURE":<1-20>,"VISION":<1-20>,"INFLUENCE":<1-20>},"skills":["6-8 skills"],"inventory":[{"name":"item","type":"weapon|armor|artifact|scroll","rarity":"common|uncommon|rare|epic|legendary"}],"quests_completed":[{"name":"Quest","description":"desc"}],"boss_battles":[{"name":"Boss","status":"defeated"}],"guild":"Company","backstory":"2 sentences","tagline":"max 8 words","achievements":[]}
Stat definitions — score each 1-20:
  IMPACT: Leadership, team size managed, business outcomes driven, scope of responsibility
  CRAFT: Technical depth, education level, publications, patents, certifications, code quality
  RANGE: Breadth of skills, languages, frameworks, cross-domain versatility, adaptability
  TENURE: Years of experience, longevity at companies, career consistency, resilience
  VISION: Strategic thinking, architecture decisions, domain expertise, forward-looking initiatives
  INFLUENCE: Community presence, speaking, open source, mentoring, awards, industry recognition
Level guide: 1-2yrs=10-20, 3-5yrs=20-40, 5-10yrs=40-60, 10-15yrs=60-80, 15+=80-99. Be creative. Return ONLY valid JSON.`;

const DEMO_CHARACTER = {
  name: "Avery Vale", title: "Staff Engineer", class: "DevOps Ranger",
  level: 62, rarity: "Epic", xp_current: 7400, xp_max: 10000,
  stats: { IMPACT: 14, CRAFT: 17, RANGE: 12, TENURE: 18, VISION: 15, INFLUENCE: 11 },
  skills: ["Kubernetes", "Terraform", "Go", "AWS", "Observability", "CI/CD", "Python"],
  inventory: [
    { name: "Helm of SLOs (CKA Cert)", type: "artifact", rarity: "epic" },
    { name: "Mjölnir Migration Tool", type: "weapon", rarity: "legendary" },
    { name: "Cloak of Incident Response", type: "armor", rarity: "rare" },
    { name: "Scroll of Runbooks", type: "scroll", rarity: "uncommon" },
  ],
  quests_completed: [
    { name: "The Monolith Must Fall", description: "Decomposed a 500k-line monolith into 23 microservices" },
    { name: "The Great Cloud Migration", description: "Migrated 40+ services from bare metal to Kubernetes" },
    { name: "Pagerless Night", description: "Achieved 30 consecutive pager-free on-call nights" },
  ],
  boss_battles: [
    { name: "The Cascading Failure of 2021", status: "defeated" },
    { name: "Black Friday Traffic Hydra", status: "defeated" },
  ],
  guild: "Northwind Labs",
  backstory: "Forged in the fires of production incidents, Avery rose from junior deploy-button-clicker to architect of self-healing systems. Their weapon of choice: a Terraform plan so clean it makes senior engineers weep.",
  tagline: "Five nines or a blameless postmortem",
};

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function normalizeCharacter(raw) {
  const stats = raw.stats || {};
  return {
    name: String(raw.name || "Unknown Adventurer"),
    title: String(raw.title || "Professional"),
    class: VALID_CLASSES.includes(raw.class) ? raw.class : "Fullstack Warlock",
    level: clamp(Math.round(Number(raw.level) || 1), 1, 99),
    rarity: VALID_RARITIES.includes(raw.rarity) ? raw.rarity : "Common",
    xp_current: clamp(Math.round(Number(raw.xp_current) || 0), 0, 99999),
    xp_max: clamp(Math.round(Number(raw.xp_max) || 1000), 1, 99999),
    stats: {
      IMPACT: clamp(Math.round(Number(stats.IMPACT) || 10), 1, 20),
      CRAFT: clamp(Math.round(Number(stats.CRAFT) || 10), 1, 20),
      RANGE: clamp(Math.round(Number(stats.RANGE) || 10), 1, 20),
      TENURE: clamp(Math.round(Number(stats.TENURE) || 10), 1, 20),
      VISION: clamp(Math.round(Number(stats.VISION) || 10), 1, 20),
      INFLUENCE: clamp(Math.round(Number(stats.INFLUENCE) || 10), 1, 20),
    },
    skills: (Array.isArray(raw.skills) ? raw.skills : []).slice(0, 12).map(String),
    inventory: (Array.isArray(raw.inventory) ? raw.inventory : []).slice(0, 10).map((it, i) => ({
      name: String(it.name || `Item ${i + 1}`),
      type: ["weapon", "armor", "artifact", "scroll"].includes(it.type) ? it.type : "artifact",
      rarity: ["common", "uncommon", "rare", "epic", "legendary"].includes(it.rarity) ? it.rarity : "common",
    })),
    quests_completed: (Array.isArray(raw.quests_completed) ? raw.quests_completed : []).slice(0, 10).map((q) => ({
      name: String(q.name || "Quest"),
      description: String(q.description || ""),
    })),
    boss_battles: (Array.isArray(raw.boss_battles) ? raw.boss_battles : []).slice(0, 8).map((b) => ({
      name: String(b.name || "Boss"),
      status: "defeated",
    })),
    guild: String(raw.guild || "Freelance"),
    backstory: String(raw.backstory || "").slice(0, 500),
    tagline: String(raw.tagline || "").slice(0, 80),
  };
}

async function resumeTextToCharacter(text) {
  const trimmed = String(text || "").trim();
  if (trimmed.length < 40) {
    const err = new Error("Resume text too short to parse meaningfully.");
    err.status = 400;
    throw err;
  }
  if (!anthropic) {
    return { ...DEMO_CHARACTER, tagline: "Demo mode — add ANTHROPIC_API_KEY" };
  }
  const msg = await anthropic.messages.create({
    model: MODEL, max_tokens: 2000, system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Here is my resume:\n\n${trimmed.slice(0, 48000)}` }],
  });
  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text from model");
  let json;
  const raw = block.text.trim().replace(/```json|```/g, "").trim();
  try { json = JSON.parse(raw); } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Model did not return valid JSON");
    json = JSON.parse(m[0]);
  }
  return normalizeCharacter(json);
}

// ─── Express app ────────────────────────────────────────────────────
const app = express();
app.set("trust proxy", 1);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!IS_PROD && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error("CORS: origin not allowed"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "2mb" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function newShareId() { return randomBytes(9).toString("base64url"); }
function getClientIp(req) { return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown"; }

/** GitHub card: Supabase when configured, else in-memory (local dev). */
async function loadGitHubCard(username) {
  if (supabase) return getOrCreateCard(supabase, username);
  return getOrCreateCardMemory(username);
}

// ─── Routes ─────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!anthropic,
    hasSupabase: !!supabase,
    githubCards: supabase ? "database" : "memory",
    githubToken: !!process.env.GITHUB_TOKEN,
    node: process.version,
    uptime: Math.floor(process.uptime()),
  });
});

app.get("/api/status", (_req, res) => {
  res.json({ hasApiKey: !!anthropic });
});

app.post("/api/parse-resume-text", rateLimit("generate", RATE_MAX_GENERATE), async (req, res) => {
  try {
    const character = await resumeTextToCharacter(req.body?.text);
    res.json(character);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
});

app.post("/api/parse-resume", rateLimit("generate", RATE_MAX_GENERATE), upload.single("resume"), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: "Missing PDF file (field: resume)" });
    const data = await pdfParse(req.file.buffer);
    const character = await resumeTextToCharacter(data.text || "");
    res.json(character);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
});

app.post("/api/share", rateLimit("share", RATE_MAX_SHARE), async (req, res) => {
  try {
    const character = req.body?.character;
    if (!character || typeof character !== "object") return res.status(400).json({ error: "Missing character" });
    const id = newShareId();
    await saveCard(id, normalizeCharacter(character), getClientIp(req));
    res.json({ id });
  } catch (e) {
    console.error("Share error:", e.message);
    res.status(500).json({ error: "Failed to save card" });
  }
});

app.get("/api/share/:id", async (req, res) => {
  try {
    const character = await getCard(req.params.id);
    if (!character) return res.status(404).json({ error: "Card not found" });
    res.json(character);
  } catch (e) {
    console.error("Share read error:", e.message);
    res.status(500).json({ error: "Failed to load card" });
  }
});

// ─── GitHub Card Routes ─────────────────────────────────────────────

app.get("/api/gh/:username", rateLimit("ghcard", 120), async (req, res) => {
  try {
    const result = await loadGitHubCard(req.params.username);
    res.json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Failed to load card" });
  }
});

app.get("/api/gh/:username/vs/:other", rateLimit("ghduel", 60), async (req, res) => {
  try {
    const [left, right] = await Promise.all([
      loadGitHubCard(req.params.username),
      loadGitHubCard(req.params.other),
    ]);
    res.json({ left, right });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Failed to compare" });
  }
});

app.get("/api/gh-stats", async (req, res) => {
  if (!supabase) return res.json(null);
  const stats = await getGlobalStats(supabase);
  res.json(stats);
});

// ─── SEO constants ──────────────────────────────────────────────────
const SITE_URL = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || "https://gitrpgcard.com";

// ─── SEO: robots.txt ────────────────────────────────────────────────
app.get("/robots.txt", (_req, res) => {
  res.set("Content-Type", "text/plain");
  res.send([
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /api/",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n"));
});

// ─── SEO: sitemap.xml (dynamic from DB) ─────────────────────────────
app.get("/sitemap.xml", async (_req, res) => {
  const urls = [
    { loc: SITE_URL + "/", priority: "1.0", changefreq: "daily" },
    { loc: SITE_URL + "/privacy", priority: "0.3", changefreq: "monthly" },
  ];

  if (supabase) {
    try {
      const { data } = await supabase
        .from("github_cards")
        .select("username, last_accessed_at")
        .order("access_count", { ascending: false })
        .limit(5000);

      if (data) {
        for (const row of data) {
          urls.push({
            loc: `${SITE_URL}/${row.username}`,
            priority: "0.7",
            changefreq: "weekly",
            lastmod: row.last_accessed_at ? new Date(row.last_accessed_at).toISOString().split("T")[0] : undefined,
          });
        }
      }
    } catch (e) {
      console.warn("Sitemap DB query failed:", e.message);
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => [
      "  <url>",
      `    <loc>${u.loc}</loc>`,
      u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : "",
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      "  </url>",
    ].filter(Boolean).join("\n")),
    "</urlset>",
  ].join("\n");

  res.set("Content-Type", "application/xml");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

// Badge & card image — new short routes + legacy /gh/ redirects
async function badgeHandler(req, res) {
  try {
    const result = await loadGitHubCard(req.params.username);
    const style = req.query.style || "flat";
    const svg = style === "card"
      ? generateCardBadge(result.character, result.percentiles)
      : generateBadge(result.character, { style });
    res.set("Content-Type", "image/svg+xml");
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.send(svg);
  } catch (e) {
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20"><rect width="120" height="20" rx="3" fill="#555"/><text x="60" y="14" text-anchor="middle" font-size="11" fill="#fff" font-family="Verdana">ResumeRPG</text></svg>`;
    res.set("Content-Type", "image/svg+xml");
    res.status(e.status || 404).send(fallback);
  }
}

async function cardImageHandler(req, res) {
  try {
    const [result, stats] = await Promise.all([
      loadGitHubCard(req.params.username),
      supabase ? getGlobalStats(supabase) : Promise.resolve(null),
    ]);
    const png = await generateCardImage(result.character, result.percentiles, {
      cohortSize: stats?.total_cards || null,
    });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.send(png);
  } catch (e) {
    console.error("Card image error:", e.message);
    res.status(e.status || 500).send("Failed to generate card image");
  }
}

// New canonical routes
app.get("/:username/badge.svg", rateLimit("badge", 120), badgeHandler);
app.get("/:username/card.png", rateLimit("cardimg", 60), cardImageHandler);

// Legacy /gh/ routes — 301 redirect for badge/card, keep working for existing README embeds
app.get("/gh/:username/badge.svg", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(301, `/${req.params.username}/badge.svg${qs}`);
});
app.get("/gh/:username/card.png", (req, res) => {
  res.redirect(301, `/${req.params.username}/card.png`);
});

// ─── SEO helpers ────────────────────────────────────────────────────

const RESERVED_PATHS = new Set(["", "privacy", "about", "share", "api", "robots.txt", "sitemap.xml"]);
const DEFAULT_TITLE = "ResumeRPG — Turn your GitHub profile into an RPG character card";
const DEFAULT_DESC = "Every GitHub developer has a card. See your class, stats, rarity, and percentile ranking. Compare with friends. Embed a badge in your README. Export a print-ready trading card.";

function isUsername(segment) {
  if (!segment || RESERVED_PATHS.has(segment)) return false;
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(segment);
}

function escHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function homepageJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "ResumeRPG",
    "url": SITE_URL,
    "description": DEFAULT_DESC,
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "GitHub profile to RPG character card",
      "Percentile ranking among indexed developers",
      "Head-to-head developer comparison",
      "Embeddable SVG badge for GitHub README",
      "Exportable trading card PNG with QR code",
      "5 visual themes including Dark Fantasy, Cyberpunk, and Corporate",
    ],
  });
}

function cardJsonLd(character, username) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "name": `${character.name} — ResumeRPG Card`,
    "url": `${SITE_URL}/${username}`,
    "description": character.backstory || `Level ${character.level} ${character.class}`,
    "image": `${SITE_URL}/${username}/card.png`,
    "mainEntity": {
      "@type": "Person",
      "name": character.name,
      "jobTitle": character.title || "Developer",
      "worksFor": character.guild ? { "@type": "Organization", "name": character.guild } : undefined,
    },
  });
}

function homepageNoscript() {
  return `
    <div style="max-width:600px;margin:40px auto;font-family:sans-serif;color:#333;padding:20px">
      <h1>ResumeRPG — Turn your GitHub profile into an RPG character card</h1>
      <p>${escHtml(DEFAULT_DESC)}</p>
      <h2>How it works</h2>
      <p>Visit <strong>${escHtml(SITE_URL)}/your-github-username</strong> to see your card. No signup needed.</p>
      <h2>Features</h2>
      <ul>
        <li><strong>Automatic card generation</strong> from any GitHub profile</li>
        <li><strong>6 professional stats</strong>: IMPACT, CRAFT, RANGE, TENURE, VISION, INFLUENCE</li>
        <li><strong>Percentile ranking</strong> among indexed developers</li>
        <li><strong>12 RPG classes</strong> mapped from your primary language</li>
        <li><strong>Head-to-head duels</strong> — compare any two developers</li>
        <li><strong>README badge</strong> — embed your card in your GitHub profile</li>
        <li><strong>Trading card export</strong> — print-ready PNG with QR code</li>
        <li><strong>5 themes</strong>: Dark Fantasy, Cyberpunk, Pixel Art, Anime, Corporate</li>
      </ul>
      <h2>Example</h2>
      <p>Try <a href="${escHtml(SITE_URL)}/torvalds">${escHtml(SITE_URL)}/torvalds</a> to see Linus Torvalds' card.</p>
      <h2>For career fairs</h2>
      <p>Export your card as a trading card, print it, and hand it out. Recruiters scan the QR code to see your full interactive profile.</p>
    </div>
  `;
}

function cardNoscript(character, username, percentiles) {
  const stats = character.stats || {};
  const total = Object.values(stats).reduce((a, b) => a + (b || 0), 0);
  const pct = percentiles?.pct_overall != null ? ` — Top ${Math.max(1, Math.round(100 - percentiles.pct_overall))}%` : "";
  return `
    <div style="max-width:600px;margin:40px auto;font-family:sans-serif;color:#333;padding:20px">
      <h1>${escHtml(character.name)} — Level ${character.level} ${escHtml(character.class)}${escHtml(pct)}</h1>
      <p><strong>Rarity:</strong> ${escHtml(character.rarity)} | <strong>Guild:</strong> ${escHtml(character.guild)} | <strong>Power:</strong> ${total}/120</p>
      <p><em>${escHtml(character.tagline)}</em></p>
      <h2>Stats</h2>
      <ul>
        ${Object.entries(stats).map(([k, v]) => `<li><strong>${escHtml(k)}</strong>: ${v}/20</li>`).join("\n        ")}
      </ul>
      <h2>Skills</h2>
      <p>${(character.skills || []).map(s => escHtml(s)).join(", ")}</p>
      <h2>Backstory</h2>
      <p>${escHtml(character.backstory)}</p>
      <p><a href="${escHtml(SITE_URL)}/${escHtml(username)}">View interactive card</a> |
         <a href="${escHtml(SITE_URL)}/${escHtml(username)}/card.png">Download card image</a></p>
      <hr>
      <p><a href="${escHtml(SITE_URL)}">Generate your own card at ResumeRPG</a></p>
    </div>
  `;
}

// ─── Static files + meta injection (production) ─────────────────────
const distPath = resolve(__dirname, "..", "dist");
if (IS_PROD && existsSync(distPath)) {
  const indexHtml = readFileSync(resolve(distPath, "index.html"), "utf-8");

  app.use(express.static(distPath, { maxAge: "7d", index: false }));

  app.get("*", async (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    if (/\.(svg|png|js|css|ico|html|woff2?|ttf|map|json)$/.test(req.path)) return next();

    const segments = req.path.split("/").filter(Boolean);
    const maybeUsername = segments[0];
    let title = DEFAULT_TITLE;
    let desc = DEFAULT_DESC;
    let image = `${SITE_URL}/favicon.svg`;
    let url = SITE_URL + (req.path === "/" ? "" : req.path);
    let jsonLd = `<script type="application/ld+json">${homepageJsonLd()}</script>`;
    let noscript = homepageNoscript();

    if (maybeUsername && isUsername(maybeUsername)) {
      try {
        if (supabase) {
          const { data } = await supabase
            .from("github_cards")
            .select("character, pct_overall")
            .eq("username", maybeUsername.toLowerCase())
            .single();

          if (data?.character) {
            const c = data.character;
            const pctLabel = data.pct_overall != null ? ` · Top ${Math.max(1, Math.round(100 - data.pct_overall))}%` : "";
            title = `${c.name} — Level ${c.level} ${c.class}${pctLabel} | ResumeRPG`;
            desc = c.backstory || `A Level ${c.level} ${c.class} from ${c.guild}. Power: ${Object.values(c.stats || {}).reduce((a, b) => a + b, 0)}/120.`;
            image = `${SITE_URL}/${maybeUsername.toLowerCase()}/card.png`;
            jsonLd = `<script type="application/ld+json">${cardJsonLd(c, maybeUsername.toLowerCase())}</script>`;
            noscript = cardNoscript(c, maybeUsername.toLowerCase(), data);

            if (segments[1] === "vs" && segments[2]) {
              const { data: other } = await supabase
                .from("github_cards")
                .select("character")
                .eq("username", segments[2].toLowerCase())
                .single();
              if (other?.character) {
                title = `${c.name} vs ${other.character.name} — Duel | ResumeRPG`;
                desc = `Who wins? ${c.name} (Level ${c.level} ${c.class}) vs ${other.character.name} (Level ${other.character.level} ${other.character.class})`;
              }
            }
          } else {
            title = `@${maybeUsername} — ResumeRPG`;
            desc = `Generate an RPG character card for GitHub user @${maybeUsername}. See stats, class, rarity, and percentile ranking.`;
            noscript = `<div style="max-width:600px;margin:40px auto;font-family:sans-serif;padding:20px">
              <h1>@${escHtml(maybeUsername)} — ResumeRPG</h1>
              <p>This developer's RPG card is being generated. <a href="${escHtml(SITE_URL)}/${escHtml(maybeUsername)}">View card</a></p>
              <p><a href="${escHtml(SITE_URL)}">Generate your own card</a></p>
            </div>`;
            jsonLd = "";
          }
        }
      } catch {
        // DB error — use defaults
      }
    }

    if (segments[0] === "privacy") {
      title = "Privacy Policy | ResumeRPG";
      desc = "ResumeRPG privacy policy. We don't store your resume text — only the generated character card.";
      jsonLd = "";
    }

    const html = indexHtml
      .replace(/__OG_TITLE__/g, escHtml(title))
      .replace(/__OG_DESCRIPTION__/g, escHtml(desc))
      .replace(/__OG_IMAGE__/g, escHtml(image))
      .replace(/__OG_URL__/g, escHtml(url))
      .replace(/__JSONLD__/g, jsonLd)
      .replace(/__NOSCRIPT__/g, noscript);

    res.set("Content-Type", "text/html");
    res.send(html);
  });
}

// ─── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nResumeRPG ${IS_PROD ? "PRODUCTION" : "dev"} → http://127.0.0.1:${PORT}`);
  console.log(`  Claude:  ${anthropic ? MODEL : "demo mode (no key)"}`);
  console.log(`  Storage: ${supabase ? "Supabase" : "in-memory (dev only)"}`);
  console.log(`  GH cards: ${supabase ? "Supabase + percentiles" : "in-memory (no percentiles — add Supabase for prod)"}`);
  console.log(`  GitHub:  ${process.env.GITHUB_TOKEN ? "authenticated (5K req/hr)" : "anonymous (60 req/hr)"}`);
  console.log(`  CORS:    ${IS_PROD ? ALLOWED_ORIGINS.join(", ") || "⚠ NONE — set ALLOWED_ORIGINS!" : "localhost/*"}`);
  console.log(`  Limits:  ${RATE_MAX_GENERATE} gen/hr, ${RATE_MAX_SHARE} share/hr per IP\n`);

  if (supabase) {
    startPeriodicRecalc(supabase);
    console.log("  Percentile recalc: every 5 min (when new cards exist)\n");
  }
});
