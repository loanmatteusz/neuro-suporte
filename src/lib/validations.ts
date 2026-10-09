import { z } from "zod";
import type { JSONContent } from "@tiptap/core";
import { emailSchema } from "./email-address";
import { isEmptyDoc } from "./rich-text";
import { youtubeUrlSchema } from "./youtube";

export const richTextDocSchema: z.ZodType<JSONContent | null> = z
  .looseObject({ type: z.literal("doc"), content: z.array(z.looseObject({ type: z.string() })).optional() })
  .nullable()
  .transform((v) => v as JSONContent | null);

const title = (msg: string) => z.string().trim().min(1, msg).max(160, "Use no máximo 160 caracteres.");

export const moduleInputSchema = z.object({
  title: title("Dê um título ao módulo."),
  description: z
    .string()
    .trim()
    .max(300, "Use no máximo 300 caracteres.")
    .optional()
    .transform((v) => (v ? v : null)),
});
export type ModuleInput = z.input<typeof moduleInputSchema>;

const pdfSchema = z.object({
  key: z.string().regex(/^pdfs\/[0-9a-f-]{36}\.pdf$/, "Arquivo inválido."),
  name: z.string().trim().min(1).max(200),
  size: z.number().int().positive(),
});

export const contentItemInputSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("VIDEO"),
      moduleId: z.uuid(),
      title: title("Dê um título à aula."),
      youtubeUrl: youtubeUrlSchema,
      body: richTextDocSchema,
    }),
    z.object({
      type: z.literal("DOCUMENT"),
      moduleId: z.uuid(),
      title: title("Dê um título ao documento."),
      body: richTextDocSchema,
      pdf: pdfSchema.nullable(),
    }),
  ])
  .superRefine((v, ctx) => {
    if (v.type === "DOCUMENT" && !v.pdf && isEmptyDoc(v.body)) {
      ctx.addIssue({ code: "custom", message: "Envie um PDF ou escreva um texto.", path: ["body"] });
    }
  });
export type ContentItemInput = z.input<typeof contentItemInputSchema>;

export const participantInputSchema = z.object({
  name: z.string().trim().min(1, "Digite o nome.").max(120, "Use no máximo 120 caracteres."),
  email: emailSchema,
});
export type ParticipantInput = z.input<typeof participantInputSchema>;

export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

const requiredDoc = richTextDocSchema.refine((v) => !isEmptyDoc(v), "Escreva este texto.");

export const settingsInputSchema = z.object({
  courseTitle: title("Digite o título do curso."),
  courseSubtitle: z.string().trim().min(1, "Digite o subtítulo.").max(240),
  aboutCourse: requiredDoc,
  audience: requiredDoc,
  learnings: requiredDoc,
  psychologistName: z.string().trim().min(1, "Digite o seu nome.").max(120),
  crp: z.string().trim().min(1, "Digite o CRP.").max(40),
  bio: requiredDoc,
  approach: requiredDoc,
  photoKey: z.string().regex(/^images\/[0-9a-f-]{36}\.(jpg|png|webp)$/).nullable(),
  contactUrl: z.url({ protocol: /^https?$/, message: "Cole um link que comece com https://" }),
});
export type SettingsInput = z.input<typeof settingsInputSchema>;
