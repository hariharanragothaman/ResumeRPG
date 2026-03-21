export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type CharacterClass =
  | "Frontend Sorcerer"
  | "Backend Paladin"
  | "DevOps Ranger"
  | "Data Necromancer"
  | "Fullstack Warlock"
  | "Cloud Architect"
  | "Security Sentinel"
  | "ML Alchemist"
  | "Embedded Ranger"
  | "Mobile Bard"
  | "Platform Engineer"
  | "QA Monk";

export interface StatBlock {
  IMPACT: number;
  CRAFT: number;
  RANGE: number;
  TENURE: number;
  VISION: number;
  INFLUENCE: number;
}

export interface InventoryItem {
  name: string;
  type: "weapon" | "armor" | "artifact" | "scroll";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface QuestEntry {
  name: string;
  description: string;
}

export interface BossBattle {
  name: string;
  status: "defeated";
}

export interface CharacterSheet {
  name: string;
  title: string;
  class: CharacterClass;
  level: number;
  rarity: Rarity;
  xp_current: number;
  xp_max: number;
  stats: StatBlock;
  skills: string[];
  inventory: InventoryItem[];
  quests_completed: QuestEntry[];
  boss_battles: BossBattle[];
  guild: string;
  backstory: string;
  tagline: string;
}
