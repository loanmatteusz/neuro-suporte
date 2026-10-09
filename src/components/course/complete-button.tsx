"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { setItemCompleted } from "@/app/course/actions";
import { computeProgress, type CourseShape } from "@/lib/progress";
import { cn } from "@/lib/utils";

type Props = {
  itemId: string;
  initialCompleted: boolean;
  completedIds: string[];
  shape: CourseShape;
  moduleId: string;
  moduleTitle: string;
  nextModuleFirstItem: { id: string; moduleTitle: string } | null;
};

export function CompleteButton({ itemId, initialCompleted, completedIds, shape, moduleId, moduleTitle, nextModuleFirstItem }: Props) {
  const [completed, setOptimistic] = useOptimistic(initialCompleted);
  const [pending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState<"module" | "course" | null>(null);

  function toggle() {
    const next = !completed;
    startTransition(async () => {
      setOptimistic(next);
      if (next) {
        const after = new Set(completedIds);
        after.add(itemId);
        const p = computeProgress(shape, after);
        setCelebrate(p.overall.complete ? "course" : p.modules[moduleId]?.complete ? "module" : null);
      } else {
        setCelebrate(null);
      }
      const res = await setItemCompleted(itemId, next);
      if (!res.ok) {
        setCelebrate(null);
        toast.error("Não conseguimos salvar agora. Tente de novo em instantes.");
      }
    });
  }

  return (
    <>
      {celebrate && (
        <div role="status" className="rounded-card bg-primary-soft p-5 text-accent-foreground">
          {celebrate === "course" ? (
            <p className="font-bold">Você concluiu todo o curso. Que bonito o seu caminho até aqui — os conteúdos continuam disponíveis sempre que quiser.</p>
          ) : (
            <>
              <p className="font-bold">Você concluiu “{moduleTitle}”. Cada passo conta — siga no seu ritmo.</p>
              {nextModuleFirstItem && (
                <Link href={`/course/${nextModuleFirstItem.id}`} className="mt-2 inline-block font-bold underline underline-offset-4">
                  Ir para “{nextModuleFirstItem.moduleTitle}”
                </Link>
              )}
            </>
          )}
        </div>
      )}
      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={completed}
          disabled={pending}
          className={cn(
            "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-bold transition-colors lg:w-auto",
            completed ? "border border-primary bg-primary-soft text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {completed ? <Check className="size-5" aria-hidden /> : <Circle className="size-5" aria-hidden />}
          {completed ? "Concluído — toque para desmarcar" : "Marcar como concluído"}
        </button>
      </div>
    </>
  );
}
