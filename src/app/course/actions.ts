"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function setItemCompleted(itemId: string, completed: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ itemId: z.uuid(), completed: z.boolean() }).safeParse({ itemId, completed });
  if (!parsed.success) return fail("Conteúdo inválido.");

  const exists = await prisma.contentItem.count({ where: { id: itemId } });
  if (!exists) return fail("Este conteúdo não existe mais.");

  if (completed) {
    await prisma.contentProgress.upsert({
      where: { userId_contentItemId: { userId: user.id, contentItemId: itemId } },
      update: {},
      create: { userId: user.id, contentItemId: itemId },
    });
  } else {
    await prisma.contentProgress.deleteMany({ where: { userId: user.id, contentItemId: itemId } });
  }
  revalidatePath("/course", "layout");
  return ok();
}
