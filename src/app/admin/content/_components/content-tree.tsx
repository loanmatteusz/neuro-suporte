"use client";

import Link from "next/link";
import { FileText, Pencil, PlayCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteModule } from "@/app/admin/content/actions";
import { ModuleMarker } from "@/components/brand/module-marker";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ModuleDialog } from "@/components/admin/module-dialog";
import { TypeChooser } from "@/components/admin/type-chooser";
import { moduleColor } from "@/lib/module-colors";

export type TreeModule = {
  id: string;
  title: string;
  description: string | null;
  items: { id: string; title: string; type: "VIDEO" | "DOCUMENT" }[];
};

export function ModuleCard({ m, index, handle, children }: { m: TreeModule; index: number; handle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card border bg-surface p-4 sm:p-5" aria-labelledby={`mod-${m.id}`}>
      <div className="flex items-start gap-3">
        {handle}
        <ModuleMarker color={moduleColor(index)} />
        <div className="min-w-0 flex-1">
          <h2 id={`mod-${m.id}`} className="text-lg font-bold">{m.title}</h2>
          {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
        </div>
        <ModuleDialog
          module={m}
          trigger={<button type="button" aria-label={`Editar módulo ${m.title}`} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted"><Pencil className="size-4" /></button>}
        />
        <ConfirmDelete
          title={`Excluir o módulo “${m.title}”?`}
          description={`Os ${m.items.length} conteúdos dele também serão excluídos, e o progresso dos participantes nesses conteúdos deixa de contar. Isso não pode ser desfeito.`}
          onConfirm={async () => {
            const r = await deleteModule(m.id);
            if (r.ok) toast.success("Módulo excluído.");
            else toast.error(r.error);
          }}
          trigger={<button type="button" aria-label={`Excluir módulo ${m.title}`} className="inline-flex size-11 items-center justify-center rounded-lg text-destructive hover:bg-muted"><Trash2 className="size-4" /></button>}
        />
      </div>
      <div className="mt-4">{children}</div>
      <div className="mt-3">
        <TypeChooser moduleId={m.id} moduleTitle={m.title} />
      </div>
    </section>
  );
}

export function ItemRow({ item, handle }: { item: TreeModule["items"][number]; handle?: React.ReactNode }) {
  const Icon = item.type === "VIDEO" ? PlayCircle : FileText;
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-background px-2">
      {handle}
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">{item.type === "VIDEO" ? "Aula:" : "Documento:"}</span>
      <Link href={`/admin/content/${item.id}`} className="flex min-h-12 flex-1 items-center truncate hover:underline">
        {item.title}
      </Link>
    </div>
  );
}

export function ContentTree({ modules }: { modules: TreeModule[] }) {
  return (
    <div className="space-y-4">
      {modules.map((m, i) => (
        <ModuleCard key={m.id} m={m} index={i}>
          {m.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
          ) : (
            <ol className="space-y-2">
              {m.items.map((it) => (
                <li key={it.id}><ItemRow item={it} /></li>
              ))}
            </ol>
          )}
        </ModuleCard>
      ))}
    </div>
  );
}
