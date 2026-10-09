import { describe, expect, test } from "vitest";
import { assertLocalDatabase, describeDatabase, isLocalDatabaseUrl } from "./db-guard";

describe("isLocalDatabaseUrl", () => {
  test.each([
    "postgresql://neuro:neuro@localhost:5432/neuro",
    "postgres://u:p@127.0.0.1/neuro",
    "postgresql://u:p@[::1]:5432/neuro",
  ])("local: %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(true));

  test.each([
    "postgresql://u:p@ep-cool-123.sa-east-1.aws.neon.tech/neondb?sslmode=require",
    "postgresql://u:p@10.0.0.5:5432/db",
    "postgresql://u:p@localhost.evil.com/db",
  ])("remoto: %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(false));

  test.each([
    "postgresql://u:p@localhost/db?host=ep-x.neon.tech",
    "postgresql://u:p@localhost/db?hostaddr=10.0.0.5",
    "postgresql://u:p@localhost/db?host=localhost&hostaddr=10.0.0.5",
  ])("remoto via query string: %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(false));

  test.each([
    "postgresql://u:p@localhost/db?host=localhost",
    "postgresql://u:p@localhost/db?host=/var/run/postgresql",
  ])("local via query string: %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(true));

  test("URL inválida lança erro", () => {
    expect(() => isLocalDatabaseUrl("não é url")).toThrow();
  });
});

test("describeDatabase mostra host e banco, sem senha", () => {
  const d = describeDatabase("postgresql://user:segredo@ep-x.neon.tech:5432/neondb?sslmode=require");
  expect(d).toBe("ep-x.neon.tech:5432/neondb");
  expect(d).not.toContain("segredo");
});

describe("assertLocalDatabase", () => {
  test("passa em banco local", () => {
    expect(() => assertLocalDatabase("postgresql://a:b@localhost/db")).not.toThrow();
  });
  test("recusa banco remoto com mensagem clara", () => {
    expect(() => assertLocalDatabase("postgresql://a:b@ep-x.neon.tech/db")).toThrow(/banco remoto/i);
  });
  test("URL inválida gera mensagem em pt-BR", () => {
    expect(() => assertLocalDatabase("não é url")).toThrow(/inválida/);
  });
  test("recusa DATABASE_URL ausente", () => {
    expect(() => assertLocalDatabase(undefined)).toThrow(/DATABASE_URL/);
  });
});
