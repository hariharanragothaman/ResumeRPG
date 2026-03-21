import { CLASS_CONFIG, RARITY_CONFIG } from "@/lib/config";
import type { CharacterClass, Rarity } from "@/types/character";

export function PixelAvatar({
  charClass,
  level,
  rarity,
}: {
  charClass: CharacterClass;
  level: number;
  rarity: Rarity;
}) {
  const config = CLASS_CONFIG[charClass] || CLASS_CONFIG["Fullstack Warlock"];
  const rarityConf = RARITY_CONFIG[rarity] || RARITY_CONFIG["Common"];

  return (
    <div
      style={{
        width: 120,
        height: 120,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle at 40% 40%, ${config.color}33, transparent 70%), rgba(15,15,30,0.9)`,
          border: `2px solid ${rarityConf.border}`,
          boxShadow: rarityConf.glow,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 4px)",
          }}
        />
        <span
          style={{
            fontSize: 48,
            filter: `drop-shadow(0 0 8px ${config.color}66)`,
            zIndex: 1,
          }}
        >
          {config.icon}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: -4,
          right: -4,
          background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
          borderRadius: 4,
          padding: "2px 6px",
          fontFamily: "'Press Start 2P'",
          fontSize: 8,
          color: "#fff",
          boxShadow: `0 2px 8px ${config.color}44`,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        LV.{level}
      </div>
    </div>
  );
}
