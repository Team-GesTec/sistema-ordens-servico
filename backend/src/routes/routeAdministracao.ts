import express, { Router, type Request, type Response } from 'express';
import { controllerAdministracao } from '../controllers/controllerAdministracao';

const router = Router();
const arquivoBinario = express.raw({ type: 'application/octet-stream', limit: '5mb' });

// Importações seguem a matriz fixa: somente Gestor/Admin.
router.post('/importacao/:entidade/preview', arquivoBinario, (req: Request, res: Response) => controllerAdministracao.previewImportacao(req, res));
router.post('/importacao/:entidade/confirmar', arquivoBinario, (req: Request, res: Response) => controllerAdministracao.confirmarImportacao(req, res));


export default router;
