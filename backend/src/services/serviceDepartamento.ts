/**
 * services/serviceDepartamento.ts
 *
 * Regras de negócio de Departamento (US#4.2: cadastro de departamentos — Hardware, Compras, SST...).
 *
 * Regras:
 *   - `nome` é obrigatório (até 100 caracteres).
 *   - `responsavel_id` é opcional; se vier, precisa ser um funcionário existente.
 *     (Não é exigido que o responsável pertença ao próprio departamento — regra não definida na US.)
 */

import { AppError } from '../errors/AppError';
import { repositoryDepartamento, type RepositoryDepartamento } from '../repositories/repositoryDepartamento';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import { repositoryProjeto, type RepositoryProjeto } from '../repositories/repositoryProjeto';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import type { PerfilFuncionario } from '../models/modelFuncionario';
import type {
    DadosAtualizacaoDepartamento,
    DadosCriacaoDepartamento,
    Departamento,
} from '../models/modelDepartamento';
import {
    campoPresente,
    exigirAlteracoes,
    exigirInteiroPositivo,
    exigirTexto,
    inteiroPositivoOpcional,
    lerCorpo,
    type CorpoRequisicao,
} from '../utils/validacao';

/** Tamanho máximo do nome do departamento. */
const NOME_MAXIMO = 100;

export class ServiceDepartamento {
    private readonly departamentos: RepositoryDepartamento;
    private readonly funcionarios: RepositoryFuncionario;
    private readonly projetos: RepositoryProjeto;
    private readonly ordensServico: RepositoryOrdemServico;

    /**
     * @param departamentos Repository de departamentos (pode ser trocado em testes).
     * @param funcionarios Repository de funcionários, usado para validar o responsável.
     */
    constructor(
        departamentos: RepositoryDepartamento = repositoryDepartamento,
        funcionarios: RepositoryFuncionario = repositoryFuncionario,
        projetos: RepositoryProjeto = repositoryProjeto,
        ordensServico: RepositoryOrdemServico = repositoryOrdemServico,
    ) {
        this.departamentos = departamentos;
        this.funcionarios = funcionarios;
        this.projetos = projetos;
        this.ordensServico = ordensServico;
    }

    /** Lista somente departamentos ativos. */
    listar(): Promise<Departamento[]> {
        return this.departamentos.listar(true);
    }

    /** Lista somente departamentos inativos. */
    listarInativos(): Promise<Departamento[]> {
        return this.departamentos.listar(false);
    }

    /**
     * Busca um departamento pelo id.
     * @throws AppError 404 se não existir.
     */
    async buscarPorId(id: number): Promise<Departamento> {
        const departamento = await this.departamentos.buscarPorId(id);
        if (!departamento) {
            throw AppError.naoEncontrado('Departamento não encontrado');
        }
        return departamento;
    }

    async buscarEquipe(
        id: number,
        historico: boolean,
        perfil: PerfilFuncionario,
    ) {
        if (historico && perfil !== 'gestor') {
            throw AppError.acessoNegado(
                'A consulta do histórico do departamento é permitida apenas ao Gestor.',
            );
        }

        const departamento = await this.buscarPorId(id);

        const [funcionarios, projetos, ordens_servico] = await Promise.all([
            this.funcionarios.listarPorDepartamento(id, historico),
            this.projetos.listarPorDepartamento(id, historico),
            this.ordensServico.listarPorDepartamento(id, historico),
        ]);

        return {
            departamento,
            funcionarios,
            projetos,
            ordens_servico,
        };
    }

    /**
     * Valida o corpo e cria um departamento.
     * @param corpo O `req.body` recebido (`nome`, `responsavel_id?`).
     */
    async criar(corpo: unknown): Promise<Departamento> {
        const dados = lerCorpo(corpo);
        if (campoPresente(dados, 'ativo')) {
            throw AppError.requisicaoInvalida(
                'O estado ativo/inativo deve ser alterado pela rota específica do departamento.'
            );
        }
        const novo: DadosCriacaoDepartamento = {
            nome: exigirTexto(dados.nome, 'nome', { maximo: NOME_MAXIMO }),
            responsavel_id: await this.validarResponsavel(dados.responsavel_id),
        };
        return this.departamentos.criar(novo);
    }

    /**
     * Valida o corpo e atualiza um departamento.
     * @param id Id do departamento.
     * @param corpo O `req.body` recebido.
     * @param parcial `false` (PUT) exige `nome` e trata `responsavel_id` ausente como `null`;
     *                `true` (PATCH) altera só o que foi enviado.
     */
    async atualizar(id: number, corpo: unknown, parcial: boolean): Promise<Departamento> {
        const dados = lerCorpo(corpo);
        const alteracoes = await this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);
        return this.departamentos.atualizar(id, alteracoes);
    }

    /** Altera o estado ativo/inativo do departamento. */
    async alterarAtivo(id: number, ativo: unknown): Promise<Departamento> {
        const idDepartamento = exigirInteiroPositivo(id, 'id');

        if (typeof ativo !== 'boolean') {
            throw AppError.requisicaoInvalida('O campo ativo deve ser true ou false.');
        }

        return this.departamentos.alterarAtivo(idDepartamento, ativo);
    }

    /** Monta o objeto de alterações conforme o modo (PUT ou PATCH). */
    private async montarAlteracoes(dados: CorpoRequisicao, parcial: boolean): Promise<DadosAtualizacaoDepartamento> {
        const alteracoes: DadosAtualizacaoDepartamento = {};
        if (!parcial || campoPresente(dados, 'nome')) {
            alteracoes.nome = exigirTexto(dados.nome, 'nome', { maximo: NOME_MAXIMO });
        }
        if (!parcial || campoPresente(dados, 'responsavel_id')) {
            alteracoes.responsavel_id = await this.validarResponsavel(dados.responsavel_id);
        }
        return alteracoes;
    }

    /**
     * Valida `responsavel_id`: aceita ausente/null; se for um id, confere se o funcionário existe.
     * @returns O id validado ou `null`.
     * @throws AppError 400 se o funcionário não existir.
     */
    private async validarResponsavel(valor: unknown): Promise<number | null> {
        const responsavelId = inteiroPositivoOpcional(valor, 'responsavel_id');
        if (responsavelId !== null) {
            const responsavel = await this.funcionarios.buscarPorId(responsavelId);
            if (!responsavel) {
                throw AppError.requisicaoInvalida('responsavel_id não corresponde a um funcionário existente');
            }
            if (!responsavel.ativo) {
                throw AppError.requisicaoInvalida('responsavel_id não pode corresponder a um funcionário inativo');
            }
        }
        return responsavelId;
    }
}

/** Instância única usada pelo controller. */
export const serviceDepartamento = new ServiceDepartamento();
