import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PIXEL_FONT_URL, THEMES, type ThemeName } from "@/lib/config";
import { Starfield } from "@/components/Starfield";

export function Layout({ children, theme = "fantasy" }: { children: ReactNode; theme?: ThemeName }) {
  const T = THEMES[theme];
  const accent = T.light ? "#6d28d9" : "#a855f7";

  return (
    <>
      <link href={PIXEL_FONT_URL} rel="stylesheet" />
      <style>{`
        @keyframes twinkle{0%,100%{opacity:.1}50%{opacity:.6}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes loadbar{0%{transform:translateX(-100%)}50%{transform:translateX(250%)}100%{transform:translateX(-100%)}}
        @keyframes pulse-bar{0%,100%{opacity:1}50%{opacity:0.85}}
        @keyframes particle-rise{0%{opacity:0;transform:translateY(0) scale(0.5)}20%{opacity:0.8;transform:translateY(-10px) scale(1)}80%{opacity:0.2;transform:translateY(-40px) scale(0.8)}100%{opacity:0;transform:translateY(-60px) scale(0.3)}}
        textarea:focus,select:focus,input:focus{outline:none;border-color:${accent}66!important;box-shadow:0 0 12px ${accent}22!important}
        textarea::placeholder,input::placeholder{color:${T.textDark}}
        textarea::-webkit-scrollbar{width:5px}textarea::-webkit-scrollbar-track{background:transparent}textarea::-webkit-scrollbar-thumb{background:${T.surfaceBorder};border-radius:3px}
        button:hover{filter:brightness(1.08)}
        *{box-sizing:border-box}
      `}</style>
      <div style={{ minHeight: "100vh", background: T.pageBg, color: T.text, position: "relative", display: "flex", flexDirection: "column" }}>
        {!T.light && <Starfield />}
        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          <main>{children}</main>
        </div>
        <footer style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "24px 16px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDark }}>
          © {new Date().getFullYear()} ResumeRPG{" · "}
          <Link to="/privacy" style={{ color: T.textMuted, textDecoration: "none" }}>Privacy Policy</Link>
        </footer>
      </div>
    </>
  );
}
