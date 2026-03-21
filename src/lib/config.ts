import type { CharacterClass, Rarity } from "@/types/character";

export const PIXEL_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Orbitron:wght@400;700;900&family=VT323&family=Zen+Maru+Gothic:wght@400;700&family=Inter:wght@400;500;600;700&display=swap";

export const CLASS_CONFIG: Record<CharacterClass, { color: string; icon: string }> = {
  "Frontend Sorcerer": { color: "#a855f7", icon: "🔮" },
  "Backend Paladin": { color: "#3b82f6", icon: "🛡️" },
  "DevOps Ranger": { color: "#22c55e", icon: "🏹" },
  "Data Necromancer": { color: "#ef4444", icon: "💀" },
  "Fullstack Warlock": { color: "#f59e0b", icon: "⚡" },
  "Cloud Architect": { color: "#06b6d4", icon: "☁️" },
  "Security Sentinel": { color: "#dc2626", icon: "🔐" },
  "ML Alchemist": { color: "#8b5cf6", icon: "🧪" },
  "Embedded Ranger": { color: "#84cc16", icon: "⚙️" },
  "Mobile Bard": { color: "#ec4899", icon: "🎵" },
  "Platform Engineer": { color: "#f97316", icon: "🏗️" },
  "QA Monk": { color: "#14b8a6", icon: "🧘" },
};

export const RARITY_CONFIG: Record<Rarity, { color: string; border: string; glow: string }> = {
  Common:    { color: "#9ca3af", border: "#4b5563", glow: "none" },
  Uncommon:  { color: "#22c55e", border: "#16a34a", glow: "0 0 20px rgba(34,197,94,0.25)" },
  Rare:      { color: "#3b82f6", border: "#2563eb", glow: "0 0 20px rgba(59,130,246,0.25)" },
  Epic:      { color: "#a855f7", border: "#9333ea", glow: "0 0 25px rgba(168,85,247,0.35)" },
  Legendary: { color: "#f59e0b", border: "#d97706", glow: "0 0 30px rgba(245,158,11,0.4)" },
};

export type ThemeName = "fantasy" | "cyberpunk" | "pixel" | "anime" | "corporate";

export interface Theme {
  name: string;
  icon: string;
  bg: string;
  cardBg: string;
  pageBg: string;
  text: string;
  textMuted: string;
  textDim: string;
  textDark: string;
  surface: string;
  surfaceBorder: string;
  barBg: string;
  barBorder: string;
  scanlines: boolean;
  headingFont: string;
  labelFont: string;
  bodyFont: string;
  particleShape: "circle" | "square" | "star" | "none";
  light?: boolean;
  gridOverlay?: boolean;
  pixelBorder?: boolean;
  sparkle?: boolean;
}

export const THEMES: Record<ThemeName, Theme> = {
  fantasy: {
    name: "Dark Fantasy", icon: "🏰",
    bg: "linear-gradient(165deg,#0c0c1d,#111128 40%,#0a0a1a)",
    cardBg: "linear-gradient(165deg,#0c0c1d,#111128 40%,#0a0a1a)",
    pageBg: "linear-gradient(180deg,#06060f,#0a0a1a 50%,#080816)",
    text: "#f1f5f9", textMuted: "#94a3b8", textDim: "#475569", textDark: "#334155",
    surface: "rgba(255,255,255,0.02)", surfaceBorder: "rgba(255,255,255,0.06)",
    barBg: "rgba(30,30,50,0.8)", barBorder: "rgba(255,255,255,0.06)",
    scanlines: true, headingFont: "'Silkscreen'", labelFont: "'Press Start 2P'",
    bodyFont: "'DM Sans'", particleShape: "circle",
  },
  cyberpunk: {
    name: "Cyberpunk", icon: "🌃",
    bg: "linear-gradient(165deg,#0a0014,#0d0022 40%,#050010)",
    cardBg: "linear-gradient(165deg,#0a0014,#10002a 40%,#050010)",
    pageBg: "linear-gradient(180deg,#030008,#0a0014 50%,#050010)",
    text: "#e0f0ff", textMuted: "#80c0e0", textDim: "#406080", textDark: "#203040",
    surface: "rgba(0,255,255,0.03)", surfaceBorder: "rgba(0,255,255,0.12)",
    barBg: "rgba(0,10,30,0.9)", barBorder: "rgba(0,255,255,0.15)",
    scanlines: true, headingFont: "'Orbitron'", labelFont: "'Orbitron'",
    bodyFont: "'DM Sans'", particleShape: "square",
    gridOverlay: true,
  },
  pixel: {
    name: "Pixel Art", icon: "👾",
    bg: "linear-gradient(165deg,#1a1a2e,#16213e 40%,#0f1020)",
    cardBg: "linear-gradient(165deg,#1a1a2e,#16213e 40%,#0f1020)",
    pageBg: "linear-gradient(180deg,#0f0f1a,#1a1a2e 50%,#0f1020)",
    text: "#e8e8e8", textMuted: "#a0a0b0", textDim: "#606078", textDark: "#404058",
    surface: "rgba(255,255,255,0.04)", surfaceBorder: "rgba(255,255,255,0.1)",
    barBg: "rgba(20,20,40,0.9)", barBorder: "rgba(255,255,255,0.12)",
    scanlines: false, headingFont: "'Press Start 2P'", labelFont: "'Press Start 2P'",
    bodyFont: "'VT323'", particleShape: "square", pixelBorder: true,
  },
  anime: {
    name: "Anime", icon: "✨",
    bg: "linear-gradient(165deg,#1a0a2e,#2a1040 40%,#150828)",
    cardBg: "linear-gradient(165deg,#1a0a2e,#2a1040 40%,#150828)",
    pageBg: "linear-gradient(180deg,#100520,#1a0a2e 50%,#0d0418)",
    text: "#fff0fc", textMuted: "#d0a0d0", textDim: "#806090", textDark: "#503860",
    surface: "rgba(255,100,255,0.04)", surfaceBorder: "rgba(255,100,255,0.12)",
    barBg: "rgba(30,10,40,0.9)", barBorder: "rgba(255,100,255,0.15)",
    scanlines: false, headingFont: "'Zen Maru Gothic'", labelFont: "'Silkscreen'",
    bodyFont: "'Zen Maru Gothic'", particleShape: "star",
    sparkle: true,
  },
  corporate: {
    name: "Corporate", icon: "💼",
    bg: "linear-gradient(165deg,#fafbfc,#f0f2f5 40%,#e8eaed)",
    cardBg: "linear-gradient(165deg,#ffffff,#f8f9fb 40%,#f0f2f5)",
    pageBg: "linear-gradient(180deg,#f0f2f5,#e8eaed 50%,#f0f2f5)",
    text: "#1a1a2e", textMuted: "#4a5568", textDim: "#a0aec0", textDark: "#cbd5e0",
    surface: "rgba(0,0,0,0.03)", surfaceBorder: "rgba(0,0,0,0.08)",
    barBg: "rgba(0,0,0,0.06)", barBorder: "rgba(0,0,0,0.08)",
    scanlines: false, headingFont: "'Inter'", labelFont: "'Inter'",
    bodyFont: "'Inter'", particleShape: "none", light: true,
  },
};

export const STAT_NAMES: (keyof import("@/types/character").StatBlock)[] = ["IMPACT", "CRAFT", "RANGE", "TENURE", "VISION", "INFLUENCE"];

export const LOADING_MESSAGES = [
  "Rolling for initiative...",
  "Parsing quest log...",
  "Calculating modifiers...",
  "Forging character sheet...",
  "Consulting the Oracle...",
  "Enchanting skill tree...",
  "Calibrating rarity...",
  "Summoning sprites...",
];
