/**
 * server.ts
 *
 * Ponto de entrada da API: sobe o servidor HTTP e cuida do desligamento.
 *   Desenvolvimento: npm run dev   (tsx watch server.ts)
 *   Produção:        npm run build && npm start
 *
 * ALTERAÇÃO (16/09/2026): arquivo novo. O `listen` saiu do app.ts, e foi adicionado o
 * encerramento gracioso (fecha o servidor e a conexão com o banco ao receber SIGINT/SIGTERM).
 * Como o cache é write-through, não há nada pendente para gravar no banco ao desligar.
 */
import { criarApp } from './app';
import { env } from './config/env';
import { prisma } from '../prisma/client';

/** Tempo máximo (ms) para o desligamento gracioso antes de forçar a saída. */
const TEMPO_LIMITE_DESLIGAMENTO = 10_000;

/**
 * Sobe o servidor e registra os tratadores de sinal para desligamento.
 */
function iniciar(): void {
    const app = criarApp();
    const servidor = app.listen(env.porta, (erro?: Error) => {
        if (erro) {
            console.error('[servidor] não foi possível iniciar:', erro);
            process.exit(1);
        }
        console.log(`[servidor] rodando na porta ${env.porta}`);
    });

    let encerrando = false;

    /**
     * Para de aceitar conexões, espera as requisições em andamento terminarem e fecha o banco.
     * @param sinal Sinal recebido do sistema operacional.
     */
    const encerrar = (sinal: NodeJS.Signals): void => {
        if (encerrando) {
            return;
        }
        encerrando = true;
        console.log(`[servidor] ${sinal} recebido, encerrando...`);

        setTimeout(() => {
            console.error('[servidor] encerramento demorou demais; saindo à força');
            process.exit(1);
        }, TEMPO_LIMITE_DESLIGAMENTO).unref();

        servidor.close(() => {
            prisma
                .$disconnect()
                .catch((erro: unknown) => console.error('[servidor] erro ao desconectar do banco:', erro))
                .finally(() => process.exit(0));
        });
    };

    process.on('SIGINT', encerrar);
    process.on('SIGTERM', encerrar);
}

iniciar();
