"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSiteSettings } from "@/data/settings";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { sendMail } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fieldErrorsOf, participantInputSchema, type ParticipantInput } from "@/lib/validations";

const idSchema = z.string().min(1).max(100);
const DUPLICATE = "Já existe uma pessoa cadastrada com este e-mail.";

function refresh() {
  revalidatePath("/admin", "layout");
}

async function sendInvite(user: { id: string; name: string; email: string }): Promise<boolean> {
  const settings = await getSiteSettings();
  const loginUrl = `${env.BETTER_AUTH_URL}/login?email=${encodeURIComponent(user.email)}`;
  try {
    await sendMail({ to: user.email, ...inviteEmail({ name: user.name, loginUrl, psychologistName: settings.psychologistName }) });
    await prisma.user.update({ where: { id: user.id }, data: { inviteSentAt: new Date() } });
    return true;
  } catch (e) {
    console.error("[invite] falha no envio", e);
    return false;
  }
}

async function findParticipant(id: string) {
  if (!idSchema.safeParse(id).success) return null;
  return prisma.user.findFirst({ where: { id, role: "participant" }, select: { id: true, name: true, email: true, banned: true } });
}

export async function inviteParticipant(input: ParticipantInput): Promise<ActionResult<{ id: string; emailSent: boolean }>> {
  await requireAdmin();
  const parsed = participantInputSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os campos.", fieldErrorsOf(parsed.error));
  if (await prisma.user.count({ where: { email: parsed.data.email } })) return fail(DUPLICATE, { email: [DUPLICATE] });
  const user = await prisma.user.create({
    data: { id: randomUUID(), ...parsed.data, role: "participant", emailVerified: false, banned: false },
    select: { id: true, name: true, email: true },
  });
  const emailSent = await sendInvite(user);
  refresh();
  return ok({ id: user.id, emailSent });
}

export async function resendInvite(id: string): Promise<ActionResult> {
  await requireAdmin();
  const user = await findParticipant(id);
  if (!user) return fail("Participante não encontrado.");
  if (user.banned) return fail("Reative o acesso antes de reenviar o convite.");
  if (!(await sendInvite(user))) return fail("Não conseguimos enviar o e-mail agora. Tente de novo em instantes.");
  refresh();
  return ok();
}

export async function updateParticipant(id: string, input: ParticipantInput): Promise<ActionResult> {
  await requireAdmin();
  const user = await findParticipant(id);
  if (!user) return fail("Participante não encontrado.");
  const parsed = participantInputSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os campos.", fieldErrorsOf(parsed.error));
  if (parsed.data.email !== user.email && (await prisma.user.count({ where: { email: parsed.data.email } }))) {
    return fail(DUPLICATE, { email: [DUPLICATE] });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { ...parsed.data, ...(parsed.data.email !== user.email ? { emailVerified: false } : {}) } }),
    // E-mail trocado: encerra sessões antigas por segurança.
    ...(parsed.data.email !== user.email ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
  ]);
  refresh();
  return ok();
}

export async function setParticipantActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  const user = await findParticipant(id);
  if (!user) return fail("Participante não encontrado.");
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { banned: !active, banReason: active ? null : "Desativado pela psicóloga" } }),
    ...(active ? [] : [prisma.session.deleteMany({ where: { userId: id } })]),
  ]);
  refresh();
  return ok();
}

export async function deleteParticipant(id: string): Promise<ActionResult> {
  await requireAdmin();
  const user = await findParticipant(id);
  if (!user) return fail("Participante não encontrado.");
  await prisma.user.delete({ where: { id } }); // cascade: sessões, contas, progresso
  refresh();
  return ok();
}
