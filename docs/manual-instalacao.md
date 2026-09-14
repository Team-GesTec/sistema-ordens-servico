# Manual de Instalação — GesTec

Guia para configurar o ambiente local de desenvolvimento do GesTec — Sistema de Gestão de Ordens de Serviço.

## Pré-requisitos

- [Node.js](https://nodejs.org/) instalado (versão LTS recomendada)
- [Git](https://git-scm.com/) instalado
- Conta no [Supabase](https://supabase.com/), com acesso solicitado à organização **"GesTec - Team"**
- Editor de código de sua preferência (ex.: VS Code)

> O banco PostgreSQL do projeto já existe na nuvem, dentro da organização "GesTec - Team" no Supabase (projeto `gestec-db`, plano Free, região East US/Ohio). Você não precisa instalar PostgreSQL localmente — só pedir acesso a essa organização e configurar a conexão, conforme o passo 3.

---

## 1. Clonar o repositório

```bash
git clone https://github.com/Team-GesTec/sistema-ordens-servico.git
cd sistema-ordens-servico
```

O projeto é um **monorepo**: Frontend, Backend e documentação vivem no mesmo repositório, cada um em sua pasta (`frontend/`, `backend/`, `docs/`).

---

## 2. Configurar o Backend

```bash
cd backend
npm install
```

### 2.1 Variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` recém-criado com a string de conexão do banco `gestec-db` no Supabase (peça a um integrante do time ou ao Scrum Master, caso ainda não tenha acesso à organização).

> ⚠️ **Nunca commite o arquivo `.env` com a string de conexão real.** Cada integrante configura o próprio `.env` localmente, a partir do `.env.example` versionado no repositório.

### 2.2 Rodar as migrations do Prisma

O acesso ao banco é feito via [Prisma](https://www.prisma.io/), a partir do arquivo `backend/prisma/schema.prisma`. Para criar/atualizar as tabelas no banco:

```bash
npx prisma migrate dev
```

> Sempre que o `schema.prisma` mudar, rode essa migration novamente antes de continuar o desenvolvimento — nenhuma alteração de tabela deve ser feita diretamente no banco.

### 2.3 Subir o servidor

```bash
npm run dev
```

---

## 3. Configurar o Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O Frontend é feito em **React (Vite) + TypeScript**, sem framework de estilização (CSS puro, sem Tailwind/Bootstrap).

---

## 4. Rodar os testes automatizados

```bash
# No diretório backend ou frontend
npm run test
```

---


## Próximos passos

Depois de rodar o projeto localmente, consulte:

- [CONTRIBUTING.md](../CONTRIBUTING.md) — fluxo de branches, padrão de commits e Pull Requests
- [Checklist de DoR e DoD](./checklist-dor-dod.md) — critérios antes de puxar e antes de concluir uma User Story