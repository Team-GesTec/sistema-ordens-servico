import type { Request, Response } from 'express';
import { lerId } from '../utils/validacao';
import { serviceRelatorio } from '../services/serviceRelatorio';

export class ControllerRelatorio {
    async ordemServico(req: Request, res: Response): Promise<Response> {
        const relatorio = await serviceRelatorio.gerarOrdemServico(lerId(req.params.id));
        return res.status(200).type('application/pdf').set('Content-Disposition', `attachment; filename="${relatorio.nome}"`).send(relatorio.pdf);
    }

}

export const controllerRelatorio = new ControllerRelatorio();
