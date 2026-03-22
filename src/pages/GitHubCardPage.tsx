import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CardFront } from "@/components/CardFront";
import { CardBack } from "@/components/CardBack";
import { HolographicCard } from "@/components/HolographicCard";
import { STAT_NAMES } from "@/lib/config";
import { getPublicSiteOrigin } from "@/lib/siteUrl";
import { exportTradingCard } from "@/lib/export";
import { shareCharacter } from "@/lib/share";
import type { CharacterSheet } from "@/types/character";

interface Percentiles {
  IMPACT: number | null;
  CRAFT: number | null;
  RANGE: number | null;
  TENURE: number | null;
  VISION: number | null;
  INFLUENCE: number | null;
  overall: number | null;
}

interface CardResult {
  character: CharacterSheet & { _github?: { login: string; avatar: string } };
  percentiles: Percentiles | null;
  meta: { cached: boolean; refreshedAt: string; accessCount: number };
}

interface CohortStats {
  total_cards: number;
  avg_power: number;
  avg_level: number;
  legendary_count: number;
  epic_count: number;
  rare_count: number;
}

export function GitHubCardPage() {
  const { username } = useParams<{ username: string }>();
  const [result, setResult] = useState<CardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [cohort, setCohort] = useState<CohortStats | null>(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/gh/${encodeURIComponent(username)}`)
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => ({})) as { error?: string };
            const msg = typeof body.error === "string"
              ? body.error
              : (r.status === 404 ? "GitHub user not found" : "Failed to load card");
            throw new Error(msg);
          }
          return r.json() as Promise<CardResult>;
        }),
      fetch("/api/gh-stats")
        .then((r) => r.ok ? r.json() as Promise<CohortStats> : null)
        .catch(() => null),
    ])
      .then(([cardResult, statsResult]) => { setResult(cardResult); setCohort(statsResult); })
      .catch((e) => {
        const isNetwork = e instanceof TypeError; // e.g. API not running — fetch fails
        setError(isNetwork
          ? "Cannot reach API. Use npm run dev (starts Vite + API on :8787), not dev:web only."
          : (e instanceof Error ? e.message : "Failed to load card"));
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 44, animation: "float 2s ease-in-out infinite" }}>⚔️</div>
        <p style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#a855f7", marginTop: 20 }}>
          Generating card for @{username}...
        </p>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: "#475569", marginTop: 8 }}>
          Fetching GitHub profile and calculating stats
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 36, marginBottom: 16 }}>💀</p>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 15, color: "#fca5a5" }}>{error}</p>
        <Link to="/" style={{ display: "inline-block", marginTop: 20, fontFamily: "'Press Start 2P'", fontSize: 9, color: "#a855f7", textDecoration: "none" }}>
          ← Back to ResumeRPG
        </Link>
      </div>
    );
  }

  if (!result) return null;
  const { character, percentiles, meta } = result;
  const publicOrigin = getPublicSiteOrigin();
  const readmeBadgeMd = `[![ResumeRPG](${publicOrigin}/gh/${username}/badge.svg?style=full)](${publicOrigin}/gh/${username})`;

  const handleExport = async () => {
    setExporting(true);
    try { await exportTradingCard(character); } catch { /* best-effort export */ }
    setExporting(false);
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px 60px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Link to="/" style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", textDecoration: "none", letterSpacing: 2 }}>
          ← RESUME RPG
        </Link>
      </div>

      {/* Card */}
      <HolographicCard
        theme="fantasy"
        front={<CardFront data={character} theme="fantasy" />}
        back={<CardBack data={character} theme="fantasy" />}
      />

      {/* Percentile badges */}
      {percentiles?.overall != null && (
        <div style={{ marginTop: 20, maxWidth: 420, margin: "20px auto 0" }}>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", textAlign: "center", letterSpacing: 2, marginBottom: 4 }}>
            PERCENTILE RANKING
          </div>
          {cohort?.total_cards && (
            <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: "#475569", textAlign: "center", marginBottom: 10 }}>
              Ranked among {cohort.total_cards.toLocaleString()} indexed developers
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {STAT_NAMES.map((stat) => {
              const pct = percentiles[stat as keyof Percentiles] as number | null;
              if (pct == null) return null;
              const topPct = Math.max(1, Math.round(100 - pct));
              return (
                <div key={stat} style={{
                  textAlign: "center", padding: "8px 4px",
                  background: "rgba(255,255,255,0.02)", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.06)"
                }}>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#475569", marginBottom: 4 }}>{stat}</div>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: topPct <= 10 ? "#f59e0b" : topPct <= 25 ? "#a855f7" : "#94a3b8" }}>
                    Top {topPct}%
                  </div>
                </div>
              );
            })}
            <div style={{
              textAlign: "center", padding: "8px 4px",
              background: "rgba(168,85,247,0.08)", borderRadius: 8,
              border: "1px solid rgba(168,85,247,0.2)"
            }}>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: "#a855f7", marginBottom: 4 }}>OVERALL</div>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#a855f7" }}>
                Top {Math.max(1, Math.round(100 - percentiles.overall))}%
              </div>
            </div>
          </div>
          <p style={{ fontFamily: "'DM Sans'", fontSize: 10, color: "#334155", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
            Rankings are relative to developers indexed on ResumeRPG, not all GitHub users.
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16, maxWidth: 420, margin: "16px auto 0" }}>
        <button onClick={handleExport} disabled={exporting} style={{
          padding: "11px 6px", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff",
          border: "none", borderRadius: 8, cursor: "pointer",
          fontFamily: "'Press Start 2P'", fontSize: 7, fontWeight: 700,
          boxShadow: "0 4px 16px rgba(168,85,247,0.25)"
        }}>{exporting ? "⏳" : "🃏 EXPORT"}</button>
        <button onClick={() => shareCharacter(character)} style={{
          padding: "11px 6px", background: "rgba(255,255,255,0.04)", color: "#94a3b8",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer",
          fontFamily: "'Press Start 2P'", fontSize: 7
        }}>📤 SHARE</button>
        <Link to={`/gh/${username}/vs/`} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "11px 6px", background: "rgba(255,255,255,0.04)", color: "#94a3b8",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, textDecoration: "none",
          fontFamily: "'Press Start 2P'", fontSize: 7
        }}>⚔️ COMPARE</Link>
      </div>

      {/* Embed code */}
      <div style={{ marginTop: 20, maxWidth: 420, margin: "20px auto 0" }}>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#475569", letterSpacing: 2, marginBottom: 8 }}>
          ADD TO YOUR GITHUB README
        </div>
        <div style={{
          padding: "10px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'DM Sans'", fontSize: 11,
          color: "#94a3b8", wordBreak: "break-all", lineHeight: 1.6, cursor: "pointer"
        }} onClick={() => {
          navigator.clipboard?.writeText(readmeBadgeMd).then(() => alert("Copied!"));
        }}>
          {readmeBadgeMd}
          <span style={{ display: "block", marginTop: 4, fontSize: 10, color: "#475569" }}>Click to copy</span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 10, color: "#334155" }}>
          {meta.cached ? "Cached" : "Freshly generated"} · {meta.accessCount} view{meta.accessCount !== 1 ? "s" : ""} · Refreshed {new Date(meta.refreshedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
