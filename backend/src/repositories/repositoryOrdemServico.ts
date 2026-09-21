/**
 * Único lugar que fala com prisma.ordens_servico. Sem cache por enquanto.
 */

import { prisma } from '../../prisma/client';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type { OrdemServico, DadosCriacaoOrdemServico } from '../models/modelOrdemServico';

// Até o momento, em referenciaInvalida, o banco so informa que uma FK falhou, sem especificar qual
export class RepositoryOrdemServico {
    async criar(dados: DadosCriacaoOrdemServico): Promise<OrdemServico> {
        try {
            const criada = await prisma.ordens_servico.create({ data: dados });
            return criada;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                referenciaInvalida:
                    'cliente_id, departamento_id, solicitante_id, projeto_id ou anterior_id não corresponde a um registro existente',
            });
        }
    }
    // busca uma O.S. por id no banco
    async buscarPorId(id: number): Promise<OrdemServico | null> {
        return prisma.ordens_servico.findUnique({ where: { id } });
    }
}

export const repositoryOrdemServico = new RepositoryOrdemServico();