import { Router, type Request, type Response } from 'express';
import { controller } from '../controllers/controllerProjeto';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();
const somenteGestor = autorizar('gestor');

// Listagens normais e históricas delegam o escopo ao service.
router.get('/inativos', (req: Request, res: Response) => controller.getInativos(req, res));
router.get('/', (req: Request, res: Response) => controller.getAll(req, res));
router.get('/:id/relatorio.pdf', (req: Request, res: Response) => controller.baixarRelatorioPDF(req, res));
router.get('/:id', (req: Request, res: Response) => controller.getById(req, res));

router.post('/', somenteGestor, (req: Request, res: Response) => controller.criarProjeto(req, res));
router.put('/:id', somenteGestor, (req: Request, res: Response) => controller.updateProjeto(req, res));
router.patch('/:id', somenteGestor, (req: Request, res: Response) => controller.patchProjeto(req, res));
router.patch('/:id/inativar', somenteGestor, (req: Request, res: Response) => controller.inativar(req, res));

// Não há DELETE: projetos são preservados e a inativação é permanente.
export default router;
