import type { CharacterClass, Rarity } from "@/types/character";

export const PIXEL_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap";

export const CLASS_CONFIG: Record<CharacterClass, { color: string; icon: string; gradient: string }> = {
  "Frontend Sorcerer": { color: "#a855f7", icon: "🔮", gradient: "from-purple-900 to-indigo-900" },
  "Backend Paladin": { color: "#3b82f6", icon: "🛡️", gradient: "from-blue-900 to-slate-900" },
  "DevOps Ranger": { color: "#22c55e", icon: "🏹", gradient: "from-green-900 to-emerald-900" },
  "Data Necromancer": { color: "#ef4444", icon: "💀", gradient: "from-red-900 to-rose-900" },
  "Fullstack Warlock": { color: "#f59e0b", icon: "⚡", gradient: "from-amber-900 to-yellow-900" },
  "Cloud Architect": { color: "#06b6d4", icon: "☁️", gradient: "from-cyan-900 to-teal-900" },
  "Security Sentinel": { color: "#dc2626", icon: "🔐", gradient: "from-red-950 to-zinc-900" },
  "ML Alchemist": { color: "#8b5cf6", icon: "🧪", gradient: "from-violet-900 to-purple-900" },
  "Embedded Ranger": { color: "#84cc16", icon: "⚙️", gradient: "from-lime-900 to-green-900" },
  "Mobile Bard": { color: "#ec4899", icon: "🎵", gradient: "from-pink-900 to-fuchsia-900" },
  "Platform Engineer": { color: "#f97316", icon: "🏗️", gradient: "from-orange-900 to-amber-900" },
  "QA Monk": { color: "#14b8a6", icon: "🧘", gradient: "from-teal-900 to-emerald-900" },
};

export const RARITY_CONFIG: Record<Rarity, { color: string; border: string; glow: string; bg: string }> = {
  Common:    { color: "#9ca3af", border: "#4b5563", glow: "none",                               bg: "rgba(75,85,99,0.15)" },
  Uncommon:  { color: "#22c55e", border: "#16a34a", glow: "0 0 20px rgba(34,197,94,0.3)",       bg: "rgba(34,197,94,0.08)" },
  Rare:      { color: "#3b82f6", border: "#2563eb", glow: "0 0 20px rgba(59,130,246,0.3)",      bg: "rgba(59,130,246,0.08)" },
  Epic:      { color: "#a855f7", border: "#9333ea", glow: "0 0 25px rgba(168,85,247,0.4)",      bg: "rgba(168,85,247,0.1)" },
  Legendary: { color: "#f59e0b", border: "#d97706", glow: "0 0 30px rgba(245,158,11,0.5)",      bg: "rgba(245,158,11,0.12)" },
};

export const LOADING_MESSAGES = [
  "Rolling for initiative...",
  "Parsing your quest log...",
  "Calculating stat modifiers...",
  "Forging your character sheet...",
  "Consulting the Oracle of LinkedIn...",
  "Enchanting your skill tree...",
  "Calibrating rarity crystal...",
  "Summoning pixel sprites...",
];
