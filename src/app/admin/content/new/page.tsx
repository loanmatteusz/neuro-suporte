import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "../_components/item-form";

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ moduleId?: string; type?: string }> }) {
  const { moduleId, type } = await searchParams;
  if (!moduleId || (type !== "VIDEO" && type !== "DOCUMENT")) notFound();
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { id: true, title: true } }).catch(() => null);
  if (!mod) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{type === "VIDEO" ? "Nova aula" : "Novo documento"}</h1>
      <ItemForm mode="create" moduleId={mod.id} moduleTitle={mod.title} type={type} />
    </div>
  );
}
