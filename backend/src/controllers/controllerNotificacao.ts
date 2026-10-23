/**
 * controllers/controllerNotificacao.ts
 *
 * Recebe a requisição, pega o usuário logado e chama o service.
 * Não possui regra de negócio.
 */

import type { Request, Response } from 'express';
import { serviceNotificacao } from '../services/serviceNotificacao';
import { usuarioAutenticado } from '../middlewares/authMiddleware';

export class ControllerNotificacao {
    /** GET /notificacoes — avisos do usuário logado, dos mais novos para os mais antigos. */
    public async listarMinhas(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const notificacoes = await serviceNotificacao.listarDoFuncionario(usuario.id);
        return resp.status(200).json(notificacoes);
    }
}

/** Instância única usada pelas rotas. */
export const controllerNotificacao = new ControllerNotificacao();