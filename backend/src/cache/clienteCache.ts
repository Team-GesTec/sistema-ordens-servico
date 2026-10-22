/**
 * cache/clienteCache.ts
 *
 * Instância única (singleton) do cache de Cliente, indexada pelo `id`.
 * Toda a lógica fica em `EntityCache`; aqui só se define a chave, o TTL e a ordenação.
 * Quem usa este cache é o `repositories/repositoryCliente.ts` — controllers e services não o acessam.
 */
import { EntityCache } from './EntityCache';
import { env } from '../config/env';
import type { Cliente } from '../models/modelCliente';

export const clienteCache = new EntityCache<Cliente, number>((cliente) => cliente.id, {
    ttlMs: env.cacheTtlMs,
    comparar: (a, b) => a.id - b.id,
});