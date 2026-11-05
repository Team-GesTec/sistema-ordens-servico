# Instalação e execução do SGOS com Supabase + Prisma

Este guia prepara o SGOS em uma máquina de desenvolvimento usando o PostgreSQL hospedado no Supabase. **Não é necessário instalar PostgreSQL localmente para executar a aplicação.** O backend Express conecta ao banco via Prisma; o frontend conversa somente com a API.

## 1. Requisitos

- Git.
- Node.js 22 ou superior e npm.
- Acesso ao repositório SGOS.
- Acesso autorizado ao projeto Supabase de desenvolvimento, ou as instruções de conexão fornecidas pelo responsável pelo ambiente.

Não crie outro projeto Supabase por conta própria se a equipe já tiver um banco compartilhado. Confirme com o responsável qual ambiente usar.

## 2. Clonar o repositório

```bash
git clone https://github.com/Team-GesTec/sistema-ordens-servico.git
cd sistema-ordens-servico
```

Selecione a branch indicada para a task conforme o [Guia de Contribuição](../CONTRIBUTING.md). A `main` é protegida: não faça commits diretamente nela.

## 3. Obter a conexão do Supabase

No painel do Supabase, abra o projeto autorizado e selecione **Connect → Session pooler → URI**. A equipe utiliza o Session Pooler na porta `5432`, adequado quando a máquina conecta por IPv4. Copie a URI completa mostrada pelo painel.

A URI geralmente tem esta estrutura (os valores são ilustrativos; não copie este exemplo literalmente):

```text
postgresql://postgres.PROJECT_REF:SENHA_URL_ENCODED@HOST_DO_POOLER:5432/postgres
```

- `postgres.PROJECT_REF`: usuário exibido pelo Session Pooler.
- `SENHA_URL_ENCODED`: senha do banco PostgreSQL do Supabase, não a senha da conta usada para entrar no painel.
- `HOST_DO_POOLER`: host exato exibido pelo painel.
- `postgres`: banco de dados indicado pela conexão.

Se a senha tiver caracteres reservados de URL (por exemplo `@`, `:`, `/`, `#` ou `%`), eles precisam estar codificados na URI. Use os valores copiados do painel e não compartilhe a URL com terceiros.

## 4. Configurar `backend/.env`

Na raiz do repositório, copie o modelo.

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

macOS/Linux:

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` e substitua os placeholders. As variáveis de conexão são:

- `DATABASE_URL`: conexão que o backend Express usa para consultar o PostgreSQL.
- `DIRECT_URL`: conexão que o Prisma CLI utiliza para comandos de migration, conforme `prisma.config.ts`.

Na configuração atualmente adotada pelo SGOS, use a URI **Session Pooler** copiada do painel em ambas as variáveis. Não adicione `SHADOW_DATABASE_URL` se a configuração atual do `prisma.config.ts` do repositório não a utiliza.

Configure também:

- `JWT_SECRET`: segredo aleatório com no mínimo 32 caracteres. Gere-o com:

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

- `JWT_EXPIRES_IN=8h`: validade dos tokens JWT.
- `PORT=3000`: porta local da API.
- `CORS_ORIGIN=http://localhost:5173`: origem local do frontend. Se o Vite iniciar em outra porta, atualize esse valor para corresponder à origem exibida no terminal.
- `SEED_*`: variáveis usadas somente ao cadastrar os usuários iniciais pelo seed.

### Supabase Storage (anexos das O.S. — US#2.6)

Os arquivos anexados às O.S. ficam no Supabase Storage; o banco guarda só os metadados. Para usar as rotas de anexo:

1. No painel do Supabase, abra **Storage → New bucket**, crie o bucket `anexos-os` e deixe **Public bucket desmarcado** (o bucket precisa ser privado: o download sempre passa pela API, que confere a permissão).
2. Ainda no bucket, se quiser, defina o limite de tamanho do arquivo como `52428800` bytes (50MB). No plano gratuito, o limite global do projeto não passa de 50MB.
3. Preencha no `backend/.env`:
   - `SUPABASE_URL`: Project URL (ex.: `https://PROJECT_REF.supabase.co`);
   - `SUPABASE_SERVICE_ROLE_KEY`: chave secreta (service_role). Ela ignora as políticas de acesso do Supabase — use **somente no backend**, nunca no frontend nem em variáveis `VITE_*`;
   - `SUPABASE_BUCKET_ANEXOS`: nome do bucket (padrão `anexos-os`).
4. As regras provisórias do PE-12 também ficam no `.env`: `ANEXO_TIPOS_PERMITIDOS` (MIME types separados por vírgula, sem curingas) e `ANEXO_QUANTIDADE_MAXIMA`.

Sem as variáveis do Storage, a API sobe normalmente e só as rotas de anexo respondem `503`. Se houver um proxy na frente da API (ex.: Nginx), o limite de corpo dele precisa ser maior que 50MB (ex.: `client_max_body_size 51m;`).

**Segurança:** não faça commit de `backend/.env`; ele contém credenciais. O `.gitignore` deve continuar ignorando arquivos `.env`, com exceção dos modelos `.env.example`. Nunca coloque URLs PostgreSQL, senhas, `JWT_SECRET` ou credenciais do seed no frontend ou em variáveis `VITE_*`.

## 5. Instalar o backend e verificar o banco

No PowerShell:

```powershell
cd backend
npm ci
npm run prisma:generate
npm run db:status
```

`npm run db:status` consulta o histórico de migrations configurado em `DIRECT_URL`. Se houver um erro de autenticação (`P1000`), confira se copiou a senha do banco e o usuário do Session Pooler corretamente. Se ocorrer erro de conexão (`P1001`), confira host, porta, rede e URL.

### Aplicar migrations pendentes

Somente a pessoa responsável pelo banco compartilhado, ou alguém explicitamente autorizado, deve aplicar migrations. Antes de executar, confirme que `DIRECT_URL` aponta para o **ambiente de desenvolvimento correto**.

```powershell
npx prisma migrate deploy
npm run db:status
```

`prisma migrate deploy` aplica o SQL das migrations já versionadas que ainda estejam pendentes. Ele não executa um reset automático, não gera novas migrations, não executa o seed e não depende de um shadow database. Leia/revise o SQL antes de aplicar: uma migration pode conter operações de alteração ou remoção de dados/estruturas.

**Nunca execute `npx prisma migrate reset` no Supabase compartilhado.** Esse comando pode apagar dados. Evite também `prisma db push` como substituto de migrations em um projeto que mantém histórico versionado.

### Seed inicial

O seed cria os usuários iniciais e os departamentos necessários, usando as variáveis `SEED_*`. Deve ser executado de forma coordenada, normalmente uma vez durante a preparação inicial do ambiente:

```powershell
npm run db:seed
```

O seed é idempotente quanto à existência dos usuários, mas **não altera a senha ou os dados de um usuário que já existe**. Não execute o seed em um banco compartilhado sem combinar quais credenciais serão usadas. Se o banco de desenvolvimento já foi preparado pela equipe, não é necessário rodar novamente.

## 6. Observação importante sobre novas migrations e shadow database

A configuração adotada para executar e aplicar migrations existentes usa `prisma migrate deploy`, que não precisa de shadow database. Isso elimina a necessidade de configurar `SHADOW_DATABASE_URL` para esse fluxo.

Porém, isso **não elimina a exigência interna do Prisma para criar migrations com `prisma migrate dev`**: esse comando usa um shadow database para reconstruir o histórico e detectar divergências. Se a URL de shadow não estiver configurada, o Prisma poderá tentar criar um banco temporário automaticamente, o que pode não ser permitido pelo provedor hospedado.

Antes de alterar `schema.prisma` e gerar migrations novas, a equipe deve usar um fluxo de autoria isolado e aprovado. Não execute `migrate dev` contra o banco compartilhado de desenvolvimento/produção e não configure a URL principal como shadow. A configuração atual descrita neste guia cobre a aplicação das migrations que já estão versionadas; o fluxo de geração de novas migrations precisa respeitar esse requisito do Prisma.

Referências oficiais:

- [Prisma — `migrate deploy`](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)
- [Prisma — shadow database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database)
- [Supabase — Prisma](https://supabase.com/docs/guides/database/prisma)

## 7. Executar o backend

Ainda na pasta `backend/`:

```powershell
npm run dev
```

Mantenha esse terminal aberto. Em outro terminal, teste a saúde da API:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

A resposta esperada é `status: ok`.

## 8. Configurar e executar o frontend

Em outro terminal, a partir da raiz do repositório, copie o modelo:

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

Essa URL é do Express, **não do Supabase**. Depois, execute:

```powershell
cd frontend
npm ci
npm run dev
```

Abra `http://localhost:5173`. Mantenha os terminais do frontend e backend abertos durante o desenvolvimento.

## 9. Testes básicos

No diretório `backend/`:

```powershell
npm run build
npm test
```

Os cenários de anexo marcados com `@supabase-storage` enviam arquivos de verdade para o bucket configurado no `.env`. Sem o Storage configurado, rode os demais com:

```powershell
npx cucumber-js --tags "not @supabase-storage"
```

Os cenários `@arquivo-grande` enviam cerca de 50MB e são mais lentos; para pulá-los, use `--tags "not @arquivo-grande"`.

No diretório `frontend/`:

```powershell
npm run lint
npm run build
```

Faça login com as credenciais de desenvolvimento fornecidas de forma segura pelo responsável pelo ambiente. Não há credenciais padrão que devam ser copiadas do repositório.

## 10. Problemas comuns

| Sintoma | Causa provável | O que verificar |
|---|---|---|
| `P1000: Authentication failed` | Usuário ou senha do PostgreSQL incorretos | Copie de novo a URI Session Pooler; confirme a senha do banco (não a senha da conta Supabase); codifique caracteres reservados da URL. |
| `P1001: Can't reach database server` | Host/porta/rede incorretos ou conexão indisponível | Confirme host e porta no painel, conexão Session Pooler e acesso à rede. |
| `P1003: Database does not exist` | Nome do banco incorreto ou banco diferente do configurado | Confira o caminho final da URI; para a URI apresentada pelo painel, use o nome de banco nela indicado. |
| `Database schema is not up to date` | Há migrations versionadas pendentes | Verifique o ambiente apontado por `DIRECT_URL`; com autorização, use `npx prisma migrate deploy`. |
| `The table does not exist` | Migrations não foram aplicadas no banco usado pela API ou as URLs apontam para projetos diferentes | Compare o destino de `DATABASE_URL` e `DIRECT_URL`, execute `npm run db:status` e confira as tabelas no Supabase. |
| O login não consegue acessar a API | Backend parado ou `VITE_API_URL` incorreta | Confirme `http://localhost:3000/health` e `frontend/.env`; reinicie o Vite após alterar o `.env`. |
| Erro de CORS | `CORS_ORIGIN` não corresponde à origem do frontend | Ajuste `CORS_ORIGIN` no backend para a URL real mostrada pelo Vite e reinicie a API. |
| Seed diz que o usuário já existe | O seed não altera usuário preexistente | Use o login já provisionado. Para redefinir credenciais, utilize um procedimento administrativo aprovado; não apague o banco nem execute reset. |

## 11. Rotina ao começar a trabalhar

1. Confirme que está na branch da task correta.
2. Atualize o código e instale dependências com `npm ci` quando o lockfile mudar.
3. Confira `backend/.env` e `frontend/.env`; não os compartilhe nem faça commit deles.
4. Em um banco já preparado, normalmente basta iniciar backend e frontend. Se houver uma migration nova aprovada, combine sua aplicação com o responsável pelo banco.
5. Não use comandos de reset no Supabase compartilhado.
