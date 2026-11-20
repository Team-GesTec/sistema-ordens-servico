import { randomUUID } from 'crypto';
import { connect as conectarTls, type TLSSocket } from 'tls';
import { connect as conectarTcp, type Socket } from 'net';
import type { EmailPendente } from '../models/modelEmail';
import { repositoryEmail, type RepositoryEmail } from '../repositories/repositoryEmail';

export interface TransportadorEmail {
    enviar(email: Pick<EmailPendente, 'para' | 'assunto' | 'html'>): Promise<void>;
}

/** Transporte seguro por padrão: em produção, injete SMTP/API; em dev, a fila fica observável. */
type SocketEmail = Socket | TLSSocket;

export class TransportadorSmtp implements TransportadorEmail {
    async enviar(email: Pick<EmailPendente, 'para' | 'assunto' | 'html'>): Promise<void> {
        const host = process.env.SMTP_HOST?.trim();
        const port = Number(process.env.SMTP_PORT ?? 465);
        const usuario = process.env.SMTP_USER?.trim();
        const senha = process.env.SMTP_PASS;
        const remetente = process.env.SMTP_FROM?.trim() || usuario || '';
        const enderecoRemetente = remetente.match(/<([^>]+)>/)?.[1] ?? remetente;
        const seguro = process.env.SMTP_SECURE !== 'false';
        if (!host || !usuario || !senha || !remetente) throw new Error('SMTP não configurado (SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM).');
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT inválida.');
        if (!seguro && process.env.SMTP_STARTTLS !== 'true') throw new Error('SMTP exige TLS ou STARTTLS.');
        if ([email.para, remetente].some(v => /[\r\n]/.test(v))) throw new Error('Endereço SMTP inválido.');

        let socket: SocketEmail = seguro ? conectarTls({ host, port, servername: host }) : conectarTcp({ host, port });
        socket.setTimeout(15000, () => socket.destroy(new Error('SMTP timeout')));
        try {
        await esperarConexao(socket);
        await comando(socket, 'EHLO sgos.local', 250);
        if (!seguro && process.env.SMTP_STARTTLS === 'true') {
            await comando(socket, 'STARTTLS', 220);
            socket = await atualizarParaTls(socket, host);
            await comando(socket, 'EHLO sgos.local', 250);
        }
        await comando(socket, 'AUTH LOGIN', 334);
        await comando(socket, Buffer.from(usuario).toString('base64'), 334);
        await comando(socket, Buffer.from(senha).toString('base64'), 235);
        await comando(socket, `MAIL FROM:<${enderecoRemetente}>`, 250);
        await comando(socket, `RCPT TO:<${email.para}>`, 250, 251);
        await comando(socket, 'DATA', 354);
        const corpo = [
            `From: ${remetente}`, `To: ${email.para}`, `Subject: =?UTF-8?B?${Buffer.from(email.assunto).toString('base64')}?=`,
            'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', '', email.html.replace(/^\./gm, '..'), '.',
        ].join('\r\n');
        await comando(socket, corpo, 250);
        } finally { socket.destroy(); }
    }
}

function esperarConexao(socket: SocketEmail): Promise<void> {
    return new Promise((resolve, reject) => {
        const erro = (value: Error) => { socket.destroy(); reject(value); };
        socket.once('error', erro);
        socket.once('data', (data: Buffer) => {
            socket.removeListener('error', erro);
            const resposta = data.toString();
            if (!resposta.startsWith('220')) { socket.destroy(); reject(new Error(`SMTP saudação inválida: ${resposta.trim()}`)); return; }
            resolve();
        });
    });
}

function comando(socket: SocketEmail, texto: string, ...codigos: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const timer = setTimeout(() => falhar(new Error('SMTP timeout')), 15000);
        const fechado = () => falhar(new Error('SMTP conexão encerrada'));
        const limpar = () => { clearTimeout(timer); socket.removeListener('close', fechado); socket.removeListener('data', receber); socket.removeListener('error', falhar); };
        const falhar = (erro: Error) => { limpar(); reject(erro); };
        const receber = (data: Buffer) => {
            buffer += data.toString();
            const linhas = buffer.split(/\r?\n/);
            buffer = linhas.pop() ?? '';
            for (const linha of linhas) {
                const codigo = Number(linha.slice(0, 3));
                if (linha[3] === '-') continue;
                if (!codigos.includes(codigo)) { falhar(new Error(`SMTP recusou comando: ${codigo}`)); return; }
                limpar(); resolve(); return;
            }
        };
        socket.on('data', receber);
        socket.once('error', falhar);
        socket.once('close', fechado);
        socket.write(`${texto}\r\n`);
    });
}

function atualizarParaTls(socket: SocketEmail, host: string): Promise<TLSSocket> {
    return new Promise((resolve, reject) => {
        const tlsSocket = conectarTls({ socket, servername: host });
        tlsSocket.once('secureConnect', () => resolve(tlsSocket));
        tlsSocket.once('error', reject);
    });
}

const atraso = (tentativas: number) => Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(0, tentativas - 1));

export class ServiceEmail {
    private processamento: Promise<void> = Promise.resolve();
    constructor(
        private readonly repositorio: RepositoryEmail = repositoryEmail,
        private readonly transportador: TransportadorEmail = new TransportadorSmtp(),
        private readonly maxTentativas = 3,
    ) {}

    async enfileirar(dados: Omit<EmailPendente, 'id' | 'tentativas' | 'estado' | 'proxima_tentativa_em' | 'criado_em'>): Promise<EmailPendente> {
        const tarefa = this.processamento.then(() => this.enfileirarAgora(dados));
        this.processamento = tarefa.then(() => undefined, () => undefined);
        return tarefa;
    }

    private async enfileirarAgora(dados: Omit<EmailPendente, 'id' | 'tentativas' | 'estado' | 'proxima_tentativa_em' | 'criado_em'>): Promise<EmailPendente> {
        const lista = await this.repositorio.listar();
        const existente = lista.find((email) => email.evento_id === dados.evento_id && email.destinatario_id === dados.destinatario_id);
        if (existente) return existente;
        const agora = new Date().toISOString();
        const email: EmailPendente = { ...dados, id: randomUUID(), tentativas: 0, estado: 'pendente', proxima_tentativa_em: agora, criado_em: agora };
        await this.repositorio.salvar([...lista, email]);
        return email;
    }

    /** Processa fora da operação principal. Cada falha fica registrada e será tentada novamente. */
    processar(agora = new Date()): Promise<void> {
        const proximo = this.processamento.then(() => this.processarAgora(agora));
        this.processamento = proximo.catch(() => undefined);
        return proximo;
    }

    private async processarAgora(agora: Date): Promise<void> {
        const lista = await this.repositorio.listar();
        let mudou = false;
        for (const email of lista) {
            if (email.estado === 'enviado' || email.tentativas >= this.maxTentativas || new Date(email.proxima_tentativa_em) > agora) continue;
            email.estado = 'enviando'; email.tentativas += 1; mudou = true;
            await this.repositorio.salvar(lista);
            try {
                await this.transportador.enviar(email);
                email.estado = 'enviado'; email.enviado_em = new Date().toISOString(); delete email.ultimo_erro;
            } catch (erro) {
                email.estado = 'falhou'; email.ultimo_erro = erro instanceof Error ? erro.message : String(erro);
                email.proxima_tentativa_em = new Date(agora.getTime() + atraso(email.tentativas)).toISOString();
                if (email.tentativas < this.maxTentativas) email.estado = 'pendente';
            }
        }
        if (mudou) await this.repositorio.salvar(lista);
    }
}

export const serviceEmail = new ServiceEmail();
