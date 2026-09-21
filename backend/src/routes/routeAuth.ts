/**
 * routes/routeAuth.ts
 *
 * Rotas de autenticação (US#4.1), montadas em `/auth` no app.ts.
 *   POST /auth/login — pública (é onde se obtém o token)
 *   GET  /auth/me    — exige token
 */
import { Router, type Request, type Response } from 'express';
import { controller } from '../controllers/controllerAuth';
import { autenticar } from '../../middlewares/authMiddleware';

const router = Router();

// LOGIN — público
router.post('/login', (req: Request, res: Response) => controller.login(req, res));

// ME — dados do usuário logado
router.get('/me', autenticar, (req: Request, res: Response) => controller.me(req, res));

export default router;
