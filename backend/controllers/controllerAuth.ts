/**
 * controllers/controllerAuth.ts
 *
 * Controller de autenticação (US#4.1). Não contém regra: delega ao `serviceAuth`.
 */
import type { Request, Response } from 'express';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { serviceAuth } from '../services/serviceAuth';

export class ControllerAuth {
    /**
     * POST /auth/login — recebe `{ usuario, senha }` e devolve `{ token, tipo_token, expira_em, funcionario }`.
     * Responde 401 com a mesma mensagem para usuário inexistente ou senha errada.
     */
    public async login(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceAuth.login(req.body));
    }

    /**
     * GET /auth/me — devolve o funcionário dono do token (útil para o frontend restaurar a sessão).
     * Precisa passar antes pelo middleware `autenticar`.
     */
    public async me(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(usuarioAutenticado(req));
    }
}

/** Instância única usada pelas rotas. */
export const controller = new ControllerAuth();
