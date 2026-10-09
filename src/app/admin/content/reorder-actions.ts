"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { planItemReorder, planModuleReorder, type ItemReorderChange } from "@/lib/reorder";
import { requireAdmin } from "@/lib/session";

const idList = z.array(z.uuid()).max(500);
const changesSchema = z.array(z.object({ moduleId: z.uuid(), orderedItemIds: idList })).min(1).max(2);

function refresh() {
  revalidatePath("/course", "layout");
  revalidatePath("/admin", "layout");
}

export async function reorderModules(orderedIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  if (!idList.safeParse(orderedIds).success) return fail("Ordem inválida.");
  const current = await prisma.module.findMany({ select: { id: true } });
  const plan = planModuleReorder(current.map((m) => m.id), orderedIds);
  if (!plan.ok) return fail(plan.error);
  await prisma.$transaction(plan.updates.map((u) => prisma.module.update({ where: { id: u.id }, data: { position: u.position } })));
  refresh();
  return ok();
}

export async function reorderItems(changes: ItemReorderChange[]): Promise<ActionResult> {
  await requireAdmin();
  if (!changesSchema.safeParse(changes).success) return fail("Ordem inválida.");
  return prisma.$transaction(async (tx) => {
    const [items, modules] = await Promise.all([
      tx.contentItem.findMany({ select: { id: true, moduleId: true } }),
      tx.module.findMany({ select: { id: true } }),
    ]);
    const plan = planItemReorder(items, modules.map((m) => m.id), changes);
    if (!plan.ok) return fail(plan.error);
    for (const u of plan.updates) {
      await tx.contentItem.update({ where: { id: u.id }, data: { moduleId: u.moduleId, position: u.position } });
    }
    refresh();
    return ok();
  });
}
