/* Responsável por gravar na tabela auditoria
Nâo possui função de editar ou excluir, conforme critério de que o registro deve ser imutável
*/
import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import type { Auditoria, DadosRegistroAuditoria } from '../models/modelAuditoria';

export class RepositoryAuditoria {
    async registrar(
        dados: DadosRegistroAuditoria,
        conexao: Prisma.TransactionClient = prisma,
    ): Promise<Auditoria>{
        const registro = await conexao.auditoria.create({data:dados});
        return registro
    }

    /** Consulta imutável do histórico real de uma O.S., incluindo apenas a identidade pública do autor. */
    async listarPorOrdemServico(osId: number) {
        return prisma.auditoria.findMany({
            where: { os_id: osId },
            select: {
                id: true,
                os_id: true,
                funcionario_id: true,
                data_modificacao: true,
                acao: true,
                campo_alterado: true,
                dado_antigo: true,
                dado_novo: true,
                justificativa: true,
                funcionarios: { select: { id: true, nome: true, usuario: true } },
            },
            orderBy: [{ data_modificacao: 'desc' }, { id: 'desc' }],
        });
    }
}

export const repositoryAuditoria = new RepositoryAuditoria()