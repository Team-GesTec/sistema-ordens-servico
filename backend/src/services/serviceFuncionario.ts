/**
 * services/serviceFuncionario.ts
 *
 * Regras de negócio de Funcionário (US#4.2: cadastro de técnicos/colaboradores).
 *
 * Regras:
 *   - `usuario` é o login: obrigatório, único, guardado em minúsculas, sem espaços
 *     (letras, números e . _ - @ — dá para usar o e-mail como usuário).
 *   - `senha`: mínimo de 8 caracteres; é guardada só como hash bcrypt (`senha_hash`).
 *     No PUT/PATCH a senha é opcional: se não vier, a atual é mantida.
 *   - `tipo` (perfil): gestor | analista | tecnico. No cadastro, o padrão é `tecnico`.
 *     No PUT é obrigatório — assim um PUT sem `tipo` não rebaixa um gestor sem querer.
 *   - `departamento_id` precisa existir.
 *   - Ninguém pode excluir o próprio usuário, e o sistema nunca fica sem nenhum gestor
 *     (não é possível excluir nem rebaixar o último gestor).
 */
import { AppError } from '../errors/AppError';
import { repositoryDepartamento, type RepositoryDepartamento } from '../repositories/repositoryDepartamento';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import {
    PERFIL_PADRAO,
    PERFIS_FUNCIONARIO,
    type DadosAtualizacaoFuncionario,
    type DadosCriacaoFuncionario,
    type Funcionario,
    type PerfilFuncionario,
} from '../models/modelFuncionario';
import { gerarHashSenha, validarSenha } from '../../utils/senha';
import {
    campoPresente,
    exigirAlteracoes,
    exigirEnum,
    exigirInteiroPositivo,
    exigirTexto,
    lerCorpo,
    type CorpoRequisicao,
} from '../../utils/validacao';

/** Perfil com permissão de administração. */
const PERFIL_GESTOR: PerfilFuncionario = 'gestor';

/** Caracteres aceitos no nome de usuário (após converter para minúsculas). */
const FORMATO_USUARIO = /^[a-z0-9._@-]+$/;

/** Limites de tamanho. */
const USUARIO_MAXIMO = 100;
const NOME_MAXIMO = 150;

/**
 * Normaliza e valida o nome de usuário.
 * Exportada porque o login usa exatamente a mesma normalização.
 * @param valor Valor recebido.
 * @returns O usuário em minúsculas, sem espaços nas pontas.
 */
export function normalizarUsuario(valor: unknown): string {
    const usuario = exigirTexto(valor, 'usuario', { maximo: USUARIO_MAXIMO }).toLowerCase();
    if (!FORMATO_USUARIO.test(usuario)) {
        throw AppError.requisicaoInvalida('usuario só pode ter letras, números e os caracteres . _ - @ (sem espaços)');
    }
    return usuario;
}

export class ServiceFuncionario {
    private readonly funcionarios: RepositoryFuncionario;
    private readonly departamentos: RepositoryDepartamento;

    /**
     * @param funcionarios Repository de funcionários (pode ser trocado em testes).
     * @param departamentos Repository de departamentos, usado para validar `departamento_id`.
     */
    constructor(
        funcionarios: RepositoryFuncionario = repositoryFuncionario,
        departamentos: RepositoryDepartamento = repositoryDepartamento,
    ) {
        this.funcionarios = funcionarios;
        this.departamentos = departamentos;
    }

    /** Lista todos os funcionários (sem senha). */
    listar(): Promise<Funcionario[]> {
        return this.funcionarios.listar();
    }

    /**
     * Busca um funcionário pelo id.
     * @throws AppError 404 se não existir.
     */
    async buscarPorId(id: number): Promise<Funcionario> {
        const funcionario = await this.funcionarios.buscarPorId(id);
        if (!funcionario) {
            throw AppError.naoEncontrado('Funcionário não encontrado');
        }
        return funcionario;
    }

    /**
     * Valida o corpo e cadastra um funcionário.
     * @param corpo O `req.body` (`departamento_id`, `usuario`, `senha`, `nome`, `tipo?`).
     */
    async criar(corpo: unknown): Promise<Funcionario> {
        const dados = lerCorpo(corpo);
        const departamentoId = exigirInteiroPositivo(dados.departamento_id, 'departamento_id');
        const usuario = normalizarUsuario(dados.usuario);
        const senha = validarSenha(dados.senha);
        const nome = exigirTexto(dados.nome, 'nome', { maximo: NOME_MAXIMO });
        const tipo =
            dados.tipo === undefined ? PERFIL_PADRAO : exigirEnum(dados.tipo, PERFIS_FUNCIONARIO, 'tipo');

        await this.garantirDepartamentoExiste(departamentoId);

        const novo: DadosCriacaoFuncionario = {
            departamento_id: departamentoId,
            usuario,
            senha_hash: await gerarHashSenha(senha),
            nome,
            tipo,
        };
        return this.funcionarios.criar(novo);
    }

    /**
     * Valida o corpo e atualiza um funcionário.
     * @param id Id do funcionário.
     * @param corpo O `req.body` recebido.
     * @param parcial `false` (PUT): exige `departamento_id`, `usuario`, `nome` e `tipo`;
     *                `true` (PATCH): altera só o que foi enviado. Em ambos, `senha` é opcional.
     */
    async atualizar(id: number, corpo: unknown, parcial: boolean): Promise<Funcionario> {
        const dados = lerCorpo(corpo);
        const atual = await this.buscarPorId(id);
        const alteracoes = await this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);

        const deixaDeSerGestor =
            atual.tipo === PERFIL_GESTOR && alteracoes.tipo !== undefined && alteracoes.tipo !== PERFIL_GESTOR;
        if (deixaDeSerGestor) {
            await this.garantirQueSobraOutroGestor();
        }

        return this.funcionarios.atualizar(id, alteracoes);
    }

    /**
     * Remove um funcionário.
     * @param id Id do funcionário a remover.
     * @param idSolicitante Id de quem está pedindo a remoção (vem do token).
     * @throws AppError 409 ao tentar remover a si mesmo ou o último gestor.
     */
    async remover(id: number, idSolicitante: number): Promise<void> {
        if (id === idSolicitante) {
            throw AppError.conflito('Você não pode excluir o seu próprio usuário');
        }
        const alvo = await this.buscarPorId(id);
        if (alvo.tipo === PERFIL_GESTOR) {
            await this.garantirQueSobraOutroGestor();
        }
        await this.funcionarios.remover(id);
    }

    /** Monta o objeto de alterações conforme o modo (PUT ou PATCH). */
    private async montarAlteracoes(dados: CorpoRequisicao, parcial: boolean): Promise<DadosAtualizacaoFuncionario> {
        const alteracoes: DadosAtualizacaoFuncionario = {};
        if (!parcial || campoPresente(dados, 'departamento_id')) {
            const departamentoId = exigirInteiroPositivo(dados.departamento_id, 'departamento_id');
            await this.garantirDepartamentoExiste(departamentoId);
            alteracoes.departamento_id = departamentoId;
        }
        if (!parcial || campoPresente(dados, 'usuario')) {
            alteracoes.usuario = normalizarUsuario(dados.usuario);
        }
        if (!parcial || campoPresente(dados, 'nome')) {
            alteracoes.nome = exigirTexto(dados.nome, 'nome', { maximo: NOME_MAXIMO });
        }
        if (!parcial || campoPresente(dados, 'tipo')) {
            alteracoes.tipo = exigirEnum(dados.tipo, PERFIS_FUNCIONARIO, 'tipo');
        }
        // Senha é opcional nos dois modos: ausente = mantém a atual.
        if (campoPresente(dados, 'senha')) {
            alteracoes.senha_hash = await gerarHashSenha(validarSenha(dados.senha));
        }
        return alteracoes;
    }

    /**
     * Confere se o departamento existe.
     * @throws AppError 400 se não existir.
     */
    private async garantirDepartamentoExiste(departamentoId: number): Promise<void> {
        if (!(await this.departamentos.buscarPorId(departamentoId))) {
            throw AppError.requisicaoInvalida('departamento_id não corresponde a um departamento existente');
        }
    }

    /**
     * Impede que o sistema fique sem gestor: só permite a operação se existir mais de um.
     * @throws AppError 409 se houver apenas um gestor.
     */
    private async garantirQueSobraOutroGestor(): Promise<void> {
        const gestores = (await this.funcionarios.listar()).filter((f) => f.tipo === PERFIL_GESTOR);
        if (gestores.length <= 1) {
            throw AppError.conflito('Operação bloqueada: o sistema precisa ter pelo menos um gestor');
        }
    }
}

/** Instância única usada pelo controller. */
export const serviceFuncionario = new ServiceFuncionario();
