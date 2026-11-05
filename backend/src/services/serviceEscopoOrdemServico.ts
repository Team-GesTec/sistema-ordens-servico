/**
 * services/serviceEscopoOrdemServico.ts
 *
 * Regra ÚNICA de alcance (visibilidade) das O.S. por perfil — fonte da verdade para quem pode ver,
 * anexar e baixar anexos (US#2.6). Deve ser reaproveitada por qualquer rota que dependa do que o
 * usuário "pode ver", em vez de repetir a regra.
 *
 * Regra:
 *  - Gestor: vê qualquer O.S.;
 *  - Técnico: vê só as O.S. ativas do seu alcance, que são a união de dois conjuntos (US#2.5):
 *      A) "Minhas O.S.": responsavel_id = id do técnico logado;
 *      B) "Não atribuídas do meu departamento": responsavel_id vazio e departamento_id = departamento
 *         do técnico logado.
 *
 * O usuário vem sempre do token (`req.usuario`, preenchido pelo middleware `autenticar`), nunca de
 * parâmetros enviados pelo cliente.
 */
import { AppError } from '../errors/AppError';
import type { Funcionario } from '../models/modelFuncionario';
import type { OrdemServico } from '../models/modelOrdemServico';

/** O que a regra precisa saber do usuário logado. */
export type UsuarioEscopo = Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>;

/** O que a regra precisa saber da O.S. */
export type OrdemEscopo = Pick<OrdemServico, 'responsavel_id' | 'departamento_id' | 'ativo'>;

export class ServiceEscopoOrdemServico {
    /** Conjunto A — "Minhas O.S.": atribuídas ao técnico logado. */
    ehMinha(usuario: UsuarioEscopo, ordem: OrdemEscopo): boolean {
        return ordem.responsavel_id === usuario.id;
    }

    /** Conjunto B — "Não atribuídas do meu departamento". */
    ehNaoAtribuidaDoDepartamento(usuario: UsuarioEscopo, ordem: OrdemEscopo): boolean {
        return ordem.responsavel_id === null && ordem.departamento_id === usuario.departamento_id;
    }

    /** Indica se o usuário pode ver a O.S. (gestor: todas; técnico: A ∪ B, só ativas). */
    podeVer(usuario: UsuarioEscopo, ordem: OrdemEscopo): boolean {
        if (usuario.tipo === 'gestor') {
            return true;
        }
        return ordem.ativo && (this.ehMinha(usuario, ordem) || this.ehNaoAtribuidaDoDepartamento(usuario, ordem));
    }

    /**
     * Garante que o usuário pode ver a O.S.
     * @param mensagem Texto do 403 (padrão genérico).
     * @throws AppError 403 se a O.S. estiver fora do alcance do usuário.
     */
    exigirVisibilidade(
        usuario: UsuarioEscopo,
        ordem: OrdemEscopo,
        mensagem = 'Você não tem permissão para acessar esta O.S.',
    ): void {
        if (!this.podeVer(usuario, ordem)) {
            throw AppError.acessoNegado(mensagem);
        }
    }
}

/** Instância única usada pelos services. */
export const serviceEscopoOrdemServico = new ServiceEscopoOrdemServico();
