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

    public async dispensar(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        if (!id) {
            const { AppError } = await import('../errors/AppError.js');
            throw AppError.requisicaoInvalida('ID da notificação é obrigatório.');
        }

        await serviceNotificacao.dispensarNotificacao(usuario.id, id);

        return resp.status(204).send();
    }
}

/** Instância única usada pelas rotas. */
export const controllerNotificacao = new ControllerNotificacao();