// server/lib/card-image.js
// Generates a PNG trading card from a CharacterSheet (server-side, no browser needed)
// Uses SVG construction → sharp for PNG conversion (sharp is lazy-loaded so the API
// can start on Node versions sharp does not support; /gh/*/card.png may error until Node is upgraded)

const CLASS_COLORS = {
  "Frontend Sorcerer": "#a855f7", "Backend Paladin": "#3b82f6", "DevOps Ranger": "#22c55e",
  "Data Necromancer": "#ef4444", "Fullstack Warlock": "#f59e0b", "Cloud Architect": "#06b6d4",
  "Security Sentinel": "#dc2626", "ML Alchemist": "#8b5cf6", "Embedded Ranger": "#84cc16",
  "Mobile Bard": "#ec4899", "Platform Engineer": "#f97316", "QA Monk": "#14b8a6",
};

const CLASS_ICONS = {
  "Frontend Sorcerer": "🔮", "Backend Paladin": "🛡️", "DevOps Ranger": "🏹",
  "Data Necromancer": "💀", "Fullstack Warlock": "⚡", "Cloud Architect": "☁️",
  "Security Sentinel": "🔐", "ML Alchemist": "🧪", "Embedded Ranger": "⚙️",
  "Mobile Bard": "🎵", "Platform Engineer": "🏗️", "QA Monk": "🧘",
};

const RARITY_BORDERS = {
  Common: "#4b5563", Uncommon: "#16a34a", Rare: "#2563eb", Epic: "#9333ea", Legendary: "#d97706",
};

const RARITY_COLORS = {
  Common: "#9ca3af", Uncommon: "#22c55e", Rare: "#3b82f6", Epic: "#a855f7", Legendary: "#f59e0b",
};

const STAT_NAMES = ["IMPACT", "CRAFT", "RANGE", "TENURE", "VISION", "INFLUENCE"];

function esc(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildStatBars(stats, color, startY) {
  let svg = "";
  const barX = 170, barW = 310, barH = 18;
  let y = startY;

  for (const stat of STAT_NAMES) {
    const val = stats[stat] || 0;
    const fillW = Math.round((val / 20) * barW);

    svg += `<text x="${barX - 12}" y="${y + 13}" text-anchor="end" font-family="monospace" font-size="11" fill="#94a3b8">${stat}</text>`;
    svg += `<rect x="${barX}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="#1e1e32" opacity="0.8"/>`;
    if (fillW > 0) {
      svg += `<rect x="${barX}" y="${y}" width="${fillW}" height="${barH}" rx="3" fill="${color}" opacity="0.85"/>`;
    }
    svg += `<text x="${barX + barW + 12}" y="${y + 13}" font-family="monospace" font-size="12" font-weight="bold" fill="${color}">${val}</text>`;
    y += barH + 7;
  }
  return { svg, endY: y };
}

function buildSkillTags(skills, color, startY) {
  let svg = "";
  let x = 50, y = startY;
  const tagH = 22, gap = 6;

  for (const skill of skills.slice(0, 8)) {
    const w = skill.length * 7.5 + 20;
    if (x + w > 520) { x = 50; y += tagH + gap; }
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${tagH}" rx="4" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="0.5" stroke-opacity="0.4"/>`;
    svg += `<text x="${x + w / 2}" y="${y + 15}" text-anchor="middle" font-family="monospace" font-size="10" fill="${color}">${esc(skill)}</text>`;
    x += w + gap;
  }
  return { svg, endY: y + tagH + 10 };
}

/**
 * Generate a card image as PNG Buffer.
 *
 * @param {object} character - CharacterSheet
 * @param {object} [percentiles] - optional percentile data
 * @param {object} [opts] - { width?: number, format?: 'png' | 'svg' }
 * @returns {Promise<Buffer>}
 */
async function generateCardImage(character, percentiles, opts = {}) {
  const W = 600, H = 800;
  const color = CLASS_COLORS[character.class] || "#a855f7";
  const border = RARITY_BORDERS[character.rarity] || "#4b5563";
  const rarityColor = RARITY_COLORS[character.rarity] || "#9ca3af";
  const icon = CLASS_ICONS[character.class] || "⚔️";
  const stats = character.stats || {};
  const total = (
    ((stats.IMPACT || 0) + (stats.INFLUENCE || 0) + (stats.VISION || 0)) * 2
    + ((stats.CRAFT || 0) + (stats.RANGE || 0)) * 1.5
    + (stats.TENURE || 0)
  );
  const cohortSize = opts.cohortSize || null;
  const pctLabel = percentiles?.overall != null
    ? `Top ${Math.max(1, Math.round(100 - percentiles.overall))}%${cohortSize ? ` of ${cohortSize.toLocaleString()}` : ""}`
    : "";

  let y = 36;
  let body = "";

  // Rarity
  body += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="${rarityColor}" letter-spacing="3">★ ${esc((character.rarity || "").toUpperCase())} ★</text>`;
  y += 18;

  // Branding
  body += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="monospace" font-size="9" fill="#334155" letter-spacing="2">RESUME RPG</text>`;
  y += 30;

  // Level badge
  body += `<rect x="${W / 2 - 36}" y="${y}" width="72" height="24" rx="4" fill="${color}"/>`;
  body += `<text x="${W / 2}" y="${y + 17}" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#fff">LV. ${character.level}</text>`;
  y += 40;

  // Name
  const name = character.name || "Unknown Hero";
  body += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#f1f5f9">${esc(name.length > 28 ? name.slice(0, 26) + "..." : name)}</text>`;
  y += 22;

  // Class
  body += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="${color}">${esc(icon)} ${esc(character.class)}</text>`;
  y += 18;

  // Guild
  if (character.guild) {
    body += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#64748b">Guild: ${esc(character.guild)}</text>`;
    y += 16;
  }

  // Tagline
  if (character.tagline) {
    body += `<text x="${W / 2}" y="${y + 4}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="#94a3b8" font-style="italic">"${esc(character.tagline)}"</text>`;
    y += 20;
  }

  // Percentile badge
  if (pctLabel) {
    y += 4;
    const pw = pctLabel.length * 7 + 20;
    body += `<rect x="${W / 2 - pw / 2}" y="${y}" width="${pw}" height="20" rx="10" fill="${color}" opacity="0.2" stroke="${color}" stroke-width="0.5"/>`;
    body += `<text x="${W / 2}" y="${y + 14}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="${color}">${esc(pctLabel)}</text>`;
    y += 30;
  }

  // Divider
  y += 8;
  body += `<line x1="50" y1="${y}" x2="${W - 50}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
  y += 16;

  // Stats header
  body += `<text x="50" y="${y}" font-family="monospace" font-size="10" font-weight="bold" fill="#475569" letter-spacing="2">POWER PROFILE</text>`;
  y += 18;

  const statResult = buildStatBars(stats, color, y);
  body += statResult.svg;
  y = statResult.endY + 4;

  // Power total
  body += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="monospace" font-size="10" fill="#475569">Total Power: ${total}/200</text>`;
  y += 18;

  // Divider
  body += `<line x1="50" y1="${y}" x2="${W - 50}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
  y += 16;

  // Skills header
  body += `<text x="50" y="${y}" font-family="monospace" font-size="10" font-weight="bold" fill="#475569" letter-spacing="2">SKILL TREE</text>`;
  y += 16;

  const skillResult = buildSkillTags(character.skills || [], color, y);
  body += skillResult.svg;
  y = skillResult.endY;

  // Footer
  y = H - 30;
  const siteHost = (process.env.PUBLIC_SITE_URL || "https://resumerpg.app").replace(/^https?:\/\//, "").replace(/\/$/, "");
  body += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="monospace" font-size="9" fill="#334155">${esc(siteHost)}/${esc((character._github?.login || "").toLowerCase())}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W * 0.3}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f0f24"/>
      <stop offset="50%" stop-color="#111128"/>
      <stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="20%" r="50%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" rx="16" fill="url(#glow)"/>
  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="14" fill="none" stroke="${border}" stroke-width="2.5" opacity="0.6"/>
  ${body}
</svg>`;

  if (opts.format === "svg") {
    return Buffer.from(svg, "utf-8");
  }

  let sharpMod;
  try {
    sharpMod = (await import("sharp")).default;
  } catch (e) {
    const hint = "PNG card image needs the sharp package and a supported Node.js (see package.json engines, e.g. Node 20 LTS).";
    throw Object.assign(new Error(`${hint} (${e?.message || "import failed"})`), { status: 503 });
  }

  const pngBuffer = await sharpMod(Buffer.from(svg, "utf-8"))
    .resize(opts.width || 600)
    .png()
    .toBuffer();

  return pngBuffer;
}

export { generateCardImage };
