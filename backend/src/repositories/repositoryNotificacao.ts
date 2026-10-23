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
const PASTA_DADOS = path.resolve(process.cwd(), 'data');
const ARQUIVO_NOTIFICACOES = path.join(PASTA_DADOS, 'notificacoes.json');

export class RepositoryNotificacao {
    /** Lê todas as notificações. Se o arquivo ainda não existe, devolve uma lista vazia. */
    async listarTodas(): Promise<Notificacao[]> {
        try {
            const conteudo = await readFile(ARQUIVO_NOTIFICACOES, 'utf-8');
            return JSON.parse(conteudo) as Notificacao[];
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

    /** Grava a lista inteira no arquivo, substituindo o conteúdo anterior. */
    async salvarTodas(notificacoes: Notificacao[]): Promise<void> {
        await mkdir(PASTA_DADOS, { recursive: true });
        await writeFile(ARQUIVO_NOTIFICACOES, JSON.stringify(notificacoes, null, 2), 'utf-8');
    }
}

/** Instância única usada pelo service. */
export const repositoryNotificacao = new RepositoryNotificacao();