/**
 * services/serviceProjeto.ts
 *
 * Regras de negócio de Projeto (US#1.2: projeto de implantação associado a um cliente, com a
 * seleção dos departamentos envolvidos — é o agrupador central das O.S.).
 *
 * Regras:
 *   - `cliente_id` é obrigatório e precisa existir.
 *   - `departamentos` (lista de ids) é obrigatório no cadastro, com pelo menos um departamento
 *     existente; ids repetidos são ignorados.
 *   - `data_prazo` é opcional (data ISO); `status` é opcional (padrão `pendente`).
 */
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
} from '../models/modelProjeto';
import {
    campoPresente,
    dataOpcional,
    exigirAlteracoes,
    exigirEnum,
    exigirInteiroPositivo,
    exigirListaDeIds,
    lerCorpo,
    type CorpoRequisicao,
} from '../../utils/validacao';

export class ServiceProjeto {
    private readonly projetos: RepositoryProjeto;
    private readonly clientes: RepositoryCliente;
    private readonly departamentos: RepositoryDepartamento;

    /**
     * @param projetos Repository de projetos (pode ser trocado em testes).
     * @param clientes Repository de clientes, usado para validar `cliente_id`.
     * @param departamentos Repository de departamentos, usado para validar a lista de departamentos.
     */
    constructor(
        projetos: RepositoryProjeto = repositoryProjeto,
        clientes: RepositoryCliente = repositoryCliente,
        departamentos: RepositoryDepartamento = repositoryDepartamento,
    ) {
        this.projetos = projetos;
        this.clientes = clientes;
        this.departamentos = departamentos;
    }

    /** Lista todos os projetos com seus departamentos. */
    listar(): Promise<Projeto[]> {
        return this.projetos.listar();
    }

    /**
     * Busca um projeto pelo id.
     * @throws AppError 404 se não existir.
     */
    async buscarPorId(id: number): Promise<Projeto> {
        const projeto = await this.projetos.buscarPorId(id);
        if (!projeto) {
            throw AppError.naoEncontrado('Projeto não encontrado');
        }
        return projeto;
    }

    /**
     * Valida o corpo e abre um projeto.
     * @param corpo O `req.body` (`cliente_id`, `departamentos`, `data_prazo?`, `status?`).
     */
    async criar(corpo: unknown): Promise<Projeto> {
        const dados = lerCorpo(corpo);
        const clienteId = exigirInteiroPositivo(dados.cliente_id, 'cliente_id');
        const departamentos = exigirListaDeIds(dados.departamentos, 'departamentos');
        const novo: DadosCriacaoProjeto = {
            cliente_id: clienteId,
            departamentos,
            data_prazo: dataOpcional(dados.data_prazo, 'data_prazo'),
            status: dados.status === undefined ? STATUS_PADRAO : exigirEnum(dados.status, STATUS_PROJETO, 'status'),
        };
        await this.garantirClienteExiste(clienteId);
        await this.garantirDepartamentosExistem(departamentos);
        return this.projetos.criar(novo);
    }

    /**
     * Valida o corpo e atualiza um projeto.
     * @param id Id do projeto.
     * @param corpo O `req.body` recebido.
     * @param parcial `false` (PUT): exige `cliente_id`, `departamentos` e `status`; `data_prazo`
     *                ausente vira `null`. `true` (PATCH): altera só o que foi enviado
     *                (ex.: `{ "status": "em_andamento" }`).
     */
    async atualizar(id: number, corpo: unknown, parcial: boolean): Promise<Projeto> {
        const dados = lerCorpo(corpo);
        const alteracoes = await this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);
        return this.projetos.atualizar(id, alteracoes);
    }

    /** Remove um projeto (bloqueado pelo banco se houver O.S. vinculadas). */
    remover(id: number): Promise<void> {
        return this.projetos.remover(id);
    }

    /** Monta o objeto de alterações conforme o modo (PUT ou PATCH). */
    private async montarAlteracoes(dados: CorpoRequisicao, parcial: boolean): Promise<DadosAtualizacaoProjeto> {
        const alteracoes: DadosAtualizacaoProjeto = {};
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
        if (!parcial || campoPresente(dados, 'data_prazo')) {
            alteracoes.data_prazo = dataOpcional(dados.data_prazo, 'data_prazo');
        }
        if (!parcial || campoPresente(dados, 'status')) {
            alteracoes.status = exigirEnum(dados.status, STATUS_PROJETO, 'status');
        }
        return alteracoes;
    }

    /**
     * Confere se o cliente existe.
     * @throws AppError 400 se não existir.
     */
    private async garantirClienteExiste(clienteId: number): Promise<void> {
        if (!(await this.clientes.buscarPorId(clienteId))) {
            throw AppError.requisicaoInvalida('cliente_id não corresponde a um cliente existente');
        }
    }

    /**
     * Confere se todos os departamentos existem (consulta pelo cache, em paralelo).
     * @throws AppError 400 listando os ids inexistentes.
     */
    private async garantirDepartamentosExistem(ids: number[]): Promise<void> {
        const encontrados = await Promise.all(ids.map((id) => this.departamentos.buscarPorId(id)));
        const inexistentes = ids.filter((_, indice) => encontrados[indice] === null);
        if (inexistentes.length > 0) {
            throw AppError.requisicaoInvalida(`Departamento(s) inexistente(s): ${inexistentes.join(', ')}`);
        }
    }
}

/** Instância única usada pelo controller. */
export const serviceProjeto = new ServiceProjeto();
