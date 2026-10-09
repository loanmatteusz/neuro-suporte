import { MODULE_COLOR_CLASSES, type ModuleColor } from "@/lib/module-colors";
import { cn } from "@/lib/utils";

export function ProgressBar({ percent, label, color = "primary" }: { percent: number; label: string; color?: ModuleColor | "primary" }) {
  const fill = color === "primary" ? "bg-primary" : MODULE_COLOR_CLASSES[color].fill;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${percent}%` }} />
    </div>
  );
}
