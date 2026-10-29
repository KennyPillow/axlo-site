<!-- BEGIN:github-workflow -->
## Fluxo obrigatório: issue → branch → PR

Vale para **qualquer agente de IA** (Claude, Codex, Cursor, Copilot, Gemini, etc.) e também para commits humanos. Não pule etapas.

**Repositório:** `KennyPillow/axlo-site` · **Branch base:** `main`

### 1. Toda tarefa nasce como issue

Antes de escrever qualquer código, abra uma issue no GitHub para **cada** correção, melhoria ou nova função:

```bash
gh issue create --repo KennyPillow/axlo-site \
  --title "<tipo>: resumo curto" \
  --body "<contexto · o que fazer · critério de aceite>"
```

Tipos: `fix` (correção) · `feat` (nova função) · `chore` (manutenção) · `docs` · `perf`.

Uma tarefa = uma issue. Se a demanda tem 3 entregas independentes, são 3 issues.

### 2. Uma branch por issue

```bash
git switch main && git pull
git switch -c <tipo>/<numero-da-issue>-<slug-curto>
```

Exemplo: `fix/42-link-whatsapp-quebrado`

### 3. Nunca commitar direto na `main`

Todo deploy passa por PR. É assim que o deploy é controlado — commit direto na branch base não é permitido.

### 4. A descrição do PR **deve** referenciar a issue

A **primeira linha** do corpo do PR fecha a issue:

```bash
gh pr create --repo KennyPillow/axlo-site --base main \
  --title "<tipo>: resumo curto" \
  --body "Closes #<numero>

## O que muda
- ...

## Como testar
- ...
"
```

Sem `Closes #<numero>` o PR está incompleto. Se o PR **não** deve fechar a issue (entrega parcial), use `Refs #<numero>`.

### Checklist antes de abrir o PR

- [ ] Existe uma issue e o número está no corpo do PR (`Closes #N`)
- [ ] Branch saiu da `main` atualizada
- [ ] Build passa localmente
- [ ] Mudança verificada no navegador / preview
<!-- END:github-workflow -->
