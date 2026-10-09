"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function deleteMyAccount(): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role === "admin") return fail("Contas de administração não podem ser excluídas por aqui.");
  await prisma.$transaction([
    prisma.user.delete({ where: { id: user.id } }), // cascade: sessões, contas e progresso
    prisma.verification.deleteMany({ where: { identifier: { in: ["sign-in", "email-verification", "forget-password"].map((t) => `${t}-otp-${user.email.toLowerCase()}`) } } }), // OTPs pendentes (LGPD)
  ]);
  return ok();
}
