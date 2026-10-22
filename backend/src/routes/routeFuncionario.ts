/**
 * Rotas de Funcionário. Todas exigem autenticação global aplicada em app.ts.
 * Consultas e mutações de administração respeitam o perfil atual do usuário.
 */
import { Router, type Request, type Response } from 'express';
import { controller } from '../controllers/controllerFuncionario';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();
const somenteGestor = autorizar('gestor');

// Específica antes de /:id; o service aplica escopo por perfil ao histórico.
router.get('/inativos', (req: Request, res: Response) => controller.getInativos(req, res));
router.get('/', (req: Request, res: Response) => controller.getAll(req, res));
router.get('/:id', (req: Request, res: Response) => controller.getById(req, res));

router.post('/', somenteGestor, (req: Request, res: Response) => controller.criarFuncionario(req, res));
router.put('/:id', somenteGestor, (req: Request, res: Response) => controller.updateFuncionario(req, res));
router.patch('/:id', somenteGestor, (req: Request, res: Response) => controller.patchFuncionario(req, res));
router.delete('/:id', somenteGestor, (req: Request, res: Response) => controller.deleteFuncionario(req, res));

export default router;
