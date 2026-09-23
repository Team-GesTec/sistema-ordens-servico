# Guia de Contribuição — GesTec

Este documento define o fluxo de trabalho no GitHub, a estratégia de branches e o padrão de commits do projeto **GesTec — Sistema de Gestão de Ordens de Serviço**, conforme decidido pelo Dev Team e registrado no guia de decisões confirmadas.

## Sumário

- [GitHub Flow](#github-flow)
- [Estratégia de branches](#estratégia-de-branches)
- [Padrão de commits](#padrão-de-commits)
- [Pull Requests](#pull-requests)
- [Checklist rápido](#checklist-rápido)

---

## GitHub Flow

O fluxo abaixo deve ser **usado no dia a dia**, não apenas documentado:

- `main` é a branch estável — nunca fazer commit direto nela.
- Toda mudança entra por **Pull Request**.
- Revisão obrigatória por **outro membro** do time.
- Ninguém aprova o próprio PR.
- Depois do merge, a branch é deletada.

---

## Estratégia de branches

Toda branch nova nasce de uma `main` atualizada.

| Tipo de branch | Convenção de nome | Uso |
| --- | --- | --- |
| Estável | `main` | Único branch de produção/entrega. Nunca recebe commit direto. |
| Funcionalidade | `feature/<camada>/US<id>-descricao-curta` | Novas funcionalidades, associadas a uma User Story do backlog. |
| Correção | `fix/<camada>/US<id>-descricao-curta` | Correções de bugs em uma User Story já entregue. |

`<camada>` indica em qual parte do monorepo a mudança acontece: `frontend`, `backend` ou `docs`. Quando a mudança mexe nas duas camadas ao mesmo tempo, usa-se `fullstack`.

`<id>` é o número da User Story do backlog (ex.: `US#2.1` vira `US2.1` na branch — sem o `#`).

> ⚠️ **Nota técnica:** o Git não aceita `:` em nome de branch. Por isso a camada é separada por `/`, não por `:` — `feature/frontend:US2.1-...` seria rejeitado pelo Git.

> ⚠️ **Nota técnica:** o `#` também é evitado — no terminal ele é interpretado como início de comentário (exigindo aspas em todo comando) e, em URLs do GitHub, é o caractere de âncora de página. Por isso a branch usa `US2.1`, não `US#2.1`.

> **Por que `/` e não `-` entre a camada e a US:** com `/`, o GitHub agrupa visualmente as branches em pastas (`feature/frontend/...`, `feature/backend/...`), facilitando encontrar branches numa lista longa. Com `-`, tudo vira uma string só, sem esse agrupamento.

**Exemplos:**

```bash
feature/frontend/US2.1-abertura-de-os
feature/backend/US4.2-cadastro-departamento
fix/backend/US2.1-erro-validacao-cliente
feature/fullstack/US2.2-desmembramento-projeto
```

> A identificação usada em branches e commits é sempre o número da **User Story** (ex.: `US#2.1` no backlog, `US2.1` na branch), presente no backlog público do projeto — nunca códigos internos de tarefa do Dev Team, que só fazem sentido para quem acompanha as reuniões do time.

**Exceção — mudança sem User Story associada:**

Quando a mudança é transversal ao projeto (ex.: configuração inicial, guia de contribuição, ajuste de CI) e não está ligada a uma US específica, usa-se `transversal` no lugar de `US<id>`:

```
feature/<camada>/transversal-descricao-curta
```

Exemplo:

```bash
feature/docs/transversal-guia-contribuicao
```

**Fluxo de uma branch:**

1. Criar a branch a partir da `main` atualizada.
2. Implementar a mudança (`feature/<camada>/...` ou `fix/<camada>/...`).
3. Abrir um Pull Request com descrição do que foi implementado e como testar.
4. Obter pelo menos uma revisão de outro integrante.
5. Fazer o merge na `main`.
6. Deletar a branch após o merge.

---

## Padrão de commits

Todo commit segue este formato:

```
<tipo> (US#<id>): <descrição da entrega>
```

Quando a mudança for transversal (não associada a uma User Story específica — ex.: configuração inicial do projeto), usa-se `Transversal` no lugar do número da US.

| Tipo | Quando usar |
| --- | --- |
| `feat` | Uma funcionalidade nova |
| `fix` | Correção de um erro/bug |
| `docs` | Mudança só em documentação (README, guias etc.) |
| `style` | Ajuste de formatação/estilo que não muda o comportamento do código |
| `refactor` | Reorganização do código sem mudar o comportamento |
| `test` | Criação/ajuste de testes |
| `chore` | Tarefas de manutenção (ex.: atualizar dependências) |

**Exemplos:**

```
feat (US#2.1): abertura de O.S. associada a um cliente/projeto
fix (US#2.1): corrige validação de cadastro de cliente
docs (US#4.4): atualiza guia de padrão de commits
refactor (Transversal): reorganiza camada de repositories
```

> ⚠️ **Isso vale nota.** Os commits devem seguir esse padrão em **100% do histórico** — está diretamente ligado ao critério **G.3** da avaliação do projeto.

---

## Pull Requests

Todo PR deve conter:

- Descrição clara do que foi implementado.
- Instruções de como testar a mudança.
- Referência ao ID da demanda/User Story relacionada.

Regras:

- Revisão obrigatória por outro membro do time.
- Ninguém aprova o próprio PR.
- Só é mesclado na `main` depois de aprovado.

---

## Checklist rápido

Antes de abrir um PR, confirme:

- [ ] A branch segue a convenção `feature/<camada>/US<id>-...`, `fix/<camada>/US<id>-...` ou `feature/<camada>/transversal-...` (quando não há US associada).
- [ ] Todos os commits seguem o padrão `<tipo> (US#<id> ou Transversal): <descrição>`.
- [ ] O código está na pasta correta (`frontend/`, `backend/` ou `docs/`, conforme a estrutura de monorepo).
- [ ] A descrição do PR explica o que foi feito e como testar.
- [ ] Nenhum commit foi feito diretamente na `main`.

---

*Documento baseado nas decisões confirmadas do Dev Team GesTec (seções "GitHub Flow e padrão de commits" e "Estratégia de branches").*