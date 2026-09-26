/**
 * cache/funcionarioCache.ts
 *
 * Instância única (singleton) do cache de Funcionario, indexada pelo `id`.
 * Toda a lógica fica em `EntityCache`; aqui só se define a chave, o TTL e a ordenação.
 * Quem usa este cache é o `repositories/repositoryFuncionario.ts` — controllers e services não o acessam.
 */
import { EntityCache } from './EntityCache';
import { env } from '../config/env';
import type { Funcionario } from '../models/modelFuncionario';

export const funcionarioCache = new EntityCache<Funcionario, number>((funcionario) => funcionario.id, {
    ttlMs: env.cacheTtlMs,
    comparar: (a, b) => a.id - b.id,
});
