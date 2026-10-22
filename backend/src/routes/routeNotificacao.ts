/**
 * routes/routeNotificacao.ts
 *
 * Rotas de notificações, montadas em /notificacoes no app.ts.
 */

import { Router, type Request, type Response } from 'express';
import { controllerNotificacao } from '../controllers/controllerNotificacao';

const router = Router();

// GET — qualquer usuário autenticado; cada um só vê os próprios avisos (o id vem do token)
router.get('/', (req: Request, res: Response) => controllerNotificacao.listarMinhas(req, res));

export default router;