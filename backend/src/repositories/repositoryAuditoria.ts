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
    ): Promise<Auditoria> {
        const registro = await conexao.auditoria.create({ data: dados });
        return registro
    }

    async listarPorOrdemServico(osId: number) {
        return prisma.auditoria.findMany({
            where: {
                os_id: osId,
                tipo_entidade: 'ordem_servico',
            },
            include: {
                funcionarios: {
                    select: {
                        nome: true,
                    },
                },
            },
            orderBy: {
                data_modificacao: 'desc',
            },
        });
    }
}

export const repositoryAuditoria = new RepositoryAuditoria()