# SGOS – Sistema de Gestão de Ordens de Serviço (ALTAVE)

## Parte I – Guia de Instalação

> **Público-alvo:** equipe de TI e desenvolvedores responsáveis pela instalação, configuração e manutenção do SGOS.
> 
> **Usuários finais:** consultem a [**Parte II – Guia de Uso**](#parte-ii--guia-de-uso).


> **Legenda dos marcadores**
> - `[COLOCAR DEPOIS]` – informação que ainda precisa ser validada com a equipe GesTec.
> - Valores em `MAIÚSCULAS` dentro de exemplos (ex.: `PROJECT_REF`, `SENHA_URL_ENCODED`) são ilustrativos e **não devem ser copiados literalmente**.

---

## Sumário da parte 1 

1. [Requisitos](#2-requisitos)
2. [Instalação](#3-instalação)
3. [Configuração](#4-configuração)
4. [Primeiro acesso](#5-primeiro-acesso)
5. [Manutenção](#6-manutenção)

> A numeração segue a estrutura geral do manual (seção 1 = Introdução, comum às duas partes).

---

## 2. Requisitos

### 2.1 Hardware e rede

| Item | Mínimo recomendado |
| ---- | ------------------ |
| Processador | 2 vCPUs |
| Memória RAM | 4 GB |
| Armazenamento | 5 GB - considerar crescimento dos anexos (fotos, laudos e documentos das O.S.) |
| Rede | Acesso à internet (instalação de dependências e conexão com o Supabase) |

> Os **anexos das O.S.** ficam no Supabase Storage, não no servidor da aplicação.

### 2.2 Software e acessos necessários

| Item | Finalidade | Versão |
| ---- | ---------- | ------ |
| **Git** | Clonar o repositório | Qualquer versão estável |
| **Node.js** | Executar backend (Express) e frontend (React/Vite) | Node.js 22 ou superior |
| **npm** | Gerenciador de pacotes (acompanha o Node.js) | Compatível com a versão do Node |
| **Acesso ao repositório SGOS** | Obter o código | – |
| **Acesso ao projeto Supabase de desenvolvimento** | Banco de dados e armazenamento de anexos | Autorizado pelo responsável pelo ambiente |

> **Não é necessário instalar PostgreSQL localmente.** O banco é um PostgreSQL 17 hospedado no Supabase; o backend conecta a ele via Prisma, e o frontend conversa **somente com a API**.

### 2.3 Tecnologias do sistema (referência)

| Camada | Tecnologia |
| ------ | ---------- |
| Frontend | React.js, TypeScript, CSS (Vite) |
| Backend | Node.js, TypeScript, Express.js |
| Banco de dados | PostgreSQL 17 (Supabase) |
| ORM e migrations | Prisma |
| Armazenamento de anexos | Supabase Storage |
| Documentação da API | Swagger (OpenAPI 3.0) |
| Autenticação | JSON Web Token (JWT) e bcrypt |

### 2.4 Verificando o ambiente

```bash
git --version
node --version
npm --version
```

Todos os comandos devem retornar um número de versão. O Node.js deve ser **22 ou superior**.

---

## 3. Instalação

### 3.1 Clonar o repositório

```bash
git clone https://github.com/Team-GesTec/sistema-ordens-servico.git
cd sistema-ordens-servico
```

Estrutura do projeto:

```
sistema-ordens-servico/
├── backend/     → API (controllers, models, repositories, routes, services)
├── frontend/    → Interface web (components, pages, services, styles, images)
├── docs/        → Documentação do projeto
└── README.md
```

### 3.2 Obter a conexão do Supabase

1. No painel do Supabase, abra o projeto autorizado.
2. Selecione **Connect → Session pooler → URI**.
3. Copie a URI completa exibida pelo painel.

A equipe utiliza o **Session Pooler na porta `5432`**, adequado quando a máquina conecta por IPv4.

Estrutura geral da URI (valores ilustrativos):

```text
postgresql://postgres.PROJECT_REF:SENHA_URL_ENCODED@HOST_DO_POOLER:5432/postgres
```

| Parte | Significado |
| ----- | ----------- |
| `postgres.PROJECT_REF` | Usuário exibido pelo Session Pooler |
| `SENHA_URL_ENCODED` | Senha do **banco PostgreSQL** do Supabase (não a senha da conta usada para entrar no painel) |
| `HOST_DO_POOLER` | Host exato exibido pelo painel |
| `postgres` | Nome do banco indicado pela conexão |

> Se a senha tiver caracteres reservados de URL (`@`, `:`, `/`, `#`, `%`), eles precisam estar **codificados** na URI. **Não compartilhe** a URL com terceiros.

### 3.3 Configurar e instalar o backend

**Passo 1 – Criar o arquivo de ambiente** (a partir da raiz do repositório)

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

macOS/Linux:

```bash
cp backend/.env.example backend/.env
```

**Passo 2 – Editar `backend/.env`**

Substitua os placeholders conforme a [seção 4](#4-configuração).

**Passo 3 – Instalar dependências, gerar o Prisma Client e verificar o banco**

```powershell
cd backend
npm ci
npm run prisma:generate
npm run db:status
```

`npm run db:status` consulta o histórico de migrations configurado em `DIRECT_URL`.

**Passo 4 – Aplicar migrations pendentes (somente se autorizado)**

> Dica: Somente o responsável pelo banco compartilhado, ou alguém explicitamente autorizado, deve aplicar migrations. Antes de executar, confirme que `DIRECT_URL` aponta para o **ambiente de desenvolvimento correto**.

```powershell
npx prisma migrate deploy
npm run db:status
```

`prisma migrate deploy` aplica as migrations já versionadas que estejam pendentes. Ele **não** faz reset automático, **não** gera novas migrations, **não** executa o seed e **não** depende de shadow database.

> ⚠️ **Nunca execute `npx prisma migrate reset` no Supabase compartilhado** (pode apagar dados). Evite também `prisma db push` como substituto de migrations.

**Passo 5 – Seed inicial (usuários e departamentos)**

```powershell
npm run db:seed
```

Veja os detalhes e cuidados na [seção 5.1](#51-seed-inicial).

**Passo 6 – Iniciar o backend**

```powershell
npm run dev
```

Mantenha este terminal aberto. Em outro terminal, teste a saúde da API:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Resposta esperada: `status: ok`.

### 3.4 Configurar e executar o frontend

Em outro terminal, a partir da raiz do repositório:

PowerShell:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

macOS/Linux:

```bash
cp frontend/.env.example frontend/.env
```

O valor padrão de `frontend/.env` deve ser:

```env
VITE_API_URL=http://localhost:3000
```

> Essa URL é a do **Express (backend)**, **não a do Supabase**.

Instale e execute:

```powershell
cd frontend
npm ci
npm run dev
```

Abra `http://localhost:5173`. Mantenha os terminais do frontend e do backend abertos durante o desenvolvimento.

### 3.5 Resumo dos comandos

| Etapa | Pasta | Comando |
| ----- | ----- | ------- |
| Clonar | – | `git clone https://github.com/Team-GesTec/sistema-ordens-servico.git` |
| Criar `.env` do backend | raiz | `Copy-Item backend/.env.example backend/.env` (PowerShell) ou `cp ...` |
| Instalar backend | `backend` | `npm ci` |
| Gerar Prisma Client | `backend` | `npm run prisma:generate` |
| Verificar migrations | `backend` | `npm run db:status` |
| Aplicar migrations *(autorizado)* | `backend` | `npx prisma migrate deploy` |
| Seed inicial *(coordenado)* | `backend` | `npm run db:seed` |
| Iniciar backend | `backend` | `npm run dev` |
| Criar `.env` do frontend | raiz | `Copy-Item frontend/.env.example frontend/.env` |
| Instalar frontend | `frontend` | `npm ci` |
| Iniciar frontend | `frontend` | `npm run dev` |

---

## 4. Configuração

### 4.1 Variáveis de ambiente do backend (`backend/.env`)

O arquivo é criado a partir de `backend/.env.example` e **nunca deve ser versionado nem compartilhado**.

| Variável | Função | Valor/orientação |
| -------- | ------ | ---------------- |
| `DATABASE_URL` | Conexão usada pelo backend Express para consultar o PostgreSQL | URI **Session Pooler** copiada do painel |
| `DIRECT_URL` | Conexão usada pelo Prisma CLI nos comandos de migration (conforme `prisma.config.ts`) | Mesma URI **Session Pooler** |
| `JWT_SECRET` | Segredo de assinatura dos tokens | Aleatório, **mínimo 32 caracteres** |
| `JWT_EXPIRES_IN` | Validade dos tokens JWT | `8h` |
| `PORT` | Porta local da API | `3000` |
| `CORS_ORIGIN` | Origem permitida do frontend | `http://localhost:5173` (ajuste se o Vite usar outra porta) |
| `SEED_*` | Dados dos usuários iniciais criados pelo seed | Usadas **somente** pelo seed |
| `SUPABASE_URL` | Project URL do Supabase (Storage) | Ex.: `https://PROJECT_REF.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta (service_role) do Supabase | **Somente no backend** |
| `SUPABASE_BUCKET_ANEXOS` | Nome do bucket de anexos | Padrão `anexos-os` |
| `ANEXO_TIPOS_PERMITIDOS` | MIME types permitidos, separados por vírgula, sem curingas | Regra provisória (PE-12) |
| `ANEXO_QUANTIDADE_MAXIMA` | Quantidade máxima de anexos | Regra provisória (PE-12) |

**Gerar o `JWT_SECRET`:**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Na configuração atual, use a URI Session Pooler em **ambas** as variáveis `DATABASE_URL` e `DIRECT_URL`. **Não adicione** `SHADOW_DATABASE_URL` se o `prisma.config.ts` do repositório não a utiliza.

### 4.2 Variável do frontend (`frontend/.env`)

| Variável | Função | Valor |
| -------- | ------ | ----- |
| `VITE_API_URL` | Endereço da API Express | `http://localhost:3000` |

Reinicie o Vite após alterar o `.env`.

### 4.3 Supabase Storage (anexos das O.S. – US#2.6)

Os arquivos anexados às O.S. ficam no Supabase Storage; o banco guarda apenas os **metadados**.

1. No painel do Supabase, abra **Storage → New bucket** e crie o bucket `anexos-os`, com **Public bucket desmarcado**. O bucket precisa ser **privado**: o download sempre passa pela API, que confere a permissão.
2. Opcionalmente, defina o limite de tamanho do arquivo no bucket como `52428800` bytes (**50 MB**). No plano gratuito, o limite global do projeto não passa de 50 MB.
3. Preencha no `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_BUCKET_ANEXOS`.
4. Ajuste `ANEXO_TIPOS_PERMITIDOS` e `ANEXO_QUANTIDADE_MAXIMA` conforme a política vigente.

**Comportamento sem configuração:** sem as variáveis do Storage, a API sobe normalmente e **somente as rotas de anexo** respondem `503`.

**Proxy reverso:** se houver um proxy na frente da API (ex.: Nginx), o limite de corpo dele precisa ser maior que 50 MB, por exemplo:

```nginx
client_max_body_size 51m;
```

### 4.4 Segurança

- **Nunca** coloque URLs PostgreSQL, senhas, `JWT_SECRET` ou credenciais do seed no frontend ou em variáveis `VITE_*`.
- A `SUPABASE_SERVICE_ROLE_KEY` **ignora as políticas de acesso do Supabase**: use somente no backend.
- O acesso usa e-mail e senha; as senhas são armazenadas com bcrypt e a sessão é controlada por JWT.
- Em produção, utilize HTTPS. 

---

## 5. Primeiro acesso

### 5.1 Seed inicial

O seed cria os **usuários iniciais** e os **departamentos** necessários, usando as variáveis `SEED_*`.

- Deve ser executado de forma **coordenada**, normalmente **uma vez**, na preparação inicial do ambiente.
- É idempotente quanto à existência dos usuários, mas **não altera a senha ou os dados de um usuário que já existe**.
- **Não execute** o seed em um banco compartilhado sem combinar quais credenciais serão usadas.
- Se o banco de desenvolvimento já foi preparado pela equipe, **não é necessário rodar novamente**.

### 5.2 Credenciais de acesso

**Não há credenciais padrão** no repositório. Faça login com as credenciais de desenvolvimento fornecidas **de forma segura** pelo responsável pelo ambiente.

### 5.3 Checklist de verificação da instalação

- [ ] `npm run db:status` executa sem erros
- [ ] O backend inicia e `http://localhost:3000/health` retorna `status: ok`
- [ ] O frontend abre em `http://localhost:5173`
- [ ] O login com as credenciais fornecidas funciona
- [ ] `npm run build` e `npm test` passam no backend
- [ ] `npm run lint` e `npm run build` passam no frontend
- [ ] Um anexo de teste é enviado com sucesso *(requer Storage configurado)*
- [ ] A documentação Swagger abre 

---

## 6. Manutenção

### 6.1 Rotina ao começar a trabalhar

1. Atualize o código e instale dependências com `npm ci` quando o lockfile mudar.
2. Confira `backend/.env` e `frontend/.env`; não os compartilhe.
3. Em um banco já preparado, normalmente basta iniciar backend e frontend. Se houver uma migration nova aprovada, combine sua aplicação com o responsável pelo banco.
4. **Não use comandos de reset** no Supabase compartilhado.

### 6.2 Testes automatizados

**Backend** (`backend/`):

```powershell
npm run build
npm test
```

Cenários de anexo marcados com `@supabase-storage` enviam arquivos **de verdade** para o bucket configurado. Sem o Storage configurado, execute os demais com:

```powershell
npx cucumber-js --tags "not @supabase-storage"
```

Os cenários `@arquivo-grande` enviam cerca de 50 MB e são mais lentos. Para pulá-los:

```powershell
npx cucumber-js --tags "not @arquivo-grande"
```

**Frontend** (`frontend/`):

```powershell
npm run lint
npm run build
```

### 6.3 Atualização do sistema

1. Obtenha o código atualizado correto.
2. Reinstale dependências:
   ```powershell
   cd backend
   npm ci
   npm run prisma:generate
   npm run db:status
   ```
3. Se houver migrations pendentes, solicite a aplicação ao responsável (`npx prisma migrate deploy`).
4. Atualize o frontend:
   ```powershell
   cd ../frontend
   npm ci
   ```
5. Reinicie as aplicações e refaça o checklist da [seção 5.3](#53-checklist-de-verificação-da-instalação).

### 6.4 Novas migrations e shadow database (para desenvolvedores)

`prisma migrate deploy` (aplicar migrations existentes) **não precisa** de shadow database. Já o `prisma migrate dev` (criar novas migrations) **usa** um shadow database para reconstruir o histórico e detectar divergências, e o provedor hospedado pode não permitir a criação automática de um banco temporário.

Portanto, antes de alterar `schema.prisma` e gerar migrations novas:

- Use um **fluxo de autoria isolado e aprovado** pela equipe.
- **Não execute `migrate dev`** contra o banco compartilhado.
- **Não configure a URL principal como shadow.**

Referências oficiais:
- [Prisma – `migrate deploy`](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)
- [Prisma – shadow database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database)
- [Supabase – Prisma](https://supabase.com/docs/guides/database/prisma)

### 6.5 Documentação da API (Swagger)

A API possui documentação interativa em Swagger (OpenAPI 3.0), voltada a desenvolvedores e avaliadores técnicos.

- Endereço: `http://localhost:3000/<caminho>` `[COLOCAR DEPOIS]`

### 6.6 Solução de problemas

| Sintoma | Causa provável | O que verificar |
| ------- | -------------- | --------------- |
| `P1000: Authentication failed` | Usuário ou senha do PostgreSQL incorretos | Copie de novo a URI Session Pooler; confirme a senha do **banco** (não a da conta Supabase); codifique caracteres reservados da URL |
| `P1001: Can't reach database server` | Host, porta ou rede incorretos, ou conexão indisponível | Confirme host e porta no painel, conexão Session Pooler e acesso à rede |
| `P1003: Database does not exist` | Nome do banco incorreto | Confira o caminho final da URI; use o nome de banco indicado pelo painel |
| `Database schema is not up to date` | Há migrations versionadas pendentes | Verifique o ambiente apontado por `DIRECT_URL`; com autorização, use `npx prisma migrate deploy` |
| `The table does not exist` | Migrations não aplicadas no banco usado pela API, ou as URLs apontam para projetos diferentes | Compare o destino de `DATABASE_URL` e `DIRECT_URL`, execute `npm run db:status` e confira as tabelas no Supabase |
| Login não acessa a API | Backend parado ou `VITE_API_URL` incorreta | Confirme `http://localhost:3000/health` e `frontend/.env`; reinicie o Vite após alterar o `.env` |
| Erro de CORS | `CORS_ORIGIN` não corresponde à origem do frontend | Ajuste `CORS_ORIGIN` para a URL real mostrada pelo Vite e reinicie a API |
| Seed diz que o usuário já existe | O seed não altera usuário preexistente | Use o login já provisionado. Para redefinir credenciais, use um procedimento administrativo aprovado; **não apague o banco nem execute reset** |
| Rotas de anexo retornam `503` | Variáveis do Supabase Storage ausentes ou incompletas | Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_BUCKET_ANEXOS` (seção 4.3) |
| Upload falha com arquivo grande | Limite do bucket, do projeto Supabase ou do proxy | Verifique o limite de 50 MB no bucket e, se houver Nginx, `client_max_body_size` |

---

## Parte II – Guia de Uso

> **Público-alvo:** usuários finais do SGOS (Gestor de Projetos, Analista de Suporte, Líder de Área e Responsável Técnico).
> 
> **Instalação e configuração:** consulte a [**Parte I – Guia de Instalação**](#parte-i--guia-de-instalação)

> **Legenda dos marcadores**
> - `[CONFIRMAR]` – informação a validar com a equipe GesTec contra o sistema em execução.

---

## Sumário da parte 2

1. [Primeiros passos](#7-primeiros-passos)
2. [Cadastros base](#8-cadastros-base)
3. [Gestão de projetos](#9-gestão-de-projetos)
4. [Ordens de Serviço](#10-ordens-de-serviço)
5. [Ciclo de vida da O.S.](#11-ciclo-de-vida-da-os)
6. [SLA e alertas](#12-sla-e-alertas)
7. [Notificações](#13-notificações)
8. [Dashboards e auditoria](#14-dashboards-e-auditoria)
9. [FAQ e suporte](#15-faq-e-suporte)

> A numeração segue a estrutura geral do manual (seção 1 = Introdução; seções 2 a 6 = Parte I).

---

## 7. Primeiros passos

### 7.1 Acesso e login

1. Abra o endereço do SGOS no navegador (fornecido pela TI). 
2. Informe seu **e-mail** e sua **senha**.
3. Clique em **Entrar**.

> COLOCAR PRINT DA TELA DE LOGIN

**Pontos importantes**
- As credenciais são fornecidas pelo responsável pelo sistema. **Não existe senha padrão**.
- A sessão tem validade limitada (por padrão, **8 horas**, configurável pela TI). Após esse prazo, faça login novamente.
- Não compartilhe sua senha.

### 7.2 Visão geral da interface

Após o login, você verá as áreas do sistema disponíveis **para o seu perfil**. Itens que você não tem permissão para usar não aparecem ou não funcionam.

| Área | Para que serve |
| ---- | -------------- |
| Painel (dashboard) | Visão geral de projetos e da sua fila de trabalho |
| Clientes | Cadastro de clientes e seus ativos/locais |
| Departamentos | Cadastro de departamentos e técnicos |
| Projetos | Abertura e acompanhamento de projetos |
| Ordens de Serviço | Abertura, consulta e atualização de O.S. |
| Notificações | Avisos sobre suas O.S. |

> MAIS PRINTS P/ AS ÁREAS 

### 7.3 Perfis e permissões
 
O SGOS é de **uso 100% interno**: não há acesso para clientes finais. O acesso é controlado por **três perfis** (**Gestor**, **Analista** e **Técnico**). Um Técnico pode ter a função de **Líder**, que lhe dá a permissão extra de atribuir os responsáveis de cada O.S.

#### 7.3.1 Perfis
 
| Perfil | Quem é | Foco no sistema |
| ------ | ------ | --------------- |
| **Gestor** | Gestão de projetos e da operação | Visão ampla: cadastros, projetos, prazos de SLA, bloqueios, histórico e dashboard da equipe |
| **Analista** | Analista de Suporte (equipe de atendimento) | Registrar as demandas que chegam por WhatsApp, e-mail ou telefone, abrindo as O.S. |
| **Técnico** | Responsável pela execução do serviço | Atender as O.S. da sua fila, atualizar status, registrar parecer e horas |
| **Líder técnico** | Técnico com função de líder | Tudo o que o Técnico faz, mais atribuir responsáveis, bloquear O.S. e alterar o SLA |
 
#### 7.3.2 Matriz de permissões
 
| Funcionalidade | Gestor | Analista | Técnico | Líder técnico |
| -------------- | :----: | :------: | :-----: | :-----------: |
| Login, logout, «Esqueci minha senha» e ver o perfil logado | ✔ | ✔ | ✔ | ✔ |
| Abrir O.S. | ✔ | ✔ | ✘ | ✔ |
| Ver O.S. | Todas | Todas | Da fila do seu departamento, atribuídas a si e criadas por si | Do seu departamento |
| Atribuir responsável | Qualquer colaborador | Atribui ao departamento | Somente a si (fila do seu setor) | ✔ |
| Alterar status e registrar parecer | ✔ | ✘ | ✔ (nas O.S. da sua fila) | ✔ |
| Bloquear O.S. | ✔ | ✘ | ✘ | ✔ |
| Alterar o SLA manualmente | ✔ | ✘ | ✘ | ✔ |
| Cadastrar e editar clientes e ativos | ✔ | ✘ | ✘ | ✘ |
| Criar projetos e desmembrar em O.S. | ✔ | ✘ | ✘ | ✘ |
| Cadastrar departamentos e colaboradores | ✔ | ✘ | ✘ | ✘ |
| Anexar arquivos e laudos | ✔ | ✔ | ✔ | ✔ |
| Registrar horas e consultar o total por projeto | ✔ | ✘ | ✔ (horas próprias) | ✔ |
| Consultar o histórico de alterações | Todas as O.S. | ✔ | Das O.S. que enxerga | ✔ |

#### 7.3.3 Como ler a matriz
 
- **Ver O.S.:** Gestor e Analista enxergam todas as O.S. O Técnico vê as O.S. da fila do seu departamento, as atribuídas a ele e as que ele criou. O Líder vê as do seu departamento.
- **Atribuir responsável:** o Gestor atribui a qualquer colaborador; o Analista atribui ao **departamento** (não a uma pessoa); o Técnico só pode atribuir a **si mesmo**, nas O.S. da fila do seu setor; o Líder atribui os responsáveis das O.S. do seu setor.
- **Alterar status e parecer:** o Técnico altera apenas as O.S. da sua fila; o Gestor pode alterar qualquer O.S. O parecer técnico é obrigatório para concluir uma O.S.
- **Bloquear e alterar SLA:** são ações restritas ao Gestor e ao Líder técnico. Toda alteração manual de SLA exige justificativa e fica registrada na auditoria.
- **Horas:** cada pessoa edita ou exclui somente o **próprio** apontamento. O Técnico consulta as suas horas; o Gestor, o total por projeto.
- **Dashboard:** o Técnico vê os seus números (O.S., status, vencimentos, horas e quantidade por projeto); o Gestor vê os seus e os da equipe e da operação como um todo.

> Se uma tela ou botão não aparecer para você, é porque o seu perfil não tem essa permissão. Fale com o Gestor.
---

## 8. Cadastros base

Os cadastros devem ser feitos **antes** de abrir projetos e O.S.

> **Ordem recomendada:** departamentos e equipe → clientes e ativos → projetos → O.S.

### 8.1 Clientes e seus ativos/locais *(Gestor)*

**Para que serve:** mapear a base de atendimento da ALTAVE.

Campos do cadastro:

| Campo | Descrição |
| ----- | --------- |
| Razão social | Nome empresarial do cliente |
| Ramo de atuação | Segmento em que o cliente atua |
| Ativos/locais operacionais | Embarcação, usina ou site onde o serviço é prestado |

**Como cadastrar**
1. Acesse **Clientes** e clique em **Novo cliente**.
2. Preencha razão social, ramo de atuação e categoria.
3. Adicione um ou mais **ativos/locais operacionais**, informando o tipo (embarcação, usina ou site) e a identificação.
4. Clique em **Salvar**.

> COLOCAR O PRINT DO CADASTRO DO CLI

### 8.2 Departamentos *(Gestor)*

Os departamentos estruturam a equipe e recebem as O.S. 
**Como cadastrar**
1. Acesse **Departamentos** e clique em **Novo departamento**.
2. Informe nome e descrição.
3. Salve e já estará registrado.

> COLOCAR O PRINT DO CADASTRO DO DEP

### 8.3 Técnicos e colaboradores *(Gestor)*

**Como cadastrar**
1. Acesse **Equipe** (ou **Usuários**) e clique em **Novo colaborador**.
2. Informe nome, e-mail e **perfil** (Gestor, Analista, Técnico).
3. Vincule o colaborador ao **departamento**.
4. Salve e entregue as credenciais de forma segura.

> COLOCAR O PRINT DO CADASTRO DO FUN

---

## 9. Gestão de projetos

Um **projeto** é o agrupador central das O.S. de uma implantação.

### 9.1 Abrir um projeto de implantação *(Gestor)*

1. Acesse **Projetos** e clique em **Novo projeto**.
2. Selecione o **cliente**.
3. Selecione os **departamentos envolvidos**.
4. Preencha os demais dados nome, descrição e data.
5. Clique em **Salvar**.

> COLOCAR O PRINT DO CADASTRO DO PROJ

### 9.2 Acompanhar o projeto

Cada projeto exibe **status** e **progresso percentual**, calculados a partir das suas O.S. Veja também o [painel consolidado](#141-painel-consolidado-de-projetos).

---

## 10. Ordens de Serviço

### 10.1 Abrir uma O.S. *(Analista)*

1. Acesse **Ordens de Serviço** e clique em **Nova O.S.**
2. Selecione o **cliente** e o **projeto**.
3. Escolha o **tipo**: **Instalação** ou **Manutenção**.
4. Escolha a **criticidade**.
5. Selecione o **departamento** que atenderá o chamado.
6. Descreva a solicitação.
7. Clique em **Salvar**.

> COLOCAR O PRINT DO CADASTRO DA O.S.

### 10.2 Vincular uma O.S. anterior (reincidência)

Se o problema já foi atendido antes e voltou, crie uma nova ordem de serviço atribuida a o.s. antiga. Isso mantém o histórico ligado e ajuda a direcionar o chamado ao setor correto.

### 10.3 Atribuir responsável técnico *(Líder de Área)*

1. Abra a O.S. do seu setor.
2. Clique em **Atribuir responsável**.
3. Selecione o técnico e confirme.

O técnico e os envolvidos recebem uma [notificação](#13-notificações) de nova atribuição.

### 10.4 Consultar minha fila *(Responsável Técnico)*

A **fila** lista as O.S. atribuídas a você. Para organizar o dia:

- Filtre por **status** (Em Andamento, Validação, etc.).
- Filtre por **prazo**.
- Abra uma O.S. para ver detalhes e atualizar o andamento.

> COLOCAR O PRINT DA TELA NORMAL DA O.S.

### 10.5 Anexar fotos, laudos e documentos

Use anexos para comprovar a execução do serviço ou detalhar o problema.

1. Abra a O.S.
2. Na seção **Anexos**, clique em **Adicionar arquivo** e selecione o arquivo.
3. Aguarde a confirmação do envio.

**Regras dos anexos**

| Regra | Valor |
| ----- | ----- |
| Tamanho máximo por arquivo | Até **50 MB** |

**Observações**
- Os arquivos são **privados**: o download só é permitido a quem tem acesso à O.S.
- Se o envio falhar, confira o tamanho e o tipo do arquivo. Se aparecer indisponibilidade do serviço de anexos, avise a TI.

> COLOCAR O PRINT DO ANEXO

---

## 11. Ciclo de vida da O.S.

### 11.1 Status e seus significados

| Status | Significado |
| ------ | ----------- |
| **Em Andamento** | Atendimento em execução |
| **Aguardando** | Serviço dependente (ex.: equipe ou material para a embarcação) |
| **Validação/Testes** | Serviço executado, em verificação |
| **Bloqueado** | Impedimento impede o avanço (registrar o motivo no parecer) |
| **Review** | Em revisão antes da conclusão |
| **Concluído** | Serviço finalizado e oficializado |

### 11.2 Alterar o status e registrar o parecer técnico *(Responsável Técnico)*

1. Abra a O.S.
2. Clique em **Alterar status** e selecione o novo status.
3. Escreva o **parecer técnico**, descrevendo o que foi feito ou o motivo do bloqueio.
4. Confirme.

O parecer **oficializa o andamento e a conclusão** do trabalho e fica registrado no [histórico](#143-histórico-de-alterações-da-os).

---

## 12. SLA e alertas

O **SLA** é o prazo contratual de atendimento de cada O.S.

### 12.1 Data limite automática

Para **demandas padrão**, o sistema calcula a data limite de SLA automaticamente. 

### 12.2 Ajuste manual de prazo *(Gestor)*

Quando houver paradas operacionais ou regras contratuais específicas, o Gestor pode **sobrepor** manualmente a data limite.

1. Abra a O.S.
2. Clique em **Editar prazo de SLA**.
3. Informe a nova data e, se solicitado, o motivo.
4. Salve.

### 12.3 Alertas visuais de risco *(Responsável Técnico)*

Quando uma O.S. atinge a **margem de risco de SLA**, o sistema a destaca visualmente para você priorizar os atendimentos críticos.

> COLOCAR O PRINT DAS NOTIF DE RISCO

---

## 13. Notificações

Você é avisado sobre o andamento das O.S. em que está envolvido.

### 13.1 Quando você é notificado

- **Mudança de status** da O.S.
- **Mudança de prioridade**
- **Nova atribuição** de responsável

### 13.2 Onde ver

| Canal | Como funciona |
| ----- | ------------- |
| **No sistema (in-app)** | Aviso na área de **Notificações** |
| **E-mail** | Mensagem enviada ao seu e-mail cadastrado |

> Mantenha seu e-mail cadastrado atualizado e verifique a caixa de spam.

---

## 14. Dashboards e auditoria

### 14.1 Painel consolidado de projetos *(Gestor)*

Exibe o **status** e o **progresso percentual** dos projetos, para acompanhar a operação **sem gerar relatórios manuais**.

> COLOCAR O PRINT DO DASHBOARD

### 14.2 Gráfico semanal da minha fila *(Responsável Técnico)*

Resume visualmente suas entregas da semana por situação: **Pendente**, **Em Andamento** e **Concluída**.

> COLOCAR O PRINT DO DASHBOARD

### 14.3 Histórico de alterações da O.S. *(Gestor)*

Mostra **quem** alterou, **o quê** foi alterado e **quando**, atendendo às exigências de rastreabilidade.

1. Abra a O.S.
2. Acesse a aba **Log**.
3. Consulte a lista cronológica de alterações.

---

## 15. FAQ e suporte

### 15.1 Dúvidas frequentes

| Pergunta | Resposta |
| -------- | -------- |
| Esqueci minha senha. O que faço? | Solicite a redefinição ao responsável pelo sistema. |
| Não vejo um menu ou botão. | Seu perfil pode não ter permissão para a ação (seção 7.3). |
| Por que não consigo anexar um arquivo? | Verifique o limite de 50 MB e o tipo de arquivo; se persistir, avise a TI. |
| Fui desconectado sozinho. | A sessão expira após o prazo configurado (padrão 8 horas). Entre novamente. |
| Não recebi o e-mail de notificação. | Confira o spam e o e-mail cadastrado; as notificações no sistema continuam disponíveis. |

### 15.2 Problemas comuns de uso

| Sintoma | O que fazer |
| ------- | ----------- |
| Login não funciona | Confira e-mail e senha; se persistir, contate o responsável pelo sistema |
| Tela não carrega dados | Atualize a página; se continuar, informe a TI |
| Erro ao salvar | Verifique campos obrigatórios e tente novamente; anote a mensagem exibida |

---

## Anexos

- **A. Fluxo ponta a ponta:** Cliente → Projeto → Desmembramento em O.S. → Atribuição → Execução e status → Parecer → Conclusão. 
- **B. Matriz de permissões por perfil:** ver [seção 7.3](#73-perfis-e-permissões).
- **C. Tabela de status e transições da O.S.:** ver [seção 11](#11-ciclo-de-vida-da-os).

---
