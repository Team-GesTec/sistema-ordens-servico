/**
 * cache/departamentoCache.ts
 *
 * Instância única (singleton) do cache de Departamento, indexada pelo `id`.
 * Toda a lógica fica em `EntityCache`; aqui só se define a chave, o TTL e a ordenação.
 * Quem usa este cache é o `repositories/repositoryDepartamento.ts` — controllers e services não o acessam.
 */
import { EntityCache } from './EntityCache';
import { env } from '../config/env';
import type { Departamento } from '../models/modelDepartamento';

export const departamentoCache = new EntityCache<Departamento, number>((departamento) => departamento.id, {
    ttlMs: env.cacheTtlMs,
    comparar: (a, b) => a.id - b.id,
});
