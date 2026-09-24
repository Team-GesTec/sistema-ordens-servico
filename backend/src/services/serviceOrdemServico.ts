/**
 * services/serviceOrdemServico.ts
 * 
 * Regras de negócio e abertura de O.S. (US#2.1)
 * 
 * Regras:
 *  - `tipo` (instalacao ou manutencao), `descricao`, `cliente_id` e `departamento_id` são obrigatórios
 *  - `projeto_id`, `anterior_id` e `sla_id` são opcionais; o `sla_id` passa a ser obrigatório
 *    quando o SLA for implementado (Sprint 2, US#3.1).
 *  - `anterior_id`, se informado, deve apontar para uma O.S. existente;
 *  - o status inicial é `pendente`, conforme padrão do banco
 *  
 */

import { AppError } from '../errors/AppError';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import type { DadosCriacaoOrdemServico, OrdemServico } from '../models/modelOrdemServico';
import {
    exigirEnum,
    exigirInteiroPositivo,
    exigirTexto,
    inteiroPositivoOpcional,
    lerCorpo,
} from '../../utils/validacao';

const TIPOS_ORDEM_SERVICO = ['instalacao', 'manutencao'] as const;
const TEXTO_MAXIMO_DESCRICAO = 1000;

export class ServiceOrdemServico {
    private readonly repositorio: RepositoryOrdemServico;

    constructor(repositorio: RepositoryOrdemServico = repositoryOrdemServico) {
        this.repositorio = repositorio;
    }

    /**
     * Valida o corpo e abre uma O.S.
     * @param corpo O `req.body` recebido.
     * @param solicitanteId Id do funcionário logado (vem do token, nunca do corpo).
     * @throws AppError 400 se algum campo for inválido ou o `anterior_id` não existir.
     */
    async criar(corpo: unknown, solicitanteId: number): Promise<OrdemServico> {
        const dados = lerCorpo(corpo);

        const tipo = exigirEnum(dados.tipo, TIPOS_ORDEM_SERVICO, 'tipo');
        const descricao = exigirTexto(dados.descricao, 'descricao', { maximo: TEXTO_MAXIMO_DESCRICAO });
        const clienteId = exigirInteiroPositivo(dados.cliente_id, 'cliente_id');
        const departamentoId = exigirInteiroPositivo(dados.departamento_id, 'departamento_id');
        const projetoId = inteiroPositivoOpcional(dados.projeto_id, 'projeto_id');
        const anteriorId = inteiroPositivoOpcional(dados.anterior_id, 'anterior_id');
        const criticidadeId = inteiroPositivoOpcional(dados.criticidade_id, 'criticidade_id');
        if (anteriorId !== null) {
            const anterior = await this.repositorio.buscarPorId(anteriorId);
            if (!anterior) {
                throw AppError.requisicaoInvalida(`anterior_id ${anteriorId} não corresponde a uma O.S. existente`);
            }
        }

        const novaOS: DadosCriacaoOrdemServico = {
            tipo,
            descricao,
            cliente_id: clienteId,
            departamento_id: departamentoId,
            solicitante_id: solicitanteId,
            projeto_id: projetoId,
            anterior_id: anteriorId,
            criticidade_id: criticidadeId
        };

        return this.repositorio.criar(novaOS);
    }
}

export const serviceOrdemServico = new ServiceOrdemServico();