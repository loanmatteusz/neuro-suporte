import { siteConfig } from "@/config/site";

export type UploadKind = "pdf" | "image";
export type UploadRequest = { fileName: string; size: number; contentType: string };

const RULES = {
  pdf: { types: { "application/pdf": "pdf" }, max: siteConfig.pdfMaxBytes, typeMsg: "Envie um arquivo PDF.", sizeMsg: "O PDF pode ter no máximo 20 MB.", dir: "pdfs" },
  image: {
    types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
    max: siteConfig.imageMaxBytes,
    typeMsg: "Envie uma imagem JPG, PNG ou WebP.",
    sizeMsg: "A imagem pode ter no máximo 5 MB.",
    dir: "images",
  },
} as const;

function check(contentType: string | undefined, size: number | undefined, kind: UploadKind): string | null {
  const rule = RULES[kind];
  if (!contentType || !(contentType in rule.types)) return rule.typeMsg;
  if (!size || size <= 0) return "O arquivo está vazio.";
  if (size > rule.max) return rule.sizeMsg;
  return null;
}

export function validateUploadRequest(req: UploadRequest, kind: UploadKind): string | null {
  return check(req.contentType, req.size, kind);
}

export function buildObjectKey(kind: UploadKind, contentType: string, uuid: string): string {
  const rule = RULES[kind];
  const ext = (rule.types as Record<string, string>)[contentType];
  return `${rule.dir}/${uuid}.${ext}`;
}

export function checkUploadedObject(head: { contentType?: string; contentLength?: number } | null, kind: UploadKind): string | null {
  if (!head) return "O arquivo não chegou ao armazenamento. Envie de novo.";
  return check(head.contentType, head.contentLength, kind);
}
