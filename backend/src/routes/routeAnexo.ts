/**
 * Rotas de anexos da O.S. (US#2.6), montadas em /ordens-servico/:id/anexos no app.ts.
 * `rotasConfiguracaoAnexo` fica em /anexos (GET /anexos/configuracao: regras para a tela).
 * Gestor e técnico anexam, listam e baixam anexos das O.S. que podem ver (regra de alcance no service).
 * Não existe rota de exclusão de anexo (fora de escopo da US#2.6).
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { controllerAnexo } from '../controllers/controllerAnexo';
import { autorizar } from '../middlewares/authMiddleware';
import { receberArquivoAnexo } from '../middlewares/uploadMiddleware';

// mergeParams: o `:id` da O.S. vem do caminho montado no app.ts
const router = Router({ mergeParams: true });

/** Gestor e técnico podem anexar, listar e baixar. */
const gestorOuTecnico = autorizar('gestor', 'tecnico');

// POST — upload (multipart/form-data, campo "arquivo", até 52.428.800 bytes)
router.post(
    '/',
    gestorOuTecnico,
    (req: Request, res: Response, next: NextFunction) => controllerAnexo.verificarPermissaoUpload(req, res, next),
    receberArquivoAnexo,
    (req: Request, res: Response) => controllerAnexo.upload(req, res),
);

// GET — lista os anexos da O.S. (somente leitura)
router.get('/', gestorOuTecnico, (req: Request, res: Response) => controllerAnexo.listar(req, res));

// GET — download de um anexo (somente leitura; o bucket é privado e a permissão é checada antes)
router.get('/:anexoId/download', gestorOuTecnico, (req: Request, res: Response) => controllerAnexo.download(req, res));

export default router;

/** Rotas que não dependem de uma O.S. específica, montadas em /anexos no app.ts. */
export const rotasConfiguracaoAnexo = Router();

// GET — tipos aceitos, extensões, tamanho máximo e quantidade por O.S. (PE-12)
rotasConfiguracaoAnexo.get('/configuracao', gestorOuTecnico, (req: Request, res: Response) =>
    controllerAnexo.configuracao(req, res),
);
