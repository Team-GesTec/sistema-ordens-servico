/**
 * routes/routeFuncionario.ts
 *
 * Rotas de Funcionário (US#4.2), montadas em `/funcionario` no app.ts.
 * Todas exigem login (o `autenticar` é aplicado no app.ts); criar, alterar e excluir exigem o
 * perfil `gestor`.
 *
 * Os handlers usam arrow function SEM chaves (`=> controller.x(req, res)`) para RETORNAR a Promise:
 * é isso que permite ao Express 5 capturar erros assíncronos e enviá-los ao middleware de erros.
 *
 * ALTERAÇÃO (16/09/2026): adicionados a checagem de perfil (`autorizar('gestor')`) e o PATCH.
 */
import { Router, type Request, type Response } from 'express';
import { controller } from '../controllers/controllerFuncionario';
import { autorizar } from '../../middlewares/authMiddleware';

const router = Router();

/** Somente gestores podem alterar funcionários. */
const somenteGestor = autorizar('gestor');

// GET ALL — qualquer usuário autenticado
router.get('/', (req: Request, res: Response) => controller.getAll(req, res));

// GET BY ID — qualquer usuário autenticado
router.get('/:id', (req: Request, res: Response) => controller.getById(req, res));

// POST — gestor
router.post('/', somenteGestor, (req: Request, res: Response) => controller.criarFuncionario(req, res));

// PUT — gestor
router.put('/:id', somenteGestor, (req: Request, res: Response) => controller.updateFuncionario(req, res));

// PATCH — gestor
router.patch('/:id', somenteGestor, (req: Request, res: Response) => controller.patchFuncionario(req, res));

// DELETE — gestor
router.delete('/:id', somenteGestor, (req: Request, res: Response) => controller.deleteFuncionario(req, res));

export default router;
