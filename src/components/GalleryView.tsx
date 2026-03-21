import { CLASS_CONFIG, RARITY_CONFIG } from "@/lib/config";
import { clearAllCharacters, deleteCharacter, loadCharacter } from "@/lib/storage";
import type { SavedEntry } from "@/lib/storage";
import type { CharacterSheet } from "@/types/character";

export function GalleryView({
  characters,
  onSelect,
  onRefresh,
}: {
  characters: SavedEntry[];
  onSelect: (c: CharacterSheet) => void;
  onRefresh: () => void;
}) {
  if (characters.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px" }}>
        <span style={{ fontSize: 44, display: "block", marginBottom: 14 }}>📜</span>
        <p style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: "#64748b", lineHeight: 2.2 }}>
          No characters yet<br />Generate your first one!
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: "slideUp 0.4s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: "#64748b" }}>
          {characters.length} CHARACTER{characters.length !== 1 ? "S" : ""} SAVED
        </span>
        <button
          onClick={() => {
            if (confirm("Delete ALL saved characters?")) {
              clearAllCharacters();
              onRefresh();
            }
          }}
          style={{
            background: "transparent",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 6,
            color: "#ef4444",
            fontFamily: "'DM Sans'",
            fontSize: 11,
            padding: "4px 10px",
            cursor: "pointer",
            opacity: 0.6,
          }}
        >
          Clear All
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {characters.map((c) => {
          const cc = CLASS_CONFIG[c.class as keyof typeof CLASS_CONFIG] || CLASS_CONFIG["Fullstack Warlock"];
          const rc = RARITY_CONFIG[c.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG["Common"];
          return (
            <div
              key={c.id}
              onClick={() => {
                const full = loadCharacter(c.id);
                if (full) onSelect(full);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 10,
                border: `1px solid ${rc.border}33`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 26 }}>{cc.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Silkscreen'", fontSize: 13, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: cc.color, marginTop: 2 }}>LV.{c.level} {c.class}</div>
              </div>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: rc.color, flexShrink: 0 }}>{c.rarity}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCharacter(c.id);
                  onRefresh();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#475569",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "2px 4px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
