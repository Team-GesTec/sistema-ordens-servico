/**
 * Rotas de O.S., montadas em /ordens-servico no app.ts
 * Gestor e técnico podem abrir O.S. conforme Ata de alinhamento de 16/09
 */

import { Router, type Request, type Response } from 'express';
import { controllerOrdemServico } from '../controllers/controllerOrdemServico';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();

/** Gestor e técnico podem criar O.S. e atribuir responsável. */
const gestorOuTecnico = autorizar('gestor', 'tecnico');

/** Somente gestores podem bloquear uma O.S. e modificá-la livremente. */
const somenteGestor = autorizar('gestor');

// GET ALL
router.get('/', (req: Request, res: Response) => controllerOrdemServico.getAll(req, res));

// GET HISTORICO
router.get('/:id/historico', (req: Request, res: Response) =>
    controllerOrdemServico.listarHistorico(req, res),
);

// GET ALL INATIVAS
router.get('/inativas', somenteGestor, (req: Request, res: Response) =>
    controllerOrdemServico.getInativas(req, res),
);

// GET BY ID — qualquer usuário autenticado
router.get('/:id', (req: Request, res: Response) => controllerOrdemServico.getById(req, res));

// POST - gestor / técnico
// AJ-06: data de abertura (data_criacao) no passado é exclusiva do gestor — checado no service (403 para técnico)
router.post('/', gestorOuTecnico, (req: Request, res: Response) => controllerOrdemServico.criarOrdem(req, res));

// Regras de atribuição para gestores e técnicos são validadas no service.
router.patch('/atribuir/:id', gestorOuTecnico, (req: Request, res: Response) => controllerOrdemServico.atribuirResponsavel(req, res));

// Alteração manual do SLA — gestor
router.patch('/:id/sla-manual', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.alterarSlaManual(req, res));

// Bloqueio - PATCH - gestor
router.patch('/bloquear/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.bloquearOrdem(req, res));

// Desbloqueio - PATCH - gestor
router.patch('/desbloquear/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.desbloquearOrdem(req, res));

// Ativar ou inativar — somente gestor
router.patch('/:id/ativo', somenteGestor, (req: Request, res: Response) =>
    controllerOrdemServico.alterarAtivo(req, res),
);

// PATCH - gestor
router.patch('/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.patchOrdem(req, res))

// PUT - gestor
router.put('/:id', somenteGestor, (req: Request, res: Response) => controllerOrdemServico.updateOrdem(req, res))

// PATCH status — gestor altera qualquer O.S.; técnico, só as atribuídas a ele (checado no service)
router.patch('/:id/status', gestorOuTecnico, (req: Request, res: Response) =>
    controllerOrdemServico.alterarStatus(req, res),
);

export default router;