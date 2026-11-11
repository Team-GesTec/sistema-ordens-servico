/**
 * controllers/controllerAuditoria.ts
 *
 * Recebe a requisição e chama o service.
 * Não possui regra de negócio. Somente leitura: a auditoria é imutável (US#2.10).
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE03: criado com `listarLogs` (GET /auditoria).
 */

import type { Request, Response } from 'express';
import { serviceAuditoria } from '../services/serviceAuditoria';

export class ControllerAuditoria {
    /** GET /auditoria — logs de todas as O.S., com busca, filtro por tipo, paginação e indicadores. */
    public async listarLogs(req: Request, resp: Response): Promise<Response> {
        return resp.status(200).json(await serviceAuditoria.listarLogs(req.query));
    }
}

/** Instância única usada pelas rotas. */
export const controllerAuditoria = new ControllerAuditoria();
