/**
 * Recebe a requisicao, pega o usuário logado e chama o service.
 * Não possui regra de negócio
 */

import type { Request, Response } from 'express';
import { serviceOrdemServico } from '../services/serviceOrdemServico';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { lerId } from '../utils/validacao';

export class ControllerOrdemServico {
    /** GET /ordens-servico — lista todas as O.S. cadastradas. */
    public async getAll(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceOrdemServico.listar());
    }

    /** GET /ordens-servico/:id — busca o a O.S. pelo id (404 se não existir). */
        public async getById(req: Request, resp: Response): Promise<Response> {
            const id = lerId(req.params.id);
            return resp.status(200).json(await serviceOrdemServico.buscarPorId(id));
        }

    /** POST /ordens-servico — abre uma nova O.S. (201 com o registro criado). */
    public async criarOrdem(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);

        const novaOS = await serviceOrdemServico.criar(req.body, usuario.id);
        return resp.status(201).json(novaOS);
    }

    /** PATCH /ordens-servico/atribuir/:id — atribui um responsável a O.S. */
    public async atribuirResponsavel(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);

        const osId = lerId(req.params.id, 'id');
        //const funcionarioId = lerId(req.body["funcionario_id"]);
        return resp.status(200).json(await serviceOrdemServico.atribuirResponsavel(osId, req.body.funcionario_id, usuario.id));
    }

    /** PATCH /ordens-servico/bloquear/:id — bloqueia uma O.S. */
    public async bloquearOrdem(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.bloquear(id));
    }

    /** PATCH /ordens-servico/desbloquear/:id — desbloqueia uma O.S. */
    public async desbloquearOrdem(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.desbloquear(id));
    }

    /** PUT /ordens-servico/:id — substitui os dados da O.S. (campos obrigatórios precisam vir). */
    public async updateOrdem(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.atualizar(id, req.body, false));
    }

    /** PATCH /ordens-servico/:id — altera só os campos enviados. */
    public async patchOrdem(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.atualizar(id, req.body, true));
    }

    /** 
     * DELETE /ordens-servico/:id — exclui a O.S.
     * Responde 409 se o registro ainda estiver vinculado a outros dados.
     */
    public async deleteOrdem(req: Request, resp: Response): Promise<Response> {
        const id =  lerId(req.params.id);
        await serviceOrdemServico.remover(id);
        return resp.status(200).json({ mensagem: 'Ordem excluída com sucesso' });
    }
}

/** Instância única usada pelas rotas. */
export const controllerOrdemServico = new ControllerOrdemServico();