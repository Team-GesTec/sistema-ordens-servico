import { Router, type Request, type Response } from 'express';
import { controller } from '../controllers/controllerProjeto';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();
const somenteGestor = autorizar('gestor');

// Projetos ativos são visíveis aos usuários autenticados; inativos, somente ao Gestor.
router.get('/', (req: Request, res: Response) => controller.getAll(req, res));
router.get('/inativos', somenteGestor, (req: Request, res: Response) => controller.getInativos(req, res));
router.get('/:id', (req: Request, res: Response) => controller.getById(req, res));

router.post('/', somenteGestor, (req: Request, res: Response) => controller.criarProjeto(req, res));
router.put('/:id', somenteGestor, (req: Request, res: Response) => controller.updateProjeto(req, res));
router.patch('/:id', somenteGestor, (req: Request, res: Response) => controller.patchProjeto(req, res));
router.patch('/:id/ativo', somenteGestor, (req: Request, res: Response) => controller.alterarAtivo(req, res));

// Não há DELETE: projetos são preservados e usam somente inativação/reativação.
export default router;
