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
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { lerId } from '../utils/validacao';

export class ControllerCliente {
    /** GET /cliente — lista todos os clientes. */
    public async getAll(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceCliente.listarParaUsuario(usuarioAutenticado(req)));
    }

    /** GET /cliente/inativos — histórico de clientes dentro do escopo autorizado. */
    public async getInativos(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceCliente.listarInativosParaUsuario(usuarioAutenticado(req)));
    }

    /** GET /cliente/:id — busca cliente ativo ou histórico dentro do escopo autorizado. */
    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        return resp.status(200).json(await serviceCliente.buscarPorIdVisivel(id, usuarioAutenticado(req)));
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
     * DELETE /cliente/:id — inativa logicamente o cliente.
     * Preserva os vínculos e o histórico dos projetos e O.S. existentes.
     */
    public async deleteCliente(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const cliente = await serviceCliente.inativar(id);

        return resp.status(200).json({
            mensagem: 'Cliente inativado com sucesso',
            cliente,
        });
    }


}

/** Instância única usada pelas rotas. */
export const controller = new ControllerCliente();