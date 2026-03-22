import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CardFront } from "@/components/CardFront";
import { CardBack } from "@/components/CardBack";
import { HolographicCard } from "@/components/HolographicCard";
import type { CharacterSheet } from "@/types/character";

export function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [character, setCharacter] = useState<CharacterSheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (character) {
      document.title = `${character.name} — Lv.${character.level} ${character.class} | ResumeRPG`;
    } else {
      document.title = "Shared Card | ResumeRPG";
    }
  }, [character]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void fetch(`/api/share/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json() as Promise<CharacterSheet>;
      })
      .then((c) => { if (!cancelled) setCharacter(c); })
      .catch(() => { if (!cancelled) setError("This share link expired or never existed."); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 15, color: "#64748b" }}>{error}</p>
        <Link to="/" style={{ display: "inline-block", marginTop: 16, fontFamily: "'Press Start 2P'", fontSize: 9, color: "#a855f7", textDecoration: "none" }}>
          ← Forge your own
        </Link>
      </div>
    );
  }

  if (!character) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 32, animation: "float 2s ease-in-out infinite" }}>⚔️</div>
        <p style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: "#475569", marginTop: 16 }}>Loading character...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 24, fontFamily: "'Press Start 2P'", fontSize: 8, color: "#475569", letterSpacing: 2 }}>
        SHARED LOADOUT
      </div>
      <HolographicCard
        theme="fantasy"
        front={<CardFront data={character} theme="fantasy" />}
        back={<CardBack data={character} theme="fantasy" />}
      />
    </div>
  );
}
