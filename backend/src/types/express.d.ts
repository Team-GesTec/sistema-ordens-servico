/**
 * types/express.d.ts
 *
 * Acrescenta o campo `usuario` ao `Request` do Express, para que o TypeScript reconheça
 * `req.usuario` nas rotas protegidas. Quem preenche é o middleware `autenticar`.
 */
import type { Funcionario } from '../models/modelFuncionario';

declare global {
    namespace Express {
        interface Request {
            /** Funcionário autenticado (sem senha). Só existe depois do middleware `autenticar`. */
            usuario?: Funcionario;
        }
    }
}

export {};
