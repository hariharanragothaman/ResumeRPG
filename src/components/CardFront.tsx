import { CLASS_CONFIG, RARITY_CONFIG, STAT_NAMES, THEMES, type ThemeName } from "@/lib/config";
import { getQRUrl } from "@/lib/share";
import { Particles } from "@/components/Particles";
import { StatBar } from "@/components/StatBar";
import type { CharacterSheet } from "@/types/character";

export function CardFront({
  data,
  theme = "fantasy",
  compact = false,
}: {
  data: CharacterSheet;
  theme?: ThemeName;
  compact?: boolean;
}) {
  const T = THEMES[theme];
  const cc = CLASS_CONFIG[data.class] || CLASS_CONFIG["Fullstack Warlock"];
  const rc = RARITY_CONFIG[data.rarity] || RARITY_CONFIG["Common"];
  const showParticles = T.particleShape !== "none" && !compact;
  const isPixel = theme === "pixel";
  const ghAvatar = (data as CharacterSheet & { _github?: { avatar?: string } })._github?.avatar;

  return (
    <div style={{
      width: "100%", background: T.cardBg, borderRadius: isPixel ? 4 : 14,
      border: (isPixel ? "3px solid " : "2px solid ") + (T.light ? rc.border + "44" : rc.border + "55"),
      boxShadow: T.light ? "0 4px 24px rgba(0,0,0,0.08)" : rc.glow + ",0 16px 48px rgba(0,0,0,0.5)",
      overflow: "hidden", position: "relative",
    }}>
      {showParticles && <Particles classColor={cc.color} shape={T.particleShape} count={15} />}
      {T.scanlines && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, opacity: 0.025, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 3px)" }} />}
      {T.gridOverlay && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, opacity: 0.04, backgroundImage: "linear-gradient(rgba(0,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.3) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />}

      {/* Header */}
      <div style={{ padding: compact ? "12px 12px 10px" : "16px 16px 12px", background: `linear-gradient(135deg,${cc.color}${T.light ? "08" : "15"},transparent 60%)`, borderBottom: `1px solid ${cc.color}${T.light ? "15" : "22"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <span style={{ fontFamily: T.labelFont, fontSize: 7, color: rc.color, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>★ {data.rarity} ★</span>
          <span style={{ fontFamily: T.labelFont, fontSize: 6, color: T.textDim, background: T.surface, padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>RESUME RPG</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
          <div style={{
            width: 88, height: 88, flexShrink: 0, borderRadius: isPixel ? 2 : 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `radial-gradient(circle at 40% 40%,${cc.color}${T.light ? "15" : "33"},transparent 70%),${T.light ? "rgba(0,0,0,0.03)" : "rgba(15,15,30,0.9)"}`,
            border: `2px solid ${rc.border}`, boxShadow: rc.glow, position: "relative", overflow: "hidden",
          }}>
            {ghAvatar ? (
              <img src={ghAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: isPixel ? 0 : 6 }} />
            ) : (
              <span style={{ fontSize: 40, filter: `drop-shadow(0 0 8px ${cc.color}66)`, zIndex: 1 }}>{cc.icon}</span>
            )}
            <div style={{ position: "absolute", bottom: -3, right: -3, background: `linear-gradient(135deg,${cc.color},${cc.color}cc)`, borderRadius: 3, padding: "1px 5px", fontFamily: T.labelFont, fontSize: 7, color: "#fff", fontWeight: 700 }}>LV.{data.level}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: T.headingFont, fontSize: compact ? 13 : 16, color: T.text, margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>{data.name}</h2>
            <div style={{ fontFamily: T.labelFont, fontSize: 8, color: cc.color, marginTop: 4, fontWeight: 700 }}>{cc.icon} {data.class}</div>
            {data.guild && <div style={{ fontFamily: T.bodyFont, fontSize: 11, color: T.textMuted, marginTop: 2 }}>⚔️ {data.guild}</div>}
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontFamily: T.labelFont, fontSize: 6, color: T.textDim, fontWeight: 600 }}>XP</span>
                <span style={{ fontFamily: T.labelFont, fontSize: 6, color: T.textDim, fontWeight: 600 }}>{data.xp_current}/{data.xp_max}</span>
              </div>
              <div style={{ height: 5, background: T.barBg, borderRadius: isPixel ? 0 : 3, overflow: "hidden" }}>
                <div style={{ width: (data.xp_current / (data.xp_max || 1)) * 100 + "%", height: "100%", background: `linear-gradient(90deg,${cc.color}aa,${cc.color})`, borderRadius: isPixel ? 0 : 3 }} />
              </div>
            </div>
          </div>
        </div>
        {data.tagline && <p style={{ fontFamily: T.bodyFont, fontSize: 11, color: T.textMuted, fontStyle: "italic", margin: "8px 0 0", textAlign: "center", opacity: 0.8 }}>"{data.tagline}"</p>}
      </div>

      {/* Stats */}
      <div style={{ padding: compact ? "10px 12px" : "12px 16px", borderBottom: "1px solid " + T.surfaceBorder }}>
        <div style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, marginBottom: 7, letterSpacing: 2, fontWeight: 700 }}>POWER PROFILE</div>
        {data.stats && STAT_NAMES.map((k, i) => <StatBar key={k} label={k} value={data.stats[k] || 0} color={cc.color} delay={i * 80} theme={theme} />)}
      </div>

      {/* Skills */}
      <div style={{ padding: compact ? "10px 12px" : "12px 16px", borderBottom: "1px solid " + T.surfaceBorder }}>
        <div style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, marginBottom: 7, letterSpacing: 2, fontWeight: 700 }}>SKILL TREE</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {data.skills?.map((s, i) => (
            <span key={i} style={{
              fontFamily: isPixel ? "'VT323'" : "'Silkscreen'",
              fontSize: isPixel ? 13 : 9,
              color: cc.color,
              background: cc.color + (T.light ? "12" : "15"),
              border: "1px solid " + cc.color + (T.light ? "25" : "33"),
              padding: "3px 7px",
              borderRadius: isPixel ? 0 : 3,
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* QR on front (non-compact) */}
      {!compact && (
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <img src={getQRUrl(data)} alt="QR" style={{ width: 60, height: 60, borderRadius: 4, border: "1px solid " + T.surfaceBorder }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <div style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, letterSpacing: 2, fontWeight: 700 }}>SCAN TO VIEW</div>
            <div style={{ fontFamily: T.bodyFont, fontSize: 11, color: T.textMuted }}>Share your character card</div>
          </div>
        </div>
      )}
    </div>
  );
}
