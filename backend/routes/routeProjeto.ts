import { Router, Request, Response } from 'express';
import { controller } from '../controllers/controllerProjeto';

const router = Router();

//GET ALL
router.get('/', (req: Request, res: Response) => {
    controller.getAll(req, res);
})

//GET BY ID
router.get('/:id', (req: Request, res: Response) => {
    controller.getById(req, res);
})

//POST
router.post('/', (req: Request, res: Response) => {
    controller.criarProjeto(req, res);
})

//PUT
router.put('/:id', (req: Request, res: Response) => {
    controller.updateProjeto(req, res);
})

//DELETE
router.delete('/:id', (req: Request, res: Response) => {
    controller.deleteProjeto(req, res);
})

export default router;