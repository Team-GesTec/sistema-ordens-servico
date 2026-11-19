/**
 * jobs/rotinaArquivamento.ts
 *
 * Arquiva as O.S. concluídas há 14 dias ou mais (US#2.11). Roda ao subir o servidor e a cada 1 hora.
 */

import { serviceOrdemServico } from '../services/serviceOrdemServico';

const INTERVALO_MS = 60 * 60 * 1000;

let rodadaEmAndamento = false;

async function executarRodada(): Promise<void> {
    if (rodadaEmAndamento) {
        return;
    }
    rodadaEmAndamento = true;

    try {
        const arquivadas = await serviceOrdemServico.arquivarConcluidas();
        if (arquivadas > 0) {
            console.log(`[arquivamento] ${arquivadas} O.S. arquivada(s)`);
        }
    } catch (erro) {
        console.error('[arquivamento] falha na rodada', erro);
    } finally {
        rodadaEmAndamento = false;
    }
}

export function iniciarRotinaArquivamento(): void {
    void executarRodada();
    setInterval(executarRodada, INTERVALO_MS).unref();
    console.log('[arquivamento] rotina iniciada (a cada 1 hora)');
}
