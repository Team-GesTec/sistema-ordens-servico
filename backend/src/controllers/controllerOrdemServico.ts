/**
 * Recebe a requisicao, pega o usuário logado e chama o service.
 * Não possui regra de negócio
 */

import type { Request, Response } from 'express';
import { serviceOrdemServico } from '../services/serviceOrdemServico';
import { usuarioAutenticado } from '../../middlewares/authMiddleware';

export class ControllerOrdemServico {
    /** GET /ordens-servico — lista todas as O.S. cadastradas. */
    public async listarTodas(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceOrdemServico.listar());
    }

    /** POST /ordens-servico — abre uma nova O.S. (201 com o registro criado). */
    public async criar(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const novaOS = await serviceOrdemServico.criar(req.body, usuario.id);
        return resp.status(201).json(novaOS);
    }
}



export const controllerOrdemServico = new ControllerOrdemServico();