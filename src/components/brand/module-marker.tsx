import { Check } from "lucide-react";
import { MODULE_COLOR_CLASSES, type ModuleColor } from "@/lib/module-colors";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-5 rounded-md", md: "size-8 rounded-lg", lg: "size-12 rounded-xl" };

export function ModuleMarker({ color, size = "md", done = false }: { color: ModuleColor; size?: "sm" | "md" | "lg"; done?: boolean }) {
  const c = MODULE_COLOR_CLASSES[color];
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center", SIZES[size], done ? c.fill : c.soft)}>
      {done && <Check className="size-3/5 text-white" strokeWidth={3} />}
    </span>
  );
}
