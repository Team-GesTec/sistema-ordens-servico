/**
 * controllers/controllerCliente.ts
 *
 * Controller de Cliente (US#1.1): recebe a requisição HTTP, chama o service e devolve a resposta.
 * Não contém regra de negócio nem acesso ao banco. Erros lançados pelo service seguem para o
 * middleware de erros (Express 5 captura erros de funções assíncronas automaticamente).
 *
 * ALTERAÇÃO (16/09/2026): a validação e o acesso ao Prisma/cache saíram daqui e foram para
 * `services/serviceCliente.ts` e `repositories/repositoryCliente.ts`. O controller agora só traduz
 * HTTP ⇄ service. Também ganhou o PATCH (atualização parcial).
 */
import type { Request, Response } from 'express';
import { serviceCliente } from '../services/serviceCliente';
import { lerId } from '../../utils/validacao';

export class ControllerCliente {
    /** GET /cliente — lista todos os clientes. */
    public async getAll(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceCliente.listar());
    }

    /** GET /cliente/:id — busca o cliente pelo id (404 se não existir). */
    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceCliente.buscarPorId(id));
    }

    /** POST /cliente — cadastra o cliente (201 com o registro criado). */
    public async criarCliente(req: Request, resp: Response): Promise<Response> {
        return resp.status(201).json(await serviceCliente.criar(req.body));
    }

    /** PUT /cliente/:id — substitui os dados do cliente (campos obrigatórios precisam vir). */
    public async updateCliente(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceCliente.atualizar(id, req.body, false));
    }

    /** PATCH /cliente/:id — altera só os campos enviados. */
    public async patchCliente(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceCliente.atualizar(id, req.body, true));
    }

    /**
     * DELETE /cliente/:id — exclui o cliente.
     * Responde 409 se o registro ainda estiver vinculado a outros dados.
     */
    public async deleteCliente(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        await serviceCliente.remover(id);
        return resp.status(200).json({ mensagem: 'Cliente excluído com sucesso' });
    }
}

/** Instância única usada pelas rotas. */
export const controller = new ControllerCliente();