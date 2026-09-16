/**
 * models/modelFuncionario.ts
 *
 * Tipos do objeto Funcionário.
 *
 * ALTERAÇÃO (16/09/2026): o model deixou de ser um array em memória com campos em camelCase
 * (`idFuncionario`, `usuarioFuncionario`, `senhaFuncionario`, `papelFuncionario`...). Agora usa
 * os nomes do schema.prisma: `id`, `departamento_id`, `usuario`, `senha_hash`, `nome`, `tipo`.
 * A lista de perfis (`PERFIS_FUNCIONARIO`) passou a ser lida do enum gerado pelo Prisma, então
 * nunca fica diferente do banco.
 */
import type { funcionarios } from '../prisma/generated/client';
import { tipo_perfil } from '../prisma/generated/enums';

/** Perfis de acesso válidos (espelho do enum `tipo_perfil`: gestor, analista, tecnico). */
export const PERFIS_FUNCIONARIO = Object.values(tipo_perfil);

/** Um dos perfis de acesso. */
export type PerfilFuncionario = tipo_perfil;

/** Perfil atribuído quando o cadastro não informa `tipo` (mesmo default do schema). */
export const PERFIL_PADRAO: PerfilFuncionario = tipo_perfil.tecnico;

/**
 * Registro COMPLETO, incluindo `senha_hash`.
 * Uso restrito ao login (`serviceAuth`). Nunca deve ser devolvido pela API nem ir para o cache.
 */
export type FuncionarioComSenha = funcionarios;

/** Funcionário como a API devolve e como fica no cache — SEM `senha_hash`. */
export type Funcionario = Omit<funcionarios, 'senha_hash'>;

/** Dados validados para criar um funcionário (a senha já chega aqui como hash). */
export interface DadosCriacaoFuncionario {
    departamento_id: number;
    usuario: string;
    senha_hash: string;
    nome: string;
    tipo: PerfilFuncionario;
}

/** Dados validados para atualizar um funcionário (só os campos presentes são alterados). */
export type DadosAtualizacaoFuncionario = Partial<DadosCriacaoFuncionario>;
