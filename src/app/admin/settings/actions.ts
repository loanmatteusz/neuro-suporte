"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { checkUploadedObject } from "@/lib/pdf-upload";
import { prisma } from "@/lib/prisma";
import { deleteObject, headObject } from "@/lib/s3";
import { requireAdmin } from "@/lib/session";
import { fieldErrorsOf, settingsInputSchema, type SettingsInput } from "@/lib/validations";

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os campos destacados.", fieldErrorsOf(parsed.error));
  const v = parsed.data;
  const current = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { photoKey: true } });
  if (v.photoKey && v.photoKey !== current?.photoKey) {
    const problem = checkUploadedObject(await headObject(v.photoKey), "image");
    if (problem) return fail(problem, { photoKey: [problem] });
  }
  const data = { ...v } as unknown as Prisma.SiteSettingsUpdateInput;
  await prisma.siteSettings.update({ where: { id: 1 }, data });
  if (current?.photoKey && current.photoKey !== v.photoKey) await deleteObject(current.photoKey);
  revalidatePath("/", "layout");
  return ok();
}
