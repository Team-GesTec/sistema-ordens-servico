import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { serviceImportacao } from '../services/serviceImportacao';

function conteudoBinario(req: Request): Buffer {
    if (!Buffer.isBuffer(req.body)) throw AppError.requisicaoInvalida('O arquivo precisa ser enviado como conteúdo binário.');
    return req.body;
}

function nomeArquivo(req: Request): string | undefined {
    const valor = req.headers['x-import-filename'];
    return Array.isArray(valor) ? valor[0] : valor;
}

export class ControllerAdministracao {
    async previewImportacao(req: Request, res: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const preview = await serviceImportacao.analisar(String(req.params.entidade), nomeArquivo(req), conteudoBinario(req), usuario);
        return res.status(200).json(preview);
    }

    async confirmarImportacao(req: Request, res: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const resultado = await serviceImportacao.importar(String(req.params.entidade), nomeArquivo(req), conteudoBinario(req), usuario);
        return res.status(resultado.completo ? 200 : 207).json(resultado);
    }


}

export const controllerAdministracao = new ControllerAdministracao();
