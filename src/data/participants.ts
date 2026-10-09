import "server-only";
import { siteConfig } from "@/config/site";
import { getCourseOutline, toCourseShape, type OutlineModule } from "@/data/course";
import { participantStatus, type ParticipantStatus } from "@/lib/participant-status";
import { prisma } from "@/lib/prisma";
import { aggregateProgress, computeProgress, type CourseProgress, type ProgressAggregate } from "@/lib/progress";

export type ParticipantRow = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  inviteSentAt: Date | null;
  banned: boolean;
  percent: number;
  status: ParticipantStatus;
};

const userSelect = { id: true, name: true, email: true, createdAt: true, lastSeenAt: true, inviteSentAt: true, banned: true } as const;

export async function listParticipants(): Promise<{ rows: ParticipantRow[]; aggregate: ProgressAggregate; outline: OutlineModule[] }> {
  const [outline, users, completions] = await Promise.all([
    getCourseOutline(),
    prisma.user.findMany({ where: { role: "participant" }, select: userSelect, orderBy: { name: "asc" } }),
    prisma.contentProgress.findMany({ where: { user: { role: "participant" } }, select: { userId: true, contentItemId: true } }),
  ]);
  const shape = toCourseShape(outline);
  const byUser = new Map<string, Set<string>>();
  for (const c of completions) {
    let s = byUser.get(c.userId);
    if (!s) byUser.set(c.userId, (s = new Set()));
    s.add(c.contentItemId);
  }
  const now = new Date();
  const rows = users.map((u) => ({
    ...u,
    banned: Boolean(u.banned),
    percent: computeProgress(shape, byUser.get(u.id) ?? new Set()).overall.percent,
    status: participantStatus(u, now, siteConfig.inactiveAfterDays),
  }));
  // Média só entre participantes ativos (não desativados).
  const counted = rows.filter((r) => !r.banned).map((r) => r.id);
  return { rows, aggregate: aggregateProgress(shape, byUser, counted), outline };
}

export async function getParticipantDetail(id: string) {
  const [user, outline, completions] = await Promise.all([
    prisma.user.findFirst({ where: { id, role: "participant" }, select: userSelect }),
    getCourseOutline(),
    prisma.contentProgress.findMany({ where: { userId: id }, select: { contentItemId: true, completedAt: true } }),
  ]);
  if (!user) return null;
  const completedAt = new Map(completions.map((c) => [c.contentItemId, c.completedAt]));
  const progress: CourseProgress = computeProgress(toCourseShape(outline), new Set(completedAt.keys()));
  const row: ParticipantRow = {
    ...user,
    banned: Boolean(user.banned),
    percent: progress.overall.percent,
    status: participantStatus(user, new Date(), siteConfig.inactiveAfterDays),
  };
  return { user: row, progress, outline, completedAt };
}
