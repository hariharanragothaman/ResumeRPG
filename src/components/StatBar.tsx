import { useEffect, useState } from "react";

export function StatBar({
  label,
  value,
  maxVal = 20,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  maxVal?: number;
  color: string;
  delay?: number;
}) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += 0.5;
        if (current >= value) {
          setAnimated(value);
          clearInterval(interval);
        } else {
          setAnimated(current);
        }
      }, 20);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const pct = (animated / maxVal) * 100;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span
        style={{
          fontFamily: "'Press Start 2P'",
          fontSize: 9,
          color: "#94a3b8",
          width: 32,
          textAlign: "right",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 14,
          background: "rgba(30,30,50,0.8)",
          borderRadius: 2,
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            borderRadius: 2,
            transition: "width 0.1s linear",
            position: "relative",
            boxShadow: `0 0 10px ${color}44`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "40%",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "2px 2px 0 0",
            }}
          />
        </div>
      </div>
      <span
        style={{
          fontFamily: "'Press Start 2P'",
          fontSize: 9,
          color,
          width: 24,
          textAlign: "left",
        }}
      >
        {value}
      </span>
    </div>
  );
}
