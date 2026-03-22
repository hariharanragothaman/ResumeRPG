// server/lib/badge.js
// Generates shields.io-style SVG badges for GitHub README embedding

const CLASS_COLORS = {
  "Frontend Sorcerer": "a855f7",
  "Backend Paladin": "3b82f6",
  "DevOps Ranger": "22c55e",
  "Data Necromancer": "ef4444",
  "Fullstack Warlock": "f59e0b",
  "Cloud Architect": "06b6d4",
  "Security Sentinel": "dc2626",
  "ML Alchemist": "8b5cf6",
  "Embedded Ranger": "84cc16",
  "Mobile Bard": "ec4899",
  "Platform Engineer": "f97316",
  "QA Monk": "14b8a6",
};

const CLASS_ICONS = {
  "Frontend Sorcerer": "🔮",
  "Backend Paladin": "🛡️",
  "DevOps Ranger": "🏹",
  "Data Necromancer": "💀",
  "Fullstack Warlock": "⚡",
  "Cloud Architect": "☁️",
  "Security Sentinel": "🔐",
  "ML Alchemist": "🧪",
  "Embedded Ranger": "⚙️",
  "Mobile Bard": "🎵",
  "Platform Engineer": "🏗️",
  "QA Monk": "🧘",
};

const RARITY_COLORS = {
  Common: "6b7280",
  Uncommon: "22c55e",
  Rare: "3b82f6",
  Epic: "a855f7",
  Legendary: "f59e0b",
};

function escapeXml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Approximate text width for Verdana 11px (the shields.io standard)
function textWidth(str) {
  // Average char width ~6.8px for Verdana 11px, but varies
  return Math.ceil(str.length * 6.8 + 10);
}

/**
 * Generate a compact badge SVG.
 *
 * Style: "ResumeRPG | Lv.62 DevOps Ranger ★ Epic"
 *
 * @param {object} character - CharacterSheet
 * @param {object} [opts] - { style: 'flat' | 'full' }
 * @returns {string} SVG markup
 */
function generateBadge(character, opts = {}) {
  const style = opts.style || "flat";
  const cls = character.class || "Fullstack Warlock";
  const level = character.level || 1;
  const rarity = character.rarity || "Common";
  const icon = CLASS_ICONS[cls] || "⚔️";

  const leftText = "ResumeRPG";
  const rightText = style === "full"
    ? `Lv.${level} ${cls} · ${rarity}`
    : `Lv.${level} ${cls}`;

  const leftW = textWidth(leftText) + 6;
  const rightW = textWidth(rightText) + 14; // extra for icon
  const totalW = leftW + rightW;
  const h = 22;
  const classColor = CLASS_COLORS[cls] || "6b7280";
  const rarityColor = RARITY_COLORS[rarity] || "6b7280";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${h}" role="img" aria-label="${escapeXml(leftText)}: ${escapeXml(rightText)}">
  <title>${escapeXml(leftText)}: ${escapeXml(rightText)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="${h}" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="${h}" fill="#333"/>
    <rect x="${leftW}" width="${rightW}" height="${h}" fill="#${classColor}"/>
    <rect width="${totalW}" height="${h}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${leftW / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(leftText)}</text>
    <text x="${leftW / 2}" y="14" fill="#fff">${escapeXml(leftText)}</text>
    <text x="${leftW + rightW / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(icon)} ${escapeXml(rightText)}</text>
    <text x="${leftW + rightW / 2}" y="14" fill="#fff">${escapeXml(icon)} ${escapeXml(rightText)}</text>
  </g>
</svg>`;
}

/**
 * Generate a larger "card preview" badge with stats summary.
 *
 * @param {object} character
 * @param {object} [percentiles]
 * @returns {string} SVG markup
 */
function generateCardBadge(character, percentiles) {
  const cls = character.class || "Fullstack Warlock";
  const level = character.level || 1;
  const rarity = character.rarity || "Common";
  const name = character.name || "Unknown";
  const icon = CLASS_ICONS[cls] || "⚔️";
  const color = CLASS_COLORS[cls] || "6b7280";
  const rarColor = RARITY_COLORS[rarity] || "6b7280";
  const stats = character.stats || {};
  const total = Object.values(stats).reduce((a, b) => a + (b || 0), 0);
  const pctLabel = percentiles?.overall != null ? ` · Top ${(100 - percentiles.overall).toFixed(0)}%` : "";

  const W = 320, H = 80;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0c0c1d"/><stop offset="100%" stop-color="#111128"/></linearGradient></defs>
  <rect width="${W}" height="${H}" rx="8" fill="url(#bg)" stroke="#${color}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="50" y="26" font-family="'Segoe UI',system-ui,sans-serif" font-size="14" font-weight="700" fill="#f1f5f9">${escapeXml(name)}</text>
  <text x="50" y="44" font-family="'Segoe UI',system-ui,sans-serif" font-size="11" fill="#${color}">${escapeXml(icon)} Lv.${level} ${escapeXml(cls)}</text>
  <text x="50" y="62" font-family="'Segoe UI',system-ui,sans-serif" font-size="10" fill="#${rarColor}">★ ${escapeXml(rarity)} · Power ${total}${escapeXml(pctLabel)}</text>
  <text x="20" y="42" font-size="24">${escapeXml(icon)}</text>
</svg>`;
}

export { generateBadge, generateCardBadge };
