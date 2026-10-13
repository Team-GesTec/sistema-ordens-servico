/**
 * utils/validacao.ts
 *
 * Funções reutilizáveis de validação da entrada (params e body das requisições).
 *
 * Todas seguem o mesmo contrato: recebem um valor `unknown` (o que veio do cliente), devolvem o
 * valor já convertido e tipado, ou lançam `AppError` 400 com uma mensagem clara em PT-BR.
 * Assim os services não repetem `if (!campo) return res.status(400)...` em todo lugar.
 */
import { AppError } from '../errors/AppError';

/** Maior valor de uma coluna INTEGER do Postgres (os ids do schema são `Int`/SERIAL). */
export const INTEIRO_MAXIMO_POSTGRES = 2_147_483_647;

/** Corpo de requisição já confirmado como objeto JSON. */
export type CorpoRequisicao = Record<string, unknown>;

/**
 * Garante que o corpo da requisição é um objeto JSON.
 *
 * No Express 5, `req.body` fica `undefined` quando a requisição não tem corpo JSON (antes era `{}`),
 * então desestruturar `req.body` direto derrubava a requisição com erro 500.
 *
 * @param corpo O `req.body` recebido.
 * @throws AppError 400 se o corpo não for um objeto.
 */
export function lerCorpo(corpo: unknown): CorpoRequisicao {
    if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) {
        throw AppError.requisicaoInvalida(
            'O corpo da requisição precisa ser um objeto JSON (envie o cabeçalho Content-Type: application/json)',
        );
    }
    return corpo as CorpoRequisicao;
}

/**
 * Indica se o cliente enviou o campo no corpo (mesmo que com valor `null`).
 * Usado nas atualizações parciais (PATCH) para saber o que deve ser alterado.
 */
export function campoPresente(corpo: CorpoRequisicao, campo: string): boolean {
    return Object.prototype.hasOwnProperty.call(corpo, campo);
}

/**
 * Converte o parâmetro de rota `:id` em inteiro positivo.
 * Aceita apenas dígitos ("12"); recusa "12abc", "1.5", "-3", "1e3", "" etc.
 * @param valor O `req.params.id` recebido.
 * @param campo Nome usado na mensagem de erro.
 */
export function lerId(valor: unknown, campo = 'id'): number {
    const numero = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : Number.NaN;
    if (!Number.isSafeInteger(numero) || numero <= 0 || numero > INTEIRO_MAXIMO_POSTGRES) {
        throw AppError.requisicaoInvalida(`${campo} inválido: informe um número inteiro positivo`);
    }
    return numero;
}

/** Opções de `exigirTexto`. */
export interface OpcoesTexto {
    /** Tamanho máximo aceito (em caracteres). */
    maximo?: number;
    /** Se `false`, não remove espaços das pontas (usado para senhas). Padrão `true`. */
    aparar?: boolean;
}

/**
 * Exige um texto não vazio.
 * @param valor Valor recebido.
 * @param campo Nome do campo (para a mensagem de erro).
 * @param opcoes Tamanho máximo e se deve aparar espaços.
 */
export function exigirTexto(valor: unknown, campo: string, opcoes: OpcoesTexto = {}): string {
    if (typeof valor !== 'string') {
        throw AppError.requisicaoInvalida(`${campo} é obrigatório e deve ser um texto`);
    }
    const texto = opcoes.aparar === false ? valor : valor.trim();
    if (texto.length === 0) {
        throw AppError.requisicaoInvalida(`${campo} não pode ser vazio`);
    }
    if (opcoes.maximo !== undefined && texto.length > opcoes.maximo) {
        throw AppError.requisicaoInvalida(`${campo} deve ter no máximo ${opcoes.maximo} caracteres`);
    }
    return texto;
}

/**
 * Texto opcional: `undefined`, `null` ou texto vazio viram `null`; qualquer outro valor passa por
 * `exigirTexto`.
 */
export function textoOpcional(valor: unknown, campo: string, opcoes: OpcoesTexto = {}): string | null {
    if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) {
        return null;
    }
    return exigirTexto(valor, campo, opcoes);
}

/**
 * Exige um inteiro positivo (ex.: ids enviados no corpo, como `departamento_id`).
 * Precisa ser um número JSON (`5`), não texto (`"5"`).
 */
export function exigirInteiroPositivo(valor: unknown, campo: string): number {
    if (
        typeof valor !== 'number' ||
        !Number.isSafeInteger(valor) ||
        valor <= 0 ||
        valor > INTEIRO_MAXIMO_POSTGRES
    ) {
        throw AppError.requisicaoInvalida(`${campo} é obrigatório e deve ser um número inteiro positivo`);
    }
    return valor;
}

/** Inteiro positivo opcional: `undefined`/`null` viram `null`. */
export function inteiroPositivoOpcional(valor: unknown, campo: string): number | null {
    if (valor === undefined || valor === null) {
        return null;
    }
    return exigirInteiroPositivo(valor, campo);
}

/**
 * Exige que o valor seja um dos valores permitidos (usado para os enums do schema).
 * @param valor Valor recebido.
 * @param permitidos Lista de valores válidos (ex.: `PERFIS_FUNCIONARIO`).
 * @param campo Nome do campo.
 */
export function exigirEnum<T extends string>(valor: unknown, permitidos: readonly T[], campo: string): T {
    if (typeof valor !== 'string' || !(permitidos as readonly string[]).includes(valor)) {
        throw AppError.requisicaoInvalida(`${campo} deve ser um de: ${permitidos.join(', ')}`);
    }
    return valor as T;
}

/**
 * Data opcional em formato ISO 8601 ("2026-10-01" ou "2026-10-01T18:00:00-03:00").
 * `undefined`/`null` viram `null`.
 */
export function dataOpcional(valor: unknown, campo: string): Date | null {
    if (valor === undefined || valor === null) {
        return null;
    }
    if (typeof valor !== 'string' || valor.trim() === '') {
        throw AppError.requisicaoInvalida(`${campo} deve ser uma data em formato ISO (ex.: 2026-10-01)`);
    }
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
        throw AppError.requisicaoInvalida(`${campo} não é uma data válida`);
    }
    return data;
}

/**
 * Exige uma lista de ids (inteiros positivos). Remove repetidos e devolve em ordem crescente.
 * @param valor Valor recebido.
 * @param campo Nome do campo.
 * @param minimo Quantidade mínima de itens (padrão 1).
 */
export function exigirListaDeIds(valor: unknown, campo: string, minimo = 1): number[] {
    if (!Array.isArray(valor)) {
        throw AppError.requisicaoInvalida(`${campo} deve ser uma lista de ids (ex.: [1, 2])`);
    }
    const ids = valor.map((item, indice) => exigirInteiroPositivo(item, `${campo}[${indice}]`));
    const unicos = [...new Set(ids)].sort((a, b) => a - b);
    if (unicos.length < minimo) {
        throw AppError.requisicaoInvalida(`${campo} deve ter pelo menos ${minimo} item(ns)`);
    }
    return unicos;
}

/**
 * Garante que uma atualização tem pelo menos um campo para alterar (evita PATCH com corpo vazio).
 * @param alteracoes Objeto montado pelo service.
 */
export function exigirAlteracoes(alteracoes: object): void {
    if (Object.keys(alteracoes).length === 0) {
        throw AppError.requisicaoInvalida('Nenhum campo válido foi enviado para atualização');
    }
}
