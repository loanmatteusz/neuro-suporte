import { describe, expect, test } from "vitest";
import { planItemReorder, planModuleReorder } from "./reorder";

describe("planModuleReorder", () => {
  test("nova ordem completa", () => {
    expect(planModuleReorder(["a", "b", "c"], ["c", "a", "b"])).toEqual({
      ok: true,
      updates: [{ id: "c", position: 0 }, { id: "a", position: 1 }, { id: "b", position: 2 }],
    });
  });
  test.each([
    [["a", "b"], "faltando"],
    [["a", "b", "c", "d"], "a mais"],
    [["a", "a", "b"], "duplicado"],
  ])("rejeita lista %j (%s)", (ordered) => {
    expect(planModuleReorder(["a", "b", "c"], ordered).ok).toBe(false);
  });
});

describe("planItemReorder", () => {
  const current = [
    { id: "i1", moduleId: "m1" },
    { id: "i2", moduleId: "m1" },
    { id: "i3", moduleId: "m2" },
    { id: "i4", moduleId: "m3" },
  ];
  const modules = ["m1", "m2", "m3"];

  test("reordena dentro do mesmo módulo", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "m1", orderedItemIds: ["i2", "i1"] }])).toEqual({
      ok: true,
      updates: [
        { id: "i2", moduleId: "m1", position: 0 },
        { id: "i1", moduleId: "m1", position: 1 },
      ],
    });
  });

  test("move entre módulos (origem e destino)", () => {
    const r = planItemReorder(current, modules, [
      { moduleId: "m1", orderedItemIds: ["i2"] },
      { moduleId: "m2", orderedItemIds: ["i3", "i1"] },
    ]);
    expect(r).toEqual({
      ok: true,
      updates: [
        { id: "i2", moduleId: "m1", position: 0 },
        { id: "i3", moduleId: "m2", position: 0 },
        { id: "i1", moduleId: "m2", position: 1 },
      ],
    });
  });

  test("módulo esvaziado é válido", () => {
    const r = planItemReorder(current, modules, [
      { moduleId: "m2", orderedItemIds: [] },
      { moduleId: "m3", orderedItemIds: ["i4", "i3"] },
    ]);
    expect(r.ok).toBe(true);
  });

  test("item omitido (perderia o conteúdo) é rejeitado", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "m1", orderedItemIds: ["i1"] }]).ok).toBe(false);
  });
  test("item inexistente é rejeitado", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "m1", orderedItemIds: ["i1", "i2", "x"] }]).ok).toBe(false);
  });
  test("item de módulo não informado é rejeitado (payload obsoleto)", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "m1", orderedItemIds: ["i1", "i2", "i4"] }]).ok).toBe(false);
  });
  test("item duplicado em dois módulos é rejeitado", () => {
    const r = planItemReorder(current, modules, [
      { moduleId: "m1", orderedItemIds: ["i1", "i2"] },
      { moduleId: "m2", orderedItemIds: ["i3", "i1"] },
    ]);
    expect(r.ok).toBe(false);
  });
  test("módulo inexistente é rejeitado", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "mX", orderedItemIds: [] }]).ok).toBe(false);
  });
  test("módulo repetido nas mudanças é rejeitado", () => {
    const r = planItemReorder(current, modules, [
      { moduleId: "m1", orderedItemIds: ["i1"] },
      { moduleId: "m1", orderedItemIds: ["i2"] },
    ]);
    expect(r.ok).toBe(false);
  });
});
