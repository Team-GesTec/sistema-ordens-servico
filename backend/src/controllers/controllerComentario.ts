import type { Request, Response } from 'express';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { lerId } from '../utils/validacao';
import { serviceComentario } from '../services/serviceComentario';

export class ControllerComentario {
    async listar(req: Request, res: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const osId = lerId(req.params.id);
        return res.status(200).json(await serviceComentario.listar(osId, usuario));
    }

    async criar(req: Request, res: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const osId = lerId(req.params.id);
        return res.status(201).json(await serviceComentario.criar(osId, req.body, usuario));
    }
}

export const controllerComentario = new ControllerComentario();
