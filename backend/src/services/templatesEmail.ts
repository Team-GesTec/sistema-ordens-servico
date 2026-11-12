import type { TipoNotificacao } from '../models/modelNotificacao';

export function templateNotificacaoOrdem(tipo: TipoNotificacao, mensagem: string): { assunto: string; html: string } {
    const assunto = tipo === 'sla_critica' ? 'SLA em risco' : tipo === 'sla_expirada' ? 'SLA vencido' : tipo === 'responsavel_definido' ? 'Nova atribuição de O.S.' : 'Status de O.S. atualizado';
    return {
        assunto,
        html: `<main><h2>${assunto}</h2><p>${mensagem}</p><p>Consulte o SGOS para mais detalhes.</p></main>`,
    };
}
