import { Router, type Request, type Response } from 'express';
import { autorizar } from '../middlewares/authMiddleware';
import { controllerDashboard } from '../controllers/controllerDashboard';

const router = Router();

// Os totais são limitados no service pelo perfil do usuário autenticado.
router.get('/horas', autorizar('gestor', 'analista', 'tecnico'), (req: Request, res: Response) =>
    controllerDashboard.horas(req, res),
);

export default router;
