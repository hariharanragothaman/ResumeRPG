import type { ReactNode } from "react";
import { PIXEL_FONT_URL } from "@/lib/config";
import { Starfield } from "@/components/Starfield";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <link href={PIXEL_FONT_URL} rel="stylesheet" />
      <style>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.6; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 50% { transform: translateX(250%); } 100% { transform: translateX(-100%); } }
        textarea:focus { outline: none; border-color: rgba(168,85,247,0.4) !important; box-shadow: 0 0 16px rgba(168,85,247,0.12) !important; }
        textarea::placeholder { color: #2d3344; }
        textarea::-webkit-scrollbar { width: 5px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        select:focus { outline: none; border-color: rgba(168,85,247,0.4) !important; }
        button:hover { filter: brightness(1.1); }
        * { box-sizing: border-box; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#06060f,#0a0a1a 50%,#080816)",
          color: "#e2e8f0",
          position: "relative",
        }}
      >
        <Starfield />
        <div style={{ position: "relative", zIndex: 1 }}>
          <main>{children}</main>
        </div>
      </div>
    </>
  );
}
