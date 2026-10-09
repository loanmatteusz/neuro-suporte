# Neuro Suporte — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plataforma web de um único curso (módulos → aulas em vídeo/documentos) para pais de crianças autistas, com login por convite via código no e-mail, progresso manual e painel simples para a psicóloga acompanhar cada participante.

**Architecture:** Um único app Next.js 16 (App Router) full-stack: Server Components para leitura, Server Actions para mutações, Prisma 7 + Postgres, Better Auth (emailOTP + admin), PDFs privados em bucket S3-compatível (MinIO/R2) via URLs pré-assinadas, e-mail via SMTP (nodemailer). Lógica de domínio crítica isolada em módulos puros testados (`progress`, `youtube`, `users-file`, `db-guard`, `login-gate`, `reorder`, `email-templates`).

**Tech Stack:** Next 16.4 · React 19 · TypeScript 5 · Tailwind 4 + shadcn/ui · Prisma 7.10 (+ `@prisma/adapter-pg`) · Better Auth 1.7 · nodemailer 10 · `@aws-sdk/client-s3` 3 · Zod 4 · Tiptap 3 · dnd-kit · Vitest 5 · pnpm.

**Spec:** [docs/superpowers/specs/2026-10-08-neuro-suporte-design.md](../specs/2026-10-08-neuro-suporte-design.md) — ler antes de qualquer tarefa; as seções citadas como "spec §N" referem-se a ele.

## Global Constraints

- **Escopo:** um único curso. Proibido criar model `Course`, rota com id de curso, preço, slug ou lógica multi-curso.
- **Prisma:** fixar `prisma`, `@prisma/client` e `@prisma/adapter-pg` em **7.10.0** (a tag `latest` do npm é 8.0.0-rc — não usar).
- **Next 16:** usar `src/proxy.ts` com `export function proxy` (nunca `middleware.ts`); `params`/`searchParams` são `Promise`; depois de instalar, ler `node_modules/next/dist/docs/` e corrigir todo aviso de deprecação.
- **Rotas em inglês; toda a UI em português (pt-BR)**, tratando o leitor por "você".
- **Sem Resend.** E-mail só via `nodemailer` + SMTP (`SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`).
- **Constantes** vêm de `src/config/site.ts`: `inactiveAfterDays: 14`, `sessionDays: 60`, `otpMinutes: 10`, `pdfMaxBytes: 20 * 1024 * 1024`, `imageMaxBytes: 5 * 1024 * 1024`, `notifyBatchSize: 10`.
- **Texto ético** exato, no rodapé de todas as páginas: "Este conteúdo é educativo e não substitui acompanhamento profissional individual."
- **Textos:** nenhuma promessa de resultado ou "cura" (diretrizes CFP); não coletar nenhum dado da criança.
- **Bucket privado:** nunca gerar URL pública; leitura só via URL pré-assinada de 300 s após checar sessão.
- **Toda Server Action e Route Handler** começa com `requireUser()` ou `requireAdmin()`; o `proxy.ts` não é barreira de segurança.
- **Admins** (`role = "admin"`) nunca entram em estatísticas de participantes.
- **Acessibilidade:** alvos de toque ≥ 44 px, contraste AA, foco visível, `prefers-reduced-motion` respeitado, layout sem rolagem horizontal em 360 px.
- **Tema:** só claro.
- **Dependências:** só as listadas na spec §4; nada além disso sem perguntar.
- **Commits:** a regra 6 do `CLAUDE.md` proíbe commit sem pedido. Os passos "Commit" deste plano só rodam se o usuário autorizou commits para a execução; caso contrário, troque por `git add` (stage) e siga.
- **Comandos:** sempre `pnpm`. Postgres/MinIO via `docker compose`.

## Review Focus

1. **Nome/e-mail com caracteres HTML (`<`, `&`, `"`) em convites e avisos** → o e-mail deve mostrar o texto literal, nunca interpretar HTML. Teste em Task 6 (`email-templates.test.ts`).
2. **E-mail digitado com maiúsculas/espaços (`  Ana@Exemplo.com `) no login, no convite e no `users.json`** → tratado como o mesmo usuário em minúsculas; nunca cria duplicado nem nega acesso. Testes em Task 5 (`users-file.test.ts`, duplicado case-insensitive), Task 14 (`validations.test.ts`, convite normalizado) e Task 7 Step 7 (curl com `" Teste@X.com "`).
3. **Reordenação com payload adulterado/obsoleto** (id de outro módulo omitido, id inexistente, item duplicado em dois módulos) → rejeitar sem gravar nada. Teste em Task 15 (`reorder.test.ts`).
4. **Curso ou módulo vazio, e item excluído após conclusão** → 0% sem divisão por zero; nunca mostrar 100% sem estar completo. Teste em Task 3 (`progress.test.ts`).
5. **Upload com tipo/tamanho mentiroso** (cliente diz PDF de 1 MB, envia outra coisa ou arquivo maior) → o salvamento confere `HeadObject` (ContentType e ContentLength) e recusa. Teste em Task 13 (`pdf-upload.test.ts`, função pura `checkUploadedObject`).

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `docker-compose.yml`, `.env.example`, `src/lib/env.ts`, `vitest.config.ts` | Infra local, env validado, testes | 1 |
| `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts` | Banco | 2 |
| `src/config/site.ts` | Constantes e textos padrão | 2 |
| `src/lib/progress.ts` | Cálculo de progresso (puro) | 3 |
| `src/lib/youtube.ts` | Extrair/validar ID do YouTube | 4 |
| `src/lib/db-guard.ts`, `src/lib/users-file.ts` | Local vs remoto; schema + diff do users.json | 5 |
| `src/lib/email.ts`, `src/lib/email-templates.ts`, `src/lib/escape-html.ts` | Envio SMTP e templates | 6 |
| `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/login-gate.ts`, `src/lib/session.ts`, `src/proxy.ts`, `src/app/api/auth/[...all]/route.ts` | Autenticação e autorização | 7 |
| `src/app/globals.css`, `src/app/layout.tsx`, `src/components/brand/*`, `src/components/course/progress-bar.tsx` | Design system | 8 |
| `src/app/(auth)/login/**` | Login por código | 9 |
| `prisma/seed.ts` | Seed de desenvolvimento | 10 |
| `src/data/course.ts`, `src/data/settings.ts`, `src/app/course/layout.tsx`, `src/app/course/page.tsx` | Home do participante | 11 |
| `src/lib/action-result.ts`, `src/lib/rich-text.ts`, `src/components/rich-text/*`, `src/app/course/[itemId]/**`, `src/app/course/actions.ts` | Página de conteúdo e conclusão | 12 |
| `src/lib/s3.ts`, `src/lib/pdf-upload.ts`, `src/app/api/pdf/[itemId]/route.ts`, `src/app/api/photo/route.ts` | Arquivos privados | 13 |
| `src/lib/validations.ts`, `src/app/admin/layout.tsx`, `src/app/admin/content/**`, `src/components/admin/*` | Admin de conteúdo | 14 |
| `src/lib/reorder.ts`, `src/app/admin/content/_components/content-tree.tsx`, ações de reorder | Drag-and-drop persistido | 15 |
| ação `notifyParticipants` | Aviso de conteúdo novo | 16 |
| `src/data/participants.ts`, `src/app/admin/participants/**` | Convites e acompanhamento | 17 |
| `src/app/admin/page.tsx`, `src/app/admin/settings/**` | Visão geral e apresentação | 18 |
| `src/app/(public)/**`, `src/app/account/**` | Landing, privacidade, conta | 19 |
| `scripts/sync-users.ts`, `data/users.example.json` | Sync de usuários | 20 |
| `scripts/migrate-if-production.mjs`, `README.md`, `CHECKLIST.md` | Deploy e documentação | 21 |

---
## Fase A — Fundação

### Task 1: Scaffold, dependências, infra local e testes

**Files:**
- Create: projeto Next na raiz (via pasta temporária), `docker-compose.yml`, `.env.example`, `.env`, `src/lib/env.ts`, `vitest.config.ts`, `src/lib/sanity.test.ts` (removido no fim da task)
- Modify: `.gitignore`, `package.json`

**Interfaces:**
- Produces: `env` (de `@/lib/env`) com as chaves da spec §17; scripts `pnpm dev|build|lint|test`; alias `@/*` → `src/*`.

- [ ] **Step 1: Gerar o app numa pasta temporária (a raiz já tem README/CHECKLIST que não podem ser sobrescritos)**

```bash
cd /home/loan/dev/larissa/neuro-suporte
pnpm create next-app@16.4.0 .scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack --skip-install --yes
rsync -a --exclude README.md --exclude .git --exclude .gitignore .scaffold/ ./
cat .scaffold/.gitignore >> .gitignore
rm -rf .scaffold
pnpm install
```

Expected: `src/app/page.tsx` existe; `README.md` original intacto (`head -1 README.md` → `# Neuro Suporte`).

- [ ] **Step 2: Completar o `.gitignore`**

Acrescente ao final de `.gitignore`:

```gitignore
# Neuro Suporte
.env*
!.env.example
data/users.json
src/generated/
.superpowers/
```

- [ ] **Step 3: Instalar dependências (versões da spec §4)**

```bash
pnpm add prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg better-auth nodemailer @aws-sdk/client-s3 @aws-sdk/s3-request-presigner zod @t3-oss/env-nextjs @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/static-renderer @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-dropzone input-otp sonner vaul lucide-react dotenv
pnpm add -D vitest tsx @types/pg @types/nodemailer @tailwindcss/typography
```

Run: `pnpm ls prisma @prisma/client` → Expected: ambos `7.10.0`.

- [ ] **Step 4: Ler a documentação do Next instalado**

```bash
ls node_modules/next/dist/docs/
```

Leia pelo menos: `01-app/02-guides/upgrading/version-16.mdx`, `01-app/03-api-reference/03-file-conventions/proxy.mdx`, e a página de `after` (`grep -ril "function after" node_modules/next/dist/docs | head`). Anote no `CHANGES.log` (Step 9) qualquer API usada neste plano que esteja marcada como deprecated e use a substituta.

- [ ] **Step 5: shadcn**

```bash
pnpm dlx shadcn@latest init --base-color stone --yes
pnpm dlx shadcn@latest add button input label textarea dialog alert-dialog sheet drawer badge sonner input-otp dropdown-menu card table tooltip separator skeleton
```

Expected: `src/components/ui/*.tsx` e `src/lib/utils.ts` (com `cn`) criados.

- [ ] **Step 6: docker-compose**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: neuro
      POSTGRES_PASSWORD: neuro
      POSTGRES_DB: neuro
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U neuro"]
      interval: 5s
      retries: 10

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: neuro
      MINIO_ROOT_PASSWORD: neuro-secret
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      retries: 10

  minio-init:
    image: minio/mc
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 neuro neuro-secret &&
      mc mb --ignore-existing local/neuro-suporte &&
      mc anonymous set none local/neuro-suporte
      "

volumes:
  postgres_data:
  minio_data:
```

Run: `docker compose up -d && docker compose ps` → Expected: `postgres` e `minio` healthy; `minio-init` saiu com código 0 (`docker compose logs minio-init` mostra "Bucket created successfully" ou "already own it").

- [ ] **Step 7: Variáveis de ambiente**

Create `.env.example`:

```bash
# Banco (dev: docker compose; produção: Neon, connection string "pooled")
DATABASE_URL="postgresql://neuro:neuro@localhost:5432/neuro"

# Better Auth — gere com: openssl rand -base64 32
BETTER_AUTH_SECRET=""
# URL pública do site (dev: http://localhost:3000; produção: https://<projeto>.vercel.app)
BETTER_AUTH_URL="http://localhost:3000"

# E-mail via SMTP (opcional em dev: sem isso, os e-mails aparecem no console)
# Gmail: smtp.gmail.com / 465 / conta Gmail / senha de app (exige verificação em 2 etapas)
SMTP_HOST=""
SMTP_PORT="465"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="Neuro Suporte <seu-email@gmail.com>"

# Arquivos (dev: MinIO do docker compose; produção: Cloudflare R2)
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="neuro"
S3_SECRET_ACCESS_KEY="neuro-secret"
S3_BUCKET="neuro-suporte"
S3_FORCE_PATH_STYLE="true"
```

```bash
cp .env.example .env
sed -i "s|^BETTER_AUTH_SECRET=\"\"|BETTER_AUTH_SECRET=\"$(openssl rand -base64 32)\"|" .env
```

Create `src/lib/env.ts`:

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";
const smtp = isProd ? z.string().min(1) : z.string().optional();

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    SMTP_HOST: smtp,
    SMTP_PORT: z.coerce.number().int().default(465),
    SMTP_USER: smtp,
    SMTP_PASS: smtp,
    EMAIL_FROM: smtp,
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
```

- [ ] **Step 8: Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
});
```

Add to `package.json` → `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

Create `src/lib/sanity.test.ts`:

```ts
import { expect, test } from "vitest";
import { cn } from "@/lib/utils";

test("alias @ resolve", () => {
  expect(cn("a", false && "b", "c")).toBe("a c");
});
```

Run: `pnpm test` → Expected: 1 passed. Then `rm src/lib/sanity.test.ts`.

- [ ] **Step 9: CHANGES.log e verificação**

Create `CHANGES.log` com o checklist das 21 tasks deste plano (uma linha `[ ] Task N: nome` cada) — atualize marcando `[x]` ao fim de cada task (regra do CLAUDE.md).

Run: `pnpm lint && pnpm build`
Expected: ambos passam (a página padrão do Next ainda existe; será trocada na Task 8).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next 16, deps, docker compose, env e vitest"
```

---

### Task 2: Banco de dados (Prisma 7 + tabelas do Better Auth) e `site.ts`

**Files:**
- Create: `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`, `src/config/site.ts`
- Generated: `prisma/migrations/*_init/`

**Interfaces:**
- Produces: `prisma` (de `@/lib/prisma`); tipos gerados em `@/generated/prisma/client` (`ContentType`, `Prisma`, models); `siteConfig` (de `@/config/site`) e `type SiteDefaults`.

- [ ] **Step 1: `prisma.config.ts`**

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url: env("DATABASE_URL") },
});
```

- [ ] **Step 2: `prisma/schema.prisma`**

Copie o schema da spec §5 integralmente e acrescente os models do Better Auth (Session/Account/Verification iguais aos gerados pelo CLI, com `impersonatedBy String?` em Session por causa do plugin admin) mais o `RateLimit` usado por `rateLimit.storage = "database"`:

```prisma
model Session {
  id             String   @id
  expiresAt      DateTime
  token          String   @unique
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  ipAddress      String?
  userAgent      String?
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  impersonatedBy String?

  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verification")
}

model RateLimit {
  id          String @id
  key         String @unique
  count       Int
  lastRequest BigInt

  @@map("rateLimit")
}
```

O generator deve ser `provider = "prisma-client"`, `output = "../src/generated/prisma"`. No `User`, use `role String? @default("participant")`.

- [ ] **Step 3: `src/lib/prisma.ts`**

```ts
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Run: `pnpm add server-only`.

Scripts (`prisma/seed.ts`, `scripts/sync-users.ts`) **não** importam este arquivo (por causa do `server-only`); eles criam o próprio `PrismaClient` com o mesmo adapter.

- [ ] **Step 4: Migration inicial**

```bash
pnpm prisma migrate dev --name init
```

Expected: pasta `prisma/migrations/<timestamp>_init/` criada; `src/generated/prisma/client.ts` gerado.

- [ ] **Step 5: Conferir com o CLI do Better Auth (detecção de divergência)**

Depois da Task 7 existir, este passo é refeito; por agora rode só para comparar tabelas core:

```bash
pnpm dlx auth@latest generate --adapter prisma --output /tmp/ba-schema.prisma --yes || true
```

Se o arquivo gerado tiver campos core que não estão no seu schema (ex.: novos campos de `Session`), acrescente-os e rode `pnpm prisma migrate dev --name better_auth_sync`. Se o comando não existir/falhar, siga — a Task 7 Step 7 valida o login de ponta a ponta.

- [ ] **Step 6: `src/config/site.ts`**

```ts
import type { JSONContent } from "@tiptap/core";

const paragraph = (text: string): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const bullets = (items: string[]): JSONContent => ({
  type: "doc",
  content: [
    {
      type: "bulletList",
      content: items.map((text) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    },
  ],
});

export const siteConfig = {
  name: "Neuro Suporte",
  defaults: {
    courseTitle: "Neuro Suporte",
    courseSubtitle: "Um caminho acolhedor para pais e cuidadores de crianças autistas.",
    aboutCourse: paragraph(
      "Um curso em módulos curtos, com vídeos e materiais de apoio, para você entender melhor o seu filho e encontrar caminhos possíveis no dia a dia — no seu ritmo, de onde estiver.",
    ),
    audience: bullets([
      "Mães, pais e cuidadores de crianças autistas",
      "Quem recebeu o diagnóstico há pouco tempo e quer se orientar",
      "Familiares que querem apoiar a rotina da criança",
    ]),
    learnings: bullets([
      "O que é o autismo, em linguagem simples",
      "Como rotinas previsíveis podem ajudar a criança e a família",
      "Formas de comunicação e de fortalecer o vínculo",
    ]),
    psychologistName: "[Nome da Psicóloga]",
    crp: "CRP 00/00000",
    bio: paragraph("Psicóloga dedicada ao acompanhamento de famílias de crianças autistas. [Texto de apresentação a ser enviado.]"),
    approach: paragraph("[Descreva aqui a abordagem de trabalho.]"),
    contactUrl: "https://wa.me/5500000000000",
  },
  ethicsNotice: "Este conteúdo é educativo e não substitui acompanhamento profissional individual.",
  inactiveAfterDays: 14,
  sessionDays: 60,
  otpMinutes: 10,
  pdfMaxBytes: 20 * 1024 * 1024,
  imageMaxBytes: 5 * 1024 * 1024,
  notifyBatchSize: 10,
} as const;

export type SiteDefaults = typeof siteConfig.defaults;
```

Run: `pnpm add @tiptap/core` (para o tipo `JSONContent`; já é dependência transitiva do Tiptap, aqui fica explícita).

- [ ] **Step 7: Verificar**

Run: `pnpm prisma validate && pnpm exec tsc --noEmit`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(db): schema Prisma 7 com módulos, conteúdos, progresso e tabelas do Better Auth"
```

---

## Fase B — Lógica pura (TDD)

### Task 3: Cálculo de progresso

**Files:**
- Create: `src/lib/progress.ts`, `src/lib/progress.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type CourseShape = { modules: { id: string; itemIds: string[] }[] };
  export type ProgressStat = { done: number; total: number; percent: number; complete: boolean };
  export type CourseProgress = { overall: ProgressStat; modules: Record<string, ProgressStat> };
  export function computeProgress(shape: CourseShape, completed: ReadonlySet<string>): CourseProgress;
  export type ProgressAggregate = { participants: number; averagePercent: number; moduleAverages: Record<string, number> };
  export function aggregateProgress(shape: CourseShape, completedByUser: ReadonlyMap<string, ReadonlySet<string>>, userIds: string[]): ProgressAggregate;
  ```

- [ ] **Step 1: Testes que falham**

Create `src/lib/progress.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { aggregateProgress, computeProgress, type CourseShape } from "./progress";

const shape: CourseShape = {
  modules: [
    { id: "m1", itemIds: ["a", "b"] },
    { id: "m2", itemIds: ["c", "d", "e", "f"] },
    { id: "m3", itemIds: [] },
  ],
};

describe("computeProgress", () => {
  test("curso vazio: 0% e não concluído, sem NaN", () => {
    const p = computeProgress({ modules: [] }, new Set());
    expect(p.overall).toEqual({ done: 0, total: 0, percent: 0, complete: false });
  });

  test("módulo vazio: 0% e não concluído", () => {
    const p = computeProgress(shape, new Set(["a", "b"]));
    expect(p.modules.m3).toEqual({ done: 0, total: 0, percent: 0, complete: false });
  });

  test("por módulo e geral com pesos iguais por conteúdo", () => {
    const p = computeProgress(shape, new Set(["a", "b", "c"]));
    expect(p.modules.m1).toEqual({ done: 2, total: 2, percent: 100, complete: true });
    expect(p.modules.m2).toEqual({ done: 1, total: 4, percent: 25, complete: false });
    expect(p.overall).toEqual({ done: 3, total: 6, percent: 50, complete: false });
  });

  test("conclusões de itens que não existem mais são ignoradas", () => {
    const p = computeProgress(shape, new Set(["a", "excluido"]));
    expect(p.overall.done).toBe(1);
  });

  test("item movido de módulo conta no módulo novo", () => {
    const moved: CourseShape = { modules: [{ id: "m1", itemIds: ["a"] }, { id: "m2", itemIds: ["b"] }] };
    const p = computeProgress(moved, new Set(["b"]));
    expect(p.modules.m1.done).toBe(0);
    expect(p.modules.m2.done).toBe(1);
  });

  test("tudo concluído = 100% e complete", () => {
    const p = computeProgress(shape, new Set(["a", "b", "c", "d", "e", "f"]));
    expect(p.overall).toEqual({ done: 6, total: 6, percent: 100, complete: true });
  });

  test("nunca mostra 100% sem estar completo (arredondamento)", () => {
    const big: CourseShape = { modules: [{ id: "m", itemIds: Array.from({ length: 300 }, (_, i) => `i${i}`) }] };
    const done = new Set(Array.from({ length: 299 }, (_, i) => `i${i}`));
    const p = computeProgress(big, done);
    expect(p.overall.complete).toBe(false);
    expect(p.overall.percent).toBe(99);
  });

  test("progresso mínimo não aparece como 0% quando há algo concluído", () => {
    const big: CourseShape = { modules: [{ id: "m", itemIds: Array.from({ length: 300 }, (_, i) => `i${i}`) }] };
    const p = computeProgress(big, new Set(["i0"]));
    expect(p.overall.percent).toBe(1);
  });
});

describe("aggregateProgress", () => {
  test("médias geral e por módulo entre participantes", () => {
    const byUser = new Map([
      ["u1", new Set(["a", "b", "c", "d", "e", "f"])],
      ["u2", new Set<string>()],
    ]);
    const agg = aggregateProgress(shape, byUser, ["u1", "u2"]);
    expect(agg).toEqual({
      participants: 2,
      averagePercent: 50,
      moduleAverages: { m1: 50, m2: 50, m3: 0 },
    });
  });

  test("usuário sem registro no mapa conta como 0%", () => {
    const agg = aggregateProgress(shape, new Map(), ["u1"]);
    expect(agg.averagePercent).toBe(0);
  });

  test("sem participantes: médias 0", () => {
    const agg = aggregateProgress(shape, new Map(), []);
    expect(agg).toEqual({ participants: 0, averagePercent: 0, moduleAverages: { m1: 0, m2: 0, m3: 0 } });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/lib/progress.test.ts`
Expected: FAIL — `Cannot find module './progress'`.

- [ ] **Step 3: Implementação**

Create `src/lib/progress.ts`:

```ts
export type CourseShape = { modules: { id: string; itemIds: string[] }[] };
export type ProgressStat = { done: number; total: number; percent: number; complete: boolean };
export type CourseProgress = { overall: ProgressStat; modules: Record<string, ProgressStat> };
export type ProgressAggregate = {
  participants: number;
  averagePercent: number;
  moduleAverages: Record<string, number>;
};

function stat(done: number, total: number): ProgressStat {
  if (total === 0) return { done: 0, total: 0, percent: 0, complete: false };
  const complete = done === total;
  const raw = (done / total) * 100;
  // 100% só quando completo; >0% quando há algo concluído.
  const percent = complete ? 100 : Math.min(99, Math.max(done > 0 ? 1 : 0, Math.round(raw)));
  return { done, total, percent, complete };
}

export function computeProgress(shape: CourseShape, completed: ReadonlySet<string>): CourseProgress {
  const modules: Record<string, ProgressStat> = {};
  let done = 0;
  let total = 0;
  for (const m of shape.modules) {
    const d = m.itemIds.filter((id) => completed.has(id)).length;
    modules[m.id] = stat(d, m.itemIds.length);
    done += d;
    total += m.itemIds.length;
  }
  return { overall: stat(done, total), modules };
}

export function aggregateProgress(
  shape: CourseShape,
  completedByUser: ReadonlyMap<string, ReadonlySet<string>>,
  userIds: string[],
): ProgressAggregate {
  const moduleSums: Record<string, number> = Object.fromEntries(shape.modules.map((m) => [m.id, 0]));
  let overallSum = 0;
  const empty = new Set<string>();
  for (const userId of userIds) {
    const p = computeProgress(shape, completedByUser.get(userId) ?? empty);
    overallSum += p.overall.percent;
    for (const m of shape.modules) moduleSums[m.id] += p.modules[m.id].percent;
  }
  const n = userIds.length;
  const avg = (sum: number) => (n === 0 ? 0 : Math.round(sum / n));
  return {
    participants: n,
    averagePercent: avg(overallSum),
    moduleAverages: Object.fromEntries(Object.entries(moduleSums).map(([id, s]) => [id, avg(s)])),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/lib/progress.test.ts`
Expected: 11 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts
git commit -m "feat(progress): cálculo puro de progresso por módulo e geral"
```

---

### Task 4: Helper do YouTube

**Files:**
- Create: `src/lib/youtube.ts`, `src/lib/youtube.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function extractYouTubeId(input: string): string | null;
  export const youtubeUrlSchema: z.ZodType<string, string>; // entrada: URL; saída: ID
  export function youtubeEmbedUrl(id: string): string;
  ```

- [ ] **Step 1: Testes que falham**

Create `src/lib/youtube.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { extractYouTubeId, youtubeEmbedUrl, youtubeUrlSchema } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  test.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://www.youtube.com/watch?list=PL123&v=${ID}&si=abc`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=xyz&t=10`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?rel=0`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}?feature=share`,
    `https://www.youtube.com/live/${ID}`,
    `youtube.com/watch?v=${ID}`,
    `  https://youtu.be/${ID}  `,
    ID,
  ])("aceita %s", (url) => {
    expect(extractYouTubeId(url)).toBe(ID);
  });

  test.each([
    "",
    "   ",
    "não é link",
    "https://vimeo.com/123456",
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://evil.com/youtu.be/${ID}`,
    "https://www.youtube.com/watch?v=curto",
    "https://www.youtube.com/watch?v=comprido-demais-123",
    "https://www.youtube.com/channel/UC123",
    "javascript:alert(1)",
  ])("rejeita %s", (url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});

describe("youtubeUrlSchema", () => {
  test("transforma em ID", () => {
    expect(youtubeUrlSchema.parse(`https://youtu.be/${ID}`)).toBe(ID);
  });
  test("mensagem amigável em português", () => {
    const r = youtubeUrlSchema.safeParse("https://vimeo.com/1");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Cole um link válido do YouTube.");
  });
});

test("youtubeEmbedUrl usa youtube-nocookie", () => {
  expect(youtubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}?rel=0`);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/lib/youtube.test.ts` → Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementação**

Create `src/lib/youtube.ts`:

```ts
import { z } from "zod";

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const PATH_PREFIXES = ["embed", "shorts", "live", "v"];

export function extractYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (ID_RE.test(value)) return value;

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  let candidate: string | null = null;
  const segments = url.pathname.split("/").filter(Boolean);
  if (url.hostname.toLowerCase() === "youtu.be") {
    candidate = segments[0] ?? null;
  } else if (segments[0] === "watch") {
    candidate = url.searchParams.get("v");
  } else if (PATH_PREFIXES.includes(segments[0] ?? "")) {
    candidate = segments[1] ?? null;
  }
  return candidate && ID_RE.test(candidate) ? candidate : null;
}

export const youtubeUrlSchema = z.string().transform((value, ctx) => {
  const id = extractYouTubeId(value);
  if (!id) {
    ctx.addIssue({ code: "custom", message: "Cole um link válido do YouTube." });
    return z.NEVER;
  }
  return id;
});

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/lib/youtube.test.ts` → Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add src/lib/youtube.ts src/lib/youtube.test.ts
git commit -m "feat(youtube): extrair e validar ID de qualquer formato de URL"
```

---

### Task 5: Guarda de banco local e arquivo de usuários

**Files:**
- Create: `src/lib/db-guard.ts`, `src/lib/db-guard.test.ts`, `src/lib/users-file.ts`, `src/lib/users-file.test.ts`, `src/lib/email-address.ts`

**Interfaces:**
- Produces:
  ```ts
  // email-address.ts
  export function normalizeEmail(email: string): string; // trim + lowercase
  export const emailSchema: z.ZodType<string, string>;   // trim, lowercase, z.email()

  // db-guard.ts
  export function isLocalDatabaseUrl(url: string): boolean;   // lança Error se URL inválida
  export function describeDatabase(url: string): string;      // "host:porta/banco"
  export function assertLocalDatabase(url: string | undefined): void; // lança com mensagem pt-BR

  // users-file.ts
  export type UserRole = "admin" | "participant";
  export type UserEntry = { email: string; name: string; role: UserRole; active: boolean };
  export type ExistingUser = { email: string; name: string; role: string | null; banned: boolean | null };
  export function parseUsersFile(raw: unknown): { ok: true; users: UserEntry[] } | { ok: false; errors: string[] };
  export type UsersDiff = {
    create: UserEntry[];
    update: { entry: UserEntry; changes: string[] }[];
    unchanged: UserEntry[];
  };
  export function diffUsers(entries: UserEntry[], existing: ExistingUser[]): UsersDiff;
  ```

- [ ] **Step 1: Testes que falham**

Create `src/lib/db-guard.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { assertLocalDatabase, describeDatabase, isLocalDatabaseUrl } from "./db-guard";

describe("isLocalDatabaseUrl", () => {
  test.each([
    "postgresql://neuro:neuro@localhost:5432/neuro",
    "postgres://u:p@127.0.0.1/neuro",
    "postgresql://u:p@[::1]:5432/neuro",
  ])("local: %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(true));

  test.each([
    "postgresql://u:p@ep-cool-123.sa-east-1.aws.neon.tech/neondb?sslmode=require",
    "postgresql://u:p@10.0.0.5:5432/db",
    "postgresql://u:p@localhost.evil.com/db",
  ])("remoto: %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(false));

  test("URL inválida lança erro", () => {
    expect(() => isLocalDatabaseUrl("não é url")).toThrow();
  });
});

test("describeDatabase mostra host e banco, sem senha", () => {
  const d = describeDatabase("postgresql://user:segredo@ep-x.neon.tech:5432/neondb?sslmode=require");
  expect(d).toBe("ep-x.neon.tech:5432/neondb");
  expect(d).not.toContain("segredo");
});

describe("assertLocalDatabase", () => {
  test("passa em banco local", () => {
    expect(() => assertLocalDatabase("postgresql://a:b@localhost/db")).not.toThrow();
  });
  test("recusa banco remoto com mensagem clara", () => {
    expect(() => assertLocalDatabase("postgresql://a:b@ep-x.neon.tech/db")).toThrow(/banco remoto/i);
  });
  test("recusa DATABASE_URL ausente", () => {
    expect(() => assertLocalDatabase(undefined)).toThrow(/DATABASE_URL/);
  });
});
```

Create `src/lib/users-file.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { diffUsers, parseUsersFile } from "./users-file";

const valid = [
  { email: "loan.matteusz@gmail.com", name: "Loan", role: "admin", active: true },
  { email: "  Maria@Exemplo.com ", name: "Maria", role: "participant", active: true },
];

describe("parseUsersFile", () => {
  test("válido e normaliza e-mail", () => {
    const r = parseUsersFile(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.users[1].email).toBe("maria@exemplo.com");
  });

  test("não é array", () => {
    const r = parseUsersFile({ users: [] });
    expect(r).toEqual({ ok: false, errors: ["O arquivo deve conter uma lista (array) de usuários."] });
  });

  test("e-mail inválido indica a posição", () => {
    const r = parseUsersFile([{ email: "sem-arroba", name: "X", role: "participant", active: true }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/^Item 1 \(email\):/);
  });

  test("role inválida", () => {
    const r = parseUsersFile([{ email: "a@b.com", name: "X", role: "root", active: true }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/Item 1 \(role\)/);
  });

  test("campo faltando", () => {
    const r = parseUsersFile([{ email: "a@b.com", role: "participant", active: true }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/Item 1 \(name\)/);
  });

  test("duplicado ignorando maiúsculas/espaços", () => {
    const r = parseUsersFile([
      { email: "ana@x.com", name: "Ana", role: "participant", active: true },
      { email: " ANA@x.com", name: "Ana 2", role: "participant", active: true },
    ]);
    expect(r).toEqual({ ok: false, errors: ['E-mail duplicado "ana@x.com" nos itens 1 e 2.'] });
  });
});

describe("diffUsers", () => {
  const entries = [
    { email: "a@x.com", name: "A", role: "participant" as const, active: true },
    { email: "b@x.com", name: "B novo", role: "admin" as const, active: false },
    { email: "c@x.com", name: "C", role: "participant" as const, active: true },
  ];

  test("classifica create, update (com campos) e unchanged", () => {
    const diff = diffUsers(entries, [
      { email: "b@x.com", name: "B", role: "participant", banned: false },
      { email: "c@x.com", name: "C", role: "participant", banned: false },
      { email: "z@x.com", name: "Só no banco", role: "participant", banned: false },
    ]);
    expect(diff.create.map((u) => u.email)).toEqual(["a@x.com"]);
    expect(diff.update).toEqual([{ entry: entries[1], changes: ["name", "role", "active"] }]);
    expect(diff.unchanged.map((u) => u.email)).toEqual(["c@x.com"]);
  });

  test("usuário só no banco não aparece em nenhuma lista (nunca é apagado)", () => {
    const diff = diffUsers([], [{ email: "z@x.com", name: "Z", role: "participant", banned: false }]);
    expect(diff).toEqual({ create: [], update: [], unchanged: [] });
  });

  test("banned null no banco equivale a ativo", () => {
    const diff = diffUsers([entries[2]], [{ email: "c@x.com", name: "C", role: "participant", banned: null }]);
    expect(diff.unchanged).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/lib/db-guard.test.ts src/lib/users-file.test.ts` → Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementação**

Create `src/lib/email-address.ts`:

```ts
import { z } from "zod";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.email({ message: "Digite um e-mail válido." }));
```

Create `src/lib/db-guard.ts`:

```ts
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLocalDatabaseUrl(url: string): boolean {
  const { hostname } = new URL(url);
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

export function describeDatabase(url: string): string {
  const u = new URL(url);
  return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
}

export function assertLocalDatabase(url: string | undefined): void {
  if (!url) throw new Error("DATABASE_URL não definida.");
  if (!isLocalDatabaseUrl(url)) {
    throw new Error(
      `Recusado: o seed de desenvolvimento não roda em banco remoto (${describeDatabase(url)}). ` +
        "Use o seed só com o Postgres local do docker compose.",
    );
  }
}
```

Create `src/lib/users-file.ts`:

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/lib/db-guard.test.ts src/lib/users-file.test.ts` → Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db-guard.* src/lib/users-file.* src/lib/email-address.ts
git commit -m "feat(users): validação do users.json, diff idempotente e guarda de banco local"
```

---

### Task 6: E-mail (SMTP) e templates

**Files:**
- Create: `src/lib/escape-html.ts`, `src/lib/email-templates.ts`, `src/lib/email-templates.test.ts`, `src/lib/email.ts`

**Interfaces:**
- Consumes: `env` (Task 1), `siteConfig` (Task 2)
- Produces:
  ```ts
  // escape-html.ts
  export function escapeHtml(value: string): string;
  // email-templates.ts
  export type EmailContent = { subject: string; html: string; text: string };
  export function otpEmail(input: { otp: string; minutes: number }): EmailContent;
  export function inviteEmail(input: { name: string; loginUrl: string; psychologistName: string }): EmailContent;
  export function newContentEmail(input: { name: string; title: string; url: string; psychologistName: string }): EmailContent;
  // email.ts (server-only)
  export function isEmailConfigured(): boolean;
  export async function sendMail(input: { to: string } & EmailContent): Promise<void>;
  ```

- [ ] **Step 1: Testes que falham**

Create `src/lib/email-templates.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { escapeHtml } from "./escape-html";
import { inviteEmail, newContentEmail, otpEmail } from "./email-templates";

test("escapeHtml", () => {
  expect(escapeHtml(`<b>"Ana" & 'Bia'</b>`)).toBe("&lt;b&gt;&quot;Ana&quot; &amp; &#39;Bia&#39;&lt;/b&gt;");
});

describe("templates", () => {
  test("otp contém o código e a validade no html e no texto", () => {
    const e = otpEmail({ otp: "123456", minutes: 10 });
    expect(e.subject).toBe("Seu código de acesso: 123456");
    expect(e.html).toContain("123456");
    expect(e.text).toContain("10 minutos");
  });

  test("convite escapa nome com HTML e mantém texto literal na versão texto", () => {
    const e = inviteEmail({
      name: `<script>alert(1)</script> & "Zé"`,
      loginUrl: "https://neuro.vercel.app/login?email=ze%40x.com",
      psychologistName: "Dra. <i>X</i>",
    });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).not.toContain("<i>X</i>");
    expect(e.text).toContain(`<script>alert(1)</script> & "Zé"`);
    expect(e.html).toContain('href="https://neuro.vercel.app/login?email=ze%40x.com"');
  });

  test("aviso de novo conteúdo escapa o título", () => {
    const e = newContentEmail({ name: "Ana", title: "A & B <c>", url: "https://x/course/1", psychologistName: "P" });
    expect(e.subject).toBe("Novo conteúdo no Neuro Suporte: A & B <c>");
    expect(e.html).toContain("A &amp; B &lt;c&gt;");
  });

  test("todos têm o aviso ético", () => {
    for (const e of [
      otpEmail({ otp: "1", minutes: 10 }),
      inviteEmail({ name: "a", loginUrl: "https://x", psychologistName: "p" }),
      newContentEmail({ name: "a", title: "t", url: "https://x", psychologistName: "p" }),
    ]) {
      expect(e.text).toContain("não substitui acompanhamento profissional individual");
    }
  });

  test("URL com aspas/javascript é recusada", () => {
    expect(() => inviteEmail({ name: "a", loginUrl: 'javascript:alert(1)', psychologistName: "p" })).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/lib/email-templates.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementação**

Create `src/lib/escape-html.ts`:

```ts
const MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => MAP[c]);
}
```

Create `src/lib/email-templates.ts`:

```ts
import { siteConfig } from "@/config/site";
import { escapeHtml } from "./escape-html";

export type EmailContent = { subject: string; html: string; text: string };

function safeUrl(url: string): string {
  const u = new URL(url);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("URL inválida para e-mail");
  return escapeHtml(u.toString());
}

function layout(bodyHtml: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#FBF8F3;font-family:Arial,Helvetica,sans-serif;color:#26323B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border-radius:20px;padding:32px">
<tr><td style="font-size:22px;font-weight:bold;color:#1F7A66;padding-bottom:16px">${escapeHtml(siteConfig.name)}</td></tr>
<tr><td style="font-size:17px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="font-size:13px;color:#5B6670;padding-top:24px">${escapeHtml(siteConfig.ethicsNotice)}</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#1F7A66;color:#FFFFFF;text-decoration:none;padding:14px 24px;border-radius:12px;display:inline-block;font-weight:bold">${escapeHtml(label)}</a></p>`;
}

export function otpEmail({ otp, minutes }: { otp: string; minutes: number }): EmailContent {
  return {
    subject: `Seu código de acesso: ${otp}`,
    html: layout(
      `<p>Use este código para entrar:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${escapeHtml(otp)}</p><p>Ele vale por ${minutes} minutos. Se não foi você que pediu, pode ignorar este e-mail.</p>`,
    ),
    text: `Seu código de acesso ao ${siteConfig.name}: ${otp}\nEle vale por ${minutes} minutos.\n\n${siteConfig.ethicsNotice}`,
  };
}

export function inviteEmail({ name, loginUrl, psychologistName }: { name: string; loginUrl: string; psychologistName: string }): EmailContent {
  const href = safeUrl(loginUrl);
  return {
    subject: `Seu acesso ao ${siteConfig.name} está pronto`,
    html: layout(
      `<p>Olá, ${escapeHtml(name)}!</p><p>${escapeHtml(psychologistName)} convidou você para o curso ${escapeHtml(siteConfig.name)}. É bem simples entrar:</p><ol><li>Abra o site e digite o seu e-mail.</li><li>Digite o código que chegar no seu e-mail. Não precisa de senha.</li></ol>${button(href, "Entrar no curso")}<p>Siga no seu ritmo — os conteúdos ficam liberados desde o primeiro acesso.</p>`,
    ),
    text: `Olá, ${name}!\n\n${psychologistName} convidou você para o curso ${siteConfig.name}.\n1. Abra ${loginUrl} e digite o seu e-mail.\n2. Digite o código que chegar no seu e-mail. Não precisa de senha.\n\n${siteConfig.ethicsNotice}`,
  };
}

export function newContentEmail({ name, title, url, psychologistName }: { name: string; title: string; url: string; psychologistName: string }): EmailContent {
  const href = safeUrl(url);
  return {
    subject: `Novo conteúdo no ${siteConfig.name}: ${title}`,
    html: layout(
      `<p>Olá, ${escapeHtml(name)}!</p><p>${escapeHtml(psychologistName)} publicou um novo conteúdo: <strong>${escapeHtml(title)}</strong>.</p>${button(href, "Ver conteúdo")}<p>Quando for possível para você, sem pressa.</p>`,
    ),
    text: `Olá, ${name}!\n\n${psychologistName} publicou um novo conteúdo: ${title}.\n${url}\n\n${siteConfig.ethicsNotice}`,
  };
}
```

Create `src/lib/email.ts`:

```ts
import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import type { EmailContent } from "./email-templates";

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text }: { to: string } & EmailContent): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP não configurado.");
    console.info(`\n[email:dev] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
    return;
  }
  await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/lib/email-templates.test.ts` → Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add src/lib/escape-html.ts src/lib/email-templates.* src/lib/email.ts
git commit -m "feat(email): envio SMTP com nodemailer e templates acolhedores com escape de HTML"
```

---

### Task 7: Autenticação, gate de convite e proteção de rotas

**Files:**
- Create: `src/lib/login-gate.ts`, `src/lib/login-gate.test.ts`, `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`, `src/proxy.ts`, `src/app/api/auth/[...all]/route.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `normalizeEmail` (Task 5), `sendMail`, `otpEmail` (Task 6), `siteConfig`
- Produces:
  ```ts
  // login-gate.ts
  export type LoginGateResult = "ok" | "NOT_INVITED" | "ACCESS_DISABLED";
  export function loginGate(user: { banned: boolean | null } | null): LoginGateResult;
  export const LOGIN_ERROR_MESSAGES: Record<Exclude<LoginGateResult, "ok"> | "BANNED_USER" | "INVALID_OTP" | "TOO_MANY_REQUESTS" | "UNKNOWN", string>;
  // auth.ts
  export const auth: ReturnType<typeof betterAuth>;
  // auth-client.ts
  export const authClient; // createAuthClient com emailOTPClient + adminClient
  // session.ts
  export type SessionUser = { id: string; name: string; email: string; role: "admin" | "participant" };
  export async function getSessionUser(): Promise<SessionUser | null>;
  export async function requireUser(): Promise<SessionUser>;   // redirect("/login") se não logado/desativado
  export async function requireAdmin(): Promise<SessionUser>;  // redirect("/course") se não admin
  ```

- [ ] **Step 1: Teste que falha**

Create `src/lib/login-gate.test.ts`:

```ts
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
```

Run: `pnpm test src/lib/login-gate.test.ts` → Expected: FAIL.

- [ ] **Step 2: `login-gate.ts`**

```ts
export type LoginGateResult = "ok" | "NOT_INVITED" | "ACCESS_DISABLED";

export function loginGate(user: { banned: boolean | null } | null): LoginGateResult {
  if (!user) return "NOT_INVITED";
  if (user.banned) return "ACCESS_DISABLED";
  return "ok";
}

const disabled = "Seu acesso está pausado no momento. Fale com a psicóloga para retomar.";

// "{psychologist}" é trocado pelo nome em SiteSettings na tela de login.
export const LOGIN_ERROR_MESSAGES = {
  NOT_INVITED: "Este e-mail ainda não tem acesso. Fale com {psychologist} para receber seu convite.",
  ACCESS_DISABLED: disabled,
  BANNED_USER: disabled,
  INVALID_OTP: "Código incorreto ou expirado. Confira o e-mail ou peça um novo código.",
  TOO_MANY_REQUESTS: "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
  UNKNOWN: "Não conseguimos continuar agora. Tente de novo em instantes.",
} as const;
```

Run: `pnpm test src/lib/login-gate.test.ts` → Expected: PASS.

- [ ] **Step 3: `src/lib/auth.ts`**

```ts
import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP } from "better-auth/plugins";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { otpEmail } from "@/lib/email-templates";
import { normalizeEmail } from "@/lib/email-address";
import { loginGate } from "@/lib/login-gate";

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  session: { expiresIn: siteConfig.sessionDays * DAY, updateAge: DAY },
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 5 },
    },
  },
  advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] } },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/send-verification-otp") return;
      const email = normalizeEmail(String(ctx.body?.email ?? ""));
      const user = await prisma.user.findUnique({ where: { email }, select: { banned: true } });
      const gate = loginGate(user);
      if (gate !== "ok") throw new APIError("FORBIDDEN", { message: gate, code: gate });
    }),
  },
  plugins: [
    emailOTP({
      disableSignUp: true,
      otpLength: 6,
      expiresIn: siteConfig.otpMinutes * 60,
      async sendVerificationOTP({ email, otp }) {
        if (process.env.NODE_ENV !== "production") console.info(`[auth:dev] OTP para ${email}: ${otp}`);
        // Aguardado de propósito: em serverless um envio solto pode ser interrompido.
        await sendMail({ to: email, ...otpEmail({ otp, minutes: siteConfig.otpMinutes }) });
      },
    }),
    admin({ defaultRole: "participant", adminRoles: ["admin"] }),
    nextCookies(),
  ],
});
```

Se `admin({ adminRoles: ["admin"] })` lançar "Invalid admin roles", remova `adminRoles` (o padrão já é `["admin"]`). Confira os nomes de opção (`advanced.ipAddress.ipAddressHeaders`, `APIError` com `code`) com o MCP context7 (`/better-auth/better-auth`) se o TypeScript reclamar.

- [ ] **Step 4: Cliente, rota e sessão**

Create `src/lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [emailOTPClient(), adminClient()] });
```

Create `src/app/api/auth/[...all]/route.ts`:

```ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

Create `src/lib/session.ts`:

```ts
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; name: string; email: string; role: "admin" | "participant" };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string | null; banned?: boolean | null };
  if (u.banned) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role === "admin" ? "admin" : "participant" };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/course");
  return user;
}
```

- [ ] **Step 5: `src/proxy.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/course/:path*", "/account/:path*", "/admin/:path*"] };
```

- [ ] **Step 6: Verificar tipos e build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: sem erros (ainda sem páginas próprias).

- [ ] **Step 7: Teste de ponta a ponta do gate (manual, com curl)**

```bash
docker compose up -d
pnpm dev &   # aguarde "Ready"
docker compose exec postgres psql -U neuro -c "insert into \"user\" (id,name,email,\"emailVerified\",\"createdAt\",\"updatedAt\",role,banned) values ('t1','Teste','teste@x.com',false,now(),now(),'participant',false);"
curl -s -X POST localhost:3000/api/auth/email-otp/send-verification-otp -H 'content-type: application/json' -H 'origin: http://localhost:3000' -d '{"email":"naoexiste@x.com","type":"sign-in"}'
curl -s -X POST localhost:3000/api/auth/email-otp/send-verification-otp -H 'content-type: application/json' -H 'origin: http://localhost:3000' -d '{"email":" Teste@X.com ","type":"sign-in"}'
```

Expected: 1º → JSON com `"code":"NOT_INVITED"` (HTTP 403). 2º → `{"success":true}` e o console do `pnpm dev` mostra `[auth:dev] OTP para teste@x.com: ######`.
Depois: `docker compose exec postgres psql -U neuro -c "delete from \"user\" where id='t1';"` e pare o `pnpm dev`.

Se o 2º falhar por e-mail com maiúsculas, o Better Auth não normalizou antes do hook: garanta que o cliente (Task 9) envia `normalizeEmail(email)` e mantenha a normalização no hook.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(auth): login por código só para convidados, sessão de 60 dias e proteção de rotas"
```

---
## Fase C — Interface base e área do participante

> Antes da Task 8, invoque o skill `frontend-design:frontend-design` (regra 4 do CLAUDE.md) e aplique-o dentro das decisões já fechadas na spec §11 (paleta, fontes, forma). Ele refina, não substitui, os tokens abaixo.

### Task 8: Design system, layout raiz e componentes de marca

**Files:**
- Create: `public/brand/logo.png`, `src/app/icon.png`, `src/lib/module-colors.ts`, `src/components/brand/logo.tsx`, `src/components/brand/site-footer.tsx`, `src/components/brand/module-marker.tsx`, `src/components/course/progress-bar.tsx`
- Modify: `src/app/globals.css` (substituir), `src/app/layout.tsx` (substituir), `src/app/page.tsx` (remover — a landing vem na Task 19 em `(public)`)

**Interfaces:**
- Produces:
  ```ts
  // module-colors.ts
  export const MODULE_COLORS: readonly ["coral", "amber", "mint", "lavender", "pink"];
  export type ModuleColor = (typeof MODULE_COLORS)[number];
  export function moduleColor(index: number): ModuleColor;
  // components
  export function Logo(props: { className?: string; priority?: boolean }): JSX.Element;
  export function SiteFooter(props: { psychologistName: string; crp: string }): JSX.Element;
  export function ModuleMarker(props: { color: ModuleColor; size?: "sm" | "md" | "lg"; done?: boolean }): JSX.Element;
  export function ProgressBar(props: { percent: number; label: string; color?: ModuleColor | "primary" }): JSX.Element;
  ```
  Classes utilitárias geradas pelos tokens: `bg-background`, `bg-surface`, `text-ink`, `text-muted-foreground`, `border-border`, `bg-primary`, `bg-primary-soft`, `bg-coral-soft`, `text-coral`, … (uma dupla por cor de módulo), `font-heading`, `font-sans`, `rounded-card`.

- [ ] **Step 1: Assets**

```bash
mkdir -p public/brand
cp assets/logo.png public/brand/logo.png
cp assets/logo.png src/app/icon.png
rm -f src/app/favicon.ico src/app/page.tsx public/*.svg
```

- [ ] **Step 2: `src/app/globals.css` (substituir inteiro)**

```css
@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";

:root {
  --background: #fbf8f3;
  --foreground: #26323b;
  --card: #ffffff;
  --card-foreground: #26323b;
  --popover: #ffffff;
  --popover-foreground: #26323b;
  --primary: #1f7a66;
  --primary-foreground: #ffffff;
  --secondary: #f3eee6;
  --secondary-foreground: #26323b;
  --muted: #f3eee6;
  --muted-foreground: #5b6670;
  --accent: #ddf3ec;
  --accent-foreground: #17594b;
  --destructive: #b3261e;
  --border: #ece5da;
  --input: #ddd5c8;
  --ring: #1f7a66;
  --radius: 0.875rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-ink: var(--foreground);
  --color-surface: var(--card);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-soft: #ddf3ec;
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-coral: #b2432c;
  --color-coral-soft: #fde5df;
  --color-amber: #8a5a00;
  --color-amber-soft: #fcf0d2;
  --color-mint: #1f7a66;
  --color-mint-soft: #ddf3ec;
  --color-lavender: #5b48a8;
  --color-lavender-soft: #ece8fa;
  --color-pink: #a8325f;
  --color-pink-soft: #fce4ee;

  --font-sans: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-heading-family), ui-rounded, system-ui, sans-serif;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-card: 1.25rem;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    font-size: 106.25%; /* 17px */
  }
  @media (min-width: 768px) {
    html {
      font-size: 112.5%; /* 18px */
    }
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
    line-height: 1.6;
  }
  h1, h2, h3, h4 {
    @apply font-heading text-ink;
    line-height: 1.25;
  }
  :focus-visible {
    @apply outline-2 outline-offset-2 outline-ring;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Mantenha qualquer bloco extra que o `shadcn init` tenha acrescentado e que componentes instalados exijam (ex.: `@custom-variant dark` pode ser removido — tema só claro).

- [ ] **Step 3: Verificar contraste AA dos pares de texto**

Create `scripts/contrast.mjs` (script de verificação, não vai para produção):

```js
const pairs = [
  ["ink on background", "#26323b", "#fbf8f3"],
  ["muted on background", "#5b6670", "#fbf8f3"],
  ["muted on surface", "#5b6670", "#ffffff"],
  ["white on primary", "#ffffff", "#1f7a66"],
  ["coral on coral-soft", "#b2432c", "#fde5df"],
  ["amber on amber-soft", "#8a5a00", "#fcf0d2"],
  ["mint on mint-soft", "#1f7a66", "#ddf3ec"],
  ["lavender on lavender-soft", "#5b48a8", "#ece8fa"],
  ["pink on pink-soft", "#a8325f", "#fce4ee"],
];
const lum = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
let fail = false;
for (const [name, fg, bg] of pairs) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  const ratio = (a + 0.05) / (b + 0.05);
  const ok = ratio >= 4.5;
  if (!ok) fail = true;
  console.log(`${ok ? "OK  " : "FAIL"} ${ratio.toFixed(2)}  ${name}`);
}
process.exit(fail ? 1 : 0);
```

Run: `node scripts/contrast.mjs`
Expected: todas as linhas `OK`. Se alguma der `FAIL`, escureça a cor de texto daquele par (em passos de ~6% de luminosidade) em `globals.css` **e** neste script, e rode de novo até passar.

- [ ] **Step 4: `src/lib/module-colors.ts`**

```ts
export const MODULE_COLORS = ["coral", "amber", "mint", "lavender", "pink"] as const;
export type ModuleColor = (typeof MODULE_COLORS)[number];

export function moduleColor(index: number): ModuleColor {
  return MODULE_COLORS[((index % MODULE_COLORS.length) + MODULE_COLORS.length) % MODULE_COLORS.length];
}

// Classes completas (o Tailwind só gera classes que aparecem literalmente no código).
export const MODULE_COLOR_CLASSES: Record<ModuleColor, { soft: string; strong: string; fill: string }> = {
  coral: { soft: "bg-coral-soft", strong: "text-coral", fill: "bg-coral" },
  amber: { soft: "bg-amber-soft", strong: "text-amber", fill: "bg-amber" },
  mint: { soft: "bg-mint-soft", strong: "text-mint", fill: "bg-mint" },
  lavender: { soft: "bg-lavender-soft", strong: "text-lavender", fill: "bg-lavender" },
  pink: { soft: "bg-pink-soft", strong: "text-pink", fill: "bg-pink" },
};
```

- [ ] **Step 5: Componentes de marca**

Create `src/components/brand/logo.tsx`:

```tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Neuro Suporte"
      width={858}
      height={768}
      priority={priority}
      className={cn("h-10 w-auto", className)}
    />
  );
}
```

(Confira a largura/altura reais com `file public/brand/logo.png` e ajuste `width`/`height`.)

Create `src/components/brand/module-marker.tsx`:

```tsx
import { Check } from "lucide-react";
import { MODULE_COLOR_CLASSES, type ModuleColor } from "@/lib/module-colors";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-5 rounded-md", md: "size-8 rounded-lg", lg: "size-12 rounded-xl" };

export function ModuleMarker({ color, size = "md", done = false }: { color: ModuleColor; size?: "sm" | "md" | "lg"; done?: boolean }) {
  const c = MODULE_COLOR_CLASSES[color];
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center", SIZES[size], done ? c.fill : c.soft)}>
      {done && <Check className="size-3/5 text-white" strokeWidth={3} />}
    </span>
  );
}
```

Create `src/components/course/progress-bar.tsx`:

```tsx
import { MODULE_COLOR_CLASSES, type ModuleColor } from "@/lib/module-colors";
import { cn } from "@/lib/utils";

export function ProgressBar({ percent, label, color = "primary" }: { percent: number; label: string; color?: ModuleColor | "primary" }) {
  const fill = color === "primary" ? "bg-primary" : MODULE_COLOR_CLASSES[color].fill;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${percent}%` }} />
    </div>
  );
}
```

Create `src/components/brand/site-footer.tsx`:

```tsx
import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter({ psychologistName, crp }: { psychologistName: string; crp: string }) {
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto max-w-5xl space-y-2 px-4 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-ink">{siteConfig.ethicsNotice}</p>
        <p>
          {psychologistName} · {crp}
        </p>
        <p>
          <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
            Política de privacidade
          </Link>
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: `src/app/layout.tsx` (substituir)**

```tsx
import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import "./globals.css";

const heading = Nunito({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading-family" });
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.defaults.courseSubtitle,
};

export const viewport: Viewport = { themeColor: "#fbf8f3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
```

Se `Atkinson_Hyperlegible_Next` não existir no `next/font/google` instalado (`grep -c "Atkinson_Hyperlegible_Next" node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts` → 0), use `Atkinson_Hyperlegible` com `weight: ["400", "700"]`.

- [ ] **Step 7: Verificar**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: sem erros. (`pnpm build` falha até existir uma página raiz — isso é resolvido na Task 9/19; não crie página provisória.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): tokens de cor do logo, tipografia acessível e componentes de marca"
```

---

### Task 9: Telas de login (e-mail → código)

**Files:**
- Create: `src/data/settings.ts`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/_components/email-form.tsx`, `src/app/(auth)/login/verify/page.tsx`, `src/app/(auth)/login/verify/_components/code-form.tsx`, `src/app/(public)/page.tsx` (provisória mínima, substituída na Task 19)

**Interfaces:**
- Consumes: `authClient` (Task 7), `LOGIN_ERROR_MESSAGES` (Task 7), `normalizeEmail` (Task 5), `getSessionUser` (Task 7), `Logo` (Task 8)
- Produces:
  ```ts
  // data/settings.ts (server-only)
  import type { JSONContent } from "@tiptap/core";
  export type SiteSettingsView = {
    courseTitle: string; courseSubtitle: string; aboutCourse: JSONContent; audience: JSONContent; learnings: JSONContent;
    psychologistName: string; crp: string; bio: JSONContent; approach: JSONContent; photoKey: string | null; contactUrl: string;
  };
  export const getSiteSettings: () => Promise<SiteSettingsView>; // cache(); cria a linha id=1 com os defaults se faltar
  ```

- [ ] **Step 1: `src/data/settings.ts`**

```ts
import "server-only";
import { cache } from "react";
import type { JSONContent } from "@tiptap/core";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/prisma";

export type SiteSettingsView = {
  courseTitle: string;
  courseSubtitle: string;
  aboutCourse: JSONContent;
  audience: JSONContent;
  learnings: JSONContent;
  psychologistName: string;
  crp: string;
  bio: JSONContent;
  approach: JSONContent;
  photoKey: string | null;
  contactUrl: string;
};

export const getSiteSettings = cache(async (): Promise<SiteSettingsView> => {
  const row = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...siteConfig.defaults },
  });
  return {
    courseTitle: row.courseTitle,
    courseSubtitle: row.courseSubtitle,
    aboutCourse: row.aboutCourse as JSONContent,
    audience: row.audience as JSONContent,
    learnings: row.learnings as JSONContent,
    psychologistName: row.psychologistName,
    crp: row.crp,
    bio: row.bio as JSONContent,
    approach: row.approach as JSONContent,
    photoKey: row.photoKey,
    contactUrl: row.contactUrl,
  };
});
```

- [ ] **Step 2: Layout de autenticação**

Create `src/app/(auth)/layout.tsx`:

```tsx
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/brand/site-footer";
import { getSiteSettings } from "@/data/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8" aria-label="Voltar para a página inicial">
          <Logo className="h-16" priority />
        </Link>
        <div className="w-full max-w-sm rounded-card border bg-surface p-6 shadow-sm sm:p-8">{children}</div>
      </main>
      <SiteFooter psychologistName={settings.psychologistName} crp={settings.crp} />
    </div>
  );
}
```

- [ ] **Step 3: Página e formulário de e-mail**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/data/settings";
import { getSessionUser } from "@/lib/session";
import { EmailForm } from "./_components/email-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/course");
  const [{ email }, settings] = await Promise.all([searchParams, getSiteSettings()]);
  return (
    <>
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-2 text-muted-foreground">Digite o seu e-mail. Vamos enviar um código para você entrar — sem senha.</p>
      <EmailForm defaultEmail={email ?? ""} psychologistName={settings.psychologistName} contactUrl={settings.contactUrl} />
    </>
  );
}
```

Create `src/app/(auth)/login/_components/email-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/email-address";
import { LOGIN_ERROR_MESSAGES } from "@/lib/login-gate";

type ErrorKey = keyof typeof LOGIN_ERROR_MESSAGES;

export function EmailForm({ defaultEmail, psychologistName, contactUrl }: { defaultEmail: string; psychologistName: string; contactUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = normalizeEmail(email);
    setPending(true);
    setError(null);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email: value, type: "sign-in" });
    setPending(false);
    if (err) {
      const code = (err.code ?? (err.status === 429 ? "TOO_MANY_REQUESTS" : "UNKNOWN")) as ErrorKey;
      setError(code in LOGIN_ERROR_MESSAGES ? code : "UNKNOWN");
      return;
    }
    router.push(`/login/verify?email=${encodeURIComponent(value)}`);
  }

  const showContact = error === "NOT_INVITED" || error === "ACCESS_DISABLED" || error === "BANNED_USER";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 text-base"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "email-error" : undefined}
        />
      </div>
      {error && (
        <div id="email-error" role="alert" className="rounded-xl bg-coral-soft p-3 text-sm text-coral">
          <p>{LOGIN_ERROR_MESSAGES[error].replace("{psychologist}", psychologistName)}</p>
          {showContact && (
            <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-bold underline underline-offset-4">
              Falar com {psychologistName}
            </a>
          )}
        </div>
      )}
      <Button type="submit" className="h-12 w-full text-base" disabled={pending || !email.trim()}>
        {pending ? "Enviando…" : "Receber código"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Página e formulário do código**

Create `src/app/(auth)/login/verify/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CodeForm } from "./_components/code-form";

export const metadata: Metadata = { title: "Digite o código" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (!email) redirect("/login");
  return (
    <>
      <h1 className="text-2xl font-bold">Digite o código</h1>
      <p className="mt-2 text-muted-foreground">
        Enviamos um código de 6 números para <strong className="text-ink">{email}</strong>. Pode levar um minutinho para chegar — confira também a caixa de spam.
      </p>
      <CodeForm email={email} />
    </>
  );
}
```

Create `src/app/(auth)/login/verify/_components/code-form.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { LOGIN_ERROR_MESSAGES } from "@/lib/login-gate";

const RESEND_SECONDS = 30;

export function CodeForm({ email }: { email: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(code: string) {
    setPending(true);
    setMessage(null);
    const { data, error } = await authClient.signIn.emailOtp({ email, otp: code });
    if (error) {
      setPending(false);
      setOtp("");
      const key = (error.code ?? "INVALID_OTP") as keyof typeof LOGIN_ERROR_MESSAGES;
      setMessage((LOGIN_ERROR_MESSAGES[key] ?? LOGIN_ERROR_MESSAGES.INVALID_OTP).replace("{psychologist}", "a psicóloga"));
      return;
    }
    const role = (data?.user as { role?: string } | undefined)?.role;
    router.replace(role === "admin" ? "/admin" : "/course");
    router.refresh();
  }

  async function resend() {
    setCooldown(RESEND_SECONDS);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setMessage(error ? LOGIN_ERROR_MESSAGES.TOO_MANY_REQUESTS : "Enviamos um novo código.");
  }

  return (
    <div className="mt-6 space-y-5">
      <InputOTP
        maxLength={6}
        value={otp}
        onChange={(v) => {
          setOtp(v);
          if (v.length === 6) void verify(v);
        }}
        disabled={pending}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Código de 6 números"
        containerClassName="justify-center"
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, i) => (
            <InputOTPSlot key={i} index={i} className="size-12 text-xl" />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {message && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <Button className="h-12 w-full text-base" disabled={pending || otp.length < 6} onClick={() => verify(otp)}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Link href={`/login?email=${encodeURIComponent(email)}`} className="underline underline-offset-4">
          Trocar e-mail
        </Link>
        <button type="button" onClick={resend} disabled={cooldown > 0} className="min-h-11 underline underline-offset-4 disabled:no-underline disabled:opacity-60">
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Página raiz provisória (para o build passar)**

Create `src/app/(public)/page.tsx`:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Neuro Suporte</h1>
      <Link href="/login" className="mt-6 inline-block underline">Entrar</Link>
    </main>
  );
}
```

- [ ] **Step 6: Verificar de ponta a ponta**

```bash
pnpm build
docker compose up -d
pnpm dev
docker compose exec postgres psql -U neuro -c "insert into \"user\" (id,name,email,\"emailVerified\",\"createdAt\",\"updatedAt\",role,banned) values ('t1','Teste','teste@x.com',false,now(),now(),'participant',false);"
```

No navegador (`http://localhost:3000/login`, também em 360 px no DevTools):
1. `naoexiste@x.com` → mensagem "Este e-mail ainda não tem acesso. Fale com [Nome da Psicóloga]…" + link de contato.
2. `TESTE@x.com` → vai para `/login/verify?email=teste%40x.com`; o código aparece no terminal; digitar → vai para `/course` (404 por enquanto — ok).
3. Código errado → "Código incorreto ou expirado…".
4. `update "user" set banned=true where id='t1'` → tentar entrar → mensagem de acesso pausado.

Limpe: `delete from "user" where id='t1';`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(login): telas de e-mail e código com mensagens gentis para não convidados"
```

---

### Task 10: Seed de desenvolvimento

**Files:**
- Create: `prisma/seed.ts`, `scripts/lib/script-clients.ts`
- Modify: `package.json` (script `db:seed`)

**Interfaces:**
- Consumes: `assertLocalDatabase` (Task 5), `siteConfig` (Task 2)
- Produces:
  ```ts
  // scripts/lib/script-clients.ts — clientes para scripts Node (sem "server-only")
  export function createScriptPrisma(databaseUrl: string): PrismaClient;
  export function createScriptS3(): { client: S3Client; bucket: string };
  export function doc(...paragraphs: string[]): JSONContent;
  ```

- [ ] **Step 1: `scripts/lib/script-clients.ts`**

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { S3Client } from "@aws-sdk/client-s3";
import type { JSONContent } from "@tiptap/core";
import { PrismaClient } from "../../src/generated/prisma/client";

export function createScriptPrisma(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export function createScriptS3(): { client: S3Client; bucket: string } {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return { client, bucket: process.env.S3_BUCKET! };
}

export function doc(...paragraphs: string[]): JSONContent {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
  };
}
```

- [ ] **Step 2: `prisma/seed.ts`**

```ts
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
```

- [ ] **Step 3: Script no `package.json`**

Add to `"scripts"`: `"db:seed": "prisma db seed"`.

- [ ] **Step 4: Verificar**

```bash
pnpm db:seed
DATABASE_URL="postgresql://u:p@ep-x.neon.tech/db" pnpm exec tsx prisma/seed.ts; echo "exit=$?"
```

Expected: 1º → `Seed ok: 3 módulos, 9 conteúdos, 1 admin, 3 participantes.` e os PDFs aparecem no console do MinIO (`http://localhost:9001`, login `neuro`/`neuro-secret`, bucket `neuro-suporte/pdfs`). 2º → mensagem "Recusado: o seed de desenvolvimento não roda em banco remoto (ep-x.neon.tech/db)…" e `exit=1`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(seed): dados fictícios de desenvolvimento com bloqueio de banco remoto"
```

---

### Task 11: Dados do curso e home do participante

**Files:**
- Create: `src/data/course.ts`, `src/components/course/course-header.tsx`, `src/app/course/layout.tsx`, `src/app/course/page.tsx`

**Interfaces:**
- Consumes: `prisma`, `requireUser`, `computeProgress`, `getSiteSettings`, `Logo`, `SiteFooter`, `ModuleMarker`, `ProgressBar`, `moduleColor`
- Produces:
  ```ts
  // data/course.ts (server-only)
  export type OutlineItem = { id: string; title: string; type: "VIDEO" | "DOCUMENT" };
  export type OutlineModule = { id: string; title: string; description: string | null; items: OutlineItem[] };
  export type FlatItem = OutlineItem & { moduleId: string; moduleIndex: number };
  export const getCourseOutline: () => Promise<OutlineModule[]>;            // cache()
  export function toCourseShape(outline: OutlineModule[]): CourseShape;
  export function flattenOutline(outline: OutlineModule[]): FlatItem[];
  export async function getCompletedItemIds(userId: string): Promise<Set<string>>;
  export async function getContentItem(id: string): Promise<ContentItemFull | null>;
  export type ContentItemFull = { id: string; moduleId: string; type: "VIDEO" | "DOCUMENT"; title: string; body: JSONContent | null; youtubeId: string | null; pdfKey: string | null; pdfName: string | null; pdfSize: number | null; notifiedAt: Date | null };
  // components/course/course-header.tsx
  export function CourseHeader(props: { userName: string; isAdmin: boolean }): JSX.Element;
  ```

- [ ] **Step 1: `src/data/course.ts`**

```ts
import "server-only";
import { cache } from "react";
import type { JSONContent } from "@tiptap/core";
import { prisma } from "@/lib/prisma";
import type { CourseShape } from "@/lib/progress";

export type OutlineItem = { id: string; title: string; type: "VIDEO" | "DOCUMENT" };
export type OutlineModule = { id: string; title: string; description: string | null; items: OutlineItem[] };
export type FlatItem = OutlineItem & { moduleId: string; moduleIndex: number };
export type ContentItemFull = {
  id: string;
  moduleId: string;
  type: "VIDEO" | "DOCUMENT";
  title: string;
  body: JSONContent | null;
  youtubeId: string | null;
  pdfKey: string | null;
  pdfName: string | null;
  pdfSize: number | null;
  notifiedAt: Date | null;
};

export const getCourseOutline = cache(async (): Promise<OutlineModule[]> => {
  return prisma.module.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      items: { orderBy: { position: "asc" }, select: { id: true, title: true, type: true } },
    },
  });
});

export function toCourseShape(outline: OutlineModule[]): CourseShape {
  return { modules: outline.map((m) => ({ id: m.id, itemIds: m.items.map((i) => i.id) })) };
}

export function flattenOutline(outline: OutlineModule[]): FlatItem[] {
  return outline.flatMap((m, moduleIndex) => m.items.map((i) => ({ ...i, moduleId: m.id, moduleIndex })));
}

export async function getCompletedItemIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.contentProgress.findMany({ where: { userId }, select: { contentItemId: true } });
  return new Set(rows.map((r) => r.contentItemId));
}

export async function getContentItem(id: string): Promise<ContentItemFull | null> {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  return item ? { ...item, body: item.body as JSONContent | null } : null;
}
```

- [ ] **Step 2: Cabeçalho do participante**

Create `src/components/course/course-header.tsx`:

```tsx
import Link from "next/link";
import { CircleUser, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function CourseHeader({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/course" aria-label="Início do curso">
          <Logo className="h-9" />
        </Link>
        <nav className="flex items-center gap-1">
          {isAdmin && (
            <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-muted">
              <LayoutDashboard className="size-4" aria-hidden /> Painel
            </Link>
          )}
          <Link href="/account" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm hover:bg-muted">
            <CircleUser className="size-5" aria-hidden />
            <span className="max-w-32 truncate">{userName.split(" ")[0]}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Layout de `/course`**

Create `src/app/course/layout.tsx`:

```tsx
import { SiteFooter } from "@/components/brand/site-footer";
import { CourseHeader } from "@/components/course/course-header";
import { getSiteSettings } from "@/data/settings";
import { requireUser } from "@/lib/session";

export default async function CourseLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSiteSettings()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <CourseHeader userName={user.name} isAdmin={user.role === "admin"} />
      <div className="flex-1">{children}</div>
      <SiteFooter psychologistName={settings.psychologistName} crp={settings.crp} />
    </div>
  );
}
```

- [ ] **Step 4: Home `/course`**

Create `src/app/course/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ModuleMarker } from "@/components/brand/module-marker";
import { ProgressBar } from "@/components/course/progress-bar";
import { flattenOutline, getCompletedItemIds, getCourseOutline, toCourseShape } from "@/data/course";
import { getSiteSettings } from "@/data/settings";
import { moduleColor } from "@/lib/module-colors";
import { prisma } from "@/lib/prisma";
import { computeProgress } from "@/lib/progress";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Meu curso" };

export default async function CourseHome() {
  const user = await requireUser();
  const [outline, completed, settings, me] = await Promise.all([
    getCourseOutline(),
    getCompletedItemIds(user.id),
    getSiteSettings(),
    prisma.user.findUnique({ where: { id: user.id }, select: { lastContentItemId: true } }),
  ]);
  const progress = computeProgress(toCourseShape(outline), completed);
  const flat = flattenOutline(outline);
  const continueItem =
    flat.find((i) => i.id === me?.lastContentItemId) ?? flat.find((i) => !completed.has(i.id)) ?? flat[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <p className="text-muted-foreground">Olá, {user.name.split(" ")[0]}</p>
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{settings.courseTitle}</h1>

      <section aria-labelledby="progress-title" className="mt-6 rounded-card border bg-surface p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="progress-title" className="text-lg font-bold">Seu progresso</h2>
          <span className="text-2xl font-extrabold text-primary">{progress.overall.percent}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={progress.overall.percent} label="Progresso geral do curso" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {progress.overall.done} de {progress.overall.total} conteúdos concluídos
        </p>
        {progress.overall.complete ? (
          <p className="mt-4 rounded-xl bg-primary-soft p-4 text-accent-foreground">
            Você concluiu todo o curso. Obrigada por caminhar até aqui — os conteúdos continuam disponíveis sempre que quiser rever.
          </p>
        ) : (
          continueItem && (
            <Link
              href={`/course/${continueItem.id}`}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              {completed.size === 0 ? "Começar" : "Continuar de onde parei"} <ArrowRight className="size-4" aria-hidden />
            </Link>
          )
        )}
      </section>

      <section aria-labelledby="modules-title" className="mt-10">
        <h2 id="modules-title" className="text-xl font-bold">Módulos</h2>
        {outline.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Ainda não há conteúdos aqui. Volte em breve 💛</p>
        ) : (
          <ol className="mt-4 grid gap-4 sm:grid-cols-2">
            {outline.map((m, i) => {
              const p = progress.modules[m.id];
              const color = moduleColor(i);
              const first = m.items.find((it) => !completed.has(it.id)) ?? m.items[0];
              const body = (
                <>
                  <div className="flex items-start gap-3">
                    <ModuleMarker color={color} size="lg" done={p.complete} />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Módulo {i + 1}</p>
                      <h3 className="text-lg font-bold">{m.title}</h3>
                    </div>
                  </div>
                  {m.description && <p className="mt-3 text-muted-foreground">{m.description}</p>}
                  <div className="mt-4">
                    <ProgressBar percent={p.percent} color={color} label={`Progresso do módulo ${m.title}`} />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {m.items.length === 0 ? "Em breve" : `${p.done} de ${p.total} · ${p.percent}%`}
                    </p>
                  </div>
                </>
              );
              return (
                <li key={m.id}>
                  {first ? (
                    <Link href={`/course/${first.id}`} className="block h-full rounded-card border bg-surface p-5 transition-shadow hover:shadow-md">
                      {body}
                    </Link>
                  ) : (
                    <div className="h-full rounded-card border bg-surface p-5">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Verificar**

```bash
pnpm db:seed && pnpm dev
```

Entre como `carla.exemplo@example.com` (código no console). Expected: progresso geral 78% (7 de 9), módulos 1 e 2 com marcador preenchido (100%), módulo 3 com 33%; botão "Continuar de onde parei". Entre como `ana.exemplo@example.com`: 0% e botão "Começar". Teste em 360 px sem rolagem horizontal.

Run: `pnpm exec tsc --noEmit && pnpm lint` → sem erros.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(course): home do participante com progresso geral e por módulo"
```

---

### Task 12: Página de conteúdo, conclusão otimista e encorajamento

**Files:**
- Create: `src/lib/action-result.ts`, `src/lib/rich-text.ts`, `src/components/rich-text/extensions.ts`, `src/components/rich-text/render.tsx`, `src/components/rich-text/render.test.ts`, `src/components/course/youtube-embed.tsx`, `src/components/course/pdf-actions.tsx`, `src/components/course/course-sidebar.tsx`, `src/components/course/complete-button.tsx`, `src/app/course/actions.ts`, `src/app/course/[itemId]/page.tsx`

**Interfaces:**
- Consumes: Task 11 (`getCourseOutline`, `flattenOutline`, `getCompletedItemIds`, `getContentItem`, `toCourseShape`), `computeProgress`, `youtubeEmbedUrl`, `requireUser`, `moduleColor`
- Produces:
  ```ts
  // action-result.ts
  export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
  export const ok: <T = undefined>(data?: T) => ActionResult<T>;
  export const fail: (error: string, fieldErrors?: Record<string, string[]>) => ActionResult<never>;
  // rich-text
  export function isEmptyDoc(content: JSONContent | null | undefined): boolean; // src/lib/rich-text.ts
  export const richTextExtensions: Extensions;                  // usado também pelo editor (Task 14)
  export function RichText(props: { content: JSONContent | null; className?: string }): JSX.Element | null;
  // course/actions.ts
  export async function setItemCompleted(itemId: string, completed: boolean): Promise<ActionResult>;
  ```

- [ ] **Step 1: `src/lib/action-result.ts`**

```ts
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T = undefined>(data?: T): ActionResult<T> {
  return { ok: true, data: data as T };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}
```

- [ ] **Step 2: Rich text (render no servidor)**

Create `src/components/rich-text/extensions.ts`:

```ts
import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/core";

export const richTextExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    code: false,
    horizontalRule: false,
    link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
  }),
];
```

Create `src/lib/rich-text.ts` (puro; usado também pelas validações da Task 14):

```ts
import type { JSONContent } from "@tiptap/core";

export function isEmptyDoc(content: JSONContent | null | undefined): boolean {
  if (!content?.content?.length) return true;
  return content.content.every((n) => n.type === "paragraph" && !n.content?.length);
}
```

Create `src/components/rich-text/render.tsx`:

```tsx
import type { JSONContent } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { isEmptyDoc } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { richTextExtensions } from "./extensions";

export function RichText({ content, className }: { content: JSONContent | null; className?: string }) {
  if (!content || isEmptyDoc(content)) return null;
  const html = renderToHTMLString({ extensions: richTextExtensions, content });
  return (
    <div
      className={cn("prose prose-stone max-w-none prose-headings:font-heading prose-a:text-primary prose-p:leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

Teste de segurança rápido (Review Focus): create `src/components/rich-text/render.test.ts`:

```ts
import { expect, test } from "vitest";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { richTextExtensions } from "./extensions";

test("texto com HTML é escapado no render", () => {
  const html = renderToHTMLString({
    extensions: richTextExtensions,
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] }] },
  });
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});
```

Run: `pnpm test src/components/rich-text/render.test.ts` → Expected: PASS. (Se falhar, o renderer não escapa: troque para `generateHTML` de `@tiptap/html` e repita.)

Add `"src/components/**/*.test.ts"` ao `include` do `vitest.config.ts`.

- [ ] **Step 3: Vídeo e PDF**

Create `src/components/course/youtube-embed.tsx`:

```tsx
import { youtubeEmbedUrl } from "@/lib/youtube";

export function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card bg-ink/5">
      <iframe
        src={youtubeEmbedUrl(id)}
        title={`Vídeo: ${title}`}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
```

Create `src/components/course/pdf-actions.tsx`:

```tsx
import { Download, ExternalLink } from "lucide-react";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export function PdfActions({ itemId, name, size }: { itemId: string; name: string | null; size: number | null }) {
  const href = `/api/pdf/${itemId}`;
  const cls = "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 font-bold";
  return (
    <div className="rounded-card border bg-surface p-5">
      <p className="font-bold">{name ?? "Material em PDF"}</p>
      {size ? <p className="text-sm text-muted-foreground">PDF · {formatSize(size)}</p> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a href={href} target="_blank" rel="noopener" className={`${cls} bg-primary text-primary-foreground hover:bg-primary/90`}>
          <ExternalLink className="size-4" aria-hidden /> Abrir PDF
        </a>
        <a href={`${href}?download=1`} className={`${cls} border bg-background hover:bg-muted`}>
          <Download className="size-4" aria-hidden /> Baixar
        </a>
      </div>
      <iframe src={href} title={`Visualização: ${name ?? "PDF"}`} className="mt-5 hidden h-[75vh] w-full rounded-xl border lg:block" />
    </div>
  );
}
```

- [ ] **Step 4: Ação de concluir**

Create `src/app/course/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function setItemCompleted(itemId: string, completed: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ itemId: z.uuid(), completed: z.boolean() }).safeParse({ itemId, completed });
  if (!parsed.success) return fail("Conteúdo inválido.");

  const exists = await prisma.contentItem.count({ where: { id: itemId } });
  if (!exists) return fail("Este conteúdo não existe mais.");

  if (completed) {
    await prisma.contentProgress.upsert({
      where: { userId_contentItemId: { userId: user.id, contentItemId: itemId } },
      update: {},
      create: { userId: user.id, contentItemId: itemId },
    });
  } else {
    await prisma.contentProgress.deleteMany({ where: { userId: user.id, contentItemId: itemId } });
  }
  revalidatePath("/course", "layout");
  return ok();
}
```

- [ ] **Step 5: Botão de concluir com encorajamento**

Create `src/components/course/complete-button.tsx`:

```tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { setItemCompleted } from "@/app/course/actions";
import { computeProgress, type CourseShape } from "@/lib/progress";
import { cn } from "@/lib/utils";

type Props = {
  itemId: string;
  initialCompleted: boolean;
  completedIds: string[];
  shape: CourseShape;
  moduleId: string;
  moduleTitle: string;
  nextModuleFirstItem: { id: string; moduleTitle: string } | null;
};

export function CompleteButton({ itemId, initialCompleted, completedIds, shape, moduleId, moduleTitle, nextModuleFirstItem }: Props) {
  const [completed, setOptimistic] = useOptimistic(initialCompleted);
  const [pending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState<"module" | "course" | null>(null);

  function toggle() {
    const next = !completed;
    startTransition(async () => {
      setOptimistic(next);
      if (next) {
        const after = new Set(completedIds);
        after.add(itemId);
        const p = computeProgress(shape, after);
        setCelebrate(p.overall.complete ? "course" : p.modules[moduleId]?.complete ? "module" : null);
      } else {
        setCelebrate(null);
      }
      const res = await setItemCompleted(itemId, next);
      if (!res.ok) {
        setCelebrate(null);
        toast.error("Não conseguimos salvar agora. Tente de novo em instantes.");
      }
    });
  }

  return (
    <>
      {celebrate && (
        <div role="status" className="rounded-card bg-primary-soft p-5 text-accent-foreground">
          {celebrate === "course" ? (
            <p className="font-bold">Você concluiu todo o curso. Que bonito o seu caminho até aqui — os conteúdos continuam disponíveis sempre que quiser.</p>
          ) : (
            <>
              <p className="font-bold">Você concluiu “{moduleTitle}”. Cada passo conta — siga no seu ritmo.</p>
              {nextModuleFirstItem && (
                <Link href={`/course/${nextModuleFirstItem.id}`} className="mt-2 inline-block font-bold underline underline-offset-4">
                  Ir para “{nextModuleFirstItem.moduleTitle}”
                </Link>
              )}
            </>
          )}
        </div>
      )}
      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={completed}
          disabled={pending}
          className={cn(
            "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-bold transition-colors lg:w-auto",
            completed ? "border border-primary bg-primary-soft text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {completed ? <Check className="size-5" aria-hidden /> : <Circle className="size-5" aria-hidden />}
          {completed ? "Concluído — toque para desmarcar" : "Marcar como concluído"}
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Sidebar (desktop) e gaveta (celular)**

Create `src/components/course/course-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { CheckCircle2, FileText, ListTree, PlayCircle } from "lucide-react";
import { ModuleMarker } from "@/components/brand/module-marker";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { moduleColor } from "@/lib/module-colors";
import { cn } from "@/lib/utils";

type Outline = { id: string; title: string; items: { id: string; title: string; type: "VIDEO" | "DOCUMENT" }[] }[];

function Tree({ outline, currentId, completedIds }: { outline: Outline; currentId: string; completedIds: string[] }) {
  const done = new Set(completedIds);
  return (
    <nav aria-label="Conteúdos do curso">
      <ol className="space-y-6">
        {outline.map((m, mi) => (
          <li key={m.id}>
            <div className="flex items-center gap-2">
              <ModuleMarker color={moduleColor(mi)} size="sm" done={m.items.length > 0 && m.items.every((i) => done.has(i.id))} />
              <p className="font-heading font-bold">{m.title}</p>
            </div>
            <ol className="mt-2 space-y-1">
              {m.items.map((it) => {
                const Icon = done.has(it.id) ? CheckCircle2 : it.type === "VIDEO" ? PlayCircle : FileText;
                const current = it.id === currentId;
                return (
                  <li key={it.id}>
                    <Link
                      href={`/course/${it.id}`}
                      aria-current={current ? "page" : undefined}
                      className={cn("flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted", current && "bg-primary-soft font-bold text-accent-foreground")}
                    >
                      <Icon className={cn("size-4 shrink-0", done.has(it.id) ? "text-primary" : "text-muted-foreground")} aria-hidden />
                      <span className="sr-only">{done.has(it.id) ? "Concluído: " : it.type === "VIDEO" ? "Vídeo: " : "Documento: "}</span>
                      <span>{it.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CourseSidebar(props: { outline: Outline; currentId: string; completedIds: string[] }) {
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2">
          <Tree {...props} />
        </div>
      </aside>
      <div className="lg:hidden">
        <Drawer>
          <DrawerTrigger className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-surface px-4 text-sm font-bold">
            <ListTree className="size-4" aria-hidden /> Ver todos os conteúdos
          </DrawerTrigger>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle>Conteúdos do curso</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-8">
              <Tree {...props} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
```

- [ ] **Step 7: Página `/course/[itemId]`**

Create `src/app/course/[itemId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CompleteButton } from "@/components/course/complete-button";
import { CourseSidebar } from "@/components/course/course-sidebar";
import { PdfActions } from "@/components/course/pdf-actions";
import { YouTubeEmbed } from "@/components/course/youtube-embed";
import { RichText } from "@/components/rich-text/render";
import { flattenOutline, getCompletedItemIds, getContentItem, getCourseOutline, toCourseShape } from "@/data/course";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ itemId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { itemId } = await params;
  const item = await getContentItem(itemId);
  return { title: item?.title ?? "Conteúdo" };
}

export default async function ContentPage({ params }: Params) {
  const { itemId } = await params;
  const user = await requireUser();
  const [item, outline, completed] = await Promise.all([getContentItem(itemId), getCourseOutline(), getCompletedItemIds(user.id)]);
  if (!item) notFound();

  if (user.role === "participant") {
    after(() =>
      prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date(), lastContentItemId: item.id } }),
    );
  }

  const flat = flattenOutline(outline);
  const index = flat.findIndex((i) => i.id === item.id);
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : null;
  const moduleIndex = outline.findIndex((m) => m.id === item.moduleId);
  const mod = outline[moduleIndex];
  const nextModule = outline.slice(moduleIndex + 1).find((m) => m.items.length > 0);

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[18rem_1fr] lg:py-10">
      <CourseSidebar outline={outline} currentId={item.id} completedIds={[...completed]} />
      <article className="min-w-0 space-y-6">
        <header>
          <p className="text-sm text-muted-foreground">
            Módulo {moduleIndex + 1} · {mod?.title}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{item.title}</h1>
        </header>

        {item.type === "VIDEO" && item.youtubeId && <YouTubeEmbed id={item.youtubeId} title={item.title} />}
        <RichText content={item.body} />
        {item.type === "DOCUMENT" && item.pdfKey && <PdfActions itemId={item.id} name={item.pdfName} size={item.pdfSize} />}

        <CompleteButton
          itemId={item.id}
          initialCompleted={completed.has(item.id)}
          completedIds={[...completed]}
          shape={toCourseShape(outline)}
          moduleId={item.moduleId}
          moduleTitle={mod?.title ?? ""}
          nextModuleFirstItem={nextModule ? { id: nextModule.items[0].id, moduleTitle: nextModule.title } : null}
        />

        <nav aria-label="Navegação entre conteúdos" className="flex justify-between gap-3 border-t pt-6">
          {prev ? (
            <Link href={`/course/${prev.id}`} className="inline-flex min-h-11 max-w-[48%] items-center gap-1 text-sm hover:underline">
              <ChevronLeft className="size-4 shrink-0" aria-hidden /> <span className="truncate">{prev.title}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/course/${next.id}`} className="inline-flex min-h-11 max-w-[48%] items-center gap-1 text-right text-sm font-bold hover:underline">
              <span className="truncate">{next.title}</span> <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ) : <span />}
        </nav>
      </article>
    </main>
  );
}
```

Se `params.itemId` não for UUID válido, `findUnique` do Prisma lança erro em coluna `uuid`? A coluna é `String` (texto), então retorna `null` → `notFound()`. Confirme abrindo `/course/abc` → página 404.

- [ ] **Step 8: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Manual (`pnpm db:seed && pnpm dev`, logado como `bruno.exemplo@example.com`):
1. Abra o 3º conteúdo (vídeo do módulo 2): player 16:9 com `youtube-nocookie.com`, texto abaixo.
2. Marque o 4º, 5º e 6º como concluídos → no 6º aparece "Você concluiu “Rotina e previsibilidade”…" + link para o módulo 3.
3. Desmarque um → mensagem some; recarregue → estado persistido.
4. 360 px: botão "Marcar como concluído" fixo no rodapé; "Ver todos os conteúdos" abre gaveta.
5. `docker compose exec postgres psql -U neuro -c "select \"lastSeenAt\", \"lastContentItemId\" from \"user\" where email='bruno.exemplo@example.com'"` → atualizados.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(course): página de conteúdo com vídeo, documento, conclusão otimista e encorajamento"
```

---

### Task 13: Arquivos privados (S3/MinIO/R2)

**Files:**
- Create: `src/lib/s3.ts`, `src/lib/pdf-upload.ts`, `src/lib/pdf-upload.test.ts`, `src/app/admin/upload-actions.ts`, `src/app/api/pdf/[itemId]/route.ts`, `src/app/api/photo/route.ts`

**Interfaces:**
- Consumes: `env`, `requireAdmin`, `getSessionUser`, `prisma`, `siteConfig`, `ActionResult`
- Produces:
  ```ts
  // pdf-upload.ts (puro)
  export type UploadKind = "pdf" | "image";
  export type UploadRequest = { fileName: string; size: number; contentType: string };
  export function validateUploadRequest(req: UploadRequest, kind: UploadKind): string | null; // mensagem pt-BR ou null
  export function buildObjectKey(kind: UploadKind, contentType: string, uuid: string): string;  // "pdfs/<uuid>.pdf" | "images/<uuid>.<ext>"
  export function checkUploadedObject(head: { contentType?: string; contentLength?: number } | null, kind: UploadKind): string | null;
  // s3.ts (server-only)
  export async function createUploadUrl(key: string, contentType: string, contentLength: number): Promise<string>;
  export async function createDownloadUrl(key: string, opts?: { fileName?: string; download?: boolean }): Promise<string>;
  export async function headObject(key: string): Promise<{ contentType?: string; contentLength?: number } | null>;
  export async function deleteObject(key: string): Promise<void>; // nunca lança; loga
  // upload-actions.ts
  export async function requestUpload(kind: UploadKind, req: UploadRequest): Promise<ActionResult<{ key: string; url: string }>>;
  ```

- [ ] **Step 1: Testes que falham**

Create `src/lib/pdf-upload.test.ts`:

```ts
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
```

Run: `pnpm test src/lib/pdf-upload.test.ts` → Expected: FAIL.

- [ ] **Step 2: `src/lib/pdf-upload.ts`**

```ts
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
```

Run: `pnpm test src/lib/pdf-upload.test.ts` → Expected: PASS.

- [ ] **Step 3: `src/lib/s3.ts`**

```ts
import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

const EXPIRES = 300;

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
});

export function createUploadUrl(key: string, contentType: string, contentLength: number): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType, ContentLength: contentLength }),
    { expiresIn: EXPIRES },
  );
}

export function createDownloadUrl(key: string, opts: { fileName?: string; download?: boolean } = {}): Promise<string> {
  const name = (opts.fileName ?? "arquivo").replace(/["\\\r\n]/g, "");
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `${opts.download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,
    }),
    { expiresIn: EXPIRES },
  );
}

export async function headObject(key: string): Promise<{ contentType?: string; contentLength?: number } | null> {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return { contentType: r.ContentType, contentLength: r.ContentLength };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  } catch (e) {
    console.error(`[s3] falha ao remover ${key}`, e);
  }
}
```

- [ ] **Step 4: Ação de pedir upload (admin)**

Create `src/app/admin/upload-actions.ts`:

```ts
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
```

- [ ] **Step 5: Rotas de leitura**

Create `src/app/api/pdf/[itemId]/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/s3";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { itemId } = await params;
  const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { pdfKey: true, pdfName: true } });
  if (!item?.pdfKey) return new NextResponse("Arquivo não encontrado.", { status: 404 });
  const url = await createDownloadUrl(item.pdfKey, {
    fileName: item.pdfName ?? "material.pdf",
    download: request.nextUrl.searchParams.get("download") === "1",
  });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
```

Create `src/app/api/photo/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/s3";

export async function GET() {
  const s = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { photoKey: true } });
  if (!s?.photoKey) return new NextResponse(null, { status: 404 });
  const url = await createDownloadUrl(s.photoKey, { fileName: "foto" });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "public, max-age=120" } });
}
```

- [ ] **Step 6: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit`
Manual (`pnpm db:seed && pnpm dev`):
1. Deslogado: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" localhost:3000/api/pdf/<id do "Guia: perguntas frequentes">` → `307 http://localhost:3000/login` (pegue o id com `psql -c "select id from content_item where \"pdfKey\" is not null"`).
2. Logado como participante, abra o documento "Guia: perguntas frequentes" → "Abrir PDF" abre o PDF; "Baixar" baixa `Guia: perguntas frequentes.pdf`.
3. Copie a URL final (do MinIO) e abra depois de 5 minutos → erro `Request has expired`.
4. `curl -I http://localhost:9000/neuro-suporte/<pdfKey>` → `403` (bucket privado).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(files): upload pré-assinado validado e leitura privada de PDFs"
```

---
## Fase D — Painel da psicóloga

### Task 14: Admin — layout e gestão de conteúdo (CRUD)

**Files:**
- Create: `src/lib/validations.ts`, `src/lib/validations.test.ts`, `src/app/admin/layout.tsx`, `src/components/admin/admin-nav.tsx`, `src/components/rich-text/editor.tsx`, `src/components/admin/pdf-uploader.tsx`, `src/components/admin/type-chooser.tsx`, `src/components/admin/module-dialog.tsx`, `src/components/admin/confirm-delete.tsx`, `src/app/admin/content/actions.ts`, `src/app/admin/content/page.tsx`, `src/app/admin/content/_components/content-tree.tsx`, `src/app/admin/content/_components/item-form.tsx`, `src/app/admin/content/new/page.tsx`, `src/app/admin/content/[id]/page.tsx`, `src/app/admin/page.tsx` (provisória: `redirect("/admin/content")`, substituída na Task 18)

**Interfaces:**
- Consumes: `requireAdmin`, `prisma`, `ActionResult/ok/fail`, `richTextExtensions`, `isEmptyDoc` (de `@/lib/rich-text`, Task 12), `youtubeUrlSchema`, `extractYouTubeId`, `youtubeEmbedUrl`, `requestUpload`, `headObject`, `checkUploadedObject`, `deleteObject`, `getCourseOutline`, `getContentItem`, `moduleColor`, `ModuleMarker`
- Produces:
  ```ts
  // validations.ts
  export const richTextDocSchema: z.ZodType<JSONContent | null>;
  export const moduleInputSchema: z.ZodObject<{ title; description }>;  // description → string | null
  export type ModuleInput = z.input<typeof moduleInputSchema>;
  export const contentItemInputSchema;   // união discriminada por "type"
  export type ContentItemInput = z.input<typeof contentItemInputSchema>;
  export const participantInputSchema;   // { name, email }
  export type ParticipantInput = z.input<typeof participantInputSchema>;
  export function fieldErrorsOf(error: z.ZodError): Record<string, string[]>;
  // content/actions.ts
  export async function createModule(input: ModuleInput): Promise<ActionResult<{ id: string }>>;
  export async function updateModule(id: string, input: ModuleInput): Promise<ActionResult>;
  export async function deleteModule(id: string): Promise<ActionResult>;
  export async function createContentItem(input: ContentItemInput): Promise<ActionResult<{ id: string }>>;
  export async function updateContentItem(id: string, input: ContentItemInput): Promise<ActionResult>;
  export async function deleteContentItem(id: string): Promise<ActionResult>;
  // componentes
  export function RichTextEditor(props: { value: JSONContent | null; onChange: (v: JSONContent) => void; label: string; id: string }): JSX.Element;
  export function PdfUploader(props: { value: UploadedPdf | null; onChange: (v: UploadedPdf | null) => void }): JSX.Element;
  export type UploadedPdf = { key: string; name: string; size: number };
  export function ConfirmDelete(props: { title: string; description: string; onConfirm: () => Promise<void>; trigger: React.ReactNode; confirmLabel?: string; tone?: "danger" | "primary" }): JSX.Element;
  ```

- [ ] **Step 1: Testes de validação que falham**

Create `src/lib/validations.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { contentItemInputSchema, moduleInputSchema, participantInputSchema } from "./validations";

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
```

Run: `pnpm test src/lib/validations.test.ts` → Expected: FAIL.

- [ ] **Step 2: `src/lib/validations.ts`**

```ts
import { z } from "zod";
import type { JSONContent } from "@tiptap/core";
import { emailSchema } from "./email-address";
import { isEmptyDoc } from "./rich-text";
import { youtubeUrlSchema } from "./youtube";

export const richTextDocSchema = z
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
```

Run: `pnpm test src/lib/validations.test.ts` → Expected: PASS. (Se `z.looseObject` não existir na versão instalada do Zod 4, use `z.object({...}).passthrough()`.)

- [ ] **Step 3: Layout e navegação do admin**

Create `src/components/admin/admin-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/content", label: "Conteúdo" },
  { href: "/admin/participants", label: "Participantes" },
  { href: "/admin/settings", label: "Apresentação" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 whitespace-nowrap">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn("inline-flex min-h-11 items-center rounded-xl px-4 font-bold", active ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

Create `src/app/admin/layout.tsx`:

```tsx
import Link from "next/link";
import { Eye } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-surface">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <Logo className="h-9" />
              <span className="font-heading font-bold text-muted-foreground">Painel</span>
            </Link>
            <Link href="/course" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-muted">
              <Eye className="size-4" aria-hidden /> Ver como participante
            </Link>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
```

Create `src/app/admin/page.tsx` (provisória):

```tsx
import { redirect } from "next/navigation";

export default function AdminHome() {
  redirect("/admin/content");
}
```

- [ ] **Step 4: Editor de rich text**

Create `src/components/rich-text/editor.tsx`:

```tsx
"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { richTextExtensions } from "./extensions";

export function RichTextEditor({ value, onChange, label, id }: { value: JSONContent | null; onChange: (v: JSONContent) => void; label: string; id: string }) {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        "aria-label": label,
        class: "prose prose-stone max-w-none min-h-40 px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  if (!editor) return <div className="min-h-52 rounded-xl border bg-surface" />;

  const btn = (active: boolean) => cn("inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted", active && "bg-primary-soft text-accent-foreground");
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Cole o link (deixe vazio para remover):", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "" ) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-surface focus-within:ring-2 focus-within:ring-ring">
      <div role="toolbar" aria-label={`Formatação: ${label}`} className="flex flex-wrap gap-1 border-b p-1">
        <button type="button" aria-label="Negrito" aria-pressed={editor.isActive("bold")} className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></button>
        <button type="button" aria-label="Itálico" aria-pressed={editor.isActive("italic")} className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></button>
        <button type="button" aria-label="Título" aria-pressed={editor.isActive("heading", { level: 2 })} className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></button>
        <button type="button" aria-label="Subtítulo" aria-pressed={editor.isActive("heading", { level: 3 })} className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></button>
        <button type="button" aria-label="Lista" aria-pressed={editor.isActive("bulletList")} className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></button>
        <button type="button" aria-label="Lista numerada" aria-pressed={editor.isActive("orderedList")} className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></button>
        <button type="button" aria-label="Link" aria-pressed={editor.isActive("link")} className={btn(editor.isActive("link"))} onClick={setLink}><Link2 className="size-4" /></button>
        <button type="button" aria-label="Desfazer" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></button>
        <button type="button" aria-label="Refazer" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
```

- [ ] **Step 5: Uploader de PDF**

Create `src/components/admin/pdf-uploader.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { requestUpload } from "@/app/admin/upload-actions";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export type UploadedPdf = { key: string; name: string; size: number };

export function PdfUploader({ value, onChange }: { value: UploadedPdf | null; onChange: (v: UploadedPdf | null) => void }) {
  const [state, setState] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setState("uploading");
    try {
      const res = await requestUpload("pdf", { fileName: file.name, size: file.size, contentType: file.type });
      if (!res.ok) throw new Error(res.error);
      const put = await fetch(res.data.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Não conseguimos enviar o arquivo. Tente de novo.");
      onChange({ key: res.data.key, name: file.name, size: file.size });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setState("idle");
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: siteConfig.pdfMaxBytes,
    disabled: state === "uploading",
    onDropAccepted: ([file]) => void upload(file),
    onDropRejected: ([r]) =>
      setError(r.errors[0]?.code === "file-too-large" ? "O PDF pode ter no máximo 20 MB." : "Envie um arquivo PDF."),
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-4">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="size-6 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{value.name}</span>
        </div>
        <button type="button" onClick={() => onChange(null)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm hover:bg-muted">
          <X className="size-4" aria-hidden /> Remover
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn("flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center", isDragActive && "border-primary bg-primary-soft")}
      >
        <input {...getInputProps()} aria-label="Escolher arquivo PDF" />
        {state === "uploading" ? (
          <>
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
            <p>Enviando…</p>
          </>
        ) : (
          <>
            <Upload className="size-6 text-primary" aria-hidden />
            <p className="font-bold">Toque para escolher um PDF</p>
            <p className="text-sm text-muted-foreground">ou arraste o arquivo para cá · até 20 MB</p>
          </>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Componentes de apoio**

Create `src/components/admin/confirm-delete.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDelete({ title, description, onConfirm, trigger, confirmLabel = "Excluir", tone = "danger" }: {
  title: string; description: string; onConfirm: () => Promise<void>; trigger: React.ReactNode; confirmLabel?: string; tone?: "danger" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={tone === "danger" ? "min-h-11 bg-destructive text-white hover:bg-destructive/90" : "min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                await onConfirm();
                setOpen(false);
              });
            }}
          >
            {pending ? "Aguarde…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Create `src/components/admin/type-chooser.tsx`:

```tsx
"use client";

import Link from "next/link";
import { FileText, Plus, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function TypeChooser({ moduleId, moduleTitle }: { moduleId: string; moduleTitle: string }) {
  const card = "flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border-2 p-4 text-center font-bold hover:border-primary hover:bg-primary-soft";
  return (
    <Dialog>
      <DialogTrigger className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed px-4 text-sm font-bold hover:bg-muted">
        <Plus className="size-4" aria-hidden /> Adicionar conteúdo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>O que você quer adicionar?</DialogTitle>
          <DialogDescription>No módulo “{moduleTitle}”.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/admin/content/new?moduleId=${moduleId}&type=VIDEO`} className={card}>
            <Video className="size-8 text-primary" aria-hidden /> Aula em vídeo
            <span className="text-sm font-normal text-muted-foreground">Link do YouTube + texto</span>
          </Link>
          <Link href={`/admin/content/new?moduleId=${moduleId}&type=DOCUMENT`} className={card}>
            <FileText className="size-8 text-primary" aria-hidden /> Documento
            <span className="text-sm font-normal text-muted-foreground">PDF e/ou texto</span>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Create `src/components/admin/module-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createModule, updateModule } from "@/app/admin/content/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ModuleDialog({ trigger, module }: { trigger: React.ReactNode; module?: { id: string; title: string; description: string | null } }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(module?.title ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const input = { title, description };
      const res = module ? await updateModule(module.id, input) : await createModule(input);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(module ? "Módulo atualizado." : "Módulo criado.");
      setOpen(false);
      if (!module) {
        setTitle("");
        setDescription("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{module ? "Editar módulo" : "Novo módulo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="module-title">Título</Label>
            <Input id="module-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12" aria-invalid={Boolean(errors.title)} />
            {errors.title && <p className="text-sm text-destructive">{errors.title[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-description">Descrição curta (opcional)</Label>
            <Textarea id="module-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            {errors.description && <p className="text-sm text-destructive">{errors.description[0]}</p>}
          </div>
          <Button type="submit" className="h-12 w-full" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: Server Actions de conteúdo**

Create `src/app/admin/content/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { checkUploadedObject } from "@/lib/pdf-upload";
import { prisma } from "@/lib/prisma";
import { deleteObject, headObject } from "@/lib/s3";
import { requireAdmin } from "@/lib/session";
import {
  contentItemInputSchema, fieldErrorsOf, moduleInputSchema,
  type ContentItemInput, type ModuleInput,
} from "@/lib/validations";

const idSchema = z.uuid();

function refresh() {
  revalidatePath("/course", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/");
}

async function reindexItems(tx: Prisma.TransactionClient, moduleId: string) {
  const items = await tx.contentItem.findMany({ where: { moduleId }, orderBy: { position: "asc" }, select: { id: true } });
  await Promise.all(items.map((it, position) => tx.contentItem.update({ where: { id: it.id }, data: { position } })));
}

async function reindexModules(tx: Prisma.TransactionClient) {
  const mods = await tx.module.findMany({ orderBy: { position: "asc" }, select: { id: true } });
  await Promise.all(mods.map((m, position) => tx.module.update({ where: { id: m.id }, data: { position } })));
}

export async function createModule(input: ModuleInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = moduleInputSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os campos.", fieldErrorsOf(parsed.error));
  const position = await prisma.module.count();
  const m = await prisma.module.create({ data: { ...parsed.data, position } });
  refresh();
  return ok({ id: m.id });
}

export async function updateModule(id: string, input: ModuleInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = moduleInputSchema.safeParse(input);
  if (!idSchema.safeParse(id).success) return fail("Módulo inválido.");
  if (!parsed.success) return fail("Confira os campos.", fieldErrorsOf(parsed.error));
  const r = await prisma.module.updateMany({ where: { id }, data: parsed.data });
  if (r.count === 0) return fail("Este módulo não existe mais.");
  refresh();
  return ok();
}

export async function deleteModule(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Módulo inválido.");
  const pdfKeys = (await prisma.contentItem.findMany({ where: { moduleId: id, pdfKey: { not: null } }, select: { pdfKey: true } }))
    .map((i) => i.pdfKey!);
  await prisma.$transaction(async (tx) => {
    await tx.module.deleteMany({ where: { id } });
    await reindexModules(tx);
  });
  await Promise.all(pdfKeys.map(deleteObject));
  refresh();
  return ok();
}

async function validateItem(input: ContentItemInput) {
  const parsed = contentItemInputSchema.safeParse(input);
  if (!parsed.success) return { error: fail("Confira os campos.", fieldErrorsOf(parsed.error)) } as const;
  const v = parsed.data;
  if (!(await prisma.module.count({ where: { id: v.moduleId } }))) return { error: fail("O módulo não existe mais.") } as const;
  if (v.type === "DOCUMENT" && v.pdf) {
    const problem = checkUploadedObject(await headObject(v.pdf.key), "pdf");
    if (problem) return { error: fail(problem, { pdf: [problem] }) } as const;
  }
  const data = {
    type: v.type,
    title: v.title,
    body: (v.body ?? undefined) as Prisma.InputJsonValue | undefined,
    youtubeId: v.type === "VIDEO" ? v.youtubeUrl : null,
    pdfKey: v.type === "DOCUMENT" ? (v.pdf?.key ?? null) : null,
    pdfName: v.type === "DOCUMENT" ? (v.pdf?.name ?? null) : null,
    pdfSize: v.type === "DOCUMENT" ? (v.pdf?.size ?? null) : null,
  };
  return { data, moduleId: v.moduleId } as const;
}

export async function createContentItem(input: ContentItemInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const v = await validateItem(input);
  if ("error" in v) return v.error;
  const position = await prisma.contentItem.count({ where: { moduleId: v.moduleId } });
  const item = await prisma.contentItem.create({ data: { ...v.data, moduleId: v.moduleId, position } });
  refresh();
  return ok({ id: item.id });
}

export async function updateContentItem(id: string, input: ContentItemInput): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Conteúdo inválido.");
  const current = await prisma.contentItem.findUnique({ where: { id }, select: { pdfKey: true, moduleId: true } });
  if (!current) return fail("Este conteúdo não existe mais.");
  const v = await validateItem({ ...input, moduleId: current.moduleId });
  if ("error" in v) return v.error;
  await prisma.contentItem.update({ where: { id }, data: v.data });
  if (current.pdfKey && current.pdfKey !== v.data.pdfKey) await deleteObject(current.pdfKey);
  refresh();
  return ok();
}

export async function deleteContentItem(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Conteúdo inválido.");
  const current = await prisma.contentItem.findUnique({ where: { id }, select: { pdfKey: true, moduleId: true } });
  if (!current) return ok();
  await prisma.$transaction(async (tx) => {
    await tx.contentItem.delete({ where: { id } });
    await reindexItems(tx, current.moduleId);
  });
  if (current.pdfKey) await deleteObject(current.pdfKey);
  refresh();
  return ok();
}
```

- [ ] **Step 8: Página `/admin/content` (árvore sem drag — o drag vem na Task 15)**

Create `src/app/admin/content/_components/content-tree.tsx`:

```tsx
"use client";

import Link from "next/link";
import { FileText, Pencil, PlayCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteModule } from "@/app/admin/content/actions";
import { ModuleMarker } from "@/components/brand/module-marker";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ModuleDialog } from "@/components/admin/module-dialog";
import { TypeChooser } from "@/components/admin/type-chooser";
import { moduleColor } from "@/lib/module-colors";

export type TreeModule = {
  id: string;
  title: string;
  description: string | null;
  items: { id: string; title: string; type: "VIDEO" | "DOCUMENT" }[];
};

export function ModuleCard({ m, index, handle, children }: { m: TreeModule; index: number; handle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card border bg-surface p-4 sm:p-5" aria-labelledby={`mod-${m.id}`}>
      <div className="flex items-start gap-3">
        {handle}
        <ModuleMarker color={moduleColor(index)} />
        <div className="min-w-0 flex-1">
          <h2 id={`mod-${m.id}`} className="text-lg font-bold">{m.title}</h2>
          {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
        </div>
        <ModuleDialog
          module={m}
          trigger={<button type="button" aria-label={`Editar módulo ${m.title}`} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted"><Pencil className="size-4" /></button>}
        />
        <ConfirmDelete
          title={`Excluir o módulo “${m.title}”?`}
          description={`Os ${m.items.length} conteúdos dele também serão excluídos, e o progresso dos participantes nesses conteúdos deixa de contar. Isso não pode ser desfeito.`}
          onConfirm={async () => {
            const r = await deleteModule(m.id);
            if (r.ok) toast.success("Módulo excluído.");
            else toast.error(r.error);
          }}
          trigger={<button type="button" aria-label={`Excluir módulo ${m.title}`} className="inline-flex size-11 items-center justify-center rounded-lg text-destructive hover:bg-muted"><Trash2 className="size-4" /></button>}
        />
      </div>
      <div className="mt-4">{children}</div>
      <div className="mt-3">
        <TypeChooser moduleId={m.id} moduleTitle={m.title} />
      </div>
    </section>
  );
}

export function ItemRow({ item, handle }: { item: TreeModule["items"][number]; handle?: React.ReactNode }) {
  const Icon = item.type === "VIDEO" ? PlayCircle : FileText;
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-background px-2">
      {handle}
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">{item.type === "VIDEO" ? "Aula:" : "Documento:"}</span>
      <Link href={`/admin/content/${item.id}`} className="flex min-h-12 flex-1 items-center truncate hover:underline">
        {item.title}
      </Link>
    </div>
  );
}

export function ContentTree({ modules }: { modules: TreeModule[] }) {
  return (
    <div className="space-y-4">
      {modules.map((m, i) => (
        <ModuleCard key={m.id} m={m} index={i}>
          {m.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>
          ) : (
            <ol className="space-y-2">
              {m.items.map((it) => (
                <li key={it.id}><ItemRow item={it} /></li>
              ))}
            </ol>
          )}
        </ModuleCard>
      ))}
    </div>
  );
}
```

Create `src/app/admin/content/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ModuleDialog } from "@/components/admin/module-dialog";
import { getCourseOutline } from "@/data/course";
import { ContentTree } from "./_components/content-tree";

export const metadata: Metadata = { title: "Conteúdo" };

export default async function AdminContentPage() {
  const outline = await getCourseOutline();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Conteúdo do curso</h1>
          <p className="text-muted-foreground">Crie módulos e adicione aulas e documentos. Arraste para mudar a ordem.</p>
        </div>
        <ModuleDialog
          trigger={<button type="button" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground"><Plus className="size-4" aria-hidden /> Novo módulo</button>}
        />
      </div>
      {outline.length === 0 ? (
        <p className="rounded-card border border-dashed p-8 text-center text-muted-foreground">Comece criando o primeiro módulo do curso.</p>
      ) : (
        <ContentTree modules={outline} />
      )}
    </div>
  );
}
```

- [ ] **Step 9: Formulário de conteúdo (novo/editar)**

Create `src/app/admin/content/_components/item-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";
import { createContentItem, deleteContentItem, updateContentItem } from "@/app/admin/content/actions";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { PdfUploader, type UploadedPdf } from "@/components/admin/pdf-uploader";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";

type Props = {
  mode: "create" | "edit";
  id?: string;
  moduleId: string;
  moduleTitle: string;
  type: "VIDEO" | "DOCUMENT";
  initial?: { title: string; youtubeId: string | null; body: JSONContent | null; pdf: UploadedPdf | null };
  extraActions?: React.ReactNode; // botão "Avisar participantes" (Task 16)
};

export function ItemForm({ mode, id, moduleId, moduleTitle, type, initial, extraActions }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.youtubeId ? `https://youtu.be/${initial.youtubeId}` : "");
  const [body, setBody] = useState<JSONContent | null>(initial?.body ?? null);
  const [pdf, setPdf] = useState<UploadedPdf | null>(initial?.pdf ?? null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();
  const previewId = type === "VIDEO" ? extractYouTubeId(url) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input =
      type === "VIDEO"
        ? ({ type, moduleId, title, youtubeUrl: url, body } as const)
        : ({ type, moduleId, title, body, pdf } as const);
    start(async () => {
      if (mode === "create") {
        const r = await createContentItem(input);
        if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
        toast.success("Conteúdo criado.");
        router.replace(`/admin/content/${r.data.id}`);
      } else {
        const r = await updateContentItem(id!, input);
        if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
        setErrors({});
        toast.success("Alterações salvas.");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {type === "VIDEO" ? "Aula em vídeo" : "Documento"} · Módulo “{moduleTitle}”
      </p>

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12" aria-invalid={Boolean(errors.title)} />
        {errors.title && <p className="text-sm text-destructive">{errors.title[0]}</p>}
      </div>

      {type === "VIDEO" && (
        <div className="space-y-2">
          <Label htmlFor="youtube">Link do vídeo no YouTube</Label>
          <Input id="youtube" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="h-12" inputMode="url" aria-invalid={Boolean(errors.youtubeUrl)} />
          <p className="text-sm text-muted-foreground">Dica: no YouTube, deixe o vídeo como “Não listado”.</p>
          {errors.youtubeUrl && <p className="text-sm text-destructive">{errors.youtubeUrl[0]}</p>}
          {previewId ? (
            <div className="space-y-2">
              <p className="text-sm font-bold">Confira se é o vídeo certo:</p>
              <div className="relative aspect-video overflow-hidden rounded-card">
                <iframe src={youtubeEmbedUrl(previewId)} title="Pré-visualização do vídeo" className="absolute inset-0 size-full" allowFullScreen />
              </div>
            </div>
          ) : (
            url.trim() && <p className="text-sm text-destructive">Ainda não reconhecemos esse link do YouTube.</p>
          )}
        </div>
      )}

      {type === "DOCUMENT" && (
        <div className="space-y-2">
          <Label>Arquivo PDF (opcional se houver texto)</Label>
          <PdfUploader value={pdf} onChange={setPdf} />
          {errors.pdf && <p className="text-sm text-destructive">{errors.pdf[0]}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="body">{type === "VIDEO" ? "Texto de apoio (opcional)" : "Texto"}</Label>
        <RichTextEditor id="body" label="Texto" value={body} onChange={setBody} />
        {errors.body && <p className="text-sm text-destructive">{errors.body[0]}</p>}
      </div>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center">
        <Button type="submit" className="h-12 px-6" disabled={pending}>
          {pending ? "Salvando…" : mode === "create" ? "Criar conteúdo" : "Salvar alterações"}
        </Button>
        {mode === "edit" && (
          <>
            <Link href={`/course/${id}`} target="_blank" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 font-bold hover:bg-muted">
              <ExternalLink className="size-4" aria-hidden /> Ver como participante
            </Link>
            {extraActions}
            <ConfirmDelete
              title="Excluir este conteúdo?"
              description="O progresso dos participantes neste conteúdo deixa de contar. Isso não pode ser desfeito."
              onConfirm={async () => {
                const r = await deleteContentItem(id!);
                if (!r.ok) return void toast.error(r.error);
                toast.success("Conteúdo excluído.");
                router.replace("/admin/content");
              }}
              trigger={<button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold text-destructive hover:bg-muted"><Trash2 className="size-4" aria-hidden /> Excluir</button>}
            />
          </>
        )}
        <Link href="/admin/content" className="inline-flex min-h-12 items-center justify-center px-2 underline underline-offset-4 sm:ml-auto">
          Voltar
        </Link>
      </div>
    </form>
  );
}
```

Create `src/app/admin/content/new/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "../_components/item-form";

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ moduleId?: string; type?: string }> }) {
  const { moduleId, type } = await searchParams;
  if (!moduleId || (type !== "VIDEO" && type !== "DOCUMENT")) notFound();
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { id: true, title: true } }).catch(() => null);
  if (!mod) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{type === "VIDEO" ? "Nova aula" : "Novo documento"}</h1>
      <ItemForm mode="create" moduleId={mod.id} moduleTitle={mod.title} type={type} />
    </div>
  );
}
```

Create `src/app/admin/content/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getContentItem } from "@/data/course";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "../_components/item-form";

export const maxDuration = 60; // envio do "Avisar participantes" (Task 16)

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getContentItem(id);
  if (!item) notFound();
  const mod = await prisma.module.findUnique({ where: { id: item.moduleId }, select: { title: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Editar {item.type === "VIDEO" ? "aula" : "documento"}</h1>
      <ItemForm
        mode="edit"
        id={item.id}
        moduleId={item.moduleId}
        moduleTitle={mod?.title ?? ""}
        type={item.type}
        initial={{
          title: item.title,
          youtubeId: item.youtubeId,
          body: item.body,
          pdf: item.pdfKey ? { key: item.pdfKey, name: item.pdfName ?? "arquivo.pdf", size: item.pdfSize ?? 0 } : null,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 10: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Manual (`pnpm db:seed && pnpm dev`, logado como `loan.matteusz@gmail.com`):
1. Participante (`carla…`) abrindo `/admin` → vai para `/course`.
2. Criar módulo "Teste" → aparece no fim; editar título; excluir.
3. "Adicionar conteúdo" → "Aula em vídeo" → colar `https://youtube.com/shorts/dQw4w9WgXcQ` → preview aparece → salvar → aparece na árvore e em `/course`.
4. "Documento" sem PDF e sem texto → "Envie um PDF ou escreva um texto."; enviar um `.docx` renomeado para `.pdf` pelo navegador não passa no `accept`; enviar PDF de 25 MB → "O PDF pode ter no máximo 20 MB."; PDF válido → salvar → participante abre e baixa.
5. Trocar o PDF de um documento e salvar → o objeto antigo some do bucket (console do MinIO).
6. Excluir conteúdo concluído pela Carla → progresso dela recalcula (8 conteúdos no total).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(admin): gestão de módulos, aulas e documentos com upload de PDF e preview do YouTube"
```

---

### Task 15: Reordenação com drag-and-drop persistida

**Files:**
- Create: `src/lib/reorder.ts`, `src/lib/reorder.test.ts`, `src/app/admin/content/reorder-actions.ts`, `src/app/admin/content/_components/sortable-tree.tsx`
- Modify: `src/app/admin/content/page.tsx` (usar `SortableTree` no lugar de `ContentTree`)

**Interfaces:**
- Consumes: `TreeModule`, `ModuleCard`, `ItemRow` (Task 14), `requireAdmin`, `prisma`
- Produces:
  ```ts
  // reorder.ts
  export type ItemPlacement = { id: string; moduleId: string };
  export type ItemReorderChange = { moduleId: string; orderedItemIds: string[] };
  export type PlanResult<T> = { ok: true; updates: T[] } | { ok: false; error: string };
  export function planModuleReorder(currentIds: string[], orderedIds: string[]): PlanResult<{ id: string; position: number }>;
  export function planItemReorder(current: ItemPlacement[], moduleIds: string[], changes: ItemReorderChange[]): PlanResult<{ id: string; moduleId: string; position: number }>;
  // reorder-actions.ts
  export async function reorderModules(orderedIds: string[]): Promise<ActionResult>;
  export async function reorderItems(changes: ItemReorderChange[]): Promise<ActionResult>;
  ```

- [ ] **Step 1: Testes que falham**

Create `src/lib/reorder.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { planItemReorder, planModuleReorder } from "./reorder";

describe("planModuleReorder", () => {
  test("nova ordem completa", () => {
    expect(planModuleReorder(["a", "b", "c"], ["c", "a", "b"])).toEqual({
      ok: true,
      updates: [{ id: "c", position: 0 }, { id: "a", position: 1 }, { id: "b", position: 2 }],
    });
  });
  test.each([
    [["a", "b"], "faltando"],
    [["a", "b", "c", "d"], "a mais"],
    [["a", "a", "b"], "duplicado"],
  ])("rejeita lista %j (%s)", (ordered) => {
    expect(planModuleReorder(["a", "b", "c"], ordered).ok).toBe(false);
  });
});

describe("planItemReorder", () => {
  const current = [
    { id: "i1", moduleId: "m1" },
    { id: "i2", moduleId: "m1" },
    { id: "i3", moduleId: "m2" },
    { id: "i4", moduleId: "m3" },
  ];
  const modules = ["m1", "m2", "m3"];

  test("reordena dentro do mesmo módulo", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "m1", orderedItemIds: ["i2", "i1"] }])).toEqual({
      ok: true,
      updates: [
        { id: "i2", moduleId: "m1", position: 0 },
        { id: "i1", moduleId: "m1", position: 1 },
      ],
    });
  });

  test("move entre módulos (origem e destino)", () => {
    const r = planItemReorder(current, modules, [
      { moduleId: "m1", orderedItemIds: ["i2"] },
      { moduleId: "m2", orderedItemIds: ["i3", "i1"] },
    ]);
    expect(r).toEqual({
      ok: true,
      updates: [
        { id: "i2", moduleId: "m1", position: 0 },
        { id: "i3", moduleId: "m2", position: 0 },
        { id: "i1", moduleId: "m2", position: 1 },
      ],
    });
  });

  test("módulo esvaziado é válido", () => {
    const r = planItemReorder(current, modules, [
      { moduleId: "m2", orderedItemIds: [] },
      { moduleId: "m3", orderedItemIds: ["i4", "i3"] },
    ]);
    expect(r.ok).toBe(true);
  });

  test("item omitido (perderia o conteúdo) é rejeitado", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "m1", orderedItemIds: ["i1"] }]).ok).toBe(false);
  });
  test("item inexistente é rejeitado", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "m1", orderedItemIds: ["i1", "i2", "x"] }]).ok).toBe(false);
  });
  test("item de módulo não informado é rejeitado (payload obsoleto)", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "m1", orderedItemIds: ["i1", "i2", "i4"] }]).ok).toBe(false);
  });
  test("item duplicado em dois módulos é rejeitado", () => {
    const r = planItemReorder(current, modules, [
      { moduleId: "m1", orderedItemIds: ["i1", "i2"] },
      { moduleId: "m2", orderedItemIds: ["i3", "i1"] },
    ]);
    expect(r.ok).toBe(false);
  });
  test("módulo inexistente é rejeitado", () => {
    expect(planItemReorder(current, modules, [{ moduleId: "mX", orderedItemIds: [] }]).ok).toBe(false);
  });
  test("módulo repetido nas mudanças é rejeitado", () => {
    const r = planItemReorder(current, modules, [
      { moduleId: "m1", orderedItemIds: ["i1"] },
      { moduleId: "m1", orderedItemIds: ["i2"] },
    ]);
    expect(r.ok).toBe(false);
  });
});
```

Run: `pnpm test src/lib/reorder.test.ts` → Expected: FAIL.

- [ ] **Step 2: `src/lib/reorder.ts`**

```ts
export type ItemPlacement = { id: string; moduleId: string };
export type ItemReorderChange = { moduleId: string; orderedItemIds: string[] };
export type PlanResult<T> = { ok: true; updates: T[] } | { ok: false; error: string };

const STALE = "A lista mudou enquanto você organizava. Recarregue a página e tente de novo.";

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return s.size === a.length && b.every((x) => s.has(x));
}

export function planModuleReorder(currentIds: string[], orderedIds: string[]): PlanResult<{ id: string; position: number }> {
  if (!sameSet(currentIds, orderedIds) || new Set(orderedIds).size !== orderedIds.length) return { ok: false, error: STALE };
  return { ok: true, updates: orderedIds.map((id, position) => ({ id, position })) };
}

export function planItemReorder(
  current: ItemPlacement[],
  moduleIds: string[],
  changes: ItemReorderChange[],
): PlanResult<{ id: string; moduleId: string; position: number }> {
  const known = new Set(moduleIds);
  const affected = changes.map((c) => c.moduleId);
  if (affected.some((m) => !known.has(m)) || new Set(affected).size !== affected.length) return { ok: false, error: STALE };

  const affectedSet = new Set(affected);
  const before = current.filter((i) => affectedSet.has(i.moduleId)).map((i) => i.id);
  const after = changes.flatMap((c) => c.orderedItemIds);
  if (new Set(after).size !== after.length || !sameSet(before, after)) return { ok: false, error: STALE };

  return {
    ok: true,
    updates: changes.flatMap((c) => c.orderedItemIds.map((id, position) => ({ id, moduleId: c.moduleId, position }))),
  };
}
```

Run: `pnpm test src/lib/reorder.test.ts` → Expected: PASS.

- [ ] **Step 3: Server Actions**

Create `src/app/admin/content/reorder-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { planItemReorder, planModuleReorder, type ItemReorderChange } from "@/lib/reorder";
import { requireAdmin } from "@/lib/session";

const idList = z.array(z.uuid()).max(500);
const changesSchema = z.array(z.object({ moduleId: z.uuid(), orderedItemIds: idList })).min(1).max(2);

function refresh() {
  revalidatePath("/course", "layout");
  revalidatePath("/admin", "layout");
}

export async function reorderModules(orderedIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  if (!idList.safeParse(orderedIds).success) return fail("Ordem inválida.");
  const current = await prisma.module.findMany({ select: { id: true } });
  const plan = planModuleReorder(current.map((m) => m.id), orderedIds);
  if (!plan.ok) return fail(plan.error);
  await prisma.$transaction(plan.updates.map((u) => prisma.module.update({ where: { id: u.id }, data: { position: u.position } })));
  refresh();
  return ok();
}

export async function reorderItems(changes: ItemReorderChange[]): Promise<ActionResult> {
  await requireAdmin();
  if (!changesSchema.safeParse(changes).success) return fail("Ordem inválida.");
  return prisma.$transaction(async (tx) => {
    const [items, modules] = await Promise.all([
      tx.contentItem.findMany({ select: { id: true, moduleId: true } }),
      tx.module.findMany({ select: { id: true } }),
    ]);
    const plan = planItemReorder(items, modules.map((m) => m.id), changes);
    if (!plan.ok) return fail(plan.error);
    for (const u of plan.updates) {
      await tx.contentItem.update({ where: { id: u.id }, data: { moduleId: u.moduleId, position: u.position } });
    }
    refresh();
    return ok();
  });
}
```

- [ ] **Step 4: Árvore com drag-and-drop (dnd-kit, um único `DndContext` com IDs prefixados)**

Create `src/app/admin/content/_components/sortable-tree.tsx`:

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reorderItems, reorderModules } from "@/app/admin/content/reorder-actions";
import { ItemRow, ModuleCard, type TreeModule } from "./content-tree";

const M = (id: string) => `module:${id}`;
const I = (id: string) => `item:${id}`;
const C = (id: string) => `container:${id}`;
const raw = (id: string | number) => String(id).split(":")[1];
const kind = (id: string | number) => String(id).split(":")[0] as "module" | "item" | "container";

function Handle({ label, listeners, attributes }: { label: string; listeners?: object; attributes?: object }) {
  return (
    <button type="button" aria-label={label} className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing" {...attributes} {...listeners}>
      <GripVertical className="size-5" />
    </button>
  );
}

function SortableItem({ item }: { item: TreeModule["items"][number] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: I(item.id) });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "opacity-40" : undefined}>
      <ItemRow item={item} handle={<Handle label={`Mover ${item.title}`} listeners={listeners} attributes={attributes} />} />
    </li>
  );
}

function ItemsContainer({ m }: { m: TreeModule }) {
  const { setNodeRef } = useDroppable({ id: C(m.id) });
  return (
    <SortableContext items={m.items.map((i) => I(i.id))} strategy={verticalListSortingStrategy}>
      <ol ref={setNodeRef} className="min-h-12 space-y-2 rounded-xl">
        {m.items.length === 0 && <li className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Solte um conteúdo aqui</li>}
        {m.items.map((it) => <SortableItem key={it.id} item={it} />)}
      </ol>
    </SortableContext>
  );
}

function SortableModule({ m, index }: { m: TreeModule; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: M(m.id) });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "opacity-40" : undefined}>
      <ModuleCard m={m} index={index} handle={<Handle label={`Mover módulo ${m.title}`} listeners={listeners} attributes={attributes} />}>
        <ItemsContainer m={m} />
      </ModuleCard>
    </li>
  );
}

export function SortableTree({ modules: initial }: { modules: TreeModule[] }) {
  const [modules, setModules] = useState(initial);
  const [snapshot, setSnapshot] = useState<TreeModule[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => setModules(initial), [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findModuleOfItem = (itemId: string, list = modules) => list.find((m) => m.items.some((i) => i.id === itemId));

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setSnapshot(modules);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over || kind(active.id) !== "item") return;
    const itemId = raw(active.id);
    const from = findModuleOfItem(itemId);
    const to = kind(over.id) === "item" ? findModuleOfItem(raw(over.id)) : kind(over.id) === "container" ? modules.find((m) => m.id === raw(over.id)) : undefined;
    if (!from || !to || from.id === to.id) return;
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === from.id) return { ...m, items: m.items.filter((i) => i.id !== itemId) };
        if (m.id === to.id) {
          const moving = from.items.find((i) => i.id === itemId)!;
          const overIndex = kind(over.id) === "item" ? m.items.findIndex((i) => i.id === raw(over.id)) : m.items.length;
          const items = [...m.items];
          items.splice(overIndex < 0 ? items.length : overIndex, 0, moving);
          return { ...m, items };
        }
        return m;
      }),
    );
  }

  function persist(save: () => Promise<{ ok: boolean; error?: string }>, rollback: TreeModule[]) {
    start(async () => {
      const r = await save();
      if (!r.ok) {
        setModules(rollback);
        toast.error(r.error ?? "Não conseguimos salvar a nova ordem.");
      } else {
        toast.success("Ordem salva.");
      }
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    const before = snapshot ?? modules;
    setSnapshot(null);
    if (!over) return setModules(before);

    if (kind(active.id) === "module") {
      if (kind(over.id) !== "module" || active.id === over.id) return;
      const oldIndex = modules.findIndex((m) => m.id === raw(active.id));
      const newIndex = modules.findIndex((m) => m.id === raw(over.id));
      const next = arrayMove(modules, oldIndex, newIndex);
      setModules(next);
      persist(() => reorderModules(next.map((m) => m.id)), before);
      return;
    }

    const itemId = raw(active.id);
    const target = findModuleOfItem(itemId);
    if (!target) return setModules(before);
    let items = target.items;
    if (kind(over.id) === "item") {
      const oldIndex = items.findIndex((i) => i.id === itemId);
      const newIndex = items.findIndex((i) => i.id === raw(over.id));
      if (newIndex >= 0 && oldIndex !== newIndex) items = arrayMove(items, oldIndex, newIndex);
    }
    const next = modules.map((m) => (m.id === target.id ? { ...m, items } : m));
    setModules(next);

    const source = findModuleOfItem(itemId, before)!;
    const changes = [{ moduleId: target.id, orderedItemIds: items.map((i) => i.id) }];
    if (source.id !== target.id) {
      changes.unshift({ moduleId: source.id, orderedItemIds: next.find((m) => m.id === source.id)!.items.map((i) => i.id) });
    } else if (items.map((i) => i.id).join() === source.items.map((i) => i.id).join()) {
      return; // nada mudou
    }
    persist(() => reorderItems(changes), before);
  }

  const activeItem = activeId && kind(activeId) === "item" ? modules.flatMap((m) => m.items).find((i) => i.id === raw(activeId)) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        if (snapshot) setModules(snapshot);
        setActiveId(null);
      }}
      accessibility={{
        screenReaderInstructions: { draggable: "Para mover, pressione espaço. Use as setas para escolher o lugar e espaço de novo para soltar. Esc cancela." },
        announcements: {
          onDragStart: () => "Item pego.",
          onDragOver: () => "Movendo.",
          onDragEnd: () => "Item solto.",
          onDragCancel: () => "Movimento cancelado.",
        },
      }}
    >
      <SortableContext items={modules.map((m) => M(m.id))} strategy={verticalListSortingStrategy}>
        <ol className="space-y-4">
          {modules.map((m, i) => <SortableModule key={m.id} m={m} index={i} />)}
        </ol>
      </SortableContext>
      <DragOverlay>{activeItem ? <ItemRow item={activeItem} /> : null}</DragOverlay>
    </DndContext>
  );
}
```

Em `src/app/admin/content/page.tsx`, troque `import { ContentTree } …` / `<ContentTree modules={outline} />` por `import { SortableTree } from "./_components/sortable-tree";` / `<SortableTree modules={outline} />`. (`ContentTree` continua exportado mas sem uso — remova a função `ContentTree` de `content-tree.tsx`, mantendo `ModuleCard`, `ItemRow` e `TreeModule`.)

- [ ] **Step 5: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Manual (admin, `pnpm db:seed && pnpm dev`):
1. Arrastar o módulo 3 para o topo → toast "Ordem salva."; recarregar → ordem mantida; `/course` em outra aba mostra a nova ordem e as cores dos módulos seguem a posição.
2. Arrastar "Exercício para casa" do módulo 2 para o módulo 1 → recarregar → está no módulo 1; o progresso da Carla (que o concluiu) continua contando, agora no módulo 1.
3. Arrastar para um módulo vazio (crie um) → funciona pelo "Solte um conteúdo aqui".
4. Teclado: Tab até a alça, espaço, setas, espaço → move e salva.
5. Celular (DevTools touch, 360 px): segurar a alça ~0,2 s e arrastar.
6. Payload obsoleto: abra `/admin/content` em duas abas; na aba A mova um item entre módulos; na aba B (sem recarregar) mova outro item envolvendo o mesmo módulo → toast "A lista mudou… Recarregue" e a aba B volta ao estado anterior; nada é gravado errado.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): reordenação por arrastar de módulos e conteúdos, inclusive entre módulos"
```

---

### Task 16: "Avisar participantes" sobre conteúdo novo

**Files:**
- Create: `src/app/admin/content/notify-actions.ts`, `src/components/admin/notify-button.tsx`
- Modify: `src/app/admin/content/[id]/page.tsx` (passar `extraActions`)

**Interfaces:**
- Consumes: `sendMail`, `newContentEmail`, `getSiteSettings`, `env.BETTER_AUTH_URL`, `siteConfig.notifyBatchSize`, `ConfirmDelete` (reutilizado como confirmação genérica)
- Produces:
  ```ts
  export async function countActiveParticipants(): Promise<number>;
  export async function notifyParticipants(itemId: string): Promise<ActionResult<{ sent: number; failed: number }>>;
  export function NotifyButton(props: { itemId: string; notifiedAt: Date | null; recipients: number }): JSX.Element;
  ```

- [ ] **Step 1: Ação**

Create `src/app/admin/content/notify-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { getSiteSettings } from "@/data/settings";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { sendMail } from "@/lib/email";
import { newContentEmail } from "@/lib/email-templates";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const activeParticipants = { role: "participant", OR: [{ banned: false }, { banned: null }] };

export async function countActiveParticipants(): Promise<number> {
  await requireAdmin();
  return prisma.user.count({ where: activeParticipants });
}

export async function notifyParticipants(itemId: string): Promise<ActionResult<{ sent: number; failed: number }>> {
  await requireAdmin();
  if (!z.uuid().safeParse(itemId).success) return fail("Conteúdo inválido.");
  const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { id: true, title: true } });
  if (!item) return fail("Este conteúdo não existe mais.");

  const [users, settings] = await Promise.all([
    prisma.user.findMany({ where: activeParticipants, select: { email: true, name: true } }),
    getSiteSettings(),
  ]);
  const url = `${env.BETTER_AUTH_URL}/course/${item.id}`;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < users.length; i += siteConfig.notifyBatchSize) {
    const batch = users.slice(i, i + siteConfig.notifyBatchSize);
    const results = await Promise.allSettled(
      batch.map((u) => sendMail({ to: u.email, ...newContentEmail({ name: u.name, title: item.title, url, psychologistName: settings.psychologistName }) })),
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("[notify] falha no envio", r.reason);
      }
    }
    if (i + siteConfig.notifyBatchSize < users.length) await new Promise((res) => setTimeout(res, 1000));
  }
  if (sent > 0) await prisma.contentItem.update({ where: { id: item.id }, data: { notifiedAt: new Date() } });
  revalidatePath(`/admin/content/${item.id}`);
  return ok({ sent, failed });
}
```

- [ ] **Step 2: Botão**

Create `src/components/admin/notify-button.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { notifyParticipants } from "@/app/admin/content/notify-actions";
import { ConfirmDelete } from "@/components/admin/confirm-delete";

export function NotifyButton({ itemId, notifiedAt, recipients }: { itemId: string; notifiedAt: Date | null; recipients: number }) {
  const router = useRouter();
  const when = notifiedAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(notifiedAt) : null;
  return (
    <ConfirmDelete
      title={when ? `Avisar de novo? (já avisado em ${when})` : "Avisar participantes?"}
      description={`Vamos enviar um e-mail para ${recipients} participante${recipients === 1 ? "" : "s"} ativo${recipients === 1 ? "" : "s"} contando sobre este conteúdo.`}
      confirmLabel="Enviar e-mails"
      tone="primary"
      onConfirm={async () => {
        const r = await notifyParticipants(itemId);
        if (!r.ok) return void toast.error(r.error);
        if (r.data.failed) toast.warning(`Enviados: ${r.data.sent}. Não enviados: ${r.data.failed}.`);
        else toast.success(`E-mail enviado para ${r.data.sent} participante${r.data.sent === 1 ? "" : "s"}.`);
        router.refresh();
      }}
      trigger={
        <button type="button" disabled={recipients === 0} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 font-bold hover:bg-muted disabled:opacity-50">
          <Mail className="size-4" aria-hidden /> {when ? `Avisado em ${when}` : "Avisar participantes"}
        </button>
      }
    />
  );
}
```

- [ ] **Step 3: Ligar no formulário**

Em `src/app/admin/content/[id]/page.tsx`, busque `const recipients = await countActiveParticipants();` (import de `../notify-actions`) e passe ao `ItemForm`:

```tsx
extraActions={<NotifyButton itemId={item.id} notifiedAt={item.notifiedAt} recipients={recipients} />}
```

- [ ] **Step 4: Verificar**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Manual (sem SMTP no `.env` → e-mails vão para o console): editar um conteúdo → "Avisar participantes" → confirmação diz "3 participantes ativos" → confirmar → console mostra 3 e-mails `[email:dev]` (Ana, Bruno, Carla; nunca o admin) → botão vira "Avisado em dd/mm". Desative um participante (Task 17) e repita → 2.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): avisar participantes ativos por e-mail sobre um conteúdo"
```

---

### Task 17: Participantes — convites e acompanhamento individual

**Files:**
- Create: `src/lib/participant-status.ts`, `src/lib/participant-status.test.ts`, `src/data/participants.ts`, `src/app/admin/participants/actions.ts`, `src/app/admin/participants/page.tsx`, `src/app/admin/participants/_components/participants-list.tsx`, `src/app/admin/participants/_components/participant-dialog.tsx`, `src/app/admin/participants/[id]/page.tsx`, `src/app/admin/participants/[id]/_components/participant-actions.tsx`

**Interfaces:**
- Consumes: `computeProgress`, `aggregateProgress`, `getCourseOutline`, `toCourseShape`, `participantInputSchema`, `fieldErrorsOf`, `sendMail`, `inviteEmail`, `getSiteSettings`, `env`, `ConfirmDelete`
- Produces:
  ```ts
  // participant-status.ts
  export type ParticipantStatus = "disabled" | "never" | "inactive" | "active";
  export function participantStatus(p: { banned: boolean | null; lastSeenAt: Date | null }, now: Date, inactiveAfterDays: number): ParticipantStatus;
  export const STATUS_LABEL: Record<ParticipantStatus, string>;
  // data/participants.ts (server-only)
  export type ParticipantRow = { id: string; name: string; email: string; createdAt: Date; lastSeenAt: Date | null; inviteSentAt: Date | null; banned: boolean; percent: number; status: ParticipantStatus };
  export async function listParticipants(): Promise<{ rows: ParticipantRow[]; aggregate: ProgressAggregate; outline: OutlineModule[] }>;
  export async function getParticipantDetail(id: string): Promise<null | { user: ParticipantRow; progress: CourseProgress; outline: OutlineModule[]; completedAt: Map<string, Date> }>;
  // participants/actions.ts
  export async function inviteParticipant(input: ParticipantInput): Promise<ActionResult<{ id: string; emailSent: boolean }>>;
  export async function resendInvite(id: string): Promise<ActionResult>;
  export async function updateParticipant(id: string, input: ParticipantInput): Promise<ActionResult>;
  export async function setParticipantActive(id: string, active: boolean): Promise<ActionResult>;
  export async function deleteParticipant(id: string): Promise<ActionResult>;
  ```

- [ ] **Step 1: Teste do status (falha)**

Create `src/lib/participant-status.test.ts`:

```ts
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
```

Run: `pnpm test src/lib/participant-status.test.ts` → Expected: FAIL.

- [ ] **Step 2: `src/lib/participant-status.ts`**

```ts
export type ParticipantStatus = "disabled" | "never" | "inactive" | "active";

export function participantStatus(p: { banned: boolean | null; lastSeenAt: Date | null }, now: Date, inactiveAfterDays: number): ParticipantStatus {
  if (p.banned) return "disabled";
  if (!p.lastSeenAt) return "never";
  return now.getTime() - p.lastSeenAt.getTime() >= inactiveAfterDays * 86_400_000 ? "inactive" : "active";
}

export const STATUS_LABEL: Record<ParticipantStatus, string> = {
  disabled: "Acesso desativado",
  never: "Convidado, ainda não acessou",
  inactive: "Inativo",
  active: "Ativo",
};
```

Run → Expected: PASS.

- [ ] **Step 3: `src/data/participants.ts` (3 consultas, sem N+1)**

```ts
import "server-only";
import { siteConfig } from "@/config/site";
import { getCourseOutline, toCourseShape, type OutlineModule } from "@/data/course";
import { participantStatus, type ParticipantStatus } from "@/lib/participant-status";
import { prisma } from "@/lib/prisma";
import { aggregateProgress, computeProgress, type CourseProgress, type ProgressAggregate } from "@/lib/progress";

export type ParticipantRow = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  inviteSentAt: Date | null;
  banned: boolean;
  percent: number;
  status: ParticipantStatus;
};

const userSelect = { id: true, name: true, email: true, createdAt: true, lastSeenAt: true, inviteSentAt: true, banned: true } as const;

export async function listParticipants(): Promise<{ rows: ParticipantRow[]; aggregate: ProgressAggregate; outline: OutlineModule[] }> {
  const [outline, users, completions] = await Promise.all([
    getCourseOutline(),
    prisma.user.findMany({ where: { role: "participant" }, select: userSelect, orderBy: { name: "asc" } }),
    prisma.contentProgress.findMany({ where: { user: { role: "participant" } }, select: { userId: true, contentItemId: true } }),
  ]);
  const shape = toCourseShape(outline);
  const byUser = new Map<string, Set<string>>();
  for (const c of completions) {
    let s = byUser.get(c.userId);
    if (!s) byUser.set(c.userId, (s = new Set()));
    s.add(c.contentItemId);
  }
  const now = new Date();
  const rows = users.map((u) => ({
    ...u,
    banned: Boolean(u.banned),
    percent: computeProgress(shape, byUser.get(u.id) ?? new Set()).overall.percent,
    status: participantStatus(u, now, siteConfig.inactiveAfterDays),
  }));
  // Média só entre participantes ativos (não desativados).
  const counted = rows.filter((r) => !r.banned).map((r) => r.id);
  return { rows, aggregate: aggregateProgress(shape, byUser, counted), outline };
}

export async function getParticipantDetail(id: string) {
  const [user, outline, completions] = await Promise.all([
    prisma.user.findFirst({ where: { id, role: "participant" }, select: userSelect }),
    getCourseOutline(),
    prisma.contentProgress.findMany({ where: { userId: id }, select: { contentItemId: true, completedAt: true } }),
  ]);
  if (!user) return null;
  const completedAt = new Map(completions.map((c) => [c.contentItemId, c.completedAt]));
  const progress: CourseProgress = computeProgress(toCourseShape(outline), new Set(completedAt.keys()));
  const row: ParticipantRow = {
    ...user,
    banned: Boolean(user.banned),
    percent: progress.overall.percent,
    status: participantStatus(user, new Date(), siteConfig.inactiveAfterDays),
  };
  return { user: row, progress, outline, completedAt };
}
```

- [ ] **Step 4: Server Actions de participantes**

Create `src/app/admin/participants/actions.ts`:

```ts
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSiteSettings } from "@/data/settings";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { sendMail } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fieldErrorsOf, participantInputSchema, type ParticipantInput } from "@/lib/validations";

const idSchema = z.string().min(1).max(100);
const DUPLICATE = "Já existe uma pessoa cadastrada com este e-mail.";

function refresh() {
  revalidatePath("/admin", "layout");
}

async function sendInvite(user: { id: string; name: string; email: string }): Promise<boolean> {
  const settings = await getSiteSettings();
  const loginUrl = `${env.BETTER_AUTH_URL}/login?email=${encodeURIComponent(user.email)}`;
  try {
    await sendMail({ to: user.email, ...inviteEmail({ name: user.name, loginUrl, psychologistName: settings.psychologistName }) });
    await prisma.user.update({ where: { id: user.id }, data: { inviteSentAt: new Date() } });
    return true;
  } catch (e) {
    console.error("[invite] falha no envio", e);
    return false;
  }
}

async function findParticipant(id: string) {
  if (!idSchema.safeParse(id).success) return null;
  return prisma.user.findFirst({ where: { id, role: "participant" }, select: { id: true, name: true, email: true, banned: true } });
}

export async function inviteParticipant(input: ParticipantInput): Promise<ActionResult<{ id: string; emailSent: boolean }>> {
  await requireAdmin();
  const parsed = participantInputSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os campos.", fieldErrorsOf(parsed.error));
  if (await prisma.user.count({ where: { email: parsed.data.email } })) return fail(DUPLICATE, { email: [DUPLICATE] });
  const user = await prisma.user.create({
    data: { id: randomUUID(), ...parsed.data, role: "participant", emailVerified: false, banned: false },
    select: { id: true, name: true, email: true },
  });
  const emailSent = await sendInvite(user);
  refresh();
  return ok({ id: user.id, emailSent });
}

export async function resendInvite(id: string): Promise<ActionResult> {
  await requireAdmin();
  const user = await findParticipant(id);
  if (!user) return fail("Participante não encontrado.");
  if (user.banned) return fail("Reative o acesso antes de reenviar o convite.");
  if (!(await sendInvite(user))) return fail("Não conseguimos enviar o e-mail agora. Tente de novo em instantes.");
  refresh();
  return ok();
}

export async function updateParticipant(id: string, input: ParticipantInput): Promise<ActionResult> {
  await requireAdmin();
  const user = await findParticipant(id);
  if (!user) return fail("Participante não encontrado.");
  const parsed = participantInputSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os campos.", fieldErrorsOf(parsed.error));
  if (parsed.data.email !== user.email && (await prisma.user.count({ where: { email: parsed.data.email } }))) {
    return fail(DUPLICATE, { email: [DUPLICATE] });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { ...parsed.data, ...(parsed.data.email !== user.email ? { emailVerified: false } : {}) } }),
    // E-mail trocado: encerra sessões antigas por segurança.
    ...(parsed.data.email !== user.email ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
  ]);
  refresh();
  return ok();
}

export async function setParticipantActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  const user = await findParticipant(id);
  if (!user) return fail("Participante não encontrado.");
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { banned: !active, banReason: active ? null : "Desativado pela psicóloga" } }),
    ...(active ? [] : [prisma.session.deleteMany({ where: { userId: id } })]),
  ]);
  refresh();
  return ok();
}

export async function deleteParticipant(id: string): Promise<ActionResult> {
  await requireAdmin();
  const user = await findParticipant(id);
  if (!user) return fail("Participante não encontrado.");
  await prisma.user.delete({ where: { id } }); // cascade: sessões, contas, progresso
  refresh();
  return ok();
}
```

- [ ] **Step 5: Lista com busca, ordenação e convite**

Create `src/app/admin/participants/_components/participant-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteParticipant, updateParticipant } from "@/app/admin/participants/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ParticipantDialog({ trigger, participant }: { trigger: React.ReactNode; participant?: { id: string; name: string; email: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(participant?.name ?? "");
  const [email, setEmail] = useState(participant?.email ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      if (participant) {
        const r = await updateParticipant(participant.id, { name, email });
        if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
        toast.success("Dados atualizados.");
      } else {
        const r = await inviteParticipant({ name, email });
        if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
        if (r.data.emailSent) toast.success("Convite enviado por e-mail.");
        else toast.warning("Participante cadastrado, mas o e-mail não foi enviado. Use “Reenviar convite”.");
        setName("");
        setEmail("");
      }
      setErrors({});
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{participant ? "Editar participante" : "Convidar participante"}</DialogTitle>
          {!participant && <DialogDescription>A pessoa recebe um e-mail de boas-vindas explicando como entrar.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="p-name">Nome do responsável</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12" autoComplete="off" aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-email">E-mail</Label>
            <Input id="p-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" autoComplete="off" aria-invalid={Boolean(errors.email)} />
            {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
          </div>
          <Button type="submit" className="h-12 w-full" disabled={pending}>
            {pending ? "Salvando…" : participant ? "Salvar" : "Convidar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Create `src/app/admin/participants/_components/participants-list.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProgressBar } from "@/components/course/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { STATUS_LABEL, type ParticipantStatus } from "@/lib/participant-status";
import { cn } from "@/lib/utils";

type Row = { id: string; name: string; email: string; createdAt: string; lastSeenAt: string | null; percent: number; status: ParticipantStatus };
type SortKey = "name" | "percent" | "lastSeenAt" | "createdAt";

const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("pt-BR").format(new Date(iso)) : "—");
const STATUS_CLASS: Record<ParticipantStatus, string> = {
  active: "bg-mint-soft text-mint",
  inactive: "bg-amber-soft text-amber",
  never: "bg-lavender-soft text-lavender",
  disabled: "bg-muted text-muted-foreground",
};

export function ParticipantsList({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term ? rows.filter((r) => r.name.toLowerCase().includes(term) || r.email.includes(term)) : rows;
    const by: Record<SortKey, (a: Row, b: Row) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
      percent: (a, b) => b.percent - a.percent,
      lastSeenAt: (a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""),
      createdAt: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return [...filtered].sort(by[sort]);
  }, [rows, q, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nome ou e-mail</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail" className="h-12 pl-9" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span>Ordenar por</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-12 rounded-xl border bg-surface px-3">
            <option value="name">Nome</option>
            <option value="percent">Progresso</option>
            <option value="lastSeenAt">Último acesso</option>
            <option value="createdAt">Data de cadastro</option>
          </select>
        </label>
      </div>
      {list.length === 0 ? (
        <p className="rounded-card border border-dashed p-8 text-center text-muted-foreground">{rows.length ? "Ninguém encontrado com essa busca." : "Nenhum participante ainda. Convide o primeiro!"}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/participants/${r.id}`} className="block rounded-card border bg-surface p-4 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{r.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{r.email}</p>
                  </div>
                  <Badge className={cn("rounded-lg", STATUS_CLASS[r.status])}>{STATUS_LABEL[r.status]}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1"><ProgressBar percent={r.percent} label={`Progresso de ${r.name}`} /></div>
                  <span className="w-12 text-right font-bold">{r.percent}%</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Cadastro: {fmt(r.createdAt)} · Último acesso: {fmt(r.lastSeenAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Create `src/app/admin/participants/page.tsx`:

```tsx
import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { listParticipants } from "@/data/participants";
import { ParticipantDialog } from "./_components/participant-dialog";
import { ParticipantsList } from "./_components/participants-list";

export const metadata: Metadata = { title: "Participantes" };

export default async function ParticipantsPage() {
  const { rows } = await listParticipants();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Participantes</h1>
          <p className="text-muted-foreground">{rows.length} pessoa{rows.length === 1 ? "" : "s"} cadastrada{rows.length === 1 ? "" : "s"}.</p>
        </div>
        <ParticipantDialog
          trigger={<button type="button" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground"><UserPlus className="size-4" aria-hidden /> Convidar participante</button>}
        />
      </div>
      <ParticipantsList
        rows={rows.map((r) => ({ id: r.id, name: r.name, email: r.email, createdAt: r.createdAt.toISOString(), lastSeenAt: r.lastSeenAt?.toISOString() ?? null, percent: r.percent, status: r.status }))}
      />
    </div>
  );
}
```

- [ ] **Step 6: Detalhe do participante**

Create `src/app/admin/participants/[id]/_components/participant-actions.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteParticipant, resendInvite, setParticipantActive } from "@/app/admin/participants/actions";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ParticipantDialog } from "@/app/admin/participants/_components/participant-dialog";

const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 font-bold hover:bg-muted disabled:opacity-50";

export function ParticipantActions({ p }: { p: { id: string; name: string; email: string; banned: boolean } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(success);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <ParticipantDialog participant={p} trigger={<button type="button" className={btn}><Pencil className="size-4" aria-hidden /> Editar</button>} />
      <button type="button" className={btn} disabled={pending || p.banned} onClick={() => run(() => resendInvite(p.id), "Convite reenviado.")}>
        <Mail className="size-4" aria-hidden /> Reenviar convite
      </button>
      <button type="button" className={btn} disabled={pending} onClick={() => run(() => setParticipantActive(p.id, p.banned), p.banned ? "Acesso reativado." : "Acesso desativado.")}>
        <Power className="size-4" aria-hidden /> {p.banned ? "Reativar acesso" : "Desativar acesso"}
      </button>
      <ConfirmDelete
        title={`Excluir ${p.name}?`}
        description="Todos os dados e o progresso desta pessoa serão apagados (LGPD). Isso não pode ser desfeito. Para só pausar o acesso, use “Desativar acesso”."
        onConfirm={async () => {
          const r = await deleteParticipant(p.id);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Participante excluído.");
          router.replace("/admin/participants");
        }}
        trigger={<button type="button" className={`${btn} border-destructive/40 text-destructive`}><Trash2 className="size-4" aria-hidden /> Excluir</button>}
      />
    </div>
  );
}
```

Create `src/app/admin/participants/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { ModuleMarker } from "@/components/brand/module-marker";
import { ProgressBar } from "@/components/course/progress-bar";
import { getParticipantDetail } from "@/data/participants";
import { moduleColor } from "@/lib/module-colors";
import { STATUS_LABEL } from "@/lib/participant-status";
import { ParticipantActions } from "./_components/participant-actions";

const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d) : "—");

export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getParticipantDetail(id);
  if (!detail) notFound();
  const { user, progress, outline, completedAt } = detail;

  return (
    <div className="space-y-8">
      <Link href="/admin/participants" className="text-sm underline underline-offset-4">← Participantes</Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold">{user.name}</h1>
        <p className="text-muted-foreground">{user.email}</p>
        <p className="text-sm">
          {STATUS_LABEL[user.status]} · Cadastro {fmt(user.createdAt)} · Convite enviado {fmt(user.inviteSentAt)} · Último acesso {fmt(user.lastSeenAt)}
        </p>
      </header>
      <ParticipantActions p={{ id: user.id, name: user.name, email: user.email, banned: user.banned }} />

      <section className="rounded-card border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Progresso geral</h2>
          <span className="text-2xl font-extrabold text-primary">{progress.overall.percent}%</span>
        </div>
        <div className="mt-3"><ProgressBar percent={progress.overall.percent} label="Progresso geral" /></div>
        <p className="mt-2 text-sm text-muted-foreground">{progress.overall.done} de {progress.overall.total} conteúdos</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Por módulo</h2>
        {outline.map((m, i) => {
          const p = progress.modules[m.id];
          return (
            <div key={m.id} className="rounded-card border bg-surface p-5">
              <div className="flex items-center gap-3">
                <ModuleMarker color={moduleColor(i)} done={p.complete} />
                <h3 className="flex-1 font-bold">{m.title}</h3>
                <span className="font-bold">{p.percent}%</span>
              </div>
              <ul className="mt-3 divide-y">
                {m.items.map((it) => {
                  const at = completedAt.get(it.id) ?? null;
                  return (
                    <li key={it.id} className="flex items-center gap-3 py-2">
                      {at ? <CheckCircle2 className="size-5 text-primary" aria-label="Concluído" /> : <Circle className="size-5 text-muted-foreground" aria-label="Não concluído" />}
                      <span className="flex-1">{it.title}</span>
                      <span className="text-sm text-muted-foreground">{at ? fmt(at) : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Manual (`pnpm db:seed && pnpm dev`, admin):
1. Lista: Ana "Convidado, ainda não acessou" 0%; Bruno "Inativo" 33%; Carla "Ativo" 78%; o admin não aparece. Busca "carla" e "EXEMPLO.com" (maiúsculas) funcionam; ordenações funcionam.
2. Convidar `Teste <b>X</b>` / ` NOVO@Exemplo.com ` → console mostra e-mail com o nome literal; aparece na lista com `novo@exemplo.com`. Convidar de novo o mesmo e-mail com maiúsculas → "Já existe uma pessoa cadastrada com este e-mail."
3. Logar como o convidado novo pelo link do e-mail (`/login?email=…` já preenchido) → funciona; lista mostra "Ativo".
4. Desativar o Bruno → se ele estava logado em outra janela, a próxima navegação vai para `/login`; tentar entrar → mensagem de acesso pausado. Reativar → entra.
5. Detalhe da Carla: 7 conteúdos com check e data; módulos 1 e 2 100%.
6. Excluir o participante de teste → some da lista; `psql -c "select count(*) from content_progress where \"userId\"='<id>'"` → 0.
7. Abrir `/admin/participants/<id do admin>` → 404.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(admin): convites, gestão e acompanhamento individual de participantes"
```

---

### Task 18: Visão geral e edição da apresentação

**Files:**
- Create: `src/app/admin/settings/actions.ts`, `src/app/admin/settings/page.tsx`, `src/app/admin/settings/_components/settings-form.tsx`, `src/components/admin/image-uploader.tsx`
- Modify: `src/app/admin/page.tsx` (substituir a provisória), `src/lib/validations.ts` (+ `settingsInputSchema`), `src/lib/validations.test.ts`

**Interfaces:**
- Consumes: `listParticipants`, `getSiteSettings`, `RichTextEditor`, `requestUpload`, `headObject`, `checkUploadedObject`, `deleteObject`
- Produces:
  ```ts
  export const settingsInputSchema; export type SettingsInput = z.input<typeof settingsInputSchema>;
  export async function updateSettings(input: SettingsInput): Promise<ActionResult>;
  export function ImageUploader(props: { value: string | null; onChange: (key: string | null) => void }): JSX.Element;
  ```

- [ ] **Step 1: Teste do schema (falha)**

Append to `src/lib/validations.test.ts`:

```ts
import { settingsInputSchema } from "./validations";

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
```

Run → Expected: FAIL.

- [ ] **Step 2: Schema**

Append to `src/lib/validations.ts`:

```ts
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
```

Run → Expected: PASS.

- [ ] **Step 3: Ação**

Create `src/app/admin/settings/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { checkUploadedObject } from "@/lib/pdf-upload";
import { prisma } from "@/lib/prisma";
import { deleteObject, headObject } from "@/lib/s3";
import { requireAdmin } from "@/lib/session";
import { fieldErrorsOf, settingsInputSchema, type SettingsInput } from "@/lib/validations";

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os campos destacados.", fieldErrorsOf(parsed.error));
  const v = parsed.data;
  const current = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { photoKey: true } });
  if (v.photoKey && v.photoKey !== current?.photoKey) {
    const problem = checkUploadedObject(await headObject(v.photoKey), "image");
    if (problem) return fail(problem, { photoKey: [problem] });
  }
  const data = { ...v } as unknown as Prisma.SiteSettingsUpdateInput;
  await prisma.siteSettings.update({ where: { id: 1 }, data });
  if (current?.photoKey && current.photoKey !== v.photoKey) await deleteObject(current.photoKey);
  revalidatePath("/", "layout");
  return ok();
}
```

- [ ] **Step 4: Uploader de imagem**

Create `src/components/admin/image-uploader.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon, Loader2, X } from "lucide-react";
import { requestUpload } from "@/app/admin/upload-actions";
import { siteConfig } from "@/config/site";

export function ImageUploader({ value, onChange }: { value: string | null; onChange: (key: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(value ? "/api/photo" : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const r = await requestUpload("image", { fileName: file.name, size: file.size, contentType: file.type });
      if (!r.ok) throw new Error(r.error);
      const put = await fetch(r.data.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Não conseguimos enviar a imagem. Tente de novo.");
      setPreview(URL.createObjectURL(file));
      onChange(r.data.key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    maxSize: siteConfig.imageMaxBytes,
    disabled: busy,
    onDropAccepted: ([f]) => void upload(f),
    onDropRejected: ([r]) => setError(r.errors[0]?.code === "file-too-large" ? "A imagem pode ter no máximo 5 MB." : "Envie uma imagem JPG, PNG ou WebP."),
  });

  return (
    <div className="flex items-center gap-4">
      <div {...getRootProps()} className="flex size-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-surface">
        <input {...getInputProps()} aria-label="Escolher foto" />
        {busy ? <Loader2 className="size-6 animate-spin" aria-hidden /> : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Sua foto" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="space-y-1 text-sm">
        <p>Toque na imagem para trocar a foto (JPG, PNG ou WebP, até 5 MB).</p>
        {value && (
          <button type="button" onClick={() => { onChange(null); setPreview(null); }} className="inline-flex min-h-11 items-center gap-1 underline">
            <X className="size-4" aria-hidden /> Remover foto
          </button>
        )}
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Formulário e página de apresentação**

Create `src/app/admin/settings/_components/settings-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";
import { updateSettings } from "@/app/admin/settings/actions";
import { ImageUploader } from "@/components/admin/image-uploader";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsInput } from "@/lib/validations";

type Values = Omit<SettingsInput, "aboutCourse" | "audience" | "learnings" | "bio" | "approach"> & Record<"aboutCourse" | "audience" | "learnings" | "bio" | "approach", JSONContent>;

const TEXT_FIELDS: { key: "courseTitle" | "courseSubtitle" | "psychologistName" | "crp" | "contactUrl"; label: string; hint?: string }[] = [
  { key: "courseTitle", label: "Título do curso" },
  { key: "courseSubtitle", label: "Frase de apresentação" },
  { key: "psychologistName", label: "Seu nome (como aparece no site)" },
  { key: "crp", label: "CRP" },
  { key: "contactUrl", label: "Link de contato", hint: "Ex.: link do WhatsApp https://wa.me/55DDDNUMERO" },
];
const DOC_FIELDS: { key: "aboutCourse" | "audience" | "learnings" | "bio" | "approach"; label: string }[] = [
  { key: "aboutCourse", label: "Sobre o curso" },
  { key: "audience", label: "Para quem é" },
  { key: "learnings", label: "O que você vai aprender" },
  { key: "bio", label: "Sobre você" },
  { key: "approach", label: "Sua abordagem" },
];

export function SettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await updateSettings(values);
      if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
      setErrors({});
      toast.success("Apresentação atualizada.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <Label>Sua foto</Label>
        <ImageUploader value={values.photoKey ?? null} onChange={(k) => set("photoKey", k)} />
        {errors.photoKey && <p className="text-sm text-destructive">{errors.photoKey[0]}</p>}
      </div>
      {TEXT_FIELDS.map((f) => (
        <div key={f.key} className="space-y-2">
          <Label htmlFor={f.key}>{f.label}</Label>
          <Input id={f.key} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="h-12" aria-invalid={Boolean(errors[f.key])} />
          {f.hint && <p className="text-sm text-muted-foreground">{f.hint}</p>}
          {errors[f.key] && <p className="text-sm text-destructive">{errors[f.key][0]}</p>}
        </div>
      ))}
      {DOC_FIELDS.map((f) => (
        <div key={f.key} className="space-y-2">
          <Label htmlFor={f.key}>{f.label}</Label>
          <RichTextEditor id={f.key} label={f.label} value={values[f.key]} onChange={(v) => set(f.key, v)} />
          {errors[f.key] && <p className="text-sm text-destructive">{errors[f.key][0]}</p>}
        </div>
      ))}
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="submit" className="h-12 w-full sm:w-auto sm:px-8" disabled={pending}>{pending ? "Salvando…" : "Salvar apresentação"}</Button>
      </div>
    </form>
  );
}
```

Create `src/app/admin/settings/page.tsx`:

```tsx
import type { Metadata } from "next";
import { getSiteSettings } from "@/data/settings";
import { SettingsForm } from "./_components/settings-form";

export const metadata: Metadata = { title: "Apresentação" };

export default async function SettingsPage() {
  const s = await getSiteSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Apresentação</h1>
        <p className="text-muted-foreground">Estes textos aparecem na página inicial do site e no rodapé.</p>
      </div>
      <SettingsForm initial={s} />
    </div>
  );
}
```

- [ ] **Step 6: Visão geral `/admin`**

Replace `src/app/admin/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ModuleMarker } from "@/components/brand/module-marker";
import { ProgressBar } from "@/components/course/progress-bar";
import { siteConfig } from "@/config/site";
import { listParticipants } from "@/data/participants";
import { moduleColor } from "@/lib/module-colors";

export const metadata: Metadata = { title: "Visão geral" };

export default async function AdminOverview() {
  const { rows, aggregate, outline } = await listParticipants();
  const inactive = rows.filter((r) => r.status === "inactive");
  const never = rows.filter((r) => r.status === "never");
  const card = "rounded-card border bg-surface p-5";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Visão geral</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}><p className="text-sm text-muted-foreground">Participantes ativos</p><p className="text-3xl font-extrabold">{aggregate.participants}</p></div>
        <div className={card}><p className="text-sm text-muted-foreground">Conclusão média do curso</p><p className="text-3xl font-extrabold text-primary">{aggregate.averagePercent}%</p></div>
        <div className={card}><p className="text-sm text-muted-foreground">Precisam de atenção</p><p className="text-3xl font-extrabold">{inactive.length + never.length}</p></div>
      </div>

      <section className={card}>
        <h2 className="text-lg font-bold">Conclusão média por módulo</h2>
        <ul className="mt-4 space-y-4">
          {outline.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3">
              <ModuleMarker color={moduleColor(i)} size="sm" />
              <span className="w-40 shrink-0 truncate sm:w-64">{m.title}</span>
              <div className="flex-1"><ProgressBar percent={aggregate.moduleAverages[m.id] ?? 0} color={moduleColor(i)} label={`Média do módulo ${m.title}`} /></div>
              <span className="w-12 text-right font-bold">{aggregate.moduleAverages[m.id] ?? 0}%</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: `Inativos há ${siteConfig.inactiveAfterDays} dias ou mais`, list: inactive, empty: "Ninguém inativo. 🌿" },
          { title: "Convidados que ainda não acessaram", list: never, empty: "Todos já acessaram." },
        ].map((block) => (
          <section key={block.title} className={card}>
            <h2 className="font-bold">{block.title}</h2>
            {block.list.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{block.empty}</p>
            ) : (
              <ul className="mt-3 divide-y">
                {block.list.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/participants/${r.id}`} className="flex min-h-12 items-center justify-between gap-3 hover:underline">
                      <span className="truncate">{r.name}</span>
                      <span className="text-sm text-muted-foreground">{r.percent}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Manual: `/admin` mostra 3 participantes ativos, média ≈ 37% ((0+33+78)/3), Bruno em "Inativos", Ana em "Convidados que ainda não acessaram"; médias por módulo coerentes. Em `/admin/settings`: trocar nome, CRP, link e foto → salvar → rodapé do `/course` mostra o novo nome/CRP; `/api/photo` redireciona para a foto; link `javascript:` é recusado.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(admin): visão geral com médias e alertas, e edição da apresentação com foto"
```

---
## Fase E — Páginas públicas, scripts e entrega

### Task 19: Landing, privacidade e conta do participante

**Files:**
- Create: `src/app/(public)/layout.tsx`, `src/app/(public)/privacy/page.tsx`, `src/app/opengraph-image.tsx`, `src/app/account/layout.tsx`, `src/app/account/page.tsx`, `src/app/account/actions.ts`, `src/app/account/_components/account-actions.tsx`, `src/app/not-found.tsx`
- Modify: `src/app/(public)/page.tsx` (substituir a provisória da Task 9)

**Interfaces:**
- Consumes: `getSiteSettings`, `getCourseOutline`, `getSessionUser`, `requireUser`, `RichText`, `Logo`, `SiteFooter`, `ModuleMarker`, `moduleColor`, `CourseHeader`, `authClient`, `ConfirmDelete`
- Produces:
  ```ts
  export async function deleteMyAccount(): Promise<ActionResult>; // só participantes
  ```

- [ ] **Step 1: Layout público**

Create `src/app/(public)/layout.tsx`:

```tsx
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/brand/site-footer";
import { getSiteSettings } from "@/data/settings";
import { getSessionUser } from "@/lib/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSiteSettings(), getSessionUser()]);
  const cta = user ? { href: user.role === "admin" ? "/admin" : "/course", label: "Ir para o curso" } : { href: "/login", label: "Entrar" };
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="Página inicial"><Logo className="h-10" priority /></Link>
        <Link href={cta.href} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90">
          {cta.label}
        </Link>
      </header>
      <div className="flex-1">{children}</div>
      <SiteFooter psychologistName={settings.psychologistName} crp={settings.crp} />
    </div>
  );
}
```

- [ ] **Step 2: Landing (substituir `src/app/(public)/page.tsx`)**

```tsx
import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { ModuleMarker } from "@/components/brand/module-marker";
import { RichText } from "@/components/rich-text/render";
import { siteConfig } from "@/config/site";
import { getCourseOutline } from "@/data/course";
import { getSiteSettings } from "@/data/settings";
import { moduleColor } from "@/lib/module-colors";

export default async function LandingPage() {
  const [s, outline] = await Promise.all([getSiteSettings(), getCourseOutline()]);
  const initials = s.psychologistName.replace(/[^\p{L} ]/gu, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const section = "mx-auto max-w-5xl px-4 py-12 sm:py-16";

  return (
    <main>
      <section className={`${section} text-center`}>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">{s.courseTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{s.courseSubtitle}</p>
        <Link href="/login" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-lg font-bold text-primary-foreground hover:bg-primary/90">
          Entrar no curso <ArrowRight className="size-5" aria-hidden />
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">Acesso por convite. Você entra só com o seu e-mail.</p>
      </section>

      <section className="bg-surface">
        <div className={`${section} grid gap-10 md:grid-cols-2`}>
          <div>
            <h2 className="text-2xl font-bold">Sobre o curso</h2>
            <RichText content={s.aboutCourse} className="mt-3" />
          </div>
          <div className="space-y-8">
            <div><h2 className="text-2xl font-bold">Para quem é</h2><RichText content={s.audience} className="mt-3" /></div>
            <div><h2 className="text-2xl font-bold">O que você vai aprender</h2><RichText content={s.learnings} className="mt-3" /></div>
          </div>
        </div>
      </section>

      {outline.length > 0 && (
        <section className={section}>
          <h2 className="text-2xl font-bold">Como o curso é organizado</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outline.map((m, i) => (
              <li key={m.id} className="rounded-card border bg-surface p-5">
                <ModuleMarker color={moduleColor(i)} size="lg" />
                <p className="mt-3 text-sm text-muted-foreground">Módulo {i + 1} · {m.items.length} conteúdo{m.items.length === 1 ? "" : "s"}</p>
                <h3 className="text-lg font-bold">{m.title}</h3>
                {m.description && <p className="mt-1 text-muted-foreground">{m.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="bg-surface">
        <div className={`${section} flex flex-col gap-8 md:flex-row md:items-start`}>
          {s.photoKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/photo" alt={`Foto de ${s.psychologistName}`} className="size-40 shrink-0 rounded-full object-cover" />
          ) : (
            <div aria-hidden className="flex size-40 shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-4xl font-extrabold text-accent-foreground">{initials}</div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{s.psychologistName}</h2>
            <p className="text-muted-foreground">Psicóloga · {s.crp}</p>
            <RichText content={s.bio} className="mt-4" />
            <h3 className="mt-6 text-lg font-bold">Abordagem</h3>
            <RichText content={s.approach} className="mt-2" />
            <a href={s.contactUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">
              Falar com {s.psychologistName}
            </a>
          </div>
        </div>
      </section>

      <section className={section}>
        <div className="flex gap-4 rounded-card bg-primary-soft p-6 text-accent-foreground">
          <HeartHandshake className="size-8 shrink-0" aria-hidden />
          <p className="text-lg">{siteConfig.ethicsNotice}</p>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Privacidade**

Create `src/app/(public)/privacy/page.tsx`:

```tsx
import type { Metadata } from "next";
import { getSiteSettings } from "@/data/settings";

export const metadata: Metadata = { title: "Política de privacidade" };

export default async function PrivacyPage() {
  const s = await getSiteSettings();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-stone max-w-none prose-headings:font-heading">
        <h1>Política de privacidade</h1>
        <p>Esta plataforma é mantida por {s.psychologistName} ({s.crp}) para oferecer o curso {s.courseTitle}.</p>
        <h2>Quais dados guardamos</h2>
        <ul>
          <li>O nome e o e-mail do responsável, informados pela psicóloga no convite.</li>
          <li>Quais conteúdos você marcou como concluídos e quando.</li>
          <li>A data do seu último acesso e o último conteúdo aberto (para o “continuar de onde parou”).</li>
        </ul>
        <p><strong>Não coletamos nenhum dado de saúde ou diagnóstico da criança.</strong></p>
        <h2>Para que usamos</h2>
        <p>Para você entrar no curso e para a psicóloga acompanhar o seu progresso e poder oferecer apoio. Seus dados não são vendidos nem compartilhados com terceiros, exceto os serviços técnicos necessários para o site funcionar (hospedagem, banco de dados, envio de e-mail e armazenamento de arquivos).</p>
        <h2>Vídeos</h2>
        <p>As aulas usam o modo de privacidade aprimorada do YouTube (youtube-nocookie.com).</p>
        <h2>Seus direitos</h2>
        <p>Você pode excluir a sua conta e todos os seus dados a qualquer momento, na página “Minha conta”. Também pode pedir informações ou correções diretamente à psicóloga: <a href={s.contactUrl}>{s.contactUrl}</a>.</p>
        <p>Este conteúdo é educativo e não substitui acompanhamento profissional individual.</p>
      </article>
    </main>
  );
}
```

- [ ] **Step 4: Conta do participante**

Create `src/app/account/actions.ts`:

```ts
"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function deleteMyAccount(): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role === "admin") return fail("Contas de administração não podem ser excluídas por aqui.");
  await prisma.user.delete({ where: { id: user.id } }); // cascade: sessões, contas e progresso
  return ok();
}
```

Create `src/app/account/_components/account-actions.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMyAccount } from "@/app/account/actions";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { authClient } from "@/lib/auth-client";

export function AccountActions({ canDelete }: { canDelete: boolean }) {
  const router = useRouter();
  const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 font-bold hover:bg-muted";
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button type="button" className={btn} onClick={async () => { await authClient.signOut(); router.replace("/"); router.refresh(); }}>
        <LogOut className="size-4" aria-hidden /> Sair
      </button>
      {canDelete && (
        <ConfirmDelete
          title="Excluir a sua conta?"
          description="Seus dados e todo o seu progresso serão apagados para sempre. Se quiser voltar depois, será preciso um novo convite."
          confirmLabel="Excluir minha conta"
          onConfirm={async () => {
            const r = await deleteMyAccount();
            if (!r.ok) return void toast.error(r.error);
            await authClient.signOut().catch(() => undefined);
            router.replace("/");
            router.refresh();
          }}
          trigger={<button type="button" className={`${btn} border-destructive/40 text-destructive`}><Trash2 className="size-4" aria-hidden /> Excluir minha conta</button>}
        />
      )}
    </div>
  );
}
```

Create `src/app/account/layout.tsx` (reaproveita o visual do curso):

```tsx
export { default } from "@/app/course/layout";
```

Create `src/app/account/page.tsx`:

```tsx
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AccountActions } from "./_components/account-actions";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <h1 className="text-3xl font-extrabold">Minha conta</h1>
      <dl className="space-y-3 rounded-card border bg-surface p-5">
        <div><dt className="text-sm text-muted-foreground">Nome</dt><dd className="font-bold">{user.name}</dd></div>
        <div><dt className="text-sm text-muted-foreground">E-mail</dt><dd className="font-bold">{user.email}</dd></div>
      </dl>
      <p className="text-sm text-muted-foreground">Para corrigir o seu nome ou e-mail, fale com a psicóloga.</p>
      <AccountActions canDelete={user.role === "participant"} />
    </main>
  );
}
```

- [ ] **Step 5: 404 e imagem social**

Create `src/app/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold">Página não encontrada</h1>
      <p className="mt-3 text-muted-foreground">Talvez este conteúdo tenha mudado de lugar.</p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground">Voltar ao início</Link>
    </main>
  );
}
```

Create `src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const colors = ["#F0694F", "#F6B843", "#3DBE9C", "#8E7BD8", "#EC6C9A"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FBF8F3", color: "#26323B" }}>
        <div style={{ display: "flex", gap: 24 }}>
          {colors.map((c) => <div key={c} style={{ width: 96, height: 96, borderRadius: 28, background: c, opacity: 0.85 }} />)}
        </div>
        <div style={{ marginTop: 48, fontSize: 84, fontWeight: 800 }}>{siteConfig.name}</div>
        <div style={{ marginTop: 16, fontSize: 36, color: "#5B6670", maxWidth: 900, textAlign: "center" }}>{siteConfig.defaults.courseSubtitle}</div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 6: Verificar**

Run: `pnpm build && pnpm lint`
Manual: `/` deslogado mostra a landing completa com módulos, iniciais no lugar da foto e aviso ético; botão "Entrar". Logado, o botão vira "Ir para o curso". `/privacy` ok. Como `ana.exemplo@example.com`: `/account` → "Excluir minha conta" → confirmar → volta para `/`; tentar entrar de novo com a Ana → "Este e-mail ainda não tem acesso…". Como admin, `/account` não mostra "Excluir". 360 px sem rolagem horizontal em todas.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(public): landing acolhedora, política de privacidade e exclusão da própria conta"
```

---

### Task 20: Arquivo de usuários e script de sync

**Files:**
- Create: `data/users.example.json`, `scripts/sync-users.ts`, `scripts/lib/script-mailer.ts`
- Modify: `package.json` (script `db:sync-users`)

**Interfaces:**
- Consumes: `parseUsersFile`, `diffUsers` (Task 5), `isLocalDatabaseUrl`, `describeDatabase` (Task 5), `inviteEmail` (Task 6), `createScriptPrisma` (Task 10), `siteConfig`
- Produces: comando `pnpm db:sync-users [--file data/users.json] [--env .env.production] [--dry-run] [--yes] [--send-invites]`

- [ ] **Step 1: Exemplo versionado**

Create `data/users.example.json`:

```json
[
  { "email": "loan.matteusz@gmail.com", "name": "Loan", "role": "admin", "active": true },
  { "email": "maria.exemplo@example.com", "name": "Maria Exemplo", "role": "participant", "active": true },
  { "email": "joao.exemplo@example.com", "name": "João Exemplo", "role": "participant", "active": false }
]
```

Confirme: `git check-ignore data/users.json` → imprime o caminho; `git check-ignore data/users.example.json` → não imprime nada.

- [ ] **Step 2: Mailer para scripts (o `src/lib/email.ts` é `server-only` e não carrega fora do Next)**

Create `scripts/lib/script-mailer.ts`:

```ts
import nodemailer from "nodemailer";
import type { EmailContent } from "../../src/lib/email-templates";

export function createScriptMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    return async ({ to, subject, text }: { to: string } & EmailContent) => {
      console.info(`[email:dev] Para: ${to} · ${subject}\n${text}\n`);
    };
  }
  const port = Number(SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return async ({ to, subject, html, text }: { to: string } & EmailContent) => {
    await transport.sendMail({ from: EMAIL_FROM, to, subject, html, text });
  };
}
```

- [ ] **Step 3: `scripts/sync-users.ts`**

```ts
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
```

Add to `package.json` → `"scripts"`: `"db:sync-users": "tsx scripts/sync-users.ts"`.

- [ ] **Step 4: Verificar**

```bash
cp data/users.example.json data/users.json
pnpm db:seed
pnpm db:sync-users --dry-run
pnpm db:sync-users
pnpm db:sync-users
```

Expected:
1. `--dry-run` lista `+ criar maria…`, `+ criar joao… (participant, desativado)`, `= sem alteração: 1` (admin) e "nada foi gravado".
2. 1ª execução: `Criados: 2 · Atualizados: 0 · Sem alteração: 1`.
3. 2ª execução: `Criados: 0 · Atualizados: 0 · Sem alteração: 3` (idempotente).
4. Ana, Bruno e Carla (fora do arquivo) continuam no banco com o progresso: `psql -c "select count(*) from content_progress"` igual a antes.
5. Mude o nome da Maria e `active` do João para `true` → `~ atualizar maria… [name]`, `~ atualizar joao… [active]`.
6. Duplique a Maria em maiúsculas → erro `E-mail duplicado "maria.exemplo@example.com" nos itens 2 e 4.` e nada gravado.
7. Remoto simulado: `printf 'DATABASE_URL="postgresql://u:p@ep-x.neon.tech/db"\n' > /tmp/remote.env && pnpm db:sync-users --env /tmp/remote.env` → mostra `Banco: ep-x.neon.tech/db (REMOTO)` e depois falha ao conectar (esperado — host fictício). Com o Postgres local acessado por IP de rede (ex.: `postgresql://neuro:neuro@<IP da máquina>:5432/neuro`) o prompt `Digite "sim"` aparece; responder "não" → "Cancelado. Nada foi gravado."
8. `--send-invites` com um participante novo no arquivo → console mostra o convite só para ele.

- [ ] **Step 5: Commit**

```bash
git add data/users.example.json scripts/sync-users.ts scripts/lib/script-mailer.ts package.json
git commit -m "feat(users): sync idempotente do users.json com banco local ou remoto"
```

---

### Task 21: Deploy, documentação e verificação final

**Files:**
- Create: `scripts/migrate-if-production.mjs`
- Modify: `package.json` (build), `README.md` (atualizar mantendo a estrutura), `CHECKLIST.md` (atualizar mantendo a estrutura), `CHANGES.log`

**Interfaces:**
- Consumes: tudo.

- [ ] **Step 1: Migrations só em produção**

Create `scripts/migrate-if-production.mjs`:

```js
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  console.log("[build] Aplicando migrations no banco de produção…");
  execSync("pnpm prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`[build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "local"}: migrations não aplicadas.`);
}
```

In `package.json` → `"scripts"`: `"build": "prisma generate && node scripts/migrate-if-production.mjs && next build"` e `"postinstall": "prisma generate"`.

Run: `pnpm build` → Expected: log `VERCEL_ENV=local: migrations não aplicadas.` e build ok.

- [ ] **Step 2: README (atualizar o existente, sem reescrever do zero)**

Mantendo as seções atuais (Funcionalidades, Stack, Rodando localmente, Variáveis de ambiente, Usuários, Deploy, Guia rápido para a psicóloga, Privacidade e ética), faça estas mudanças:

1. **Status:** troque "em planejamento" por "pronto para revisão".
2. **Stack:** linha "Autenticação" → `Better Auth (código por e-mail) + e-mail via SMTP (nodemailer; Gmail)`; acrescente linha `Testes | Vitest`.
3. **Rodando localmente:** comandos reais:
   ```bash
   pnpm install
   cp .env.example .env            # e gere o BETTER_AUTH_SECRET: openssl rand -base64 32
   docker compose up -d            # Postgres + MinIO (bucket privado criado automaticamente)
   pnpm prisma migrate dev
   pnpm db:seed                    # só roda em banco local
   pnpm dev                        # http://localhost:3000 · MinIO: http://localhost:9001 (neuro / neuro-secret)
   pnpm test
   ```
   Explique: sem `SMTP_*`, os códigos e e-mails aparecem no terminal. Logins do seed: `loan.matteusz@gmail.com` (admin), `ana|bruno|carla.exemplo@example.com`.
4. **Variáveis de ambiente:** substitua a tabela pela da spec §17 (sem Resend).
5. **Deploy:** reescreva os passos:
   1. **GitHub:** criar repositório privado e `git push`.
   2. **Neon:** criar projeto (região São Paulo, `sa-east-1`), copiar a connection string **pooled** → `DATABASE_URL`.
   3. **Cloudflare R2:** criar bucket privado `neuro-suporte` (sem acesso público); em *Manage R2 API Tokens* criar token "Object Read & Write" só para esse bucket → `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`; `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=false`. Em *Settings → CORS policy* do bucket:
      ```json
      [{ "AllowedOrigins": ["https://<projeto>.vercel.app"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
      ```
   4. **Gmail:** criar uma conta Gmail do projeto → ativar verificação em 2 etapas → *Senhas de app* → gerar → `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<conta>`, `SMTP_PASS=<senha de app sem espaços>`, `EMAIL_FROM="Neuro Suporte <conta@gmail.com>"`. Limite ~500 e-mails/dia.
   5. **Vercel:** *Add New Project* → importar o repositório → em *Environment Variables* (escopo Production) cadastrar todas as variáveis, com `BETTER_AUTH_URL=https://<projeto>.vercel.app` → *Deploy*. As migrations rodam sozinhas no build de produção.
   6. **Primeiro admin:** localmente, `cp .env.example .env.production`, preencher `DATABASE_URL` (Neon), `BETTER_AUTH_URL` e SMTP; `pnpm db:sync-users --env .env.production` (confirma com "sim").
   7. **Testar:** abrir o site, entrar com o e-mail do admin, convidar um e-mail de teste externo.
6. **Nova seção "Se um dia tiver domínio próprio"**: copie o passo a passo da spec §22.1 (registro.br → Resend DNS → `SMTP_HOST=smtp.resend.com`… → domínio na Vercel).
7. **Guia rápido para a psicóloga:** expanda em linguagem simples: entrar; criar módulo; "Adicionar conteúdo" → Aula (colar link do YouTube "Não listado" e conferir a prévia) ou Documento (enviar PDF e/ou escrever); arrastar pela alça ⠿ para ordenar (no celular, segurar um instante antes de arrastar); "Ver como participante"; "Avisar participantes"; Participantes → "Convidar participante", "Reenviar convite", "Desativar acesso" (pausa sem perder o progresso) e "Excluir" (apaga tudo); Visão geral (quem está inativo há 14 dias, quem ainda não entrou); Apresentação (foto, textos, CRP, link do WhatsApp).
8. **Limitações conhecidas:** vídeos "não listados" podem ser assistidos por quem tiver o link do YouTube; plano Hobby da Vercel é para uso não comercial (o curso é gratuito); o Neon pode levar ~1 s no primeiro acesso após inatividade.

- [ ] **Step 3: CHECKLIST (atualizar o existente)**

1. Seção 1: troque "Domínio próprio registrado (necessário para o envio de e-mails pelo Resend)" por "Conta Gmail do projeto com verificação em 2 etapas e senha de app"; marque `[x]` em "Pasta `assets/`…" (logo) e "Direção visual definida" e "Recursos extras decididos".
2. Seção 2 → Ambiente: acrescente `- [ ] pnpm test passa (progresso, YouTube, users.json, db-guard, reorder, validações, e-mails)`.
3. Seção 2 → Usuários: troque "Rodar o sync duas vezes não duplica usuários" por "Rodar o sync duas vezes: a 2ª mostra Criados: 0 · Atualizados: 0".
4. Seção 2 → Conteúdo: acrescente "Avisar participantes envia só para ativos e mostra 'Avisado em dd/mm'".
5. Seção 2 → Participante: acrescente "No celular, o PDF abre por 'Abrir PDF'" e "URL do PDF copiada expira após 5 minutos".
6. Seção 2 → Acompanhamento: acrescente "Admin não aparece nas estatísticas".
7. Seção 3: troque "Domínio verificado no Resend (DNS)" por "Senha de app do Gmail configurada (SMTP_*)"; acrescente "CORS do bucket R2 liberando PUT/GET para o domínio da Vercel".
8. Seção 4: troque "Convite de teste chega a um e-mail externo (não só ao dono da conta Resend)" por "Convite de teste chega a um e-mail externo (Gmail SMTP)".

- [ ] **Step 4: Verificação final completa (skill `superpowers:verification-before-completion`)**

```bash
docker compose down -v && docker compose up -d
pnpm install
pnpm prisma migrate reset --force   # recria o banco e roda o seed
pnpm test
pnpm lint
pnpm build
node scripts/contrast.mjs
```

Expected: tudo verde. Então percorra **toda** a seção 2 do `CHECKLIST.md` manualmente com `pnpm start` (build de produção local) em 360 px, 768 px e 1280 px, marcando cada item. Qualquer item que falhar volta para a task dona dele (via `superpowers:systematic-debugging`).

Faça também o passe manual OWASP (regra do pipeline do CLAUDE.md) nos pontos de entrada: login (rate limit funcionando: 4 pedidos de código em 1 minuto → 4º recusado), todas as Server Actions de `/admin` chamadas por um participante (abra o DevTools logado como participante e chame `fetch` de uma action → redirect/erro, nunca sucesso), `/api/pdf` sem sessão, `requestUpload` com `contentType` falso, campos com `<script>` no nome do participante e no título de conteúdo (aparecem como texto).

- [ ] **Step 5: Review**

Rode `/code-review` e o agent `feature-dev:code-reviewer` sobre o branch; trate os achados com `superpowers:receiving-code-review`. Depois, `superpowers:finishing-a-development-branch`. **Não faça push nem deploy** (regra do PROMPT).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: README e CHECKLIST com setup, deploy gratuito e guia da psicóloga"
```
