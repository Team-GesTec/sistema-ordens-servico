/* Responsável por gravar na tabela auditoria
Nâo possui função de editar ou excluir, conforme critério de que o registro deve ser imutável
*/
import { prisma } from '../../prisma/client';
import type { Prisma } from '../../prisma/generated/client';
import type { Auditoria, DadosRegistroAuditoria } from '../models/modelAuditoria';

export class RepositoryAuditoria {
    async registrar(
        dados: DadosRegistroAuditoria,
        conexao: Prisma.TransactionCliente = prisma,
    ): Promise<Auditoria>{
        const registro = await conexao.auditoria.create({data:dados});
        return registro
    }
}

export const repositoryAuditoria = new RepositoryAuditoria()