# Instalação e execução local do Sistema Gerenciador de Ordem de Serviço
Esse arquivo tem como propósito guiar na instalação e execução do SGOS localmente utilizando PostgreSQL.

## Requisitos
Instale as dependências externas `git, node, postgresql`.

### Git
Instale o `Git` para baixar o repositório. O comando pode variar dependendo do sistema operacional. Para usuários de Ubuntu, segue o comando

```bash
sudo apt update
sudo apt install git
```

### Node
Instale o `Node` para executar o frontend e o backend do projeto.

```bash
sudo apt update
sudo apt install nodejs npm
```

### PostgreSQL
Instale o `PostgreSQL` para criar e executar o banco local.

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

## Criando o banco local

Para criar o banco, execute os passos a seguir

- Acesse o PostgreSQL como superusuário
```bash
sudo -u postgres psql
```
No Windows, abra o psql (via SQL Shell) e conecte como postgres.

- Crie o usuário (role). É necessário o atributo `CREATEDB`, pois o Prisma precisa criar um banco temporário ("shadow database") ao rodar migrations.
```sql
CREATE USER meu_usuario WITH PASSWORD 'minha_senha' CREATEDB;
```

- Crie o banco de dados
```sql
CREATE DATABASE meu_banco OWNER meu_usuario;
```

- Dê permissões (se necessário)
```sql
GRANT ALL PRIVILEGES ON DATABASE meu_banco TO meu_usuario;
```

- Saia do psql (`\q`) e teste a conexão pelo terminal do sistema
```bash
psql "postgresql://meu_usuario:minha_senha@localhost:5432/meu_banco"
```
A porta 5432 é a padrão do Postgres. Se conectar e mostrar `meu_banco=>`, a URL está correta.

## Clonando o repositório

Para baixar o projeto, execute os comandos abaixo no terminal.

```bash
git clone -b feature/Transversal https://github.com/Team-GesTec/sistema-ordens-servico.git
cd sistema-ordens-servico/
```

## Configurando o .env do backend

Dentro da pasta `backend/`, defina as variáveis `DATABASE_URL` e `DIRECT_URL` com o mesmo link do Postgres usado no teste de conexão.

Crie também as variáveis `SEED_GESTOR_USUARIO` e `SEED_GESTOR_SENHA`. Esse será o login inicial para realizar o cadastro de tudo no SGOS.

Por exemplo:
```env
SEED_GESTOR_USUARIO=admin
SEED_GESTOR_SENHA=admin1234
```

É necessário definir a variável `JWT_SECRET`. Para gerar um valor aleatório, execute:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Defina também `CORS_ORIGIN`, apontando para a URL onde o frontend vai rodar (ver seção "Configurando o .env do frontend" abaixo):

```env
CORS_ORIGIN=http://localhost:5173
```

Exemplo completo de `backend/.env`:
```env
PORT=3000

DATABASE_URL="postgresql://meu_usuario:minha_senha@localhost:5432/meu_banco"
DIRECT_URL="postgresql://meu_usuario:minha_senha@localhost:5432/meu_banco"

JWT_SECRET=<valor gerado pelo comando acima>
JWT_EXPIRES_IN=8h

CORS_ORIGIN=http://localhost:5173

SEED_GESTOR_USUARIO=admin
SEED_GESTOR_SENHA=admin1234
```

## Configurando o .env do frontend

Dentro da pasta `frontend/`, crie o arquivo `.env` com a URL do backend:

```env
VITE_API_URL=http://localhost:3000
```

Sem essa variável, o frontend não consegue localizar a API e o login falha silenciosamente.

## Conferindo a porta do Vite

Verifique o arquivo `frontend/vite.config.ts`. A porta do frontend **não pode ser igual à porta do backend** (`3000`), senão o Vite sobe em outra porta automaticamente e quebra o CORS. Garanta que está configurada para `5173` (padrão do Vite, já usado no `VITE_API_URL`/`CORS_ORIGIN` acima):

```ts
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173
    }
});
```

## Configurando o banco de dados via Prisma

Entre na pasta `backend/` pelo terminal, instale as dependências e gere o client do Prisma:

```bash
cd backend/
npm i
npx prisma generate
```

Aplique as migrations no banco. O jeito recomendado é resetar e aplicar todas do zero, garantindo que nenhuma tabela fique faltando:

```bash
npx prisma migrate reset
```

Esse comando apaga o banco configurado no `.env`, recria do zero e roda **todas** as migrations em ordem. Ele pede confirmação — digite `y`.

> ⚠️ Se aparecer o erro `P3006`/`42710` (`type "nivel_criticidade" already exists`), significa que a migration `20260924_fix` tenta criar um tipo ENUM que a `20260914_init` já criou. Nesse caso, edite o arquivo `prisma/migrations/20260924_fix/migration.sql` e remova/comente a linha `CREATE TYPE nivel_criticidade AS ENUM (...)` antes de rodar o `migrate reset` novamente.

Execute a seed inicial (caso não rode automaticamente pelo `migrate reset`):
```bash
npm run db:seed
```

## Executando o projeto

Dentro da pasta do projeto, execute os comandos a seguir para rodar o SGOS.

### Executando o backend

```bash
cd backend/
npm i
npm run dev
```

Teste se subiu corretamente:
```bash
curl http://localhost:3000/health
```

### Executando o frontend

Abra outro terminal na raiz do projeto e execute os comandos a seguir.

```bash
cd frontend/
npm i
npm run dev
```

Acesse `http://localhost:5173` no navegador e faça login com o usuário/senha definidos em `SEED_GESTOR_USUARIO`/`SEED_GESTOR_SENHA`.

## Resolução de problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `psql: FATAL: password authentication failed` | Senha do usuário do Postgres incorreta | `ALTER USER meu_usuario WITH PASSWORD 'minha_senha';` |
| `permission denied to create database` (P3014) | Usuário sem permissão `CREATEDB` | `ALTER USER meu_usuario CREATEDB;` |
| `type "..." already exists` (P3006/42710) | ENUM duplicado entre migrations | Remover a criação duplicada na migration mais recente |
| `The table "..." does not exist` | Migrations marcadas como aplicadas sem nunca terem rodado de fato | Rodar `npx prisma migrate reset` |
| "Não foi possível conectar à API" no login, sem nada no Network | Falta `VITE_API_URL` no `frontend/.env`, ou processo não reiniciado após criar o `.env` | Criar/conferir `VITE_API_URL` e reiniciar `npm run dev` do frontend |
| "Não foi possível conectar à API" no login, com erro de CORS ou fetch falhando | Porta do frontend colidindo com a do backend, ou `CORS_ORIGIN` não bate com a porta real do frontend | Garantir que `vite.config.ts` usa porta `5173`, diferente da porta do backend, e que `CORS_ORIGIN` aponta para essa mesma URL |