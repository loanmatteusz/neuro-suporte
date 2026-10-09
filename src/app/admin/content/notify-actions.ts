"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { getSiteSettings } from "@/data/settings";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { sendMail } from "@/lib/email";
import { newContentEmail } from "@/lib/email-templates";
import { env } from "@/lib/env";
import { errorSummary } from "@/lib/log-safe";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const activeParticipants = { role: "participant", OR: [{ banned: false }, { banned: null }] };

export async function countActiveParticipants(): Promise<number> {
  await requireAdmin();
  return prisma.user.count({ where: activeParticipants });
}

export async function notifyParticipants(itemId: string): Promise<ActionResult<{ sent: number; failed: number }>> {
  await requireAdmin();
  if (!z.uuid().safeParse(itemId).success) return fail("Conteúdo inválido.");
  const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { id: true, title: true } });
  if (!item) return fail("Este conteúdo não existe mais.");

  const [users, settings] = await Promise.all([
    prisma.user.findMany({ where: activeParticipants, select: { email: true, name: true } }),
    getSiteSettings(),
  ]);
  const url = `${env.BETTER_AUTH_URL}/course/${item.id}`;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < users.length; i += siteConfig.notifyBatchSize) {
    const batch = users.slice(i, i + siteConfig.notifyBatchSize);
    const results = await Promise.allSettled(
      batch.map((u) => sendMail({ to: u.email, ...newContentEmail({ name: u.name, title: item.title, url, psychologistName: settings.psychologistName }) })),
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("[notify] falha no envio", errorSummary(r.reason));
      }
    }
    if (i + siteConfig.notifyBatchSize < users.length) await new Promise((res) => setTimeout(res, 1000));
  }
  if (sent > 0) await prisma.contentItem.update({ where: { id: item.id }, data: { notifiedAt: new Date() } });
  revalidatePath(`/admin/content/${item.id}`);
  return ok({ sent, failed });
}
