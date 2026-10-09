import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Neuro Suporte"
      width={867}
      height={763}
      priority={priority}
      className={cn("h-10 w-auto", className)}
    />
  );
}
