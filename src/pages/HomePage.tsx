import { useCallback, useEffect, useRef, useState } from "react";
import { CharacterCard } from "@/components/CharacterCard";
import { CompareView } from "@/components/CompareView";
import { GalleryView } from "@/components/GalleryView";
import { LOADING_MESSAGES } from "@/lib/config";
import { exportTradingCard } from "@/lib/export";
import { extractPdfText } from "@/lib/pdf";
import { shareCharacter } from "@/lib/share";
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

export function HomePage() {
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
    if (file.type !== "application/pdf") { setError("Please upload a PDF file"); return; }
    setPdfLoading(true);
    setPdfFileName(file.name);
    setError(null);
    try {
      const text = await extractPdfText(file);
      if (text.trim().length < 50) throw new Error("Could not extract enough text");
      setResumeText(text);
    } catch (err) {
      setError("PDF extraction failed: " + (err instanceof Error ? err.message : "unknown") + ". Try pasting text directly.");
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

  const handleExport = async () => {
    if (!character) return;
    setExporting(true);
    try { await exportTradingCard(character); } catch { /* best-effort */ }
    setExporting(false);
  };

  const reset = () => {
    setStep("input");
    setCharacter(null);
    setError(null);
    setResumeText("");
    setPdfFileName("");
  };

  const tabBtn = (id: Tab, label: string, icon: string) => (
    <button
      key={id}
      onClick={() => { setTab(id); if (id === "generate" && !character) setStep("input"); }}
      style={{
        flex: 1, padding: "10px 4px",
        background: tab === id ? "rgba(168,85,247,0.12)" : "transparent",
        border: "none",
        borderBottom: tab === id ? "2px solid #a855f7" : "2px solid transparent",
        color: tab === id ? "#a855f7" : "#475569",
        fontFamily: "'Press Start 2P'", fontSize: 7,
        cursor: "pointer", transition: "all 0.15s", letterSpacing: 1,
      }}
    >
      {icon} {label}
    </button>
  );

  const canGenerate = resumeText.trim() && (!needsClientKey || clientApiKey.trim());

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 16px 60px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 18, animation: "slideUp 0.5s ease-out" }}>
        <h1 style={{ fontFamily: "'Press Start 2P'", fontSize: 19, color: "#f1f5f9", margin: 0, letterSpacing: 2, lineHeight: 1.5, textShadow: "0 0 30px rgba(168,85,247,0.3)" }}>
          ⚔️ RESUME<span style={{ color: "#a855f7" }}>RPG</span>
        </h1>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 13, color: "#475569", marginTop: 4 }}>Transform your resume into a legendary character card</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 18 }}>
        {tabBtn("generate", "GENERATE", "🎲")}
        {tabBtn("gallery", "GALLERY", "📜")}
        {tabBtn("compare", "COMPARE", "⚔️")}
      </div>

      {/* ===== GENERATE TAB ===== */}
      {tab === "generate" && step === "input" && (
        <div style={{ animation: "slideUp 0.4s ease-out" }}>
          {/* API key prompt */}
          {needsClientKey && (
            <div style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <label style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: "#a855f7", letterSpacing: 2, display: "block", marginBottom: 10 }}>🔑 AI PROVIDER</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {(["anthropic", "openai"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => switchProvider(p)} style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: provider === p ? "1px solid rgba(168,85,247,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    background: provider === p ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.03)",
                    color: provider === p ? "#e2e8f0" : "#64748b",
                    fontFamily: "'Press Start 2P'", fontSize: 7, cursor: "pointer", transition: "all 0.2s",
                  }}>
                    {p === "anthropic" ? "🟣 Anthropic" : "🟢 OpenAI"}
                  </button>
                ))}
              </div>
              <p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: "#64748b", margin: "0 0 8px" }}>
                {provider === "anthropic" ? "Uses Claude Opus 4.6." : "Uses GPT-4.1."}{" "}
                Key stays in your browser — never sent to our server.
              </p>
              <input type="password" value={clientApiKey} onChange={(e) => setClientApiKey(e.target.value)}
                placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
                style={{ width: "100%", background: "rgba(10,10,26,0.8)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", fontFamily: "'DM Sans'", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          )}

          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", padding: 18, marginBottom: 12 }}>
            {/* PDF Upload */}
            <label style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: "#64748b", letterSpacing: 2, display: "block", marginBottom: 8 }}>UPLOAD RESUME PDF</label>
            <input type="file" accept=".pdf" ref={fileRef} onChange={(e) => void handleFile(e)} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} disabled={pdfLoading} style={{
              width: "100%", padding: "14px", background: "rgba(15,15,30,0.8)",
              border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 10,
              color: pdfFileName ? "#a855f7" : "#475569", cursor: "pointer",
              fontFamily: "'DM Sans'", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {pdfLoading
                ? <><span style={{ animation: "float 1s ease-in-out infinite" }}>📄</span> Extracting text...</>
                : pdfFileName
                  ? <><span>✅</span> {pdfFileName}</>
                  : <><span>📄</span> Click to upload PDF</>}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#334155" }}>OR PASTE</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)}
              placeholder={"Paste resume text here...\n\nInclude name, experience, education, skills, certifications..."}
              rows={9} style={{
                width: "100%", background: "rgba(10,10,26,0.8)", color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                padding: 14, fontFamily: "'DM Sans'", fontSize: 13, lineHeight: 1.5,
                resize: "vertical", transition: "all 0.2s", boxSizing: "border-box",
              }}
            />
            {resumeText.length > 0 && (
              <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: "#334155", display: "block", marginTop: 3 }}>
                {resumeText.split(/\s+/).filter(Boolean).length} words
              </span>
            )}
          </div>

          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontFamily: "'DM Sans'", fontSize: 12, color: "#fca5a5", marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button onClick={() => void generate()} disabled={!canGenerate} style={{
            width: "100%", padding: "14px 20px",
            background: canGenerate ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.05)",
            color: canGenerate ? "#fff" : "#334155", border: "none", borderRadius: 10,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: "'Press Start 2P'", fontSize: 10, letterSpacing: 1,
            boxShadow: canGenerate ? "0 4px 20px rgba(168,85,247,0.3)" : "none",
          }}>
            🎲 GENERATE CHARACTER
          </button>

          <p style={{ fontFamily: "'DM Sans'", fontSize: 10, color: "#334155", textAlign: "center", marginTop: 10 }}>
            Powered by Claude & GPT-4.1 · Your data is not stored on any server
          </p>
        </div>
      )}

      {tab === "generate" && step === "loading" && (
        <div style={{ textAlign: "center", padding: "50px 20px", animation: "slideUp 0.3s ease-out" }}>
          <div style={{ fontSize: 44, marginBottom: 18, animation: "float 2s ease-in-out infinite" }}>🎲</div>
          <p style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#a855f7", marginBottom: 4 }}>{loadingMsg}{dots}</p>
          <div style={{ width: 160, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, margin: "14px auto", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg,#7c3aed,#a855f7)", borderRadius: 2, width: "40%", animation: "loading-bar 2s ease-in-out infinite" }} />
          </div>
        </div>
      )}

      {tab === "generate" && step === "result" && character && (
        <div style={{ animation: "slideUp 0.5s ease-out" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CharacterCard data={character} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 18, maxWidth: 420, margin: "18px auto 0" }}>
            <button onClick={reset} style={{
              padding: "11px 6px", background: "rgba(255,255,255,0.04)", color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer",
              fontFamily: "'Press Start 2P'", fontSize: 7,
            }}>🔄 NEW</button>
            <button onClick={() => void handleExport()} disabled={exporting} style={{
              padding: "11px 6px", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff",
              border: "none", borderRadius: 8, cursor: "pointer",
              fontFamily: "'Press Start 2P'", fontSize: 7, boxShadow: "0 4px 16px rgba(168,85,247,0.25)",
            }}>{exporting ? "⏳..." : "🃏 EXPORT"}</button>
            <button onClick={() => shareCharacter(character)} style={{
              padding: "11px 6px", background: "rgba(255,255,255,0.04)", color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer",
              fontFamily: "'Press Start 2P'", fontSize: 7,
            }}>📤 SHARE</button>
          </div>
          <p style={{ fontFamily: "'DM Sans'", fontSize: 10, color: "#334155", textAlign: "center", marginTop: 8 }}>
            Export downloads a 750×1050 trading card PNG with QR code
          </p>
        </div>
      )}

      {/* ===== GALLERY TAB ===== */}
      {tab === "gallery" && (
        <GalleryView
          characters={savedChars}
          onSelect={(c) => { setCharacter(c); setStep("result"); setTab("generate"); }}
          onRefresh={refreshSaved}
        />
      )}

      {/* ===== COMPARE TAB ===== */}
      {tab === "compare" && <CompareView characters={savedChars} />}
    </div>
  );
}
