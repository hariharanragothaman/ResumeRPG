// server/lib/github-cards.js
// Fetch GitHub profile → generate RPG card → cache in Supabase → percentile rank

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null; // optional, raises rate limit to 5K/hr
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // re-fetch GitHub data after 24 hours
const RECALC_INTERVAL_MS = 5 * 60 * 1000; // recalc percentiles every 5 min (if new cards added)

const VALID_CLASSES = [
  "Frontend Sorcerer", "Backend Paladin", "DevOps Ranger", "Data Necromancer",
  "Fullstack Warlock", "Cloud Architect", "Security Sentinel", "ML Alchemist",
  "Embedded Ranger", "Mobile Bard", "Platform Engineer", "QA Monk",
];
const VALID_RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

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

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// ── GitHub API fetch ────────────────────────────────────────────────
async function fetchGitHubProfile(username) {
  const headers = { Accept: "application/vnd.github.v3+json", "User-Agent": "ResumeRPG/1.0" };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const [userRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }),
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, { headers }),
  ]);

  if (userRes.status === 404) return null;
  if (!userRes.ok) throw new Error(`GitHub API error: ${userRes.status}`);

  const user = await userRes.json();
  const reposJson = await reposRes.json().catch(() => ({}));
  const repos = Array.isArray(reposJson) ? reposJson : [];
  if (!reposRes.ok && repos.length === 0) {
    console.warn(`[github-cards] repos request ${reposRes.status} for ${username} — continuing with empty repo list`);
  }

  const languages = {};
  let totalStars = 0, totalForks = 0;
  for (const r of repos) {
    if (r.fork) continue; // skip forks for more accurate language/star counts
    if (r.language) languages[r.language] = (languages[r.language] || 0) + 1;
    totalStars += r.stargazers_count || 0;
    totalForks += r.forks_count || 0;
  }

  const langList = Object.entries(languages).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const ownRepos = repos.filter(r => !r.fork);

  const oldestRepo = ownRepos.reduce((o, r) =>
    (!o || new Date(r.created_at) < new Date(o.created_at) ? r : o), null);
  const yearsActive = oldestRepo
    ? Math.max(1, Math.floor((Date.now() - new Date(oldestRepo.created_at).getTime()) / (365.25 * 86400000)))
    : 1;

  // Contribution proxy: recent push activity (repos pushed in last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
  const recentlyActive = ownRepos.filter(r => new Date(r.pushed_at) > ninetyDaysAgo).length;

  return {
    login: user.login,
    name: user.name || user.login,
    bio: user.bio || "",
    company: user.company || "",
    location: user.location || "",
    followers: user.followers || 0,
    following: user.following || 0,
    publicRepos: user.public_repos || 0,
    totalStars,
    totalForks,
    languages: langList,
    topLanguage: langList[0] || "Code",
    yearsActive,
    recentlyActive,
    avatarUrl: user.avatar_url,
    topRepos: ownRepos
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 6)
      .map(r => ({ name: r.name, stars: r.stargazers_count, lang: r.language, description: r.description })),
  };
}

// ── Stats calculation (deterministic, no AI needed) ─────────────────
function calculateStats(gh) {
  return {
    IMPACT: clamp(
      Math.floor(Math.log2(gh.totalStars + 1) * 1.5) +
      Math.floor(gh.totalForks / 10) +
      (gh.publicRepos > 50 ? 3 : gh.publicRepos > 20 ? 2 : 1),
      1, 20),
    CRAFT: clamp(
      Math.min(gh.languages.length * 2, 10) +
      Math.floor(Math.log2(gh.publicRepos + 1) * 1.5) +
      (gh.recentlyActive > 10 ? 3 : gh.recentlyActive > 5 ? 2 : 0),
      1, 20),
    RANGE: clamp(
      Math.min(gh.languages.length, 12) +
      (gh.topRepos.some(r => r.lang !== gh.topLanguage) ? 3 : 0) +
      Math.floor(gh.publicRepos / 15),
      1, 20),
    TENURE: clamp(
      gh.yearsActive * 2 +
      (gh.publicRepos > 100 ? 2 : 0),
      1, 20),
    VISION: clamp(
      Math.floor(Math.log2(gh.totalStars + 1) * 2) +
      (gh.topRepos.some(r => r.stars > 100) ? 4 : gh.topRepos.some(r => r.stars > 20) ? 2 : 0) +
      (gh.bio.length > 50 ? 1 : 0),
      1, 20),
    INFLUENCE: clamp(
      Math.floor(Math.log2(gh.followers + 1) * 2.5) +
      (gh.followers > gh.following * 2 ? 2 : 0) +
      (gh.company ? 1 : 0),
      1, 20),
  };
}

function determineClass(gh) {
  return CLASS_MAP[gh.topLanguage] || "Fullstack Warlock";
}

function determineLevel(gh, stats) {
  const statTotal = Object.values(stats).reduce((a, b) => a + b, 0);
  return clamp(
    Math.floor(gh.yearsActive * 4 + statTotal * 0.5 + Math.log2(gh.totalStars + 1) * 2),
    1, 99
  );
}

function determineRarity(stats) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  if (total >= 95) return "Legendary";
  if (total >= 75) return "Epic";
  if (total >= 55) return "Rare";
  if (total >= 40) return "Uncommon";
  return "Common";
}

function generateCharacter(gh) {
  const stats = calculateStats(gh);
  const charClass = determineClass(gh);
  const level = determineLevel(gh, stats);
  const rarity = determineRarity(stats);
  const statTotal = Object.values(stats).reduce((a, b) => a + b, 0);

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
    name: gh.name,
    title: "Open Source Developer",
    class: charClass,
    level,
    rarity,
    xp_current: gh.totalStars,
    xp_max: Math.max(gh.totalStars + 500, Math.ceil((gh.totalStars + 500) / 1000) * 1000),
    stats,
    skills: gh.languages.slice(0, 8),
    inventory,
    quests_completed: quests.slice(0, 5),
    boss_battles: bossBattles.slice(0, 3),
    guild: gh.company || "Open Source",
    backstory: gh.bio || `A ${gh.topLanguage} wielder who has forged ${gh.publicRepos} repositories over ${gh.yearsActive} years.`,
    tagline: `Level ${level} ${gh.topLanguage} Wielder`,
    _github: { login: gh.login, avatar: gh.avatarUrl },
    _statTotal: statTotal,
  };
}

// ── Supabase CRUD ───────────────────────────────────────────────────
async function getCachedCard(supabase, username) {
  const { data, error } = await supabase
    .from("github_cards")
    .select("*")
    .eq("username", username.toLowerCase())
    .single();
  if (error || !data) return null;
  return data;
}

async function upsertCard(supabase, username, character, githubData) {
  const stats = character.stats;
  const row = {
    username: username.toLowerCase(),
    character,
    github_data: githubData,
    avatar_url: githubData.avatarUrl,
    stat_impact: stats.IMPACT,
    stat_craft: stats.CRAFT,
    stat_range: stats.RANGE,
    stat_tenure: stats.TENURE,
    stat_vision: stats.VISION,
    stat_influence: stats.INFLUENCE,
    stat_total: Object.values(stats).reduce((a, b) => a + b, 0),
    level: character.level,
    rarity: character.rarity,
    class: character.class,
    refreshed_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("github_cards")
    .upsert(row, { onConflict: "username" });

  if (error) throw new Error(`Upsert failed: ${error.message}`);
}

async function touchCard(supabase, username) {
  const uname = username.toLowerCase();
  await supabase
    .from("github_cards")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("username", uname);

  // increment_access_count RPC (migration 003) — errors are non-fatal
  const { error } = await supabase.rpc("increment_access_count", { uname });
  if (error) {
    // RPC missing, RLS, or transient failure — last_accessed_at still updated above
  }
}

async function recalcPercentiles(supabase) {
  const { error } = await supabase.rpc("recalc_percentiles");
  if (error) console.error("Percentile recalc failed:", error.message);
  else console.log("Percentiles recalculated");
}

// ── Main entry: get or generate a GitHub card ───────────────────────
async function getOrCreateCard(supabase, username) {
  const normalizedUsername = username.toLowerCase().trim();
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(normalizedUsername)) {
    throw Object.assign(new Error("Invalid GitHub username"), { status: 400 });
  }

  // 1. Check cache
  const cached = await getCachedCard(supabase, normalizedUsername);
  if (cached) {
    const age = Date.now() - new Date(cached.refreshed_at).getTime();
    if (age < CACHE_TTL_MS) {
      // Fresh cache hit — update access stats and return
      void touchCard(supabase, normalizedUsername);
      return {
        character: cached.character,
        percentiles: {
          IMPACT: cached.pct_impact,
          CRAFT: cached.pct_craft,
          RANGE: cached.pct_range,
          TENURE: cached.pct_tenure,
          VISION: cached.pct_vision,
          INFLUENCE: cached.pct_influence,
          overall: cached.pct_overall,
        },
        meta: {
          cached: true,
          refreshedAt: cached.refreshed_at,
          accessCount: cached.access_count,
        },
      };
    }
    // Stale cache — re-fetch below
  }

  // 2. Fetch from GitHub
  const ghProfile = await fetchGitHubProfile(normalizedUsername);
  if (!ghProfile) {
    throw Object.assign(new Error("GitHub user not found"), { status: 404 });
  }

  // 3. Generate character
  const character = generateCharacter(ghProfile);

  // 4. Save to Supabase
  await upsertCard(supabase, normalizedUsername, character, ghProfile);

  // 5. Recalc percentiles (async, don't block response)
  void recalcPercentiles(supabase);

  // 6. Return (percentiles may be null for brand new cards)
  return {
    character,
    percentiles: cached ? {
      IMPACT: cached.pct_impact,
      CRAFT: cached.pct_craft,
      RANGE: cached.pct_range,
      TENURE: cached.pct_tenure,
      VISION: cached.pct_vision,
      INFLUENCE: cached.pct_influence,
      overall: cached.pct_overall,
    } : null,
    meta: {
      cached: false,
      refreshedAt: new Date().toISOString(),
      accessCount: (cached?.access_count || 0) + 1,
    },
  };
}

// ── In-memory fallback (local dev without Supabase) ─────────────────
const MEMORY_GH_CACHE = new Map();

/**
 * Same card payload as getOrCreateCard, but stores in RAM with TTL.
 * Percentiles are always null; cohort stats unavailable.
 */
async function getOrCreateCardMemory(username) {
  const normalizedUsername = username.toLowerCase().trim();
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(normalizedUsername)) {
    throw Object.assign(new Error("Invalid GitHub username"), { status: 400 });
  }

  const row = MEMORY_GH_CACHE.get(normalizedUsername);
  if (row && Date.now() - new Date(row.refreshed_at).getTime() < CACHE_TTL_MS) {
    row.access_count = (row.access_count || 0) + 1;
    return {
      character: row.character,
      percentiles: null,
      meta: {
        cached: true,
        refreshedAt: row.refreshed_at,
        accessCount: row.access_count,
      },
    };
  }

  const ghProfile = await fetchGitHubProfile(normalizedUsername);
  if (!ghProfile) {
    throw Object.assign(new Error("GitHub user not found"), { status: 404 });
  }

  const character = generateCharacter(ghProfile);
  const refreshed_at = new Date().toISOString();
  const prev = MEMORY_GH_CACHE.get(normalizedUsername);
  const access_count = (prev?.access_count || 0) + 1;

  MEMORY_GH_CACHE.set(normalizedUsername, {
    character,
    refreshed_at,
    access_count,
  });

  return {
    character,
    percentiles: null,
    meta: {
      cached: false,
      refreshedAt: refreshed_at,
      accessCount: access_count,
    },
  };
}

// ── Global stats ────────────────────────────────────────────────────
async function getGlobalStats(supabase) {
  const { data, error } = await supabase
    .from("github_card_stats")
    .select("*")
    .single();
  if (error) return null;
  return data;
}

// ── Periodic percentile recalc ──────────────────────────────────────
let _recalcTimer = null;
let _cardCountAtLastRecalc = 0;

function startPeriodicRecalc(supabase) {
  if (_recalcTimer) return;
  _recalcTimer = setInterval(async () => {
    try {
      const { count } = await supabase
        .from("github_cards")
        .select("username", { count: "exact", head: true });
      if (count !== _cardCountAtLastRecalc) {
        await recalcPercentiles(supabase);
        _cardCountAtLastRecalc = count;
      }
    } catch (e) {
      console.error("Periodic recalc error:", e.message);
    }
  }, RECALC_INTERVAL_MS);
}

export {
  getOrCreateCard,
  getOrCreateCardMemory,
  getGlobalStats,
  startPeriodicRecalc,
  fetchGitHubProfile,
  generateCharacter,
};
