import { CLASS_CONFIG, RARITY_CONFIG, THEMES, type ThemeName } from "@/lib/config";
import { clearAllCharacters, deleteCharacter, loadCharacter } from "@/lib/storage";
import type { SavedEntry } from "@/lib/storage";
import type { CharacterSheet } from "@/types/character";

export function GalleryView({
  characters,
  onSelect,
  onRefresh,
  theme = "fantasy",
}: {
  characters: SavedEntry[];
  onSelect: (c: CharacterSheet) => void;
  onRefresh: () => void;
  theme?: ThemeName;
}) {
  const T = THEMES[theme];

  if (characters.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px" }}>
        <span style={{ fontSize: 44, display: "block", marginBottom: 14 }}>📜</span>
        <p style={{ fontFamily: T.labelFont, fontSize: 9, color: T.textDim, lineHeight: 2.2 }}>
          No characters yet<br />Generate your first one!
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: "slideUp 0.4s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: T.labelFont, fontSize: 8, color: T.textDim, fontWeight: 700 }}>{characters.length} SAVED</span>
        <button
          onClick={() => { if (confirm("Delete ALL?")) { clearAllCharacters(); onRefresh(); } }}
          style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#ef4444", fontFamily: T.bodyFont, fontSize: 11, padding: "4px 10px", cursor: "pointer", opacity: 0.6 }}
        >Clear All</button>
      </div>
      {characters.map((c) => {
        const cc = CLASS_CONFIG[c.class as keyof typeof CLASS_CONFIG] || CLASS_CONFIG["Fullstack Warlock"];
        const rc = RARITY_CONFIG[c.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG["Common"];
        return (
          <div
            key={c.id}
            onClick={() => { const full = loadCharacter(c.id); if (full) onSelect(full); }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.surface, borderRadius: 10, border: "1px solid " + rc.border + "33", cursor: "pointer", marginBottom: 8 }}
          >
            <span style={{ fontSize: 24 }}>{cc.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.headingFont, fontSize: 13, color: T.text, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div style={{ fontFamily: T.labelFont, fontSize: 7, color: cc.color, marginTop: 2, fontWeight: 700 }}>LV.{c.level} {c.class}</div>
            </div>
            <span style={{ fontFamily: T.labelFont, fontSize: 7, color: rc.color, fontWeight: 700, flexShrink: 0 }}>{c.rarity}</span>
            <button
              onClick={(e) => { e.stopPropagation(); deleteCharacter(c.id); onRefresh(); }}
              style={{ background: "transparent", border: "none", color: T.textDim, cursor: "pointer", fontSize: 16, padding: "2px 4px" }}
            >×</button>
          </div>
        );
      })}
    </div>
  );
}
