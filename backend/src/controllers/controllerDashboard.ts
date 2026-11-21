import type { Request, Response } from 'express';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { serviceDashboard } from '../services/serviceDashboard';

export class ControllerDashboard {
    async horas(req: Request, res: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        return res.status(200).json(await serviceDashboard.listarHoras(usuario));
    }
}

export const controllerDashboard = new ControllerDashboard();
