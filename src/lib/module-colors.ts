export const MODULE_COLORS = ["coral", "amber", "mint", "lavender", "pink"] as const;
export type ModuleColor = (typeof MODULE_COLORS)[number];

export function moduleColor(index: number): ModuleColor {
  return MODULE_COLORS[((index % MODULE_COLORS.length) + MODULE_COLORS.length) % MODULE_COLORS.length];
}

// Classes completas (o Tailwind só gera classes que aparecem literalmente no código).
export const MODULE_COLOR_CLASSES: Record<ModuleColor, { soft: string; strong: string; fill: string }> = {
  coral: { soft: "bg-coral-soft", strong: "text-coral", fill: "bg-coral" },
  amber: { soft: "bg-amber-soft", strong: "text-amber", fill: "bg-amber" },
  mint: { soft: "bg-mint-soft", strong: "text-mint", fill: "bg-mint" },
  lavender: { soft: "bg-lavender-soft", strong: "text-lavender", fill: "bg-lavender" },
  pink: { soft: "bg-pink-soft", strong: "text-pink", fill: "bg-pink" },
};
