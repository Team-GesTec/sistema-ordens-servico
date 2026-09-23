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
import type {
    DadosAtualizacaoDepartamento,
    DadosCriacaoDepartamento,
    Departamento,
} from '../models/modelDepartamento';
import {
    campoPresente,
    exigirAlteracoes,
    exigirTexto,
    inteiroPositivoOpcional,
    lerCorpo,
    type CorpoRequisicao,
} from '../../utils/validacao';

/** Tamanho máximo do nome do departamento. */
const NOME_MAXIMO = 100;

export class ServiceDepartamento {
    private readonly departamentos: RepositoryDepartamento;
    private readonly funcionarios: RepositoryFuncionario;

    /**
     * @param departamentos Repository de departamentos (pode ser trocado em testes).
     * @param funcionarios Repository de funcionários, usado para validar o responsável.
     */
    constructor(
        departamentos: RepositoryDepartamento = repositoryDepartamento,
        funcionarios: RepositoryFuncionario = repositoryFuncionario,
    ) {
        this.departamentos = departamentos;
        this.funcionarios = funcionarios;
    }

    /** Lista todos os departamentos. */
    listar(): Promise<Departamento[]> {
        return this.departamentos.listar();
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

    /**
     * Valida o corpo e cria um departamento.
     * @param corpo O `req.body` recebido (`nome`, `responsavel_id?`).
     */
    async criar(corpo: unknown): Promise<Departamento> {
        const dados = lerCorpo(corpo);
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

    /** Remove um departamento (o banco bloqueia se houver vínculos). */
    remover(id: number): Promise<void> {
        return this.departamentos.remover(id);
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
        if (responsavelId !== null && !(await this.funcionarios.buscarPorId(responsavelId))) {
            throw AppError.requisicaoInvalida('responsavel_id não corresponde a um funcionário existente');
        }
        return responsavelId;
    }
}

/** Instância única usada pelo controller. */
export const serviceDepartamento = new ServiceDepartamento();
