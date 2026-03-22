import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CardFront } from "@/components/CardFront";
import { STAT_NAMES, THEMES } from "@/lib/config";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import type { CharacterSheet } from "@/types/character";
import { CLASS_CONFIG } from "@/lib/config";

interface CardResult {
  character: CharacterSheet & { _github?: { login: string; avatar: string } };
  percentiles: Record<string, number | null> | null;
  meta: { cached: boolean; accessCount: number };
}

interface CompareResult {
  left: CardResult;
  right: CardResult;
}

export function GitHubComparePage() {
  const { username, other } = useParams<{ username: string; other?: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otherInput, setOtherInput] = useState(other || "");
  const T = THEMES.fantasy;

  useEffect(() => {
    if (!username || !other) return;
    setLoading(true);
    setError(null);
    fetch(`/api/gh/${encodeURIComponent(username)}/vs/${encodeURIComponent(other)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load comparison");
        return r.json() as Promise<CompareResult>;
      })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [username, other]);

  const handleCompare = () => {
    const trimmed = otherInput.trim();
    if (trimmed && username) {
      navigate(`/gh/${username}/vs/${trimmed}`);
    }
  };

  // If no "other" user yet, show the input form
  if (!other) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <Link to={`/gh/${username}`} style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", textDecoration: "none", letterSpacing: 2 }}>
          ← BACK TO @{username?.toUpperCase()}
        </Link>
        <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 14, color: "#ef4444", marginTop: 24, marginBottom: 8 }}>⚔️ DUEL MODE</h2>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
          Who does @{username} face?
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={otherInput}
            onChange={(e) => setOtherInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCompare()}
            placeholder="Enter GitHub username"
            style={{
              flex: 1, padding: "12px 14px", background: "rgba(10,10,26,0.8)", color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
              fontFamily: "'DM Sans'", fontSize: 14
            }}
          />
          <button onClick={handleCompare} disabled={!otherInput.trim()} style={{
            padding: "12px 20px", background: otherInput.trim() ? "linear-gradient(135deg,#dc2626,#ef4444)" : "rgba(255,255,255,0.05)",
            color: otherInput.trim() ? "#fff" : "#475569", border: "none", borderRadius: 10, cursor: "pointer",
            fontFamily: "'Press Start 2P'", fontSize: 9
          }}>⚔️ FIGHT</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 44, animation: "float 2s ease-in-out infinite" }}>⚔️</div>
        <p style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#ef4444", marginTop: 20 }}>
          @{username} vs @{other}
        </p>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: "#475569", marginTop: 8 }}>Loading combatants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 15, color: "#fca5a5" }}>{error}</p>
        <Link to={`/gh/${username}`} style={{ display: "inline-block", marginTop: 16, fontFamily: "'Press Start 2P'", fontSize: 9, color: "#a855f7", textDecoration: "none" }}>
          ← Back
        </Link>
      </div>
    );
  }

  if (!result) return null;
  const { left, right } = result;
  const lc = CLASS_CONFIG[left.character.class]?.color || "#a855f7";
  const rc = CLASS_CONFIG[right.character.class]?.color || "#3b82f6";
  const lTotal = STAT_NAMES.reduce((a, s) => a + (left.character.stats[s as keyof typeof left.character.stats] || 0), 0);
  const rTotal = STAT_NAMES.reduce((a, s) => a + (right.character.stats[s as keyof typeof right.character.stats] || 0), 0);

  const radarData = STAT_NAMES.map((s) => ({
    stat: s,
    [left.character.name]: left.character.stats[s as keyof typeof left.character.stats] || 0,
    [right.character.name]: right.character.stats[s as keyof typeof right.character.stats] || 0,
  }));

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 16px 60px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Link to="/" style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", textDecoration: "none", letterSpacing: 2 }}>
          ← RESUME RPG
        </Link>
        <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#ef4444", marginTop: 12 }}>⚔️ DUEL</h2>
      </div>

      {/* Radar chart */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", padding: "14px 6px", marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: "#94a3b8", fontFamily: "'Press Start 2P'", fontSize: 8 }} />
            <PolarRadiusAxis domain={[0, 20]} tick={false} axisLine={false} />
            <Radar name={left.character.name} dataKey={left.character.name} stroke={lc} fill={lc} fillOpacity={0.2} strokeWidth={2} />
            <Radar name={right.character.name} dataKey={right.character.name} stroke={rc} fill={rc} fillOpacity={0.2} strokeWidth={2} />
            <Legend wrapperStyle={{ fontFamily: "'DM Sans'", fontSize: 11, color: "#94a3b8", paddingTop: 8 }} />
          </RadarChart>
        </ResponsiveContainer>

        {/* Power totals */}
        <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 14px 6px", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#475569", marginBottom: 3 }}>POWER</div>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 18, color: lTotal >= rTotal ? lc : "#475569" }}>{lTotal}</div>
            <Link to={`/gh/${username}`} style={{ fontFamily: "'DM Sans'", fontSize: 11, color: lc, textDecoration: "none" }}>@{username}</Link>
          </div>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#334155", alignSelf: "center" }}>vs</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#475569", marginBottom: 3 }}>POWER</div>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 18, color: rTotal >= lTotal ? rc : "#475569" }}>{rTotal}</div>
            <Link to={`/gh/${other}`} style={{ fontFamily: "'DM Sans'", fontSize: 11, color: rc, textDecoration: "none" }}>@{other}</Link>
          </div>
        </div>
      </div>

      {/* Side-by-side cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CardFront data={left.character} theme="fantasy" compact />
        <CardFront data={right.character} theme="fantasy" compact />
      </div>

      {/* Share this duel */}
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={() => {
          const text = `⚔️ @${username} (Power ${lTotal}) vs @${other} (Power ${rTotal}) — who wins?\n\nSee the duel: https://resumerpg.app/gh/${username}/vs/${other}`;
          if (navigator.share) navigator.share({ title: "ResumeRPG Duel", text });
          else navigator.clipboard?.writeText(text).then(() => alert("Copied!"));
        }} style={{
          padding: "12px 24px", background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff",
          border: "none", borderRadius: 10, cursor: "pointer",
          fontFamily: "'Press Start 2P'", fontSize: 9, boxShadow: "0 4px 16px rgba(239,68,68,0.3)"
        }}>📤 SHARE THIS DUEL</button>
      </div>
    </div>
  );
}
