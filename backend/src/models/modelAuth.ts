/**
 * models/modelAuth.ts
 *
 * Tipos da autenticação (US#4.1).
 */
import type { Funcionario, PerfilFuncionario } from './modelFuncionario';

/** Conteúdo (payload) do token JWT emitido no login. */
export interface PayloadToken {
    /** Id do funcionário (o padrão JWT exige texto no campo `sub`). */
    sub: string;
    /** Perfil no momento do login (informativo — a permissão é conferida com o perfil atual). */
    tipo: PerfilFuncionario;
}

/** Resposta do POST /auth/login. */
export interface RespostaLogin {
    token: string;
    tipo_token: 'Bearer';
    /** Validade configurada (ex.: "8h"). */
    expira_em: string;
    funcionario: Funcionario;
}
