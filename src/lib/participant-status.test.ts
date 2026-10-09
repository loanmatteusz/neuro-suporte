import { expect, test } from "vitest";
import { participantStatus } from "./participant-status";

const now = new Date("2026-10-20T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

test("desativado tem prioridade", () => expect(participantStatus({ banned: true, lastSeenAt: daysAgo(1) }, now, 14)).toBe("disabled"));
test("nunca acessou", () => expect(participantStatus({ banned: false, lastSeenAt: null }, now, 14)).toBe("never"));
test("inativo a partir de 14 dias", () => {
  expect(participantStatus({ banned: null, lastSeenAt: daysAgo(14) }, now, 14)).toBe("inactive");
  expect(participantStatus({ banned: null, lastSeenAt: daysAgo(13.9) }, now, 14)).toBe("active");
});
