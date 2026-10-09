# Claude Code — Framework de trabalho

Plugins instalados (marketplace `claude-plugins-official`, verificável com `claude plugin list`). Não invoque nomes fora desta lista.

## 📦 O que está disponível

- **superpowers (skills):** `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`, `test-driven-development`, `systematic-debugging`, `using-git-worktrees`, `requesting-code-review`, `receiving-code-review`, `verification-before-completion`, `finishing-a-development-branch`
- **feature-dev:** comando `/feature-dev` + agents `code-explorer`, `code-architect`, `code-reviewer`
- **frontend-design:** skill `frontend-design`
- **code-review:** comando `/code-review`
- **code-simplifier:** agent `code-simplifier`
- **claude-md-management:** skill `claude-md-improver` + comando `/revise-claude-md`
- **context7 (MCP):** docs atualizadas de bibliotecas
- **security-guidance:** hooks automáticos em edições (não precisa invocar)

## 👥 Regras de comportamento

1. **Nunca codar direto:** todo pedido passa por spec/plano antes de tocar em arquivo.
2. **Respostas enxutas:** texto direto, sem enrolação. Código, paths e mensagens de erro sempre completos e literais.
3. **YAGNI:** menor diff que resolve. Stdlib e dependências já presentes antes de adicionar novas. Sem abstração não pedida. Remover é melhor que adicionar.
4. **UI intencional:** nada de layout genérico; use `frontend-design` em todo trabalho de frontend.
5. **Dúvida disciplinada:** decisões difíceis de desfazer passam por revisão adversarial (afirmar → levantar evidência → duvidar → reconciliar) antes de executar.
6. **Sem commits nem PRs** a menos que eu peça.

## 🧭 Pipeline

1. **Requisitos:** pedido ambíguo → `superpowers:brainstorming` (uma pergunta por vez até ~95% de confiança). Feature nova → `/feature-dev`.
2. **Plano:** `superpowers:writing-plans`. Antes de mudanças grandes, registre o checklist em `CHANGES.log`.
3. **Isolamento:** `superpowers:using-git-worktrees` ou branch dedicada.
4. **UI:** skill `frontend-design` antes de escrever interface.
5. **Implementação:** `superpowers:executing-plans` em fatias verticais. Trabalho paralelizável → `superpowers:dispatching-parallel-agents`. Exploração pesada de código → agent `code-explorer`.
6. **Testes:** `superpowers:test-driven-development` — teste antes da lógica quando houver suíte. Se houver container, rode builds/testes via `docker exec`.
7. **Debug:** `superpowers:systematic-debugging` — causa raiz antes do fix, nunca chute.
8. **Review:** `/code-review` + agent `code-reviewer`; `code-simplifier` para limpeza. Faça um pass manual OWASP em tudo que mexe com input do usuário ou autenticação.
9. **Finalização:** `superpowers:verification-before-completion` antes de dizer que terminou → `superpowers:finishing-a-development-branch`. Aprendizados do projeto → `/revise-claude-md`.

## 🛠️ Discovery

- Test runners: inspecione `package.json` / `requirements.txt` / configs do projeto antes da fase de testes.
- Docs de biblioteca: MCP `context7` — não confie em memória para API de libs.
