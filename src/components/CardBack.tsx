import { CLASS_CONFIG, RARITY_CONFIG, THEMES, type ThemeName } from "@/lib/config";
import type { CharacterSheet } from "@/types/character";

const TYPE_ICONS: Record<string, string> = { weapon: "⚔️", armor: "🛡️", artifact: "💎", scroll: "📜" };
const RARITY_COLORS: Record<string, string> = { common: "#9ca3af", uncommon: "#22c55e", rare: "#3b82f6", epic: "#a855f7", legendary: "#f59e0b" };

export function CardBack({
  data,
  theme = "fantasy",
}: {
  data: CharacterSheet;
  theme?: ThemeName;
}) {
  const T = THEMES[theme];
  const cc = CLASS_CONFIG[data.class] || CLASS_CONFIG["Fullstack Warlock"];
  const rc = RARITY_CONFIG[data.rarity] || RARITY_CONFIG["Common"];
  const isPixel = theme === "pixel";

  return (
    <div style={{
      width: "100%", background: T.cardBg, borderRadius: isPixel ? 4 : 14,
      border: (isPixel ? "3px solid " : "2px solid ") + (T.light ? rc.border + "44" : rc.border + "55"),
      boxShadow: T.light ? "0 4px 24px rgba(0,0,0,0.08)" : rc.glow + ",0 16px 48px rgba(0,0,0,0.5)",
      overflow: "hidden", position: "relative", minHeight: "100%", boxSizing: "border-box",
    }}>
      {T.scanlines && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, opacity: 0.025, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 3px)" }} />}

      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid " + T.surfaceBorder, textAlign: "center" }}>
        <div style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, letterSpacing: 3, fontWeight: 700, marginBottom: 4 }}>★ {(data.rarity || "").toUpperCase()} ★</div>
        <div style={{ fontFamily: T.headingFont, fontSize: 15, color: T.text, fontWeight: 700 }}>{data.name}</div>
        <div style={{ fontFamily: T.labelFont, fontSize: 8, color: cc.color, marginTop: 2, fontWeight: 700 }}>{cc.icon} {data.class} — LV.{data.level}</div>
      </div>

      {/* Lore */}
      {data.backstory && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + T.surfaceBorder }}>
          <div style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, marginBottom: 6, letterSpacing: 2, fontWeight: 700 }}>📖 LORE</div>
          <p style={{ fontFamily: T.bodyFont, fontSize: 12, color: T.textMuted, lineHeight: 1.6, margin: 0 }}>{data.backstory}</p>
        </div>
      )}

      {/* Inventory */}
      {data.inventory?.length > 0 && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + T.surfaceBorder }}>
          <div style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, marginBottom: 6, letterSpacing: 2, fontWeight: 700 }}>🎒 INVENTORY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {data.inventory.map((item, i) => {
              const ic = RARITY_COLORS[item.rarity] || "#9ca3af";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: T.surface, borderRadius: isPixel ? 0 : 4, border: "1px solid " + ic + "33" }}>
                  <span style={{ fontSize: 12 }}>{TYPE_ICONS[item.type] || "📦"}</span>
                  <span style={{ fontFamily: isPixel ? "'VT323'" : "'Silkscreen'", fontSize: isPixel ? 13 : 10, color: ic, flex: 1 }}>{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quests */}
      {data.quests_completed?.length > 0 && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + T.surfaceBorder }}>
          <div style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, marginBottom: 6, letterSpacing: 2, fontWeight: 700 }}>📜 QUEST LOG</div>
          {data.quests_completed.map((q, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px solid " + T.surfaceBorder }}>
              <span style={{ fontFamily: T.labelFont, fontSize: 7, color: "#22c55e", marginTop: 1 }}>✓</span>
              <div>
                <div style={{ fontFamily: isPixel ? "'VT323'" : "'Silkscreen'", fontSize: isPixel ? 13 : 10, color: T.text }}>{q.name}</div>
                <div style={{ fontFamily: T.bodyFont, fontSize: 10, color: T.textMuted }}>{q.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Boss Battles */}
      {data.boss_battles?.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontFamily: T.labelFont, fontSize: 7, color: "#ef4444", marginBottom: 6, letterSpacing: 2, fontWeight: 700 }}>💀 BOSS BATTLES</div>
          {data.boss_battles.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
              <span style={{ fontFamily: T.labelFont, fontSize: 7, color: "#ef4444" }}>☠</span>
              <span style={{ fontFamily: isPixel ? "'VT323'" : "'Silkscreen'", fontSize: isPixel ? 13 : 10, color: "#fca5a5", flex: 1 }}>{b.name}</span>
              <span style={{ fontFamily: T.labelFont, fontSize: 6, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 5px", borderRadius: 3, fontWeight: 700 }}>DEFEATED</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
