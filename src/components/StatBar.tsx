import { useEffect, useState } from "react";
import { THEMES, type ThemeName } from "@/lib/config";

export function StatBar({
  label,
  value,
  maxVal = 20,
  color,
  delay = 0,
  theme = "fantasy",
  animated = true,
}: {
  label: string;
  value: number;
  maxVal?: number;
  color: string;
  delay?: number;
  theme?: ThemeName;
  animated?: boolean;
}) {
  const T = THEMES[theme];
  const [anim, setAnim] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      let c = 0;
      const iv = setInterval(() => {
        c += 0.5;
        if (c >= value) { setAnim(value); clearInterval(iv); } else setAnim(c);
      }, 18);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  const pct = (anim / maxVal) * 100;
  const isPixel = theme === "pixel";
  const fontSizeLabel = T.labelFont.includes("Orbitron") || T.labelFont.includes("Inter") ? 10 : 9;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span style={{ fontFamily: T.labelFont, fontSize: fontSizeLabel, color: T.textMuted, width: 34, textAlign: "right", fontWeight: T.light ? 600 : 400 }}>{label}</span>
      <div style={{ flex: 1, height: 14, background: T.barBg, borderRadius: isPixel ? 0 : 2, border: "1px solid " + T.barBorder, overflow: "hidden", position: "relative" }}>
        <div style={{
          width: pct + "%", height: "100%",
          background: `linear-gradient(90deg,${color}cc,${color})`,
          borderRadius: isPixel ? 0 : 2,
          position: "relative",
          boxShadow: animated ? `0 0 8px ${color}33` : "none",
          animation: animated ? "pulse-bar 3s ease-in-out infinite" : "none",
        }}>
          {!T.light && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "40%",
              background: "rgba(255,255,255,0.12)",
              borderRadius: isPixel ? 0 : "2px 2px 0 0",
            }} />
          )}
        </div>
      </div>
      <span style={{ fontFamily: T.labelFont, fontSize: fontSizeLabel, color, width: 24, textAlign: "left", fontWeight: T.light ? 700 : 400 }}>{value}</span>
    </div>
  );
}
