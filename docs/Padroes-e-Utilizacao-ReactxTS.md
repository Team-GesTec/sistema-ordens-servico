# Tutorial: TypeScript + Express + JWT + React

> Documentação criada para uso interno da equipe do projeto universitário.

---

## Sumário

1. [TypeScript com Express.js](#1-typescript-com-expressjs)
   - 1.1 [Como instalar](#11-como-instalar)
   - 1.2 [Primeiro contato](#12-primeiro-contato)
   - 1.3 [Estrutura: Route, Controller, Model e Middleware](#13-estrutura-route-controller-model-e-middleware)
2. [Token JWT para Autenticação](#2-token-jwt-para-autenticação)
   - 2.1 [O que é o JWT](#21-o-que-é-o-jwt)
   - 2.2 [Por que usar JWT](#22-por-que-usar-jwt)
   - 2.3 [Como implementar](#23-como-implementar)
   - 2.4 [JWT em uma API funcional](#24-jwt-em-uma-api-funcional)
3. [Integração com React + TypeScript](#3-integração-com-react--typescript)
   - 3.1 [Boas práticas de formatação (camelCase)](#31-boas-práticas-de-formatação-camelcase)
   - 3.2 [Como usar o Express com React](#32-como-usar-o-express-com-react)
   - 3.3 [Como gerenciar React com TypeScript](#33-como-gerenciar-react-com-typescript)

---

## 1. TypeScript com Express.js

### 1.1 Como instalar

Primeiro, crie a pasta do projeto e inicialize o `package.json`:

```bash
mkdir minha-api
cd minha-api
npm init -y
```

Instale o Express e as dependências de desenvolvimento do TypeScript:

```bash
npm install express
npm install -D typescript ts-node-dev @types/node @types/express
```

- `typescript` → o compilador TypeScript.
- `ts-node-dev` → executa o projeto TS diretamente, reiniciando o servidor a cada alteração (hot reload).
- `@types/node` e `@types/express` → tipagens para o Node.js e o Express.

Gere o arquivo de configuração do TypeScript:

```bash
npx tsc --init
```

Edite o `tsconfig.json` gerado com uma configuração básica recomendada:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Adicione os scripts no `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

Estrutura inicial de pastas sugerida:

```
minha-api/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   └── server.ts
├── package.json
└── tsconfig.json
```

### 1.2 Primeiro contato

Crie o arquivo `src/server.ts`:

```typescript
import express, { Request, Response } from "express";

const app = express();

app.use(express.json()); // permite receber JSON no corpo das requisições

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "API rodando com TypeScript!" });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
```

Rode o projeto:

```bash
npm run dev
```

Acesse `http://localhost:3000` no navegador ou via Postman/Insomnia e você deverá ver o JSON de resposta.

### 1.3 Estrutura: Route, Controller, Model e Middleware

Uma API organizada segue (de forma simplificada) o padrão **MVC** (Model-View-Controller), adaptado para APIs REST (sem "View", já que a resposta é JSON).

**Fluxo de uma requisição:**

```
Requisição → Route → Middleware → Controller → Model (banco de dados) → Resposta
```

#### Model

Representa a entidade de dados. Aqui usamos um exemplo simples em memória (sem banco de dados) para fins didáticos.

`src/models/UserModel.ts`:

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

// Simulação de "banco de dados" em memória
export const users: User[] = [];

export const UserModel = {
  findByEmail(email: string): User | undefined {
    return users.find((user) => user.email === email);
  },

  create(user: User): User {
    users.push(user);
    return user;
  },

  findAll(): User[] {
    return users;
  },
};
```

> Em um projeto real, o Model normalmente usa um ORM (como **Prisma**, **TypeORM** ou **Sequelize**) para conversar com o banco de dados.

#### Controller

Contém a lógica de negócio: recebe a requisição (já validada pelo middleware), interage com o Model e devolve a resposta.

`src/controllers/UserController.ts`:

```typescript
import { Request, Response } from "express";
import { UserModel } from "../models/UserModel";

export const UserController = {
  index(req: Request, res: Response) {
    const users = UserModel.findAll();
    return res.json(users);
  },

  create(req: Request, res: Response) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const userExists = UserModel.findByEmail(email);
    if (userExists) {
      return res.status(409).json({ error: "E-mail já cadastrado." });
    }

    const newUser = UserModel.create({
      id: Date.now(),
      name,
      email,
      password,
    });

    return res.status(201).json(newUser);
  },
};
```

#### Route

Define os endpoints (URLs) e conecta cada um ao respectivo Controller.

`src/routes/userRoutes.ts`:

```typescript
import { Router } from "express";
import { UserController } from "../controllers/UserController";

const userRoutes = Router();

userRoutes.get("/users", UserController.index);
userRoutes.post("/users", UserController.create);

export default userRoutes;
```

E no `src/server.ts`, registre as rotas:

```typescript
import express from "express";
import userRoutes from "./routes/userRoutes";

const app = express();
app.use(express.json());
app.use("/api", userRoutes);

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
```

#### Middleware

Funções que executam **antes** do Controller, usadas para validação, autenticação, logs, tratamento de erros, etc.

`src/middlewares/logMiddleware.ts`:

```typescript
import { Request, Response, NextFunction } from "express";

export function logMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // chama o próximo middleware ou o controller
}
```

Usando o middleware globalmente ou em uma rota específica:

```typescript
// Global (todas as rotas)
app.use(logMiddleware);

// Apenas em uma rota específica
userRoutes.get("/users", logMiddleware, UserController.index);
```

---

## 2. Token JWT para Autenticação

### 2.1 O que é o JWT

**JWT** (**JSON Web Token**) é um padrão aberto (RFC 7519) para transmitir informações de forma segura entre duas partes, como um token compacto e autocontido.

Um JWT é composto por três partes, separadas por pontos (`.`):

```
xxxxx.yyyyy.zzzzz
Header.Payload.Signature
```

- **Header**: contém o tipo do token e o algoritmo de assinatura (ex.: `HS256`).
- **Payload**: contém as "claims" (dados), como `id` do usuário, e-mail, data de expiração, etc. **Não deve conter dados sensíveis**, pois não é criptografado, apenas codificado em Base64.
- **Signature**: assinatura gerada a partir do Header + Payload + uma chave secreta (`SECRET`), garantindo que o token não foi alterado.

Exemplo de token decodificado:

```json
// Payload
{
  "id": 1,
  "email": "usuario@email.com",
  "iat": 1699999999,
  "exp": 1700003599
}
```

### 2.2 Por que usar JWT

- **Stateless (sem estado)**: o servidor não precisa guardar sessões em memória ou banco de dados; toda a informação necessária está no próprio token.
- **Escalável**: facilita a escalabilidade horizontal da API, já que qualquer instância do servidor consegue validar o token sem depender de uma sessão compartilhada.
- **Multiplataforma**: funciona bem com APIs consumidas por web, mobile e outros serviços.
- **Padrão de mercado**: amplamente utilizado e com boa documentação/suporte em praticamente todas as linguagens.

**Atenção**: JWT não é criptografia. Qualquer pessoa pode decodificar o payload (ex.: em [jwt.io](https://jwt.io)). Nunca coloque senhas ou dados sigilosos no payload. A segurança vem da **assinatura**, que impede alteração do conteúdo sem invalidar o token.

### 2.3 Como implementar

Instale as bibliotecas necessárias:

```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

- `jsonwebtoken` → gera e valida tokens JWT.
- `bcryptjs` → faz o hash (criptografia) de senhas antes de salvar no banco.

Crie um arquivo para centralizar a configuração do JWT:

`src/config/auth.ts`:

```typescript
export default {
  jwt: {
    secret: process.env.JWT_SECRET || "minha_chave_secreta_super_segura",
    expiresIn: "1d", // token expira em 1 dia
  },
};
```

> Em produção, sempre defina o `JWT_SECRET` em uma variável de ambiente (arquivo `.env`), nunca deixe a chave escrita direto no código.

### 2.4 JWT em uma API funcional

#### Passo 1: Cadastro de usuário com senha criptografada

`src/controllers/AuthController.ts`:

```typescript
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/UserModel";
import authConfig from "../config/auth";

export const AuthController = {
  async register(req: Request, res: Response) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const userExists = UserModel.findByEmail(email);
    if (userExists) {
      return res.status(409).json({ error: "E-mail já cadastrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = UserModel.create({
      id: Date.now(),
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email });
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user = UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      authConfig.jwt.secret,
      { expiresIn: authConfig.jwt.expiresIn }
    );

    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  },
};
```

#### Passo 2: Middleware de autenticação

Esse middleware protege rotas privadas, verificando se o token enviado é válido.

`src/middlewares/authMiddleware.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import authConfig from "../config/auth";

interface TokenPayload {
  id: number;
  email: string;
  iat: number;
  exp: number;
}

// Estendendo o tipo Request do Express para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  // Formato esperado: "Bearer <token>"
  const [, token] = authHeader.split(" ");

  try {
    const decoded = jwt.verify(token, authConfig.jwt.secret) as TokenPayload;
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}
```

#### Passo 3: Rotas de autenticação e rota protegida

`src/routes/authRoutes.ts`:

```typescript
import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const authRoutes = Router();

authRoutes.post("/register", AuthController.register);
authRoutes.post("/login", AuthController.login);

export default authRoutes;
```

Aplicando o middleware em uma rota protegida (ex.: `src/routes/userRoutes.ts`):

```typescript
import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authMiddleware } from "../middlewares/authMiddleware";

const userRoutes = Router();

// Rota protegida: só acessível com token válido
userRoutes.get("/users", authMiddleware, UserController.index);

export default userRoutes;
```

Registrando tudo no `src/server.ts`:

```typescript
import express from "express";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
```

#### Testando o fluxo completo

1. **Registro** → `POST /api/auth/register` com `{ name, email, password }`.
2. **Login** → `POST /api/auth/login` com `{ email, password }`, retorna o `token`.
3. **Acesso à rota protegida** → `GET /api/users` enviando o header:

```
Authorization: Bearer <token_recebido_no_login>
```

Se o token for válido, a rota retorna os dados. Caso contrário, retorna erro `401`.

---

## 3. Integração com React + TypeScript

### 3.1 Boas práticas de formatação (camelCase)

Ao integrar back-end (Express) e front-end (React), é importante manter uma convenção de nomenclatura consistente entre as equipes:

| Elemento | Convenção | Exemplo |
|---|---|---|
| Variáveis e funções | `camelCase` | `userName`, `fetchUserData()` |
| Componentes React | `PascalCase` | `UserProfile`, `LoginForm` |
| Interfaces/Types (TS) | `PascalCase`, prefixo opcional `I` | `User`, `IUserProps` |
| Arquivos de componentes | `PascalCase.tsx` | `LoginForm.tsx` |
| Arquivos utilitários/hooks | `camelCase.ts` | `useAuth.ts`, `apiClient.ts` |
| Constantes globais | `UPPER_SNAKE_CASE` | `API_BASE_URL` |
| Campos de JSON na API | `camelCase` | `{ "userId": 1, "userName": "João" }` |

**Regra geral**: como o back-end em TypeScript e o front-end em React/TypeScript compartilham a mesma linguagem, mantenha o **payload da API em `camelCase`** (em vez de `snake_case`, comum em outras stacks), assim os objetos podem ser tipados de forma idêntica dos dois lados, evitando conversões desnecessárias.

### 3.2 Como usar o Express com React

Existem duas formas comuns de organizar o projeto:

**Opção A — Projetos separados (recomendado)**

```
projeto/
├── backend/    (Express + TypeScript, roda na porta 3000)
└── frontend/   (React + TypeScript, roda na porta 5173 via Vite)
```

O React consome a API via HTTP (fetch/axios) e, durante o desenvolvimento, é necessário liberar o **CORS** no back-end:

```bash
npm install cors
npm install -D @types/cors
```

```typescript
import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: "http://localhost:5173" })); // libera o front local
app.use(express.json());
```

**Opção B — Servir o React pelo próprio Express (build único)**

Após gerar o build do React (`npm run build`), o Express pode servir os arquivos estáticos:

```typescript
import path from "path";

app.use(express.static(path.join(__dirname, "../../frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
});
```

> A Opção A é a mais usada em times, pois permite times de front e back trabalharem de forma independente.

### 3.3 Como gerenciar React com TypeScript

Criando o projeto React com TypeScript (usando Vite, mais rápido que Create React App):

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios
```

#### Tipando os dados vindos da API

`src/types/User.ts`:

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
```

#### Criando um cliente HTTP centralizado

`src/services/api.ts`:

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

// Interceptor: adiciona o token automaticamente em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

#### Criando um hook de autenticação

`src/hooks/useAuth.ts`:

```typescript
import { useState } from "react";
import api from "../services/api";
import { LoginResponse, User } from "../types/User";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const response = await api.post<LoginResponse>("/auth/login", { email, password });
      const { user, token } = response.data;

      localStorage.setItem("token", token);
      setUser(user);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return { user, login, logout, loading };
}
```

#### Componente de login tipado

`src/components/LoginForm.tsx`:

```tsx
import { useState, FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginForm() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const { login, loading } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login(email, password);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
```

#### Boas práticas gerais de gerenciamento React + TypeScript

- **Tipar sempre as props dos componentes**, usando `interface` ou `type`:

```tsx
interface UserCardProps {
  user: User;
  onSelect?: (id: number) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return <div onClick={() => onSelect?.(user.id)}>{user.name}</div>;
}
```

- **Centralizar tipos compartilhados** entre back-end e front-end em uma pasta `types/`, evitando duplicação.
- **Evitar `any`**: prefira `unknown` quando o tipo não for conhecido, e trate com validação/type guards.
- **Usar `enum` ou tipos literais** para valores fixos, como status ou papéis de usuário:

```typescript
type UserRole = "admin" | "member" | "guest";
```

- **Separar responsabilidades**: `services/` (chamadas de API), `hooks/` (lógica reutilizável), `components/` (UI), `types/` (tipagens), `pages/` (telas).

---

## Referências úteis

- [Documentação oficial do Express](https://expressjs.com/)
- [Documentação oficial do TypeScript](https://www.typescriptlang.org/docs/)
- [jwt.io — decodificador e documentação de JWT](https://jwt.io/)
- [Documentação do React](https://react.dev/)
- [Documentação do Vite](https://vitejs.dev/)

---

*Documento gerado para fins de estudo e compartilhamento interno da equipe do projeto.*
