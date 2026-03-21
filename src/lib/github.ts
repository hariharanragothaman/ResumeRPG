import type { CharacterSheet, CharacterClass, Rarity } from "@/types/character";

interface GitHubProfile {
  name: string;
  login: string;
  bio: string;
  company: string;
  followers: number;
  publicRepos: number;
  totalStars: number;
  totalForks: number;
  languages: string[];
  yearsActive: number;
  topRepos: { name: string; stars: number; lang: string | null }[];
  avatarUrl: string;
}

export async function fetchGitHub(username: string): Promise<GitHubProfile> {
  const [userRes, reposRes] = await Promise.all([
    fetch("https://api.github.com/users/" + username),
    fetch("https://api.github.com/users/" + username + "/repos?per_page=100&sort=updated"),
  ]);
  if (!userRes.ok) throw new Error("GitHub user not found");
  const user = await userRes.json();
  const repos = (await reposRes.json()) as Record<string, unknown>[];

  const languages: Record<string, number> = {};
  let totalStars = 0;
  let totalForks = 0;
  for (const r of repos) {
    if (r.language) languages[r.language as string] = (languages[r.language as string] || 0) + 1;
    totalStars += (r.stargazers_count as number) || 0;
    totalForks += (r.forks_count as number) || 0;
  }
  const langList = Object.entries(languages).sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  const oldestRepo = repos.reduce<Record<string, unknown> | null>(
    (o, r) => (!o || new Date(r.created_at as string) < new Date(o.created_at as string) ? r : o),
    null,
  );
  const yearsActive = oldestRepo
    ? Math.max(1, Math.floor((Date.now() - new Date(oldestRepo.created_at as string).getTime()) / (365.25 * 86400000)))
    : 1;

  return {
    name: (user.name as string) || (user.login as string),
    login: user.login as string,
    bio: (user.bio as string) || "",
    company: (user.company as string) || "",
    followers: (user.followers as number) || 0,
    publicRepos: (user.public_repos as number) || 0,
    totalStars,
    totalForks,
    languages: langList,
    yearsActive,
    topRepos: repos.slice(0, 5).map((r) => ({
      name: r.name as string,
      stars: (r.stargazers_count as number) || 0,
      lang: (r.language as string | null) || null,
    })),
    avatarUrl: user.avatar_url as string,
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

const CLASS_MAP: Record<string, CharacterClass> = {
  JavaScript: "Frontend Sorcerer", TypeScript: "Fullstack Warlock", Python: "ML Alchemist",
  Java: "Backend Paladin", Go: "Cloud Architect", Rust: "Embedded Ranger",
  C: "Embedded Ranger", "C++": "Embedded Ranger", Ruby: "Backend Paladin",
  Swift: "Mobile Bard", Kotlin: "Mobile Bard", Shell: "DevOps Ranger",
  HCL: "DevOps Ranger", Dockerfile: "DevOps Ranger",
};

export function ghToCharacter(gh: GitHubProfile): CharacterSheet & { _github: { login: string; avatar: string } } {
  const stats = {
    STR: clamp(Math.floor(gh.publicRepos / 5) + 3, 1, 20),
    INT: clamp(gh.languages.length + 2, 1, 20),
    DEX: clamp(Math.floor(gh.languages.length * 1.5) + 1, 1, 20),
    CON: clamp(gh.yearsActive * 2, 1, 20),
    WIS: clamp(Math.floor(Math.log2(gh.totalStars + 1) * 2) + 3, 1, 20),
    CHA: clamp(Math.floor(Math.log2(gh.followers + 1) * 2) + 2, 1, 20),
  };
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const level = Math.min(99, Math.max(1, gh.yearsActive * 6 + Math.floor(gh.publicRepos / 3)));
  const rarity: Rarity = total > 90 ? "Legendary" : total > 75 ? "Epic" : total > 55 ? "Rare" : total > 40 ? "Uncommon" : "Common";
  const topLang = gh.languages[0] || "Code";
  const charClass: CharacterClass = CLASS_MAP[topLang] || "Fullstack Warlock";

  return {
    name: gh.name,
    title: "Open Source Developer",
    class: charClass,
    level,
    rarity,
    xp_current: gh.totalStars,
    xp_max: gh.totalStars + 500,
    stats,
    skills: gh.languages.slice(0, 8),
    inventory: gh.topRepos.map((r) => ({
      name: r.name + (r.stars > 0 ? " ★" + r.stars : ""),
      type: (r.stars > 50 ? "artifact" : r.stars > 10 ? "weapon" : "scroll") as "artifact" | "weapon" | "scroll",
      rarity: (r.stars > 100 ? "legendary" : r.stars > 50 ? "epic" : r.stars > 10 ? "rare" : "common") as "legendary" | "epic" | "rare" | "common",
    })),
    quests_completed: [
      { name: "The " + gh.publicRepos + " Repos Crusade", description: "Created " + gh.publicRepos + " public repositories" },
      { name: "Gathering of " + gh.followers + " Followers", description: "Built a community of " + gh.followers + " followers" },
    ],
    boss_battles: gh.yearsActive > 5 ? [{ name: "The " + gh.yearsActive + "-Year Endurance", status: "defeated" as const }] : [],
    guild: gh.company || "Open Source",
    backstory: gh.bio || "A wandering coder who speaks the tongue of " + topLang + ".",
    tagline: "Level " + level + " " + topLang + " Wielder",
    _github: { login: gh.login, avatar: gh.avatarUrl },
  };
}
