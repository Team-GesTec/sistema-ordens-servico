/**
 * services/serviceOrdemServico.ts
 *
 * Regras de negócio da O.S.: abertura (US#2.1) e alteração de status (US#2.4).
 *
 * Regras da abertura:
 *  - `tipo` (instalacao ou manutencao), `descricao`, `cliente_id` e `departamento_id` são obrigatórios
 *  - `projeto_id`, `anterior_id` e `sla_id` são opcionais; o `sla_id` passa a ser obrigatório
 *    quando o SLA for implementado (Sprint 2, US#3.1).
 *  - `anterior_id`, se informado, deve apontar para uma O.S. existente;
 *  - o status inicial é `em_andamento`, conforme padrão do banco
 *
 * Regras da alteração de status:
 *  - o novo status deve ser um dos 5 oficiais;
 *  - o Gestor altera qualquer O.S.; o Técnico, só as que estão atribuídas a ele;
 *  - O.S. concluída ou cancelada não tem o status alterado;
 *  - o parecer técnico é obrigatório para concluir e opcional nos demais status;
 *  - a alteração e o registro de auditoria são gravados na mesma transação.
 */

import { prisma } from '../../prisma/client';
import { AppError } from '../errors/AppError';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import { serviceAuditoria } from './serviceAuditoria';
import type { DadosCriacaoOrdemServico, OrdemServico, DadosAlteracaoStatus } from '../models/modelOrdemServico';
import type { PerfilFuncionario } from '../models/modelFuncionario';
import {
    exigirEnum,
    exigirInteiroPositivo,
    exigirTexto,
    inteiroPositivoOpcional,
    lerCorpo,
} from '../../utils/validacao';

const TIPOS_ORDEM_SERVICO = ['instalacao', 'manutencao'] as const;
const NIVEIS_CRITICIDADE = ['baixo', 'medio', 'alto', 'muito_alto', 'urgente'] as const;
const STATUS_ORDEM_SERVICO = ['em_andamento', 'aguardando', 'validacao_testes', 'bloqueado', 'concluido'] as const;
const TEXTO_MAXIMO_DESCRICAO = 1000;
const TEXTO_MAXIMO_PARECER = 1000;

export class ServiceOrdemServico {
    private readonly repositorio: RepositoryOrdemServico;

    constructor(repositorio: RepositoryOrdemServico = repositoryOrdemServico) {
        this.repositorio = repositorio;
    }

    /** Lista todas as O.S. cadastradas, sem filtro (por enquanto). */
    async listar(): Promise<OrdemServico[]> {
        return this.repositorio.listar();
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
        const criticidade =
            dados.criticidade === undefined || dados.criticidade === null
                ? undefined
                : exigirEnum(dados.criticidade, NIVEIS_CRITICIDADE, 'criticidade');
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
        };
        if (criticidade !== undefined) {
            novaOS.criticidade = criticidade;
        }

        return this.repositorio.criar(novaOS);
    }

    /**
     * Altera o status de uma O.S. e registra o parecer técnico (US#2.4).
     * @param id Id da O.S. (vem da URL).
     * @param corpo O `req.body` recebido, com `status` e, opcionalmente, `parecer_tecnico`.
     * @param usuario Funcionário logado (vem do token, nunca do corpo).
     * @throws AppError 400 se os dados forem inválidos ou a alteração não for permitida.
     * @throws AppError 403 se o usuário for técnico e não for o responsável pela O.S.
     * @throws AppError 404 se a O.S. não existir.
     */
    async alterarStatus(
        id: number,
        corpo: unknown,
        usuario: { id: number; tipo: PerfilFuncionario },
    ): Promise<OrdemServico> {
        // 1. Valida o que chegou
        const idOS = exigirInteiroPositivo(id, 'id');
        const dados = lerCorpo(corpo);
        const novoStatus = exigirEnum(dados.status, STATUS_ORDEM_SERVICO, 'status');
        const parecerEnviado =
            dados.parecer_tecnico !== undefined && dados.parecer_tecnico !== null && dados.parecer_tecnico !== '';
        const parecer = parecerEnviado
            ? exigirTexto(dados.parecer_tecnico, 'parecer_tecnico', { maximo: TEXTO_MAXIMO_PARECER })
            : undefined;

        // 2. Busca a O.S.
        const ordem = await this.repositorio.buscarPorId(idOS);
        if (!ordem) {
            throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);
        }

        // 3. Checa a permissão: gestor altera qualquer O.S.; os demais, só as atribuídas a eles
        const ehResponsavel = ordem.responsavel_id === usuario.id;
        if (usuario.tipo !== 'gestor' && !ehResponsavel) {
            throw AppError.acessoNegado('Apenas o gestor ou o responsável pela O.S. pode alterar o status');
        }

        // 4. Checa a trava: O.S. concluída ou cancelada não muda mais
        if (ordem.status === 'concluido' || ordem.status === 'cancelado') {
            throw AppError.requisicaoInvalida(`A O.S. ${idOS} está ${ordem.status} e não pode ter o status alterado`);
        }
        if (ordem.status === novoStatus) {
            throw AppError.requisicaoInvalida(`A O.S. ${idOS} já está com o status ${novoStatus}`);
        }

        // 5. Checa o parecer: obrigatório para concluir
        if (novoStatus === 'concluido' && parecer === undefined) {
            throw AppError.requisicaoInvalida('parecer_tecnico é obrigatório para concluir a O.S.');
        }

                // 6. Grava o status e a auditoria na mesma transação
        const dadosStatus: DadosAlteracaoStatus = { status: novoStatus };
        if (parecer !== undefined) {
            dadosStatus.parecer_tecnico = parecer;
        }

        const atualizada = await prisma.$transaction(async (conexao) => {
            const ordemAtualizada = await this.repositorio.atualizarStatus(idOS, dadosStatus, conexao);

            await serviceAuditoria.registrar(
                {
                    os_id: idOS,
                    funcionario_id: usuario.id,
                    acao: 'atualizacao',
                    campo_alterado: 'status',
                    dado_antigo: ordem.status,
                    dado_novo: novoStatus,
                    justificativa: parecer ?? null,
                },
                conexao,
            );

            return ordemAtualizada;
        });

        // 7. Devolve a O.S. atualizada
        return atualizada;
    }
}

export const serviceOrdemServico = new ServiceOrdemServico();