/** Controller HTTP da AJ-02. Regras e persistência ficam no service/repository. */
import type { Request, Response } from 'express';
import { serviceProjeto } from '../services/serviceProjeto';
import { lerId } from '../utils/validacao';
import { usuarioAutenticado } from '../middlewares/authMiddleware';

export class ControllerProjeto {
    public async getAll(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceProjeto.listar());
    }

    public async getInativos(_req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceProjeto.listarInativos());
    }

    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const usuario = usuarioAutenticado(req);
        return resp.status(200).json(await serviceProjeto.buscarPorId(id, usuario.tipo));
    }

    public async criarProjeto(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        return resp.status(201).json(await serviceProjeto.criar(req.body, usuario.id));
    }

    public async updateProjeto(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const usuario = usuarioAutenticado(req);
        return resp.status(200).json(await serviceProjeto.atualizar(id, req.body, false, usuario.id));
    }

    public async patchProjeto(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const usuario = usuarioAutenticado(req);
        return resp.status(200).json(await serviceProjeto.atualizar(id, req.body, true, usuario.id));
    }

    public async alterarAtivo(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const usuario = usuarioAutenticado(req);
        return resp.status(200).json(await serviceProjeto.alterarAtivo(id, req.body?.ativo, usuario.id));
    }
}

export const controller = new ControllerProjeto();
