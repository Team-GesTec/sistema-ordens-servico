/**
 * errors/AppError.ts
 *
 * Erro de aplicação com status HTTP embutido.
 *
 * Services e middlewares lançam `AppError` quando algo esperado dá errado (dado inválido, registro
 * inexistente, falta de permissão...). O middleware `tratarErros` (middlewares/errorMiddleware.ts)
 * transforma esse erro na resposta HTTP `{ mensagem }` com o status correto. Qualquer outro tipo de
 * erro é tratado como falha inesperada (500).
 */
export class AppError extends Error {
    /** Status HTTP que deve ser devolvido ao cliente. */
    public readonly statusCode: number;

    /**
     * Cria um erro de aplicação.
     * @param mensagem Texto (em PT-BR) que será enviado ao cliente no campo `mensagem`.
     * @param statusCode Status HTTP (padrão 400).
     */
    constructor(mensagem: string, statusCode = 400) {
        super(mensagem);
        this.name = 'AppError';
        this.statusCode = statusCode;
    }

    /** 400 — a requisição tem dados inválidos ou incompletos. */
    static requisicaoInvalida(mensagem: string): AppError {
        return new AppError(mensagem, 400);
    }

    /** 401 — o cliente não está autenticado (token ausente, inválido ou expirado; login incorreto). */
    static naoAutenticado(mensagem: string): AppError {
        return new AppError(mensagem, 401);
    }

    /** 403 — o cliente está autenticado, mas o perfil dele não permite a ação. */
    static acessoNegado(mensagem: string): AppError {
        return new AppError(mensagem, 403);
    }

    /** 404 — o recurso pedido não existe. */
    static naoEncontrado(mensagem: string): AppError {
        return new AppError(mensagem, 404);
    }

    /** 409 — a ação conflita com o estado atual dos dados (valor duplicado, vínculo existente...). */
    static conflito(mensagem: string): AppError {
        return new AppError(mensagem, 409);
    }
}
