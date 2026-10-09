import { notFound } from "next/navigation";
import { getContentItem } from "@/data/course";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { NotifyButton } from "@/components/admin/notify-button";
import { ItemForm } from "../_components/item-form";
import { countActiveParticipants } from "../notify-actions";

export const maxDuration = 60; // envio do "Avisar participantes" (Task 16)

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const item = await getContentItem(id);
  if (!item) notFound();
  const mod = await prisma.module.findUnique({ where: { id: item.moduleId }, select: { title: true } });
  const recipients = await countActiveParticipants();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Editar {item.type === "VIDEO" ? "aula" : "documento"}</h1>
      <ItemForm
        mode="edit"
        id={item.id}
        moduleId={item.moduleId}
        moduleTitle={mod?.title ?? ""}
        type={item.type}
        initial={{
          title: item.title,
          youtubeId: item.youtubeId,
          body: item.body,
          pdf: item.pdfKey ? { key: item.pdfKey, name: item.pdfName ?? "arquivo.pdf", size: item.pdfSize ?? 0 } : null,
        }}
        extraActions={<NotifyButton itemId={item.id} notifiedAt={item.notifiedAt} recipients={recipients} />}
      />
    </div>
  );
}
