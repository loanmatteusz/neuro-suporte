import { describe, expect, test } from "vitest";
import { errorSummary } from "./log-safe";

describe("errorSummary", () => {
  test("não inclui a mensagem, que pode trazer o e-mail do destinatário", () => {
    const e = Object.assign(new Error("550 5.1.1 <pai@example.com> user unknown"), { code: "EENVELOPE" });
    const s = errorSummary(e);
    expect(s).toEqual({ name: "Error", code: "EENVELOPE" });
    expect(JSON.stringify(s)).not.toContain("example.com");
  });

  test("sem código: só o nome", () => {
    expect(errorSummary(new TypeError("falhou"))).toEqual({ name: "TypeError" });
  });

  test("valores que não são Error não vazam conteúdo", () => {
    expect(errorSummary(null)).toEqual({ name: "object" });
    expect(errorSummary("pai@example.com")).toEqual({ name: "string" });
  });
});
