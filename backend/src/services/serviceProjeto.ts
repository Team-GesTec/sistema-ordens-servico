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

    /** Listagem padrão mostra projetos ativos e respeita o departamento do usuário operacional. */
    async listarParaUsuario(usuario: Pick<import('../models/modelFuncionario').Funcionario, 'id' | 'tipo' | 'departamento_id'>): Promise<Projeto[]> {
        const projetos = await this.projetos.listar(true);
        if (usuario.tipo === 'gestor') return projetos;
        if (usuario.tipo === 'analista') {
            const departamento = await this.departamentos.buscarPorId(usuario.departamento_id);
            if (!departamento || departamento.responsavel_id !== usuario.id) throw AppError.acessoNegado('Analista/Líder não está configurado como responsável ativo do departamento.');
        }
        return projetos.filter((projeto) => projeto.departamentos.includes(usuario.departamento_id));
    }

    listar(): Promise<Projeto[]> {
        return this.projetos.listar(true);
    }

    /** Lista históricos sem ultrapassar as associações reais do departamento do usuário. */
    async listarInativosParaUsuario(usuario: Pick<import('../models/modelFuncionario').Funcionario, 'id' | 'tipo' | 'departamento_id'>): Promise<Projeto[]> {
        const inativos = await this.projetos.listar(false);
        if (usuario.tipo === 'gestor') return inativos;
        if (usuario.tipo === 'analista') {
            const departamento = await this.departamentos.buscarPorId(usuario.departamento_id);
            if (!departamento || departamento.responsavel_id !== usuario.id) throw AppError.acessoNegado('Analista/Líder não está configurado como responsável ativo do departamento.');
        }
        return inativos.filter((projeto) => projeto.departamentos.includes(usuario.departamento_id));
    }

    async buscarPorId(id: number, usuario: Pick<import('../models/modelFuncionario').Funcionario, 'id' | 'tipo' | 'departamento_id'>): Promise<ProjetoDetalhe> {
        const projeto = await this.projetos.buscarPorId(
            id,
            true,
            usuario.tipo === 'gestor' ? undefined : usuario.departamento_id,
            usuario.tipo === 'tecnico' ? usuario.id : undefined,
        );
        if (!projeto) throw AppError.naoEncontrado('Projeto não encontrado');
        if (usuario.tipo !== 'gestor' && !projeto.departamentos.includes(usuario.departamento_id)) throw AppError.naoEncontrado('Projeto não encontrado no escopo do seu departamento.');
        if (usuario.tipo === 'analista') {
            const departamento = await this.departamentos.buscarPorId(usuario.departamento_id);
            if (!departamento || departamento.responsavel_id !== usuario.id) throw AppError.acessoNegado('Analista/Líder não está configurado como responsável do departamento.');
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
        await this.garantirClienteExiste(clienteId, true);
        await this.garantirDepartamentosExistem(departamentos);
        return this.projetos.criar(novo, funcionarioId);
    }

    async atualizar(id: number, corpo: unknown, parcial: boolean, funcionarioId: number): Promise<Projeto> {
        const dados = lerCorpo(corpo);
        if (campoPresente(dados, 'ativo')) {
            throw AppError.requisicaoInvalida('O estado ativo/inativo deve ser alterado pela rota específica do projeto.');
        }
        const atual = await this.projetos.buscarPorId(id, true);
        if (!atual) throw AppError.naoEncontrado('Projeto não encontrado');
        if (!atual.ativo) throw AppError.conflito('Projeto inativo é somente histórico e não pode ser editado; duplique-o para criar um novo projeto.');
        const novoClienteInformado = !parcial || campoPresente(dados, 'cliente_id');
        if (novoClienteInformado) {
            const clienteIdInformado = exigirInteiroPositivo(dados.cliente_id, 'cliente_id');
            if (clienteIdInformado !== atual.cliente_id) {
                await this.garantirClienteExiste(clienteIdInformado, true);
            }
        }
        const alteracoes = await this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);
        return this.projetos.atualizar(id, alteracoes, funcionarioId);
    }

    async inativar(id: number, funcionarioId: number): Promise<Projeto> {
        const idProjeto = exigirInteiroPositivo(id, 'id');
        return this.projetos.inativar(idProjeto, funcionarioId);
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

    private async garantirClienteExiste(clienteId: number, exigirAtivo = false): Promise<void> {
        const cliente = await this.clientes.buscarPorId(clienteId);
        if (!cliente) {
            throw AppError.requisicaoInvalida('cliente_id não corresponde a um cliente existente.');
        }
        if (exigirAtivo && !cliente.ativo) {
            throw AppError.conflito('Não é possível criar um projeto ou alterar seu cliente para um cliente inativo.');
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
