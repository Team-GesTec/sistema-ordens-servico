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

    /** GET /ordens-servico/inativas — consulta o histórico de OS inativas. */
    public async getInativas(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceOrdemServico.listarInativas());
    }

    /** PATCH /ordens-servico/:id/ativo — ativa ou inativa uma OS. */
    public async alterarAtivo(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);

        return resp.status(200).json(
            await serviceOrdemServico.alterarAtivo(id, req.body?.ativo, usuario.id),
        );
    }

    /** GET /ordens-servico/:id — busca a O.S. pelo id (404 se não existir). */
    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.buscarPorId(id));
    }

    /** POST /ordens-servico — abre uma nova O.S. */
    public async criarOrdem(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const novaOS = await serviceOrdemServico.criar(req.body, usuario.id, usuario.tipo);

        return resp.status(201).json(novaOS);
    }

    /** PATCH /ordens-servico/:id/status — altera o status e registra o parecer. */
    public async alterarStatus(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);

        return resp.status(200).json(
            await serviceOrdemServico.alterarStatus(id, req.body, usuario),
        );
    }

    /** PATCH /ordens-servico/atribuir/:id — atribui um responsável a O.S. */
    public async atribuirResponsavel(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id, 'id');

        return resp.status(200).json(
            await serviceOrdemServico.atribuirResponsavel(id, req.body.funcionario_id, usuario.id),
        );
    }

    /** PATCH /ordens-servico/:id/sla-manual — atribui o SLA manualmente. */
    public async alterarSlaManual(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);

        return resp.status(200).json(
            await serviceOrdemServico.alterarSlaManual(id, req.body, usuario.id),
        );
    }

    /** PATCH /ordens-servico/bloquear/:id — bloqueia uma O.S. */
    public async bloquearOrdem(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);

        return resp.status(200).json(
            await serviceOrdemServico.bloquear(id, usuario.id),
        );
    }

    /** PATCH /ordens-servico/desbloquear/:id — desbloqueia uma O.S. */
    public async desbloquearOrdem(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.desbloquear(id));
    }

    /** PUT /ordens-servico/:id — substitui os dados da O.S. */
    public async updateOrdem(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);

        return resp.status(200).json(
            await serviceOrdemServico.atualizar(id, req.body, false, usuario.id),
        );
    }

    /** PATCH /ordens-servico/:id — altera só os campos enviados. */
    public async patchOrdem(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);

        return resp.status(200).json(
            await serviceOrdemServico.atualizar(id, req.body, true, usuario.id),
        );
    }

    /** DELETE /ordens-servico/:id — exclui a O.S. */
    public async deleteOrdem(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        await serviceOrdemServico.remover(id);

        return resp.status(200).json({ mensagem: 'Ordem excluída com sucesso' });
    }
}

/** Instância única usada pelas rotas. */
export const controllerOrdemServico = new ControllerOrdemServico();
