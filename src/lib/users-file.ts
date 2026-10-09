import { z } from "zod";
import { emailSchema } from "./email-address";

export type UserRole = "admin" | "participant";
export type UserEntry = { email: string; name: string; role: UserRole; active: boolean };
export type ExistingUser = { email: string; name: string; role: string | null; banned: boolean | null };
export type UsersDiff = {
  create: UserEntry[];
  update: { entry: UserEntry; changes: string[] }[];
  unchanged: UserEntry[];
};

const entrySchema = z.object({
  email: emailSchema,
  name: z.string({ message: "obrigatório" }).trim().min(1, "obrigatório"),
  role: z.enum(["admin", "participant"], { message: 'use "admin" ou "participant"' }),
  active: z.boolean({ message: "use true ou false" }),
});

export function parseUsersFile(raw: unknown): { ok: true; users: UserEntry[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(raw)) {
    return { ok: false, errors: ["O arquivo deve conter uma lista (array) de usuários."] };
  }
  const errors: string[] = [];
  const users: UserEntry[] = [];
  raw.forEach((item, index) => {
    const r = entrySchema.safeParse(item);
    if (!r.success) {
      for (const issue of r.error.issues) {
        errors.push(`Item ${index + 1} (${issue.path.join(".") || "item"}): ${issue.message}`);
      }
    } else {
      users.push(r.data);
    }
  });
  if (errors.length) return { ok: false, errors };

  const firstIndex = new Map<string, number>();
  users.forEach((u, i) => {
    const prev = firstIndex.get(u.email);
    if (prev !== undefined) errors.push(`E-mail duplicado "${u.email}" nos itens ${prev + 1} e ${i + 1}.`);
    else firstIndex.set(u.email, i);
  });
  return errors.length ? { ok: false, errors } : { ok: true, users };
}

export function diffUsers(entries: UserEntry[], existing: ExistingUser[]): UsersDiff {
  const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));
  const diff: UsersDiff = { create: [], update: [], unchanged: [] };
  for (const entry of entries) {
    const current = byEmail.get(entry.email);
    if (!current) {
      diff.create.push(entry);
      continue;
    }
    const changes: string[] = [];
    if (current.name !== entry.name) changes.push("name");
    if ((current.role ?? "participant") !== entry.role) changes.push("role");
    if (!(current.banned ?? false) !== entry.active) changes.push("active");
    if (changes.length) diff.update.push({ entry, changes });
    else diff.unchanged.push(entry);
  }
  return diff;
}
