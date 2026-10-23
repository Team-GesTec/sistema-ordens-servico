/** DTOs da trilha imutável de auditoria exclusiva de projetos. */
export type AcaoAuditoriaProjeto = 'insercao' | 'atualizacao';

export interface CampoAuditoriaProjeto {
    campo: string;
    antigo: string | null;
    novo: string | null;
    justificativa?: string | null;
}
