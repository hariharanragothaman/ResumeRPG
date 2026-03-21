import type { CharacterSheet } from "@/types/character";

export interface SavedEntry {
  id: string;
  name: string;
  class: string;
  level: number;
  rarity: string;
  created: number;
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function getIndex(): SavedEntry[] {
  try {
    const raw = localStorage.getItem("rrpg:index");
    return raw ? (JSON.parse(raw) as SavedEntry[]) : [];
  } catch {
    return [];
  }
}

function setIndex(index: SavedEntry[]) {
  localStorage.setItem("rrpg:index", JSON.stringify(index));
}

export function loadIndex(): SavedEntry[] {
  return getIndex();
}

export function saveCharacter(character: CharacterSheet): string {
  const id = uid();
  const entry = { ...character, _id: id, _created: Date.now() };
  localStorage.setItem("rrpg:card:" + id, JSON.stringify(entry));
  const index = getIndex();
  index.unshift({
    id,
    name: character.name,
    class: character.class,
    level: character.level,
    rarity: character.rarity,
    created: Date.now(),
  });
  setIndex(index);
  return id;
}

export function loadCharacter(id: string): CharacterSheet | null {
  try {
    const raw = localStorage.getItem("rrpg:card:" + id);
    return raw ? (JSON.parse(raw) as CharacterSheet) : null;
  } catch {
    return null;
  }
}

export function deleteCharacter(id: string) {
  localStorage.removeItem("rrpg:card:" + id);
  setIndex(getIndex().filter((c) => c.id !== id));
}

export function clearAllCharacters() {
  const index = getIndex();
  for (const c of index) localStorage.removeItem("rrpg:card:" + c.id);
  localStorage.removeItem("rrpg:index");
}
