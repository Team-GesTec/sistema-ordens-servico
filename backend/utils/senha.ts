/**
 * utils/senha.ts
 *
 * Regras e operações de senha, num lugar só. Usado pelo cadastro de funcionários, pelo login e
 * pelo seed inicial (por isso não depende de `config/env`).
 */
import * as bcrypt from 'bcryptjs';
import { AppError } from '../src/errors/AppError';

/** Custo do bcrypt (2^12 rodadas). Aumentar deixa o hash mais lento e mais resistente a força bruta. */
export const CUSTO_BCRYPT = 12;

/** Tamanho mínimo da senha, em caracteres. */
export const SENHA_TAMANHO_MINIMO = 8;

/** O bcrypt só considera os primeiros 72 bytes; o que passar disso seria ignorado sem aviso. */
export const SENHA_BYTES_MAXIMO = 72;

/**
 * Valida uma senha recebida do cliente. A senha NÃO é aparada (espaços contam).
 * @param valor Valor recebido.
 * @param campo Nome do campo (para a mensagem).
 * @returns A senha, já confirmada como texto válido.
 * @throws AppError 400 se não atender às regras.
 */
export function validarSenha(valor: unknown, campo = 'senha'): string {
    if (typeof valor !== 'string' || valor.length === 0) {
        throw AppError.requisicaoInvalida(`${campo} é obrigatória e deve ser um texto`);
    }
    if (valor.length < SENHA_TAMANHO_MINIMO) {
        throw AppError.requisicaoInvalida(`${campo} deve ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres`);
    }
    if (Buffer.byteLength(valor, 'utf8') > SENHA_BYTES_MAXIMO) {
        throw AppError.requisicaoInvalida(`${campo} deve ter no máximo ${SENHA_BYTES_MAXIMO} bytes`);
    }
    return valor;
}

/**
 * Gera o hash bcrypt de uma senha (assíncrono, para não travar o servidor).
 * @param senha Senha em texto puro, já validada.
 */
export function gerarHashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, CUSTO_BCRYPT);
}

/**
 * Compara uma senha em texto puro com um hash bcrypt.
 * @returns `true` se a senha confere.
 */
export function compararSenha(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
}
