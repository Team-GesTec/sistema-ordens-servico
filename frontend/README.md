# SGOS — Frontend

Frontend do Sistema de Gestão de Ordens de Serviço, construído com React, TypeScript e Vite.

## Requisitos

- Node.js compatível com a versão usada pelo projeto (Node.js 22 ou superior recomendado).
- Backend SGOS em execução, normalmente em `http://localhost:3000`.

Não é necessário acessar o Supabase diretamente pelo navegador. O frontend chama a API Express e apenas o backend acessa o PostgreSQL. Nunca coloque senha de banco, `DATABASE_URL`, `DIRECT_URL` ou chaves administrativas em variáveis `VITE_*`, pois elas podem ser incluídas no bundle público.

## Configuração local

Na pasta `frontend/`, copie o arquivo de exemplo para `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

O valor padrão aponta para a API local:

```env
VITE_API_URL=http://localhost:3000
```

Se a API estiver em outro endereço, altere essa URL e ajuste `CORS_ORIGIN` no `backend/.env` para corresponder à origem real do frontend.

## Instalar e executar

```bash
npm ci
npm run dev
```

Abra `http://localhost:5173` no navegador. Mantenha o backend iniciado em outro terminal.

## Verificações

```bash
npm run lint
npm run build
```

Consulte o [Manual de Instalação do projeto](../docs/instalacao.md) para preparar o backend e conectar o ambiente de desenvolvimento ao Supabase.
