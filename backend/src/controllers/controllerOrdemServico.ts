/**
 * Recebe a requisicao, pega o usuário logado e chama o service.
 * Não possui regra de negócio
 */

import type { Request, Response } from 'express';
import { serviceOrdemServico } from '../services/serviceOrdemServico';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { lerId } from '../utils/validacao';
import { serviceRelatorios, type FiltrosExportacaoOS } from '../services/serviceRelatorios';

export class ControllerOrdemServico {
    /** GET /ordens-servico — lista as O.S. visíveis ao usuário autenticado. */
    public async getAll(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        return resp.status(200).json(await serviceOrdemServico.listarParaUsuario(usuario, req.query as Record<string, unknown>));
    }

    /** GET /ordens-servico/exportar.csv — exporta somente registros dentro do escopo autorizado. */
    public async exportarCSV(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const csv = await serviceRelatorios.exportarOrdensCSV(usuario, req.query as unknown as FiltrosExportacaoOS);
        const data = new Date().toISOString().slice(0, 10);
        resp.setHeader('Content-Type', 'text/csv; charset=utf-8');
        resp.setHeader('Content-Disposition', `attachment; filename="sgos-ordens-${data}.csv"`);
        resp.setHeader('Cache-Control', 'no-store');
        return resp.status(200).send(csv);
    }

    /** GET /ordens-servico/exportar.xlsx — XLSX nativo dos resultados filtrados e autorizados. */
    public async exportarXLSX(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const xlsx = await serviceRelatorios.exportarOrdensXLSX(usuario, req.query as unknown as FiltrosExportacaoOS);
        const data = new Date().toISOString().slice(0, 10);
        resp.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        resp.setHeader('Content-Disposition', `attachment; filename=\"sgos-ordens-${data}.xlsx\"`);
        resp.setHeader('Cache-Control', 'no-store');
        resp.setHeader('X-Content-Type-Options', 'nosniff');
        return resp.status(200).send(xlsx);
    }

    /** GET /ordens-servico/:id/historico — histórico auditado da O.S. dentro do escopo do usuário. */
    public async getHistorico(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.listarHistoricoParaUsuario(id, usuario));
    }

    /** GET /ordens-servico/:id/relatorio.pdf — relatório individual autorizado. */
    public async baixarRelatorioPDF(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);
        const pdf = await serviceRelatorios.relatorioIndividualOS(id, usuario);
        resp.setHeader('Content-Type', 'application/pdf');
        resp.setHeader('Content-Disposition', `attachment; filename="ordem-servico-${id}.pdf"`);
        resp.setHeader('Cache-Control', 'no-store');
        return resp.status(200).send(pdf);
    }

    /** GET /ordens-servico/inativas — histórico limitado ao escopo real do usuário. */
    public async getInativas(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceOrdemServico.listarInativas(usuarioAutenticado(req)));
    }

    /** PATCH /ordens-servico/:id/inativar — inativação permanente. */
    public async inativar(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.inativar(id, usuario));
    }

    /** GET /ordens-servico/:id — busca apenas O.S. dentro do escopo de acesso. */
    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const usuario = usuarioAutenticado(req);
        return resp.status(200).json(await serviceOrdemServico.buscarPorIdParaUsuario(id, usuario));
    }

    /**
     * POST /ordens-servico — abre uma nova O.S. (201 com o registro criado).
     * O perfil vai junto para o service validar o cadastro de O.S. antiga (AJ-06).
     */
    public async criarOrdem(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);

        const novaOS = await serviceOrdemServico.criar(req.body, usuario.id, usuario.tipo);
        return resp.status(201).json(novaOS);
    }

    /** PATCH /ordens-servico/:id/parecer-tecnico — persiste apenas o parecer do Técnico responsável. */
    public async salvarParecerTecnico(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.salvarParecerTecnico(id, req.body, usuario));
    }

    /** PATCH /ordens-servico/:id/status — altera o status e registra o parecer (200 com a O.S. atualizada). */
    public async alterarStatus(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = Number(req.params.id);
        const atualizada = await serviceOrdemServico.alterarStatus(id, req.body, usuario);
        return resp.status(200).json(atualizada);
    }

    /** PATCH /ordens-servico/atribuir/:id — atribui um responsável a O.S. */
    public async atribuirResponsavel(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);

        const osId = lerId(req.params.id, 'id');
        //const funcionarioId = lerId(req.body["funcionario_id"]);
        return resp.status(200).json(await serviceOrdemServico.atribuirResponsavel(osId, req.body.funcionario_id, usuario.id));
    }

    /** PATCH /ordens-servico/bloquear/:id — bloqueia uma O.S. */
    public async bloquearOrdem(
        req: Request,
        resp: Response,
    ): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);

        return resp.status(200).json(
            await serviceOrdemServico.bloquear(id, usuario),
        );
    }

    /** PUT /ordens-servico/:id — substitui os dados da O.S. (campos obrigatórios precisam vir). */
    public async updateOrdem(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.atualizar(id, req.body, false, usuario.id));
    }

    /** PATCH /ordens-servico/:id — altera só os campos enviados. */
    public async patchOrdem(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceOrdemServico.atualizar(id, req.body, true, usuario.id));
    }

}

/** Instância única usada pelas rotas. */
export const controllerOrdemServico = new ControllerOrdemServico();
