/**
 * services/serviceNotificacao.ts
 *
 * Notificações de SLA (MVP da Sprint 2).
 *
 * Regras:
 *  - gera aviso quando a O.S. ativa entra em risco ou vence (usa calcularEstadoSla);
 *  - quem recebe: o responsável; sem responsável, todos os gestores;
 *  - no máximo um aviso por O.S., pessoa e tipo (sem repetir a cada rodada);
 *  - sem controle de lida/não lida (fica para a próxima sprint).
 */

import { randomUUID } from 'crypto';
import { repositoryNotificacao, type RepositoryNotificacao } from '../repositories/repositoryNotificacao';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import { calcularEstadoSla } from '../utils/estadoSla';
import type { Notificacao, TipoNotificacao } from '../models/modelNotificacao';
import type { OrdemServico } from '../models/modelOrdemServico';
import { serviceEmail, type ServiceEmail } from './serviceEmail';
import { templateNotificacaoOrdem } from './templatesEmail';

/** Monta o texto do aviso: diz o que aconteceu, sem contagem de tempo que fica velha. */
function montarMensagem(ordem: OrdemServico, tipo: TipoNotificacao, extra?: string): string {
    if (tipo === 'em_risco') {
        return `A O.S. ${ordem.id} (${ordem.titulo}) entrou em risco de SLA.`;
    }
    if (tipo === 'status_alterado') return `O status da O.S. ${ordem.id} (${ordem.titulo}) foi alterado para ${extra}.`;
    if (tipo === 'responsavel_atribuido') return `Você foi atribuído à O.S. ${ordem.id} (${ordem.titulo}).`;
    return `O SLA da O.S. ${ordem.id} (${ordem.titulo}) venceu.`;
}

export class ServiceNotificacao {
    private readonly notificacoes: RepositoryNotificacao;
    private readonly ordens: RepositoryOrdemServico;
    private readonly funcionarios: RepositoryFuncionario;
    private readonly emails: ServiceEmail;

    constructor(
        notificacoes: RepositoryNotificacao = repositoryNotificacao,
        ordens: RepositoryOrdemServico = repositoryOrdemServico,
        funcionarios: RepositoryFuncionario = repositoryFuncionario,
        emails: ServiceEmail = serviceEmail,
    ) {
        this.notificacoes = notificacoes;
        this.ordens = ordens;
        this.funcionarios = funcionarios;
        this.emails = emails;
    }

    /**
     * Cria os avisos das O.S. que entraram em risco ou venceram.
     * Chamado pela rotina a cada 5 minutos.
     * @param agora O momento de referência. A rotina usa o relógio; um teste pode passar uma data fixa.
     * @returns Quantos avisos novos foram criados.
     */
    async gerarNotificacoesSla(agora: Date = new Date(), atorId?: number, osId?: number): Promise<number> {
        // 1. O que já existe
        const existentes = await this.notificacoes.listarTodas();

        // 2. As O.S. ativas e os gestores
        const ordens = (await this.ordens.listar()).filter((ordem) => ordem.ativo && (osId === undefined || ordem.id === osId));
        const gestores = (await this.funcionarios.listar()).filter((funcionario) => funcionario.tipo === 'gestor');

        const novas: Notificacao[] = [];

        // 3. Para cada O.S.
        for (const ordem of ordens) {
            const estado = calcularEstadoSla(ordem, agora);
            const eventoId = `sla:${ordem.id}:${estado}:${ordem.data_limite_sla?.toISOString()}`;
            if (estado !== 'em_risco' && estado !== 'vencido') {
                continue;
            }

            // SLA vai ao responsável, a quem abriu e aos Gestores.
            // O contrato persistido sempre possui solicitante_id; o fallback mantém
            // compatibilidade com doubles do MVP que só modelavam responsável/gestor.
            const destinatarios = [...new Set(ordem.solicitante_id === undefined
                ? (ordem.responsavel_id !== null ? [ordem.responsavel_id] : gestores.map((gestor) => gestor.id))
                : [ordem.responsavel_id, ordem.solicitante_id, ...gestores.map((gestor) => gestor.id)]
            .filter((id): id is number => id !== null && id !== undefined && id !== atorId))];

            for (const funcionarioId of destinatarios) {
                const jaExiste = [...existentes, ...novas].some(
                    (notificacao) =>
                        notificacao.os_id === ordem.id &&
                        notificacao.funcionario_id === funcionarioId &&
                        notificacao.tipo === estado && notificacao.evento_id === eventoId,
                );
                if (jaExiste) {
                    await this.enviarEmail(ordem, funcionarioId, estado, eventoId);
                    continue;
                }

                novas.push({
                    id: randomUUID(),
                    os_id: ordem.id,
                    funcionario_id: funcionarioId,
                    tipo: estado,
                    mensagem: montarMensagem(ordem, estado),
                    data_criacao: agora.toISOString(),
                    evento_id: eventoId,
                    lida: false,
                });
                await this.enviarEmail(ordem, funcionarioId, estado, eventoId);
            }
        }

        // 4. Grava uma vez só, e só se houver aviso novo
        if (novas.length > 0) {
            await this.notificacoes.salvarTodas([...existentes, ...novas]);
        }

        return novas.length;
    }

    async publicarEvento(
        ordem: OrdemServico,
        tipo: Extract<TipoNotificacao, 'status_alterado' | 'responsavel_atribuido'>,
        atorId: number,
        extra?: string,
    ): Promise<number> {
        const destinatarios = [...new Set([ordem.responsavel_id, ordem.solicitante_id]
            .filter((id): id is number => id !== null && id !== atorId))];
        const eventoId = `${tipo}:${ordem.id}:${randomUUID()}`;
        const existentes = await this.notificacoes.listarTodas();
        const novas: Notificacao[] = [];
        for (const funcionarioId of destinatarios) {
            if (existentes.some((n) => n.evento_id === eventoId && n.funcionario_id === funcionarioId)) continue;
            novas.push({ id: randomUUID(), os_id: ordem.id, funcionario_id: funcionarioId, tipo, mensagem: montarMensagem(ordem, tipo, extra), data_criacao: new Date().toISOString(), evento_id: eventoId, lida: false });
            await this.enviarEmail(ordem, funcionarioId, tipo, eventoId, extra);
        }
        if (novas.length) await this.notificacoes.salvarTodas([...existentes, ...novas]);
        return novas.length;
    }

    private async enviarEmail(ordem: OrdemServico, funcionarioId: number, tipo: TipoNotificacao, eventoId: string, extra?: string): Promise<void> {
        try {
            if (typeof this.funcionarios.buscarPorId !== 'function') return;
            const funcionario = await this.funcionarios.buscarPorId(funcionarioId);
            const email = funcionario && 'email' in funcionario ? String((funcionario as unknown as { email?: string }).email ?? '') : '';
            const usuario = funcionario && 'usuario' in funcionario ? String(funcionario.usuario) : '';
            const para = email.includes('@') ? email : usuario.includes('@') ? usuario : '';
            if (!para) return;
            const mensagem = montarMensagem(ordem, tipo, extra);
            const template = templateNotificacaoOrdem(tipo, mensagem);
            await this.emails.enfileirar({ evento_id: eventoId, destinatario_id: funcionarioId, para, ...template });
            // Primeira tentativa acontece logo após o enfileiramento; a rotina periódica
            // continua responsável pelas novas tentativas após falhas.
            void this.emails.processar().catch(() => console.error('[email] falha no processamento da fila'));
        } catch (erro) { console.error('[notificacoes] falha ao enfileirar e-mail', erro); }
    }

    /** Avisos de um funcionário, dos mais novos para os mais antigos. */
    async listarDoFuncionario(funcionarioId: number): Promise<Notificacao[]> {
        const [notificacoes, dispensadas] = await Promise.all([
            this.notificacoes.listarPorFuncionario(funcionarioId),
            this.notificacoes.listarDispensadas(funcionarioId),
        ]);

        return notificacoes.filter(
            (notificacao) => !dispensadas.includes(notificacao.id),
        );
    }

    async dispensarNotificacao(
        funcionarioId: number,
        notificacaoId: string,
    ): Promise<void> {
        const notificacoes = await this.notificacoes.listarPorFuncionario(funcionarioId);

        const pertenceAoFuncionario = notificacoes.some(
            (notificacao) => notificacao.id === notificacaoId,
        );

        if (!pertenceAoFuncionario) {
            const { AppError } = await import('../errors/AppError.js');
            throw AppError.naoEncontrado('Notificação não encontrada.');
        }

        await this.notificacoes.salvarDispensadas(funcionarioId, notificacaoId);
    }

    async marcarComoLida(funcionarioId: number, notificacaoId: string): Promise<void> {
        const ok = await this.notificacoes.marcarComoLida(funcionarioId, notificacaoId);
        if (!ok) { const { AppError } = await import('../errors/AppError.js'); throw AppError.naoEncontrado('Notificação não encontrada.'); }
    }

    marcarTodasComoLidas(funcionarioId: number): Promise<number> { return this.notificacoes.marcarTodasComoLidas(funcionarioId); }
}

/** Instância única usada pela rotina e pelo controller. */
export const serviceNotificacao = new ServiceNotificacao();
