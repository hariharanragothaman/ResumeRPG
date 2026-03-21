import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import express from "express";
import multer from "multer";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const PORT = Number(process.env.API_PORT || 8787);
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const VALID_CLASSES = [
  "Frontend Sorcerer", "Backend Paladin", "DevOps Ranger", "Data Necromancer",
  "Fullstack Warlock", "Cloud Architect", "Security Sentinel", "ML Alchemist",
  "Embedded Ranger", "Mobile Bard", "Platform Engineer", "QA Monk",
];

const VALID_RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

const SYSTEM_PROMPT = `You are ResumeRPG, an AI that converts resumes into RPG character sheets. Given a resume, generate a JSON response with this EXACT structure (no markdown, no backticks, just raw JSON):

{
  "name": "The person's real name",
  "title": "Their current/most recent job title",
  "class": "One of: Frontend Sorcerer, Backend Paladin, DevOps Ranger, Data Necromancer, Fullstack Warlock, Cloud Architect, Security Sentinel, ML Alchemist, Embedded Ranger, Mobile Bard, Platform Engineer, QA Monk",
  "level": <number 1-99 based on years of experience: 1-2yrs=10-20, 3-5yrs=20-40, 5-10yrs=40-60, 10-15yrs=60-80, 15+yrs=80-99>,
  "rarity": "One of: Common, Uncommon, Rare, Epic, Legendary - based on how unique/impressive the skill combination is",
  "xp_current": <number, current XP within level>,
  "xp_max": <number, XP needed for next level>,
  "stats": {
    "STR": <1-20, based on leadership, team size managed, impact>,
    "INT": <1-20, based on education, publications, patents, certifications>,
    "DEX": <1-20, based on breadth of skills, languages, frameworks>,
    "CON": <1-20, based on years of experience, tenure at companies>,
    "WIS": <1-20, based on domain expertise depth, specialization>,
    "CHA": <1-20, based on speaking, community involvement, open source, awards>
  },
  "skills": ["Top 6-8 technical skills as short strings"],
  "inventory": [
    {"name": "Item name (certification/degree/tool)", "type": "weapon|armor|artifact|scroll", "rarity": "common|uncommon|rare|epic|legendary"}
  ],
  "quests_completed": [
    {"name": "Creative quest name for a career milestone", "description": "One-line description"}
  ],
  "boss_battles": [
    {"name": "Creative boss name for a major challenge overcome", "status": "defeated"}
  ],
  "guild": "Company or organization they belong to",
  "backstory": "A 2-sentence RPG-flavored backstory based on their career journey",
  "tagline": "A short catchy RPG-style tagline, max 8 words"
}

Rules:
- Be creative and fun with quest names and boss battles but keep them grounded in real career events
- Infer skills from context even if not explicitly listed
- The class should reflect their PRIMARY specialization
- Make the backstory dramatic but accurate
- Return ONLY valid JSON, no other text`;

const DEMO_CHARACTER = {
  name: "Avery Vale",
  title: "Staff Engineer",
  class: "DevOps Ranger",
  level: 62,
  rarity: "Epic",
  xp_current: 7400,
  xp_max: 10000,
  stats: { STR: 14, INT: 17, DEX: 12, CON: 18, WIS: 15, CHA: 11 },
  skills: ["Kubernetes", "Terraform", "Go", "AWS", "Observability", "CI/CD", "Python"],
  inventory: [
    { name: "Helm of SLOs (CKA Cert)", type: "artifact", rarity: "epic" },
    { name: "Mjölnir Migration Tool", type: "weapon", rarity: "legendary" },
    { name: "Cloak of Incident Response", type: "armor", rarity: "rare" },
    { name: "Scroll of Runbooks", type: "scroll", rarity: "uncommon" },
  ],
  quests_completed: [
    { name: "The Monolith Must Fall", description: "Decomposed a 500k-line monolith into 23 bounded microservices" },
    { name: "The Great Cloud Migration", description: "Migrated 40+ services from bare metal to Kubernetes on AWS" },
    { name: "Pagerless Night", description: "Achieved 30 consecutive pager-free on-call nights through automation" },
  ],
  boss_battles: [
    { name: "The Cascading Failure of 2021", status: "defeated" },
    { name: "Black Friday Traffic Hydra", status: "defeated" },
  ],
  guild: "Northwind Labs",
  backstory: "Forged in the fires of production incidents, Avery rose from junior deploy-button-clicker to architect of self-healing systems. Their weapon of choice: a Terraform plan so clean it makes senior engineers weep.",
  tagline: "Five nines or a blameless postmortem",
};

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

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
      STR: clamp(Math.round(Number(stats.STR) || 10), 1, 20),
      INT: clamp(Math.round(Number(stats.INT) || 10), 1, 20),
      DEX: clamp(Math.round(Number(stats.DEX) || 10), 1, 20),
      CON: clamp(Math.round(Number(stats.CON) || 10), 1, 20),
      WIS: clamp(Math.round(Number(stats.WIS) || 10), 1, 20),
      CHA: clamp(Math.round(Number(stats.CHA) || 10), 1, 20),
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

async function resumeTextToCharacter(text, anthropic) {
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
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Here is my resume:\n\n${trimmed.slice(0, 48000)}` }],
  });

  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text from model");

  let json;
  const raw = block.text.trim().replace(/```json|```/g, "").trim();
  try {
    json = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Model did not return valid JSON");
    json = JSON.parse(m[0]);
  }

  return normalizeCharacter(json);
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const shareStore = new Map();

function newShareId() {
  return randomBytes(9).toString("base64url");
}

app.post("/api/parse-resume-text", async (req, res) => {
  try {
    const text = req.body?.text;
    const character = await resumeTextToCharacter(text, anthropic);
    res.json(character);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
});

app.post("/api/parse-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Missing PDF file (field: resume)" });
    }
    const data = await pdfParse(req.file.buffer);
    const character = await resumeTextToCharacter(data.text || "", anthropic);
    res.json(character);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Server error" });
  }
});

app.post("/api/share", (req, res) => {
  const character = req.body?.character;
  if (!character || typeof character !== "object") {
    return res.status(400).json({ error: "Missing character" });
  }
  const id = newShareId();
  shareStore.set(id, normalizeCharacter(character));
  res.json({ id });
});

app.get("/api/status", (_req, res) => {
  res.json({ hasApiKey: !!anthropic });
});

app.get("/api/share/:id", (req, res) => {
  const c = shareStore.get(req.params.id);
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json(c);
});

app.listen(PORT, () => {
  console.log(`ResumeRPG API http://127.0.0.1:${PORT}`);
  console.log(anthropic ? `Model: ${MODEL}` : "Demo mode (no ANTHROPIC_API_KEY)");
});
