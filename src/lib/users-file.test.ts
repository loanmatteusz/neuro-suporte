import { describe, expect, test } from "vitest";
import { diffUsers, parseUsersFile } from "./users-file";

const valid = [
  { email: "loan.matteusz@gmail.com", name: "Loan", role: "admin", active: true },
  { email: "  Maria@Exemplo.com ", name: "Maria", role: "participant", active: true },
];

describe("parseUsersFile", () => {
  test("válido e normaliza e-mail", () => {
    const r = parseUsersFile(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.users[1].email).toBe("maria@exemplo.com");
  });

  test("não é array", () => {
    const r = parseUsersFile({ users: [] });
    expect(r).toEqual({ ok: false, errors: ["O arquivo deve conter uma lista (array) de usuários."] });
  });

  test("e-mail inválido indica a posição", () => {
    const r = parseUsersFile([{ email: "sem-arroba", name: "X", role: "participant", active: true }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/^Item 1 \(email\):/);
  });

  test("role inválida", () => {
    const r = parseUsersFile([{ email: "a@b.com", name: "X", role: "root", active: true }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/Item 1 \(role\)/);
  });

  test("campo faltando", () => {
    const r = parseUsersFile([{ email: "a@b.com", role: "participant", active: true }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/Item 1 \(name\)/);
  });

  test("duplicado ignorando maiúsculas/espaços", () => {
    const r = parseUsersFile([
      { email: "ana@x.com", name: "Ana", role: "participant", active: true },
      { email: " ANA@x.com", name: "Ana 2", role: "participant", active: true },
    ]);
    expect(r).toEqual({ ok: false, errors: ['E-mail duplicado "ana@x.com" nos itens 1 e 2.'] });
  });
});

describe("diffUsers", () => {
  const entries = [
    { email: "a@x.com", name: "A", role: "participant" as const, active: true },
    { email: "b@x.com", name: "B novo", role: "admin" as const, active: false },
    { email: "c@x.com", name: "C", role: "participant" as const, active: true },
  ];

  test("classifica create, update (com campos) e unchanged", () => {
    const diff = diffUsers(entries, [
      { email: "b@x.com", name: "B", role: "participant", banned: false },
      { email: "c@x.com", name: "C", role: "participant", banned: false },
      { email: "z@x.com", name: "Só no banco", role: "participant", banned: false },
    ]);
    expect(diff.create.map((u) => u.email)).toEqual(["a@x.com"]);
    expect(diff.update).toEqual([{ entry: entries[1], changes: ["name", "role", "active"] }]);
    expect(diff.unchanged.map((u) => u.email)).toEqual(["c@x.com"]);
  });

  test("usuário só no banco não aparece em nenhuma lista (nunca é apagado)", () => {
    const diff = diffUsers([], [{ email: "z@x.com", name: "Z", role: "participant", banned: false }]);
    expect(diff).toEqual({ create: [], update: [], unchanged: [] });
  });

  test("banned null no banco equivale a ativo", () => {
    const diff = diffUsers([entries[2]], [{ email: "c@x.com", name: "C", role: "participant", banned: null }]);
    expect(diff.unchanged).toHaveLength(1);
  });
});
