/**
 * repositories/repositoryStorageAnexo.ts
 *
 * Acesso ao Supabase Storage: ÚNICO lugar que fala com o bucket dos anexos (US#2.6).
 *
 * Usa a API REST do Storage (`/storage/v1/object/...`) com o `fetch` nativo do Node, autenticada
 * pela chave secreta (service_role) — que fica só no backend. O bucket é PRIVADO: nenhum arquivo é
 * acessível por URL pública; o download sempre passa pela API, que confere a permissão antes.
 *
 * Erros do provedor nunca chegam ao cliente: são registrados no console e viram `AppError` com
 * mensagem padronizada (413 para arquivo grande demais, 503 para indisponibilidade/configuração).
 *
 * Por que não o SDK `@supabase/supabase-js`: as três operações necessárias (enviar, baixar, remover)
 * são chamadas HTTP simples; o `fetch` evita uma dependência a mais.
 *
 * ALTERAÇÕES (19/10/2026):
 *  - 2.6-BE02: `baixar` devolve o arquivo como stream (sem carregar os 50MB na memória). O tempo
 *    limite passa a valer até o Storage começar a responder, para não cortar downloads lentos.
 */
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { TAMANHO_MAXIMO_ANEXO_BYTES } from '../models/modelAnexo';

/** Tempo máximo até o Storage começar a responder (o envio de 50MB precisa de folga). */
const TEMPO_LIMITE_MS = 120_000;

/** Operações de armazenamento usadas pelo service — permite trocar por uma versão em memória nos testes. */
export interface ArmazenamentoAnexos {
    /** Grava o arquivo no bucket. Nunca sobrescreve um objeto existente. */
    enviar(caminho: string, conteudo: Buffer, tipo: string): Promise<void>;
    /** Remove o objeto do bucket (usado na compensação de um upload que falhou no banco). */
    remover(caminho: string): Promise<void>;
    /** Abre o arquivo para download, como stream. */
    baixar(caminho: string): Promise<ArquivoArmazenado>;
}

/** Arquivo lido do Storage. */
export interface ArquivoArmazenado {
    conteudo: Readable;
    /** Tamanho informado pelo Storage (Content-Length), ou `null` se ele não informou. */
    tamanho: number | null;
}

/** Corpo de erro devolvido pelo Storage (ex.: `{ "statusCode": "413", "error": "Payload too large" }`). */
interface ErroStorage {
    statusCode?: string | number;
    error?: string;
    message?: string;
}

/** Erro padronizado para qualquer falha de comunicação com o Storage. */
function armazenamentoIndisponivel(): AppError {
    return new AppError('Não foi possível acessar o armazenamento de anexos no momento. Tente novamente.', 503);
}

export class RepositoryStorageAnexo implements ArmazenamentoAnexos {
    async enviar(caminho: string, conteudo: Buffer, tipo: string): Promise<void> {
        const resposta = await this.chamar('POST', caminho, {
            headers: { 'Content-Type': tipo, 'x-upsert': 'false', 'Cache-Control': 'no-store' },
            // O Buffer do multer é sempre apoiado num ArrayBuffer comum (nunca SharedArrayBuffer)
            body: conteudo as Uint8Array<ArrayBuffer>,
        });
        if (resposta.ok) {
            return;
        }

        const erro = await lerErro(resposta);
        // Limite do provedor (ex.: plano gratuito) menor que o da API: responde com a mensagem padronizada
        if (resposta.status === 413 || String(erro.statusCode) === '413') {
            console.error(`[storage] upload recusado por tamanho pelo provedor (${caminho})`, erro);
            throw new AppError(
                `O arquivo excede o tamanho máximo aceito pelo armazenamento de anexos (até ${TAMANHO_MAXIMO_ANEXO_BYTES} bytes). ` +
                    'Envie um arquivo menor.',
                413,
            );
        }
        console.error(`[storage] falha no upload de ${caminho}: HTTP ${resposta.status}`, erro);
        throw armazenamentoIndisponivel();
    }

    async remover(caminho: string): Promise<void> {
        const resposta = await this.chamar('DELETE', caminho);
        // 404 = o objeto já não existe: para a compensação, isso é sucesso
        if (resposta.ok || resposta.status === 404) {
            return;
        }
        const erro = await lerErro(resposta);
        if (String(erro.statusCode) === '404') {
            return;
        }
        console.error(`[storage] falha ao remover ${caminho}: HTTP ${resposta.status}`, erro);
        throw armazenamentoIndisponivel();
    }

    async baixar(caminho: string): Promise<ArquivoArmazenado> {
        // "identity": sem compressão, para o Content-Length ser o tamanho real do arquivo
        const resposta = await this.chamar('GET', caminho, { headers: { 'Accept-Encoding': 'identity' } });
        if (resposta.ok && resposta.body !== null) {
            const cabecalho = resposta.headers.has('content-encoding') ? null : resposta.headers.get('content-length');
            const tamanho = cabecalho === null ? Number.NaN : Number(cabecalho);
            return {
                conteudo: Readable.fromWeb(resposta.body as ReadableStream<Uint8Array>),
                tamanho: Number.isSafeInteger(tamanho) ? tamanho : null,
            };
        }

        const erro = await lerErro(resposta);
        if (resposta.status === 404 || String(erro.statusCode) === '404') {
            console.error(`[storage] objeto não encontrado no bucket: ${caminho}`, erro);
            throw AppError.naoEncontrado('O arquivo deste anexo não está disponível no armazenamento');
        }
        console.error(`[storage] falha no download de ${caminho}: HTTP ${resposta.status}`, erro);
        throw armazenamentoIndisponivel();
    }

    /**
     * Faz a chamada HTTP ao objeto `caminho` do bucket de anexos.
     * @throws AppError 503 se o Storage não estiver configurado ou não responder.
     */
    protected async chamar(
        metodo: 'GET' | 'POST' | 'DELETE',
        caminho: string,
        opcoes: { headers?: Record<string, string>; body?: Uint8Array<ArrayBuffer> } = {},
    ): Promise<Response> {
        const { supabaseUrl, supabaseChaveServico, bucketAnexos } = env.armazenamento;
        if (supabaseUrl === '' || supabaseChaveServico === '') {
            console.error('[storage] SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não configuradas no backend/.env');
            throw new AppError('O armazenamento de anexos não está configurado no servidor.', 503);
        }

        const objeto = [bucketAnexos, ...caminho.split('/')].map(encodeURIComponent).join('/');
        const url = `${supabaseUrl}/storage/v1/object/${objeto}`;

        // O tempo limite vale até a resposta começar; depois disso o download segue no ritmo do cliente
        const controle = new AbortController();
        const temporizador = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
        try {
            const init: RequestInit = {
                method: metodo,
                headers: { Authorization: `Bearer ${supabaseChaveServico}`, apikey: supabaseChaveServico, ...opcoes.headers },
                signal: controle.signal,
            };
            if (opcoes.body !== undefined) {
                init.body = opcoes.body;
            }
            return await fetch(url, init);
        } catch (erro) {
            console.error(`[storage] sem resposta do Storage (${metodo} ${caminho})`, erro);
            throw armazenamentoIndisponivel();
        } finally {
            clearTimeout(temporizador);
        }
    }
}

/** Lê o corpo de erro do Storage sem nunca lançar (o corpo pode não ser JSON). */
async function lerErro(resposta: Response): Promise<ErroStorage> {
    const corpo = await resposta.text().catch(() => '');
    try {
        const json: unknown = JSON.parse(corpo);
        return typeof json === 'object' && json !== null ? (json as ErroStorage) : { message: corpo };
    } catch {
        return { message: corpo.slice(0, 500) };
    }
}

/** Instância única usada pelos services. */
export const repositoryStorageAnexo = new RepositoryStorageAnexo();
