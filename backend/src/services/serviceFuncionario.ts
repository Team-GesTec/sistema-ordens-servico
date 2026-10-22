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
 *   - A inativação é lógica, não pode ser feita pelo próprio Gestor e nunca pode deixar o sistema
 *     sem pelo menos um Gestor ativo. O repository aplica a proteção concorrente no banco.
 */
import { AppError } from '../errors/AppError';
import { prisma } from '../prisma/client';
import { repositoryDepartamento, type RepositoryDepartamento } from '../repositories/repositoryDepartamento';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import {
    PERFIL_PADRAO,
    PERFIS_FUNCIONARIO,
    type DadosAtualizacaoFuncionario,
    type DadosCriacaoFuncionario,
    type Funcionario,
} from '../models/modelFuncionario';
import { gerarHashSenha, validarSenha } from '../utils/senha';
import {
    campoPresente,
    exigirAlteracoes,
    exigirEnum,
    exigirInteiroPositivo,
    exigirTexto,
    lerCorpo,
    type CorpoRequisicao,
} from '../utils/validacao';

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

    /** Lista de funcionários ativos restrita ao departamento do usuário operacional. */
    async listarParaUsuario(usuario: Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>): Promise<Funcionario[]> {
        const funcionarios = await this.funcionarios.listar();
        if (usuario.tipo === 'gestor') return funcionarios;
        if (usuario.tipo === 'analista') {
            const departamento = await this.departamentos.buscarPorId(usuario.departamento_id);
            if (!departamento || departamento.responsavel_id !== usuario.id) throw AppError.acessoNegado('Analista/Líder não está configurado como responsável do departamento.');
        }
        return funcionarios.filter((funcionario) => funcionario.departamento_id === usuario.departamento_id && funcionario.tipo !== 'gestor');
    }

    listar(): Promise<Funcionario[]> {
        return this.funcionarios.listar();
    }

    /** Lista históricos dentro do escopo do perfil; não concede visibilidade global a inativos. */
    async listarInativosParaUsuario(usuario: Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>): Promise<Funcionario[]> {
        const inativos = await this.funcionarios.listarInativos();
        if (usuario.tipo === 'gestor') return inativos;
        if (usuario.tipo === 'analista') {
            const departamento = await this.departamentos.buscarPorId(usuario.departamento_id);
            if (!departamento || departamento.responsavel_id !== usuario.id) {
                throw AppError.acessoNegado('Analista/Líder não está configurado como responsável do departamento.');
            }
        }
        if (usuario.tipo === 'analista') {
            return inativos.filter((funcionario) =>
                funcionario.departamento_id === usuario.departamento_id && funcionario.tipo !== 'gestor',
            );
        }

        // O histórico do técnico só inclui funcionários identificados em O.S. que ele pode consultar.
        const ordensVisiveis = await prisma.ordens_servico.findMany({
            where: {
                departamento_id: usuario.departamento_id,
                OR: [
                    { responsavel_id: null },
                    { responsavel_id: usuario.id },
                    { solicitante_id: usuario.id },
                ],
            },
            select: { responsavel_id: true, solicitante_id: true },
        });
        const funcionariosRelacionados = new Set<number>(ordensVisiveis.flatMap((ordem) => [
            ordem.responsavel_id,
            ordem.solicitante_id,
        ]).filter((id): id is number => id !== null));
        return inativos.filter((funcionario) =>
            funcionario.departamento_id === usuario.departamento_id &&
            funcionario.tipo !== 'gestor' &&
            funcionariosRelacionados.has(funcionario.id),
        );
    }

    /** Detalhe ativo ou histórico é permitido somente dentro do escopo do perfil. */
    async buscarPorIdVisivel(id: number, usuario: Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>): Promise<Funcionario> {
        const funcionario = await this.buscarPorId(id);
        if (usuario.tipo !== 'gestor' && (funcionario.departamento_id !== usuario.departamento_id || funcionario.tipo === 'gestor')) {
            throw AppError.naoEncontrado('Funcionário não encontrado');
        }
        if (usuario.tipo === 'analista') {
            const departamento = await this.departamentos.buscarPorId(usuario.departamento_id);
            if (!departamento || departamento.responsavel_id !== usuario.id) throw AppError.acessoNegado('Analista/Líder não está configurado como responsável do departamento.');
        }
        if (usuario.tipo === 'tecnico' && !funcionario.ativo) {
            const historicoVisivel = await this.listarInativosParaUsuario(usuario);
            if (!historicoVisivel.some((item) => item.id === funcionario.id)) {
                throw AppError.naoEncontrado('Funcionário não encontrado no histórico operacional autorizado.');
            }
        }
        return funcionario;
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
        if (tipo === 'tecnico') {
            await this.validarDepartamentoElegivelTecnico(departamentoId);
        }

        const novo: DadosCriacaoFuncionario = {
            departamento_id: departamentoId,
            usuario,
            senha_hash: await gerarHashSenha(senha),
            nome,
            tipo,
            ativo: true,
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
        if (campoPresente(dados, 'ativo')) {
            throw AppError.requisicaoInvalida('O estado ativo só pode ser alterado pelo fluxo de inativação permanente.');
        }
        const atual = await this.buscarPorId(id);
        if (!atual.ativo) throw AppError.conflito('Funcionário inativo é somente histórico e não pode ser editado.');
        const alteracoes = await this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);

        const departamentoFinal = alteracoes.departamento_id ?? atual.departamento_id;
        const tipoFinal = alteracoes.tipo ?? atual.tipo;
        if (tipoFinal === 'tecnico') {
            await this.validarDepartamentoElegivelTecnico(departamentoFinal);
        }
        if (atual.tipo === 'analista') {
            const departamentoAtual = await this.departamentos.buscarPorId(atual.departamento_id);
            const deixaDeSerResponsavelValido = departamentoAtual?.responsavel_id === atual.id &&
                (tipoFinal !== 'analista' || departamentoFinal !== atual.departamento_id);
            if (deixaDeSerResponsavelValido) {
                throw AppError.conflito('Antes de alterar o perfil ou departamento do responsável, atribua outro Analista/Líder ao departamento.');
            }
        }

        // A invariável do último Gestor é conferida de forma autoritativa no repository,
        // sob lock transacional e com contagem do estado persistido (não via cache).
        return this.funcionarios.atualizar(id, alteracoes);
    }

    /**
     * Inativa logicamente um funcionário, preservando O.S., auditoria e vínculos históricos.
     * @throws AppError 409 se o solicitante tentar auto-inativação ou remover o último Gestor ativo.
     */
    async inativar(id: number, idSolicitante: number): Promise<Funcionario> {
        if (id === idSolicitante) {
            throw AppError.conflito('Você não pode inativar o seu próprio usuário');
        }

        await this.buscarPorId(id);
        // A contagem e a alteração ficam juntas no repository, sob lock transacional.
        return this.funcionarios.inativar(id);
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
        // Um campo de senha vazio equivale a não alterá-la (inclusive em chamadas diretas à API).
        if (campoPresente(dados, 'senha') && dados.senha !== '') {
            alteracoes.senha_hash = await gerarHashSenha(validarSenha(dados.senha));
        }
        return alteracoes;
    }


    /**
     * Um novo Técnico só pode ser vinculado a departamento com responsável Analista/Líder
     * ativo e com vínculo de funcionário coerente com o próprio departamento.
     */
    private async validarDepartamentoElegivelTecnico(departamentoId: number): Promise<void> {
        const departamento = await this.departamentos.buscarPorId(departamentoId);
        if (!departamento) {
            throw AppError.requisicaoInvalida('Departamento inexistente.');
        }
        if (departamento.responsavel_id === null) {
            throw AppError.requisicaoInvalida('Não é possível cadastrar Técnico: o departamento ainda não tem Analista/Líder responsável.');
        }
        const responsavel = await this.funcionarios.buscarPorId(departamento.responsavel_id);
        if (!responsavel || !responsavel.ativo || responsavel.tipo !== 'analista' || responsavel.departamento_id !== departamentoId) {
            throw AppError.requisicaoInvalida('Não é possível cadastrar Técnico: o Analista/Líder responsável precisa estar ativo e pertencer ao departamento selecionado.');
        }
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

}

/** Instância única usada pelo controller. */
export const serviceFuncionario = new ServiceFuncionario();
