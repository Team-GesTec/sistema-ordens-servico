/**
 * routes/routeAuditoria.ts
 *
 * Rotas dos logs de auditoria, montadas em /auditoria no app.ts (US#2.10).
 *
 * A auditoria é imutável: só existe leitura. Não crie rotas de PUT, PATCH ou DELETE aqui
 * (o banco também recusa UPDATE e DELETE na tabela — trigger `auditoria_imutavel`).
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE03: criado com GET / (somente gestor).
 */

import { Router, type Request, type Response } from 'express';
import { controllerAuditoria } from '../controllers/controllerAuditoria';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();

/** Somente gestores consultam a auditoria. */
const somenteGestor = autorizar('gestor');

// GET — ?busca=&tipo=&pagina=&limite= (o `autenticar` global já é aplicado no app.ts)
router.get('/', somenteGestor, (req: Request, res: Response) => controllerAuditoria.listarLogs(req, res));

export default router;
