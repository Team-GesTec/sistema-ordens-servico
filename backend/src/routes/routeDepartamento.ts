/**
 * routes/routeDepartamento.ts
 *
 * Rotas de Departamento (US#4.2), montadas em `/departamento` no app.ts.
 * Todas exigem login (o `autenticar` é aplicado no app.ts).
 * Criar, editar e alterar o estado ativo/inativo exigem perfil `gestor`.
 *
 * Os handlers usam arrow function SEM chaves (`=> controller.x(req, res)`) para RETORNAR a Promise:
 * é isso que permite capturar erros assíncronos e enviá-los ao middleware de erros.
 *
 * ALTERAÇÃO: departamentos não são mais excluídos fisicamente.
 * O estado é controlado por PATCH /:id/ativo.
 */
import { Router, type Request, type Response } from 'express';
import { controller } from '../controllers/controllerDepartamento';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();

/** Somente gestores podem alterar departamentos ou consultar os inativos. */
const somenteGestor = autorizar('gestor');

// GET ALL — qualquer usuário autenticado; retorna somente departamentos ativos
router.get('/', (req: Request, res: Response) => controller.getAll(req, res));

router.get('/:id/equipe', (req: Request, res: Response) => controller.getEquipe(req, res));

// GET INATIVOS — somente gestor
// Deve ficar antes de /:id para não interpretar "inativos" como um ID.
router.get('/inativos', somenteGestor, (req: Request, res: Response) => controller.getInativos(req, res));

// GET BY ID — qualquer usuário autenticado
router.get('/:id', (req: Request, res: Response) => controller.getById(req, res));

// POST — gestor
router.post('/', somenteGestor, (req: Request, res: Response) => controller.criarDepartamento(req, res));

// PUT — gestor
router.put('/:id', somenteGestor, (req: Request, res: Response) => controller.updateDepartamento(req, res));

// PATCH — gestor; altera os dados do departamento
router.patch('/:id', somenteGestor, (req: Request, res: Response) => controller.patchDepartamento(req, res));

// PATCH ATIVO — gestor; ativa ou inativa o departamento
router.patch('/:id/ativo', somenteGestor, (req: Request, res: Response) => controller.alterarAtivo(req, res));

export default router;