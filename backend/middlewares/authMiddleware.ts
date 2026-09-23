/**
 * middlewares/authMiddleware.ts
 *
 * Middlewares de segurança (US#4.1):
 *   - `autenticar`: exige um token JWT válido no cabeçalho `Authorization: Bearer <token>` e
 *     coloca o funcionário logado em `req.usuario`.
 *   - `autorizar(...perfis)`: exige que o funcionário logado tenha um dos perfis informados.
 *
 * Uso nas rotas:
 *   app.use('/departamento', autenticar, routerDP);                 // todas as rotas exigem login
 *   router.post('/', autorizar('gestor'), (req, res) => ...);       // só gestor pode criar
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../src/errors/AppError';
import type { PerfilFuncionario } from '../src/models/modelFuncionario';
import { repositoryFuncionario } from '../src/repositories/repositoryFuncionario';
import { serviceAuth } from '../src/services/serviceAuth';

/** Prefixo esperado no cabeçalho Authorization. */
const PREFIXO_BEARER = 'Bearer ';

/**
 * Extrai o token do cabeçalho `Authorization`.
 * @param cabecalho Valor de `req.headers.authorization`.
 * @throws AppError 401 se o cabeçalho estiver ausente ou fora do formato "Bearer <token>".
 */
function extrairToken(cabecalho: string | undefined): string {
    if (!cabecalho || !cabecalho.startsWith(PREFIXO_BEARER)) {
        throw AppError.naoAutenticado('Token de acesso ausente. Envie o cabeçalho Authorization: Bearer <token>');
    }
    const token = cabecalho.slice(PREFIXO_BEARER.length).trim();
    if (token.length === 0) {
        throw AppError.naoAutenticado('Token de acesso ausente. Envie o cabeçalho Authorization: Bearer <token>');
    }
    return token;
}

/**
 * Middleware de autenticação.
 *
 * Além de validar o token, busca o funcionário (pelo cache) a cada requisição. Assim:
 *   - um funcionário excluído perde o acesso na hora, mesmo com token ainda válido;
 *   - uma mudança de perfil (ex.: gestor → técnico) vale imediatamente, porque `autorizar`
 *     usa o perfil atual, e não o que estava gravado no token.
 *
 * No Express 5, um erro lançado aqui (inclusive em código assíncrono) segue automaticamente para
 * o middleware de erros.
 */
export async function autenticar(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = extrairToken(req.headers.authorization);
    const idFuncionario = serviceAuth.verificarToken(token);
    const funcionario = await repositoryFuncionario.buscarPorId(idFuncionario);
    if (!funcionario) {
        throw AppError.naoAutenticado('O usuário deste token não existe mais. Faça login novamente');
    }
    req.usuario = funcionario;
    next();
}

/**
 * Cria um middleware que só deixa passar funcionários com um dos perfis informados.
 * Deve ser usado DEPOIS de `autenticar`.
 * @param perfis Perfis autorizados (ex.: `autorizar('gestor')`).
 * @returns Middleware do Express.
 */
export function autorizar(...perfis: PerfilFuncionario[]): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.usuario) {
            throw AppError.naoAutenticado('Autenticação necessária');
        }
        if (!perfis.includes(req.usuario.tipo)) {
            throw AppError.acessoNegado(`Ação permitida apenas para o(s) perfil(is): ${perfis.join(', ')}`);
        }
        next();
    };
}

/**
 * Devolve o funcionário autenticado da requisição.
 * Para usar em controllers de rotas protegidas por `autenticar`.
 * @throws AppError 401 se a rota não passou pelo middleware de autenticação.
 */
export function usuarioAutenticado(req: Request): NonNullable<Request['usuario']> {
    if (!req.usuario) {
        throw AppError.naoAutenticado('Autenticação necessária');
    }
    return req.usuario;
}
