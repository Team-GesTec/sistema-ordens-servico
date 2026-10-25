/**
 * middlewares/uploadMiddleware.ts
 *
 * Recebimento do arquivo de anexo em `multipart/form-data` (2.6-BE01), com o multer.
 *
 *  - aceita UM arquivo, no campo `arquivo`, de até 50 × 1024 × 1024 = 52.428.800 bytes,
 *    e o campo de texto opcional `relato` (a validação do conteúdo fica no service);
 *  - o arquivo fica em memória (no máximo 50MB por requisição) e só é enviado ao Supabase Storage
 *    depois de todas as validações — nada é gravado se a requisição for rejeitada;
 *  - requisições com `Content-Length` muito acima do limite são recusadas antes de ler o corpo;
 *  - erros do multer viram `AppError` com mensagem padronizada (413 para arquivo grande demais),
 *    em vez de chegarem ao cliente como erro técnico.
 *
 * Fora da API: se houver proxy na frente (ex.: Nginx), o limite de corpo dele precisa ser maior que
 * 50MB (ex.: `client_max_body_size 51m;`), senão ele recusa o arquivo antes com um erro genérico.
 */
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../errors/AppError';
import { CAMPO_ARQUIVO_ANEXO, TAMANHO_MAXIMO_ANEXO_BYTES } from '../models/modelAnexo';

/** Folga para os cabeçalhos e separadores do multipart, além do próprio arquivo. */
const FOLGA_MULTIPART_BYTES = 1024 * 1024;

/** Mensagem do 413 (mesma do service). */
const MENSAGEM_ARQUIVO_GRANDE = `O arquivo excede o limite de 50MB (${TAMANHO_MAXIMO_ANEXO_BYTES} bytes) por anexo`;

const receberUmArquivo = multer({
    storage: multer.memoryStorage(),
    // Nomes com acento chegam corretos (o padrão do multer é latin1)
    defParamCharset: 'utf8',
    limits: {
        fileSize: TAMANHO_MAXIMO_ANEXO_BYTES,
        files: 1,
        fields: 5,
        // O relato tem até 2.000 caracteres; em UTF-8 cada um pode ocupar até 4 bytes
        fieldSize: 16 * 1024,
        parts: 6,
    },
}).single(CAMPO_ARQUIVO_ANEXO);

/** Converte um erro do multer/busboy em `AppError` com mensagem amigável. */
function traduzirErroUpload(erro: unknown): AppError {
    if (erro instanceof multer.MulterError) {
        switch (erro.code) {
            case 'LIMIT_FILE_SIZE':
                return new AppError(MENSAGEM_ARQUIVO_GRANDE, 413);
            case 'LIMIT_FILE_COUNT':
            case 'LIMIT_UNEXPECTED_FILE':
                return AppError.requisicaoInvalida(
                    `Envie exatamente um arquivo, no campo "${CAMPO_ARQUIVO_ANEXO}" do formulário multipart/form-data`,
                );
            case 'LIMIT_FIELD_VALUE':
                return AppError.requisicaoInvalida('O relato excede o tamanho máximo permitido');
            default:
                return AppError.requisicaoInvalida('Formulário de envio do anexo inválido');
        }
    }
    return AppError.requisicaoInvalida(
        'Não foi possível ler o arquivo enviado. Envie como multipart/form-data e tente novamente',
    );
}

/**
 * Middleware que lê o arquivo do campo `arquivo` e o coloca em `req.file`.
 * Usar DEPOIS de `autenticar` e da checagem de permissão na O.S.
 */
export function receberArquivoAnexo(req: Request, res: Response, next: NextFunction): void {
    const tamanhoDeclarado = Number(req.headers['content-length']);
    if (Number.isFinite(tamanhoDeclarado) && tamanhoDeclarado > TAMANHO_MAXIMO_ANEXO_BYTES + FOLGA_MULTIPART_BYTES) {
        // Não lê o corpo: fecha a conexão depois da resposta para o cliente parar de enviar
        res.setHeader('Connection', 'close');
        next(new AppError(MENSAGEM_ARQUIVO_GRANDE, 413));
        return;
    }

    receberUmArquivo(req, res, (erro?: unknown) => {
        if (erro) {
            next(traduzirErroUpload(erro));
            return;
        }
        next();
    });
}
