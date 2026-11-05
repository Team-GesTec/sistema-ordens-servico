/** Rotas de projetos: consulta autenticada e operações de escrita exclusivas do Gestor. */
import { Router, Request, Response } from 'express';
import { controller } from '../controllers/controllerProjeto';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();
const somenteGestor = autorizar('gestor');

//GET ALL
router.get('/', (req: Request, res: Response) => controller.getAll(req, res));

//GET BY ID
router.get('/:id', (req: Request, res: Response) => controller.getById(req, res));

//POST
router.post('/', somenteGestor, (req: Request, res: Response) => controller.criarProjeto(req, res));

//PUT
router.put('/:id', somenteGestor, (req: Request, res: Response) => controller.updateProjeto(req, res));

//DELETE
router.delete('/:id', somenteGestor, (req: Request, res: Response) => controller.deleteProjeto(req, res));

export default router;
