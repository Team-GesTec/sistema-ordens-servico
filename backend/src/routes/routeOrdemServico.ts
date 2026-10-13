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

/** Somente gestores podem bloquear uma O.S. e modificá-la livremente. */
const somenteGestor = autorizar('gestor');

// GET ALL — qualquer usuário autenticado (o `autenticar` global já é aplicado no app.ts)
router.get('/', (req: Request, res: Response) => controllerOrdemServico.getAll(req, res));

// GET BY ID — qualquer usuário autenticado
router.get('/:id', (req: Request, res: Response) => controllerOrdemServico.getById(req, res));

// POST - gestor / técnico
router.post('/', gestorOuTecnico, (req: Request, res: Response) => controllerOrdemServico.criarOrdem(req, res));

// Regras de atribuição para gestores e técnicos são validadas no service.
router.patch('/atribuir/:id', gestorOuTecnico, (req: Request, res: Response) => controllerOrdemServico.atribuirResponsavel(req, res));

// Bloqueio - PATCH - gestor
router.patch('/bloquear/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.bloquearOrdem(req, res));

// Desbloqueio - PATCH - gestor
router.patch('/desbloquear/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.desbloquearOrdem(req, res));

// PATCH - gestor
router.patch('/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.patchOrdem(req, res))

//PUT - gestor
router.put('/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.updateOrdem(req, res))

//DELETE - gestor
router.delete('/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.deleteOrdem(req, res))

export default router;