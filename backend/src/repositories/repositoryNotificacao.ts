/**
 * repositories/repositoryNotificacao.ts
 *
 * Único lugar que lê e grava as notificações (MVP: arquivo JSON, não o banco).
 * Só a rotina de SLA grava; a rota da barra lateral só lê.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { Notificacao } from '../models/modelNotificacao.js';

/** Pasta e arquivo onde as notificações ficam guardadas (backend/data/notificacoes.json). */
const PASTA_DADOS = path.resolve(__dirname, '../../data');
const ARQUIVO_NOTIFICACOES = path.join(PASTA_DADOS, 'notificacoes.json');
const ARQUIVO_DISPENSADAS = path.join(PASTA_DADOS, 'notificacoes-dispensadas.json');

export class RepositoryNotificacao {
    /** Lê todas as notificações. Se o arquivo ainda não existe, devolve uma lista vazia. */
    async listarTodas(): Promise<Notificacao[]> {
        try {
            const conteudo = await readFile(ARQUIVO_NOTIFICACOES, 'utf-8');
            return (JSON.parse(conteudo) as Notificacao[]).map((item) => ({ ...item, lida: item.lida ?? false }));
        } catch (erro) {
            if ((erro as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw erro;
        }
    }

    /** Notificações de um funcionário, das mais novas para as mais antigas. */
    async listarPorFuncionario(funcionarioId: number): Promise<Notificacao[]> {
        const todas = await this.listarTodas();
        return todas
            .filter((notificacao) => notificacao.funcionario_id === funcionarioId)
            .sort((a, b) => b.data_criacao.localeCompare(a.data_criacao));
    }

    async listarDispensadas(funcionarioId: number): Promise<string[]> {
        try {
            const conteudo = await readFile(ARQUIVO_DISPENSADAS, 'utf-8');
            const dispensadas = JSON.parse(conteudo) as Record<string, string[]>;

            return dispensadas[String(funcionarioId)] ?? [];
        } catch (erro) {
            if ((erro as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw erro;
        }
    }

    async salvarDispensadas(
        funcionarioId: number,
        notificacaoId: string,
    ): Promise<void> {
        let dispensadas: Record<string, string[]> = {};

        try {
            const conteudo = await readFile(ARQUIVO_DISPENSADAS, 'utf-8');
            dispensadas = JSON.parse(conteudo) as Record<string, string[]>;
        } catch (erro) {
            if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw erro;
            }
        }

        const ids = dispensadas[String(funcionarioId)] ?? [];

        if (!ids.includes(notificacaoId)) {
            dispensadas[String(funcionarioId)] = [...ids, notificacaoId];
        }

        await mkdir(PASTA_DADOS, { recursive: true });
        await writeFile(
            ARQUIVO_DISPENSADAS,
            JSON.stringify(dispensadas, null, 2),
            'utf-8',
        );
    }

    /** Grava a lista inteira no arquivo, substituindo o conteúdo anterior. */
    async salvarTodas(notificacoes: Notificacao[]): Promise<void> {
        await mkdir(PASTA_DADOS, { recursive: true });
        await writeFile(ARQUIVO_NOTIFICACOES, JSON.stringify(notificacoes, null, 2), 'utf-8');
    }

    async marcarComoLida(funcionarioId: number, notificacaoId: string): Promise<boolean> {
        const lista = await this.listarTodas();
        const item = lista.find((n) => n.id === notificacaoId && n.funcionario_id === funcionarioId);
        if (!item) return false;
        item.lida = true;
        await this.salvarTodas(lista);
        return true;
    }

    async marcarTodasComoLidas(funcionarioId: number): Promise<number> {
        const lista = await this.listarTodas();
        let total = 0;
        for (const item of lista) {
            if (item.funcionario_id === funcionarioId && !item.lida) { item.lida = true; total += 1; }
        }
        if (total) await this.salvarTodas(lista);
        return total;
    }
}

/** Instância única usada pelo service. */
export const repositoryNotificacao = new RepositoryNotificacao();
