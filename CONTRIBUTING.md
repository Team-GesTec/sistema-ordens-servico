# Guia de Contribuição — GesTec

## Sumário

- [Regras de ouro](#regras-de-ouro)
- [Modelo de rastreabilidade](#modelo-de-rastreabilidade)
- [GitHub Flow](#github-flow)
- [Estratégia de branches](#estratégia-de-branches)
- [Padrão de commits](#padrão-de-commits)
- [Pull Requests](#pull-requests)
- [Merge](#merge)
- [Fluxo completo](#fluxo-completo)
- [Bugs](#bugs)
- [Mudanças sem User Story (docs, CI, configuração)](#mudanças-sem-user-story-docs-ci-configuração)
- [Exemplos oficiais](#exemplos-oficiais)
- [Checklist rápido](#checklist-rápido)

---

## Regras de ouro

| Regra | Definição |
| --- | --- |
| Jira Key | **Identificador oficial** de integração entre Jira e GitHub (ex.: `JH-123`). |
| `US2.1` | **Identificador visual**, para facilitar a leitura pela equipe. Não substitui a Jira Key. |
| Branch | = User Story |
| Pull Request | = User Story |
| Commit | = Subtask |
| Merge | **Squash and Merge** é a estratégia padrão. |
| `main` | Branch estável. Nenhum commit direto nela. |
| Trabalho transversal | Alterações que não possuem relação com uma issue do Jira usam `TRANSVERSAL` como identificador. |
| Commit sem Jira Key | **Proibido para alterações vinculadas ao Jira**; trabalhos transversais usam `TRANSVERSAL`. |
| PR sem Jira Key | **Proibido para alterações vinculadas ao Jira**; trabalhos transversais usam `[TRANSVERSAL]`. |

Exemplo da diferença entre os dois identificadores:

```text
US2.1  = identificador visual
JH-123 = identificador oficial
```

Durante a transição, `US2.1` continua sendo usado como identificador visual em nomes de branches, títulos de Pull Requests e documentação visual. **Nunca** o use sozinho como identificador de commit.

---

## Modelo de rastreabilidade

Toda alteração no projeto deve estar ligada a uma issue do Jira. A estrutura abaixo mostra como cada elemento do Jira se conecta ao GitHub:

```text
EPIC
 ├── USER STORY
 │
 ├── Backend Branch
 │
 ├── Frontend Branch
 │
 ├── Pull Request
 │
 └── Commits
       │
       ├── Subtask A
       ├── Subtask B
       └── Subtask C
```

Em resumo:

```text
Branch = User Story
PR     = User Story
Commit = Subtask
```

Uma User Story pode ter:

- somente branch de backend;
- somente branch de frontend;
- ambas (cada uma com o seu próprio Pull Request).

---

## GitHub Flow

O fluxo abaixo deve ser **usado no dia a dia**, não apenas documentado:

- `main` é a branch estável — nunca fazer commit direto nela.
- Toda mudança entra por **Pull Request**, aberto a partir da branch da User Story diretamente para a `main`.
- Não existem branches de integração: toda branch nasce da `main` atualizada e volta para a `main`.
- Revisão obrigatória por **outro membro** do time.
- Ninguém aprova o próprio PR.
- O merge é sempre feito com **Squash and Merge** (veja [Merge](#merge)).
- Depois do merge, a branch da User Story/correção é deletada, quando apropriado.

---

## Estratégia de branches

Toda branch nasce de uma `main` atualizada e é integrada de volta à `main` por Pull Request.

| Tipo de branch | Convenção de nome | Uso |
| --- | --- | --- |
| Estável | `main` | Branch de produção/entrega. Nunca recebe commit direto. |
| Backend | `feature/backend/<JIRA-KEY>-US<id>-descricao-curta` | Branch da User Story na camada de backend. |
| Frontend | `feature/frontend/<JIRA-KEY>-US<id>-descricao-curta` | Branch da User Story na camada de frontend. |
| Correção | `fix/<camada>/<JIRA-KEY>-descricao-curta` | Correção de bug, que também possui uma Jira Key própria. Veja [Bugs](#bugs). |
| Sem US (docs, CI, config) | `feature/docs/<JIRA-KEY>-descricao-curta` | Mudanças de documentação, CI, configuração ou manutenção que estejam vinculadas a uma issue do Jira. |
| Transversal | `feature/transversal/<descricao-curta>` | Mudanças sem relação com uma issue do Jira. Veja [Mudanças sem User Story](#mudanças-sem-user-story-docs-ci-configuração). |

`<camada>` indica em qual parte do monorepo a mudança acontece: `backend`, `frontend` ou `docs`.

`<JIRA-KEY>` é a chave oficial da issue no Jira (ex.: `JH-123`).

`<id>` é o número da User Story do backlog (ex.: `US#2.1` no backlog vira `US2.1` na branch — sem o `#`).

**Exemplos:**

```bash
feature/backend/JH-123-US2.1-cadastro
feature/frontend/JH-123-US2.1-cadastro
```

Uma User Story que envolve as duas camadas gera duas branches (uma de backend e uma de frontend), ambas com a mesma Jira Key e o mesmo `US<id>`.

---

## Padrão de commits

Todo commit deve seguir um dos formatos abaixo:

```text
<tipo>(JH-123): descrição real da alteração
<tipo>(TRANSVERSAL): descrição real da alteração
```

- Em alterações vinculadas ao Jira, a Jira Key é obrigatória e fica entre parênteses, logo após o tipo, **sem espaço** antes do parêntese.
- Como **Commit = Subtask**, a Jira Key do commit é a da Subtask que está sendo implementada (ex.: `JH-101`), que pertence à User Story da branch (ex.: `JH-123`).
- Em alterações sem relação com o Jira, use `TRANSVERSAL` no lugar da Jira Key.
- A descrição após o `:` deve explicar **o que foi feito e, quando necessário, em que parte ou comportamento do sistema a alteração atua**. Evite descrições genéricas como `ajustes`, `alterações`, `update` ou `implementar cadastro` sem contexto suficiente.
- O identificador visual `US2.1` **não precisa** aparecer no commit. A Jira Key da Subtask já é o identificador oficial do commit para a rastreabilidade do Moonfoxes. O `US<id>` permanece na branch e no título da PR para facilitar a leitura visual.

**Exemplo:**

```text
feat(JH-101): validar campos obrigatórios do cadastro de cliente e retornar mensagens de erro para entradas inválidas
```

**Não utilizar:**

```text
feat(US2.1): cadastro de cliente      ← US2.1 não é identificador de commit
feat: cadastro de cliente             ← sem identificador; use Jira Key ou TRANSVERSAL
feat(JH-101): ajustes                 ← descrição vaga
feat(JH-101): alterações              ← descrição vaga
feat(JH-101): update                  ← descrição vaga
```

### Comentário de cabeçalho nos arquivos

Antes de criar o commit, revise os arquivos de código criados ou modificados. Cada arquivo de código deve ter, no topo, um comentário curto explicando a responsabilidade do arquivo: **o que ele faz por inteiro quando é novo ou o que ele faz agora quando sua responsabilidade foi alterada**.

Regras:

- O comentário deve explicar a finalidade do arquivo, não descrever linha por linha.
- Se o arquivo já tiver esse comentário, atualize-o quando a responsabilidade do arquivo mudar.
- Mantenha o comentário objetivo e coerente com o estado final do código.
- Em arquivos que não suportam comentários (por exemplo, `package.json`, arquivos JSON ou lockfiles), não force comentários inválidos; essa regra se aplica aos arquivos em que comentários são suportados.

### Tipos de commit

| Tipo | Quando usar |
| --- | --- |
| `feat` | Uma funcionalidade nova |
| `fix` | Correção de um erro/bug |
| `docs` | Mudança só em documentação (README, guias etc.) |
| `style` | Ajuste de formatação/estilo que não muda o comportamento do código |
| `refactor` | Reorganização do código sem mudar o comportamento |
| `test` | Criação/ajuste de testes |
| `chore` | Tarefas de manutenção (ex.: atualizar dependências, workflows de CI) |

**Exemplos:**

```text
feat(JH-101): implementar validação de cliente
fix(JH-456): corrigir validação do campo de CPF
docs(JH-210): atualizar guia de padrão de commits
refactor(JH-130): reorganizar camada de repositories
chore(JH-200): atualizar workflow do GitHub Actions
docs(TRANSVERSAL): atualizar documentação geral
```

---

## Pull Requests

Formato do título para alteração vinculada ao Jira:

```text
[JH-123] US2.1 — Cadastro de cliente
```

Para alteração transversal:

```text
[TRANSVERSAL] Atualizar documentação geral
```

Todo PR deve conter:

- **Jira Key** no título quando a alteração estiver vinculada ao Jira;
- use `[TRANSVERSAL]` no título quando a alteração não tiver relação com uma issue do Jira;
- identificação da **User Story** quando aplicável;
- descrição clara do que foi implementado;
- instruções de como testar a mudança;
- eventuais limitações ou pontos pendentes.

Regras:

- Revisão obrigatória por **outro membro** do time.
- Ninguém aprova o próprio PR.
- Um PR representa uma User Story (**PR = User Story**) e tem como destino a `main`.
- Só é mesclado depois de aprovado, com os testes passando, usando **Squash and Merge**.

---

## Merge

O padrão oficial de merge do projeto é **Squash and Merge**.

Os commits de um PR representam o trabalho feito durante a implementação das Subtasks. Ao integrar a User Story, o PR é consolidado em **um único commit** na `main` usando Squash and Merge.

- Título do commit de squash: o título do PR (ex.: `[JH-123] US2.1 — Cadastro de cliente`).
- Recomendado: manter no corpo da mensagem de squash a lista dos commits das Subtasks, para preservar a rastreabilidade de quais Subtasks compuseram a User Story.
- A `main` continua sendo a branch estável.
- **Nenhum commit direto na `main`.**

---

## Fluxo completo

1. Definir se a alteração é vinculada ao Jira ou transversal.
2. Se for vinculada ao Jira, criar ou identificar a issue e obter a Jira Key oficial.
3. Identificar a User Story e a camada (`backend`, `frontend` ou `docs`), quando aplicável.
4. Atualizar a `main`.
5. Criar a branch da User Story (`feature/<camada>/<JIRA-KEY>-US<id>-descricao-curta`) ou, se for transversal, `feature/transversal/<descricao-curta>`.
6. Implementar a Subtask ou a alteração transversal.
7. Criar commits usando a Jira Key (`<tipo>(JH-123): descrição`) ou `TRANSVERSAL` (`<tipo>(TRANSVERSAL): descrição`).
8. Fazer push da branch.
9. Abrir Pull Request.
10. Realizar Code Review.
11. Corrigir feedbacks.
12. Aprovar por outro integrante.
13. Utilizar Squash and Merge.
14. Remover a branch da User Story após o merge, quando apropriado.

---

## Bugs

Bugs também são issues do Jira e **devem possuir uma Jira Key própria**.

Convenção de branch:

```text
fix/<camada>/<JIRA-KEY>-descricao-curta
```

**Exemplos:**

```bash
fix/backend/JH-456-correcao-validacao
fix/frontend/JH-456-correcao-tela
```

Os commits seguem o mesmo padrão, usando o tipo `fix`:

```text
fix(JH-456): corrigir validação do campo de CPF
```

O PR segue o mesmo formato de título e as mesmas regras de revisão e de Squash and Merge.

---

## Mudanças sem User Story (docs, CI, configuração)

Mudanças de documentação, CI, configuração, manutenção ou README podem ocorrer em dois cenários:

1. **Relacionadas ao Jira:** quando a alteração tiver uma issue própria, use a Jira Key normalmente, mesmo sem `US<id>`.
2. **Transversais:** quando a alteração não tiver relação com nenhuma issue do Jira, use `TRANSVERSAL` e não crie uma Jira Key apenas para identificá-la.

**Exemplo vinculado ao Jira:**

```text
Issue: JH-200 — Atualizar configuração do CI
```

Branch:

```bash
feature/docs/JH-200-configuracao-ci
```

Commit:

```text
chore(JH-200): atualizar workflow do GitHub Actions
```

Pull Request:

```text
[JH-200] Atualizar configuração do CI
```

**Exemplo transversal:**

Branch:

```bash
feature/transversal/atualizar-readme
```

Commit:

```text
docs(TRANSVERSAL): atualizar README geral
```

Pull Request:

```text
[TRANSVERSAL] Atualizar README geral
```

> `TRANSVERSAL` não substitui uma Jira Key quando a alteração faz parte de uma User Story, Bug ou outra issue existente. Use-o somente quando a alteração realmente não estiver relacionada ao Jira.

---

## Exemplos oficiais

**Branch:**

```bash
feature/backend/JH-123-US2.1-cadastro
feature/frontend/JH-123-US2.1-cadastro
```

**Commit:**

```text
feat(JH-101): validar campos obrigatórios do cadastro de cliente e retornar mensagens de erro para entradas inválidas
```

**Pull Request:**

```text
[JH-123] US2.1 — Cadastro de cliente
```

**Transversal:**

```bash
feature/transversal/atualizar-readme
```

```text
docs(TRANSVERSAL): atualizar README geral
```

```text
[TRANSVERSAL] Atualizar README geral
```

**Correção:**

```bash
fix/backend/JH-167-correcao-cliente
```

---

## Checklist rápido

**Antes da branch:**

- [ ] Defini se a alteração é vinculada ao Jira ou transversal.
- [ ] Se vinculada ao Jira, existe issue e Jira Key.
- [ ] Se transversal, a branch usa `feature/transversal/<descricao-curta>`.
- [ ] A camada está definida (`backend`, `frontend` ou `docs`), quando aplicável.

**Antes do commit:**

- [ ] Se vinculada ao Jira, a Jira Key está presente: `<tipo>(JH-123): <descrição>`.
- [ ] Se transversal, o identificador usado é `TRANSVERSAL`: `<tipo>(TRANSVERSAL): <descrição>`.
- [ ] O tipo está correto (`feat`, `fix`, `docs`, `style`, `refactor`, `test` ou `chore`).
- [ ] A descrição representa a mudança real e explica o que foi alterado (nada de "ajustes", "alterações" ou "update").
- [ ] Os arquivos de código criados/modificados possuem comentário de cabeçalho atualizado, quando aplicável.
- [ ] O código e os testes foram verificados.

**Antes da PR:**

- [ ] A branch segue a convenção Jira (`feature/<camada>/<JIRA-KEY>-US<id>-...` ou `fix/<camada>/<JIRA-KEY>-...`) ou transversal (`feature/transversal/<descricao-curta>`).
- [ ] Se vinculada ao Jira, o título contém a Jira Key: `[JH-123] US2.1 — Descrição`.
- [ ] Se transversal, o título usa `[TRANSVERSAL] Descrição`.
- [ ] A User Story está identificada (quando aplicável).
- [ ] A descrição é clara e explica o que foi implementado.
- [ ] As instruções de teste estão presentes (e as limitações/pendências, se houver).

**Antes do merge:**

- [ ] A revisão foi feita por outro integrante.
- [ ] Os feedbacks foram tratados.
- [ ] Os testes estão passando.
- [ ] A branch de destino é a correta (`main`).
- [ ] O merge será feito com **Squash and Merge**.
- [ ] Nenhum commit foi feito diretamente na `main`.

