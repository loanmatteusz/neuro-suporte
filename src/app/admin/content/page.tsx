import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ModuleDialog } from "@/components/admin/module-dialog";
import { getCourseOutline } from "@/data/course";
import { ContentTree } from "./_components/content-tree";

export const metadata: Metadata = { title: "Conteúdo" };

export default async function AdminContentPage() {
  const outline = await getCourseOutline();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Conteúdo do curso</h1>
          <p className="text-muted-foreground">Crie módulos e adicione aulas e documentos. Arraste para mudar a ordem.</p>
        </div>
        <ModuleDialog
          trigger={<button type="button" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground"><Plus className="size-4" aria-hidden /> Novo módulo</button>}
        />
      </div>
      {outline.length === 0 ? (
        <p className="rounded-card border border-dashed p-8 text-center text-muted-foreground">Comece criando o primeiro módulo do curso.</p>
      ) : (
        <ContentTree modules={outline} />
      )}
    </div>
  );
}
