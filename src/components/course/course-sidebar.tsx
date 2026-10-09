"use client";

import Link from "next/link";
import { CheckCircle2, FileText, ListTree, PlayCircle } from "lucide-react";
import { ModuleMarker } from "@/components/brand/module-marker";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { moduleColor } from "@/lib/module-colors";
import { cn } from "@/lib/utils";

type Outline = { id: string; title: string; items: { id: string; title: string; type: "VIDEO" | "DOCUMENT" }[] }[];

function Tree({ outline, currentId, completedIds }: { outline: Outline; currentId: string; completedIds: string[] }) {
  const done = new Set(completedIds);
  return (
    <nav aria-label="Conteúdos do curso">
      <ol className="space-y-6">
        {outline.map((m, mi) => (
          <li key={m.id}>
            <div className="flex items-center gap-2">
              <ModuleMarker color={moduleColor(mi)} size="sm" done={m.items.length > 0 && m.items.every((i) => done.has(i.id))} />
              <p className="font-heading font-bold">{m.title}</p>
            </div>
            <ol className="mt-2 space-y-1">
              {m.items.map((it) => {
                const Icon = done.has(it.id) ? CheckCircle2 : it.type === "VIDEO" ? PlayCircle : FileText;
                const current = it.id === currentId;
                return (
                  <li key={it.id}>
                    <Link
                      href={`/course/${it.id}`}
                      aria-current={current ? "page" : undefined}
                      className={cn("flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted", current && "bg-primary-soft font-bold text-accent-foreground")}
                    >
                      <Icon className={cn("size-4 shrink-0", done.has(it.id) ? "text-primary" : "text-muted-foreground")} aria-hidden />
                      <span className="sr-only">{done.has(it.id) ? "Concluído: " : it.type === "VIDEO" ? "Vídeo: " : "Documento: "}</span>
                      <span>{it.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CourseSidebar(props: { outline: Outline; currentId: string; completedIds: string[] }) {
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2">
          <Tree {...props} />
        </div>
      </aside>
      <div className="lg:hidden">
        <Drawer>
          <DrawerTrigger className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-surface px-4 text-sm font-bold">
            <ListTree className="size-4" aria-hidden /> Ver todos os conteúdos
          </DrawerTrigger>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle>Conteúdos do curso</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-8">
              <Tree {...props} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
