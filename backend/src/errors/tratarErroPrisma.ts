/**
 * errors/tratarErroPrisma.ts
 *
 * Tradução dos erros conhecidos do Prisma para `AppError`.
 *
 * Os códigos tratados valem também com o driver adapter (`@prisma/adapter-pg`): o Prisma converte
 * as violações do Postgres para os mesmos códigos P20xx.
 *   - P2025: registro não encontrado (update/delete de um id que não existe)     → 404
 *   - P2002: violação de UNIQUE (ex.: `funcionarios.usuario` repetido)          → 409
 *   - P2003: violação de chave estrangeira
 *            • num create/update: o id referenciado não existe                  → 400
 *            • num delete: ainda há registros apontando para este               → 409
 */
import { Prisma } from '../prisma/generated/client';
import { AppError } from './AppError';

/** Mensagens personalizadas por situação; o que não for informado usa o texto genérico. */
export interface MensagensErroPrisma {
    /** P2025 — registro não encontrado. */
    registroNaoEncontrado?: string;
    /** P2002 — valor único repetido. */
    valorDuplicado?: string;
    /** P2003 em create/update — a referência informada não existe (vira 400). */
    referenciaInvalida?: string;
    /** P2003 em delete — o registro ainda é usado por outros dados (vira 409). */
    referenciaEmUso?: string;
}

/**
 * Converte um erro conhecido do Prisma em `AppError`.
 *
 * Erros que não forem do Prisma (ou códigos não mapeados) são devolvidos sem alteração, para que o
 * handler genérico registre o problema e responda 500.
 *
 * @param erro Erro capturado no `catch` de uma operação do Prisma.
 * @param mensagens Textos específicos da operação (ver `MensagensErroPrisma`).
 * @returns O erro que deve ser relançado (`throw traduzirErroPrisma(erro, ...)`).
 */
export function traduzirErroPrisma(erro: unknown, mensagens: MensagensErroPrisma = {}): unknown {
    if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) {
        return erro;
    }
    switch (erro.code) {
        case 'P2025':
            return AppError.naoEncontrado(mensagens.registroNaoEncontrado ?? 'Registro não encontrado');
        case 'P2002':
            return AppError.conflito(mensagens.valorDuplicado ?? 'Já existe um registro com esse valor');
        case 'P2003':
            if (mensagens.referenciaInvalida !== undefined) {
                return AppError.requisicaoInvalida(mensagens.referenciaInvalida);
            }
            return AppError.conflito(
                mensagens.referenciaEmUso ?? 'Operação bloqueada: o registro está vinculado a outros dados',
            );
        default:
            return erro;
    }
}
