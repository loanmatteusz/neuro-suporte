export type CourseShape = { modules: { id: string; itemIds: string[] }[] };
export type ProgressStat = { done: number; total: number; percent: number; complete: boolean };
export type CourseProgress = { overall: ProgressStat; modules: Record<string, ProgressStat> };
export type ProgressAggregate = {
  participants: number;
  averagePercent: number;
  moduleAverages: Record<string, number>;
};

function stat(done: number, total: number): ProgressStat {
  if (total === 0) return { done: 0, total: 0, percent: 0, complete: false };
  const complete = done === total;
  const raw = (done / total) * 100;
  // 100% só quando completo; >0% quando há algo concluído.
  const percent = complete ? 100 : Math.min(99, Math.max(done > 0 ? 1 : 0, Math.round(raw)));
  return { done, total, percent, complete };
}

export function computeProgress(shape: CourseShape, completed: ReadonlySet<string>): CourseProgress {
  const modules: Record<string, ProgressStat> = {};
  let done = 0;
  let total = 0;
  for (const m of shape.modules) {
    const d = m.itemIds.filter((id) => completed.has(id)).length;
    modules[m.id] = stat(d, m.itemIds.length);
    done += d;
    total += m.itemIds.length;
  }
  return { overall: stat(done, total), modules };
}

export function aggregateProgress(
  shape: CourseShape,
  completedByUser: ReadonlyMap<string, ReadonlySet<string>>,
  userIds: string[],
): ProgressAggregate {
  const moduleSums: Record<string, number> = Object.fromEntries(shape.modules.map((m) => [m.id, 0]));
  let overallSum = 0;
  const empty = new Set<string>();
  for (const userId of userIds) {
    const p = computeProgress(shape, completedByUser.get(userId) ?? empty);
    overallSum += p.overall.percent;
    for (const m of shape.modules) moduleSums[m.id] += p.modules[m.id].percent;
  }
  const n = userIds.length;
  const avg = (sum: number) => (n === 0 ? 0 : Math.round(sum / n));
  return {
    participants: n,
    averagePercent: avg(overallSum),
    moduleAverages: Object.fromEntries(Object.entries(moduleSums).map(([id, s]) => [id, avg(s)])),
  };
}
