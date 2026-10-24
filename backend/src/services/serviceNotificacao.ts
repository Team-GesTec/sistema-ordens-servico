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

/** Monta o texto do aviso: diz o que aconteceu, sem contagem de tempo que fica velha. */
function montarMensagem(ordem: OrdemServico, tipo: TipoNotificacao): string {
    if (tipo === 'em_risco') {
        return `A O.S. ${ordem.id} (${ordem.titulo}) entrou em risco de SLA.`;
    }
    return `O SLA da O.S. ${ordem.id} (${ordem.titulo}) venceu.`;
}

export class ServiceNotificacao {
    private readonly notificacoes: RepositoryNotificacao;
    private readonly ordens: RepositoryOrdemServico;
    private readonly funcionarios: RepositoryFuncionario;

    constructor(
        notificacoes: RepositoryNotificacao = repositoryNotificacao,
        ordens: RepositoryOrdemServico = repositoryOrdemServico,
        funcionarios: RepositoryFuncionario = repositoryFuncionario,
    ) {
        this.notificacoes = notificacoes;
        this.ordens = ordens;
        this.funcionarios = funcionarios;
    }

    /**
     * Cria os avisos das O.S. que entraram em risco ou venceram.
     * Chamado pela rotina a cada 5 minutos.
     * @param agora O momento de referência. A rotina usa o relógio; um teste pode passar uma data fixa.
     * @returns Quantos avisos novos foram criados.
     */
    async gerarNotificacoesSla(agora: Date = new Date()): Promise<number> {
        // 1. O que já existe
        const existentes = await this.notificacoes.listarTodas();

        // 2. As O.S. ativas e os gestores
        const ordens = (await this.ordens.listar()).filter((ordem) => ordem.ativo);
        const gestores = (await this.funcionarios.listar()).filter((funcionario) => funcionario.tipo === 'gestor');

        const novas: Notificacao[] = [];

        // 3. Para cada O.S.
        for (const ordem of ordens) {
            const estado = calcularEstadoSla(ordem, agora);
            if (estado !== 'em_risco' && estado !== 'vencido') {
                continue;
            }

            // Quem recebe: o responsável; sem responsável, todos os gestores
            const destinatarios =
                ordem.responsavel_id !== null
                    ? [ordem.responsavel_id]
                    : gestores.map((gestor) => gestor.id);

            for (const funcionarioId of destinatarios) {
                const jaExiste = [...existentes, ...novas].some(
                    (notificacao) =>
                        notificacao.os_id === ordem.id &&
                        notificacao.funcionario_id === funcionarioId &&
                        notificacao.tipo === estado,
                );
                if (jaExiste) {
                    continue;
                }

                novas.push({
                    id: randomUUID(),
                    os_id: ordem.id,
                    funcionario_id: funcionarioId,
                    tipo: estado,
                    mensagem: montarMensagem(ordem, estado),
                    data_criacao: agora.toISOString(),
                });
            }
        }

        // 4. Grava uma vez só, e só se houver aviso novo
        if (novas.length > 0) {
            await this.notificacoes.salvarTodas([...existentes, ...novas]);
        }

        return novas.length;
    }

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
}

/** Instância única usada pela rotina e pelo controller. */
export const serviceNotificacao = new ServiceNotificacao();