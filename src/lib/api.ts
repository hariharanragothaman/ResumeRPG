import type { CharacterSheet } from "@/types/character";

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

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function normalizeCharacter(raw: Record<string, unknown>): CharacterSheet {
  const stats = (raw.stats || {}) as Record<string, unknown>;
  return {
    name: String(raw.name || "Unknown Adventurer"),
    title: String(raw.title || "Professional"),
    class: VALID_CLASSES.includes(raw.class as string) ? (raw.class as CharacterSheet["class"]) : "Fullstack Warlock",
    level: clamp(Math.round(Number(raw.level) || 1), 1, 99),
    rarity: VALID_RARITIES.includes(raw.rarity as string) ? (raw.rarity as CharacterSheet["rarity"]) : "Common",
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
    inventory: (Array.isArray(raw.inventory) ? raw.inventory : []).slice(0, 10).map((it: Record<string, unknown>, i: number) => ({
      name: String(it.name || `Item ${i + 1}`),
      type: (["weapon", "armor", "artifact", "scroll"].includes(it.type as string) ? it.type : "artifact") as "weapon" | "armor" | "artifact" | "scroll",
      rarity: (["common", "uncommon", "rare", "epic", "legendary"].includes(it.rarity as string) ? it.rarity : "common") as "common" | "uncommon" | "rare" | "epic" | "legendary",
    })),
    quests_completed: (Array.isArray(raw.quests_completed) ? raw.quests_completed : []).slice(0, 10).map((q: Record<string, unknown>) => ({
      name: String(q.name || "Quest"),
      description: String(q.description || ""),
    })),
    boss_battles: (Array.isArray(raw.boss_battles) ? raw.boss_battles : []).slice(0, 8).map((b: Record<string, unknown>) => ({
      name: String(b.name || "Boss"),
      status: "defeated" as const,
    })),
    guild: String(raw.guild || "Freelance"),
    backstory: String(raw.backstory || "").slice(0, 500),
    tagline: String(raw.tagline || "").slice(0, 80),
  };
}

function parseModelJson(raw: string): CharacterSheet {
  const clean = raw.replace(/```json|```/g, "").trim();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(clean);
  } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Model did not return valid JSON");
    json = JSON.parse(m[0]);
  }
  return normalizeCharacter(json);
}

// ── Server-side (proxy through our Express API) ────────────────────

export async function parseResumePdf(file: File): Promise<CharacterSheet> {
  const form = new FormData();
  form.append("resume", file);
  const res = await fetch("/api/parse-resume", { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.error === "string" ? err.error : "Failed to parse resume");
  }
  return res.json() as Promise<CharacterSheet>;
}

export async function parseResumeText(text: string): Promise<CharacterSheet> {
  const res = await fetch("/api/parse-resume-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.error === "string" ? err.error : "Failed to parse resume");
  }
  return res.json() as Promise<CharacterSheet>;
}

// ── Client-side providers ────────────────────────────────────────────

export type Provider = "anthropic" | "openai";

const BEST_MODEL: Record<Provider, string> = {
  anthropic: "claude-opus-4-6",
  openai: "gpt-4.1",
};

export function modelForProvider(provider: Provider): string {
  return BEST_MODEL[provider];
}

async function callAnthropic(resumeText: string, apiKey: string): Promise<CharacterSheet> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: BEST_MODEL.anthropic,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Here is my resume:\n\n${resumeText}` }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = (errBody as Record<string, Record<string, string>>)?.error?.message || `Anthropic API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json() as { content?: { type: string; text?: string }[] };
  const text = data.content?.map((b) => b.text || "").join("") || "";
  return parseModelJson(text);
}

async function callOpenAI(resumeText: string, apiKey: string): Promise<CharacterSheet> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: BEST_MODEL.openai,
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Here is my resume:\n\n${resumeText}` },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = (errBody as Record<string, Record<string, string>>)?.error?.message || `OpenAI API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content || "";
  return parseModelJson(text);
}

export async function parseResumeClientSide(
  resumeText: string,
  apiKey: string,
  provider: Provider = "anthropic",
): Promise<CharacterSheet> {
  const trimmed = resumeText.trim();
  if (trimmed.length < 40) throw new Error("Resume text too short.");

  if (provider === "openai") {
    return callOpenAI(trimmed, apiKey);
  }
  return callAnthropic(trimmed, apiKey);
}

// ── Check server capability ─────────────────────────────────────────

export async function checkServerHasKey(): Promise<boolean> {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return false;
    const data = await res.json() as { hasApiKey: boolean };
    return data.hasApiKey;
  } catch {
    return false;
  }
}
