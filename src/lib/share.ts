import type { CharacterSheet } from "@/types/character";

export function encodeShareData(c: CharacterSheet): string {
  const compact = {
    n: c.name,
    c: c.class,
    l: c.level,
    r: c.rarity,
    s: c.stats,
    sk: c.skills,
    t: c.tagline,
    g: c.guild,
    bs: c.backstory,
  };
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
  } catch {
    return "";
  }
}

export function getQRUrl(c: CharacterSheet): string {
  const shareUrl = "https://resumerpg.app/card#" + encodeShareData(c);
  return (
    "https://api.qrserver.com/v1/create-qr-code/?size=200x200&bgcolor=0c0c1d&color=e2e8f0&data=" +
    encodeURIComponent(shareUrl)
  );
}

export function shareCharacter(c: CharacterSheet) {
  const text = `I'm a Level ${c.level} ${c.class}! ${c.tagline || ""}\n\nGenerate your ResumeRPG character card`;
  if (navigator.share) {
    void navigator.share({ title: `${c.name} — ResumeRPG`, text });
  } else if (navigator.clipboard) {
    void navigator.clipboard
      .writeText(text)
      .then(() => alert("Copied to clipboard!"));
  }
}
