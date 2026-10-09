"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { checkUploadedObject } from "@/lib/pdf-upload";
import { prisma } from "@/lib/prisma";
import { deleteObject, headObject } from "@/lib/s3";
import { requireAdmin } from "@/lib/session";
import {
  contentItemInputSchema, fieldErrorsOf, moduleInputSchema,
  type ContentItemInput, type ModuleInput,
} from "@/lib/validations";

const idSchema = z.uuid();

function refresh() {
  revalidatePath("/course", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/");
}

async function reindexItems(tx: Prisma.TransactionClient, moduleId: string) {
  const items = await tx.contentItem.findMany({ where: { moduleId }, orderBy: { position: "asc" }, select: { id: true } });
  await Promise.all(items.map((it, position) => tx.contentItem.update({ where: { id: it.id }, data: { position } })));
}

async function reindexModules(tx: Prisma.TransactionClient) {
  const mods = await tx.module.findMany({ orderBy: { position: "asc" }, select: { id: true } });
  await Promise.all(mods.map((m, position) => tx.module.update({ where: { id: m.id }, data: { position } })));
}

export async function createModule(input: ModuleInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = moduleInputSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os campos.", fieldErrorsOf(parsed.error));
  const position = await prisma.module.count();
  const m = await prisma.module.create({ data: { ...parsed.data, position } });
  refresh();
  return ok({ id: m.id });
}

export async function updateModule(id: string, input: ModuleInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = moduleInputSchema.safeParse(input);
  if (!idSchema.safeParse(id).success) return fail("Módulo inválido.");
  if (!parsed.success) return fail("Confira os campos.", fieldErrorsOf(parsed.error));
  const r = await prisma.module.updateMany({ where: { id }, data: parsed.data });
  if (r.count === 0) return fail("Este módulo não existe mais.");
  refresh();
  return ok();
}

export async function deleteModule(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Módulo inválido.");
  const pdfKeys = (await prisma.contentItem.findMany({ where: { moduleId: id, pdfKey: { not: null } }, select: { pdfKey: true } }))
    .map((i) => i.pdfKey!);
  await prisma.$transaction(async (tx) => {
    await tx.module.deleteMany({ where: { id } });
    await reindexModules(tx);
  });
  await Promise.all(pdfKeys.map(deleteObject));
  refresh();
  return ok();
}

type ValidatedItem =
  | { error: ActionResult<never> }
  | { error?: undefined; moduleId: string; data: Omit<Prisma.ContentItemUncheckedCreateInput, "moduleId" | "position"> };

async function validateItem(input: ContentItemInput): Promise<ValidatedItem> {
  const parsed = contentItemInputSchema.safeParse(input);
  if (!parsed.success) return { error: fail("Confira os campos.", fieldErrorsOf(parsed.error)) };
  const v = parsed.data;
  if (!(await prisma.module.count({ where: { id: v.moduleId } }))) return { error: fail("O módulo não existe mais.") };
  if (v.type === "DOCUMENT" && v.pdf) {
    const problem = checkUploadedObject(await headObject(v.pdf.key), "pdf");
    if (problem) return { error: fail(problem, { pdf: [problem] }) };
  }
  const data = {
    type: v.type,
    title: v.title,
    // Sem corpo => undefined: o Prisma ignora o campo, então ele nunca é limpo (comportamento mantido).
    body: (v.body ?? undefined) as Prisma.InputJsonValue | undefined,
    youtubeId: v.type === "VIDEO" ? v.youtubeUrl : null,
    pdfKey: v.type === "DOCUMENT" ? (v.pdf?.key ?? null) : null,
    pdfName: v.type === "DOCUMENT" ? (v.pdf?.name ?? null) : null,
    pdfSize: v.type === "DOCUMENT" ? (v.pdf?.size ?? null) : null,
  };
  return { data, moduleId: v.moduleId };
}

export async function createContentItem(input: ContentItemInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const v = await validateItem(input);
  if (v.error) return v.error;
  const position = await prisma.contentItem.count({ where: { moduleId: v.moduleId } });
  const item = await prisma.contentItem.create({ data: { ...v.data, moduleId: v.moduleId, position } });
  refresh();
  return ok({ id: item.id });
}

export async function updateContentItem(id: string, input: ContentItemInput): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Conteúdo inválido.");
  const current = await prisma.contentItem.findUnique({ where: { id }, select: { pdfKey: true, moduleId: true, type: true } });
  if (!current) return fail("Este conteúdo não existe mais.");
  if (current.type !== input.type) return fail("Não é possível mudar o tipo de um conteúdo existente.");
  const v = await validateItem({ ...input, moduleId: current.moduleId });
  if (v.error) return v.error;
  await prisma.contentItem.update({ where: { id }, data: v.data });
  if (current.pdfKey && current.pdfKey !== v.data.pdfKey) await deleteObject(current.pdfKey);
  refresh();
  return ok();
}

export async function deleteContentItem(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Conteúdo inválido.");
  const current = await prisma.contentItem.findUnique({ where: { id }, select: { pdfKey: true, moduleId: true } });
  if (!current) return ok();
  await prisma.$transaction(async (tx) => {
    await tx.contentItem.delete({ where: { id } });
    await reindexItems(tx, current.moduleId);
  });
  if (current.pdfKey) await deleteObject(current.pdfKey);
  refresh();
  return ok();
}
