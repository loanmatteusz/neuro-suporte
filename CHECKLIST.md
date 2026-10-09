# Checklist — Neuro Suporte

## 1. Antes de começar

- [ ] Pasta `assets/` com logo, fotos e imagens disponíveis
- [ ] Nome completo e CRP da psicóloga
- [ ] Foto e texto de apresentação da psicóloga
- [ ] Links dos vídeos no YouTube (como "não listado")
- [ ] PDFs dos documentos
- [ ] Direção visual definida
- [ ] Recursos extras decididos: certificado, aviso de novo conteúdo, link de WhatsApp
- [ ] Domínio próprio registrado (necessário para o envio de e-mails pelo Resend)
- [ ] Lista inicial de participantes (nome + e-mail)

## 2. Desenvolvimento

### Ambiente
- [ ] `docker compose up -d` sobe Postgres e MinIO
- [ ] `pnpm dev` roda sem erros no console
- [ ] `pnpm build` passa sem erros
- [ ] `pnpm lint` passa
- [ ] Testes unitários do cálculo de progresso passam

### Autenticação e convites
- [ ] E-mail convidado recebe o código e consegue entrar
- [ ] E-mail não convidado é bloqueado com mensagem gentil
- [ ] Participante desativado não consegue entrar
- [ ] Código OTP aparece no console em dev
- [ ] Sessão continua ativa ao reabrir o site no celular
- [ ] Rotas `/admin` bloqueadas para participantes

### Usuários (arquivo + sync)
- [ ] `data/users.json` está no `.gitignore`, e `data/users.example.json` está versionado
- [ ] Arquivo inválido (e-mail errado, duplicado, role inválida) gera erro claro e não grava nada
- [ ] `--dry-run` mostra as alterações sem gravar
- [ ] Rodar o sync duas vezes não duplica usuários
- [ ] O sync não apaga usuários nem progresso que não estão no arquivo
- [ ] Banco remoto exige confirmação (ou `--yes`)
- [ ] `--send-invites` envia convite só para os recém-criados
- [ ] Seed de desenvolvimento se recusa a rodar em banco remoto

### Conteúdo (admin)
- [ ] Criar, editar e excluir módulos
- [ ] Adicionar aula com URL do YouTube (com preview) em todos os formatos: `watch?v=`, `youtu.be`, `embed`, `shorts`
- [ ] Adicionar documento com PDF e/ou texto
- [ ] Upload aceita só PDF e respeita o limite de tamanho
- [ ] Reordenar módulos e conteúdos por drag-and-drop
- [ ] Mover conteúdo de um módulo para outro
- [ ] A nova ordem aparece na área do participante
- [ ] Pré-visualização mostra o conteúdo como o participante vê

### Participante
- [ ] Todos os módulos e conteúdos liberados desde o primeiro acesso
- [ ] Marcar e desmarcar conteúdo como concluído
- [ ] Progresso por módulo correto
- [ ] Progresso geral correto (conteúdos concluídos ÷ total de conteúdos)
- [ ] Percentuais se recalculam quando o admin adiciona, move ou exclui conteúdo
- [ ] "Continuar de onde parou" leva ao último conteúdo acessado
- [ ] Mensagem de encorajamento ao concluir um módulo e o curso
- [ ] Vídeo responsivo (16:9), usando youtube-nocookie.com
- [ ] PDF abre e baixa só para quem está logado (sem link público)
- [ ] Navegação anterior/próxima e sidebar funcionam

### Acompanhamento (admin)
- [ ] Lista de participantes com % geral, último acesso, busca e ordenação
- [ ] Detalhe do participante com % por módulo e data de cada conclusão
- [ ] Indicação de participantes inativos
- [ ] Indicação de quem foi convidado mas ainda não acessou
- [ ] Visão agregada (total de participantes, médias de conclusão)

### Privacidade e ética
- [ ] Nome e CRP da psicóloga visíveis
- [ ] Aviso de que o conteúdo não substitui acompanhamento profissional
- [ ] Nenhuma promessa de resultado ou "cura" nos textos
- [ ] Página de política de privacidade
- [ ] Participante consegue excluir a própria conta
- [ ] Nenhum dado de saúde da criança é coletado

### Qualidade
- [ ] Layout funciona em 360px, 768px e 1280px
- [ ] Contraste AA, alvos de toque grandes, navegação por teclado
- [ ] Animações respeitam `prefers-reduced-motion`

## 3. Deploy

- [ ] Repositório criado no GitHub
- [ ] Banco criado no Neon
- [ ] Bucket privado criado no Cloudflare R2, com as chaves de API
- [ ] Domínio verificado no Resend (DNS)
- [ ] Projeto importado na Vercel, com todas as variáveis de ambiente configuradas
- [ ] Domínio apontado para a Vercel (opcional)
- [ ] `pnpm prisma migrate deploy` aplicado no banco remoto
- [ ] `pnpm db:sync-users --env .env.production` com o admin e os participantes

## 4. Pós-deploy

- [ ] Login do admin funciona em produção, com e-mail recebido de verdade
- [ ] Convite de teste chega a um e-mail externo (não só ao dono da conta Resend)
- [ ] Upload e visualização de PDF funcionam em produção
- [ ] Vídeos carregam em produção
- [ ] Teste completo no celular: convite → login → assistir → concluir
- [ ] Psicóloga cadastrada como admin e orientada a usar o painel
