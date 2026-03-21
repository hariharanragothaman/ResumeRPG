import { Link } from "react-router-dom";
import { THEMES, type ThemeName } from "@/lib/config";

export function PrivacyPage() {
  const themeName = (localStorage.getItem("resumerpg:theme") as ThemeName) || "fantasy";
  const T = THEMES[themeName];
  const text = T.light ? "#1e293b" : "#cbd5e1";
  const strong = T.light ? "#0f172a" : "#e2e8f0";
  const muted = T.light ? "#475569" : "#64748b";
  const accent = T.light ? "#7c3aed" : "#a855f7";
  const h2Color = T.light ? "#1e293b" : "#e2e8f0";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, color: text }}>
      <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: accent, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 12, color: muted, marginBottom: 32 }}>Last updated: March 2026</p>

      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: h2Color, marginTop: 32, marginBottom: 12 }}>What We Process</h2>
      <p style={{ fontSize: 14, marginBottom: 16 }}>
        ResumeRPG converts resume text into RPG character sheets. When you paste text or upload a PDF,
        the content is sent to an AI provider (Anthropic Claude or OpenAI) for parsing. The raw resume
        text is <strong style={{ color: strong }}>never stored</strong> on our servers — it is used
        only for the duration of the API call and then discarded.
      </p>

      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: h2Color, marginTop: 32, marginBottom: 12 }}>What We Store</h2>
      <ul style={{ fontSize: 14, paddingLeft: 20, marginBottom: 16 }}>
        <li><strong style={{ color: strong }}>Shared character cards</strong> — When you click "Share,"
          the generated character sheet (name, stats, skills, class — the RPG output, not the raw resume) is
          saved to our database with a unique link. No resume text is included.</li>
        <li><strong style={{ color: strong }}>Creator IP address</strong> — Stored alongside shared cards
          for rate-limiting purposes only.</li>
        <li><strong style={{ color: strong }}>Local browser storage</strong> — Your saved characters live
          in your browser's localStorage. We cannot access this data.</li>
      </ul>

      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: h2Color, marginTop: 32, marginBottom: 12 }}>API Keys</h2>
      <p style={{ fontSize: 14, marginBottom: 16 }}>
        If you use "bring your own key" mode, your API key is stored in sessionStorage (cleared when
        you close the tab). It is sent directly from your browser to the AI provider — our server never
        sees or stores it.
      </p>

      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: h2Color, marginTop: 32, marginBottom: 12 }}>Third-Party Services</h2>
      <ul style={{ fontSize: 14, paddingLeft: 20, marginBottom: 16 }}>
        <li><strong style={{ color: strong }}>Anthropic / OpenAI</strong> — Resume text is sent to
          these providers for character generation. Their privacy policies apply to that processing.</li>
        <li><strong style={{ color: strong }}>GitHub API</strong> — If you use GitHub mode, we fetch
          your public profile and repositories. No GitHub credentials are used or stored.</li>
        <li><strong style={{ color: strong }}>Supabase</strong> — Hosts our database for shared character cards.</li>
        <li><strong style={{ color: strong }}>QR Server</strong> — QR codes are generated via api.qrserver.com
          using your share link URL only.</li>
      </ul>

      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: h2Color, marginTop: 32, marginBottom: 12 }}>What We Don't Do</h2>
      <ul style={{ fontSize: 14, paddingLeft: 20, marginBottom: 16 }}>
        <li>We do not store, log, or retain your resume text</li>
        <li>We do not sell or share your data with third parties</li>
        <li>We do not use cookies or tracking scripts</li>
        <li>We do not require account creation</li>
      </ul>

      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: h2Color, marginTop: 32, marginBottom: 12 }}>Data Deletion</h2>
      <p style={{ fontSize: 14, marginBottom: 16 }}>
        Shared cards can be removed upon request. Local characters are under your control — clear your
        browser's localStorage at any time. Contact us at the email below for any deletion requests.
      </p>

      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: h2Color, marginTop: 32, marginBottom: 12 }}>Contact</h2>
      <p style={{ fontSize: 14, marginBottom: 16 }}>
        Questions about this policy? Reach out at{" "}
        <a href="mailto:privacy@resumerpg.app" style={{ color: accent }}>privacy@resumerpg.app</a>.
      </p>

      <Link to="/" style={{ display: "inline-block", fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: accent, textDecoration: "none", marginTop: 32 }}>← Back to ResumeRPG</Link>
    </div>
  );
}
