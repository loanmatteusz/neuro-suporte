import "server-only";
import { cache } from "react";
import type { JSONContent } from "@tiptap/core";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/prisma";

export type SiteSettingsView = {
  courseTitle: string;
  courseSubtitle: string;
  aboutCourse: JSONContent;
  audience: JSONContent;
  learnings: JSONContent;
  psychologistName: string;
  crp: string;
  bio: JSONContent;
  approach: JSONContent;
  photoKey: string | null;
  contactUrl: string;
};

export const getSiteSettings = cache(async (): Promise<SiteSettingsView> => {
  // Não usar upsert: com requisições simultâneas (ex.: build) ele falha com P2002 na primeira criação.
  let row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) {
    await prisma.siteSettings.createMany({ data: { id: 1, ...siteConfig.defaults }, skipDuplicates: true });
    row = await prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  }
  return {
    courseTitle: row.courseTitle,
    courseSubtitle: row.courseSubtitle,
    aboutCourse: row.aboutCourse as JSONContent,
    audience: row.audience as JSONContent,
    learnings: row.learnings as JSONContent,
    psychologistName: row.psychologistName,
    crp: row.crp,
    bio: row.bio as JSONContent,
    approach: row.approach as JSONContent,
    photoKey: row.photoKey,
    contactUrl: row.contactUrl,
  };
});
