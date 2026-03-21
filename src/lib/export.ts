import { CLASS_CONFIG, RARITY_CONFIG } from "@/lib/config";
import { getQRUrl } from "@/lib/share";
import type { CharacterSheet, StatBlock } from "@/types/character";

const STAT_NAMES: (keyof StatBlock)[] = ["STR", "INT", "DEX", "CON", "WIS", "CHA"];

function canvasRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

export async function exportTradingCard(character: CharacterSheet) {
  await document.fonts.ready;

  const W = 750;
  const H = 1050;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const cc = CLASS_CONFIG[character.class] || CLASS_CONFIG["Fullstack Warlock"];
  const rc = RARITY_CONFIG[character.rarity] || RARITY_CONFIG["Common"];

  const bg = ctx.createLinearGradient(0, 0, W * 0.3, H);
  bg.addColorStop(0, "#0f0f24");
  bg.addColorStop(0.5, "#111128");
  bg.addColorStop(1, "#0a0a1a");
  canvasRoundRect(ctx, 0, 0, W, H, 28);
  ctx.fillStyle = bg;
  ctx.fill();

  const glow = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, 400);
  glow.addColorStop(0, cc.color + "18");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.012)";
  for (let yy = 0; yy < H; yy += 4) ctx.fillRect(0, yy, W, 1);

  canvasRoundRect(ctx, 6, 6, W - 12, H - 12, 24);
  ctx.strokeStyle = rc.border;
  ctx.lineWidth = 4;
  ctx.stroke();

  canvasRoundRect(ctx, 14, 14, W - 28, H - 28, 20);
  ctx.strokeStyle = rc.border + "44";
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = 50;

  ctx.font = '16px "Press Start 2P"';
  ctx.fillStyle = rc.color;
  ctx.textAlign = "center";
  ctx.fillText("★  " + (character.rarity || "").toUpperCase() + "  ★", W / 2, y);
  y += 14;

  ctx.font = '11px "Press Start 2P"';
  ctx.fillStyle = "#334155";
  ctx.fillText("RESUME RPG", W / 2, y + 20);
  y += 48;

  ctx.font = "72px serif";
  ctx.textAlign = "center";
  ctx.fillText(cc.icon, W / 2, y + 60);
  y += 90;

  ctx.fillStyle = cc.color;
  canvasRoundRect(ctx, W / 2 - 44, y - 10, 88, 30, 6);
  ctx.fill();
  ctx.font = '13px "Press Start 2P"';
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("LV. " + character.level, W / 2, y + 10);
  y += 40;

  ctx.font = '700 28px "Silkscreen"';
  ctx.fillStyle = "#f1f5f9";
  ctx.textAlign = "center";
  const nm = character.name || "Unknown Hero";
  ctx.fillText(nm.length > 24 ? nm.slice(0, 22) + "..." : nm, W / 2, y);
  y += 28;

  ctx.font = '14px "Press Start 2P"';
  ctx.fillStyle = cc.color;
  ctx.fillText(character.class, W / 2, y);
  y += 20;

  if (character.guild) {
    ctx.font = '500 16px "DM Sans"';
    ctx.fillStyle = "#64748b";
    ctx.fillText("Guild: " + character.guild, W / 2, y + 4);
    y += 22;
  }

  if (character.tagline) {
    ctx.font = 'italic 15px "DM Sans"';
    ctx.fillStyle = "#94a3b8";
    ctx.fillText('"' + character.tagline + '"', W / 2, y + 8);
    y += 24;
  }

  y += 14;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, y);
  ctx.lineTo(W - 50, y);
  ctx.stroke();
  y += 20;

  ctx.font = '11px "Press Start 2P"';
  ctx.fillStyle = "#475569";
  ctx.textAlign = "left";
  ctx.fillText("ATTRIBUTES", 50, y);
  y += 22;

  const barX = 105;
  const barW = W - 210;
  const barH = 20;
  for (const stat of STAT_NAMES) {
    const val = character.stats[stat] || 0;
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "right";
    ctx.fillText(stat, barX - 12, y + 15);

    canvasRoundRect(ctx, barX, y, barW, barH, 3);
    ctx.fillStyle = "rgba(30,30,50,0.8)";
    ctx.fill();

    const fillW = (val / 20) * barW;
    if (fillW > 0) {
      canvasRoundRect(ctx, barX, y, fillW, barH, 3);
      const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      barGrad.addColorStop(0, cc.color + "cc");
      barGrad.addColorStop(1, cc.color);
      ctx.fillStyle = barGrad;
      ctx.fill();

      canvasRoundRect(ctx, barX, y, fillW, barH * 0.4, 3);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fill();
    }

    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = cc.color;
    ctx.textAlign = "left";
    ctx.fillText(String(val), barX + barW + 14, y + 15);
    y += barH + 8;
  }

  y += 10;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(50, y);
  ctx.lineTo(W - 50, y);
  ctx.stroke();
  y += 18;

  ctx.font = '11px "Press Start 2P"';
  ctx.fillStyle = "#475569";
  ctx.textAlign = "left";
  ctx.fillText("SKILL TREE", 50, y);
  y += 22;

  ctx.font = '13px "Silkscreen"';
  let sx = 50;
  for (const skill of character.skills) {
    const tw = ctx.measureText(skill).width + 24;
    if (sx + tw > W - 50) {
      sx = 50;
      y += 32;
    }
    canvasRoundRect(ctx, sx, y - 15, tw, 26, 5);
    ctx.fillStyle = cc.color + "20";
    ctx.fill();
    ctx.strokeStyle = cc.color + "55";
    ctx.lineWidth = 1;
    canvasRoundRect(ctx, sx, y - 15, tw, 26, 5);
    ctx.stroke();
    ctx.fillStyle = cc.color;
    ctx.textAlign = "left";
    ctx.fillText(skill, sx + 12, y + 1);
    sx += tw + 8;
  }
  y += 32;

  const qrSize = 100;
  const qrY = H - qrSize - 55;
  try {
    const qrImg = await loadImage(getQRUrl(character));
    canvasRoundRect(ctx, W / 2 - qrSize / 2 - 6, qrY - 6, qrSize + 12, qrSize + 12, 8);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.drawImage(qrImg, W / 2 - qrSize / 2, qrY, qrSize, qrSize);
  } catch {
    canvasRoundRect(ctx, W / 2 - qrSize / 2, qrY, qrSize, qrSize, 6);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.fillText("QR CODE", W / 2, qrY + qrSize / 2 + 4);
  }

  ctx.font = '11px "DM Sans"';
  ctx.fillStyle = "#334155";
  ctx.textAlign = "center";
  ctx.fillText("resumerpg.app  •  Scan to view interactive card", W / 2, qrY + qrSize + 20);

  const link = document.createElement("a");
  link.download =
    (character.name || "character").replace(/\s+/g, "-").toLowerCase() +
    "-resumerpg.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
