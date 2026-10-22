/**
 * Rotas de O.S., montadas em /ordens-servico no app.ts
 * Gestor/Admin, Analista/Líder e Técnico podem abrir O.S. conforme seu escopo.
 */

import { Router, type Request, type Response } from 'express';
import { controllerOrdemServico } from '../controllers/controllerOrdemServico';
import { autorizar } from '../middlewares/authMiddleware';

const router = Router();

/** Os três perfis podem criar O.S. dentro do próprio escopo. */
const gestorOuTecnico = autorizar('gestor', 'analista', 'tecnico');

/** Administração global permanece exclusiva do Gestor; operações locais podem incluir Analista/Líder. */
const somenteGestor = autorizar('gestor');
const gestorOuAnalista = autorizar('gestor', 'analista');

// Relatórios e histórico possuem filtros de autorização no serviço, além da autenticação global.
router.get('/exportar.csv', (req: Request, res: Response) => controllerOrdemServico.exportarCSV(req, res));
router.get('/exportar.xlsx', (req: Request, res: Response) => controllerOrdemServico.exportarXLSX(req, res));
router.get('/:id/historico', (req: Request, res: Response) => controllerOrdemServico.getHistorico(req, res));
router.get('/:id/relatorio.pdf', (req: Request, res: Response) => controllerOrdemServico.baixarRelatorioPDF(req, res));

// Rotas específicas antes de /:id para que "inativas" não seja interpretado como identificador.
router.get('/inativas', (req: Request, res: Response) => controllerOrdemServico.getInativas(req, res));

// GET ALL — lista filtrada no backend pelo escopo do usuário autenticado.
router.get('/', (req: Request, res: Response) => controllerOrdemServico.getAll(req, res));

// GET BY ID — valida o escopo no backend.
router.get('/:id', (req: Request, res: Response) => controllerOrdemServico.getById(req, res));

// POST - perfis autorizados; o service reforça o escopo do departamento
// AJ-06: data de abertura (data_criacao) no passado é exclusiva do gestor — checado no service (403 para técnico)
router.post('/', gestorOuTecnico, (req: Request, res: Response) => controllerOrdemServico.criarOrdem(req, res));

// Regras de atribuição para gestores e técnicos são validadas no service.
router.patch('/atribuir/:id', gestorOuTecnico, (req: Request, res: Response) => controllerOrdemServico.atribuirResponsavel(req, res));

// Bloqueio - PATCH - gestor
router.patch('/bloquear/:id', gestorOuAnalista, (req: Request, res: Response) => controllerOrdemServico.bloquearOrdem(req, res));

// Inativação irreversível; o serviço valida o escopo do Analista/Líder.
router.patch('/:id/inativar', gestorOuAnalista, (req: Request, res: Response) =>
    controllerOrdemServico.inativar(req, res),
);

// Edição global para Gestor/Admin; Analista/Líder permitido apenas no departamento sob sua responsabilidade.
router.patch('/:id', gestorOuAnalista, (req: Request, res: Response) => controllerOrdemServico.patchOrdem(req, res))

router.put('/:id', gestorOuAnalista, (req: Request, res: Response) => controllerOrdemServico.updateOrdem(req, res))

// Parecer independente: somente Técnico pode chamar a rota; o service valida responsável, estado e payload.
router.patch('/:id/parecer-tecnico', autorizar('tecnico'), (req: Request, res: Response) =>
    controllerOrdemServico.salvarParecerTecnico(req, res),
);

// PATCH status — gestor altera qualquer O.S.; técnico, só as atribuídas a ele (checado no service)
router.patch('/:id/status', gestorOuTecnico, (req: Request, res: Response) =>
    controllerOrdemServico.alterarStatus(req, res),
);

export default router;
