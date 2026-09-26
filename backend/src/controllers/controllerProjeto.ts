/**
 * controllers/controllerProjeto.ts
 *
 * Controller de Projeto (US#1.2): recebe a requisição HTTP, chama o service e devolve a resposta.
 * Não contém regra de negócio nem acesso ao banco. Erros lançados pelo service seguem para o
 * middleware de erros (Express 5 captura erros de funções assíncronas automaticamente).
 */
import type { Request, Response } from 'express';
import { serviceProjeto } from '../services/serviceProjeto';
import { lerId } from '../../utils/validacao';

export class ControllerProjeto {
    /** GET /projeto — lista todos os projetos. */
    public async getAll(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceProjeto.listar());
    }

    /** GET /projeto/:id — busca o projeto pelo id (404 se não existir). */
    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceProjeto.buscarPorId(id));
    }

    /** POST /projeto — cadastra o projeto (201 com o registro criado). */
    public async criarProjeto(req: Request, resp: Response): Promise<Response> {
        return resp.status(201).json(await serviceProjeto.criar(req.body));
    }

    /** PUT /projeto/:id — substitui os dados do projeto (campos obrigatórios precisam vir). */
    public async updateProjeto(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceProjeto.atualizar(id, req.body, false));
    }

    /** PATCH /projeto/:id — altera só os campos enviados. */
    public async patchProjeto(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceProjeto.atualizar(id, req.body, true));
    }

    /**
     * DELETE /projeto/:id — exclui o projeto.
     * Responde 409 se o registro ainda estiver vinculado a outros dados.
     */
    public async deleteProjeto(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        await serviceProjeto.remover(id);
        return resp.status(200).json({ mensagem: 'Projeto excluído com sucesso' });
    }
}

/** Instância única usada pelas rotas. */
export const controller = new ControllerProjeto();