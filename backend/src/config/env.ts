/**
 * config/env.ts
 *
 * Leitura e validação centralizada das variáveis de ambiente da API.
 *
 * Por que existe: antes, cada arquivo lia `process.env` por conta própria e um valor ausente só
 * aparecia como erro no meio de uma requisição. Agora a API valida tudo na inicialização e para
 * imediatamente com uma mensagem clara ("fail fast") se algo obrigatório estiver faltando.
 *
 * Observação: `DATABASE_URL` é validada em `prisma/client.ts`, porque o seed (`prisma/seed.ts`)
 * também usa o cliente do Prisma e não precisa das variáveis de JWT.
 */
import 'dotenv/config';

/** Tamanho mínimo aceito para o segredo do JWT (32 caracteres ≈ 256 bits de entropia se aleatório). */
const JWT_SECRET_TAMANHO_MINIMO = 32;

/**
 * Lê uma variável de ambiente obrigatória.
 * @param nome Nome da variável (ex.: "JWT_SECRET").
 * @returns O valor da variável, sem espaços nas pontas.
 * @throws Error se a variável não existir ou estiver vazia.
 */
function lerObrigatoria(nome: string): string {
    const valor = process.env[nome]?.trim();
    if (!valor) {
        throw new Error(
            `Variável de ambiente obrigatória ausente: ${nome}. ` +
                'Confira o arquivo backend/.env (o modelo está em backend/.env.example).',
        );
    }
    return valor;
}

/**
 * Lê uma variável de ambiente opcional de texto.
 * @param nome Nome da variável.
 * @param padrao Valor usado quando a variável não existe ou está vazia.
 */
function lerTextoOpcional(nome: string, padrao: string): string {
    return process.env[nome]?.trim() || padrao;
}

/**
 * Lê uma variável de ambiente opcional numérica (inteira e não negativa).
 * @param nome Nome da variável.
 * @param padrao Valor usado quando a variável não existe ou está vazia.
 * @throws Error se o valor informado não for um inteiro >= 0.
 */
function lerNumeroOpcional(nome: string, padrao: number): number {
    const texto = process.env[nome]?.trim();
    if (!texto) {
        return padrao;
    }
    const numero = Number(texto);
    if (!Number.isSafeInteger(numero) || numero < 0) {
        throw new Error(`Variável de ambiente ${nome} precisa ser um número inteiro >= 0 (recebido: "${texto}").`);
    }
    return numero;
}

/**
 * Lê e valida o segredo usado para assinar os tokens JWT.
 * @throws Error se o segredo estiver ausente ou for curto demais.
 */
function lerSegredoJwt(): string {
    const segredo = lerObrigatoria('JWT_SECRET');
    if (segredo.length < JWT_SECRET_TAMANHO_MINIMO) {
        throw new Error(
            `JWT_SECRET precisa ter pelo menos ${JWT_SECRET_TAMANHO_MINIMO} caracteres. ` +
                'Gere um com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
        );
    }
    return segredo;
}

/**
 * Lê a validade do token. Exige número + unidade (s, m, h ou d), ex.: "8h".
 * Sem unidade, o jsonwebtoken interpretaria o texto como milissegundos — por isso é recusado.
 * @throws Error se o formato for inválido.
 */
function lerValidadeToken(): string {
    const validade = lerTextoOpcional('JWT_EXPIRES_IN', '8h');
    if (!/^\d+[smhd]$/.test(validade)) {
        throw new Error(`JWT_EXPIRES_IN inválido: "${validade}". Use número + unidade (s, m, h ou d), ex.: 8h`);
    }
    return validade;
}

/** Configuração da aplicação, já validada. Importe sempre daqui em vez de ler `process.env`. */
export const env = {
    /** Porta HTTP do servidor. */
    porta: lerNumeroOpcional('PORT', 3000),
    /** Segredo HMAC dos tokens JWT (algoritmo HS256). */
    jwtSecret: lerSegredoJwt(),
    /** Validade do token no formato aceito pelo jsonwebtoken (ex.: "8h", "30m", "1d"). */
    jwtExpiraEm: lerValidadeToken(),
    /** Tempo de vida de cada entrada do cache, em milissegundos (0 = nunca expira por tempo). */
    cacheTtlMs: lerNumeroOpcional('CACHE_TTL_MS', 5 * 60 * 1000),
    /** Origens liberadas no CORS, separadas por vírgula. "*" libera qualquer origem (só para desenvolvimento). */
    corsOrigens: lerTextoOpcional('CORS_ORIGIN', '*'),
} as const;
