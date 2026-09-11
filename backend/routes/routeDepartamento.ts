import { Router, Request, Response } from 'express';
import { controller } from '../controllers/controllerDepartamento';
import { Departamento } from '../models/modelDepartamento';
const router = Router();
let departamentos: Departamento[] = [];
//GET ALL
router.get('/departamento', (req: Request, res: Response) => {
    controller.getAll(req, res);
})
router.get('/departamento/:id', (req: Request, res: Response) => {
    controller.getById(req, res);
})
//POST
router.post('/departamento', (req: Request, res: Response) => {
    controller.CriarDepartamento(req, res);
}
)
//PUT
router.put('/departamento/:id', (req: Request, res: Response) => {
    controller.updateDepartamento(req, res);
}
)
export default router;