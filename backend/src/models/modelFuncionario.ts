/**
 * models/modelFuncionario.ts
 *
 * Tipos públicos e de escrita de Funcionário. `senha_hash` fica restrito ao login.
 */
import type { funcionarios } from '../prisma/generated/client';
import { tipo_perfil } from '../prisma/generated/enums';

/** Perfis de acesso válidos (espelho do enum `tipo_perfil`: gestor, tecnico). */
export const PERFIS_FUNCIONARIO = Object.values(tipo_perfil);
export type PerfilFuncionario = tipo_perfil;
export const PERFIL_PADRAO: PerfilFuncionario = tipo_perfil.tecnico;

/** Registro completo, com hash, usado exclusivamente pelo fluxo de autenticação. */
export type FuncionarioComSenha = funcionarios;

/** Contrato público/cache: nunca inclui `senha_hash`. */
export type Funcionario = Omit<funcionarios, 'senha_hash'>;

/** Dados validados para criação; `senha_hash` já está protegido por hash. */
export interface DadosCriacaoFuncionario {
    departamento_id: number;
    usuario: string;
    senha_hash: string;
    nome: string;
    tipo: PerfilFuncionario;
    ativo: boolean;
}

/** Dados atualizáveis. O estado `ativo` é controlado por endpoints dedicados. */
export type DadosAtualizacaoFuncionario = Partial<Omit<DadosCriacaoFuncionario, 'ativo'>>;
