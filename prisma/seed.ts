import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { siteConfig } from "../src/config/site";
import { assertLocalDatabase } from "../src/lib/db-guard";
import { createScriptPrisma, createScriptS3, doc } from "../scripts/lib/script-clients";

try {
  assertLocalDatabase(process.env.DATABASE_URL);
} catch (e) {
  console.error(`\n${(e as Error).message}\n`);
  process.exit(1);
}

const prisma = createScriptPrisma(process.env.DATABASE_URL!);
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// PDF mínimo válido de 1 página com um texto.
function samplePdf(title: string): Buffer {
  const text = title.replace(/[()\\]/g, "");
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

type SeedItem =
  | { type: "VIDEO"; title: string; youtubeId: string; body: string[] }
  | { type: "DOCUMENT"; title: string; body: string[]; pdf?: boolean };

// Vídeos públicos de exemplo (Blender Foundation) só para desenvolvimento.
const V1 = "aqz-KE-bpKQ";
const V2 = "eRsGyueVLvQ";
const V3 = "R6MlUcmOul8";

const MODULES: { title: string; description: string; items: SeedItem[] }[] = [
  {
    title: "Entendendo o autismo",
    description: "Um começo tranquilo: o que é o autismo, em palavras simples.",
    items: [
      { type: "VIDEO", title: "Boas-vindas ao curso", youtubeId: V1, body: ["Que bom ter você aqui. Neste vídeo, conto como o curso funciona e como você pode aproveitá-lo no seu ritmo."] },
      { type: "DOCUMENT", title: "Guia: perguntas frequentes", pdf: true, body: ["Reunimos dúvidas comuns de famílias que estão começando. Leia com calma e volte quando quiser."] },
    ],
  },
  {
    title: "Rotina e previsibilidade",
    description: "Como pequenas rotinas podem trazer mais tranquilidade para todos.",
    items: [
      { type: "VIDEO", title: "Por que a rotina ajuda", youtubeId: V2, body: ["Rotinas previsíveis podem ajudar a criança a se sentir mais segura. Vamos ver exemplos do dia a dia."] },
      { type: "DOCUMENT", title: "Roteiro: montando o quadro da rotina", body: ["Escolha 3 momentos do dia para começar.", "Use imagens simples para cada momento.", "Revise o quadro junto com a criança, sem pressa."] },
      { type: "VIDEO", title: "Transições entre atividades", youtubeId: V3, body: ["Mudar de uma atividade para outra pode ser difícil. Algumas ideias para tornar esse momento mais leve."] },
      { type: "DOCUMENT", title: "Exercício para casa", pdf: true, body: ["Observe durante uma semana quais momentos do dia são mais tranquilos e quais são mais desafiadores."] },
    ],
  },
  {
    title: "Comunicação e vínculo",
    description: "Formas de se comunicar e de fortalecer a relação com a criança.",
    items: [
      { type: "DOCUMENT", title: "Leitura: muitas formas de se comunicar", body: ["Comunicação vai além da fala: gestos, olhares e objetos também contam.", "Observe como a criança já se comunica hoje."] },
      { type: "VIDEO", title: "Brincar junto", youtubeId: V1, body: ["O brincar é um ótimo espaço de encontro. Veja como acompanhar os interesses da criança."] },
      { type: "VIDEO", title: "Cuidando de quem cuida", youtubeId: V2, body: ["Cuidar de você também faz parte. Algumas reflexões para os dias mais cansativos."] },
    ],
  },
];

async function main() {
  const { client: s3, bucket } = createScriptS3();

  await prisma.contentProgress.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.module.deleteMany();
  await prisma.siteSettings.deleteMany();

  await prisma.siteSettings.create({ data: { id: 1, ...siteConfig.defaults } });

  const itemIds: string[] = [];
  for (const [mi, m] of MODULES.entries()) {
    const mod = await prisma.module.create({ data: { title: m.title, description: m.description, position: mi } });
    for (const [ii, item] of m.items.entries()) {
      let pdf: { pdfKey: string; pdfName: string; pdfSize: number } | undefined;
      if (item.type === "DOCUMENT" && item.pdf) {
        const body = samplePdf(item.title);
        const key = `pdfs/${randomUUID()}.pdf`;
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/pdf" }));
        pdf = { pdfKey: key, pdfName: `${item.title}.pdf`, pdfSize: body.length };
      }
      const created = await prisma.contentItem.create({
        data: {
          moduleId: mod.id,
          type: item.type,
          title: item.title,
          position: ii,
          body: doc(...item.body),
          youtubeId: item.type === "VIDEO" ? item.youtubeId : null,
          ...pdf,
        },
      });
      itemIds.push(created.id);
    }
  }

  const user = (email: string, name: string, role: "admin" | "participant", extra: object = {}) =>
    prisma.user.create({ data: { id: randomUUID(), email, name, role, emailVerified: false, banned: false, ...extra } });

  await user("loan.matteusz@gmail.com", "Loan", "admin");
  await user("ana.exemplo@example.com", "Ana Exemplo", "participant", { inviteSentAt: daysAgo(3) });
  const bruno = await user("bruno.exemplo@example.com", "Bruno Exemplo", "participant", {
    inviteSentAt: daysAgo(40),
    lastSeenAt: daysAgo(20),
    lastContentItemId: itemIds[2],
  });
  const carla = await user("carla.exemplo@example.com", "Carla Exemplo", "participant", {
    inviteSentAt: daysAgo(30),
    lastSeenAt: daysAgo(1),
    lastContentItemId: itemIds[7],
  });

  const complete = (userId: string, ids: string[], baseDaysAgo: number) =>
    prisma.contentProgress.createMany({
      data: ids.map((contentItemId, i) => ({ userId, contentItemId, completedAt: daysAgo(baseDaysAgo - i) })),
    });
  await complete(bruno.id, itemIds.slice(0, 3), 25); // 3/9 ≈ 33%
  await complete(carla.id, itemIds.slice(0, 7), 20); // 7/9 ≈ 78%

  console.log(`Seed ok: ${MODULES.length} módulos, ${itemIds.length} conteúdos, 1 admin, 3 participantes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
