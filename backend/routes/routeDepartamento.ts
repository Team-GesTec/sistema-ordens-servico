import { Router, Request, Response } from 'express';
import { controller } from '../controllers/controllerDepartamento';

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
    controller.criarDepartamento(req, res);
})

//PUT
router.put('/:id', (req: Request, res: Response) => {
    controller.updateDepartamento(req, res);
})

//DELETE
router.delete('/:id', (req: Request, res: Response) => {
    controller.deleteDepartamento(req, res);
})

export default router;