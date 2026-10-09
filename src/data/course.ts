import "server-only";
import { cache } from "react";
import type { JSONContent } from "@tiptap/core";
import { prisma } from "@/lib/prisma";
import type { CourseShape } from "@/lib/progress";

export type OutlineItem = { id: string; title: string; type: "VIDEO" | "DOCUMENT" };
export type OutlineModule = { id: string; title: string; description: string | null; items: OutlineItem[] };
export type FlatItem = OutlineItem & { moduleId: string; moduleIndex: number };
export type ContentItemFull = {
  id: string;
  moduleId: string;
  type: "VIDEO" | "DOCUMENT";
  title: string;
  body: JSONContent | null;
  youtubeId: string | null;
  pdfKey: string | null;
  pdfName: string | null;
  pdfSize: number | null;
  notifiedAt: Date | null;
};

export const getCourseOutline = cache(async (): Promise<OutlineModule[]> => {
  return prisma.module.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      items: { orderBy: { position: "asc" }, select: { id: true, title: true, type: true } },
    },
  });
});

export function toCourseShape(outline: OutlineModule[]): CourseShape {
  return { modules: outline.map((m) => ({ id: m.id, itemIds: m.items.map((i) => i.id) })) };
}

export function flattenOutline(outline: OutlineModule[]): FlatItem[] {
  return outline.flatMap((m, moduleIndex) => m.items.map((i) => ({ ...i, moduleId: m.id, moduleIndex })));
}

export async function getCompletedItemIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.contentProgress.findMany({ where: { userId }, select: { contentItemId: true } });
  return new Set(rows.map((r) => r.contentItemId));
}

export async function getContentItem(id: string): Promise<ContentItemFull | null> {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  return item ? { ...item, body: item.body as JSONContent | null } : null;
}
