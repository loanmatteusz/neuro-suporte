# Neuro Suporte

Plataforma de treinamento online de uma psicóloga para **pais e cuidadores de crianças autistas**. É um único curso, organizado em módulos com aulas em vídeo (YouTube) e documentos (PDF/texto), que os participantes percorrem no próprio ritmo. A psicóloga acompanha o progresso de cada um pelo painel admin.

> **Status:** pronto para revisão. O que foi pedido está descrito no [PROMPT.md](PROMPT.md); os passos de verificação manual estão no [CHECKLIST.md](CHECKLIST.md).

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
| Autenticação | Better Auth (código por e-mail) + e-mail via SMTP (nodemailer; Gmail) |
| Arquivos (PDF) | API S3: MinIO em dev, Cloudflare R2 em produção |
| Vídeos | YouTube embed (youtube-nocookie.com) |
| Deploy | GitHub + Vercel, Postgres no Neon |
| Testes | Vitest |

## Rodando localmente

Pré-requisitos: Node.js, pnpm e Docker.

```bash
cp .env.example .env            # e gere o BETTER_AUTH_SECRET: openssl rand -base64 32
pnpm install
docker compose up -d            # Postgres 17 + MinIO (bucket privado criado automaticamente)
pnpm prisma migrate dev
pnpm db:seed                    # só roda em banco local
pnpm dev                        # http://localhost:3000 · MinIO: http://localhost:9001 (neuro / neuro-secret)
pnpm test
```

O `docker compose` sobe três serviços: `postgres`, `minio` e `minio-init` (que cria o bucket privado `neuro-suporte` e termina). As imagens do MinIO são da Chainguard.

Sem `SMTP_*` no `.env`, os códigos de login e os e-mails (convites, avisos) aparecem no terminal onde o `pnpm dev` está rodando, sem enviar nada de verdade. Isso vale só para o `pnpm dev`: o `pnpm start` roda em modo de produção e, sem `SMTP_*`, dá o erro "SMTP não configurado" ao pedir o código.

Logins criados pelo seed: `loan.matteusz@gmail.com` (admin) e `ana.exemplo@example.com`, `bruno.exemplo@example.com`, `carla.exemplo@example.com` (participantes).

## Variáveis de ambiente

O modelo está no `.env.example`.

| Variável | Exemplo em desenvolvimento | Uso |
|---|---|---|
| `DATABASE_URL` | `postgresql://neuro:neuro@localhost:5432/neuro` | Postgres (Neon em produção: string *pooled*) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | Assinatura das sessões |
| `BETTER_AUTH_URL` | `http://localhost:3000` | URL base do site (links dos e-mails) |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `465` | Servidor de e-mail |
| `SMTP_USER` / `SMTP_PASS` | conta Gmail / senha de app | Credenciais do e-mail |
| `EMAIL_FROM` | `"Neuro Suporte <conta@gmail.com>"` | Remetente |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO (dev) ou Cloudflare R2 (produção) |
| `S3_REGION` | `us-east-1` (R2: `auto`) | Região do bucket |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | `neuro` / `neuro-secret` | Chaves do bucket |
| `S3_BUCKET` | `neuro-suporte` | Nome do bucket (privado) |
| `S3_FORCE_PATH_STYLE` | `true` (R2: `false`) | Estilo de endereço do S3 |

As variáveis `SMTP_*` e `EMAIL_FROM` são opcionais em desenvolvimento e obrigatórias quando `VERCEL_ENV=production` (o build de produção falha sem elas). Em qualquer ambiente de produção sem SMTP configurado, o envio dá erro em vez de apenas aparecer no terminal.

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

Opções do sync: `--file` (outro caminho para o JSON), `--env` (arquivo `.env` do banco de destino), `--dry-run`, `--yes` (pula a confirmação em banco remoto) e `--send-invites` (convida só quem foi criado agora).

O sync pode rodar várias vezes sem duplicar ninguém (a segunda execução mostra `Criados: 0 · Atualizados: 0`) e **nunca apaga** usuários nem progresso.

Admin inicial: `loan.matteusz@gmail.com`.

## Deploy

Tudo roda em planos gratuitos: GitHub, Vercel (Hobby), Neon, Cloudflare R2 e Gmail.

1. **GitHub:** criar um repositório privado e fazer `git push`.
2. **Neon:** criar o projeto (região São Paulo, `sa-east-1`) e copiar a connection string **pooled** para `DATABASE_URL`. Se o build de produção travar na etapa das migrations, use a connection string direta (não *pooled*) do Neon na `DATABASE_URL` só do build, ou rode `pnpm prisma migrate deploy` do seu computador com ela.
3. **Cloudflare R2:** criar o bucket privado `neuro-suporte` (sem acesso público). Em *Manage R2 API Tokens*, criar um token "Object Read & Write" só para esse bucket e usar `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. Usar também `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `S3_REGION=auto` e `S3_FORCE_PATH_STYLE=false`. Em *Settings → CORS policy* do bucket:

   ```json
   [{ "AllowedOrigins": ["https://<projeto>.vercel.app"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
   ```

4. **Gmail:** criar uma conta Gmail do projeto, ativar a verificação em 2 etapas e gerar uma senha em *Senhas de app*. Variáveis: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<conta>`, `SMTP_PASS=<senha de app, sem espaços>` e `EMAIL_FROM="Neuro Suporte <conta@gmail.com>"`. O limite é de ~500 e-mails por dia.
5. **Vercel:** *Add New Project* → importar o repositório → em *Environment Variables* cadastrar todas as variáveis nos escopos **Production e Preview** (o build precisa delas; sem elas os previews falham), com `BETTER_AUTH_URL=https://<projeto>.vercel.app` → *Deploy*. As migrations rodam sozinhas no build de produção (o script `scripts/migrate-if-production.mjs` só aplica `prisma migrate deploy` quando `VERCEL_ENV=production`; previews e builds locais não tocam o banco).
6. **Primeiro admin:** no seu computador, crie o `data/users.json` com o admin (copie `data/users.example.json` e deixe só a pessoa certa; sem esse arquivo o sync dá "Não consegui ler data/users.json"). Depois `cp .env.example .env.production`, preencha `DATABASE_URL` (Neon), `BETTER_AUTH_URL` e o SMTP, e rode:

   ```bash
   pnpm db:sync-users --env .env.production    # confirme digitando "sim"
   ```

7. **Testar:** abrir o site, entrar com o e-mail do admin e convidar um e-mail de teste externo.

O checklist completo está em [CHECKLIST.md](CHECKLIST.md).

## Se um dia tiver domínio próprio

Com um domínio, o envio pode sair de um endereço do próprio projeto (em vez de @gmail.com) e sem o limite do Gmail:

1. Comprar o domínio (por exemplo, no registro.br).
2. No Resend: *Domains → Add domain* e copiar os registros DNS (MX e TXT/SPF de `send.`, TXT DKIM `resend._domainkey` e, opcionalmente, DMARC `_dmarc`).
3. Criar esses registros no painel DNS do registrador (ou na Vercel, se os nameservers apontarem para ela: *Domains → DNS Records*).
4. Aguardar o status "Verified" no Resend.
5. Trocar as variáveis: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASS=<API key do Resend>` e `EMAIL_FROM=contato@seu-dominio`.
6. No site: Vercel → *Project → Domains*, adicionar o domínio e criar o registro `A`/`CNAME` indicado. Atualizar `BETTER_AUTH_URL` e o `AllowedOrigins` do CORS do R2 para o novo endereço.

## Guia rápido para a psicóloga

1. **Entrar:** acesse o site, digite seu e-mail e depois o código de 6 dígitos que chega na sua caixa de entrada.
2. **Criar um módulo:** depois de entrar, você cai no **Painel**, com as abas **Visão geral / Conteúdo / Participantes / Apresentação** (quando estiver na área do participante, o botão **Painel** no topo leva de volta). Em **Conteúdo**, clique em **Novo módulo** e dê um título.
3. **Adicionar conteúdo:** dentro do módulo, clique em **Adicionar conteúdo**:
   - **Aula em vídeo:** cole o link do YouTube (de preferência com o vídeo como "Não listado") e confira a prévia que aparece.
   - **Documento:** envie um PDF e/ou escreva o texto.
4. **Ordenar:** arraste pela alça de arrastar (ícone de pontinhos ao lado do título) para mudar a ordem de módulos e conteúdos. No celular, segure um instante antes de arrastar.
5. **Conferir:** use **Ver como participante** para ver o conteúdo como os participantes veem.
6. **Avisar:** abra a página do conteúdo (clique nele em **Conteúdo**) e clique em **Avisar participantes**. O e-mail vai só para quem está com acesso ativo, e o botão passa a mostrar "Avisado em dd/mm".
7. **Participantes:**
   - **Convidar participante:** informe nome e e-mail; a pessoa recebe o convite.
   - **Reenviar convite:** para quem não recebeu ou perdeu o e-mail.
   - **Desativar acesso:** pausa o acesso sem perder o progresso (dá para reativar depois).
   - **Excluir:** apaga a pessoa e todo o progresso dela. Não dá para desfazer.
8. **Visão geral:** mostra as médias de conclusão, quem está sem acessar há 14 dias ou mais e quem foi convidado mas ainda não entrou. Clique em um participante para ver o progresso por módulo.
9. **Apresentação:** edite sua foto, os textos, o CRP e o **Link de contato** (por exemplo, o do WhatsApp) que aparecem para os participantes.

Os participantes entram do mesmo jeito: só com o e-mail e o código.

## Limitações conhecidas

- Vídeos "não listados" do YouTube podem ser assistidos por qualquer pessoa que tenha o link. A proteção da plataforma vale para o acesso ao curso, não para o vídeo em si.
- O plano Hobby da Vercel é para uso não comercial. O curso é gratuito (projeto de mestrado), então atende; se um dia for cobrado, será preciso o plano Pro.
- O Neon suspende o banco quando fica parado: o primeiro acesso depois de um tempo sem uso pode levar cerca de 1 s a mais.
- O Gmail limita o envio a ~500 e-mails por dia.

## Privacidade e ética

- O conteúdo é educativo e **não substitui acompanhamento profissional individual**.
- Coletamos apenas nome e e-mail do responsável. Nenhum dado de saúde da criança é coletado.
- O participante pode excluir a própria conta a qualquer momento.
