# Neuro Suporte

Plataforma de treinamento online de uma psicóloga para **pais e cuidadores de crianças autistas**. É um único curso, organizado em módulos com aulas em vídeo (YouTube) e documentos (PDF/texto), que os participantes percorrem no próprio ritmo. A psicóloga acompanha o progresso de cada um pelo painel admin.

> **Status:** em planejamento. Os comandos e variáveis abaixo descrevem o que foi especificado no [PROMPT.md](PROMPT.md). Devem ser confirmados e completados durante a implementação.

## Funcionalidades

**Participantes (pais/cuidadores)**
- Acesso somente por convite, com login sem senha: digita o e-mail e recebe um código (OTP).
- Módulos com aulas em vídeo e documentos, todos liberados desde o primeiro acesso.
- Botão "Marcar como concluído" em cada conteúdo.
- Progresso por módulo e progresso geral (conteúdos concluídos ÷ total de conteúdos).
- "Continuar de onde parou".

**Psicóloga (admin)**
- Criar, editar e reordenar módulos, aulas e documentos (drag-and-drop).
- Convidar, desativar e excluir participantes.
- Acompanhar o progresso individual de cada participante.

## Stack

| Item | Escolha |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| Banco | Postgres + Prisma 7 |
| Autenticação | Better Auth (OTP por e-mail) + Resend |
| Arquivos (PDF) | API S3: MinIO em dev, Cloudflare R2 em produção |
| Vídeos | YouTube embed (youtube-nocookie.com) |
| Deploy | GitHub + Vercel, Postgres no Neon |

## Rodando localmente

Pré-requisitos: Node.js, pnpm e Docker.

```bash
pnpm install
cp .env.example .env            # preencher as variáveis
docker compose up -d            # Postgres + MinIO
pnpm prisma migrate dev         # cria as tabelas
pnpm db:seed                    # dados fictícios de desenvolvimento (só roda em banco local)
pnpm dev                        # http://localhost:3000
```

Em desenvolvimento, o código de login (OTP) também aparece no console do servidor, sem precisar enviar e-mail.

## Variáveis de ambiente

A lista completa e definitiva fica no `.env.example`. Previsão:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão com o Postgres |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Autenticação |
| `RESEND_API_KEY` / `EMAIL_FROM` | Envio dos códigos e convites |
| `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` | Armazenamento dos PDFs |

## Usuários: admins e participantes

Além do painel admin, os usuários podem ser cadastrados num arquivo:

1. Copie `data/users.example.json` para `data/users.json`. O arquivo real **não vai para o Git**, porque contém dados pessoais.
2. Adicione cada pessoa com `email`, `name`, `role` (`admin` ou `participant`) e `active`.
3. Rode o sync:

```bash
pnpm db:sync-users --dry-run                         # mostra o que vai mudar, sem gravar
pnpm db:sync-users                                   # banco local
pnpm db:sync-users --env .env.production             # banco remoto (pede confirmação)
pnpm db:sync-users --env .env.production --send-invites
```

O sync pode rodar várias vezes sem duplicar ninguém e **nunca apaga** usuários nem progresso.

Admin inicial: `loan.matteusz@gmail.com`.

## Deploy

1. **GitHub:** criar o repositório e fazer push.
2. **Neon:** criar o banco Postgres e copiar a `DATABASE_URL`.
3. **Cloudflare R2:** criar um bucket privado e as chaves de API (S3).
4. **Resend:** verificar um **domínio próprio** (registros DNS). Sem domínio, o Resend só envia e-mails para o dono da conta, ou seja, os pais não recebem o código.
5. **Vercel:** importar o repositório, configurar as variáveis de ambiente e, se quiser, apontar o domínio.
6. **Banco remoto:** aplicar as migrations e rodar o sync de usuários:

```bash
pnpm prisma migrate deploy
pnpm db:sync-users --env .env.production
```

O checklist completo está em [CHECKLIST.md](CHECKLIST.md).

## Guia rápido para a psicóloga

1. Acesse o site e entre com seu e-mail. Você vai receber um código para digitar.
2. No menu **Admin**:
   - **Conteúdo:** crie módulos e, dentro deles, adicione aulas (cole o link do YouTube) ou documentos (envie um PDF ou escreva o texto). Arraste para mudar a ordem.
   - **Participantes:** cadastre nome e e-mail para enviar o convite. Ali você também vê o progresso de cada pessoa.
3. Os participantes entram do mesmo jeito: só com o e-mail e o código.

## Privacidade e ética

- O conteúdo é educativo e **não substitui acompanhamento profissional individual**.
- Coletamos apenas nome e e-mail do responsável. Nenhum dado de saúde da criança é coletado.
- O participante pode excluir a própria conta a qualquer momento.
