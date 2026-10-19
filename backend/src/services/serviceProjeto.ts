/** Regras de negócio do CRUD de projetos (AJ-02). */
import { AppError } from '../errors/AppError';
import { repositoryCliente, type RepositoryCliente } from '../repositories/repositoryCliente';
import { repositoryDepartamento, type RepositoryDepartamento } from '../repositories/repositoryDepartamento';
import { repositoryProjeto, type RepositoryProjeto } from '../repositories/repositoryProjeto';
import {
    STATUS_PADRAO,
    STATUS_PROJETO,
    type DadosAtualizacaoProjeto,
    type DadosCriacaoProjeto,
    type Projeto,
    type ProjetoDetalhe,
} from '../models/modelProjeto';
import type { PerfilFuncionario } from '../models/modelFuncionario';
import {
    campoPresente,
    dataOpcional,
    exigirAlteracoes,
    exigirEnum,
    exigirInteiroPositivo,
    exigirListaDeIds,
    exigirTexto,
    lerCorpo,
    type CorpoRequisicao,
} from '../utils/validacao';

export class ServiceProjeto {
    private readonly projetos: RepositoryProjeto;
    private readonly clientes: RepositoryCliente;
    private readonly departamentos: RepositoryDepartamento;

    constructor(
        projetos: RepositoryProjeto = repositoryProjeto,
        clientes: RepositoryCliente = repositoryCliente,
        departamentos: RepositoryDepartamento = repositoryDepartamento,
    ) {
        this.projetos = projetos;
        this.clientes = clientes;
        this.departamentos = departamentos;
    }

    /** Listagem padrão mostra apenas projetos ativos. */
    listar(): Promise<Projeto[]> {
        return this.projetos.listar(true);
    }

    /** Listagem de inativos é usada pela rota protegida exclusiva de Gestor. */
    listarInativos(): Promise<Projeto[]> {
        return this.projetos.listar(false);
    }

    async buscarPorId(id: number, perfil: PerfilFuncionario): Promise<ProjetoDetalhe> {
        const projeto = await this.projetos.buscarPorId(id, perfil === 'gestor');
        if (!projeto) throw AppError.naoEncontrado('Projeto não encontrado');
        if (!projeto.ativo && perfil !== 'gestor') {
            throw AppError.acessoNegado('A consulta de projetos inativos é permitida apenas ao Gestor.');
        }
        return projeto;
    }

    async criar(corpo: unknown, funcionarioId: number): Promise<Projeto> {
        const dados = lerCorpo(corpo);
        if (campoPresente(dados, 'ativo')) {
            throw AppError.requisicaoInvalida('O estado ativo/inativo deve ser alterado pela rota específica do projeto.');
        }
        const clienteId = exigirInteiroPositivo(dados.cliente_id, 'cliente_id');
        const departamentos = exigirListaDeIds(dados.departamentos, 'departamentos');
        const novo: DadosCriacaoProjeto = {
            nome: exigirTexto(dados.nome, 'nome'),
            cliente_id: clienteId,
            departamentos,
            data_inicio: dataOpcional(dados.data_inicio, 'data_inicio'),
            data_fim: dataOpcional(dados.data_fim, 'data_fim'),
            status: dados.status === undefined ? STATUS_PADRAO : exigirEnum(dados.status, STATUS_PROJETO, 'status'),
        };
        await this.garantirClienteExiste(clienteId);
        await this.garantirDepartamentosExistem(departamentos);
        return this.projetos.criar(novo, funcionarioId);
    }

    async atualizar(id: number, corpo: unknown, parcial: boolean, funcionarioId: number): Promise<Projeto> {
        const dados = lerCorpo(corpo);
        if (campoPresente(dados, 'ativo')) {
            throw AppError.requisicaoInvalida('O estado ativo/inativo deve ser alterado pela rota específica do projeto.');
        }
        const alteracoes = await this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);
        return this.projetos.atualizar(id, alteracoes, funcionarioId);
    }

    async alterarAtivo(id: number, ativo: unknown, funcionarioId: number): Promise<Projeto> {
        const idProjeto = exigirInteiroPositivo(id, 'id');
        if (typeof ativo !== 'boolean') {
            throw AppError.requisicaoInvalida('O campo ativo deve ser true ou false.');
        }
        // A validação de estado e a regra de bloqueio devem ocorrer na mesma
        // transação que altera o projeto, sob bloqueio da linha no repositório.
        // Evita depender de uma leitura prévia vulnerável a concorrência.
        return this.projetos.alterarAtivo(idProjeto, ativo, funcionarioId);
    }

    private async montarAlteracoes(dados: CorpoRequisicao, parcial: boolean): Promise<DadosAtualizacaoProjeto> {
        const alteracoes: DadosAtualizacaoProjeto = {};
        if (!parcial || campoPresente(dados, 'nome')) {
            alteracoes.nome = exigirTexto(dados.nome, 'nome');
        }
        if (!parcial || campoPresente(dados, 'cliente_id')) {
            const clienteId = exigirInteiroPositivo(dados.cliente_id, 'cliente_id');
            await this.garantirClienteExiste(clienteId);
            alteracoes.cliente_id = clienteId;
        }
        if (!parcial || campoPresente(dados, 'departamentos')) {
            const departamentos = exigirListaDeIds(dados.departamentos, 'departamentos');
            await this.garantirDepartamentosExistem(departamentos);
            alteracoes.departamentos = departamentos;
        }
        if (!parcial || campoPresente(dados, 'data_inicio')) {
            alteracoes.data_inicio = dataOpcional(dados.data_inicio, 'data_inicio');
        }
        if (!parcial || campoPresente(dados, 'data_fim')) {
            alteracoes.data_fim = dataOpcional(dados.data_fim, 'data_fim');
        }
        if (!parcial || campoPresente(dados, 'status')) {
            alteracoes.status = exigirEnum(dados.status, STATUS_PROJETO, 'status');
        }
        return alteracoes;
    }

    private async garantirClienteExiste(clienteId: number): Promise<void> {
        if (!(await this.clientes.buscarPorId(clienteId))) {
            throw AppError.requisicaoInvalida('cliente_id não corresponde a um cliente existente.');
        }
    }

    private async garantirDepartamentosExistem(ids: number[]): Promise<void> {
        const encontrados = await Promise.all(ids.map((id) => this.departamentos.buscarPorId(id)));
        const inexistentes = ids.filter((_, indice) => encontrados[indice] === null);
        if (inexistentes.length > 0) {
            throw AppError.requisicaoInvalida(`Departamento(s) inexistente(s): ${inexistentes.join(', ')}`);
        }
    }
}

export const serviceProjeto = new ServiceProjeto();
