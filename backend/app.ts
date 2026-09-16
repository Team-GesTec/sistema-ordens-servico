/**
 * app.ts
 *
 * Monta a aplicação Express: middlewares globais, rotas e tratamento de erros.
 * NÃO abre a porta — isso fica em `server.ts`. Separar os dois permite testar a aplicação
 * (ex.: com supertest) sem subir um servidor de verdade.
 *
 * ALTERAÇÕES (16/09/2026):
 *   - `app.listen` saiu daqui e foi para `server.ts`;
 *   - novas rotas `/auth` (login) e exigência de token (`autenticar`) em todas as rotas de dados;
 *   - CORS configurável por `CORS_ORIGIN`, limite de tamanho do JSON e rota `/health`;
 *   - handlers de 404 e de erro movidos para `middlewares/errorMiddleware.ts`.
 */
import express, { type Express, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';
import { env } from './config/env';
import { autenticar } from './middlewares/authMiddleware';
import { rotaNaoEncontrada, tratarErros } from './middlewares/errorMiddleware';
import routerAuth from './routes/routeAuth';
import routerCL from './routes/routeCliente';
import routerDP from './routes/routeDepartamento';
import routerFN from './routes/routeFuncionario';
import routerPR from './routes/routeProjeto';

/** Tamanho máximo aceito para o corpo JSON das requisições. */
const LIMITE_JSON = '100kb';

/**
 * Monta as opções de CORS a partir de `CORS_ORIGIN`.
 * "*" libera qualquer origem; caso contrário, aceita só as origens listadas (separadas por vírgula).
 */
function opcoesCors(): CorsOptions {
    if (env.corsOrigens === '*') {
        return {};
    }
    return { origin: env.corsOrigens.split(',').map((origem) => origem.trim()) };
}

/**
 * Cria e configura a aplicação Express.
 * @returns A aplicação pronta para receber `listen` (ver server.ts).
 */
export function criarApp(): Express {
    const app = express();

    app.disable('x-powered-by');
    app.use(cors(opcoesCors()));
    app.use(express.json({ limit: LIMITE_JSON }));

    // Verificação de saúde (pública) — útil para monitoramento/deploy.
    app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({ status: 'ok' });
    });

    // Autenticação: /auth/login é público; /auth/me exige token (tratado no próprio router).
    app.use('/auth', routerAuth);

    // Rotas de dados: todas exigem token válido.
    app.use('/cliente', autenticar, routerCL);
    app.use('/departamento', autenticar, routerDP);
    app.use('/funcionario', autenticar, routerFN);
    app.use('/projeto', autenticar, routerPR);

    // Precisam ser os últimos: 404 para rotas inexistentes e tratamento central de erros.
    app.use(rotaNaoEncontrada);
    app.use(tratarErros);

    return app;
}
