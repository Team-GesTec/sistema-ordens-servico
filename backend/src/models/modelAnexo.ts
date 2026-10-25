/**
 * models/modelAnexo.ts
 *
 * Tipos e constantes dos anexos de O.S. (US#2.6 — 2.6-BE01 e 2.6-BE02).
 *
 * O arquivo em si fica no Supabase Storage (bucket privado); no banco ficam só os metadados
 * (tabela `anexos`): nome original, tipo, tamanho, autor, data e o caminho do objeto no bucket.
 *
 * Os tipos aceitos e a quantidade máxima por O.S. NÃO ficam aqui: vêm da configuração
 * (`env.anexos`, PE-12). O limite de tamanho é regra fixa da US#2.6.
 *
 * ALTERAÇÕES (23/10/2026):
 *  - integração com o frontend (SCRUM-118): `relato` opcional enviado junto com o arquivo e
 *    `ConfiguracaoAnexosResposta` (regras expostas para a tela validar antes do envio).
 */
import type { anexos } from '../prisma/generated/client';

/**
 * Tamanho máximo de cada anexo: 50 × 1024 × 1024 = 52.428.800 bytes (50MB, US#2.6).
 * Arquivo com exatamente esse tamanho é aceito; 1 byte a mais é rejeitado com 413.
 */
export const TAMANHO_MAXIMO_ANEXO_BYTES = 50 * 1024 * 1024;

/** Nome do campo do formulário multipart que carrega o arquivo (`multipart/form-data`). */
export const CAMPO_ARQUIVO_ANEXO = 'arquivo';

/** Tamanho máximo do relato que acompanha o anexo (mesmo limite do campo na tela). */
export const TAMANHO_MAXIMO_RELATO = 2000;

/** Nome do campo de texto do formulário multipart com o relato. */
export const CAMPO_RELATO_ANEXO = 'relato';

/** Valor de `campo_alterado` gravado na auditoria quando um anexo é incluído. */
export const CAMPO_AUDITORIA_ANEXO = 'anexo';

/** Registro da tabela `anexos`. Atenção: `tamanho_bytes` é BigInt — não vai direto para o JSON. */
export type Anexo = anexos;

/** Anexo com o nome do autor (funcionário que enviou). */
export type AnexoComAutor = anexos & {
    funcionarios: { id: number; nome: string };
};

/** Dados validados para gravar os metadados de um anexo. */
export interface DadosCriacaoAnexo {
    os_id: number;
    funcionario_id: number;
    /** Nome original do arquivo (como o usuário enviou, já limpo de caminhos e caracteres de controle). */
    nome: string;
    /** MIME type do arquivo (ex.: "application/pdf"). */
    tipo: string;
    tamanho_bytes: bigint;
    /** Chave do objeto no bucket: `os_{id}/{uuid}_{nome_sanitizado}`. */
    caminho: string;
    /** Relato opcional enviado junto com o arquivo (implementação realizada ou impedimento). */
    relato: string | null;
}

/** Arquivo recebido na requisição, já separado do framework (o controller monta a partir do multer). */
export interface ArquivoRecebido {
    nomeOriginal: string;
    tipo: string;
    tamanho: number;
    conteudo: Buffer;
}

/** Anexo como a API devolve (o caminho no Storage nunca é exposto). */
export interface AnexoResposta {
    id: number;
    os_id: number;
    nome: string;
    tipo: string;
    /** Tamanho em bytes. */
    tamanho: number;
    autor: { id: number; nome: string };
    /** Data/hora em que o anexo foi incluído. */
    data: Date;
    /** Relato enviado junto com o arquivo (null se não houve). */
    relato: string | null;
}

/** Regras dos anexos expostas para a tela (GET /anexos/configuracao). */
export interface ConfiguracaoAnexosResposta {
    /** MIME types aceitos (PE-12). */
    tipos_permitidos: string[];
    /** Extensões correspondentes, sem ponto. Vazio = a tela não restringe (o backend valida). */
    extensoes_permitidas: string[];
    /** 52.428.800 bytes. */
    tamanho_maximo_bytes: number;
    quantidade_maxima_por_os: number;
    tamanho_maximo_relato: number;
}

/** Converte o registro do banco para o formato da API. */
export function paraAnexoResposta(anexo: AnexoComAutor): AnexoResposta {
    return {
        id: anexo.id,
        os_id: anexo.os_id,
        nome: anexo.nome,
        tipo: anexo.tipo,
        // Seguro: o tamanho máximo (52.428.800) está muito abaixo de Number.MAX_SAFE_INTEGER
        tamanho: Number(anexo.tamanho_bytes),
        autor: { id: anexo.funcionarios.id, nome: anexo.funcionarios.nome },
        data: anexo.data_upload,
        relato: anexo.relato,
    };
}
