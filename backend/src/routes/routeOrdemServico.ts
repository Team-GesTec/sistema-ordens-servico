/**
 * Rotas de O.S., montadas em /ordens-servico no app.ts
 * Gestor, técnico e analista abrem O.S.; atribuição e demais escritas exigem perfil específico.
 */

import { Router, type Request, type Response } from 'express';
import { controllerOrdemServico } from '../controllers/controllerOrdemServico';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();

/** Gestor, técnico e analista podem criar uma O.S. */
const podeCriarOrdem = autorizar('gestor', 'tecnico', 'analista');
/** Gestor e técnico podem atribuir uma O.S.; analista só consulta. */
const gestorOuTecnico = autorizar('gestor', 'tecnico');

/** Somente gestores podem bloquear uma O.S. e modificá-la livremente. */
const somenteGestor = autorizar('gestor');

// GET ALL — qualquer usuário autenticado (o `autenticar` global já é aplicado no app.ts)
router.get('/', (req: Request, res: Response) => controllerOrdemServico.getAll(req, res));

// GET BY ID — qualquer usuário autenticado
router.get('/:id', (req: Request, res: Response) => controllerOrdemServico.getById(req, res));

// POST - gestor / técnico / analista
router.post('/', podeCriarOrdem, (req: Request, res: Response) => controllerOrdemServico.criarOrdem(req, res));

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
