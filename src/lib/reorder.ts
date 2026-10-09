export type ItemPlacement = { id: string; moduleId: string };
export type ItemReorderChange = { moduleId: string; orderedItemIds: string[] };
export type PlanResult<T> = { ok: true; updates: T[] } | { ok: false; error: string };

const STALE = "A lista mudou enquanto você organizava. Recarregue a página e tente de novo.";

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return s.size === a.length && b.every((x) => s.has(x));
}

export function planModuleReorder(currentIds: string[], orderedIds: string[]): PlanResult<{ id: string; position: number }> {
  if (!sameSet(currentIds, orderedIds) || new Set(orderedIds).size !== orderedIds.length) return { ok: false, error: STALE };
  return { ok: true, updates: orderedIds.map((id, position) => ({ id, position })) };
}

export function planItemReorder(
  current: ItemPlacement[],
  moduleIds: string[],
  changes: ItemReorderChange[],
): PlanResult<{ id: string; moduleId: string; position: number }> {
  const known = new Set(moduleIds);
  const affected = changes.map((c) => c.moduleId);
  if (affected.some((m) => !known.has(m)) || new Set(affected).size !== affected.length) return { ok: false, error: STALE };

  const affectedSet = new Set(affected);
  const before = current.filter((i) => affectedSet.has(i.moduleId)).map((i) => i.id);
  const after = changes.flatMap((c) => c.orderedItemIds);
  if (new Set(after).size !== after.length || !sameSet(before, after)) return { ok: false, error: STALE };

  return {
    ok: true,
    updates: changes.flatMap((c) => c.orderedItemIds.map((id, position) => ({ id, moduleId: c.moduleId, position }))),
  };
}
