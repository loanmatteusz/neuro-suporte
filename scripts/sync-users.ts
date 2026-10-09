import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { config as loadEnv } from "dotenv";
import { siteConfig } from "../src/config/site";
import { describeDatabase, isLocalDatabaseUrl } from "../src/lib/db-guard";
import { inviteEmail } from "../src/lib/email-templates";
import { diffUsers, parseUsersFile } from "../src/lib/users-file";
import { createScriptMailer } from "./lib/script-mailer";
import { createScriptPrisma } from "./lib/script-clients";

const { values: args } = parseArgs({
  options: {
    file: { type: "string", default: "data/users.json" },
    env: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
    "send-invites": { type: "boolean", default: false },
  },
});

function die(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

async function main() {
  loadEnv({ path: args.env ?? ".env", override: Boolean(args.env) });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) die("DATABASE_URL não definida (use --env <arquivo>).");

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(args.file!, "utf8"));
  } catch (e) {
    die(`Não consegui ler ${args.file}: ${(e as Error).message}`);
  }
  const parsed = parseUsersFile(raw);
  if (!parsed.ok) die(`Arquivo inválido — nada foi gravado:\n  - ${parsed.errors.join("\n  - ")}`);

  const local = isLocalDatabaseUrl(databaseUrl);
  console.log(`Banco: ${describeDatabase(databaseUrl)} (${local ? "local" : "REMOTO"})`);

  const prisma = createScriptPrisma(databaseUrl);
  try {
    const existing = await prisma.user.findMany({
      where: { email: { in: parsed.users.map((u) => u.email) } },
      select: { email: true, name: true, role: true, banned: true },
    });
    const diff = diffUsers(parsed.users, existing);

    for (const u of diff.create) console.log(`  + criar      ${u.email} (${u.role}${u.active ? "" : ", desativado"})`);
    for (const u of diff.update) console.log(`  ~ atualizar  ${u.entry.email} [${u.changes.join(", ")}]`);
    console.log(`  = sem alteração: ${diff.unchanged.length}`);

    if (args["dry-run"]) {
      console.log("\n--dry-run: nada foi gravado.");
      return;
    }
    if (diff.create.length + diff.update.length === 0) {
      console.log("\nCriados: 0 · Atualizados: 0 · Sem alteração: " + diff.unchanged.length);
      return;
    }
    if (!local && !args.yes) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(`\nVai gravar no banco REMOTO ${describeDatabase(databaseUrl)}. Digite "sim" para continuar: `);
      rl.close();
      if (answer.trim().toLowerCase() !== "sim") die("Cancelado. Nada foi gravado.");
    }

    await prisma.$transaction([
      ...diff.create.map((u) =>
        prisma.user.create({
          data: { id: randomUUID(), email: u.email, name: u.name, role: u.role, banned: !u.active, emailVerified: false },
        }),
      ),
      ...diff.update.map(({ entry }) =>
        prisma.user.update({
          where: { email: entry.email },
          data: { name: entry.name, role: entry.role, banned: !entry.active, banReason: entry.active ? null : "Desativado pelo arquivo de usuários" },
        }),
      ),
      // Desativados perdem as sessões abertas.
      ...diff.update
        .filter(({ entry, changes }) => changes.includes("active") && !entry.active)
        .map(({ entry }) => prisma.session.deleteMany({ where: { user: { email: entry.email } } })),
    ]);

    let invited = 0;
    if (args["send-invites"]) {
      const send = createScriptMailer();
      const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      const settings = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { psychologistName: true } });
      for (const u of diff.create.filter((x) => x.role === "participant" && x.active)) {
        try {
          await send({
            to: u.email,
            ...inviteEmail({
              name: u.name,
              loginUrl: `${baseUrl}/login?email=${encodeURIComponent(u.email)}`,
              psychologistName: settings?.psychologistName ?? siteConfig.defaults.psychologistName,
            }),
          });
          await prisma.user.update({ where: { email: u.email }, data: { inviteSentAt: new Date() } });
          invited++;
        } catch (e) {
          console.error(`  ! convite não enviado para ${u.email}: ${(e as Error).message}`);
        }
      }
    }

    console.log(
      `\nCriados: ${diff.create.length} · Atualizados: ${diff.update.length} · Sem alteração: ${diff.unchanged.length}` +
        (args["send-invites"] ? ` · Convites enviados: ${invited}` : ""),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => die((e as Error).message));
