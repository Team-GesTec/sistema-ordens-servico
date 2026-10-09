/**
 *  - só grava: não existe método para alterar nem excluir registros;
 *  - deve ser chamado dentro da transação da operação auditada,
 *    recebendo a conexão dessa transação.
 */

import { repositoryAuditoria, type RepositoryAuditoria } from '../repositories/repositoryAuditoria';
import type { Auditoria, DadosRegistroAuditoria } from '../models/modelAuditoria';
import type { Prisma } from '../../prisma/generated/client';

export class ServiceAuditoria {
    private readonly repositorio: RepositoryAuditoria;

    constructor(repositorio: RepositoryAuditoria = repositoryAuditoria) {
        this.repositorio = repositorio;
    }

    async registrar(
        dados: DadosRegistroAuditoria,
        conexao: Prisma.TransactionClient,
    ): Promise<Auditoria> {
        return this.repositorio.registrar(dados, conexao);
    }
}

export const serviceAuditoria = new ServiceAuditoria();