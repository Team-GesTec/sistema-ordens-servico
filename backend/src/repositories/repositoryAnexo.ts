/**
 * repositories/repositoryAnexo.ts
 *
 * Acesso a dados dos anexos: ÚNICO lugar que fala com `prisma.anexos` (US#2.6).
 * Guarda só os metadados; o arquivo fica no Supabase Storage (ver repositoryStorageAnexo.ts).
 *
 * Sem cache: a lista de anexos de uma O.S. precisa refletir na hora cada inclusão, e as consultas
 * são pequenas e indexadas (`idx_anexos_os_data`).
 *
 * ALTERAÇÕES (19/10/2026):
 *  - 2.6-BE02: `listarPorOrdem` e `buscarNaOrdem` para a consulta e o download. Não há método de
 *    exclusão (fora de escopo da US#2.6).
 */
import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type { AnexoComAutor, DadosCriacaoAnexo } from '../models/modelAnexo';

/** Inclui o autor (id e nome) junto com o anexo. */
const COM_AUTOR = { funcionarios: { select: { id: true, nome: true } } } as const;

/**
 * Chave do lock transacional dos anexos (pg_advisory_xact_lock(chave, os_id)).
 * Serializa os uploads de uma mesma O.S. para a contagem do limite de quantidade não ser burlada
 * por envios simultâneos. O lock é liberado sozinho no fim da transação.
 */
const CHAVE_LOCK_ANEXOS = 2601; // "26-01" = US#2.6, BE01

export class RepositoryAnexo {
    /** Conta quantos anexos a O.S. já tem. */
    async contarPorOrdem(osId: number, conexao: Prisma.TransactionClient = prisma): Promise<number> {
        return conexao.anexos.count({ where: { os_id: osId } });
    }

    /**
     * Bloqueia, até o fim da transação, outros uploads para a mesma O.S.
     * Deve ser chamado dentro de `prisma.$transaction`.
     */
    async travarOrdem(osId: number, conexao: Prisma.TransactionClient): Promise<void> {
        await conexao.$executeRaw`SELECT pg_advisory_xact_lock(${CHAVE_LOCK_ANEXOS}::int, ${osId}::int)`;
    }

    /** Lista os anexos da O.S. com o autor, mais recentes primeiro. */
    async listarPorOrdem(osId: number): Promise<AnexoComAutor[]> {
        return prisma.anexos.findMany({
            where: { os_id: osId },
            include: COM_AUTOR,
            orderBy: [{ data_upload: 'desc' }, { id: 'desc' }],
        });
    }

    /** Busca um anexo que pertença à O.S. informada. Devolve `null` se não existir nessa O.S. */
    async buscarNaOrdem(id: number, osId: number): Promise<AnexoComAutor | null> {
        return prisma.anexos.findFirst({ where: { id, os_id: osId }, include: COM_AUTOR });
    }

    /** Grava os metadados do anexo dentro da transação do upload. */
    async criar(dados: DadosCriacaoAnexo, conexao: Prisma.TransactionClient): Promise<AnexoComAutor> {
        try {
            return await conexao.anexos.create({ data: dados, include: COM_AUTOR });
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                referenciaInvalida: 'os_id ou funcionario_id não corresponde a um registro existente',
                valorDuplicado: 'Já existe um anexo gravado neste caminho do armazenamento',
            });
        }
    }
}

/** Instância única usada pelos services. */
export const repositoryAnexo = new RepositoryAnexo();
