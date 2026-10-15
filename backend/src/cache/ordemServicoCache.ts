/**
 * cache/ordemServicoCache.ts
 *
 * Instância única (singleton) do cache de OrdemServico, indexada pelo `id`.
 * Toda a lógica fica em `EntityCache`; aqui só se define a chave, o TTL e a ordenação.
 * Quem usa este cache é o `repositories/repositoryOrdemServico.ts` — controllers e services não o acessam.
 */
import { EntityCache } from './EntityCache';
import { env } from '../config/env';
import type { OrdemServico } from '../models/modelOrdemServico';

export const ordemServicoCache = new EntityCache<OrdemServico, number>((ordem) => ordem.id, {
    ttlMs: env.cacheTtlMs,
    comparar: (a, b) => a.id - b.id,
});
