import { describe, expect, test } from "vitest";
import { buildObjectKey, checkUploadedObject, validateUploadRequest } from "./pdf-upload";

const MB = 1024 * 1024;

describe("validateUploadRequest", () => {
  test("PDF dentro do limite", () => {
    expect(validateUploadRequest({ fileName: "guia.pdf", size: 2 * MB, contentType: "application/pdf" }, "pdf")).toBeNull();
  });
  test("tipo errado", () => {
    expect(validateUploadRequest({ fileName: "x.docx", size: 1000, contentType: "application/msword" }, "pdf")).toBe("Envie um arquivo PDF.");
  });
  test("acima de 20 MB", () => {
    expect(validateUploadRequest({ fileName: "g.pdf", size: 20 * MB + 1, contentType: "application/pdf" }, "pdf")).toBe("O PDF pode ter no máximo 20 MB.");
  });
  test("vazio", () => {
    expect(validateUploadRequest({ fileName: "g.pdf", size: 0, contentType: "application/pdf" }, "pdf")).toBe("O arquivo está vazio.");
  });
  test("imagem aceita jpeg/png/webp até 5 MB", () => {
    expect(validateUploadRequest({ fileName: "f.jpg", size: MB, contentType: "image/jpeg" }, "image")).toBeNull();
    expect(validateUploadRequest({ fileName: "f.gif", size: MB, contentType: "image/gif" }, "image")).toBe("Envie uma imagem JPG, PNG ou WebP.");
    expect(validateUploadRequest({ fileName: "f.png", size: 6 * MB, contentType: "image/png" }, "image")).toBe("A imagem pode ter no máximo 5 MB.");
  });
});

test("buildObjectKey ignora nome do arquivo (sem path traversal)", () => {
  expect(buildObjectKey("pdf", "application/pdf", "abc")).toBe("pdfs/abc.pdf");
  expect(buildObjectKey("image", "image/webp", "abc")).toBe("images/abc.webp");
});

describe("checkUploadedObject", () => {
  test("objeto ausente", () => {
    expect(checkUploadedObject(null, "pdf")).toBe("O arquivo não chegou ao armazenamento. Envie de novo.");
  });
  test("tipo real diferente do declarado", () => {
    expect(checkUploadedObject({ contentType: "text/html", contentLength: 10 }, "pdf")).toBe("Envie um arquivo PDF.");
  });
  test("tamanho real acima do limite", () => {
    expect(checkUploadedObject({ contentType: "application/pdf", contentLength: 21 * MB }, "pdf")).toBe("O PDF pode ter no máximo 20 MB.");
  });
  test("ok", () => {
    expect(checkUploadedObject({ contentType: "application/pdf", contentLength: MB }, "pdf")).toBeNull();
  });
});
