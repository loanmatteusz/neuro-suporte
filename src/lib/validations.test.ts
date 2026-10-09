import { describe, expect, test } from "vitest";
import { contentItemInputSchema, moduleInputSchema, participantInputSchema, settingsInputSchema } from "./validations";

const M = "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

describe("moduleInputSchema", () => {
  test("título obrigatório com mensagem amigável", () => {
    const r = moduleInputSchema.safeParse({ title: "   " });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Dê um título ao módulo.");
  });
  test("descrição vazia vira null", () => {
    expect(moduleInputSchema.parse({ title: "M", description: "  " })).toEqual({ title: "M", description: null });
  });
});

describe("contentItemInputSchema", () => {
  test("aula exige link válido e devolve youtubeId", () => {
    const r = contentItemInputSchema.parse({ type: "VIDEO", moduleId: M, title: "Aula", youtubeUrl: "https://youtu.be/dQw4w9WgXcQ", body: null });
    expect(r).toMatchObject({ type: "VIDEO", youtubeUrl: "dQw4w9WgXcQ" });
  });
  test("aula com link inválido", () => {
    const r = contentItemInputSchema.safeParse({ type: "VIDEO", moduleId: M, title: "Aula", youtubeUrl: "x", body: null });
    expect(r.success).toBe(false);
  });
  test("documento exige PDF ou texto", () => {
    const r = contentItemInputSchema.safeParse({ type: "DOCUMENT", moduleId: M, title: "Doc", body: emptyDoc, pdf: null });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Envie um PDF ou escreva um texto.");
  });
  test("documento só com texto", () => {
    expect(contentItemInputSchema.safeParse({ type: "DOCUMENT", moduleId: M, title: "Doc", body: doc("oi"), pdf: null }).success).toBe(true);
  });
  test("chave de PDF fora do padrão é recusada (sem path traversal)", () => {
    const r = contentItemInputSchema.safeParse({
      type: "DOCUMENT", moduleId: M, title: "Doc", body: null,
      pdf: { key: "../../etc/passwd", name: "x.pdf", size: 10 },
    });
    expect(r.success).toBe(false);
  });
  test("body que não é documento Tiptap é recusado", () => {
    const r = contentItemInputSchema.safeParse({ type: "DOCUMENT", moduleId: M, title: "Doc", body: { type: "script" }, pdf: null });
    expect(r.success).toBe(false);
  });
});

test("participante normaliza e-mail", () => {
  expect(participantInputSchema.parse({ name: " Ana ", email: " ANA@X.com " })).toEqual({ name: "Ana", email: "ana@x.com" });
});

describe("settingsInputSchema", () => {
  const d = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] };
  const base = {
    courseTitle: "Neuro Suporte", courseSubtitle: "Sub", aboutCourse: d, audience: d, learnings: d,
    psychologistName: "Dra. A", crp: "CRP 06/12345", bio: d, approach: d, photoKey: null, contactUrl: "https://wa.me/5511999999999",
  };
  test("válido", () => expect(settingsInputSchema.safeParse(base).success).toBe(true));
  test("link de contato precisa ser http(s)", () => {
    expect(settingsInputSchema.safeParse({ ...base, contactUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  test("foto precisa ser chave de imagem", () => {
    expect(settingsInputSchema.safeParse({ ...base, photoKey: "pdfs/x.pdf" }).success).toBe(false);
  });
});
