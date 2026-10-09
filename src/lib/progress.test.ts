import { describe, expect, test } from "vitest";
import { aggregateProgress, computeProgress, type CourseShape } from "./progress";

const shape: CourseShape = {
  modules: [
    { id: "m1", itemIds: ["a", "b"] },
    { id: "m2", itemIds: ["c", "d", "e", "f"] },
    { id: "m3", itemIds: [] },
  ],
};

describe("computeProgress", () => {
  test("curso vazio: 0% e não concluído, sem NaN", () => {
    const p = computeProgress({ modules: [] }, new Set());
    expect(p.overall).toEqual({ done: 0, total: 0, percent: 0, complete: false });
  });

  test("módulo vazio: 0% e não concluído", () => {
    const p = computeProgress(shape, new Set(["a", "b"]));
    expect(p.modules.m3).toEqual({ done: 0, total: 0, percent: 0, complete: false });
  });

  test("por módulo e geral com pesos iguais por conteúdo", () => {
    const p = computeProgress(shape, new Set(["a", "b", "c"]));
    expect(p.modules.m1).toEqual({ done: 2, total: 2, percent: 100, complete: true });
    expect(p.modules.m2).toEqual({ done: 1, total: 4, percent: 25, complete: false });
    expect(p.overall).toEqual({ done: 3, total: 6, percent: 50, complete: false });
  });

  test("conclusões de itens que não existem mais são ignoradas", () => {
    const p = computeProgress(shape, new Set(["a", "excluido"]));
    expect(p.overall.done).toBe(1);
  });

  test("item movido de módulo conta no módulo novo", () => {
    const moved: CourseShape = { modules: [{ id: "m1", itemIds: ["a"] }, { id: "m2", itemIds: ["b"] }] };
    const p = computeProgress(moved, new Set(["b"]));
    expect(p.modules.m1.done).toBe(0);
    expect(p.modules.m2.done).toBe(1);
  });

  test("tudo concluído = 100% e complete", () => {
    const p = computeProgress(shape, new Set(["a", "b", "c", "d", "e", "f"]));
    expect(p.overall).toEqual({ done: 6, total: 6, percent: 100, complete: true });
  });

  test("nunca mostra 100% sem estar completo (arredondamento)", () => {
    const big: CourseShape = { modules: [{ id: "m", itemIds: Array.from({ length: 300 }, (_, i) => `i${i}`) }] };
    const done = new Set(Array.from({ length: 299 }, (_, i) => `i${i}`));
    const p = computeProgress(big, done);
    expect(p.overall.complete).toBe(false);
    expect(p.overall.percent).toBe(99);
  });

  test("progresso mínimo não aparece como 0% quando há algo concluído", () => {
    const big: CourseShape = { modules: [{ id: "m", itemIds: Array.from({ length: 300 }, (_, i) => `i${i}`) }] };
    const p = computeProgress(big, new Set(["i0"]));
    expect(p.overall.percent).toBe(1);
  });
});

describe("aggregateProgress", () => {
  test("médias geral e por módulo entre participantes", () => {
    const byUser = new Map([
      ["u1", new Set(["a", "b", "c", "d", "e", "f"])],
      ["u2", new Set<string>()],
    ]);
    const agg = aggregateProgress(shape, byUser, ["u1", "u2"]);
    expect(agg).toEqual({
      participants: 2,
      averagePercent: 50,
      moduleAverages: { m1: 50, m2: 50, m3: 0 },
    });
  });

  test("usuário sem registro no mapa conta como 0%", () => {
    const agg = aggregateProgress(shape, new Map(), ["u1"]);
    expect(agg.averagePercent).toBe(0);
  });

  test("sem participantes: médias 0", () => {
    const agg = aggregateProgress(shape, new Map(), []);
    expect(agg).toEqual({ participants: 0, averagePercent: 0, moduleAverages: { m1: 0, m2: 0, m3: 0 } });
  });
});
