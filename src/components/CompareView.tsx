import { useEffect, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { CLASS_CONFIG, STAT_NAMES, THEMES, type ThemeName } from "@/lib/config";
import { loadCharacter } from "@/lib/storage";
import type { SavedEntry } from "@/lib/storage";
import { CardFront } from "@/components/CardFront";
import type { CharacterSheet } from "@/types/character";

export function CompareView({
  characters,
  theme = "fantasy",
}: {
  characters: SavedEntry[];
  theme?: ThemeName;
}) {
  const T = THEMES[theme];
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [leftChar, setLeftChar] = useState<CharacterSheet | null>(null);
  const [rightChar, setRightChar] = useState<CharacterSheet | null>(null);

  useEffect(() => { setLeftChar(leftId ? loadCharacter(leftId) : null); }, [leftId]);
  useEffect(() => { setRightChar(rightId ? loadCharacter(rightId) : null); }, [rightId]);

  const radarData =
    leftChar && rightChar
      ? STAT_NAMES.map((s) => ({
          stat: s,
          [leftChar.name || "P1"]: leftChar.stats[s] || 0,
          [rightChar.name || "P2"]: rightChar.stats[s] || 0,
        }))
      : null;

  const selStyle: React.CSSProperties = {
    background: T.light ? "white" : "rgba(15,15,30,0.9)",
    color: T.text,
    border: "1px solid " + T.surfaceBorder,
    borderRadius: 8,
    padding: "10px 12px",
    fontFamily: T.bodyFont,
    fontSize: 13,
    width: "100%",
    cursor: "pointer",
  };

  if (characters.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px" }}>
        <span style={{ fontSize: 44, display: "block", marginBottom: 14 }}>⚔️</span>
        <p style={{ fontFamily: T.labelFont, fontSize: 9, color: T.textDim, lineHeight: 2.2 }}>
          Generate at least 2 characters<br />to unlock Compare Mode
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: "slideUp 0.4s ease-out" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end", marginBottom: 20 }}>
        <div>
          <label style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, letterSpacing: 2, display: "block", marginBottom: 6, fontWeight: 700 }}>PLAYER 1</label>
          <select value={leftId} onChange={(e) => setLeftId(e.target.value)} style={selStyle}>
            <option value="">Select...</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name} (Lv.{c.level})</option>)}
          </select>
        </div>
        <span style={{ fontFamily: T.labelFont, fontSize: 14, color: "#ef4444", paddingBottom: 10, fontWeight: 900 }}>VS</span>
        <div>
          <label style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDim, letterSpacing: 2, display: "block", marginBottom: 6, fontWeight: 700 }}>PLAYER 2</label>
          <select value={rightId} onChange={(e) => setRightId(e.target.value)} style={selStyle}>
            <option value="">Select...</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name} (Lv.{c.level})</option>)}
          </select>
        </div>
      </div>

      {radarData && leftChar && rightChar && (
        <div style={{ background: T.surface, borderRadius: 14, border: "1px solid " + T.surfaceBorder, padding: "14px 6px", marginBottom: 20 }}>
          <div style={{ fontFamily: T.labelFont, fontSize: 8, color: T.textDim, textAlign: "center", marginBottom: 6, letterSpacing: 2, fontWeight: 700 }}>STAT COMPARISON</div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={T.light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"} />
              <PolarAngleAxis dataKey="stat" tick={{ fill: T.textMuted, fontFamily: T.labelFont, fontSize: 9 }} />
              <PolarRadiusAxis domain={[0, 20]} tick={false} axisLine={false} />
              <Radar name={leftChar.name} dataKey={leftChar.name} stroke={CLASS_CONFIG[leftChar.class]?.color || "#a855f7"} fill={CLASS_CONFIG[leftChar.class]?.color || "#a855f7"} fillOpacity={0.2} strokeWidth={2} />
              <Radar name={rightChar.name} dataKey={rightChar.name} stroke={CLASS_CONFIG[rightChar.class]?.color || "#3b82f6"} fill={CLASS_CONFIG[rightChar.class]?.color || "#3b82f6"} fillOpacity={0.2} strokeWidth={2} />
              <Legend wrapperStyle={{ fontFamily: T.bodyFont, fontSize: 11, color: T.textMuted, paddingTop: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
          {(() => {
            const lt = STAT_NAMES.reduce((a, s) => a + (leftChar.stats[s] || 0), 0);
            const rt = STAT_NAMES.reduce((a, s) => a + (rightChar.stats[s] || 0), 0);
            return (
              <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 14px 6px", borderTop: "1px solid " + T.surfaceBorder, marginTop: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: T.labelFont, fontSize: 6, color: T.textDim, marginBottom: 3, fontWeight: 700 }}>POWER</div>
                  <div style={{ fontFamily: T.labelFont, fontSize: 15, color: lt >= rt ? CLASS_CONFIG[leftChar.class]?.color : T.textDim, fontWeight: 900 }}>{lt}</div>
                </div>
                <div style={{ fontFamily: T.labelFont, fontSize: 8, color: T.textDark, alignSelf: "center" }}>vs</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: T.labelFont, fontSize: 6, color: T.textDim, marginBottom: 3, fontWeight: 700 }}>POWER</div>
                  <div style={{ fontFamily: T.labelFont, fontSize: 15, color: rt >= lt ? CLASS_CONFIG[rightChar.class]?.color : T.textDim, fontWeight: 900 }}>{rt}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {leftChar && rightChar && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <CardFront data={leftChar} theme={theme} compact />
          <CardFront data={rightChar} theme={theme} compact />
        </div>
      )}
    </div>
  );
}
