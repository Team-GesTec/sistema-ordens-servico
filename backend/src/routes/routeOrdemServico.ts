/**
 * Rotas de O.S., montadas em /ordens-servico no app.ts
 * Gestor e técnico podem abrir O.S. conforme Ata de alinhamento de 16/09
 */

import { Router, type Request, type Response } from 'express';
import { controllerOrdemServico } from '../controllers/controllerOrdemServico';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();

/** Gestor e técnico podem criar uma O.S. */
const gestorOuTecnico = autorizar('gestor', 'tecnico');

// GET ALL — qualquer usuário autenticado (o `autenticar` global já é aplicado no app.ts)
router.get('/', (req: Request, res: Response) => controllerOrdemServico.listarTodas(req, res));

router.post('/', gestorOuTecnico, (req: Request, res: Response) => controllerOrdemServico.criar(req, res));

export default router;