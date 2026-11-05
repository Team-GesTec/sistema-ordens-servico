# SGOS - Sistema de Gestão de Ordens de Serviço (ALTAVE)

O Sistema de Gestão de Ordens de Serviço (SGOS) foi desenvolvido pela equipe **GesTec** para a empresa parceira **ALTAVE**. O objetivo do sistema é centralizar, estruturar e rastrear todo o fluxo de solicitações operacionais e projetos de implantação da empresa.

---

## Descrição do Desafio

A ALTAVE enfrentava gargalos no acompanhamento descentralizado de solicitações de serviço, ausência de padronização nas etapas operacionais entre seus departamentos e falta de previsibilidade sobre os prazos de atendimento de SLA contratual.

O SGOS resolve essa dor ao oferecer um agrupador central de projetos, ordens de serviço organizadas por setor, notificações multicanal (e-mail e in-app), controle rígido de status e logs de auditoria detalhados.

---

## Backlog de Produto

| Rank | Épico | Prioridade | User Story | Estimativa | Sprint |
| :---: | :--- | :---: | :--- | :---: | :--- |
| 1 | EP04 - Auditoria de Ações e Documentação | Alta | **US#4.1** Como colaborador do sistema, quero autenticar com e-mail e senha, para acessar o SGOS e garantir o controle de acesso conforme meu perfil (Gestor, Analista, Técnico). | 8 | 1 |
| 2 | EP01 - Gestão e Rastreabilidade de Projetos | Alta | **US#1.2** Como gestor de projetos, quero abrir um projeto de implantação associado a um cliente e selecionar os departamentos envolvidos, para servir como agrupador central das O.S. | 3 | 1 |
| 3 | EP02 - Gestão do Ciclo de Vida da O.S. | Alta | **US#2.1** Como analista de suporte, quero abrir uma O.S. associada a um cliente/projeto escolhendo o tipo (Instalação/Manutenção) e a criticidade, incluindo a opção de vincular o código de uma O.S. anterior reincidente, para direcionar o chamado ao setor correto. | 3 | 1 |
| 4 | EP04 - Auditoria de Ações e Documentação | Média | **US#4.2** Como gestor de projetos, quero cadastrar departamentos (Hardware, Compras, SST) e técnicos/colaboradores, para estruturar a equipe e permitir a atribuição de tarefas. | 3 | 1 |
| 5 | EP01 - Gestão e Rastreabilidade de Projetos | Média | **US#1.1** Como gestor de projetos, quero cadastrar um cliente informando razão social, ramo de atuação, descrição e ativos/locais operacionais (offshore, terrestre e site), para mapear a base de atendimento. | 3 | 1 |
| 6 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.2** Como gestor de projetos, quero desmembrar um projeto manualmente em O.S. direcionadas para os departamentos, para garantir a execução integrada da demanda. | 5 | 1 |
| 7 | EP01 - Gestão e Rastreabilidade de Projetos | Alta | **US#1.3** Como usuário do SGOS, quero ver ao entrar no sistema um dashboard de acordo com meu perfil, para acompanhar o andamento das O.S. | 5 | 2 |
| 8 | EP02 - Gestão do Ciclo de Vida da O.S. | Alta | **US#2.4** Como responsável técnico, quero alterar o status da O.S. (passando por Pendente, Em Andamento, Aguardando Embarque, Validação/Testes, Bloqueado, Review ou Concluído) e registrar o parecer técnico, para oficializar o andamento e a conclusão do trabalho. | 3 | 2 |
| 9 | EP03 - Controle de SLA, Priorização e Alertas | Alta | **US#3.2** Como responsável técnico, quero receber alertas visuais quando uma O.S. atingir a margem de risco de SLA, para priorizar atendimentos críticos. | 3 | 2 |
| 10 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.3** Como líder de área, quero atribuir um responsável técnico específico a uma O.S. do meu setor, para definir a responsabilidade pela execução. | 3 | 2 |
| 11 | EP03 - Controle de SLA, Priorização e Alertas | Média | **US#3.1** Como gestor de projetos, quero que o sistema calcule a data limite de SLA automaticamente para demandas padrão e permita a sobreposição manual de prazos, para ajustar datas a paradas operacionais e regras contratuais. | 5 | 2 |
| 12 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.6**  Como colaborador, quero anexar fotos, laudos e documentos à O.S. com limite de tamanho por arquivo (50MB), para comprovar a execução do serviço ou detalhar o problema operacional. | 3 | 2 |
| 13 | EP02 - Gestão do Ciclo de Vida da O.S. | Baixa | **US#2.5** Como responsável técnico, quero consultar minha fila de O.S. atribuídas com filtro por status e criticidade, para organizar os atendimentos do dia. | 3 | 2 |
| 14 | EP04 - Auditoria de Ações e Documentação | Alta | **US#4.3** Como gestor de projetos, quero consultar o histórico de alterações da O.S. (quem alterou, o quê e quando), para atender às exigências de rastreabilidade. | 8 | 3 |
| 15 | EP04 - Auditoria de Ações e Documentação | Média | **US#4.4** Como desenvolvedor ou avaliador, quero acessar a documentação interativa da API via Swagger, para validar as integrações e contratos das rotas. | 8 | 3 |
| 16 | EP03 - Controle de SLA, Priorização e Alertas | Média | **US#3.3** Como envolvido na O.S., quero receber notificações no sistema (in-app) e por e-mail sobre alterações de status, prioridade e nova atribuição, para acompanhar a evolução do atendimento em tempo real. | 5 | 3 |
| 17 | EP02 - Gestão do Ciclo de Vida da O.S. | Média | **US#2.7** Como responsável técnico, quero registrar horas gastas nas ordens de serviço, para que meu líder e gestor tenham controle de quanto tempo foi gasto ao realizar uma ordem de serviço | 3 | 3 |


---

## Cronograma de Evolução do Projeto

```text
[Sprint 1: Set/2026] ➔ [Sprint 2: Out/2026] ➔ [Sprint 3: Nov/2026]
 ├─ Autenticação        ├─ Dashboards Visuais       ├─ Histórico & Auditoria
 ├─ Cadastros Base      ├─ Ciclo de Vida O.S.       ├─ Notificação
 └─ Abertura de O.S.    └─ Regras de SLA e Anexos   └─ Documentação Swagger
```

### Tabela Descritiva das Sprints

| Período da Sprint | Meta (User Stories) | Link para Documentação da Sprint | Link para Vídeo no Youtube do Incremento Entregue |
| --- | --- | --- | --- |
| Sprint 1: 01/09/2026 - 25/09/2026 | US#4.1, US#2.1, US#1.2 | [Documentação da Sprint 1](./docs/Sprint%201/docssprint1.md) | [Demonstração da Sprint 1 - YouTube](https://www.youtube.com/watch?v=vnbYhxT90lo) |
| Sprint 2: 28/09/2026 - 24/10/2026 | US#1.3 | [Documentação da Sprint 2](./docs/Sprint%202/docssprint2.md) | [Demonstração da Sprint 2 - YouTube](#) |
| Sprint 3: 26/10/2026 - 20/11/2026 | *Em progresso* | [Documentação da Sprint 3](./docs/Sprint%203/docssprint3.md) | [Demonstração da Sprint 3 - YouTube](#) |

---

## Tecnologias Utilizadas

- **Frontend:** React.js / TypeScript / Tailwind CSS
- **Backend:** Node.js / TypeScript / Express.js
- **Banco de Dados:** PostgreSQL hospedado no Supabase, acessado pelo backend via Prisma ORM 7
- **Documentação de API:** Swagger (OpenAPI 3.0) — *planejado para a Sprint 3 (US#4.4), ainda não implementado*
- **Autenticação:** JSON Web Token (JWT) e bcrypt

---

## Estrutura do Projeto

```
├── backend
│   ├── features
│   │   ├── auth
│   │   │   └── login.feature
│   │   ├── ordens
│   │   │   ├── anexos.feature
│   │   │   ├── atribuicao.feature
│   │   │   ├── crud.feature
│   │   │   ├── migracao.feature
│   │   │   ├── notificacoes.feature
│   │   │   ├── sla.feature
│   │   │   └── status.feature
│   │   ├── step-definitions
│   │   │   ├── anexos.steps.ts
│   │   │   ├── atribuicao.steps.ts
│   │   │   ├── auth.steps.ts
│   │   │   ├── crud.steps.ts
│   │   │   ├── migracao.steps.ts
│   │   │   ├── notificacoes.steps.ts
│   │   │   ├── sla.steps.ts
│   │   │   └── status.steps.ts
│   │   └── support
│   │       ├── api.ts
│   │       ├── apiAuth.ts
│   │       ├── sessao.ts
│   │       └── world.ts
│   ├── src
│   │   ├── config
│   │   │   └── env.ts
│   │   ├── controllers
│   │   │   ├── controllerAnexo.ts
│   │   │   ├── controllerAuth.ts
│   │   │   ├── controllerCliente.ts
│   │   │   ├── controllerDepartamento.ts
│   │   │   ├── controllerFuncionario.ts
│   │   │   ├── controllerNotificacao.ts
│   │   │   ├── controllerOrdemServico.ts
│   │   │   └── controllerProjeto.ts
│   │   ├── errors
│   │   │   ├── AppError.ts
│   │   │   └── tratarErroPrisma.ts
│   │   ├── jobs
│   │   │   └── rotinaNotificacoes.ts
│   │   ├── middlewares
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorMiddleware.ts
│   │   │   └── uploadMiddleware.ts
│   │   ├── models
│   │   │   ├── modelAnexo.ts
│   │   │   ├── modelAuditoria.ts
│   │   │   ├── modelAuditoriaProjeto.ts
│   │   │   ├── modelAuth.ts
│   │   │   ├── modelCliente.ts
│   │   │   ├── modelDepartamento.ts
│   │   │   ├── modelFuncionario.ts
│   │   │   ├── modelNotificacao.ts
│   │   │   ├── modelOrdemServico.ts
│   │   │   ├── modelProjeto.ts
│   │   │   └── modelSla.ts
│   │   ├── prisma
│   │   │   ├── migrations
│   │   │   │   ├── 20260924_fix
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20261009_schema_fix
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20261015_cliente_fix
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20261016_cliente_ativo
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20261016_ordem_servico_ativo
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20261017_aj02_projetos
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20261017_aj03_funcionarios_ativo
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20261019_anexos_autor
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20261023_anexos_relato
│   │   │   │   │   └── migration.sql
│   │   │   │   └── migration_lock.toml
│   │   │   ├── client.ts
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── repositories
│   │   │   ├── repositoryAnexo.ts
│   │   │   ├── repositoryAuditoria.ts
│   │   │   ├── repositoryAuditoriaProjeto.ts
│   │   │   ├── repositoryCliente.ts
│   │   │   ├── repositoryDepartamento.ts
│   │   │   ├── repositoryFuncionario.ts
│   │   │   ├── repositoryNotificacao.ts
│   │   │   ├── repositoryOrdemServico.ts
│   │   │   ├── repositoryProjeto.ts
│   │   │   ├── repositorySla.ts
│   │   │   └── repositoryStorageAnexo.ts
│   │   ├── routes
│   │   │   ├── routeAnexo.ts
│   │   │   ├── routeAuth.ts
│   │   │   ├── routeCliente.ts
│   │   │   ├── routeDepartamento.ts
│   │   │   ├── routeFuncionario.ts
│   │   │   ├── routeNotificacao.ts
│   │   │   ├── routeOrdemServico.ts
│   │   │   └── routeProjeto.ts
│   │   ├── services
│   │   │   ├── serviceAnexo.ts
│   │   │   ├── serviceAuditoria.ts
│   │   │   ├── serviceAuth.ts
│   │   │   ├── serviceCliente.ts
│   │   │   ├── serviceDepartamento.ts
│   │   │   ├── serviceEscopoOrdemServico.ts
│   │   │   ├── serviceFuncionario.ts
│   │   │   ├── serviceNotificacao.ts
│   │   │   ├── serviceOrdemServico.ts
│   │   │   ├── serviceProjeto.ts
│   │   │   └── serviceSla.ts
│   │   ├── types
│   │   │   └── express.d.ts
│   │   ├── utils
│   │   │   ├── arquivo.ts
│   │   │   ├── diasUteis.ts
│   │   │   ├── estadoSla.ts
│   │   │   ├── projetoOsInvariant.ts
│   │   │   ├── senha.ts
│   │   │   └── validacao.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── cucumber.json
│   ├── package-lock.json
│   ├── package.json
│   ├── prisma.config.ts
│   └── tsconfig.json
├── docs
│   ├── Sprint 1
│   │   ├── README.md
│   │   └── docssprint1.md
│   ├── Sprint 2
│   │   └── docssprint2.md
│   ├── Sprint 3
│   │   └── docssprint3.md
│   ├── Padroes-e-Utilizacao-ReactxTS.md
│   ├── checklist-dor-dod.md
│   └── instalacao.md
├── frontend
│   ├── public
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components
│   │   │   ├── clientes
│   │   │   │   ├── ClienteCard.tsx
│   │   │   │   ├── ClienteFormModal.tsx
│   │   │   │   ├── ClienteStatusModal.tsx
│   │   │   │   └── ClientesToolbar.tsx
│   │   │   ├── common
│   │   │   │   └── Autocomplete.tsx
│   │   │   ├── departamentos
│   │   │   │   └── DepartamentoDetalhesModal.tsx
│   │   │   ├── funcionarios
│   │   │   │   ├── FuncionarioCard.tsx
│   │   │   │   ├── FuncionarioDetalhesModal.tsx
│   │   │   │   ├── FuncionarioFormModal.tsx
│   │   │   │   ├── FuncionarioStatusModal.tsx
│   │   │   │   └── FuncionariosToolbar.tsx
│   │   │   ├── ordens
│   │   │   │   ├── OrdemServicoAtivoModal.tsx
│   │   │   │   ├── OrdemServicoCard.tsx
│   │   │   │   ├── OrdemServicoDetalhesModal.tsx
│   │   │   │   ├── OrdemServicoFormModal.tsx
│   │   │   │   ├── OrdemServicoHistorico.tsx
│   │   │   │   ├── OrdemServicoKanban.tsx
│   │   │   │   ├── OrdemServicoVisualizacoesSalvas.tsx
│   │   │   │   └── OrdensToolbar.tsx
│   │   │   ├── projetos
│   │   │   │   ├── ProjetoAtivoModal.tsx
│   │   │   │   ├── ProjetoCard.tsx
│   │   │   │   ├── ProjetoDetalhesModal.tsx
│   │   │   │   ├── ProjetoFormModal.tsx
│   │   │   │   └── ProjetosBuscaAutocomplete.tsx
│   │   │   ├── CustomSelect.tsx
│   │   │   ├── NotificacoesSla.tsx
│   │   │   ├── PrivateRoutes.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── hooks
│   │   │   ├── useAnexosOrdem.ts
│   │   │   ├── useClientes.ts
│   │   │   ├── useFuncionarios.ts
│   │   │   ├── useOrdens.ts
│   │   │   └── useProjetos.ts
│   │   ├── images
│   │   │   ├── AZUL.CLARO_BRANCO.png
│   │   │   ├── AZUL.CLARO_BRANCO_SemNome.png
│   │   │   ├── PRETO_BRANCO.png
│   │   │   ├── SemNome_Branca.AzulClaro.png
│   │   │   ├── SemNome_Preta.AzulClaro.png
│   │   │   ├── claro.png
│   │   │   ├── dark.png
│   │   │   ├── logo_darkmode.png
│   │   │   └── logo_gestec.png
│   │   ├── layouts
│   │   │   └── MainLayout.tsx
│   │   ├── pages
│   │   │   ├── Clientes.tsx
│   │   │   ├── Departamentos.tsx
│   │   │   ├── Equipes.tsx
│   │   │   ├── Funcionarios.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Ordens.tsx
│   │   │   ├── Projetos.tsx
│   │   │   └── Relatorios.tsx
│   │   ├── services
│   │   │   ├── administracao.ts
│   │   │   ├── anexo.ts
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── cliente.ts
│   │   │   ├── departamento.ts
│   │   │   ├── funcionario.ts
│   │   │   ├── ordemServico.ts
│   │   │   └── projeto.ts
│   │   ├── styles
│   │   │   ├── autocomplete.css
│   │   │   ├── cards.css
│   │   │   ├── clientes.css
│   │   │   ├── darkmode.css
│   │   │   ├── dashboard.css
│   │   │   ├── details.css
│   │   │   ├── equipes.css
│   │   │   ├── filters.css
│   │   │   ├── forms.css
│   │   │   ├── funcionarios.css
│   │   │   ├── global.css
│   │   │   ├── importacaoCsv.css
│   │   │   ├── layout.css
│   │   │   ├── login.css
│   │   │   ├── modal-os.css
│   │   │   ├── ordens.css
│   │   │   ├── projetos.css
│   │   │   ├── sidebar.css
│   │   │   └── variaveis.css
│   │   ├── types
│   │   │   ├── api.ts
│   │   │   └── notificacao.ts
│   │   ├── utils
│   │   │   ├── clienteUtils.ts
│   │   │   ├── filtroPrazo.ts
│   │   │   ├── ordemServicoUtils.ts
│   │   │   └── prazoOrdem.ts
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── .gitignore
├── CONTRIBUTING.md
└── README.md              
```

---

## Como Executar, Usar e Testar o Projeto

> Este é um resumo rápido. O passo a passo completo está no [Manual de Instalação](./docs/instalacao.md).
>
> **O projeto utiliza PostgreSQL hospedado no Supabase.** Para executar a aplicação, os desenvolvedores não precisam instalar um servidor PostgreSQL local. O frontend conversa com a API Express; somente o backend acessa o banco. Nunca coloque credenciais do Supabase em variáveis `VITE_*`.

### 1. Clonar o repositório

```bash
git clone https://github.com/Team-GesTec/sistema-ordens-servico.git
cd sistema-ordens-servico
```

Depois, selecione a branch indicada para a task de acordo com o [Guia de Contribuição](./CONTRIBUTING.md). Não faça commits diretamente na `main`.

### 2. Configurar o backend e o Supabase

Crie o ambiente local a partir do exemplo. No PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

No macOS/Linux:

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` com as credenciais fornecidas pelo responsável pelo ambiente Supabase. Use **Connect → Session pooler → URI** e mantenha a URL privada. A configuração adotada pelo projeto usa essa URI em `DATABASE_URL` (API) e `DIRECT_URL` (Prisma CLI). O arquivo `.env` não deve ser commitado.

Instale as dependências e gere o Prisma Client:

```bash
cd backend
npm ci
npm run prisma:generate
npm run db:status
```

Se o banco compartilhado tiver migrations pendentes, confirme primeiro que `DIRECT_URL` aponta para o ambiente de desenvolvimento correto e, com autorização, aplique as migrations versionadas:

```bash
npx prisma migrate deploy
npm run db:status
```

Se o banco compartilhado tiver migrations pendentes, confirme primeiro que `DIRECT_URL` aponta para o ambiente de desenvolvimento correto e, com autorização, aplique as migrations versionadas:

```bash
npx prisma migrate deploy
npm run db:status
```

Com o banco configurado, gere o client do Prisma:

```bash
npx prisma generate
```

`migrate deploy` aplica o SQL das migrations já versionadas e pendentes; não faz reset automático, não gera migrations novas e não executa o seed. Revise migrations antes de aplicá-las, pois o SQL de uma migration pode conter alterações destrutivas. **Nunca use `prisma migrate reset` no banco Supabase compartilhado.** O seed deve ser executado uma única vez na preparação inicial do ambiente, por uma pessoa responsável, depois de configurar as variáveis `SEED_*`:

```bash
npm run db:seed
```

Se o banco compartilhado já estiver preparado, não é necessário executar o seed novamente.

Inicie a API:

```bash
npm run dev
```

Verifique a saúde da API em outro terminal:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

### 3. Configurar o frontend

Em um segundo terminal, crie `frontend/.env` a partir do exemplo.

PowerShell:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

macOS/Linux:

```bash
cp frontend/.env.example frontend/.env
```

O valor local padrão é `VITE_API_URL=http://localhost:3000`. Essa variável aponta para o **backend**, nunca para o PostgreSQL/Supabase.

```bash
cd frontend
npm ci
npm run dev
```

Abra `http://localhost:5173`. Use as credenciais de teste fornecidas de forma segura pelo responsável pelo ambiente; não há senha padrão documentada no repositório.

### 4. Testes automatizados

No diretório `backend/`:

```bash
npm test
npm run build
```

No diretório `frontend/`:

```bash
npm run lint
npm run build
```

Consulte o [Manual de Instalação](./docs/instalacao.md) para configuração detalhada, migrações e resolução de problemas.
---

## Contribuição

O fluxo de trabalho no GitHub, a estratégia de branches e o padrão de commits do GesTec estão documentados em [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Links para Pasta de Documentação

- [Checklist de DoR e DoD](./docs/checklist-dor-dod.md)
- [Estratégia de Branch e Padrão de Commits](./CONTRIBUTING.md)
- Manual do Usuário — *Em progresso*
- [Manual de Instalação](./docs/instalacao.md)
- [Padrões e Utilização React x TypeScript](./docs/Padroes-e-Utilizacao-ReactxTS.md)

---

## Equipe GesTec

| Nome Completo | Papel | Foto | Link para GitHub | Link para LinkedIn |
| --- | --- | --- | --- | --- |
| Samuel Estevão Pereira Martins | Product Owner | <img src="https://github.com/SamuelMartins00.png" width="50"> | [GitHub](https://github.com/SamuelMartins00) | [LinkedIn](https://www.linkedin.com/in/samuellmartinn/) |
| Cid Daniel Neves DOliveira | Scrum Master | <img src="https://github.com/C1dneve.png" width="50"> | [GitHub](https://github.com/C1dneve) | [LinkedIn](https://www.linkedin.com/in/cid-doliveira/) |
| Guilherme de Lima Leite | Desenvolvedor | <img src="https://github.com/Guilherme-Leite1701.png" width="50"> | [GitHub](https://github.com/Guilherme-Leite1701) | [LinkedIn](https://www.linkedin.com/in/guilherme-de-lima-leite-7043282ba/) |
| Marina Duque de Holanda Cavalcanti | Desenvolvedora | <img src="https://github.com/ninaduquehc.png" width="50"> | [GitHub](https://github.com/ninaduquehc) | [LinkedIn](https://www.linkedin.com/in/marina-cavalcanti-53b3503b8/) |
| Pamela Emily Iwabuchi Maciel | Desenvolvedora | <img src="https://github.com/pamelaiwabuchi.png" width="50"> | [GitHub](https://github.com/pamelaiwabuchi) | [LinkedIn](https://www.linkedin.com/in/pamela-iwabuchi/) |
| Pedro Pereira Rodrigues| Desenvolvedor | <img src="https://github.com/pedroprdgs.png" width="50"> | [GitHub](https://github.com/pedroprdgs) | [LinkedIn](https://linkedin.com/in/pedroprdgs) |
| Rafael Silva Mioni Coltro | Desenvolvedor | <img src="https://github.com/RafaelMioniC.png" width="50"> | [GitHub](https://github.com/RafaelMioniC) | [LinkedIn](https://www.linkedin.com/in/rafael-mioni-6173a043a/) |
| Vitor Assis Hasman Diniz | Desenvolvedor | <img src="https://github.com/VitorAssisHasmanDiniz.png" width="50"> | [GitHub](https://github.com/VitorAssisHasmanDiniz) | [LinkedIn](https://www.linkedin.com/in/vitor-diniz-8ba199358/) |