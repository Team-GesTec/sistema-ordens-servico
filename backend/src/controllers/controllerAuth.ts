import type { Request, Response } from 'express';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { ServiceAuth, serviceAuth } from '../services/serviceAuth';

export class ControllerAuth {
    constructor(private readonly auth: ServiceAuth = serviceAuth) {}

    public async login(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await this.auth.login(req.body));
    }

    public async me(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(usuarioAutenticado(req));
    }
}

export const controller = new ControllerAuth();