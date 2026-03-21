import { useCallback, useEffect, useRef, useState } from "react";
import { CardFront } from "@/components/CardFront";
import { CardBack } from "@/components/CardBack";
import { HolographicCard } from "@/components/HolographicCard";
import { CompareView } from "@/components/CompareView";
import { GalleryView } from "@/components/GalleryView";
import { LOADING_MESSAGES, THEMES, type ThemeName } from "@/lib/config";
import { exportTradingCard } from "@/lib/export";
import { extractPdfText } from "@/lib/pdf";
import { shareCharacter } from "@/lib/share";
import { fetchGitHub, ghToCharacter } from "@/lib/github";
import { loadIndex, saveCharacter } from "@/lib/storage";
import type { SavedEntry } from "@/lib/storage";
import {
  checkServerHasKey,
  parseResumeClientSide,
  parseResumeText,
} from "@/lib/api";
import type { Provider } from "@/lib/api";
import type { CharacterSheet } from "@/types/character";

type Tab = "generate" | "gallery" | "compare";
type Step = "input" | "loading" | "result";
type InputMode = "resume" | "github";

export function HomePage({ theme, onThemeChange }: { theme: ThemeName; onThemeChange: (t: ThemeName) => void }) {
  const T = THEMES[theme];
  const accent = T.light ? "#6d28d9" : "#a855f7";

  const [tab, setTab] = useState<Tab>("generate");
  const [step, setStep] = useState<Step>("input");
  const [resumeText, setResumeText] = useState("");
  const [character, setCharacter] = useState<CharacterSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [dots, setDots] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const [exporting, setExporting] = useState(false);
  const [savedChars, setSavedChars] = useState<SavedEntry[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>("resume");
  const [ghUser, setGhUser] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [serverHasKey, setServerHasKey] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<Provider>(
    () => (localStorage.getItem("resumerpg:provider") as Provider) || "anthropic",
  );
  const [clientApiKey, setClientApiKey] = useState(
    () => sessionStorage.getItem(`resumerpg:apiKey:${(localStorage.getItem("resumerpg:provider") as Provider) || "anthropic"}`) || "",
  );

  useEffect(() => { void checkServerHasKey().then(setServerHasKey); }, []);
  const needsClientKey = serverHasKey === false;

  const switchProvider = useCallback((p: Provider) => {
    setProvider(p);
    localStorage.setItem("resumerpg:provider", p);
    setClientApiKey(sessionStorage.getItem(`resumerpg:apiKey:${p}`) || "");
  }, []);

  const refreshSaved = useCallback(() => setSavedChars(loadIndex()), []);
  useEffect(() => { refreshSaved(); }, [refreshSaved]);

  useEffect(() => {
    if (step !== "loading") return;
    let mi = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const iv1 = setInterval(() => { mi = (mi + 1) % LOADING_MESSAGES.length; setLoadingMsg(LOADING_MESSAGES[mi]); }, 2200);
    const iv2 = setInterval(() => setDots((p) => (p.length >= 3 ? "" : p + ".")), 400);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, [step]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Upload a PDF"); return; }
    setPdfLoading(true);
    setPdfFileName(file.name);
    setError(null);
    try {
      const text = await extractPdfText(file);
      if (text.trim().length < 50) throw new Error("Too little text");
      setResumeText(text);
    } catch (err) {
      setError("PDF failed: " + (err instanceof Error ? err.message : "unknown"));
    }
    setPdfLoading(false);
  };

  const generate = useCallback(async () => {
    if (!resumeText.trim()) return;
    setStep("loading");
    setError(null);
    try {
      let c: CharacterSheet;
      if (needsClientKey) {
        if (!clientApiKey.trim()) throw new Error("Enter your API key above.");
        sessionStorage.setItem(`resumerpg:apiKey:${provider}`, clientApiKey.trim());
        c = await parseResumeClientSide(resumeText, clientApiKey.trim(), provider);
      } else {
        c = await parseResumeText(resumeText);
      }
      setCharacter(c);
      saveCharacter(c);
      refreshSaved();
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStep("input");
    }
  }, [resumeText, needsClientKey, clientApiKey, provider, refreshSaved]);

  const generateGH = useCallback(async () => {
    if (!ghUser.trim()) return;
    setGhLoading(true);
    setError(null);
    try {
      const gh = await fetchGitHub(ghUser.trim());
      const ch = ghToCharacter(gh);
      setCharacter(ch);
      saveCharacter(ch);
      refreshSaved();
      setStep("result");
    } catch (err) {
      setError("GitHub fetch failed: " + (err instanceof Error ? err.message : "unknown"));
    }
    setGhLoading(false);
  }, [ghUser, refreshSaved]);

  const handleExport = async () => {
    if (!character) return;
    setExporting(true);
    try { await exportTradingCard(character); } catch { /* best-effort */ }
    setExporting(false);
  };

  const handleShare = () => {
    if (!character) return;
    shareCharacter(character);
  };

  const reset = () => {
    setStep("input");
    setCharacter(null);
    setError(null);
    setResumeText("");
    setPdfFileName("");
    setGhUser("");
  };

  const canGenerate = resumeText.trim() && (!needsClientKey || clientApiKey.trim());

  const tabBtn = (id: Tab, label: string, icon: string) => (
    <button
      key={id}
      onClick={() => { setTab(id); if (id === "generate" && !character) setStep("input"); }}
      style={{
        flex: 1, padding: "10px 4px",
        background: tab === id ? (T.light ? "rgba(0,0,0,0.05)" : "rgba(168,85,247,0.12)") : "transparent",
        border: "none",
        borderBottom: tab === id ? "2px solid " + (T.light ? "#1a1a2e" : "#a855f7") : "2px solid transparent",
        color: tab === id ? (T.light ? "#1a1a2e" : "#a855f7") : T.textDim,
        fontFamily: T.labelFont, fontSize: 7,
        cursor: "pointer", transition: "all 0.15s", letterSpacing: 1, fontWeight: 700,
      }}
    >
      {icon} {label}
    </button>
  );

  const modeBtn = (id: InputMode, label: string) => (
    <button
      onClick={() => setInputMode(id)}
      style={{
        flex: 1, padding: "8px",
        background: inputMode === id ? (T.light ? "rgba(0,0,0,0.06)" : "rgba(168,85,247,0.15)") : "transparent",
        border: "1px solid " + (inputMode === id ? (T.light ? "rgba(0,0,0,0.12)" : "rgba(168,85,247,0.3)") : T.surfaceBorder),
        borderRadius: 8,
        color: inputMode === id ? (T.light ? "#1a1a2e" : "#a855f7") : T.textDim,
        fontFamily: T.labelFont, fontSize: 7, cursor: "pointer", fontWeight: 700, letterSpacing: 1,
      }}
    >{label}</button>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px" }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 14, animation: "slideUp 0.5s ease-out" }}>
        <h1 style={{ fontFamily: T.headingFont, fontSize: 18, color: T.text, margin: 0, letterSpacing: 2, lineHeight: 1.5 }}>
          ⚔️ RESUME<span style={{ color: accent }}>RPG</span>
        </h1>
        <p style={{ fontFamily: T.bodyFont, fontSize: 12, color: T.textMuted, marginTop: 2 }}>Transform your resume into a legendary character card</p>
      </div>

      {/* Theme Picker */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 14, flexWrap: "wrap" }}>
        {(Object.entries(THEMES) as [ThemeName, typeof T][]).map(([key, t]) => (
          <button
            key={key}
            onClick={() => onThemeChange(key)}
            style={{
              padding: "5px 10px", borderRadius: 6,
              border: theme === key ? "2px solid " + accent : "1px solid " + T.surfaceBorder,
              background: theme === key ? (T.light ? "rgba(0,0,0,0.05)" : accent + "22") : "transparent",
              color: theme === key ? accent : T.textDim,
              fontFamily: T.bodyFont, fontSize: 11, cursor: "pointer", fontWeight: 600,
            }}
          >{t.icon} {t.name}</button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid " + T.surfaceBorder, marginBottom: 16 }}>
        {tabBtn("generate", "GENERATE", "🎲")}
        {tabBtn("gallery", "GALLERY", "📜")}
        {tabBtn("compare", "COMPARE", "⚔️")}
      </div>

      {/* ===== GENERATE TAB ===== */}
      {tab === "generate" && step === "input" && (
        <div style={{ animation: "slideUp 0.4s ease-out" }}>
          {/* Input mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {modeBtn("resume", "📄 RESUME")}
            {modeBtn("github", "🐙 GITHUB")}
          </div>

          {inputMode === "resume" ? (
            <>
              {/* API key prompt */}
              {needsClientKey && (
                <div style={{ background: T.light ? "rgba(0,0,0,0.03)" : "rgba(168,85,247,0.06)", border: "1px solid " + (T.light ? "rgba(0,0,0,0.08)" : "rgba(168,85,247,0.2)"), borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <label style={{ fontFamily: T.labelFont, fontSize: 8, color: accent, letterSpacing: 2, display: "block", marginBottom: 10, fontWeight: 700 }}>🔑 AI PROVIDER</label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {(["anthropic", "openai"] as const).map((p) => (
                      <button key={p} type="button" onClick={() => switchProvider(p)} style={{
                        flex: 1, padding: "8px 12px", borderRadius: 8,
                        border: provider === p ? "1px solid " + accent + "80" : "1px solid " + T.surfaceBorder,
                        background: provider === p ? accent + "22" : "transparent",
                        color: provider === p ? T.text : T.textDim,
                        fontFamily: T.labelFont, fontSize: 7, cursor: "pointer",
                      }}>
                        {p === "anthropic" ? "🟣 Anthropic" : "🟢 OpenAI"}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontFamily: T.bodyFont, fontSize: 12, color: T.textMuted, margin: "0 0 8px" }}>
                    {provider === "anthropic" ? "Uses Claude Opus 4.6." : "Uses GPT-4.1."}{" "}
                    Key stays in your browser — never sent to our server.
                  </p>
                  <input type="password" value={clientApiKey} onChange={(e) => setClientApiKey(e.target.value)}
                    placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
                    style={{ width: "100%", background: T.light ? "white" : "rgba(10,10,26,0.8)", color: T.text, border: "1px solid " + T.surfaceBorder, borderRadius: 8, padding: "10px 12px", fontFamily: T.bodyFont, fontSize: 13 }}
                  />
                </div>
              )}

              <div style={{ background: T.surface, borderRadius: 14, border: "1px solid " + T.surfaceBorder, padding: 16, marginBottom: 12 }}>
                <label style={{ fontFamily: T.labelFont, fontSize: 8, color: T.textDim, letterSpacing: 2, display: "block", marginBottom: 8, fontWeight: 700 }}>UPLOAD PDF</label>
                <input type="file" accept=".pdf" ref={fileRef} onChange={(e) => void handleFile(e)} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()} disabled={pdfLoading} style={{
                  width: "100%", padding: "12px",
                  background: T.light ? "rgba(0,0,0,0.02)" : "rgba(15,15,30,0.8)",
                  border: "2px dashed " + T.surfaceBorder, borderRadius: 10,
                  color: pdfFileName ? accent : T.textDim, cursor: "pointer",
                  fontFamily: T.bodyFont, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {pdfLoading
                    ? <><span style={{ animation: "float 1s ease-in-out infinite" }}>📄</span> Extracting...</>
                    : pdfFileName
                      ? <><span>✅</span> {pdfFileName}</>
                      : <><span>📄</span> Click to upload PDF</>}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
                  <div style={{ flex: 1, height: 1, background: T.surfaceBorder }} />
                  <span style={{ fontFamily: T.labelFont, fontSize: 7, color: T.textDark, fontWeight: 600 }}>OR PASTE</span>
                  <div style={{ flex: 1, height: 1, background: T.surfaceBorder }} />
                </div>

                <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste resume text here..."
                  rows={8} style={{
                    width: "100%", background: T.light ? "white" : "rgba(10,10,26,0.8)", color: T.text,
                    border: "1px solid " + T.surfaceBorder, borderRadius: 10,
                    padding: 12, fontFamily: T.bodyFont, fontSize: 13, lineHeight: 1.5, resize: "vertical",
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ background: T.surface, borderRadius: 14, border: "1px solid " + T.surfaceBorder, padding: 16, marginBottom: 12 }}>
              <label style={{ fontFamily: T.labelFont, fontSize: 8, color: T.textDim, letterSpacing: 2, display: "block", marginBottom: 8, fontWeight: 700 }}>🐙 GITHUB USERNAME</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={ghUser} onChange={(e) => setGhUser(e.target.value)}
                  placeholder="e.g. torvalds"
                  onKeyDown={(e) => { if (e.key === "Enter") void generateGH(); }}
                  style={{ flex: 1, background: T.light ? "white" : "rgba(10,10,26,0.8)", color: T.text, border: "1px solid " + T.surfaceBorder, borderRadius: 10, padding: "12px 14px", fontFamily: T.bodyFont, fontSize: 14 }}
                />
              </div>
              <p style={{ fontFamily: T.bodyFont, fontSize: 11, color: T.textDim, marginTop: 8, lineHeight: 1.5 }}>
                Fetches your public repos, languages, stars, and followers to auto-generate stats. Repos → IMPACT, years active → TENURE, language diversity → RANGE, stars → VISION, followers → INFLUENCE.
              </p>
            </div>
          )}

          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontFamily: T.bodyFont, fontSize: 12, color: "#fca5a5", marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            onClick={() => { if (inputMode === "github") void generateGH(); else void generate(); }}
            disabled={inputMode === "github" ? (!ghUser.trim() || ghLoading) : !canGenerate}
            style={{
              width: "100%", padding: "13px 20px",
              background: (inputMode === "github" ? ghUser.trim() : canGenerate) ? "linear-gradient(135deg,#7c3aed," + accent + ")" : (T.light ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)"),
              color: (inputMode === "github" ? ghUser.trim() : canGenerate) ? "#fff" : T.textDark,
              border: "none", borderRadius: 10,
              cursor: (inputMode === "github" ? ghUser.trim() : canGenerate) ? "pointer" : "not-allowed",
              fontFamily: T.labelFont, fontSize: 10, letterSpacing: 1, fontWeight: 700,
              boxShadow: (inputMode === "github" ? ghUser.trim() : canGenerate) ? "0 4px 20px rgba(168,85,247,0.3)" : "none",
            }}
          >
            {ghLoading ? "⏳ FETCHING..." : inputMode === "github" ? "🐙 GENERATE FROM GITHUB" : "🎲 GENERATE CHARACTER"}
          </button>
        </div>
      )}

      {/* Loading */}
      {tab === "generate" && step === "loading" && (
        <div style={{ textAlign: "center", padding: "50px 20px", animation: "slideUp 0.3s ease-out" }}>
          <div style={{ fontSize: 44, marginBottom: 18, animation: "float 2s ease-in-out infinite" }}>🎲</div>
          <p style={{ fontFamily: T.labelFont, fontSize: 10, color: accent, fontWeight: 700 }}>{loadingMsg}{dots}</p>
          <div style={{ width: 160, height: 3, background: T.surfaceBorder, borderRadius: 2, margin: "14px auto", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg,#7c3aed," + accent + ")", borderRadius: 2, width: "40%", animation: "loadbar 2s ease-in-out infinite" }} />
          </div>
        </div>
      )}

      {/* Result */}
      {tab === "generate" && step === "result" && character && (
        <div style={{ animation: "slideUp 0.5s ease-out" }}>
          <HolographicCard
            theme={theme}
            front={<CardFront data={character} theme={theme} />}
            back={<CardBack data={character} theme={theme} />}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16, maxWidth: 420, margin: "16px auto 0" }}>
            <button onClick={reset} style={{ padding: "11px 6px", background: T.surface, color: T.textMuted, border: "1px solid " + T.surfaceBorder, borderRadius: 8, cursor: "pointer", fontFamily: T.labelFont, fontSize: 7, fontWeight: 700 }}>🔄 NEW</button>
            <button onClick={() => void handleExport()} disabled={exporting} style={{ padding: "11px 6px", background: "linear-gradient(135deg,#7c3aed," + accent + ")", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: T.labelFont, fontSize: 7, fontWeight: 700, boxShadow: "0 4px 16px rgba(168,85,247,0.25)" }}>{exporting ? "⏳" : "🃏 EXPORT"}</button>
            <button onClick={handleShare} style={{ padding: "11px 6px", background: T.surface, color: T.textMuted, border: "1px solid " + T.surfaceBorder, borderRadius: 8, cursor: "pointer", fontFamily: T.labelFont, fontSize: 7, fontWeight: 700 }}>📤 SHARE</button>
          </div>
          <p style={{ fontFamily: T.bodyFont, fontSize: 10, color: T.textDark, textAlign: "center", marginTop: 6 }}>
            Click card to flip · Hover for holographic tilt · Export for 750×1050 PNG
          </p>
        </div>
      )}

      {/* Gallery */}
      {tab === "gallery" && (
        <GalleryView
          characters={savedChars}
          onSelect={(c) => { setCharacter(c); setStep("result"); setTab("generate"); }}
          onRefresh={refreshSaved}
          theme={theme}
        />
      )}

      {/* Compare */}
      {tab === "compare" && <CompareView characters={savedChars} theme={theme} />}
    </div>
  );
}
