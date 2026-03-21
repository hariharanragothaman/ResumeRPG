import { Link } from "react-router-dom";

const S: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, color: "#cbd5e1" },
  h1: { fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: "#a855f7", marginBottom: 8 },
  updated: { fontSize: 12, color: "#64748b", marginBottom: 32 },
  h2: { fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#e2e8f0", marginTop: 32, marginBottom: 12 },
  p: { fontSize: 14, marginBottom: 16 },
  ul: { fontSize: 14, paddingLeft: 20, marginBottom: 16 },
  back: { display: "inline-block", fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: "#a855f7", textDecoration: "none", marginTop: 32 },
};

export function PrivacyPage() {
  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Privacy Policy</h1>
      <p style={S.updated}>Last updated: March 2026</p>

      <h2 style={S.h2}>What We Process</h2>
      <p style={S.p}>
        ResumeRPG converts resume text into RPG character sheets. When you paste text or upload a PDF,
        the content is sent to an AI provider (Anthropic Claude or OpenAI) for parsing. The raw resume
        text is <strong style={{ color: "#e2e8f0" }}>never stored</strong> on our servers — it is used
        only for the duration of the API call and then discarded.
      </p>

      <h2 style={S.h2}>What We Store</h2>
      <ul style={S.ul}>
        <li><strong style={{ color: "#e2e8f0" }}>Shared character cards</strong> — When you click "Share,"
          the generated character sheet (name, stats, skills, class — the RPG output, not the raw resume) is
          saved to our database with a unique link. No resume text is included.</li>
        <li><strong style={{ color: "#e2e8f0" }}>Creator IP address</strong> — Stored alongside shared cards
          for rate-limiting purposes only.</li>
        <li><strong style={{ color: "#e2e8f0" }}>Local browser storage</strong> — Your saved characters live
          in your browser's localStorage. We cannot access this data.</li>
      </ul>

      <h2 style={S.h2}>API Keys</h2>
      <p style={S.p}>
        If you use "bring your own key" mode, your API key is stored in sessionStorage (cleared when
        you close the tab). It is sent directly from your browser to the AI provider — our server never
        sees or stores it.
      </p>

      <h2 style={S.h2}>Third-Party Services</h2>
      <ul style={S.ul}>
        <li><strong style={{ color: "#e2e8f0" }}>Anthropic / OpenAI</strong> — Resume text is sent to
          these providers for character generation. Their privacy policies apply to that processing.</li>
        <li><strong style={{ color: "#e2e8f0" }}>GitHub API</strong> — If you use GitHub mode, we fetch
          your public profile and repositories. No GitHub credentials are used or stored.</li>
        <li><strong style={{ color: "#e2e8f0" }}>Supabase</strong> — Hosts our database for shared character cards.</li>
        <li><strong style={{ color: "#e2e8f0" }}>QR Server</strong> — QR codes are generated via api.qrserver.com
          using your share link URL only.</li>
      </ul>

      <h2 style={S.h2}>What We Don't Do</h2>
      <ul style={S.ul}>
        <li>We do not store, log, or retain your resume text</li>
        <li>We do not sell or share your data with third parties</li>
        <li>We do not use cookies or tracking scripts</li>
        <li>We do not require account creation</li>
      </ul>

      <h2 style={S.h2}>Data Deletion</h2>
      <p style={S.p}>
        Shared cards can be removed upon request. Local characters are under your control — clear your
        browser's localStorage at any time. Contact us at the email below for any deletion requests.
      </p>

      <h2 style={S.h2}>Contact</h2>
      <p style={S.p}>
        Questions about this policy? Reach out at{" "}
        <a href="mailto:privacy@resumerpg.app" style={{ color: "#a855f7" }}>privacy@resumerpg.app</a>.
      </p>

      <Link to="/" style={S.back}>← Back to ResumeRPG</Link>
    </div>
  );
}
