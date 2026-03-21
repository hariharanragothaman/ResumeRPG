import { useState } from "react";
import { CLASS_CONFIG, RARITY_CONFIG } from "@/lib/config";
import { getQRUrl } from "@/lib/share";
import { InventoryItemRow } from "@/components/InventoryItem";
import { PixelAvatar } from "@/components/PixelAvatar";
import { StatBar } from "@/components/StatBar";
import type { CharacterSheet, StatBlock } from "@/types/character";

const STAT_ORDER: (keyof StatBlock)[] = ["STR", "INT", "DEX", "CON", "WIS", "CHA"];

export function CharacterCard({
  data,
  compact = false,
  showQR = true,
}: {
  data: CharacterSheet;
  compact?: boolean;
  showQR?: boolean;
}) {
  const cc = CLASS_CONFIG[data.class] || CLASS_CONFIG["Fullstack Warlock"];
  const rc = RARITY_CONFIG[data.rarity] || RARITY_CONFIG["Common"];
  const [questOpen, setQuestOpen] = useState(false);

  return (
    <div
      data-card="true"
      style={{
        width: "100%",
        maxWidth: compact ? 340 : 420,
        background: "linear-gradient(165deg,#0c0c1d 0%,#111128 40%,#0a0a1a 100%)",
        borderRadius: 14,
        border: `2px solid ${rc.border}55`,
        boxShadow: `${rc.glow},0 16px 48px rgba(0,0,0,0.5)`,
        overflow: "hidden",
        position: "relative",
        fontSize: compact ? "92%" : "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 10,
          opacity: 0.025,
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 3px)",
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: compact ? "14px 14px 12px" : "18px 18px 14px",
          background: `linear-gradient(135deg,${cc.color}15,transparent 60%)`,
          borderBottom: `1px solid ${cc.color}22`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: rc.color, textTransform: "uppercase", letterSpacing: 2, textShadow: `0 0 10px ${rc.color}44` }}>★ {data.rarity} ★</span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#475569", background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 3 }}>RESUME RPG</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
          <PixelAvatar charClass={data.class} level={data.level} rarity={data.rarity} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "'Silkscreen'", fontSize: compact ? 14 : 17, color: "#f1f5f9", margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.name}</h2>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: cc.color, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>{cc.icon} {data.class}</div>
            {data.guild && <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: "#64748b", marginTop: 3 }}>⚔️ {data.guild}</div>}
            <div style={{ marginTop: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#475569" }}>XP</span>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#475569" }}>{data.xp_current}/{data.xp_max}</span>
              </div>
              <div style={{ height: 5, background: "rgba(30,30,50,0.8)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${(data.xp_current / (data.xp_max || 1)) * 100}%`, height: "100%", background: `linear-gradient(90deg,${cc.color}aa,${cc.color})`, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>
        {data.tagline && <p style={{ fontFamily: "'DM Sans'", fontSize: 11, color: "#94a3b8", fontStyle: "italic", margin: "10px 0 0", textAlign: "center", opacity: 0.8 }}>"{data.tagline}"</p>}
      </div>

      {/* Stats */}
      <div style={{ padding: compact ? "12px 14px" : "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", marginBottom: 8, letterSpacing: 2 }}>ATTRIBUTES</div>
        {STAT_ORDER.map((k, i) => (
          <StatBar key={k} label={k} value={data.stats[k]} color={cc.color} delay={i * 80} />
        ))}
      </div>

      {/* Skills */}
      <div style={{ padding: compact ? "10px 14px" : "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", marginBottom: 8, letterSpacing: 2 }}>SKILL TREE</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {data.skills.map((s) => (
            <span key={s} style={{ fontFamily: "'Silkscreen'", fontSize: 9, color: cc.color, background: `${cc.color}15`, border: `1px solid ${cc.color}33`, padding: "3px 8px", borderRadius: 3 }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Inventory — full mode only */}
      {!compact && data.inventory.length > 0 && (
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", marginBottom: 8, letterSpacing: 2 }}>INVENTORY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {data.inventory.map((item, i) => (
              <InventoryItemRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* QR Code */}
      {showQR && !compact && (
        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <img
            src={getQRUrl(data)}
            alt="QR"
            style={{ width: 68, height: 68, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", letterSpacing: 2, marginBottom: 4 }}>SCAN TO VIEW</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: "#64748b" }}>Share your character card</div>
          </div>
        </div>
      )}

      {/* Backstory */}
      {!compact && data.backstory && (
        <div style={{ padding: "14px 18px", borderBottom: data.quests_completed.length ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", marginBottom: 6, letterSpacing: 2 }}>LORE</div>
          <p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{data.backstory}</p>
        </div>
      )}

      {/* Quest Log */}
      {!compact && data.quests_completed.length > 0 && (
        <div>
          <button
            onClick={() => setQuestOpen(!questOpen)}
            style={{
              width: "100%", padding: "10px 18px", background: "transparent", border: "none",
              borderTop: "1px solid rgba(255,255,255,0.04)", color: "#94a3b8",
              fontFamily: "'Press Start 2P'", fontSize: 8, cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <span>📜 QUEST LOG ({data.quests_completed.length})</span>
            <span style={{ transform: questOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>
          {questOpen && (
            <div style={{ padding: "0 18px 14px" }}>
              {data.quests_completed.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#22c55e", marginTop: 2 }}>✓</span>
                  <div>
                    <div style={{ fontFamily: "'Silkscreen'", fontSize: 10, color: "#e2e8f0" }}>{q.name}</div>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: "#64748b", marginTop: 1 }}>{q.description}</div>
                  </div>
                </div>
              ))}
              {data.boss_battles.length > 0 && (
                <>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#ef4444", margin: "10px 0 6px", letterSpacing: 2 }}>💀 BOSS BATTLES</div>
                  {data.boss_battles.map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#ef4444" }}>☠</span>
                      <span style={{ fontFamily: "'Silkscreen'", fontSize: 10, color: "#fca5a5" }}>{b.name}</span>
                      <span style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#22c55e", marginLeft: "auto", background: "rgba(34,197,94,0.1)", padding: "2px 5px", borderRadius: 3 }}>DEFEATED</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
