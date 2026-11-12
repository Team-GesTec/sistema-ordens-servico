import type { Request, Response } from 'express';
import { serviceNotificacao } from '../services/serviceNotificacao';
import { usuarioAutenticado } from '../middlewares/authMiddleware';
import { AppError } from '../errors/AppError';

function idDaRota(req: Request): string {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) throw AppError.requisicaoInvalida('ID da notificação é obrigatório.');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw AppError.requisicaoInvalida('ID da notificação deve ser um UUID válido.');
    }
    return id;
}

export class ControllerNotificacao {
    async listarMinhas(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const pagina = Number(req.query.pagina ?? 1);
        const limite = Number(req.query.limite ?? 20);
        const valorLida = req.query.lida;
        if (valorLida !== undefined && valorLida !== 'true' && valorLida !== 'false') {
            throw AppError.requisicaoInvalida('lida deve ser true ou false.');
        }
        const lida = valorLida === undefined ? undefined : valorLida === 'true';
        const resultado = await serviceNotificacao.listarDoFuncionario(usuario.id, pagina, limite, lida);
        return resp.status(200).json(resultado);
    }

    async contarNaoLidas(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const total = await serviceNotificacao.contarNaoLidas(usuario.id);
        return resp.status(200).json({ total });
    }

    async consultar(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const notificacao = await serviceNotificacao.consultar(usuario.id, idDaRota(req));
        return resp.status(200).json(notificacao);
    }

    async marcarUmaComoLida(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        await serviceNotificacao.marcarUmaComoLida(usuario.id, idDaRota(req));
        return resp.status(204).send();
    }

    async marcarTodasComoLidas(req: Request, resp: Response): Promise<Response> {
        const usuario = usuarioAutenticado(req);
        const resultado = await serviceNotificacao.marcarTodasComoLidas(usuario.id);
        return resp.status(200).json({ atualizadas: resultado });
    }
}

export const controllerNotificacao = new ControllerNotificacao();
