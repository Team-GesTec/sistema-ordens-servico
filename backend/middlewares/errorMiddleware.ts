/**
 * middlewares/errorMiddleware.ts
 *
 * Tratamento centralizado de erros e de rotas inexistentes.
 * Toda resposta de erro da API tem o formato `{ "mensagem": "..." }`.
 */
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../src/errors/AppError';

/**
 * Lê o status HTTP de erros gerados pelo próprio Express/body-parser (ex.: corpo grande demais = 413).
 * @returns O status, se for um erro 4xx conhecido; senão `undefined`.
 */
function statusDeErroDoExpress(erro: unknown): number | undefined {
    if (typeof erro === 'object' && erro !== null && 'status' in erro && typeof erro.status === 'number') {
        return erro.status >= 400 && erro.status < 500 ? erro.status : undefined;
    }
    return undefined;
}

/**
 * Responde 404 para qualquer rota que não foi encontrada.
 * Registrar DEPOIS de todas as rotas e ANTES de `tratarErros`.
 */
export function rotaNaoEncontrada(req: Request, _res: Response, next: NextFunction): void {
    next(AppError.naoEncontrado(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

/**
 * Handler de erro final (precisa ter os 4 parâmetros para o Express reconhecê-lo como tal).
 * - `AppError` → status e mensagem do próprio erro;
 * - JSON malformado → 400;
 * - outros erros 4xx do Express (ex.: corpo grande demais) → o mesmo status;
 * - qualquer outra coisa → registra no console e responde 500 sem expor detalhes internos.
 */
export function tratarErros(erro: unknown, req: Request, res: Response, next: NextFunction): void {
    if (res.headersSent) {
        next(erro);
        return;
    }
    if (erro instanceof AppError) {
        res.status(erro.statusCode).json({ mensagem: erro.message });
        return;
    }
    if (erro instanceof SyntaxError && 'body' in erro) {
        res.status(400).json({ mensagem: 'JSON inválido no corpo da requisição' });
        return;
    }
    const status = statusDeErroDoExpress(erro);
    if (status !== undefined) {
        res.status(status).json({ mensagem: status === 413 ? 'Corpo da requisição grande demais' : 'Requisição inválida' });
        return;
    }
    console.error(`[erro] ${req.method} ${req.originalUrl}`, erro);
    res.status(500).json({ mensagem: 'Erro interno do servidor' });
}
