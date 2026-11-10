import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import path from 'path';
import type { EmailPendente } from '../models/modelEmail.js';

const pasta = path.resolve(__dirname, '../../data');
const arquivo = path.join(pasta, 'emails.json');

export class RepositoryEmail {
    async listar(): Promise<EmailPendente[]> {
        try { return JSON.parse(await readFile(arquivo, 'utf8')) as EmailPendente[]; }
        catch (erro) { if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return []; throw erro; }
    }
    async salvar(lista: EmailPendente[]): Promise<void> {
        await mkdir(pasta, { recursive: true });
        const temporario = `${arquivo}.${process.pid}.tmp`;
        await writeFile(temporario, JSON.stringify(lista, null, 2), 'utf8');
        await rename(temporario, arquivo);
    }
}

export const repositoryEmail = new RepositoryEmail();
