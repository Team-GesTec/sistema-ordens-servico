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
 *
 * ALTERAÇÕES (19/10/2026):
 *  - 2.6-BE01: configuração do Supabase Storage (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *    SUPABASE_BUCKET_ANEXOS) e dos anexos (ANEXO_TIPOS_PERMITIDOS, ANEXO_QUANTIDADE_MAXIMA — PE-12).
 *    As variáveis do Storage são opcionais na inicialização: sem elas a API sobe normalmente e só
 *    as rotas de anexo respondem 503, para não travar quem não trabalha com anexos.
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

/**
 * Tipos de arquivo (MIME) aceitos provisoriamente nos anexos enquanto o PE-12 não é decidido.
 * Espelham o antigo enum `tipo_arquivo` do schema (png, jpeg, pdf, webp).
 * Para alterar, defina ANEXO_TIPOS_PERMITIDOS no .env — não altere esta lista para "qualquer tipo".
 */
const TIPOS_ANEXO_PROVISORIOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const;

/** Quantidade máxima provisória de anexos por O.S. enquanto o PE-12 não é decidido. */
const QUANTIDADE_ANEXOS_PROVISORIA = 10;

/** Formato de um MIME type sem curingas, ex.: "application/pdf". */
const FORMATO_MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;

/**
 * Lê os tipos de arquivo (MIME) aceitos nos anexos (PE-12), separados por vírgula.
 * Curingas como "*\/*" ou "image/*" são recusados: a regra final não pode ser "qualquer tipo".
 * @throws Error se algum item não for um MIME type válido.
 */
function lerTiposAnexo(): string[] {
    const texto = process.env.ANEXO_TIPOS_PERMITIDOS?.trim();
    if (!texto) {
        return [...TIPOS_ANEXO_PROVISORIOS];
    }
    const tipos = texto
        .split(',')
        .map((tipo) => tipo.trim().toLowerCase())
        .filter((tipo) => tipo.length > 0);
    const invalidos = tipos.filter((tipo) => !FORMATO_MIME.test(tipo));
    if (tipos.length === 0 || invalidos.length > 0) {
        throw new Error(
            `ANEXO_TIPOS_PERMITIDOS inválido: "${texto}". Informe MIME types separados por vírgula, ` +
                'sem curingas (ex.: application/pdf,image/png).',
        );
    }
    return [...new Set(tipos)];
}

/**
 * Lê a quantidade máxima de anexos por O.S. (PE-12).
 * @throws Error se não for um inteiro >= 1.
 */
function lerQuantidadeMaximaAnexos(): number {
    const quantidade = lerNumeroOpcional('ANEXO_QUANTIDADE_MAXIMA', QUANTIDADE_ANEXOS_PROVISORIA);
    if (quantidade < 1) {
        throw new Error('ANEXO_QUANTIDADE_MAXIMA precisa ser um número inteiro >= 1.');
    }
    return quantidade;
}

/**
 * Lê a URL do projeto Supabase (opcional). Remove a barra final.
 * @throws Error se a variável existir e não for uma URL http(s).
 */
function lerUrlSupabase(): string {
    const url = lerTextoOpcional('SUPABASE_URL', '');
    if (url === '') {
        return '';
    }
    if (!/^https?:\/\/[^\s/]+/.test(url)) {
        throw new Error(`SUPABASE_URL inválida: "${url}". Use a Project URL do painel, ex.: https://PROJECT_REF.supabase.co`);
    }
    return url.replace(/\/+$/, '');
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
    /** Supabase Storage, onde ficam os arquivos dos anexos (2.6-BE01). Vazio = não configurado (rotas de anexo → 503). */
    armazenamento: {
        /** Project URL do Supabase (ex.: https://PROJECT_REF.supabase.co). */
        supabaseUrl: lerUrlSupabase(),
        /** Chave secreta (service_role) — só no backend, NUNCA no frontend. */
        supabaseChaveServico: lerTextoOpcional('SUPABASE_SERVICE_ROLE_KEY', ''),
        /** Bucket PRIVADO dos anexos. */
        bucketAnexos: lerTextoOpcional('SUPABASE_BUCKET_ANEXOS', 'anexos-os'),
    },
    /** Regras configuráveis dos anexos (PE-12 — valores provisórios até a decisão do cliente). */
    anexos: {
        /** MIME types aceitos (ex.: ["application/pdf", "image/png"]). */
        tiposPermitidos: lerTiposAnexo(),
        /** Quantidade máxima de anexos por O.S. */
        quantidadeMaximaPorOS: lerQuantidadeMaximaAnexos(),
    },
} as const;
