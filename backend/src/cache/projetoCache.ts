/**
 * cache/projetoCache.ts
 *
 * Instância única (singleton) do cache de Projeto, indexada pelo `id`.
 * Toda a lógica fica em `EntityCache`; aqui só se define a chave, o TTL e a ordenação.
 * Quem usa este cache é o `repositories/repositoryProjeto.ts` — controllers e services não o acessam.
 */
import { EntityCache } from './EntityCache';
import { env } from '../config/env';
import type { Projeto } from '../models/modelProjeto';

export const projetoCache = new EntityCache<Projeto, number>((projeto) => projeto.id, {
    ttlMs: env.cacheTtlMs,
    comparar: (a, b) => a.id - b.id,
});
