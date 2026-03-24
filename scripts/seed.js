#!/usr/bin/env node
/**
 * scripts/seed.js
 *
 * Populates github_cards with top GitHub developers for realistic percentile ranking.
 *
 * Usage:
 *   cp .env.example .env   # fill in GITHUB_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   node scripts/seed.js                     # default: 10,000 users
 *   node scripts/seed.js --target 5000       # custom target
 *   node scripts/seed.js --resume            # skip users already in DB
 *   node scripts/seed.js --dry-run           # fetch but don't write to DB
 *   node scripts/seed.js --recalc            # only recalculate percentile scores (no seeding)
 *   node scripts/seed.js --balanced          # 30% top devs + 70% common devs for realistic distribution
 *
 * How it works:
 *   1. Uses GitHub Search API to discover top users by followers (multiple range queries)
 *   2. For each user, fetches profile + repos (2 API calls)
 *   3. Generates RPG character using the same deterministic logic as the server
 *   4. Batch-upserts into Supabase github_cards table
 *   5. Runs recalc_percentiles() at the end
 *
 * Rate limits:
 *   - GitHub Search API: 30 requests/min (authenticated)
 *   - GitHub REST API: 5,000 requests/hr (authenticated) = ~2,500 users/hr
 *   - 10K users takes ~4 hours
 *
 * The script auto-saves progress to scripts/.seed-progress.json so you can Ctrl+C
 * and resume with --resume.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = resolve(__dirname, ".seed-progress.json");

// ─── Config ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const TARGET = Number(args.find((_, i, a) => a[i - 1] === "--target") || 10000);
const RESUME = args.includes("--resume");
const DRY_RUN = args.includes("--dry-run");
const COMMON = args.includes("--common");
const RECALC_ONLY = args.includes("--recalc");
const BALANCED = args.includes("--balanced");
const BATCH_SIZE = 25; // upsert batch size
const DELAY_BETWEEN_USERS_MS = 1500; // ~2400 users/hr, well within 5K/hr limit
const DELAY_BETWEEN_SEARCHES_MS = 2200; // stay under 30 search req/min

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"); process.exit(1); }
if (!RECALC_ONLY && !GITHUB_TOKEN) { console.error("GITHUB_TOKEN is required for seeding (5K req/hr vs 60/hr)"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── GitHub API helpers ─────────────────────────────────────────────
const headers = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "ResumeRPG-Seeder/1.0",
  Authorization: `Bearer ${GITHUB_TOKEN}`,
};

let apiCallCount = 0;
let rateLimitRemaining = 5000;
let rateLimitReset = 0;

async function ghFetch(url) {
  apiCallCount++;
  const res = await fetch(url, { headers });

  rateLimitRemaining = Number(res.headers.get("x-ratelimit-remaining") || 5000);
  rateLimitReset = Number(res.headers.get("x-ratelimit-reset") || 0);

  if (res.status === 403 && rateLimitRemaining === 0) {
    const waitSec = Math.max(0, rateLimitReset - Math.floor(Date.now() / 1000)) + 5;
    console.log(`\n⏳ Rate limit hit. Waiting ${waitSec}s until reset...`);
    await sleep(waitSec * 1000);
    return ghFetch(url); // retry
  }

  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${url}`);
  }
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Discover top users via Search API ──────────────────────────────
// GitHub Search returns max 1000 results per query.
// To get 10K+ users, we search by follower ranges.
async function discoverUsernames(target) {
  const usernames = new Set();

  // Follower ranges — each range returns up to 1000 users
  // These ranges are designed to spread across the distribution
  const followerRanges = [
    ">=50000",   // top ~200 (torvalds, gaearon, etc.)
    "20000..49999",
    "10000..19999",
    "5000..9999",
    "3000..4999",
    "2000..2999",
    "1500..1999",
    "1000..1499",
    "800..999",
    "600..799",
    "500..599",
    "400..499",
    "300..399",
    "250..299",
    "200..249",
    "150..199",
    "120..149",
    "100..119",
    "80..99",
    "60..79",
    "50..59",
    "40..49",
    "30..39",
    "25..29",
    "20..24",
    "15..19",
    "12..14",
    "10..11",
  ];

  console.log(`\n🔍 Discovering users (target: ${target})...\n`);

  for (const range of followerRanges) {
    if (usernames.size >= target) break;

    // Fetch up to 10 pages (1000 users) per range
    for (let page = 1; page <= 10; page++) {
      if (usernames.size >= target) break;

      const q = encodeURIComponent(`followers:${range} type:user`);
      const url = `https://api.github.com/search/users?q=${q}&sort=followers&order=desc&per_page=100&page=${page}`;

      try {
        const data = await ghFetch(url);
        const items = data.items || [];
        if (items.length === 0) break; // no more results for this range

        for (const u of items) {
          if (u.login) usernames.add(u.login.toLowerCase());
        }

        const totalAvail = Math.min(data.total_count || 0, 1000);
        console.log(`  followers:${range} page ${page} → +${items.length} users (${usernames.size} total, ${totalAvail} available in range)`);

        if (items.length < 100) break; // last page
        await sleep(DELAY_BETWEEN_SEARCHES_MS);
      } catch (e) {
        console.warn(`  ⚠ Search failed for followers:${range} page ${page}: ${e.message}`);
        await sleep(5000);
        break;
      }
    }
  }

  // If still short, search by repos count
  if (usernames.size < target) {
    console.log(`\n  Supplementing with repos-based search...`);
    const repoRanges = [">=500", "200..499", "100..199", "80..99", "60..79", "50..59"];
    for (const range of repoRanges) {
      if (usernames.size >= target) break;
      const q = encodeURIComponent(`repos:${range} type:user`);
      const url = `https://api.github.com/search/users?q=${q}&sort=repositories&order=desc&per_page=100&page=1`;
      try {
        const data = await ghFetch(url);
        for (const u of (data.items || [])) {
          if (u.login) usernames.add(u.login.toLowerCase());
        }
        console.log(`  repos:${range} → ${usernames.size} total`);
        await sleep(DELAY_BETWEEN_SEARCHES_MS);
      } catch { /* skip */ }
    }
  }

  console.log(`\n✅ Discovered ${usernames.size} unique usernames\n`);
  return [...usernames];
}

// ─── Discover common users (low followers, genuine activity) ─────────
async function discoverCommonUsernames(target) {
  const usernames = new Set();

  console.log(`\n🔍 Discovering common users (target: ${target})...\n`);

  // Strategy 1: Repo-count x follower-range combos
  const repoThresholds = [20, 15, 10, 7, 5, 3];
  const followerCaps = ["0..2", "3..5", "6..9"];

  for (const minRepos of repoThresholds) {
    for (const fRange of followerCaps) {
      if (usernames.size >= target) break;
      for (let page = 1; page <= 10; page++) {
        if (usernames.size >= target) break;
        const q = encodeURIComponent(`followers:${fRange} repos:>=${minRepos} type:user`);
        const url = `https://api.github.com/search/users?q=${q}&sort=repositories&order=desc&per_page=100&page=${page}`;
        try {
          const data = await ghFetch(url);
          const items = data.items || [];
          if (items.length === 0) break;
          for (const u of items) {
            if (u.login) usernames.add(u.login.toLowerCase());
          }
          console.log(`  followers:${fRange} repos:>=${minRepos} p${page} → ${usernames.size} total`);
          if (items.length < 100) break;
          await sleep(DELAY_BETWEEN_SEARCHES_MS);
        } catch (e) {
          console.warn(`  ⚠ Search failed: ${e.message}`);
          await sleep(5000);
          break;
        }
      }
    }
  }

  // Strategy 2: Language-specific searches
  const languages = [
    "JavaScript", "Python", "Java", "Go", "Rust", "C", "C++", "TypeScript",
    "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "Dart", "Shell",
    "Lua", "Elixir", "Haskell", "C#",
  ];

  for (const lang of languages) {
    if (usernames.size >= target) break;
    for (let page = 1; page <= 10; page++) {
      if (usernames.size >= target) break;
      const q = encodeURIComponent(`language:${lang} followers:0..9 repos:>=3 type:user`);
      const url = `https://api.github.com/search/users?q=${q}&sort=repositories&order=desc&per_page=100&page=${page}`;
      try {
        const data = await ghFetch(url);
        const items = data.items || [];
        if (items.length === 0) break;
        for (const u of items) {
          if (u.login) usernames.add(u.login.toLowerCase());
        }
        console.log(`  language:${lang} p${page} → ${usernames.size} total`);
        if (items.length < 100) break;
        await sleep(DELAY_BETWEEN_SEARCHES_MS);
      } catch (e) {
        console.warn(`  ⚠ Search failed: ${e.message}`);
        await sleep(5000);
        break;
      }
    }
  }

  // Strategy 3: Created-date ranges
  const dateRanges = [
    "2024-01-01..2024-12-31", "2023-01-01..2023-12-31",
    "2022-01-01..2022-12-31", "2021-01-01..2021-12-31",
    "2020-01-01..2020-12-31", "2019-01-01..2019-12-31",
    "2018-01-01..2018-12-31", "2015-01-01..2017-12-31",
    "2012-01-01..2014-12-31", "2008-01-01..2011-12-31",
  ];

  for (const dateRange of dateRanges) {
    if (usernames.size >= target) break;
    for (let page = 1; page <= 10; page++) {
      if (usernames.size >= target) break;
      const q = encodeURIComponent(`created:${dateRange} followers:0..9 repos:>=3 type:user`);
      const url = `https://api.github.com/search/users?q=${q}&sort=joined&order=desc&per_page=100&page=${page}`;
      try {
        const data = await ghFetch(url);
        const items = data.items || [];
        if (items.length === 0) break;
        for (const u of items) {
          if (u.login) usernames.add(u.login.toLowerCase());
        }
        console.log(`  created:${dateRange} p${page} → ${usernames.size} total`);
        if (items.length < 100) break;
        await sleep(DELAY_BETWEEN_SEARCHES_MS);
      } catch (e) {
        console.warn(`  ⚠ Search failed: ${e.message}`);
        await sleep(5000);
        break;
      }
    }
  }

  // Strategy 4: Location-based searches
  const cities = [
    "San Francisco", "New York", "London", "Berlin", "Tokyo", "Bangalore",
    "Toronto", "Paris", "Amsterdam", "Sydney", "Singapore", "Seoul",
    "Beijing", "Shanghai", "Mumbai", "Sao Paulo", "Lagos", "Nairobi",
    "Stockholm", "Helsinki", "Austin", "Seattle", "Chicago", "Boston",
    "Denver", "Dublin", "Zurich", "Tel Aviv", "Barcelona", "Warsaw",
  ];

  for (const city of cities) {
    if (usernames.size >= target) break;
    for (let page = 1; page <= 10; page++) {
      if (usernames.size >= target) break;
      const q = encodeURIComponent(`location:"${city}" followers:0..5 repos:>=3 type:user`);
      const url = `https://api.github.com/search/users?q=${q}&sort=repositories&order=desc&per_page=100&page=${page}`;
      try {
        const data = await ghFetch(url);
        const items = data.items || [];
        if (items.length === 0) break;
        for (const u of items) {
          if (u.login) usernames.add(u.login.toLowerCase());
        }
        console.log(`  location:"${city}" p${page} → ${usernames.size} total`);
        if (items.length < 100) break;
        await sleep(DELAY_BETWEEN_SEARCHES_MS);
      } catch (e) {
        console.warn(`  ⚠ Search failed: ${e.message}`);
        await sleep(5000);
        break;
      }
    }
  }

  console.log(`\n✅ Discovered ${usernames.size} unique common usernames\n`);
  return [...usernames];
}

// ─── Character generation (same logic as server/lib/github-cards.js) ─
const CLASS_MAP = {
  JavaScript: "Frontend Sorcerer", TypeScript: "Fullstack Warlock", Python: "ML Alchemist",
  Java: "Backend Paladin", Go: "Cloud Architect", Rust: "Embedded Ranger",
  C: "Embedded Ranger", "C++": "Embedded Ranger", Ruby: "Backend Paladin",
  Swift: "Mobile Bard", Kotlin: "Mobile Bard", Shell: "DevOps Ranger",
  HCL: "DevOps Ranger", Dockerfile: "DevOps Ranger", PHP: "Backend Paladin",
  "C#": "Backend Paladin", Scala: "Backend Paladin", Dart: "Mobile Bard",
  R: "Data Necromancer", Julia: "ML Alchemist", Lua: "Embedded Ranger",
  Elixir: "Backend Paladin", Haskell: "ML Alchemist",
};

const TOP_ORGS = new Set([
  "google", "microsoft", "meta", "facebook", "apple", "amazon", "netflix",
  "linux", "torvalds", "kubernetes", "apache", "mozilla", "rust-lang",
  "golang", "python", "nodejs", "vercel", "supabase", "docker",
  "elastic", "hashicorp", "redhat", "canonical", "debian", "ubuntu",
  "openai", "anthropic", "huggingface", "tensorflow", "pytorch",
  "flutter", "angular", "vuejs", "sveltejs", "reactjs", "facebook",
  "stripe", "cloudflare", "github", "gitlabhq", "atlassian",
  "shopify", "airbnb", "uber", "twitter", "x",
  "nasa", "cern", "mit", "stanford",
]);

const STAR_THRESHOLD = 5;

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function weightedPower(stats) {
  return Math.floor(
    (stats.IMPACT + stats.INFLUENCE + stats.VISION) * 2
    + (stats.CRAFT + stats.RANGE) * 1.5
    + stats.TENURE
  );
}

function calculateStats(gh) {
  const sLangs = gh.starredLanguages || gh.languages;
  const topStars = Math.max(...(gh.topRepos || []).map(r => r.stars || 0), 0);
  const starMagnitude = topStars > 10000 ? 5 : topStars > 1000 ? 3 : topStars > 100 ? 1 : 0;
  const followerBreadth = gh.followers > 10000 ? 3 : gh.followers > 1000 ? 1 : 0;
  const orgBonus = gh.isTopOrgMember ? 1 : 0;
  const reachBonus = gh.totalStars > 100000 ? 5 : gh.totalStars > 10000 ? 3 : gh.totalStars > 1000 ? 1 : 0;

  return {
    IMPACT: clamp(Math.floor(Math.log2(gh.totalStars + 1) * 1.5) + Math.floor(gh.totalForks / 10) + (gh.publicRepos > 50 ? 3 : gh.publicRepos > 20 ? 2 : 1) + orgBonus * 3, 1, 20),
    CRAFT: clamp(Math.min(sLangs.length * 2, 10) + Math.floor(Math.log2(gh.publicRepos + 1) * 1.5) + (gh.recentlyActive > 10 ? 3 : gh.recentlyActive > 5 ? 2 : 0) + starMagnitude, 1, 20),
    RANGE: clamp(Math.min(sLangs.length, 12) + (gh.topRepos.some(r => r.lang !== gh.topLanguage) ? 3 : 0) + Math.min(Math.floor(gh.publicRepos / 15), 4) + followerBreadth + reachBonus, 1, 20),
    TENURE: clamp(gh.yearsActive * 2 + (gh.publicRepos > 100 ? 2 : 0), 1, 20),
    VISION: clamp(Math.floor(Math.log2(gh.totalStars + 1) * 2) + (gh.topRepos.some(r => r.stars > 100) ? 4 : gh.topRepos.some(r => r.stars > 20) ? 2 : 0) + (gh.bio.length > 50 ? 1 : 0), 1, 20),
    INFLUENCE: clamp(Math.floor(Math.log2(gh.followers + 1) * 2.5) + (gh.followers > gh.following * 2 ? 2 : 0) + (gh.company ? 1 : 0) + orgBonus * 2, 1, 20),
  };
}

function generateCharacter(gh) {
  const stats = calculateStats(gh);
  const charClass = CLASS_MAP[gh.topLanguage] || "Fullstack Warlock";
  const statTotal = Object.values(stats).reduce((a, b) => a + b, 0);
  const wp = weightedPower(stats);
  const level = clamp(Math.floor(gh.yearsActive * 4 + statTotal * 0.5 + Math.log2(gh.totalStars + 1) * 2), 1, 99);
  const rarity = wp >= 155 ? "Legendary" : wp >= 125 ? "Epic" : wp >= 95 ? "Rare" : wp >= 65 ? "Uncommon" : "Common";

  const inventory = gh.topRepos.map(r => ({
    name: r.name + (r.stars > 0 ? " ★" + r.stars : ""),
    type: r.stars > 100 ? "artifact" : r.stars > 20 ? "weapon" : r.stars > 5 ? "armor" : "scroll",
    rarity: r.stars > 500 ? "legendary" : r.stars > 100 ? "epic" : r.stars > 20 ? "rare" : r.stars > 5 ? "uncommon" : "common",
  }));

  const quests = [];
  if (gh.publicRepos > 0) quests.push({ name: `The ${gh.publicRepos} Repos Crusade`, description: `Created ${gh.publicRepos} public repositories` });
  if (gh.followers > 0) quests.push({ name: `Gathering of ${gh.followers}`, description: `Built a following of ${gh.followers} developers` });
  if (gh.yearsActive > 3) quests.push({ name: `The ${gh.yearsActive}-Year Campaign`, description: `${gh.yearsActive} years of open source contributions` });
  if (gh.totalStars > 10) quests.push({ name: "Star Collector", description: `Earned ${gh.totalStars} stars across all repositories` });
  if (gh.languages.length > 5) quests.push({ name: "Polyglot's Path", description: `Mastered ${gh.languages.length} programming languages` });

  const bossBattles = [];
  if (gh.yearsActive > 5) bossBattles.push({ name: "The Long March", status: "defeated" });
  if (gh.totalStars > 100) bossBattles.push({ name: "The Popularity Dragon", status: "defeated" });
  if (gh.publicRepos > 50) bossBattles.push({ name: "The Scope Hydra", status: "defeated" });

  return {
    character: {
      name: gh.name, title: "Open Source Developer", class: charClass, level, rarity,
      xp_current: gh.totalStars,
      xp_max: Math.max(gh.totalStars + 500, Math.ceil((gh.totalStars + 500) / 1000) * 1000),
      stats, skills: gh.languages.slice(0, 8), inventory,
      quests_completed: quests.slice(0, 5), boss_battles: bossBattles.slice(0, 3),
      guild: gh.company || "Open Source",
      backstory: gh.bio || `A ${gh.topLanguage} wielder who has forged ${gh.publicRepos} repositories over ${gh.yearsActive} years.`,
      tagline: `Level ${level} ${gh.topLanguage} Wielder`,
      _github: { login: gh.login, avatar: gh.avatarUrl },
      _weightedPower: wp,
    },
    dbRow: {
      username: gh.login.toLowerCase(),
      character: null, // filled below
      github_data: gh,
      avatar_url: gh.avatarUrl,
      stat_impact: stats.IMPACT, stat_craft: stats.CRAFT, stat_range: stats.RANGE,
      stat_tenure: stats.TENURE, stat_vision: stats.VISION, stat_influence: stats.INFLUENCE,
      stat_total: wp,
      level, rarity, class: charClass,
      refreshed_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
      access_count: 0,
    },
  };
}

// ─── Fetch a single user's full profile ─────────────────────────────
async function fetchAndGenerate(username) {
  const encoded = encodeURIComponent(username);

  const user = await ghFetch(`https://api.github.com/users/${encoded}`);
  if (!user || !user.login) return null;

  let repos = [];
  try {
    repos = await ghFetch(`https://api.github.com/users/${encoded}/repos?per_page=100&sort=pushed`);
    if (!Array.isArray(repos)) repos = [];
  } catch { repos = []; }

  let orgs = [];
  try {
    const orgsJson = await ghFetch(`https://api.github.com/users/${encoded}/orgs`);
    orgs = Array.isArray(orgsJson) ? orgsJson.map(o => o.login?.toLowerCase()).filter(Boolean) : [];
  } catch { orgs = []; }
  const isTopOrgMember = orgs.some(o => TOP_ORGS.has(o));

  const allLanguages = {};
  const starredLanguages = {};
  let totalStars = 0, totalForks = 0;
  for (const r of repos) {
    if (r.fork) continue;
    const stars = r.stargazers_count || 0;
    if (r.language) {
      allLanguages[r.language] = (allLanguages[r.language] || 0) + 1;
      if (stars >= STAR_THRESHOLD) {
        starredLanguages[r.language] = (starredLanguages[r.language] || 0) + 1;
      }
    }
    totalStars += stars;
    totalForks += r.forks_count || 0;
  }
  const langList = Object.entries(allLanguages).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const starredLangList = Object.entries(starredLanguages).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const ownRepos = repos.filter(r => !r.fork);
  const oldestRepo = ownRepos.reduce((o, r) => (!o || new Date(r.created_at) < new Date(o.created_at) ? r : o), null);
  const yearsActive = oldestRepo ? Math.max(1, Math.floor((Date.now() - new Date(oldestRepo.created_at).getTime()) / (365.25 * 86400000))) : 1;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
  const recentlyActive = ownRepos.filter(r => new Date(r.pushed_at) > ninetyDaysAgo).length;

  const gh = {
    login: user.login, name: user.name || user.login, bio: user.bio || "",
    company: user.company || "", location: user.location || "",
    followers: user.followers || 0, following: user.following || 0,
    publicRepos: user.public_repos || 0, totalStars, totalForks,
    languages: langList, starredLanguages: starredLangList,
    topLanguage: langList[0] || "Code",
    yearsActive, recentlyActive, avatarUrl: user.avatar_url,
    orgs, isTopOrgMember,
    topRepos: ownRepos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 6).map(r => ({ name: r.name, stars: r.stargazers_count, lang: r.language, description: r.description })),
  };

  const result = generateCharacter(gh);
  result.dbRow.character = result.character;
  return result;
}

// ─── Progress tracking ──────────────────────────────────────────────
function loadProgress() {
  if (!RESUME || !existsSync(PROGRESS_FILE)) return { completed: [], failed: [] };
  try { return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")); } catch { return { completed: [], failed: [] }; }
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  if (RECALC_ONLY) {
    console.log("╔════════════════════════════════════════╗");
    console.log("║    ResumeRPG Percentile Recalculator   ║");
    console.log("╚════════════════════════════════════════╝");
    console.log(`  Supabase:  ${SUPABASE_URL}\n`);

    const { count } = await supabase
      .from("github_cards")
      .select("username", { count: "exact", head: true });
    console.log(`  Cards in DB: ${count || 0}`);

    await runPercentileRecalc();

    console.log(`\n  ✅ Done. Percentiles recalculated across ${count || 0} cards.`);
    return;
  }

  console.log("╔════════════════════════════════════════╗");
  console.log("║       ResumeRPG Database Seeder        ║");
  console.log("╚════════════════════════════════════════╝");
  const mode = BALANCED ? "balanced (30% top + 70% common)" : COMMON ? "common users (low followers)" : "top developers (high followers)";
  console.log(`  Target:    ${TARGET.toLocaleString()} users`);
  console.log(`  Mode:      ${mode}`);
  console.log(`  Resume:    ${RESUME}`);
  console.log(`  Dry run:   ${DRY_RUN}`);
  console.log(`  Est. time: ~${Math.ceil(TARGET / 2400)} hours`);
  console.log(`  Supabase:  ${SUPABASE_URL}`);
  console.log();

  // Load progress
  const progress = loadProgress();
  const completedSet = new Set(progress.completed || []);
  console.log(`  Previously completed: ${completedSet.size}`);

  // Check existing DB count
  const { count: existingCount } = await supabase
    .from("github_cards")
    .select("username", { count: "exact", head: true });
  console.log(`  Already in DB: ${existingCount || 0}\n`);

  // Step 1: Discover usernames
  let allUsernames;
  if (BALANCED) {
    const topTarget = Math.ceil(TARGET * 0.3);
    const commonTarget = TARGET - topTarget;
    console.log(`  Balanced mode: discovering ${topTarget} top + ${commonTarget} common users\n`);
    const [topUsers, commonUsers] = await Promise.all([
      discoverUsernames(topTarget + completedSet.size),
      discoverCommonUsernames(commonTarget + completedSet.size),
    ]);
    const combined = new Set([...topUsers, ...commonUsers]);
    allUsernames = [...combined];
    console.log(`\n  Combined: ${allUsernames.length} unique usernames (${topUsers.length} top + ${commonUsers.length} common, ${allUsernames.length - topUsers.length - commonUsers.length + combined.size} overlap removed)\n`);
  } else if (COMMON) {
    allUsernames = await discoverCommonUsernames(TARGET + completedSet.size);
  } else {
    allUsernames = await discoverUsernames(TARGET + completedSet.size);
  }

  // Filter out already-completed users
  const toProcess = RESUME
    ? allUsernames.filter(u => !completedSet.has(u))
    : allUsernames;

  // If resuming, also check what's already in the DB
  let alreadyInDb = new Set();
  if (RESUME && !DRY_RUN) {
    console.log("  Checking which users are already in database...");
    const { data: existing } = await supabase
      .from("github_cards")
      .select("username");
    if (existing) {
      alreadyInDb = new Set(existing.map(r => r.username));
    }
    console.log(`  ${alreadyInDb.size} already in DB, skipping those.\n`);
  }

  const remaining = toProcess.filter(u => !alreadyInDb.has(u)).slice(0, TARGET - (existingCount || 0));
  console.log(`  Will process: ${remaining.length} users\n`);

  if (remaining.length === 0) {
    console.log("Nothing to do! Target already reached or all users processed.");
    await runPercentileRecalc();
    return;
  }

  // Step 2: Fetch + generate + batch upsert
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let batch = [];
  const startTime = Date.now();

  for (const username of remaining) {
    processed++;
    try {
      const result = await fetchAndGenerate(username);
      if (result && result.dbRow) {
        batch.push(result.dbRow);
        succeeded++;
      } else {
        failed++;
      }
    } catch (e) {
      console.warn(`  ✗ ${username}: ${e.message}`);
      failed++;
      progress.failed = progress.failed || [];
      progress.failed.push(username);
    }

    // Batch upsert
    if (batch.length >= BATCH_SIZE) {
      if (!DRY_RUN) {
        const { error } = await supabase
          .from("github_cards")
          .upsert(batch, { onConflict: "username", ignoreDuplicates: false });
        if (error) {
          console.error(`  ⚠ Batch upsert error: ${error.message}`);
        }
      }
      batch = [];
    }

    // Track progress
    completedSet.add(username);
    if (processed % 10 === 0) {
      progress.completed = [...completedSet];
      saveProgress(progress);
    }

    // Progress report
    if (processed % 50 === 0 || processed === remaining.length) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = succeeded / (elapsed / 3600);
      const eta = ((remaining.length - processed) / (succeeded / elapsed)) / 60;
      const pct = ((processed / remaining.length) * 100).toFixed(1);
      console.log(
        `  [${pct}%] ${processed}/${remaining.length} processed | ` +
        `${succeeded} ok, ${failed} failed | ` +
        `${Math.round(rate)}/hr | ` +
        `API calls: ${apiCallCount} (${rateLimitRemaining} remaining) | ` +
        `ETA: ${eta > 60 ? `${(eta / 60).toFixed(1)}h` : `${Math.round(eta)}m`}`
      );
    }

    await sleep(DELAY_BETWEEN_USERS_MS);
  }

  // Flush remaining batch
  if (batch.length > 0 && !DRY_RUN) {
    const { error } = await supabase
      .from("github_cards")
      .upsert(batch, { onConflict: "username", ignoreDuplicates: false });
    if (error) console.error(`  ⚠ Final batch error: ${error.message}`);
  }

  // Save final progress
  progress.completed = [...completedSet];
  saveProgress(progress);

  // Step 3: Recalculate percentiles
  await runPercentileRecalc();

  // Summary
  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const { count: finalCount } = await supabase
    .from("github_cards")
    .select("username", { count: "exact", head: true });

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║            Seeding Complete!            ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`  Processed:  ${processed}`);
  console.log(`  Succeeded:  ${succeeded}`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Total in DB: ${finalCount}`);
  console.log(`  Time:       ${totalElapsed} min`);
  console.log(`  API calls:  ${apiCallCount}`);
  console.log();
  console.log(`  Your percentiles are now based on ${finalCount} developers.`);
  console.log(`  "Top 5% of ${finalCount} developers" — that means something.`);
  console.log();
}

async function runPercentileRecalc() {
  if (DRY_RUN) { console.log("\n  [dry-run] Skipping percentile recalc"); return; }
  console.log("\n  📊 Recalculating percentiles across all cards...");
  const { error } = await supabase.rpc("recalc_percentiles");
  if (error) {
    console.error("  ⚠ Percentile recalc failed:", error.message);
  } else {
    console.log("  ✅ Percentiles recalculated successfully");
  }
}

main().catch(e => {
  console.error("\n💀 Fatal error:", e.message);
  process.exit(1);
});
