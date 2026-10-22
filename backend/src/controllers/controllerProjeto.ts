/** Controller HTTP da AJ-02. Regras e persistência ficam no service/repository. */
import type { Request, Response } from 'express';
import { serviceProjeto } from '../services/serviceProjeto';
import { lerId } from '../utils/validacao';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { serviceRelatorios } from '../services/serviceRelatorios';

export class ControllerProjeto {
    public async getAll(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceProjeto.listarParaUsuario(usuarioAutenticado(req)));
    }

    public async getInativos(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceProjeto.listarInativosParaUsuario(usuarioAutenticado(req)));
    }

    public async getById(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const usuario = usuarioAutenticado(req);
        return resp.status(200).json(await serviceProjeto.buscarPorId(id, usuario));
    }

    public async baixarRelatorioPDF(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const usuario = usuarioAutenticado(req);
        const pdf = await serviceRelatorios.relatorioProjetoPDF(id, usuario);
        resp.setHeader('Content-Type', 'application/pdf');
        resp.setHeader('Content-Disposition', `attachment; filename="projeto-${id}-relatorio.pdf"`);
        resp.setHeader('Cache-Control', 'no-store');
        return resp.status(200).send(pdf);
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

    public async inativar(req: Request, resp: Response): Promise<Response> {
        const id = lerId(req.params.id);
        const usuario = usuarioAutenticado(req);
        return resp.status(200).json(await serviceProjeto.inativar(id, usuario.id));
    }
}

export const controller = new ControllerProjeto();
