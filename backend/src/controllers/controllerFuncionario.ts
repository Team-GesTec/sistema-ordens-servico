/**
 * controllers/controllerFuncionario.ts
 *
 * Controller de Funcionário (US#4.2): recebe a requisição HTTP, chama o service e devolve a resposta.
 * Não contém regra de negócio nem acesso ao banco. Erros lançados pelo service seguem para o
 * middleware de erros (Express 5 captura erros de funções assíncronas automaticamente).
 */
import type { Request, Response } from 'express';
import { usuarioAutenticado } from '../../middlewares/authMiddleware';
import { serviceFuncionario } from '../services/serviceFuncionario';
import { lerId } from '../../utils/validacao';

export class ControllerFuncionario {
    /** GET /funcionario — lista todos os funcionários. */
    public async getAll(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceFuncionario.listar());
    }

    /** GET /funcionario/:id — busca o funcionário pelo id (404 se não existir). */
    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceFuncionario.buscarPorId(id));
    }

    /** POST /funcionario — cadastra o funcionário (201 com o registro criado). */
    public async criarFuncionario(req: Request, resp: Response): Promise<Response> {
        return resp.status(201).json(await serviceFuncionario.criar(req.body));
    }

    /** PUT /funcionario/:id — substitui os dados do funcionário (campos obrigatórios precisam vir). */
    public async updateFuncionario(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceFuncionario.atualizar(id, req.body, false));
    }

    /** PATCH /funcionario/:id — altera só os campos enviados. */
    public async patchFuncionario(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceFuncionario.atualizar(id, req.body, true));
    }

    /**
     * DELETE /funcionario/:id — exclui o funcionário.
     * Um funcionário não pode excluir a si mesmo, e o último gestor não pode ser excluído.
     * Responde 409 se o registro ainda estiver vinculado a outros dados.
     */
    public async deleteFuncionario(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        await serviceFuncionario.remover(id, usuarioAutenticado(req).id);
        return resp.status(200).json({ mensagem: 'Funcionário excluído com sucesso' });
    }
}

/** Instância única usada pelas rotas. */
export const controller = new ControllerFuncionario();
