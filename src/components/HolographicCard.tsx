import { useEffect, useRef, useState, type ReactNode } from "react";
import { THEMES, type ThemeName } from "@/lib/config";

export function HolographicCard({
  front,
  back,
  theme,
}: {
  front: ReactNode;
  back: ReactNode;
  theme: ThemeName;
}) {
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [height, setHeight] = useState<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const frontSizerRef = useRef<HTMLDivElement>(null);
  const backSizerRef = useRef<HTMLDivElement>(null);
  const T = THEMES[theme];

  useEffect(() => {
    const measure = () => {
      const fh = frontSizerRef.current?.offsetHeight ?? 0;
      const bh = backSizerRef.current?.offsetHeight ?? 0;
      setHeight(Math.max(fh, bh));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (frontSizerRef.current) ro.observe(frontSizerRef.current);
    if (backSizerRef.current) ro.observe(backSizerRef.current);
    return () => ro.disconnect();
  }, [front, back]);

  const handleMouse = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = ((e.clientY - cy) / (rect.height / 2)) * -12;
    const y = ((e.clientX - cx) / (rect.width / 2)) * 12;
    setTilt({ x, y });
  };

  const isLight = T.light;
  const holoGradient =
    hovering && !isLight
      ? `linear-gradient(${105 + tilt.y * 3}deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)`
      : "none";

  return (
    <div style={{ perspective: 1200, width: "100%", maxWidth: 420, margin: "0 auto" }}>
      {/* Hidden sizers rendered in normal flow to get true content heights */}
      <div style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", width: "100%", maxWidth: 420 }} aria-hidden>
        <div ref={frontSizerRef}>{front}</div>
        <div ref={backSizerRef}>{back}</div>
      </div>

      <div
        ref={cardRef}
        onClick={() => setFlipped(!flipped)}
        onMouseMove={handleMouse}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); setTilt({ x: 0, y: 0 }); }}
        style={{
          width: "100%",
          height: height || "auto",
          position: "relative",
          cursor: "pointer",
          transformStyle: "preserve-3d",
          transform: `rotateX(${hovering ? tilt.x : 0}deg) rotateY(${flipped ? 180 + (hovering ? tilt.y : 0) : hovering ? tilt.y : 0}deg)`,
          transition: hovering
            ? "transform 0.1s ease-out"
            : "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div style={{ backfaceVisibility: "hidden", position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: holoGradient, zIndex: 20, pointerEvents: "none" }} />
          {front}
        </div>
        <div style={{ backfaceVisibility: "hidden", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", transform: "rotateY(180deg)" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: holoGradient, zIndex: 20, pointerEvents: "none" }} />
          {back}
        </div>
      </div>
      <p style={{ fontFamily: T.bodyFont, fontSize: 11, color: T.textDim, textAlign: "center", marginTop: 10, opacity: 0.7 }}>
        Click to flip · Hover for holographic tilt · Export for 750×1050 PNG
      </p>
    </div>
  );
}
