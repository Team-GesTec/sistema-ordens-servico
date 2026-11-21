import { Router, type Request, type Response } from 'express';
import { autorizar } from '../middlewares/authMiddleware';
import { controllerRelatorio } from '../controllers/controllerRelatorio';

const router = Router();
const gestorOuAnalista = autorizar('gestor', 'analista');

router.get('/ordens-servico/:id/relatorio.pdf', gestorOuAnalista, (req: Request, res: Response) => controllerRelatorio.ordemServico(req, res));
router.get('/cliente/:id/relatorio.pdf', gestorOuAnalista, (req: Request, res: Response) => controllerRelatorio.cliente(req, res));

export default router;
