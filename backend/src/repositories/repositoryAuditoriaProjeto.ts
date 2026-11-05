/** Escrita da auditoria de projetos; sempre participa da transação da operação de negócio. */
import type { Prisma } from '../prisma/generated/client';
import type { AcaoAuditoriaProjeto, CampoAuditoriaProjeto } from '../models/modelAuditoriaProjeto';

export class RepositoryAuditoriaProjeto {
    async registrarCampos(
        tx: Prisma.TransactionClient,
        projetoId: number,
        funcionarioId: number,
        acao: AcaoAuditoriaProjeto,
        campos: CampoAuditoriaProjeto[],
    ): Promise<void> {
        for (const campo of campos) {
            await tx.auditoria_projetos.create({
                data: {
                    projeto_id: projetoId,
                    funcionario_id: funcionarioId,
                    acao,
                    campo_alterado: campo.campo,
                    dado_antigo: campo.antigo,
                    dado_novo: campo.novo,
                    justificativa: campo.justificativa ?? null,
                },
            });
        }
    }
}

export const repositoryAuditoriaProjeto = new RepositoryAuditoriaProjeto();
