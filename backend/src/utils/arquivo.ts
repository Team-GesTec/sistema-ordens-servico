/**
 * utils/arquivo.ts
 *
 * Funções puras para tratar arquivos enviados como anexo (2.6-BE01). Não acessam banco nem Storage.
 *
 *  - `limparNomeOriginal`: nome que vai para o banco e para o download (sem pastas nem caracteres
 *    de controle, até 255 caracteres);
 *  - `sanitizarNomeArquivo` / `gerarCaminhoAnexo`: chave do objeto no bucket, segura contra
 *    path traversal e sobreposição de nomes (`os_{id}/{uuid}_{nome_sanitizado}`);
 *  - `normalizarTipoMime`: "Image/PNG; charset=x" → "image/png";
 *  - `extensaoConfere` / `assinaturaConfere`: confere se a extensão e os primeiros bytes do arquivo
 *    combinam com o tipo declarado (evita, por exemplo, um executável enviado como "application/pdf").
 *
 * ALTERAÇÕES (19/10/2026):
 *  - 2.6-BE02: `montarContentDisposition` para o cabeçalho do download (nome original em UTF-8).
 *
 * ALTERAÇÕES (23/10/2026):
 *  - integração com o frontend: `extensoesDoTipo`, usada para informar à tela as extensões aceitas.
 */
import { randomUUID } from 'node:crypto';

/** Tamanho máximo do nome original (coluna `anexos.nome` é VARCHAR(255)). */
export const NOME_ORIGINAL_MAXIMO = 255;

/** Tamanho máximo do trecho do nome que entra na chave do Storage (o uuid vai antes). */
const NOME_SANITIZADO_MAXIMO = 100;

/** Nome usado quando o arquivo chega sem nome aproveitável. */
const NOME_PADRAO = 'arquivo';

/** Caracteres de controle (incluindo quebras de linha) que nunca entram no nome. */
const CARACTERES_DE_CONTROLE = /[\u0000-\u001f\u007f-\u009f]/g;

/** Separa a extensão (com o ponto) do restante do nome. "laudo.final.PDF" → ["laudo.final", ".pdf"]. */
function separarExtensao(nome: string): [string, string] {
    const ponto = nome.lastIndexOf('.');
    if (ponto <= 0 || ponto === nome.length - 1) {
        return [nome, ''];
    }
    return [nome.slice(0, ponto), nome.slice(ponto).toLowerCase()];
}

/** Corta o nome no tamanho máximo, preservando a extensão. */
function cortarPreservandoExtensao(nome: string, maximo: number): string {
    if (nome.length <= maximo) {
        return nome;
    }
    const [base, extensao] = separarExtensao(nome);
    if (extensao.length >= maximo) {
        return nome.slice(0, maximo);
    }
    return base.slice(0, maximo - extensao.length) + extensao;
}

/**
 * Limpa o nome original enviado pelo cliente para guardar no banco e devolver no download.
 * Remove pastas ("../../etc/passwd" → "passwd"), caracteres de controle e espaços das pontas.
 * Acentos e espaços internos são mantidos — o nome exibido continua o que o usuário enviou.
 */
export function limparNomeOriginal(nome: string): string {
    const semPastas = nome.split(/[/\\]/).pop() ?? '';
    const limpo = semPastas.replace(CARACTERES_DE_CONTROLE, '').trim();
    if (limpo === '' || /^\.+$/.test(limpo)) {
        return NOME_PADRAO;
    }
    return cortarPreservandoExtensao(limpo, NOME_ORIGINAL_MAXIMO);
}

/**
 * Gera uma versão do nome segura para a chave do Storage: só letras sem acento, números, ".", "_" e "-".
 * Ex.: "Relatório Técnico (v2).PDF" → "Relatorio_Tecnico_v2_.pdf".
 */
export function sanitizarNomeArquivo(nome: string): string {
    const [base, extensao] = separarExtensao(limparNomeOriginal(nome));
    const limpar = (texto: string): string =>
        texto
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Za-z0-9._-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^[._-]+/, '');

    const baseLimpa = limpar(base).replace(/\.+$/, '') || NOME_PADRAO;
    const extensaoLimpa = extensao === '' ? '' : limpar(extensao.slice(1));
    const nomeFinal = extensaoLimpa === '' ? baseLimpa : `${baseLimpa}.${extensaoLimpa}`;
    return cortarPreservandoExtensao(nomeFinal, NOME_SANITIZADO_MAXIMO);
}

/**
 * Monta a chave única do objeto no bucket: `os_{id}/{uuid}_{nome_sanitizado}`.
 * O uuid impede que dois arquivos com o mesmo nome se sobreponham.
 * @param osId Id da O.S.
 * @param nome Nome original do arquivo.
 * @param uuid Identificador único (pode ser fixado nos testes).
 */
export function gerarCaminhoAnexo(osId: number, nome: string, uuid: string = randomUUID()): string {
    return `os_${osId}/${uuid}_${sanitizarNomeArquivo(nome)}`;
}

/** Normaliza o MIME type declarado: minúsculas e sem parâmetros. "Image/PNG; x=y" → "image/png". */
export function normalizarTipoMime(tipo: string): string {
    return (tipo.split(';')[0] ?? '').trim().toLowerCase();
}

/** Extensões aceitas para os tipos mais comuns. Tipos fora desta tabela não têm a extensão conferida. */
const EXTENSOES_POR_TIPO: Readonly<Record<string, readonly string[]>> = {
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg', '.jfif'],
    'image/webp': ['.webp'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt', '.log'],
    'text/csv': ['.csv'],
    'application/zip': ['.zip'],
    'application/msword': ['.doc'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

/**
 * Extensões conhecidas de um tipo, sem o ponto (ex.: "image/jpeg" → ["jpg", "jpeg", "jfif"]).
 * @returns Lista vazia quando o tipo não está na tabela.
 */
export function extensoesDoTipo(tipo: string): string[] {
    return (EXTENSOES_POR_TIPO[tipo] ?? []).map((extensao) => extensao.slice(1));
}

/**
 * Indica se a extensão do nome combina com o tipo declarado.
 * @returns `true`/`false`, ou `null` quando o tipo não está na tabela (não há como conferir).
 */
export function extensaoConfere(tipo: string, nome: string): boolean | null {
    const esperadas = EXTENSOES_POR_TIPO[tipo];
    if (!esperadas) {
        return null;
    }
    const [, extensao] = separarExtensao(nome);
    return esperadas.includes(extensao);
}

/** Uma assinatura: bytes esperados a partir de uma posição do arquivo. */
interface Assinatura {
    posicao: number;
    bytes: readonly number[];
}

const texto = (valor: string): number[] => [...valor].map((caractere) => caractere.charCodeAt(0));

const ZIP: Assinatura[] = [{ posicao: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }];
const OLE: Assinatura[] = [{ posicao: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }];

/**
 * "Números mágicos" (primeiros bytes) dos tipos mais comuns.
 * Cada item da lista externa é uma alternativa; todas as assinaturas de uma alternativa precisam bater.
 */
const ASSINATURAS_POR_TIPO: Readonly<Record<string, readonly (readonly Assinatura[])[]>> = {
    'image/png': [[{ posicao: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }]],
    'image/jpeg': [[{ posicao: 0, bytes: [0xff, 0xd8, 0xff] }]],
    'image/gif': [[{ posicao: 0, bytes: texto('GIF87a') }], [{ posicao: 0, bytes: texto('GIF89a') }]],
    'image/webp': [[{ posicao: 0, bytes: texto('RIFF') }, { posicao: 8, bytes: texto('WEBP') }]],
    'application/pdf': [[{ posicao: 0, bytes: texto('%PDF-') }]],
    'application/zip': [ZIP],
    'application/msword': [OLE],
    'application/vnd.ms-excel': [OLE],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [ZIP],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [ZIP],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': [ZIP],
};

/**
 * Confere se os primeiros bytes do arquivo combinam com o tipo declarado.
 * @returns `true`/`false`, ou `null` quando o tipo não tem assinatura conhecida (ex.: text/plain).
 */
export function assinaturaConfere(tipo: string, conteudo: Uint8Array): boolean | null {
    const alternativas = ASSINATURAS_POR_TIPO[tipo];
    if (!alternativas) {
        return null;
    }
    return alternativas.some((assinaturas) =>
        assinaturas.every(({ posicao, bytes }) => bytes.every((byte, indice) => conteudo[posicao + indice] === byte)),
    );
}

/**
 * Monta o cabeçalho `Content-Disposition` do download com o nome original do arquivo:
 * `attachment; filename="<versão ASCII>"; filename*=UTF-8''<nome em UTF-8>` (RFC 6266 / RFC 5987).
 * O `filename*` preserva acentos; o `filename` é a alternativa para clientes antigos.
 * Ex.: "relatório técnico.pdf" → attachment; filename="relatorio tecnico.pdf"; filename*=UTF-8''relat%C3%B3rio%20t%C3%A9cnico.pdf
 */
export function montarContentDisposition(nome: string): string {
    const limpo = limparNomeOriginal(nome);
    const ascii = limpo
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7e]/g, '_')
        .replace(/["\\]/g, '_');
    const utf8 = encodeURIComponent(limpo).replace(
        /['()*]/g,
        (caractere) => `%${caractere.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
