import type { auditoria } from '../../prisma/generated/client';

export type Auditoria = auditoria;

export interface DadosRegistroAuditoria {
    os_id: number;
    funcionario_id: number;
    acao: auditoria['acao'];
    campo_alterado?: string | null;
    dado_antigo?: string | null;
    dado_novo?: string | null;
    justificativa?: string | null;
}