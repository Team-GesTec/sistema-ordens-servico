# Guia de Contribuição — GesTec

Este guia explica como organizar o código, nomear branches, criar commits e Pull Requests e integrar as alterações ao projeto GesTec.

O objetivo é manter o trabalho da equipe organizado, facilitar a revisão do código e garantir que cada alteração possa ser rastreada até sua respectiva issue no Jira.

## Sumário

- [1. Regras gerais](#1-regras-gerais)
- [2. Rastreabilidade com Jira](#2-rastreabilidade-com-jira)
- [3. Fluxo de branches](#3-fluxo-de-branches)
- [4. Padrão de commits](#4-padrão-de-commits)
- [5. Pull Requests](#5-pull-requests)
- [6. Integração e resolução de conflitos](#6-integração-e-resolução-de-conflitos)
- [7. Fluxo completo de trabalho](#7-fluxo-completo-de-trabalho)
- [8. Bugs e outras alterações](#8-bugs-e-outras-alterações)
- [9. Comentários nos arquivos de código](#9-comentários-nos-arquivos-de-código)
- [10. Segurança e uso do Supabase](#10-segurança-e-uso-do-supabase)
- [11. Exemplos oficiais](#11-exemplos-oficiais)
- [12. Checklist rápido](#12-checklist-rápido)

---

## 1. Regras gerais

| Regra | Como funciona |
|---|---|
| `main` | Branch principal e estável do projeto. Não recebe commits diretos. |
| `feature/Transversal` | Branch de integração que reúne as alterações das User Stories. |
| Branch da US | Cada User Story possui sua própria branch, criada a partir da `main`. |
| Jira Key | Identificador oficial da issue, como `JH-123`. |
| `US2.2` | Identificador visual da User Story, usado para facilitar a leitura. |
| Commit | Registra uma alteração específica e utiliza a Jira Key da Subtask correspondente. |
| Pull Request | Permite revisar e integrar as alterações de uma branch em outra. |
| Code Review | Deve ser realizado por outro integrante da equipe. |
| Merge de integração | Reúne as alterações das User Stories na `feature/Transversal`. |
| Merge final | Integra a versão revisada da `feature/Transversal` à `main`. |

### Regras que todos devem seguir

- Toda branch de trabalho deve ser criada a partir da `main` atualizada.
- As branches das User Stories devem ser integradas à `feature/Transversal`.
- A `main` só deve receber a versão integrada e revisada.
- Nenhum integrante pode aprovar o próprio Pull Request.
- Toda alteração relacionada ao Jira deve utilizar a Jira Key correspondente.
- Conflitos devem ser resolvidos e testados antes da conclusão da integração.
- Não devem existir branches separadas para backend e frontend. Uma única branch representa a User Story completa, independentemente das partes do sistema que ela modifica.

---

## 2. Rastreabilidade com Jira

O Jira é a referência oficial para identificar e acompanhar as tarefas do projeto.

Cada elemento possui uma função:

- **User Story:** representa uma funcionalidade ou necessidade do usuário.
- **Jira Key:** identifica oficialmente uma issue, como `JH-123`.
- **Identificador visual:** facilita a leitura da User Story, como `US2.2`.
- **Subtask:** representa uma tarefa menor dentro de uma User Story.

Exemplo:

```text
User Story: US2.2 — Cadastro de cliente
Jira Key: JH-123

Subtasks:
JH-124 — Criar validação dos campos
JH-125 — Implementar endpoint de cadastro
JH-126 — Criar formulário de cadastro
```

A relação entre os elementos é:

```text
User Story
    │
    ├── Branch da US
    │
    ├── Pull Request para feature/Transversal
    │
    └── Subtasks
          └── Commits identificados pelas Jira Keys
```

O identificador `US2.2` não substitui a Jira Key. Ambos podem aparecer nos nomes de branches e títulos de Pull Requests, mas os commits relacionados a subtasks devem utilizar a chave oficial da respectiva subtask.

---

## 3. Fluxo de branches

O projeto utiliza três níveis de organização:

1. `main`: versão principal e estável.
2. Branches das User Stories: desenvolvimento de cada funcionalidade.
3. `feature/Transversal`: integração das User Stories antes da atualização da `main`.

### 3.1. Branch principal — `main`

A `main` é a base para iniciar o desenvolvimento e a referência para a versão estável do projeto.

Regras:

- Não realizar commits diretamente na `main`.
- Criar todas as branches de trabalho a partir de uma `main` atualizada.
- Não integrar uma User Story diretamente à `main`.
- Atualizar a `main` somente após a integração e revisão do conjunto de alterações.

### 3.2. Branches das User Stories

Cada User Story deve possuir uma única branch, independentemente de envolver backend, frontend, banco de dados ou outras partes do sistema.

**Padrão de nome:**

```text
US<numero>-<JIRA-KEY>-<descricao-curta>
```

**Exemplo:**

```text
US2.2-JH-123-cadastro-de-cliente
```

Nesse exemplo:

- `US2.2`: identificador visual da User Story.
- `JH-123`: Jira Key da User Story.
- `cadastro-de-cliente`: descrição curta da funcionalidade.

Outros exemplos:

```text
US2.1-JH-101-autenticacao
US2.3-JH-130-listagem-de-clientes
US3.1-JH-150-relatorio-de-vendas
```

A descrição deve ser curta, clara e escrita sem espaços ou caracteres especiais incompatíveis com nomes de branches.

**Importante:** não criar branches como `feature/backend/...` ou `feature/frontend/...`. A User Story deve ser desenvolvida em uma única branch.

### 3.3. Branch de integração — `feature/Transversal`

A branch `feature/Transversal` reúne as alterações das User Stories para que a equipe possa verificar a compatibilidade entre elas antes da integração final.

Fluxo:

```text
main
 ├── US2.1-JH-101-autenticacao
 ├── US2.2-JH-123-cadastro-de-cliente
 └── US2.3-JH-130-listagem-de-clientes
                  │
                  ▼
        feature/Transversal
                  │
                  ▼
                main
```

Regras:

- As branches das User Stories devem ser integradas à `feature/Transversal` por Pull Request.
- A integração deve respeitar a ordem e as dependências entre as User Stories.
- Quando houver conflitos, eles devem ser resolvidos antes de concluir o merge.
- A equipe deve verificar se as funcionalidades continuam funcionando em conjunto.
- A `feature/Transversal` deve ser revisada e validada antes de ser integrada à `main`.

A `feature/Transversal` é uma branch de integração, não uma substituta da `main`. Ela não deve ser usada como base para iniciar novas branches de User Stories.

---

## 4. Padrão de commits

Todos os commits devem seguir o formato:

```text
<tipo>(<JIRA-KEY>): <descricao-da-alteracao>
```

Para alterações sem relação com uma issue do Jira:

```text
<tipo>(TRANSVERSAL): <descricao-da-alteracao>
```

A mensagem deve explicar o que foi alterado de maneira objetiva. Evite descrições vagas como `ajustes`, `alterações`, `update` ou `correções` sem contexto.

### 4.1. Tipos de commit

| Tipo | Quando utilizar |
|---|---|
| `feat` | Implementação de uma funcionalidade nova. |
| `fix` | Correção de um erro ou comportamento incorreto. |
| `docs` | Alterações exclusivamente na documentação. |
| `style` | Formatação ou estilo sem mudança de comportamento. |
| `refactor` | Reorganização do código sem mudar seu comportamento. |
| `test` | Criação ou alteração de testes. |
| `chore` | Manutenção, dependências e configurações. |
| `merge` | Commit de merge utilizado para registrar a resolução de conflitos durante a integração. |

### 4.2. Qual Jira Key utilizar?

Quando o commit estiver relacionado a uma subtask, utilize a Jira Key dessa subtask, e não a chave da User Story por padrão.

Exemplo:

```text
User Story: JH-123
Subtask: JH-124
```

Commit:

```text
feat(JH-124): validar campos obrigatorios do cadastro de cliente
```

Outros exemplos:

```text
feat(JH-125): implementar endpoint de cadastro de cliente
test(JH-124): adicionar testes para campos obrigatorios
fix(JH-126): corrigir exibicao de mensagens de validacao
docs(JH-127): documentar parametros da API de clientes
chore(JH-128): atualizar configuracao do ambiente de desenvolvimento
```

Se uma alteração estiver vinculada diretamente à User Story e não a uma subtask específica, utilize a Jira Key da própria User Story.

### 4.3. Commits de integração e resolução de conflitos

Quando houver conflitos entre branches de User Stories durante a integração na `feature/Transversal`, o commit que registrar a resolução deve seguir este formato:

```text
merge(<JIRA-KEY-DA-US>): resolve conflitos entre <branches envolvidas>
```

Exemplo:

```text
merge(JH-123): resolve conflitos entre US2.2 e US2.3
```

Outro exemplo:

```text
merge(JH-130): resolve conflitos entre cadastro e listagem de clientes
```

Regras:

- Utilize a Jira Key da User Story relacionada à resolução, escolhendo a que melhor representa o contexto do conflito.
- Descreva quais branches ou funcionalidades tiveram conflitos.
- Revise as alterações antes de registrar o commit.
- Execute os testes necessários para confirmar que a resolução não quebrou funcionalidades existentes.
- Não utilize o tipo `merge` para commits comuns de desenvolvimento.

Esse padrão se aplica ao commit de resolução de conflitos. Ele não substitui os commits `feat`, `fix`, `test` e outros realizados durante o desenvolvimento.

**Atenção:** quando o Git criar automaticamente um commit de merge, a equipe deve revisar sua mensagem e adequá-la ao padrão quando necessário. Não crie um commit de resolução artificial se não houve conflitos a resolver.

### 4.4. Commits que não devem ser utilizados

```text
feat: cadastro de cliente
feat(US2.2): cadastro de cliente
feat(JH-124): ajustes
feat(JH-124): update
merge: conflitos resolvidos
```

Prefira:

```text
feat(JH-124): validar campos obrigatorios do cadastro de cliente
merge(JH-123): resolve conflitos entre US2.2 e US2.3
docs(TRANSVERSAL): atualizar guia de contribuicao
```

---

## 5. Pull Requests

Todo Pull Request deve ter um objetivo claro e permitir que outro integrante entenda o que está sendo alterado.

### 5.1. PR de uma User Story

O título deve seguir este formato:

```text
[<JIRA-KEY>] <US-ID> — <descricao>
```

Exemplo:

```text
[JH-123] US2.2 — Cadastro de cliente
```

O destino desse PR é a `feature/Transversal`, e não a `main`.

Cada PR deve conter:

- Objetivo da alteração.
- Resumo do que foi implementado.
- Subtasks relacionadas, quando aplicável.
- Instruções para testar a funcionalidade.
- Resultado dos testes executados.
- Limitações ou pendências conhecidas.

### 5.2. Modelo de descrição

```markdown
## Objetivo

Implementar a US2.2 — Cadastro de cliente.

## O que foi feito

- Implementada a validação dos campos obrigatórios.
- Criado o endpoint de cadastro.
- Implementado o formulário de cadastro.
- Integrada a interface com a API.

## Subtasks relacionadas

- JH-124 — Validar campos obrigatórios.
- JH-125 — Implementar endpoint.
- JH-126 — Criar formulário.

## Como testar

1. Executar o projeto.
2. Acessar o cadastro de cliente.
3. Testar o envio de dados inválidos.
4. Testar o cadastro com dados válidos.
5. Confirmar que os resultados estão corretos.

## Testes executados

- Testes automatizados: informar o resultado.
- Testes manuais: informar o resultado.

## Limitações e pendências

Informar eventuais problemas conhecidos ou escrever
"Nenhuma pendência conhecida".
```

### 5.3. PR final de integração

Depois de integrar as User Stories e validar o conjunto, deve ser aberto um Pull Request de `feature/Transversal` para `main`.

Exemplo de título:

```text
[TRANSVERSAL] Integração das User Stories — Sprint 2
```

A descrição deve resumir:

- Quais User Stories foram integradas.
- Quais testes foram executados.
- Quais conflitos foram resolvidos, se houver.
- Se existem pendências ou limitações.
- Se a versão integrada está pronta para entrar na `main`.

### 5.4. Revisão obrigatória

Todo PR deve ser revisado por outro integrante.

Antes da aprovação:

- Verifique se o código está coerente com os requisitos.
- Confirme se os testes necessários passaram.
- Verifique se as alterações não introduzem regressões conhecidas.
- Resolva os comentários e pedidos de alteração do revisor.

Ninguém pode aprovar o próprio PR.

---

## 6. Integração e resolução de conflitos

A integração deve ocorrer em duas etapas: primeiro, as User Stories são reunidas na `feature/Transversal`; depois, a branch de integração é enviada para a `main`.

### 6.1. Integração de uma User Story

1. Atualize sua branch com a `main`, conforme necessário.
2. Finalize a implementação e os testes da User Story.
3. Envie a branch ao GitHub.
4. Abra um PR da branch da User Story para `feature/Transversal`.
5. Aguarde a revisão e resolva os apontamentos.
6. Se houver conflitos, resolva-os e valide o código.
7. Conclua a integração conforme as regras de merge do repositório.

Exemplo:

```text
Origem:
US2.2-JH-123-cadastro-de-cliente

Destino:
feature/Transversal
```

### 6.2. Resolução de conflitos

Conflitos acontecem quando branches diferentes modificam partes incompatíveis de um mesmo arquivo ou quando o Git não consegue combinar as alterações automaticamente.

Ao identificar um conflito:

1. Identifique os arquivos afetados.
2. Compare as alterações das User Stories envolvidas.
3. Preserve os requisitos e o comportamento esperado de cada funcionalidade.
4. Remova os marcadores de conflito do Git.
5. Execute os testes relevantes.
6. Registre a resolução utilizando o padrão de commit definido neste guia, quando houver um commit manual de resolução.

Exemplo de mensagem:

```text
merge(JH-123): resolve conflitos entre US2.2 e US2.3
```

Não escolha automaticamente uma das versões apenas para eliminar o conflito. A resolução deve considerar o comportamento esperado das funcionalidades.

Se o conflito envolver regras de negócio ou decisões que não possam ser tomadas com segurança, consulte os responsáveis pelas User Stories antes de concluir a integração.

### 6.3. Merge versus Squash and Merge

Essas estratégias têm finalidades diferentes:

- **Merge:** integra os históricos das branches e pode criar um commit de merge.
- **Squash and Merge:** reúne os commits de um Pull Request em um único commit.

Para os PRs das User Stories destinados à `feature/Transversal`, a equipe deve utilizar a estratégia definida nas configurações do repositório e registrar a resolução de conflitos conforme este guia.

Para o PR final destinado à `main`, a estratégia padrão é **Squash and Merge**, consolidando a entrega integrada em um único commit.

Título sugerido para o commit final:

```text
[TRANSVERSAL] Integração das User Stories — Sprint 2
```

O corpo do commit pode listar as User Stories incluídas e os testes realizados.

**Importante:** o padrão `merge(JH-123): ...` identifica um commit que registra a resolução de conflitos. Ele não significa que todo PR precisa terminar com um commit manual desse tipo. A estratégia de merge e a mensagem do commit de resolução são regras distintas.

### Comentário de cabeçalho nos arquivos

## 7. Fluxo completo de trabalho

O fluxo padrão de uma User Story deve seguir esta ordem:

1. Identificar a User Story no Jira.
2. Confirmar sua Jira Key e seu identificador visual.
3. Atualizar a `main` local.
4. Criar uma branch da User Story a partir da `main`.
5. Implementar a funcionalidade e suas subtasks.
6. Criar commits seguindo o padrão estabelecido.
7. Executar os testes necessários.
8. Enviar a branch ao GitHub.
9. Abrir um Pull Request para `feature/Transversal`.
10. Solicitar revisão de outro integrante.
11. Corrigir os apontamentos e resolver possíveis conflitos.
12. Integrar a User Story à `feature/Transversal`.
13. Repetir o processo para as demais User Stories.
14. Validar o conjunto integrado e executar os testes de integração.
15. Abrir um Pull Request de `feature/Transversal` para `main`.
16. Realizar a revisão final e corrigir eventuais problemas.
17. Integrar a entrega à `main` utilizando Squash and Merge.
18. Remover branches temporárias após confirmar que não são mais necessárias.

### Visão resumida

```text
main
  │
  ├── Criar branch da US
  │       │
  │       ├── Implementar
  │       ├── Criar commits
  │       ├── Testar
  │       └── Abrir PR
  │
  ▼
feature/Transversal
  │
  ├── Integrar as User Stories
  ├── Resolver conflitos
  ├── Testar o conjunto
  └── Revisar a integração
  │
  ▼
Pull Request final
  │
  ▼
main
```

---

## 8. Bugs e outras alterações

### 8.1. Correção de bugs

Todo bug relacionado ao projeto deve possuir uma issue no Jira e uma Jira Key própria.

Para manter o mesmo fluxo de integração, a branch de correção também deve nascer da `main` e ser integrada à `feature/Transversal`.

Padrão de nome:

```text
BUG-<JIRA-KEY>-<descricao-curta>
```

Exemplo:

```text
BUG-JH-456-validacao-de-cpf
```

Commit:

```text
fix(JH-456): corrigir validacao do CPF
```

Título do PR:

```text
[JH-456] Corrigir validação do CPF
```

Destino do PR:

```text
feature/Transversal
```

A correção deve incluir uma explicação do problema, o que foi corrigido e como verificar que o comportamento está correto.

### 8.2. Documentação, CI e configuração

Alterações de documentação, configuração, dependências e manutenção também devem respeitar o fluxo de branches.

Quando houver uma issue no Jira, utilize sua Jira Key.

Exemplo de branch:

```text
DOC-JH-200-configuracao-do-ci
```

Commit:

```text
chore(JH-200): atualizar workflow do GitHub Actions
```

PR:

```text
[JH-200] Atualizar configuração do CI
```

Quando a alteração não estiver relacionada a nenhuma issue do Jira, utilize `TRANSVERSAL` nos commits e títulos de PR, conforme aplicável.

Exemplo:

```text
docs(TRANSVERSAL): atualizar README geral
```

Branch para uma alteração sem User Story:

```text
DOC-TRANSVERSAL-atualizar-readme
```

PR:

```text
[TRANSVERSAL] Atualizar README geral
```

O uso de `TRANSVERSAL` não substitui uma Jira Key quando a alteração faz parte de uma issue existente.

---

## 9. Comentários nos arquivos de código

Antes de realizar o commit, revise os arquivos de código criados ou modificados.

Quando aplicável, cada arquivo deve possuir um comentário inicial curto que explique sua responsabilidade.

Regras:

- Em arquivos novos, explique a finalidade principal do arquivo.
- Em arquivos existentes, atualize o comentário quando sua responsabilidade mudar.
- Não descreva linha por linha nem repita o código em texto.
- Não adicione comentários em formatos que não os suportam, como JSON e arquivos de lock.
- Mantenha os comentários atualizados com o comportamento real do código.

O objetivo é facilitar a compreensão e a manutenção do projeto, não adicionar comentários desnecessários.

---

## 10. Segurança e uso do Supabase

Como o projeto utiliza um banco Supabase compartilhado, todos os integrantes devem seguir estas regras.

### Credenciais e variáveis de ambiente

- Os arquivos `backend/.env` e `frontend/.env` são locais e não devem ser enviados ao Git.
- Envie apenas arquivos de exemplo, como `.env.example`, sem credenciais válidas.
- Nunca coloque `DATABASE_URL`, `DIRECT_URL`, senhas do PostgreSQL, `JWT_SECRET` ou credenciais de seed no frontend, em variáveis `VITE_*`, em issues públicas ou em logs compartilhados.
- O frontend deve acessar somente a API Express.
- O backend é responsável pelo acesso ao PostgreSQL do Supabase.

### Migrations e alterações no banco

- A estrutura do banco deve evoluir por meio de migrations versionadas.
- Não altere manualmente a estrutura do banco pelo painel do Supabase.
- Não utilize `prisma db push` como substituto do histórico de migrations.
- Antes de executar migrations, confirme que a conexão aponta para o ambiente correto e combine a execução com a pessoa responsável pelo banco compartilhado.

O comando:

```bash
npx prisma migrate deploy
```

aplica migrations já versionadas que ainda estejam pendentes. Antes de executá-lo no banco compartilhado, confirme que as migrations foram revisadas e que a execução foi combinada com a equipe.

**Nunca execute este comando no Supabase compartilhado:**

```bash
npx prisma migrate reset
```

Esse comando pode apagar dados.

A criação de migrations com `prisma migrate dev` também exige uma shadow database. Até que o processo de criação de migrations esteja acordado e isolado, não execute esse comando contra o banco compartilhado.

Consulte o [Manual de Instalação](./docs/instalacao.md) para obter as orientações específicas do projeto.

---

## 11. Exemplos oficiais

### Branch de User Story

```text
US2.2-JH-123-cadastro-de-cliente
```

### Commit de desenvolvimento

```text
feat(JH-124): validar campos obrigatorios do cadastro de cliente
```

### PR de User Story

```text
[JH-123] US2.2 — Cadastro de cliente
```

Destino:

```text
feature/Transversal
```

### Commit de resolução de conflitos

```text
merge(JH-123): resolve conflitos entre US2.2 e US2.3
```

### PR final de integração

```text
[TRANSVERSAL] Integração das User Stories — Sprint 2
```

Destino:

```text
main
```

### Commit final de Squash and Merge

```text
[TRANSVERSAL] Integração das User Stories — Sprint 2
```

### Bug

```text
Branch:
BUG-JH-456-validacao-de-cpf

Commit:
fix(JH-456): corrigir validacao do CPF

PR:
[JH-456] Corrigir validação do CPF
```

---

## 12. Checklist rápido

### Antes de criar a branch

- [ ] Identifiquei a User Story e sua Jira Key.
- [ ] Atualizei a `main`.
- [ ] Criei a branch a partir da `main`.
- [ ] Utilizei o identificador visual, a Jira Key e uma descrição curta.
- [ ] Não criei branches separadas para backend e frontend.

### Antes de cada commit

- [ ] Escolhi o tipo correto de commit.
- [ ] Utilizei a Jira Key da subtask correspondente ou `TRANSVERSAL`, quando aplicável.
- [ ] Escrevi uma descrição clara e específica.
- [ ] Revisei os arquivos modificados.
- [ ] Executei os testes necessários.
- [ ] Não incluí credenciais ou arquivos `.env`.

### Antes de abrir um PR de User Story

- [ ] Enviei a branch ao GitHub.
- [ ] Defini `feature/Transversal` como destino.
- [ ] Incluí a Jira Key e o identificador da User Story no título.
- [ ] Expliquei o que foi implementado.
- [ ] Listei as subtasks relacionadas, quando aplicável.
- [ ] Incluí as instruções e os resultados dos testes.
- [ ] Solicitei a revisão de outro integrante.

### Antes de concluir a integração

- [ ] Resolvi os conflitos, quando existirem.
- [ ] Registrei as resoluções conforme o padrão de commit definido.
- [ ] Executei os testes relevantes após a resolução.
- [ ] Confirmei que as User Stories funcionam em conjunto.
- [ ] Verifiquei a `feature/Transversal` antes de abrir o PR final.

### Antes do merge para a `main`

## Segurança e uso do banco Supabase compartilhado
- [ ] O PR final tem como destino a `main`.
- [ ] A revisão foi feita por outro integrante.
- [ ] Os testes necessários passaram.
- [ ] As pendências conhecidas foram tratadas ou documentadas.
- [ ] O merge final será feito com Squash and Merge.
- [ ] Nenhum commit foi realizado diretamente na `main`.

---

**Regra principal do GesTec:** cada User Story tem sua própria branch criada a partir da `main`. As User Stories são integradas na `feature/Transversal`, onde os conflitos e a compatibilidade entre funcionalidades são tratados. Somente depois da revisão e validação da integração o resultado é enviado à `main`.
