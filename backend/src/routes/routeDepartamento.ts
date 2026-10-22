/**
 * routes/routeDepartamento.ts
 *
 * Rotas de Departamento (US#4.2), montadas em `/departamento` no app.ts.
 * Todas exigem login (o `autenticar` é aplicado no app.ts); criar, alterar e excluir exigem o
 * perfil `gestor`.
 *
 * Os handlers usam arrow function SEM chaves (`=> controller.x(req, res)`) para RETORNAR a Promise:
 * é isso que permite capturar erros assíncronos e enviá-los ao middleware de erros.
 *
 * ALTERAÇÃO (16/09/2026): adicionados a checagem de perfil (`autorizar('gestor')`) e o PATCH.
 */
import { Router, type Request, type Response } from 'express';
import { controller } from '../controllers/controllerDepartamento';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();

/** Somente gestores podem alterar departamentos. */
const somenteGestor = autorizar('gestor');

// GET ALL — qualquer usuário autenticado
router.get('/', (req: Request, res: Response) => controller.getAll(req, res));

// Visão da equipe deve vir antes de /:id para não interpretar 'equipe' como ID.
router.get('/:id/equipe', (req: Request, res: Response) => controller.getEquipe(req, res));

// GET BY ID — qualquer usuário autenticado, restrito pelo service
router.get('/:id', (req: Request, res: Response) => controller.getById(req, res));

// POST — gestor
router.post('/', somenteGestor, (req: Request, res: Response) => controller.criarDepartamento(req, res));

// PUT — gestor
router.put('/:id', somenteGestor, (req: Request, res: Response) => controller.updateDepartamento(req, res));

// PATCH — gestor
router.patch('/:id', somenteGestor, (req: Request, res: Response) => controller.patchDepartamento(req, res));

// DELETE — gestor
// Sem estado persistido de inativação, não há DELETE físico de departamentos.

export default router;
