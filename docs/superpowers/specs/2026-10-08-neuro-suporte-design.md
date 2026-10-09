# Neuro Suporte — Design (blueprint)

Data: 2026-10-08 · Status: aguardando revisão · Fonte dos requisitos: [PROMPT.md](../../../PROMPT.md)

## 1. Contexto e decisões confirmadas

Plataforma web de **um único curso** (não é LMS de vários cursos) de uma psicóloga para **pais e cuidadores de crianças autistas**. O curso tem módulos; cada módulo tem conteúdos ordenados (aula em vídeo ou documento). Pais acessam principalmente pelo celular; a psicóloga não é técnica.

Decisões tomadas na entrevista (além das já marcadas como "decidido" no PROMPT):

| # | Decisão |
|---|---|
| D1 | Direção visual: base neutra e quente (creme), cores do logo como acento; verde-menta é a cor primária, as outras 4 identificam módulos. |
| D2 | Extras: link de contato/WhatsApp (placeholder) **sim**; aviso por e-mail de novo conteúdo **sim, via botão no admin**; certificado **não**. |
| D3 | Sem domínio próprio, possivelmente nunca. Site em `*.vercel.app`. |
| D4 | E-mail via **SMTP com `nodemailer`** (Gmail com senha de app agora). **Resend removido.** Se houver domínio no futuro, troca-se só env para `smtp.resend.com`. |
| D5 | Padrões: inativo = 14 dias; sessão = 60 dias renovada no uso; PDF ≤ 20 MB; OTP vale 10 min; nome/CRP da psicóloga como placeholder. |
| D6 | Rotas em inglês; toda a interface em português. |
| D7 | Somente tema claro. |
| D8 | Admins não entram nas estatísticas de participantes. |

Itens do projeto de referência (`~/dev/larissa/master-degree-lms`) **não trazidos**: model `Course` e tudo de vários cursos, preço, slug, thumbnail, login GitHub, Arcjet, Resend, `next-themes`, `recharts`, `@tanstack/react-table`. Padrões **reaproveitados**: Better Auth + `emailOTP` + `admin`, Prisma 7 com `@prisma/adapter-pg`, `@t3-oss/env-nextjs`, uploader com `react-dropzone` + URL pré-assinada, editor Tiptap, dnd-kit, shadcn/ui. Corrigido em relação à referência: `middleware.ts` → `proxy.ts` (Next 16), ordem do drag-and-drop persistida, Postgres no docker-compose, bucket privado.

## 2. Inventário de `assets/`

| Arquivo | Uso | Destino |
|---|---|---|
| `logo.png` (palavra "neuro" + 5 quadrados arredondados: coral, âmbar, menta, lavanda, rosa) | Header, landing, e-mails, favicon/ícone; fonte da paleta | `public/brand/logo.png` (servido otimizado pelo `next/image`), `src/app/icon.png` |

**Faltam (placeholder até a psicóloga enviar):** foto da psicóloga (avatar neutro com as iniciais), nome, CRP, bio e abordagem (texto placeholder em `site.ts`), link de contato (`https://wa.me/5500000000000`), PDFs reais e links reais do YouTube (o seed usa vídeos públicos de exemplo), imagem social Open Graph (gerada com `next/og` usando logo + título).

## 3. Objetivo e critérios de aceite

**Objetivo:** pais convidados entram só com o e-mail, percorrem o curso no próprio ritmo pelo celular e marcam o que concluíram; a psicóloga monta o curso e acompanha cada participante sem ajuda técnica; deploy gratuito na Vercel.

Critérios de aceite verificáveis:

1. E-mail convidado e ativo recebe o código e entra; e-mail não convidado vê "Este e-mail ainda não tem acesso. Fale com [nome] para receber seu convite." + link de contato; participante desativado vê mensagem de acesso pausado e não entra.
2. Em dev, o OTP aparece no console do servidor.
3. Participante comum que acessa `/admin` (ou chama uma Server Action de admin) é redirecionado/recebe erro.
4. Marcar/desmarcar concluído atualiza a UI na hora e persiste; o progresso por módulo e o geral batem com as fórmulas da §6 em qualquer combinação de adicionar/mover/excluir conteúdos.
5. Reordenar (inclusive mover entre módulos) no admin aparece igual em `/course` após recarregar.
6. PDF só abre para usuário logado; a URL de leitura expira em 5 min; não existe objeto público no bucket.
7. `pnpm db:sync-users` executado 2× seguidas: a 2ª execução informa 0 criados / 0 atualizados.
8. `pnpm db:seed` com `DATABASE_URL` remota encerra com erro sem gravar.
9. `pnpm build`, `pnpm lint` e `pnpm test` passam.
10. Todas as telas usáveis em 360 px sem rolagem horizontal; contraste AA; navegação por teclado; `prefers-reduced-motion` respeitado.

## 4. Stack e versões

Versões fixadas na instalação (consultadas no npm em 2026-10-08; usar a mais recente estável no momento do `pnpm add`, sem pular major):

| Pacote | Versão | Justificativa |
|---|---|---|
| `next` | 16.4.x | App Router, Server Actions, `proxy.ts`, `after()`; mesma major da referência |
| `react` / `react-dom` | 19.x | Exigido pelo Next 16; `useOptimistic` |
| `typescript` | 5.x | — |
| `tailwindcss` + `@tailwindcss/postcss` | 4.3.x | Tokens via `@theme` |
| `@tailwindcss/typography` | 0.5.x | Renderizar rich text |
| `shadcn` (CLI) + `radix-ui` | 4.x | Componentes acessíveis, copiados para o repo |
| `prisma` / `@prisma/client` / `@prisma/adapter-pg` / `pg` | **7.10.0** (não usar a `latest`, que é 8.0.0-rc) | Mesma stack da referência; driver adapter compatível com Neon |
| `better-auth` | 1.7.x | `emailOTP` com `disableSignUp`, plugin `admin` (role/banned), rate limit em banco |
| `nodemailer` | 10.x | SMTP genérico (D4) |
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | 3.x | Mesma API para MinIO e R2 |
| `zod` | 4.x | Validação de formulários, env, `users.json`, URL do YouTube |
| `@t3-oss/env-nextjs` | 0.13.x | Env validado no build |
| `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/pm` + `@tiptap/static-renderer` | 3.x | Editor no admin; renderização em HTML no servidor para o participante |
| `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` | 6.x / 10.x | Drag-and-drop acessível (teclado incluído) |
| `react-dropzone` | 20.x | Upload de PDF |
| `input-otp` | 1.x | Campo do código de 6 dígitos |
| `sonner` | 2.x | Toasts |
| `vaul` | 1.x | Gaveta da sidebar no celular |
| `lucide-react` | — | Ícones |
| `vitest` | 5.x | Testes unitários |
| `tsx` | 4.x | Rodar `seed.ts` e `sync-users.ts` |
| `dotenv` | — | Carregar `--env` nos scripts |
| Postgres | 17 (docker `postgres:17-alpine`; Neon em produção) | — |
| MinIO | imagem `minio/minio` + `minio/mc` para criar o bucket | Dev |

Depois de instalar: ler `node_modules/next/dist/docs/` e corrigir todo aviso de deprecação antes de seguir (exigência do PROMPT).

## 5. Modelo de dados (Prisma)

As tabelas do Better Auth (`user`, `session`, `account`, `verification`, `rateLimit`) são geradas com `npx @better-auth/cli generate` e depois recebem os campos extras abaixo.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // plugin admin
  role       String?   @default("participant") // "admin" | "participant"
  banned     Boolean?  @default(false)         // true = acesso desativado
  banReason  String?
  banExpires DateTime?

  // Neuro Suporte
  lastSeenAt        DateTime?   // null = convidado e ainda não acessou
  lastContentItemId String?
  lastContentItem   ContentItem? @relation("LastContent", fields: [lastContentItemId], references: [id], onDelete: SetNull)
  inviteSentAt      DateTime?

  sessions Session[]
  accounts Account[]
  progress ContentProgress[]

  @@map("user")
}

// Session, Account, Verification, RateLimit: exatamente como gerados pelo CLI do Better Auth.

model Module {
  id          String        @id @default(uuid())
  title       String
  description String?
  position    Int
  items       ContentItem[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([position])
  @@map("module")
}

enum ContentType {
  VIDEO
  DOCUMENT
}

model ContentItem {
  id         String      @id @default(uuid())
  moduleId   String
  module     Module      @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  type       ContentType
  title      String
  position   Int
  body       Json?       // documento Tiptap (JSON)
  youtubeId  String?     // VIDEO
  pdfKey     String?     // DOCUMENT
  pdfName    String?
  pdfSize    Int?
  notifiedAt DateTime?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  progress     ContentProgress[]
  lastSeenBy   User[] @relation("LastContent")

  @@index([moduleId, position])
  @@map("content_item")
}

model ContentProgress {
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  contentItemId String
  contentItem   ContentItem @relation(fields: [contentItemId], references: [id], onDelete: Cascade)
  completedAt   DateTime    @default(now())

  @@id([userId, contentItemId])
  @@index([contentItemId])
  @@map("content_progress")
}

model SiteSettings {
  id               Int     @id @default(1)
  courseTitle      String
  courseSubtitle   String
  aboutCourse      Json    // Tiptap
  audience         Json    // "para quem é"
  learnings        Json    // "o que você vai aprender"
  psychologistName String
  crp              String
  bio              Json
  approach         Json
  photoKey         String? // foto no bucket (leitura via URL pré-assinada)
  contactUrl       String
  updatedAt        DateTime @updatedAt

  @@map("site_settings")
}
```

Regras de integridade:
- Validação por tipo em Zod (união discriminada por `type`): `VIDEO` exige `youtubeId`; `DOCUMENT` exige `pdfKey` **ou** `body` não vazio.
- `SiteSettings` é linha única: lida com `upsert` usando os valores de `src/config/site.ts` como padrão, então o site funciona antes de qualquer edição.
- Novo tipo de conteúdo no futuro = novo valor no enum + campos opcionais + um renderer + um formulário. Nada no progresso muda.

## 6. Lógica de progresso

Fórmulas (sempre a partir dos dados atuais; nenhum percentual é armazenado):

- `moduleProgress(m, u) = concluídos de u entre os itens atuais de m ÷ itens atuais de m` (módulo com 0 itens → 0% e não conta como "concluído")
- `courseProgress(u) = concluídos de u entre todos os itens atuais ÷ total de itens atuais` (curso com 0 itens → 0%)
- Curso concluído ⇔ `courseProgress = 100%` e total > 0.
- Percentual exibido = `Math.round(x * 100)`; a regra de "concluído" usa a contagem exata, não o arredondado.

`src/lib/progress.ts` é **puro** (sem Prisma), consumido pelo participante e pelo admin:

```ts
type CourseShape = { modules: { id: string; itemIds: string[] }[] };
computeProgress(shape: CourseShape, completedItemIds: Set<string>): {
  overall: { done: number; total: number; percent: number; complete: boolean };
  modules: Record<string, { done: number; total: number; percent: number; complete: boolean }>;
};
```

Conclusões de itens que não estão em `shape` são ignoradas, o que torna o cálculo correto mesmo durante mudanças concorrentes.

Comportamento nas edições do admin:
- **Adicionar** item: entra no total; ninguém o tem concluído → percentuais caem levemente (esperado).
- **Mover** item entre módulos: muda só `moduleId`/`position`; a conclusão acompanha o item.
- **Excluir** item ou módulo: cascade remove as conclusões; os percentuais se recalculam.

Sem N+1 na lista de participantes (`src/data/participants.ts`): exatamente **3 consultas**, independente do número de participantes:
1. Estrutura do curso: `module.findMany({ select: { id, items: { select: { id } } }, orderBy: position })`.
2. Participantes: `user.findMany({ where: { role: "participant" } })`.
3. Conclusões: `contentProgress.findMany({ where: { user: { role: "participant" } }, select: { userId, contentItemId } })`, agrupadas em memória num `Map<userId, Set<itemId>>`.

Depois, `computeProgress` roda para cada participante. É adequado até alguns milhares de participantes; acima disso, troca-se a consulta 3 por um `groupBy` em SQL, sem mudar a interface. Os agregados do admin (total de participantes, média geral, média por módulo) saem do mesmo resultado.

Na página do participante: 2 consultas (estrutura + conclusões do usuário).

"Continuar de onde parou": `user.lastContentItemId`; se for null (nunca abriu nada ou o item foi excluído), o botão leva ao primeiro item não concluído na ordem do curso.

Mensagem de encorajamento: depois do toggle otimista, o cliente recalcula com `computeProgress` (a estrutura do módulo já está na página). Se o item marcado fechou o módulo (ou o curso), aparece um cartão acolhedor inline com link para o próximo módulo. Ao desmarcar, nada é exibido.

## 7. Estratégia de reordenação

- `position` é um inteiro contíguo (0..n-1) por escopo: módulos no curso; itens dentro de um módulo.
- O admin arrasta (dnd-kit, também por teclado). Ao soltar, a UI atualiza otimisticamente e chama uma Server Action com o **estado final completo** dos escopos afetados:
  - `reorderModules(orderedModuleIds: string[])`
  - `reorderItems(changes: { moduleId: string; orderedItemIds: string[] }[])`: um elemento quando o item ficou no mesmo módulo; dois (origem e destino) quando mudou de módulo.
- O servidor valida (Zod + todos os IDs existem e pertencem aos escopos informados) e grava em **uma `prisma.$transaction`**: para cada item, `update { moduleId, position: index }`. Listas são pequenas (dezenas), então regravar tudo é simples e elimina buracos e duplicatas.
- Depois, `revalidatePath("/course", "layout")` e `revalidatePath("/admin/content")`. Se der erro, a UI volta ao estado anterior e mostra um toast.
- Itens novos entram com `position = max + 1` do módulo.

## 8. Armazenamento de PDFs

- `src/lib/s3.ts`: um `S3Client` com `endpoint`, `region`, credenciais e `forcePathStyle` vindos do env. Dev: MinIO (`http://localhost:9000`, `forcePathStyle=true`). Produção: Cloudflare R2 (`https://<accountid>.r2.cloudflarestorage.com`, região `auto`).
- Bucket **privado** (o docker-compose cria o bucket sem política pública via `minio/mc`; no R2, bucket sem acesso público e sem domínio público).
- **Upload** (só admin): Server Action `createPdfUpload({ fileName, size, contentType })` → valida `contentType === "application/pdf"` e `size ≤ 20 MB` → gera a chave `pdfs/<uuid>.pdf` → devolve uma URL `PUT` pré-assinada de 5 min, com `ContentType` e `ContentLength` assinados. O navegador envia direto ao bucket; o formulário salva `pdfKey`, `pdfName` e `pdfSize`. No salvamento, o servidor confirma com `HeadObject` que o objeto existe e respeita os limites.
- **CORS do bucket:** permitir `PUT` de `BETTER_AUTH_URL` (documentado para MinIO e R2).
- **Leitura**: `GET /api/pdf/[itemId]?download=1` → exige sessão (participante ativo ou admin) → URL `GET` pré-assinada de 5 min (`ResponseContentDisposition` inline ou attachment com o nome original) → `302`. Ninguém recebe link permanente.
- **Remoção:** ao trocar ou excluir o PDF de um item (ou excluir o item/módulo), o objeto é apagado do bucket depois do commit no banco (falha na remoção só gera log).
- **Foto da psicóloga:** mesmo fluxo (JPEG/PNG/WebP ≤ 5 MB, chave `images/…`); na landing, servida por uma rota que redireciona para a URL pré-assinada, com cache curto.
- **Exibição:** no desktop, o PDF aparece embutido (`<iframe>` com a URL da rota); no celular, apenas os botões grandes "Abrir PDF" e "Baixar" (visualizadores embutidos não são confiáveis no iOS/Android).

## 9. Rotas e regras de acesso

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | público | Landing: apresentação, psicóloga (foto, nome, CRP, abordagem), para quem é, o que vai aprender, visão geral dos módulos (só títulos e descrições), aviso ético, CTA "Entrar" |
| `/privacy` | público | Política de privacidade simples |
| `/login` | público (logado → redireciona) | E-mail; aceita `?email=` pré-preenchido |
| `/login/verify` | público | Código de 6 dígitos, reenviar código |
| `/course` | participante ativo ou admin | Home: progresso geral, "Continuar de onde parou", módulos com barra |
| `/course/[itemId]` | idem | Conteúdo + concluir + anterior/próximo + sidebar |
| `/account` | idem | Nome, e-mail, sair, excluir conta |
| `/admin` | admin | Visão geral (agregados + inativos + convidados sem acesso) |
| `/admin/content` | admin | Árvore módulos → itens com drag-and-drop; criar módulo; "Adicionar aula" / "Adicionar documento" |
| `/admin/content/new`, `/admin/content/[id]` | admin | Editar item; preview do YouTube; upload de PDF; "Ver como participante"; "Avisar participantes" |
| `/admin/participants` | admin | Lista com busca, ordenação, badges (inativo, não acessou, desativado); convidar |
| `/admin/participants/[id]` | admin | Detalhe do progresso; editar; reenviar convite; desativar/reativar; excluir |
| `/admin/settings` | admin | Editar `SiteSettings` |
| `/api/auth/[...all]` | Better Auth | — |
| `/api/pdf/[itemId]` | logado e ativo | Redirect para URL pré-assinada |
| `/api/photo` | público | Redirect para URL pré-assinada da foto da psicóloga (landing) |

Camadas de proteção:
1. `src/proxy.ts`: sem cookie de sessão em `/course*`, `/account*` ou `/admin*` → redirect para `/login`. Só uma otimização, não uma barreira.
2. `src/lib/session.ts`: `requireUser()` (sessão válida e não banido) e `requireAdmin()` (`role === "admin"`), chamados nos layouts **e** no início de toda Server Action e Route Handler.
3. Participante tentando abrir `/admin` → redirect para `/course`.

Better Auth (`src/lib/auth.ts`):
- `emailOTP({ disableSignUp: true, otpLength: 6, expiresIn: 600, sendVerificationOTP })`; em `NODE_ENV !== "production"` também faz `console.log` do código. O envio é **aguardado** (no serverless, um envio não aguardado pode ser cortado).
- `hooks.before` na rota `/email-otp/send-verification-otp`: normaliza o e-mail; usuário inexistente → `APIError("FORBIDDEN", { code: "NOT_INVITED" })`; `banned` → `code: "ACCESS_DISABLED"`. O cliente mapeia os códigos para as mensagens gentis. Aceito conscientemente: isso permite saber se um e-mail está convidado (mitigado com rate limit).
- `rateLimit: { enabled: true, storage: "database", customRules: { "/email-otp/send-verification-otp": { window: 60, max: 3 }, "/sign-in/email-otp": { window: 60, max: 5 } } }`.
- `session: { expiresIn: 60 dias, updateAge: 1 dia }`.
- Plugin `admin()` (role e ban); `advanced.ipAddress` configurado para os headers da Vercel (`x-forwarded-for`).

Fluxos:
- **Convite (admin):** formulário nome + e-mail (Zod; e-mail em minúsculas; duplicado → erro no campo) → cria `User` (`role=participant`, `emailVerified=false`) → envia e-mail de boas-vindas com link `${BETTER_AUTH_URL}/login?email=…` e 2 passos ("digite seu e-mail", "use o código que chegar") → `inviteSentAt = now`. Se o envio falhar, o usuário fica criado e aparece um toast com "Reenviar convite".
- **Desativar/reativar:** `banned = true/false` + revogar sessões ao desativar. O progresso permanece.
- **Excluir participante (admin) ou a própria conta:** confirmação → `delete user` (cascade apaga sessões e progresso) → para a própria conta, logout e redirect para `/`.
- **Visita a conteúdo:** `after(() => update user { lastSeenAt, lastContentItemId })`, só para participantes.
- **Avisar participantes:** confirmação ("Enviar para N participantes ativos?") → envio em lotes de 10 com pausa de 1 s (limites do Gmail) → `notifiedAt = now`. O botão passa a mostrar "Avisado em dd/mm" e pede confirmação extra para reenviar.

## 10. E-mail

- `src/lib/email.ts`: `sendMail({ to, subject, html, text })` sobre um transport `nodemailer` criado a partir de `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
- Gmail: `smtp.gmail.com:465` (TLS) com **senha de app** (exige verificação em duas etapas na conta). Limite ~500 destinatários/dia.
- Três templates em funções TS que retornam HTML inline simples (sem lib de templates): código de acesso, boas-vindas/convite, novo conteúdo. Todos com versão texto puro, logo, tom acolhedor e o rodapé "conteúdo educativo, não substitui acompanhamento profissional".

## 11. Design system

Tokens (`src/app/globals.css`, `@theme`):

| Token | Valor | Uso |
|---|---|---|
| `--color-background` | `#FBF8F3` | Fundo |
| `--color-surface` | `#FFFFFF` | Cards |
| `--color-ink` | `#26323B` | Texto |
| `--color-muted` | `#5B6670` | Texto secundário |
| `--color-border` | `#ECE5DA` | Bordas |
| `--color-primary` | `#1F7A66` | Botões, progresso, links |
| `--color-primary-soft` | `#DDF3EC` | Fundos de destaque |
| `--color-coral-soft` / `--color-coral` | `#FDE5DF` / `#B2432C` | Módulo |
| `--color-amber-soft` / `--color-amber` | `#FCF0D2` / `#8A5A00` | Módulo |
| `--color-lavender-soft` / `--color-lavender` | `#ECE8FA` / `#5B48A8` | Módulo |
| `--color-pink-soft` / `--color-pink` | `#FCE4EE` / `#A8325F` | Módulo |
| `--color-mint-soft` / `--color-mint` | `#DDF3EC` / `#1F7A66` | Módulo |
| `--radius-card` | `1.25rem` | Cantos (eco dos quadrados do logo) |

- Cor do módulo = `palette[position % 5]` na ordem coral, âmbar, menta, lavanda, rosa (a ordem do logo).
- Contraste: os pares acima serão verificados (ferramenta de contraste) durante a implementação; qualquer par abaixo de 4.5:1 para texto é escurecido.
- Tipografia (`next/font/google`): **Nunito** (títulos, 600–800) e **Atkinson Hyperlegible Next** (texto, 400/700). Base de 17 px no celular e 18 px no desktop; linha de 1.6; largura de leitura ≤ 68ch.
- Componentes: shadcn (Button, Input, Dialog, AlertDialog, Sheet/Drawer, Progress, Badge, Tabs, Sonner, InputOTP) reestilizados pelos tokens. Componentes próprios: `ModuleMarker` (quadradinho arredondado na cor do módulo), `ProgressRing`/`ProgressBar`, `ContentSidebar`, `CompleteButton` (fixo embaixo no celular), `EncouragementCard`, `YouTubeEmbed` (16:9, `youtube-nocookie.com`, `loading="lazy"`, título acessível), `PdfActions`, `TypeChooser` (dois cartões grandes "Aula em vídeo" / "Documento").
- Acessibilidade: alvos ≥ 44 px, foco visível (anel da cor primária), `prefers-reduced-motion` desliga as transições, landmarks e headings em ordem, dnd-kit com instruções de teclado em português.
- Tom de voz: "você", frases curtas, sem jargão clínico, sem promessa de resultado ou "cura" (diretrizes de publicidade do CFP). Exemplos: "Você concluiu *Rotina e previsibilidade*. Cada passo conta — siga no seu ritmo." · "Ainda não há conteúdos aqui. Volte em breve." · "Não conseguimos salvar agora. Tente de novo em instantes."
- Aviso ético fixo no rodapé de todas as páginas e na landing: "Este conteúdo é educativo e não substitui acompanhamento profissional individual."

## 12. Estrutura de arquivos

```
.
├── docker-compose.yml            # postgres:17-alpine, minio, minio-init (mc: cria bucket privado + CORS)
├── .env.example
├── .gitignore                    # inclui data/users.json, .env*, !.env.example, .superpowers/
├── data/users.example.json
├── prisma.config.ts
├── prisma/{schema.prisma, migrations/, seed.ts}
├── scripts/sync-users.ts
├── public/brand/logo.{png,webp}
├── vitest.config.ts
└── src/
    ├── proxy.ts
    ├── config/site.ts
    ├── generated/prisma/          # gerado, no .gitignore
    ├── app/
    │   ├── layout.tsx · globals.css · icon.png · opengraph-image.tsx · not-found.tsx
    │   ├── (public)/{layout.tsx, page.tsx, privacy/page.tsx}
    │   ├── (auth)/login/{page.tsx, verify/page.tsx, _components/*}
    │   ├── course/{layout.tsx, page.tsx, [itemId]/page.tsx, actions.ts, _components/*}
    │   ├── account/{page.tsx, actions.ts}
    │   ├── admin/
    │   │   ├── layout.tsx · page.tsx
    │   │   ├── content/{page.tsx, actions.ts, [id]/page.tsx, _components/*}
    │   │   ├── participants/{page.tsx, actions.ts, [id]/page.tsx, _components/*}
    │   │   └── settings/{page.tsx, actions.ts}
    │   └── api/{auth/[...all]/route.ts, pdf/[itemId]/route.ts, photo/route.ts}
    ├── components/{ui/*, brand/*, course/*, admin/*, rich-text/{editor.tsx, render.tsx}}
    ├── data/{course.ts, participants.ts, settings.ts}     # consultas server-only
    └── lib/
        ├── auth.ts · auth-client.ts · session.ts
        ├── prisma.ts · env.ts · s3.ts · email.ts · email-templates.ts
        ├── progress.ts (+ progress.test.ts)
        ├── youtube.ts (+ youtube.test.ts)
        ├── users-file.ts (+ users-file.test.ts)     # schema Zod do users.json
        ├── db-guard.ts (+ db-guard.test.ts)         # local vs remoto
        ├── validations.ts                            # schemas de formulários
        └── utils.ts
```

## 13. `src/config/site.ts`

Único arquivo para dados fixos e textos padrão:

```ts
export const siteConfig = {
  name: "Neuro Suporte",
  defaults: {               // valores iniciais do SiteSettings
    courseTitle, courseSubtitle, aboutCourse, audience, learnings,
    psychologistName: "[Nome da Psicóloga]",
    crp: "CRP 00/00000",
    bio, approach,
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
```

## 14. Helper do YouTube (`src/lib/youtube.ts`)

```ts
export function extractYouTubeId(input: string): string | null
export const youtubeUrlSchema = z.string().trim().transform((v, ctx) => {
  const id = extractYouTubeId(v);
  if (!id) { ctx.addIssue({ code: "custom", message: "Cole um link válido do YouTube." }); return z.NEVER; }
  return id;
});
export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
```

Aceita: `youtube.com/watch?v=ID` (com `&t=`, `&list=`, `&si=`), `m.youtube.com/watch?v=`, `youtu.be/ID?si=`, `youtube.com/embed/ID`, `youtube-nocookie.com/embed/ID`, `youtube.com/shorts/ID`, `youtube.com/live/ID` e o ID puro de 11 caracteres. O ID é validado com `/^[A-Za-z0-9_-]{11}$/` e o host com uma allowlist (o parse usa `new URL`, não regex no texto inteiro). No admin, assim que o ID é válido, aparece o preview do embed para a psicóloga confirmar.

## 15. Seed de desenvolvimento (`prisma/seed.ts`, `pnpm db:seed`)

- Primeira linha: `assertLocalDatabase(process.env.DATABASE_URL)` de `db-guard.ts`. Aceita só os hosts `localhost`, `127.0.0.1` e `::1`; qualquer outro → mensagem clara e `process.exit(1)` antes de conectar.
- Limpa e recria: `SiteSettings` (padrões), 3 módulos:
  1. "Entendendo o autismo" — 2 itens (vídeo, documento)
  2. "Rotina e previsibilidade" — 4 itens (vídeo, documento, vídeo, documento)
  3. "Comunicação e vínculo" — 3 itens (documento, vídeo, vídeo)
- Textos placeholder acolhedores e realistas, sem promessa de resultado; documentos com texto Tiptap; um documento com um PDF de exemplo enviado ao MinIO pelo seed (gerado pelo próprio script como PDF mínimo válido).
- Usuários: admin `loan.matteusz@gmail.com`; participantes fictícios `ana.exemplo@example.com` (convidada, nunca acessou: `lastSeenAt=null`), `bruno.exemplo@example.com` (~30%, último acesso há 20 dias → aparece como inativo), `carla.exemplo@example.com` (~80%, acesso ontem).

## 16. Arquivo de usuários e sync

`data/users.json` (no `.gitignore`); `data/users.example.json` versionado:

```json
[
  { "email": "loan.matteusz@gmail.com", "name": "Loan", "role": "admin", "active": true },
  { "email": "maria.exemplo@example.com", "name": "Maria Exemplo", "role": "participant", "active": true }
]
```

`pnpm db:sync-users [--file data/users.json] [--env .env.production] [--dry-run] [--yes] [--send-invites]` (`tsx scripts/sync-users.ts`):

1. Lê os argumentos com `node:util` `parseArgs`; carrega `--env` com `dotenv` (`override: true`); exige `DATABASE_URL`.
2. Valida o arquivo com `usersFileSchema` (array; e-mail válido normalizado para minúsculas; `name` não vazio; `role ∈ {admin, participant}`; `active` boolean; e-mails duplicados → erro com os índices). Qualquer erro → lista os problemas e sai com código 1 **sem conectar ao banco**.
3. Calcula o diff contra o banco (busca todos os e-mails do arquivo de uma vez) → cada item é `create`, `update` (lista os campos alterados) ou `unchanged`.
4. `--dry-run` → imprime o diff e sai.
5. Banco remoto (`!isLocalDatabase`) → imprime `Banco remoto: <host>/<db>` e pede para digitar `sim`, a não ser que haja `--yes`.
6. Aplica numa transação: `create` (com `emailVerified=false`, `banned=!active`) e `update` (nome, role, banned). **Nunca** apaga ninguém nem mexe em progresso.
7. `--send-invites` → após o commit, envia o convite só aos participantes **criados nesta execução** e ativos, atualizando `inviteSentAt`.
8. Imprime: `Criados: X · Atualizados: Y · Sem alteração: Z` (+ convites enviados).

## 17. Variáveis de ambiente (`src/lib/env.ts` + `.env.example`)

| Variável | Exemplo dev | Uso |
|---|---|---|
| `DATABASE_URL` | `postgresql://neuro:neuro@localhost:5432/neuro` | Postgres |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | Assinatura das sessões |
| `BETTER_AUTH_URL` | `http://localhost:3000` | URL base (links dos e-mails, CORS) |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `465` | E-mail |
| `SMTP_USER` / `SMTP_PASS` | conta Gmail / senha de app | E-mail |
| `EMAIL_FROM` | `"Neuro Suporte <conta@gmail.com>"` | Remetente |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO/R2 |
| `S3_REGION` | `us-east-1` (R2: `auto`) | — |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | `neuro` / `neuro-secret` | — |
| `S3_BUCKET` | `neuro-suporte` | — |
| `S3_FORCE_PATH_STYLE` | `true` (R2: `false`) | — |

Em dev, sem `SMTP_*`, o envio é desativado e tudo vai para o console (as variáveis SMTP são opcionais em dev e obrigatórias em produção, via validação condicional).

## 18. Deploy e migrations

- `package.json`: `"build": "prisma generate && node scripts/migrate-if-production.mjs && next build"`. O script roda `prisma migrate deploy` só quando `VERCEL_ENV === "production"`; previews não tocam o banco de produção (sem banco próprio, os previews não são usados para testar fluxos com dados).
- Neon: usar a connection string **pooled** em `DATABASE_URL`.
- Primeira subida: `pnpm db:sync-users --env .env.production` para criar o admin.

## 19. Testes

Vitest, unitário e em TDD (teste antes da implementação):
- `progress.test.ts`: curso vazio; módulo vazio; conclusões de item inexistente ignoradas; item movido; 100% → `complete`; arredondamento não marca concluído com 99,6%; agregados de vários participantes.
- `youtube.test.ts`: todos os formatos da §14, hosts falsos (`youtube.com.evil.com`), IDs com tamanho errado, string vazia.
- `users-file.test.ts`: válido; e-mail inválido; duplicado (case-insensitive); role inválida; campo faltando.
- `db-guard.test.ts`: localhost, 127.0.0.1, ::1 → local; Neon e IP remoto → remoto; URL inválida → erro.

O resto é coberto pelo checklist manual (§21).

## 20. Passos de implementação (alto nível; o plano detalhado vem do writing-plans)

1. Scaffold Next 16 + TS + Tailwind 4 + ESLint (pnpm), shadcn init, Vitest; ler `node_modules/next/dist/docs/`.
2. docker-compose (Postgres + MinIO + init do bucket), `.env.example`, `env.ts`.
3. Prisma 7.10 + schema + Better Auth CLI + primeira migration; `prisma.ts`.
4. TDD: `progress.ts`, `youtube.ts`, `users-file.ts`, `db-guard.ts`.
5. `email.ts` + templates; `auth.ts` (OTP, hook de convite, rate limit, sessão); `session.ts`; `proxy.ts`.
6. Design system: tokens, fontes, logo/ícone, componentes base, layout público.
7. Login (`/login`, `/login/verify`) com mensagens de erro gentis.
8. Seed de desenvolvimento.
9. Área do participante: `/course`, `/course/[itemId]` (vídeo, documento, concluir otimista, encorajamento, sidebar/gaveta, anterior/próximo, continuar de onde parou), `/account`.
10. S3: cliente, upload pré-assinado, rota `/api/pdf`, remoção.
11. Admin conteúdo: módulos e itens (CRUD), TypeChooser, preview do YouTube, upload de PDF, editor Tiptap, drag-and-drop com persistência, "ver como participante", "avisar participantes".
12. Admin participantes: lista (3 consultas), detalhe, convite, reenviar, editar, desativar/reativar, excluir.
13. Admin visão geral e `/admin/settings` (incluindo foto).
14. Landing e `/privacy`.
15. Script `sync-users`.
16. Acessibilidade e 360 px; `pnpm build`/`lint`/`test`.
17. README e CHECKLIST atualizados (mantendo a estrutura existente).

## 21. Checklist de verificação

O `CHECKLIST.md` existente cobre os itens; ajustes que entram nele:
- Trocar "Resend" por SMTP/Gmail e "Domínio verificado no Resend" por "Senha de app do Gmail criada".
- Adicionar: `pnpm test` (progresso, YouTube, users.json, db-guard); 2ª execução do sync = 0 criados / 0 atualizados; botão "Avisar participantes" envia só para ativos e registra a data; PDF no celular abre via "Abrir PDF"; URL do PDF expira (abrir a URL copiada depois de 5 min → erro); admin não aparece nas estatísticas.

## 22. Riscos e considerações

1. **E-mail sem domínio.** O PROMPT exigia explicar o Resend: o Resend só entrega a qualquer destinatário com um **domínio próprio verificado**; sem domínio, só envia ao dono da conta. Por isso a decisão D4 (Gmail SMTP). Riscos do Gmail: limite de ~500/dia; remetente @gmail.com; o Google pode bloquear envios em massa suspeitos (mitigado com lotes pequenos). Se no futuro houver domínio, o README terá o passo a passo:
   1. Comprar o domínio (ex.: registro.br).
   2. Resend → Domains → Add domain → copiar os registros DNS (MX e TXT/SPF de `send.`, TXT DKIM `resend._domainkey`, opcionalmente DMARC `_dmarc`).
   3. Criar esses registros no painel DNS do registrador, ou na Vercel se os nameservers apontarem para ela (Vercel → Domains → DNS Records).
   4. Aguardar "Verified" no Resend.
   5. Trocar as variáveis para `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASS=<API key>`, `EMAIL_FROM=contato@dominio`.
   6. (Site) Vercel → Project → Domains → adicionar o domínio e criar o `A`/`CNAME` indicado.
2. **Descoberta de e-mails convidados** pela mensagem "não tem acesso": aceito pelo requisito; mitigado com rate limit em banco.
3. **Vídeos no YouTube "não listados"** podem ser compartilhados por quem tiver o link; a proteção é só da plataforma, não do vídeo. Documentado para a psicóloga.
4. **Free tiers:** Neon suspende o banco ocioso (primeiro acesso pode levar ~1 s); R2 tem 10 GB grátis (sobra para PDFs de 20 MB); Vercel Hobby é para uso não comercial. Confirmado: o curso é **gratuito** (projeto de mestrado), então o plano Hobby atende. Se um dia for cobrado, a Vercel passa a exigir o plano Pro.
8. **Contexto de pesquisa (mestrado):** se os dados de progresso dos participantes forem usados na dissertação, o comitê de ética (CEP) pode exigir um termo de consentimento (TCLE). Isso não entra na v1; a página `/privacy` deixa explícito que a psicóloga acompanha o progresso, e um link para o TCLE pode ser acrescentado depois em `SiteSettings`/`site.ts`, se necessário.
5. **Prisma `latest` = 8.0.0-rc**: fixar 7.10.0 para evitar instalar uma RC sem querer.
6. **Next 16 com breaking changes:** ler a documentação local depois da instalação; `proxy.ts` no lugar de `middleware.ts`.
7. **LGPD:** só nome e e-mail; exclusão real (cascade) pelo admin ou pelo próprio usuário; `users.json` fora do Git; logs sem dados pessoais além do e-mail em dev.

## 23. README

Atualizar o README existente (mantendo a estrutura) com: stack real (SMTP no lugar do Resend), setup local (`docker compose up -d`, migrations, seed, `pnpm dev`, console do MinIO em `:9001`), variáveis da §17, deploy GitHub → Vercel → Neon → Cloudflare R2 (bucket privado + CORS + chaves) → Gmail (verificação em 2 etapas + senha de app), migrations e sync no banco remoto, seção "Se um dia tiver domínio" (§22.1) e o guia da psicóloga em linguagem simples (entrar, criar módulo, adicionar aula/documento, arrastar para ordenar, ver como participante, avisar participantes, convidar/reenviar/desativar, ver o progresso de cada pessoa).
