/**
 * models/modelDepartamento.ts
 *
 * Tipos do objeto Departamento.
 */
import type { departamentos } from '../../prisma/generated/client';

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
