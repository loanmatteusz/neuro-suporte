import { expect, test } from "vitest";
import { LOGIN_ERROR_MESSAGES, loginGate } from "./login-gate";

test("e-mail sem usuário → NOT_INVITED", () => expect(loginGate(null)).toBe("NOT_INVITED"));
test("usuário desativado → ACCESS_DISABLED", () => expect(loginGate({ banned: true })).toBe("ACCESS_DISABLED"));
test("usuário ativo → ok", () => {
  expect(loginGate({ banned: false })).toBe("ok");
  expect(loginGate({ banned: null })).toBe("ok");
});
test("mensagens gentis existem para todos os códigos", () => {
  expect(LOGIN_ERROR_MESSAGES.NOT_INVITED).toMatch(/ainda não tem acesso/);
  expect(LOGIN_ERROR_MESSAGES.ACCESS_DISABLED).toMatch(/pausado/);
  expect(LOGIN_ERROR_MESSAGES.BANNED_USER).toBe(LOGIN_ERROR_MESSAGES.ACCESS_DISABLED);
});
