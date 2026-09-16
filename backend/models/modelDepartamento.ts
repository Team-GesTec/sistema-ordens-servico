/**
 * models/modelDepartamento.ts
 *
 * Tipos do objeto Departamento.
 *
 * ALTERAÇÃO (16/09/2026): o model deixou de ser um array em memória com campos em camelCase
 * (`idDepartamento`, `nomeDepartamento`, `idResponsavelDepartamento`). Agora o Departamento vem do
 * Postgres via Prisma e usa os nomes do schema.prisma: `id`, `nome`, `responsavel_id`.
 * O contador `gerarIdDepartamento()` foi removido — quem gera o id é o banco (SERIAL).
 */
import type { departamentos } from '../prisma/generated/client';

/** Departamento como está no banco e como a API devolve. */
export type Departamento = departamentos;

/** Dados validados para criar um departamento. */
export interface DadosCriacaoDepartamento {
    nome: string;
    /** Funcionário responsável pelo departamento (opcional — pode ser definido depois). */
    responsavel_id: number | null;
}

/** Dados validados para atualizar um departamento (só os campos presentes são alterados). */
export type DadosAtualizacaoDepartamento = Partial<DadosCriacaoDepartamento>;
