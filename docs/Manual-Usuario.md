# SGOS — Sistema de Gestão de Ordens de Serviço

**Manual completo do sistema**
Versão documental: 1.1 — novembro de 2026

Este documento reúne o guia de instalação e configuração e três manuais de uso independentes: Gestor, Técnico e Analista. As permissões descritas foram conferidas nas rotas, middlewares e services do backend. A autorização efetiva é sempre aplicada pela API; a interface não substitui essas verificações.

## Sumário geral

1. [Guia de instalação e configuração](#1-guia-de-instalação-e-configuração)
2. [Manual do Gestor](#2-manual-do-gestor)
3. [Manual do Técnico](#3-manual-do-técnico)
4. [Manual do Analista](#4-manual-do-analista)
5. [Informações importantes e solução de problemas](#5-informações-importantes-e-solução-de-problemas)
6. [Documentação e suporte](#6-documentação-e-suporte)

---

# 1. Guia de instalação e configuração

Este guia destina-se à equipe responsável por preparar um ambiente do SGOS. O sistema utiliza frontend React/Vite, backend Node.js/Express, Prisma e PostgreSQL hospedado no Supabase. O armazenamento de anexos utiliza Supabase Storage quando configurado.

## 1.1 Pré-requisitos

- Node.js 22 ou superior, conforme `backend/package.json`.
- npm compatível com a versão do Node.js instalada.
- Acesso ao repositório e ao ambiente PostgreSQL/Supabase.
- Credenciais de desenvolvimento fornecidas pelo responsável pelo ambiente.
- Git para obter e atualizar o código.

## 1.2 Obter o projeto

Clone o repositório autorizado e entre na pasta do projeto:

```bash
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_PROJETO>
```

A URL do repositório deve ser obtida com a equipe. Não utilize endereços fictícios.

## 1.3 Configurar o backend

Copie o modelo de ambiente:

```bash
# PowerShell
Copy-Item backend/.env.example backend/.env

# macOS/Linux
cp backend/.env.example backend/.env
```

Preencha `backend/.env` com os valores do ambiente:

| Variável | Finalidade |
|---|---|
| `PORT` | Porta HTTP da API; o modelo utiliza 3000. |
| `DATABASE_URL` | Conexão PostgreSQL utilizada pela API. |
| `DIRECT_URL` | Conexão utilizada pelo Prisma CLI. |
| `JWT_SECRET` | Segredo de assinatura JWT, com pelo menos 32 caracteres. |
| `JWT_EXPIRES_IN` | Validade do token, por exemplo `8h`. |
| `CORS_ORIGIN` | Origens permitidas pelo CORS, separadas por vírgula, ou `*` conforme política do ambiente. |
| `SUPABASE_URL` | URL do projeto Supabase, necessária para Storage. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta usada exclusivamente no backend. |
| `SUPABASE_BUCKET_ANEXOS` | Bucket privado de anexos; modelo `anexos-os`. |
| `ANEXO_TIPOS_PERMITIDOS` | MIME types permitidos, separados por vírgula. |
| `ANEXO_QUANTIDADE_MAXIMA` | Quantidade máxima de anexos por O.S. |
| `SMTP_*` | Configuração opcional de envio de e-mails. |
| `SEED_*` | Dados usados somente na preparação inicial pelo seed. |

Gere o segredo JWT localmente:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Nunca compartilhe ou versione `backend/.env`, senhas, chaves Supabase ou tokens. O modelo não contém credenciais reais.

## 1.4 Banco de dados e Supabase

No painel Supabase, obtenha as URIs de conexão PostgreSQL e configure `DATABASE_URL` e `DIRECT_URL` de acordo com a configuração adotada pelo projeto. O guia de instalação existente recomenda Session Pooler para o fluxo documentado.

Para anexos, crie o bucket `anexos-os` como **privado** e configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_BUCKET_ANEXOS`. Sem as variáveis de Storage, a API pode iniciar, mas as rotas de anexos respondem com indisponibilidade (503).

Instale dependências e gere o cliente Prisma:

```bash
cd backend
npm ci
npm run prisma:generate
npm run db:status
```

Aplique migrations pendentes somente com autorização do responsável pelo banco e após confirmar o ambiente:

```bash
npx prisma migrate deploy
```

O seed é destinado à preparação inicial coordenada do ambiente:

```bash
npm run db:seed
```

Não execute `prisma migrate reset` em banco compartilhado. Não use `prisma db push` como substituto do histórico versionado de migrations.

## 1.5 Executar a API

Na pasta `backend/`:

```bash
npm run dev
```

Verifique a saúde da API em `http://localhost:3000/health`. O endereço local é apenas referência de desenvolvimento.

## 1.6 Configurar e executar o frontend

Copie o modelo:

```bash
# PowerShell
Copy-Item frontend/.env.example frontend/.env

# macOS/Linux
cp frontend/.env.example frontend/.env
```

O modelo contém `VITE_API_URL=http://localhost:3000`. Essa variável aponta para a API Express, não para o Supabase.

Em outro terminal:

```bash
cd frontend
npm ci
npm run dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`.

## 1.7 URLs públicas da documentação

A interface Swagger fica em `/docs` e o JSON OpenAPI em `/docs/openapi.json`. Para ambientes publicados, configure no backend somente os endereços reais:

- `API_PUBLIC_URL`
- `API_HOMOLOGACAO_URL`
- `API_PRODUCAO_URL`

O frontend aceita `VITE_SWAGGER_URL` e `VITE_MANUAL_URL`. Sem configuração específica, usa `VITE_API_URL` para formar o link Swagger e `/manual/Manual-Usuario.pdf` para o PDF.

## 1.8 Primeiro acesso

O seed pode criar os usuários iniciais por meio das variáveis `SEED_*`. As credenciais devem ser fornecidas de forma segura pelo responsável pelo ambiente. O seed não redefine os dados de usuários que já existem.

---

# 2. Manual do Gestor

## 2.1 Acesso e visão geral

Entre pela tela de login com as credenciais provisionadas. Após autenticar, o sistema apresenta a navegação e os dados permitidos ao usuário. O Gestor possui as operações administrativas previstas nas rotas protegidas pelo perfil `gestor`.

## 2.2 Cadastros administrativos

O backend permite ao Gestor criar, atualizar e administrar clientes, departamentos, funcionários e projetos. As consultas de registros inativos variam por cadastro: funcionários, departamentos e projetos possuem rotas de consulta protegidas para o Gestor; a rota de clientes inativos exige autenticação, sem middleware exclusivo de Gestor. As operações de ativação/inativação são utilizadas em vez de presumir exclusão física para todos os cadastros.

Procedimento geral:

1. Abra a área correspondente no menu.
2. Consulte os registros disponíveis.
3. Utilize a ação de cadastro ou edição apresentada pela tela.
4. Preencha os campos solicitados e salve.
5. Em caso de alteração de estado, confirme a ação apresentada pelo sistema.

Os campos obrigatórios e suas validações são os exibidos nos formulários e aplicados pela API.

## 2.3 Ordens de serviço

O Gestor pode consultar ordens de serviço, abrir novas O.S., consultar histórico, consultar registros inativos e arquivados, atribuir responsáveis, alterar dados, gerenciar estado e realizar operações administrativas de SLA.

- **Abertura:** a criação também é permitida aos perfis Técnico e Analista.
- **Atribuição:** rota permitida ao Gestor e Técnico; regras adicionais são validadas pelo service.
- **Status:** o Gestor pode alterar o status conforme as regras do serviço.
- **SLA manual:** operação exclusiva do Gestor.
- **Bloqueio/desbloqueio:** operações exclusivas do Gestor.
- **Histórico:** consulta exclusiva do Gestor.
- **Arquivadas:** consulta permitida ao Gestor e Técnico.

Não altere dados fora do fluxo da tela. O backend valida os vínculos e as regras de negócio.

## 2.4 Anexos

O Gestor pode enviar, listar e baixar anexos das O.S. às quais tem acesso. O upload utiliza `multipart/form-data`, campo obrigatório `arquivo` e campo opcional `relato`. É aceito um arquivo por requisição, com limite de 50 MB. Os MIME types e a quantidade máxima são configuráveis no backend. Não existe rota de exclusão de anexo nesta implementação.

## 2.5 Notificações

O sistema disponibiliza listagem das notificações do usuário autenticado, contagem de não lidas e ações para marcar uma ou todas como lidas.

## 2.6 Relatórios e auditoria

Gestor e Analista podem acessar os endpoints de relatório PDF de O.S. e de cliente. A consulta aos logs de auditoria é exclusiva do Gestor. A auditoria é de leitura e não oferece operações de edição ou exclusão.

---

# 3. Manual do Técnico

## 3.1 Acesso e escopo

O Técnico entra com suas credenciais e consulta os registros permitidos ao seu usuário. As rotas de leitura de clientes, departamentos, funcionários, projetos e ordens de serviço exigem autenticação; a disponibilidade de cada registro também respeita as regras de escopo implementadas nos services.

## 3.2 Ordens de serviço

O Técnico pode consultar ordens de serviço, abrir uma O.S., consultar as arquivadas e executar atribuição conforme as regras do service. A alteração de status é permitida para ordens atribuídas ao próprio Técnico; o backend verifica essa condição. Não possui as operações administrativas exclusivas do Gestor, como alteração manual de SLA, bloqueio, desbloqueio, edição geral e consulta do histórico de auditoria da O.S.

Fluxo recomendado:

1. Acesse a lista de ordens de serviço.
2. Abra a ordem para consultar seus dados e situação.
3. Execute somente as ações habilitadas para seu perfil e para aquela O.S.
4. Ao atualizar o status, preencha as informações solicitadas pela tela.
5. Confirme o resultado e consulte novamente a ordem.

## 3.3 Registro de horas

A API disponibiliza operações para registrar e consultar lançamentos de horas. Embora a rota exija autenticação, o service valida se o usuário é o responsável pela O.S. antes de aceitar o registro. Portanto, estar autenticado não garante permissão para lançar horas em qualquer ordem.

## 3.4 Anexos

Gestor e Técnico podem enviar, listar e baixar anexos das ordens às quais possuem acesso. O formulário envia um arquivo no campo `arquivo`, com `relato` opcional. O limite por arquivo é 50 MB. Os tipos aceitos dependem de `ANEXO_TIPOS_PERMITIDOS`; no modelo são PNG, JPEG, WEBP e PDF. A configuração efetiva deve ser consultada na API.

## 3.5 Notificações

O Técnico pode consultar suas próprias notificações, visualizar a contagem de não lidas e marcá-las como lidas. As notificações são vinculadas ao usuário autenticado.

---

# 4. Manual do Analista

## 4.1 Acesso e escopo

O Analista autentica-se pela tela de login. As operações do backend reconhecem o perfil `analista`; não há um perfil adicional de liderança ou autorização intermediária.

## 4.2 Ordens de serviço

O Analista pode consultar ordens de serviço e abrir novas O.S. A rota de criação permite explicitamente Gestor, Técnico e Analista. As operações de alteração geral, atribuição, bloqueio e alteração manual de SLA não são concedidas ao Analista pelas rotas correspondentes.

O Analista deve utilizar a consulta e os dados disponibilizados para acompanhar as demandas. A visibilidade dos registros respeita o escopo implementado no backend.

## 4.3 Relatórios PDF

O Analista pode acessar os endpoints de relatório PDF de uma O.S. e de um cliente. O navegador ou cliente HTTP recebe um conteúdo `application/pdf` para visualização ou download. Registros inexistentes e falhas de autorização são tratados pela API.

## 4.4 Notificações

O Analista possui acesso às operações de notificações do usuário autenticado: listar, consultar, contar não lidas e marcar como lidas.

## 4.5 Limites de autorização

O Analista não possui acesso à rota de auditoria, que é exclusiva do Gestor. Também não possui permissão de escrita administrativa nos cadastros nem as operações de alteração de O.S. reservadas ao Gestor ou Técnico.

---

# 5. Informações importantes e solução de problemas

## 5.1 Segurança

- A documentação Swagger e seu JSON são públicos; as operações de negócio permanecem protegidas.
- Rotas protegidas exigem token JWT válido.
- O botão **Authorize** do Swagger recebe o token retornado pelo login. Informe somente o valor do token.
- Não compartilhe tokens, senhas, chaves de serviço ou arquivos `.env`.
- A interface pode ocultar ações, mas a decisão de autorização é feita pelo backend.

## 5.2 Problemas comuns

| Sintoma | Verificação recomendada |
|---|---|
| Login não conecta | Confirme se a API está ativa, se `VITE_API_URL` aponta para ela e se o banco está acessível. |
| Erro de CORS | Confira `CORS_ORIGIN` com a origem real do frontend e reinicie a API. |
| Erro PostgreSQL P1000 | Revise usuário, senha e codificação de caracteres da URI. |
| Erro PostgreSQL P1001 | Confira host, porta, rede e disponibilidade do banco. |
| Migrations pendentes | Confirme o ambiente e, com autorização, execute `npx prisma migrate deploy`. |
| Upload responde 503 | Verifique `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e o bucket privado. |
| Upload responde 413 | O arquivo excedeu 50 MB ou o limite configurado no caminho de rede. |
| Resposta 401 | Entre novamente e utilize um JWT válido. |
| Resposta 403 | A operação não está autorizada para o perfil/registro atual; solicite orientação ao Gestor. |
| Swagger não lista servidor público | Configure uma das variáveis `API_*_URL` com o endereço real do ambiente. |

## 5.3 Verificações técnicas

Na pasta `backend/`, os comandos disponíveis incluem:

```bash
npm run build
npm test
npm run lint:openapi
npm run test:openapi
npm run check:docs
```

Na pasta `frontend/`:

```bash
npm run lint
npm run build
```

Os testes que dependem de Supabase Storage precisam de um ambiente com as credenciais e o bucket configurados.

---

# 6. Documentação e suporte

- **Swagger UI:** `/docs`
- **Especificação OpenAPI JSON:** `/docs/openapi.json`
- **Verificação de saúde:** `/health`
- **Guia de instalação detalhado:** `docs/instalacao.md`

Em caso de dúvida sobre acesso ou dados, procure o responsável pelo ambiente SGOS. Para falhas técnicas, informe o horário, a tela/endpoint utilizado, o perfil autenticado e a mensagem de erro, sem enviar senhas ou tokens.

---

*Fim do manual completo do SGOS.*
