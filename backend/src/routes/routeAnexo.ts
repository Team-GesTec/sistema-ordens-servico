/**
 * Rotas de anexos da O.S. (US#2.6), montadas em /ordens-servico/:id/anexos no app.ts.
 * `rotasConfiguracaoAnexo` fica em /anexos (GET /anexos/configuracao: regras para a tela).
 * Gestor e técnico anexam, listam e baixam anexos das O.S. que podem ver (regra de alcance no service).
 * Não existe rota de exclusão de anexo (fora de escopo da US#2.6).
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { ControllerAnexo, controllerAnexo } from '../controllers/controllerAnexo';
import { autorizar } from '../middlewares/authMiddleware';
import { receberArquivoAnexo } from '../middlewares/uploadMiddleware';

/** Gestor e técnico podem anexar, listar e baixar. */
const gestorOuTecnico = autorizar('gestor', 'tecnico');

/** Monta as rotas de anexos com o controller da aplicação (substituível em testes). */
export function criarRotasAnexo(controller: ControllerAnexo = controllerAnexo): Router {
    const router = Router({ mergeParams: true });

    router.post(
        '/',
        gestorOuTecnico,
        (req: Request, res: Response, next: NextFunction) => controller.verificarPermissaoUpload(req, res, next),
        receberArquivoAnexo,
        (req: Request, res: Response) => controller.upload(req, res),
    );
    router.get('/', gestorOuTecnico, (req: Request, res: Response) => controller.listar(req, res));
    router.get('/:anexoId/download', gestorOuTecnico, (req: Request, res: Response) => controller.download(req, res));

    return router;
}

export default criarRotasAnexo();

/** Rotas que não dependem de uma O.S. específica, montadas em /anexos no app.ts. */
export function criarRotasConfiguracaoAnexo(controller: ControllerAnexo = controllerAnexo): Router {
    const router = Router();
    router.get('/configuracao', gestorOuTecnico, (req: Request, res: Response) =>
        controller.configuracao(req, res),
    );
    return router;
}

export const rotasConfiguracaoAnexo = criarRotasConfiguracaoAnexo();
