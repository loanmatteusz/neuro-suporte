"use server";

import { randomUUID } from "node:crypto";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { buildObjectKey, validateUploadRequest, type UploadKind, type UploadRequest } from "@/lib/pdf-upload";
import { createUploadUrl } from "@/lib/s3";
import { requireAdmin } from "@/lib/session";

export async function requestUpload(kind: UploadKind, req: UploadRequest): Promise<ActionResult<{ key: string; url: string }>> {
  await requireAdmin();
  if (kind !== "pdf" && kind !== "image") return fail("Tipo de envio inválido.");
  const error = validateUploadRequest(req, kind);
  if (error) return fail(error);
  const key = buildObjectKey(kind, req.contentType, randomUUID());
  const url = await createUploadUrl(key, req.contentType, req.size);
  return ok({ key, url });
}
