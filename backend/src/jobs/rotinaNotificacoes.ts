/**
 * jobs/rotinaNotificacoes.ts
 *
 * Rotina que gera as notificações de SLA sozinha, a cada 5 minutos,
 * mesmo sem ninguém com o sistema aberto. Ligada no server.ts.
 */

import { serviceNotificacao } from '../services/serviceNotificacao';

/** De quanto em quanto tempo a rotina roda. */
const INTERVALO_MINUTOS = 5;
const INTERVALO_MS = INTERVALO_MINUTOS * 60 * 1000;

/** Trava para duas rodadas não rodarem ao mesmo tempo (e não gravarem o arquivo juntas). */
let rodadaEmAndamento = false;

/** Uma rodada: gera os avisos novos. Um erro aqui nunca derruba o servidor. */
async function executarRodada(): Promise<void> {
    if (rodadaEmAndamento) {
        return;
    }
    rodadaEmAndamento = true;

    try {
        const criadas = await serviceNotificacao.gerarNotificacoesSla();
        if (criadas > 0) {
            console.log(`[notificacoes] ${criadas} aviso(s) criado(s)`);
        }
    } catch (erro) {
        console.error('[notificacoes] falha na rodada', erro);
    } finally {
        rodadaEmAndamento = false;
    }
}

/** Liga a rotina: roda uma vez agora e depois a cada INTERVALO_MINUTOS. */
export function iniciarRotinaNotificacoes(): void {
    executarRodada();
    setInterval(executarRodada, INTERVALO_MS);
    console.log(`[notificacoes] rotina iniciada (a cada ${INTERVALO_MINUTOS} min)`);
}