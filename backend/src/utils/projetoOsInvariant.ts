import type { Prisma } from '../prisma/generated/client';
import { AppError } from '../errors/AppError';

/**
 * Serializa alterações que podem criar ou manter uma O.S. ativa e não concluída
 * em um projeto. Projetos são bloqueados em ordem crescente para reduzir deadlocks.
 * Deve ser chamada dentro da mesma transação que grava a O.S.
 */
export async function bloquearProjetosRelacionados(
    conexao: Prisma.TransactionClient,
    idsProjeto: Array<number | null | undefined>,
): Promise<Map<number, boolean>> {
    const ids = [...new Set(idsProjeto.filter((id): id is number => Number.isInteger(id) && Number(id) > 0))]
        .sort((a, b) => a - b);
    const estados = new Map<number, boolean>();

    for (const id of ids) {
        const registros = await conexao.$queryRaw<Array<{ id: number; ativo: boolean }>>`
            SELECT "id", "ativo"
            FROM "projetos"
            WHERE "id" = ${id}
            FOR UPDATE
        `;
        const projeto = registros[0];
        if (projeto) estados.set(projeto.id, projeto.ativo);
    }

    return estados;
}

/**
 * Bloqueia novos vínculos com projeto inativo, preservando O.S. já relacionadas.
 * `projetoOriginalId` identifica a relação histórica que pode continuar operando.
 * `estados` deve vir de bloquearProjetosRelacionados na mesma transação.
 */
export function validarProjetoDaOrdem(
    projetoId: number | null,
    ativoOS: boolean,
    statusOS: string,
    estados: Map<number, boolean>,
    projetoOriginalId: number | null = null,
): void {
    if (projetoId === null || !ativoOS || statusOS === 'concluido') return;

    const projetoAtivo = estados.get(projetoId);
    if (projetoAtivo === undefined) {
        throw AppError.requisicaoInvalida('projeto_id não corresponde a um projeto existente.');
    }
    if (!projetoAtivo && projetoId !== projetoOriginalId) {
        throw AppError.conflito(
            'Não é possível criar ou alterar o vínculo para um projeto inativo.',
        );
    }
}

/** Bloqueia a própria linha da O.S. para validar estado atual dentro da transação. */
export async function bloquearOrdemServico(
    conexao: Prisma.TransactionClient,
    id: number,
): Promise<void> {
    await conexao.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "ordens_servico"
        WHERE "id" = ${id}
        FOR UPDATE
    `;
}
