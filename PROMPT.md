Estou na pasta ~/dev/larissa/neuro-suporte. Além dos arquivos de configuração do agente (CLAUDE.md, CLAUDE_PROMPT.md), ela contém um README.md e um CHECKLIST.md iniciais (escritos a partir desta especificação — leia-os, mantenha a estrutura e atualize comandos, variáveis e itens conforme a implementação real; não os substitua do zero) e a pasta assets/ com materiais reais do projeto (imagens, logo, fotos etc.) — o resto é greenfield. Quero criar o "Neuro Suporte": uma plataforma web que funciona como um mini-curso/treinamento de uma psicóloga para PAIS E CUIDADORES DE CRIANÇAS AUTISTAS. Não é um LMS genérico com vários cursos — é UM curso, organizado em módulos, que a psicóloga alimenta e os pais percorrem no próprio ritmo.

Contexto do público:
- Pais/cuidadores, muitas vezes cansados e com pouco tempo, acessando principalmente pelo celular.
- Linguagem acolhedora, clara e sem jargão; interface calma, sem poluição visual, com boa acessibilidade (contraste AA, fontes legíveis, alvos de toque grandes, prefers-reduced-motion).
- A psicóloga NÃO é técnica: o painel de administração precisa ser extremamente simples.

Projeto de referência: ~/dev/larissa/master-degree-lms (Next.js 16 App Router, React 19, TypeScript, Tailwind v4 + shadcn/ui, Prisma 7 + Postgres, Better Auth com OTP por e-mail via Resend, Zod, react-hook-form, Tiptap, dnd-kit, upload S3/MinIO). Leia-o e use como referência de stack, padrões e organização (em especial a estrutura de capítulos/aulas com drag-and-drop, o uploader de arquivos e a integração S3), mas SEM a complexidade desnecessária: sem múltiplos cursos, sem pagamento, sem upload de vídeo.
IMPORTANTE: esta versão do Next.js tem breaking changes — depois de instalar, leia node_modules/next/dist/docs/ antes de escrever código e respeite avisos de deprecação.

Assets:
- Inspecione a pasta assets/ antes de planejar e use o que houver (logo, fotos, imagens) no design — inclusive para extrair a paleta de cores a partir do logo, se existir.
- Mova/otimize o que for usado para o local adequado do projeto (ex: public/) e liste no plano o que foi encontrado e o que ainda falta (ficará como placeholder).

Estrutura de conteúdo (decidido):
- O curso é dividido em MÓDULOS (título, descrição curta, ordem).
- Cada módulo contém uma lista ordenada de CONTEÚDOS, e cada conteúdo é de um destes tipos:
  - AULA (vídeo): título, URL do YouTube exibida via iframe embed (youtube-nocookie.com), texto de apoio em rich text.
  - DOCUMENTO: título, arquivo PDF enviado pela psicóloga e/ou texto em rich text (ex: guia, exercício, roteiro para casa). O participante pode ler na página e baixar o PDF.
- Aulas e documentos ficam intercalados na ordem que a psicóloga definir (ex: vídeo → PDF → vídeo).
- Modelar de forma extensível (ex: um model ContentItem com campo `type`), para permitir novos tipos no futuro sem refatorar.

Autenticação e acesso (decidido):
- Acesso SOMENTE POR CONVITE: não existe cadastro público. Apenas e-mails cadastrados pela psicóloga no painel admin conseguem entrar.
- Login obrigatório para acessar os conteúdos; a landing page é pública.
- Forma mais simples possível para os pais: só e-mail, sem senha — o usuário digita o e-mail, recebe um código (OTP) e entra (Better Auth + Resend, como no projeto de referência). Sessão longa, para não precisar logar toda vez no celular.
- O código OTP só é enviado se o e-mail estiver cadastrado e ativo; a verificação deve ser feita no SERVIDOR (ex: desabilitar sign-up automático do Better Auth e checar o e-mail antes de enviar o OTP). Para e-mail não cadastrado, exibir mensagem gentil: "Este e-mail ainda não tem acesso. Fale com [nome da psicóloga] para receber seu convite." + link de contato.
- Dados do participante: apenas nome e e-mail do responsável (preenchidos pela psicóloga no convite).
- Em dev, o código OTP também deve ser exibido no console do servidor (para testar sem depender do envio de e-mail).

Progresso (requisito central):
- NÃO há bloqueio nem dependência entre módulos ou conteúdos: tudo fica liberado desde o primeiro acesso, e o participante segue na ordem que quiser.
- Conclusão MANUAL (decidido): cada conteúdo (aula ou documento) tem um botão "Marcar como concluído"; o participante pode desmarcar. Salvo no banco por usuário, com data de conclusão. Atualização otimista na UI.
- Progresso POR MÓDULO, independente: conteúdos concluídos do módulo ÷ total de conteúdos do módulo.
- Progresso GERAL do curso (decidido): total de conteúdos concluídos ÷ total de conteúdos do curso — cada conteúdo pesa igual, independente do módulo.
- Curso concluído = 100% no progresso geral.
- Os percentuais são sempre calculados a partir dos dados atuais: se a psicóloga adicionar, mover ou excluir conteúdos, os percentuais se recalculam automaticamente, sem perder conclusões já registradas.
- Centralizar o cálculo numa única função/módulo (ex: lib/progress.ts), reutilizado na área do participante e no admin, com testes unitários.
- "Continuar de onde parou" na home do participante (último conteúdo acessado).
- Mensagem de encorajamento ao concluir um módulo e ao concluir o curso (tom acolhedor, sem gamificação exagerada).

Acompanhamento individual (requisito central — a psicóloga quer ver cada participante):
- Lista de participantes: nome, e-mail, data de cadastro, % geral, último acesso; busca por nome/e-mail e ordenação.
- Página de detalhe do participante: % geral, % de cada módulo e lista de cada conteúdo com status (concluído/não concluído) e data de conclusão.
- Indicação visual de participantes inativos há X dias (para a psicóloga poder entrar em contato).
- Visão agregada simples: quantos participantes, média de conclusão geral, conclusão média por módulo.

Funcionalidades — Pais (área do participante):
- Landing page: apresentação do Neuro Suporte e da psicóloga (foto, nome, CRP, abordagem), para quem é, o que vão aprender, visão geral dos módulos, CTA para entrar.
- Home do curso: progresso geral em destaque + módulos em cards/lista, cada um com sua barra de progresso.
- Página de conteúdo: renderização conforme o tipo (player YouTube responsivo 16:9 + texto, ou documento com texto + visualizar/baixar PDF), botão de concluir, navegação anterior/próxima, sidebar com módulos e conteúdos (ícone por tipo + check de concluído).

Funcionalidades — Psicóloga (admin):
- Editar textos da apresentação e informações do curso.
- Criar/editar/excluir módulos.
- Dentro de cada módulo, adicionar "Aula" ou "Documento" (escolha do tipo clara), editar e excluir. Ao colar a URL do YouTube, mostrar preview do vídeo para ela confirmar.
- Reordenar módulos e conteúdos por drag-and-drop, inclusive mover um conteúdo de um módulo para outro; a ordem salva reflete imediatamente na área do participante.
- Pré-visualizar o conteúdo como o participante vê.
- Gestão de participantes (convites): cadastrar participante (nome + e-mail) e, ao salvar, enviar automaticamente um e-mail de boas-vindas acolhedor com o link de acesso ao site e explicação de como entrar (só digitar o e-mail e usar o código recebido); botão para reenviar o convite; editar nome/e-mail; desativar acesso (mantém o histórico de progresso) e reativar; excluir participante (remove os dados — LGPD). Validar e-mail com Zod e impedir duplicados. Indicar quem foi convidado mas ainda não acessou.
- Painel de acompanhamento individual (ver acima).
- Rotas /admin protegidas por papel (role) de admin.

Administradores e cadastro manual de usuários (decidido):
- Admin inicial: loan.matteusz@gmail.com (o e-mail da psicóloga será adicionado depois pelo mesmo mecanismo).
- Além do painel, deve existir um arquivo para cadastrar usuários manualmente, ex: data/users.json (ou .ts tipado), com a lista de admins e participantes: { email, name, role: "admin" | "participant", active }.
  - O arquivo real fica no .gitignore (contém dados pessoais — LGPD); versionar apenas um data/users.example.json com exemplos fictícios + o admin inicial.
  - Validar o arquivo com Zod antes de qualquer escrita (e-mail válido, sem duplicados, role válida), com mensagens de erro claras.
- Script para sincronizar esse arquivo com o banco (ex: `pnpm db:sync-users`):
  - Idempotente: faz upsert por e-mail (cria quem não existe, atualiza nome/role/active de quem existe); NUNCA apaga usuários nem progresso que não estejam no arquivo.
  - Funciona tanto no banco local quanto no REMOTO (produção/Neon), usando a DATABASE_URL do ambiente ou de um arquivo indicado (ex: `--env .env.production`).
  - Modo `--dry-run` que só mostra o que seria criado/alterado.
  - Ao detectar banco remoto, exibir o host e pedir confirmação explícita antes de escrever (ou exigir flag `--yes`).
  - Opção `--send-invites` para enviar o e-mail de convite aos participantes recém-criados (desligada por padrão).
  - Resumo final: criados / atualizados / sem alteração.
- Separar claramente: (1) seed de DESENVOLVIMENTO com dados fictícios (módulos, conteúdos, participantes de exemplo), que nunca deve rodar em produção (bloquear se a DATABASE_URL não for local); e (2) o sync de usuários reais acima, que é seguro para produção.
- Documentar no README como aplicar as migrations e rodar o sync no banco remoto.

Armazenamento de PDFs (decidido):
- Usar a API S3 (@aws-sdk/client-s3) com endpoint configurável por variável de ambiente, para o mesmo código funcionar nos dois ambientes:
  - Dev: MinIO via docker-compose (junto com o Postgres).
  - Produção: Cloudflare R2 (compatível com S3, 10 GB grátis).
- Upload direto do navegador via URL pré-assinada; apenas PDF, com limite de tamanho; bucket privado.
- PDFs acessíveis apenas para usuários logados (URL de leitura pré-assinada de curta duração ou rota protegida, nunca link público).

Deploy (decidido):
- Código no GitHub, deploy na Vercel conectada ao repositório (deploy automático a cada push na branch principal).
- Banco Postgres grátis em produção (ex: Neon, que tem integração com a Vercel).
- Todas as variáveis de ambiente validadas (ex: @t3-oss/env-nextjs, como no projeto de referência) e documentadas num .env.example.
- Migrations do Prisma aplicadas de forma segura no deploy.

Ética e privacidade (requisitos, não opcionais):
- Exibir nome e CRP da psicóloga; aviso visível de que o conteúdo é educativo e não substitui acompanhamento profissional individual.
- Nenhuma promessa de resultado/"cura" nos textos placeholder (seguir as diretrizes de publicidade do CFP).
- Coleta mínima de dados (LGPD): só nome e e-mail do responsável; NÃO coletar dados de saúde/diagnóstico da criança. Página de política de privacidade simples, informando que a psicóloga acompanha o progresso, e opção de excluir a própria conta.

Crie um plano blueprint bem detalhado e bem estruturado de implementação de algo bonito, acolhedor, simples e fácil de fazer deploy. Use as melhores e mais atuais práticas, fontes bonitas e cores harmônicas e calmas.

O blueprint deve conter:
- Contexto & decisões confirmadas comigo
- Inventário da pasta assets/ (o que será usado e onde)
- Objetivo e critérios de aceite verificáveis
- Stack & versões (com justificativa)
- Modelo de dados (schema Prisma completo: User, Module, ContentItem, ContentProgress, configurações do site…)
- Lógica de progresso (fórmulas, onde fica o cálculo, comportamento ao adicionar/mover/excluir conteúdos, e como evitar consultas N+1 na lista de participantes)
- Estratégia de reordenação (como a ordem é persistida, inclusive ao mover entre módulos)
- Armazenamento dos PDFs (MinIO em dev / R2 em produção) e proteção de acesso
- Mapa de rotas (públicas, participante logado, admin) e regras de acesso
- Design system (paleta via tokens @theme do Tailwind v4, tipografia, componentes, tom de voz dos textos)
- Estrutura de arquivos
- Um único arquivo de config (ex: src/config/site.ts) para textos e dados fixos editáveis
- Helper para extrair o ID do YouTube de qualquer formato de URL (watch?v=, youtu.be, embed, shorts), validado com Zod
- Seed de desenvolvimento com 3 módulos de tamanhos diferentes misturando aulas e documentos (textos placeholder acolhedores e realistas) + o admin loan.matteusz@gmail.com + 3 participantes fictícios convidados em estágios diferentes de progresso (incluindo 1 que ainda não acessou)
- Arquivo de usuários (data/users.json) + script de sync com o banco local/remoto (ver "Administradores e cadastro manual de usuários")
- Passos de implementação em ordem
- Checklist de verificação (dev, build, testes do cálculo de progresso, login OTP com e-mail convidado e bloqueio de e-mail não convidado, fluxo de convite, sync de usuários com --dry-run e execução real idempotente (rodar 2x sem duplicar), seed recusando rodar em banco remoto, upload/visualização de PDF, fluxo do participante, reordenação no admin refletindo no participante, acompanhamento individual, mobile 360px)
- Riscos / considerações — incluir obrigatoriamente: o Resend só envia e-mails para qualquer destinatário com um DOMÍNIO PRÓPRIO verificado (sem domínio, só envia para o e-mail do dono da conta); explicar o passo a passo de configurar o domínio (DNS) no Resend e na Vercel
- README com: setup local (docker-compose para Postgres + MinIO), passo a passo de deploy (GitHub → Vercel → Neon → Cloudflare R2 → Resend com domínio), lista de variáveis de ambiente, como cadastrar usuários pelo arquivo e rodar o sync no banco remoto, e um mini-guia em linguagem simples para a psicóloga usar o painel (incluindo como convidar participantes)

Antes de escrever o plano, me pergunte o que for necessário — em especial:
- Direção visual (ex: tons suaves/pastéis, natureza, lúdico, minimalista) — considerando o que houver em assets/.
- Recursos extras: certificado de conclusão, aviso por e-mail de novo conteúdo, link de contato/WhatsApp da psicóloga.
- Se já tenho domínio próprio (para o e-mail e para o endereço do site).

Não faça commit, push nem deploy — apenas deixe tudo pronto para eu revisar.
