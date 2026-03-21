import type { InventoryItem as IItem } from "@/types/character";

const TYPE_ICONS: Record<string, string> = {
  weapon: "⚔️",
  armor: "🛡️",
  artifact: "💎",
  scroll: "📜",
};

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export function InventoryItemRow({ item }: { item: IItem }) {
  const color = RARITY_COLORS[item.rarity] || "#9ca3af";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 4,
        border: `1px solid ${color}33`,
      }}
    >
      <span style={{ fontSize: 14 }}>{TYPE_ICONS[item.type] || "📦"}</span>
      <span
        style={{
          fontFamily: "'Silkscreen'",
          fontSize: 10,
          color,
          flex: 1,
          lineHeight: 1.3,
        }}
      >
        {item.name}
      </span>
    </div>
  );
}
