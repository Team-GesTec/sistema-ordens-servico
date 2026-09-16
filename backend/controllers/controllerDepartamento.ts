/**
 * controllers/controllerDepartamento.ts
 *
 * Controller de Departamento (US#4.2): recebe a requisição HTTP, chama o service e devolve a resposta.
 * Não contém regra de negócio nem acesso ao banco. Erros lançados pelo service seguem para o
 * middleware de erros (Express 5 captura erros de funções assíncronas automaticamente).
 *
 * ALTERAÇÃO (16/09/2026): o controller deixou de manipular o array em memória e de validar
 * campo a campo. Agora ele só traduz HTTP ⇄ service; as regras ficam em `services/serviceDepartamento.ts`
 * e o acesso ao banco (Prisma + cache) em `repositories/repositoryDepartamento.ts`. Ganhou o PATCH.
 */
import type { Request, Response } from 'express';
import { serviceDepartamento } from '../services/serviceDepartamento';
import { lerId } from '../utils/validacao';

export class ControllerDepartamento {
    /** GET /departamento — lista todos os departamentos. */
    public async getAll(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceDepartamento.listar());
    }

    /** GET /departamento/:id — busca o departamento pelo id (404 se não existir). */
    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceDepartamento.buscarPorId(id));
    }

    /** POST /departamento — cadastra o departamento (201 com o registro criado). */
    public async criarDepartamento(req: Request, resp: Response): Promise<Response> {
        return resp.status(201).json(await serviceDepartamento.criar(req.body));
    }

    /** PUT /departamento/:id — substitui os dados do departamento (campos obrigatórios precisam vir). */
    public async updateDepartamento(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceDepartamento.atualizar(id, req.body, false));
    }

    /** PATCH /departamento/:id — altera só os campos enviados. */
    public async patchDepartamento(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceDepartamento.atualizar(id, req.body, true));
    }

    /**
     * DELETE /departamento/:id — exclui o departamento.
     * Responde 409 se o registro ainda estiver vinculado a outros dados.
     */
    public async deleteDepartamento(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        await serviceDepartamento.remover(id);
        return resp.status(200).json({ mensagem: 'Departamento excluído com sucesso' });
    }
}

/** Instância única usada pelas rotas. */
export const controller = new ControllerDepartamento();
