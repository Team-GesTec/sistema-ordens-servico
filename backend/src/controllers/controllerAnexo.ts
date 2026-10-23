/**
 * controllers/controllerAnexo.ts
 *
 * Recebe as requisições de anexos da O.S. (US#2.6), pega o usuário logado e chama o service.
 * Não possui regra de negócio: só lê parâmetros, converte o arquivo do multer para o formato do service
 * e monta os cabeçalhos do download.
 *
 * ALTERAÇÕES (19/10/2026):
 *  - 2.6-BE02: listagem (`listar`) e download (`download`) dos anexos.
 *
 * ALTERAÇÕES (23/10/2026):
 *  - integração com o frontend: repassa o campo `relato` do multipart e expõe `configuracao`.
 */
import { pipeline } from 'node:stream/promises';
import type { NextFunction, Request, Response } from 'express';
import { serviceAnexo } from '../services/serviceAnexo';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { lerId } from '../utils/validacao';
import { montarContentDisposition } from '../utils/arquivo';
import { CAMPO_RELATO_ANEXO, type ArquivoRecebido } from '../models/modelAnexo';

export class ControllerAnexo {
    /**
     * Antes de receber o arquivo: confere se a O.S. existe, se o usuário pode vê-la e se ainda há vaga.
     * Evita transferir até 50MB para depois responder 403/404/422.
     */
    public async verificarPermissaoUpload(req: Request, _resp: Response, next: NextFunction): Promise<void> {
        const usuario = usuarioAutenticado(req);
        const osId = lerId(req.params.id);
        await serviceAnexo.verificarPermissaoParaAnexar(osId, usuario);
        next();
    }

    /** POST /ordens-servico/:id/anexos — inclui um anexo (201 com os metadados gravados). */
    public async upload(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const osId = lerId(req.params.id);
        const arquivo: ArquivoRecebido | undefined = req.file
            ? {
                  nomeOriginal: req.file.originalname,
                  tipo: req.file.mimetype,
                  tamanho: req.file.size,
                  conteudo: req.file.buffer,
              }
            : undefined;

        // Campos de texto do multipart chegam em req.body (o multer sempre cria o objeto)
        const relato: unknown = (req.body as Record<string, unknown> | undefined)?.[CAMPO_RELATO_ANEXO];

        return resp.status(201).json(await serviceAnexo.anexar(osId, arquivo, usuario, relato));
    }

    /** GET /anexos/configuracao — regras dos anexos para a tela validar antes do envio (200). */
    public configuracao(_req: Request, resp: Response): Response {
        return resp.status(200).json(serviceAnexo.configuracaoPublica());
    }

    /** GET /ordens-servico/:id/anexos — lista os anexos da O.S. (200). */
    public async listar(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const osId = lerId(req.params.id);
        return resp.status(200).json(await serviceAnexo.listar(osId, usuario));
    }

    /**
     * GET /ordens-servico/:id/anexos/:anexoId/download — entrega o arquivo (200, binário).
     * Cabeçalhos: Content-Disposition (attachment, com o nome original), Content-Type e Content-Length.
     */
    public async download(req: Request, resp: Response): Promise<void> {
        const usuario = usuarioAutenticado(req);
        const osId = lerId(req.params.id);
        const anexoId = lerId(req.params.anexoId, 'anexoId');
        const { anexo, conteudo } = await serviceAnexo.baixar(osId, anexoId, usuario);

        resp.setHeader('Content-Disposition', montarContentDisposition(anexo.nome));
        resp.setHeader('Content-Type', anexo.tipo);
        resp.setHeader('Content-Length', String(anexo.tamanho));
        resp.setHeader('X-Content-Type-Options', 'nosniff');
        resp.setHeader('Cache-Control', 'private, no-store');
        // O frontend chama a API de outra origem: sem isto o navegador esconde o nome do arquivo
        resp.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
        resp.status(200);

        try {
            await pipeline(conteudo, resp);
        } catch (erro) {
            // Cabeçalhos já enviados: não há como responder { mensagem }; só encerra a conexão
            // (acontece, por exemplo, quando o usuário cancela o download)
            resp.destroy();
            console.error(`[anexos] download interrompido: anexo ${anexo.id} da O.S. ${osId}`, erro);
        }
    }
}

/** Instância única usada pelas rotas. */
export const controllerAnexo = new ControllerAnexo();
