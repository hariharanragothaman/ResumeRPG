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
import { CLASS_CONFIG } from "@/lib/config";
import { loadCharacter } from "@/lib/storage";
import type { SavedEntry } from "@/lib/storage";
import { CharacterCard } from "@/components/CharacterCard";
import type { CharacterSheet, StatBlock } from "@/types/character";

const STAT_NAMES: (keyof StatBlock)[] = ["STR", "INT", "DEX", "CON", "WIS", "CHA"];

export function CompareView({ characters }: { characters: SavedEntry[] }) {
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [leftChar, setLeftChar] = useState<CharacterSheet | null>(null);
  const [rightChar, setRightChar] = useState<CharacterSheet | null>(null);

  useEffect(() => {
    setLeftChar(leftId ? loadCharacter(leftId) : null);
  }, [leftId]);

  useEffect(() => {
    setRightChar(rightId ? loadCharacter(rightId) : null);
  }, [rightId]);

  const radarData =
    leftChar && rightChar
      ? STAT_NAMES.map((s) => ({
          stat: s,
          [leftChar.name || "P1"]: leftChar.stats[s] || 0,
          [rightChar.name || "P2"]: rightChar.stats[s] || 0,
        }))
      : null;

  const selStyle: React.CSSProperties = {
    background: "rgba(15,15,30,0.9)",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "10px 12px",
    fontFamily: "'DM Sans'",
    fontSize: 13,
    width: "100%",
    cursor: "pointer",
  };

  if (characters.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px" }}>
        <span style={{ fontSize: 44, display: "block", marginBottom: 14 }}>⚔️</span>
        <p style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: "#64748b", lineHeight: 2.2 }}>
          Generate at least 2 characters<br />to unlock Compare Mode
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: "slideUp 0.4s ease-out" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end", marginBottom: 20 }}>
        <div>
          <label style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", letterSpacing: 2, display: "block", marginBottom: 6 }}>PLAYER 1</label>
          <select value={leftId} onChange={(e) => setLeftId(e.target.value)} style={selStyle}>
            <option value="">Select...</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (Lv.{c.level})</option>
            ))}
          </select>
        </div>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 14, color: "#ef4444", paddingBottom: 10 }}>VS</span>
        <div>
          <label style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", letterSpacing: 2, display: "block", marginBottom: 6 }}>PLAYER 2</label>
          <select value={rightId} onChange={(e) => setRightId(e.target.value)} style={selStyle}>
            <option value="">Select...</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (Lv.{c.level})</option>
            ))}
          </select>
        </div>
      </div>

      {radarData && leftChar && rightChar && (
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", padding: "14px 6px", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: "#475569", textAlign: "center", marginBottom: 6, letterSpacing: 2 }}>STAT COMPARISON</div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "#94a3b8", fontFamily: "'Press Start 2P'", fontSize: 9 }} />
              <PolarRadiusAxis domain={[0, 20]} tick={false} axisLine={false} />
              <Radar name={leftChar.name} dataKey={leftChar.name} stroke={CLASS_CONFIG[leftChar.class]?.color || "#a855f7"} fill={CLASS_CONFIG[leftChar.class]?.color || "#a855f7"} fillOpacity={0.2} strokeWidth={2} />
              <Radar name={rightChar.name} dataKey={rightChar.name} stroke={CLASS_CONFIG[rightChar.class]?.color || "#3b82f6"} fill={CLASS_CONFIG[rightChar.class]?.color || "#3b82f6"} fillOpacity={0.2} strokeWidth={2} />
              <Legend wrapperStyle={{ fontFamily: "'DM Sans'", fontSize: 11, color: "#94a3b8", paddingTop: 8 }} />
            </RadarChart>
          </ResponsiveContainer>

          <div style={{ padding: "10px 14px 0" }}>
            {STAT_NAMES.map((s) => {
              const lv = leftChar.stats[s] || 0;
              const rv = rightChar.stats[s] || 0;
              const lc = CLASS_CONFIG[leftChar.class]?.color || "#a855f7";
              const rcolor = CLASS_CONFIG[rightChar.class]?.color || "#3b82f6";
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: lv > rv ? lc : lv < rv ? "#475569" : "#94a3b8", width: 26, textAlign: "right" }}>{lv}</span>
                  <div style={{ flex: 1, height: 7, background: "rgba(30,30,50,0.8)", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(lv / 20) * 50}%`, background: lc, borderRadius: "4px 0 0 4px", opacity: 0.8 }} />
                    <div style={{ position: "absolute", right: 0, top: 0, height: "100%", width: `${(rv / 20) * 50}%`, background: rcolor, borderRadius: "0 4px 4px 0", opacity: 0.8 }} />
                  </div>
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: rv > lv ? rcolor : rv < lv ? "#475569" : "#94a3b8", width: 26 }}>{rv}</span>
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", width: 30 }}>{s}</span>
                </div>
              );
            })}
          </div>

          {(() => {
            const lt = STAT_NAMES.reduce((a, s) => a + (leftChar.stats[s] || 0), 0);
            const rt = STAT_NAMES.reduce((a, s) => a + (rightChar.stats[s] || 0), 0);
            return (
              <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 14px 6px", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#475569", marginBottom: 3 }}>POWER</div>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 15, color: lt >= rt ? CLASS_CONFIG[leftChar.class]?.color : "#475569" }}>{lt}</div>
                </div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: "#334155", alignSelf: "center" }}>vs</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#475569", marginBottom: 3 }}>POWER</div>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 15, color: rt >= lt ? CLASS_CONFIG[rightChar.class]?.color : "#475569" }}>{rt}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {leftChar && rightChar && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <CharacterCard data={leftChar} compact showQR={false} />
          <CharacterCard data={rightChar} compact showQR={false} />
        </div>
      )}
    </div>
  );
}
