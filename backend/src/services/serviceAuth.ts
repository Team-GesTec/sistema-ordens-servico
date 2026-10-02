/**
 * services/serviceAuth.ts
 *
 * Autenticação (US#4.1): login com usuário e senha, emissão e verificação de token JWT.
 *
 * Observação sobre a US: ela fala em "e-mail e senha", mas o schema do banco não tem coluna de
 * e-mail — o login usa `funcionarios.usuario` (que pode conter um e-mail, se o time preferir).
 *
 * Segurança:
 *   - A mensagem de erro é a mesma para usuário inexistente e senha errada, e o tempo de resposta
 *     também (sempre roda uma comparação bcrypt), para não revelar quais usuários existem.
 *   - O token usa HS256 com o segredo `JWT_SECRET`, e a verificação só aceita esse algoritmo.
 */
import * as jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import type { PayloadToken, RespostaLogin } from '../models/modelAuth';
import type { Funcionario } from '../models/modelFuncionario';
import { compararSenha, gerarHashSenha } from '../utils/senha';
import { exigirTexto, lerCorpo } from '../utils/validacao';
import { normalizarUsuario } from './serviceFuncionario';

/** Mensagem única para qualquer falha de login. */
const LOGIN_INVALIDO = 'Usuário ou senha inválidos';

/** Algoritmo de assinatura dos tokens. */
const ALGORITMO: jwt.Algorithm = 'HS256';

/**
 * Hash de uma senha qualquer, usado quando o usuário não existe — assim o login demora o mesmo
 * tempo nos dois casos. É gerado uma vez, na primeira tentativa de login.
 */
let hashFalso: Promise<string> | undefined;

/** Devolve (e memoriza) o hash usado para igualar o tempo de resposta. */
function obterHashFalso(): Promise<string> {
    hashFalso ??= gerarHashSenha('senha-inexistente-apenas-para-igualar-o-tempo');
    return hashFalso;
}

export class ServiceAuth {
    private readonly funcionarios: RepositoryFuncionario;

    /**
     * @param funcionarios Repository de funcionários (pode ser trocado em testes).
     */
    constructor(funcionarios: RepositoryFuncionario = repositoryFuncionario) {
        this.funcionarios = funcionarios;
    }

    /**
     * Confere usuário e senha e, se estiverem corretos, emite um token JWT.
     * @param corpo O `req.body` (`usuario`, `senha`).
     * @throws AppError 400 se faltar campo; 401 se as credenciais estiverem erradas.
     */
    async login(corpo: unknown): Promise<RespostaLogin> {
        const dados = lerCorpo(corpo);
        const usuario = normalizarUsuario(dados.usuario);
        const senha = exigirTexto(dados.senha, 'senha', { aparar: false });

        const registro = await this.funcionarios.buscarCredenciaisPorUsuario(usuario);
        const senhaConfere = await compararSenha(senha, registro?.senha_hash ?? (await obterHashFalso()));
        if (!registro || !senhaConfere) {
            throw AppError.naoAutenticado(LOGIN_INVALIDO);
        }

        const { senha_hash: _hashDescartado, ...funcionario } = registro;
        return {
            token: this.gerarToken(funcionario),
            tipo_token: 'Bearer',
            expira_em: env.jwtExpiraEm,
            funcionario,
        };
    }

    /**
     * Assina um token para o funcionário.
     * @param funcionario Funcionário autenticado (sem senha).
     */
    gerarToken(funcionario: Funcionario): string {
        const payload: Omit<PayloadToken, 'sub'> = { tipo: funcionario.tipo };
        return jwt.sign(payload, env.jwtSecret, {
            algorithm: ALGORITMO,
            subject: String(funcionario.id),
            // O tipo do jsonwebtoken só aceita literais como "8h"; o valor vem validado do .env.
            expiresIn: env.jwtExpiraEm as jwt.SignOptions['expiresIn'] & string,
        });
    }

    /**
     * Verifica assinatura e validade de um token e devolve o id do funcionário.
     * @param token Token recebido no cabeçalho Authorization.
     * @throws AppError 401 se o token for inválido, adulterado ou estiver expirado.
     */
    verificarToken(token: string): number {
        let conteudo: string | jwt.JwtPayload;
        try {
            conteudo = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITMO] });
        } catch (erro) {
            if (erro instanceof jwt.TokenExpiredError) {
                throw AppError.naoAutenticado('Sessão expirada. Faça login novamente');
            }
            throw AppError.naoAutenticado('Token de acesso inválido');
        }

        const id = typeof conteudo === 'object' ? Number(conteudo.sub) : Number.NaN;
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw AppError.naoAutenticado('Token de acesso inválido');
        }
        return id;
    }
}

/** Instância única usada pelo controller e pelo middleware de autenticação. */
export const serviceAuth = new ServiceAuth();
