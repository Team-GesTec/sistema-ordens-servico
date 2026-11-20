/**
 * services/serviceAuditoria.ts
 *
 * Regras da trilha de auditoria das O.S.:
 *  - só grava: não existe método para alterar nem excluir registros;
 *  - deve ser chamado dentro da transação da operação auditada,
 *    recebendo a conexão dessa transação.
 *
 * Regras da consulta (US#2.10):
 *  - histórico de uma O.S.: só os registros daquela O.S.; 404 se a O.S. não existir;
 *    O.S. sem registros devolve lista vazia com a paginação zerada;
 *  - logs globais: busca livre (`busca`), filtro por tipo de evento (`tipo`), período
 *    (`data_inicio` e `data_fim`, dias "AAAA-MM-DD" no fuso de Brasília, ambos inclusive) e paginação;
 *    os indicadores dos cartões são calculados sobre o mesmo filtro, sem a paginação;
 *  - sempre do mais recente ao mais antigo, com desempate pelo id (decrescente);
 *  - data e hora entregues também em "dd/mm/aaaa hh:mm" (fuso de Brasília);
 *  - a restrição a Gestor é aplicada nas rotas (`autorizar('gestor')`).
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE01: novo `registrarLancamentoHoras`, pronto para a US#2.7 chamar dentro da
 *    transação do lançamento de horas.
 *  - 2.10-BE02: `listarPorOrdemServico` paginado e com 404 para O.S. inexistente.
 *  - 2.10-BE03: novo `listarLogs`, com busca, filtro por tipo, paginação e indicadores.
 *
 * ALTERAÇÕES (06/11/2026):
 *  - `listarLogs` aceita o período `data_inicio`/`data_fim`.
 */

import { repositoryAuditoria, type RepositoryAuditoria } from '../repositories/repositoryAuditoria';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import { AppError } from '../errors/AppError';
import { descreverAuditoria } from '../utils/descricaoAuditoria';
import { fimDoDiaNoFuso } from '../utils/diasUteis';
import { FUSO_EXIBICAO, formatarDataHora, inicioDoDia, inicioDoDiaNoFuso, lerDiaCalendario } from '../utils/dataHora';
import { exigirEnum, textoOpcional } from '../utils/validacao';
import type { Prisma } from '../prisma/generated/client';
import {
    TIPOS_EVENTO_AUDITORIA,
    type AtividadeAuditoria,
    type Auditoria,
    type AuditoriaComRelacoes,
    type DadosRegistroAuditoria,
    type FiltroLogsAuditoria,
    type Paginacao,
    type PedidoPagina,
    type RespostaHistoricoOrdemServico,
    type RespostaLogsAuditoria,
} from '../models/modelAuditoria';

/** Itens por página quando `limite` não é informado (mesmo tamanho da tela de logs). */
const LIMITE_PADRAO = 10;

/** Maior `limite` aceito por página. */
const LIMITE_MAXIMO = 100;

/** Tamanho máximo do termo de busca. */
const TAMANHO_MAXIMO_BUSCA = 100;

/** Lançamento de horas (US#2.7) que será registrado na auditoria. */
export interface LancamentoHorasAuditado {
    id: number;
    os_id: number;
    data_trabalho: Date;
    duracao_minutos: number;
    descricao: string | null;
}

/** Converte "90" minutos em "1h30". */
function formatarDuracao(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas === 0) return `${resto}min`;
    return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
}

/**
 * Lê um inteiro positivo opcional da query string.
 * @throws AppError 400 se vier algo que não seja um inteiro dentro do limite.
 */
function inteiroDaQuery(valor: unknown, campo: string, padrao: number, maximo: number): number {
    if (valor === undefined || valor === '') return padrao;
    const numero = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : Number.NaN;
    if (!Number.isSafeInteger(numero) || numero < 1 || numero > maximo) {
        throw AppError.requisicaoInvalida(`${campo} inválido: informe um número inteiro entre 1 e ${maximo}`);
    }
    return numero;
}

/** Lê `pagina` e `limite` da query string. */
function lerPedidoPagina(query: Record<string, unknown>): PedidoPagina {
    return {
        pagina: inteiroDaQuery(query.pagina, 'pagina', 1, Number.MAX_SAFE_INTEGER),
        limite: inteiroDaQuery(query.limite, 'limite', LIMITE_PADRAO, LIMITE_MAXIMO),
    };
}

/**
 * Lê um dia opcional "AAAA-MM-DD" da query string.
 * @throws AppError 400 se não for uma data real nesse formato.
 */
function diaDaQuery(valor: unknown, campo: string): string | null {
    if (valor === undefined || valor === '') return null;
    const dia = typeof valor === 'string' ? lerDiaCalendario(valor) : null;
    if (dia === null) {
        throw AppError.requisicaoInvalida(`${campo} inválida: informe uma data no formato AAAA-MM-DD`);
    }
    return dia;
}

/** Metadados de paginação; sem registros, `total` e `total_paginas` ficam zerados. */
function montarPaginacao(pedido: PedidoPagina, total: number): Paginacao {
    return {
        pagina: pedido.pagina,
        limite: pedido.limite,
        total,
        total_paginas: Math.ceil(total / pedido.limite),
    };
}

/** Converte o registro do banco no formato de exibição. */
function paraAtividade(registro: AuditoriaComRelacoes): AtividadeAuditoria {
    return {
        id: registro.id,
        os_id: registro.os_id,
        funcionario_id: registro.funcionario_id,
        data_modificacao: registro.data_modificacao,
        data_hora: formatarDataHora(registro.data_modificacao),
        acao: registro.acao,
        tipo_evento: registro.tipo_evento,
        // Registros anteriores à US#2.10 não têm descrição gravada
        descricao: registro.descricao ?? descreverAuditoria(registro),
        campo_alterado: registro.campo_alterado,
        dado_antigo: registro.dado_antigo,
        dado_novo: registro.dado_novo,
        justificativa: registro.justificativa,
        parecer: registro.parecer,
        apontamento_id: registro.apontamento_id,
        funcionarios: registro.funcionarios,
        ordem_servico: registro.ordens_servico,
    };
}

export class ServiceAuditoria {
    private readonly repositorio: RepositoryAuditoria;
    private readonly ordens: RepositoryOrdemServico;

    constructor(
        repositorio: RepositoryAuditoria = repositoryAuditoria,
        ordens: RepositoryOrdemServico = repositoryOrdemServico,
    ) {
        this.repositorio = repositorio;
        this.ordens = ordens;
    }

    async registrar(
        dados: DadosRegistroAuditoria,
        conexao: Prisma.TransactionClient,
    ): Promise<Auditoria> {
        return this.repositorio.registrar(dados, conexao);
    }

    /**
     * Registra um lançamento de horas (US#2.7). Deve ser chamado dentro da transação que grava
     * o lançamento: se a auditoria falhar, o lançamento é desfeito junto.
     * @param lancamento Registro de `apontamento_horas` recém-criado na mesma transação.
     * @param funcionarioId Funcionário logado que fez o lançamento.
     */
    async registrarLancamentoHoras(
        lancamento: LancamentoHorasAuditado,
        funcionarioId: number,
        conexao: Prisma.TransactionClient,
    ): Promise<Auditoria> {
        const duracao = formatarDuracao(lancamento.duracao_minutos);
        const dia = formatarDataHora(lancamento.data_trabalho, 'UTC').slice(0, 10);

        return this.repositorio.registrar(
            {
                os_id: lancamento.os_id,
                funcionario_id: funcionarioId,
                acao: 'insercao',
                tipo_evento: 'registro_horas',
                campo_alterado: 'apontamento_horas',
                dado_antigo: null,
                dado_novo: String(lancamento.duracao_minutos),
                justificativa: lancamento.descricao,
                descricao: `${duracao} registradas em ${dia}`,
                apontamento_id: lancamento.id,
            },
            conexao,
        );
    }

    /**
     * Histórico de atividades de uma O.S. (somente leitura).
     * @param osId Id da O.S. (vem da URL).
     * @param query `req.query`, com `pagina` e `limite` opcionais.
     * @throws AppError 400 se a paginação for inválida.
     * @throws AppError 404 se a O.S. não existir.
     */
    async listarPorOrdemServico(osId: number, query: Record<string, unknown>): Promise<RespostaHistoricoOrdemServico> {
        const pedido = lerPedidoPagina(query);

        const ordem = await this.ordens.buscarPorId(osId);
        if (!ordem) {
            throw AppError.naoEncontrado(`O.S. ${osId} não encontrada`);
        }

        const { registros, total } = await this.repositorio.listarPorOrdemServico(osId, pedido);
        return {
            dados: registros.map(paraAtividade),
            paginacao: montarPaginacao(pedido, total),
        };
    }

    /**
     * Logs de auditoria de todas as O.S. (somente leitura), com os indicadores da tela.
     * @param query `req.query`, com `busca`, `tipo`, `data_inicio`, `data_fim`, `pagina` e `limite` opcionais.
     * @throws AppError 400 se o tipo, o período ou a paginação forem inválidos.
     */
    async listarLogs(query: Record<string, unknown>): Promise<RespostaLogsAuditoria> {
        const diaInicio = diaDaQuery(query.data_inicio, 'data_inicio');
        const diaFim = diaDaQuery(query.data_fim, 'data_fim');
        if (diaInicio !== null && diaFim !== null && diaInicio > diaFim) {
            throw AppError.requisicaoInvalida('data_inicio não pode ser posterior a data_fim');
        }

        const filtro: FiltroLogsAuditoria = {
            dataInicio: diaInicio === null ? null : inicioDoDia(diaInicio),
            dataFim: diaFim === null ? null : fimDoDiaNoFuso(diaFim, FUSO_EXIBICAO),
            ...lerPedidoPagina(query),
            busca: textoOpcional(query.busca, 'busca', { maximo: TAMANHO_MAXIMO_BUSCA }),
            tipo:
                query.tipo === undefined || query.tipo === ''
                    ? null
                    : exigirEnum(query.tipo, TIPOS_EVENTO_AUDITORIA, 'tipo'),
        };

        const [{ registros, total }, indicadores] = await Promise.all([
            this.repositorio.listarLogs(filtro),
            this.repositorio.calcularIndicadores(filtro, inicioDoDiaNoFuso(new Date())),
        ]);

        return {
            dados: registros.map(paraAtividade),
            paginacao: montarPaginacao(filtro, total),
            indicadores: {
                total_eventos: indicadores.total,
                eventos_hoje: indicadores.hoje,
                ordens_impactadas: indicadores.ordens,
                ultimo_evento: indicadores.ultimo,
                ultimo_evento_formatado: indicadores.ultimo ? formatarDataHora(indicadores.ultimo) : null,
            },
        };
    }
}

export const serviceAuditoria = new ServiceAuditoria();
