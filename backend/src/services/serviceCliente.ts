/**
 * services/serviceCliente.ts
 *
 * Regras de negócio de Cliente (US#1.1): valida os dados recebidos e chama o repository.
 * Não conhece Express (req/res) nem Prisma — só dados e regras.
 *
 * ALTERAÇÃO (16/09/2026): a validação que ficava no controllerCliente foi movida para cá, e o
 * serviço passou a suportar atualização parcial (PATCH).
 * ALTERAÇÃO (20/09/2026): `criar` agora também valida e monta `locais_operacionais` (BE-08).
 * O campo é uma LISTA (`DadosCriacaoLocalOperacional[]`), não um valor único — um cliente pode
 * ter vários locais/ativos operacionais ao mesmo tempo (ex.: uma embarcação e um site
 * simultaneamente), de acordo com a relação um-para-muitos já modelada em `locais_operacionais`
 * no schema.prisma (cliente_id como chave estrangeira). 
 * Cada item exige `tipo` (enum: offshore, terrestre, site) e `descricao`, ambos
 * obrigatórios — de acordo com o schema.prisma, que define `descricao` sem `?`.
 * */

import { AppError } from '../errors/AppError';
import { repositoryCliente, type RepositoryCliente } from '../repositories/repositoryCliente';
import type { Cliente, DadosAtualizacaoCliente, DadosCriacaoCliente, DadosCriacaoLocalOperacional } from '../models/modelCliente';
import {
    campoPresente,
    exigirAlteracoes,
    exigirTexto,
    lerCorpo,
    exigirEnum,
    textoOpcional,
    type CorpoRequisicao,
} from '../../utils/validacao';

/** Tamanho máximo aceito para os textos de cliente. */
const TEXTO_MAXIMO = 255;
//Valores aceitos para local operacional até o momento (21/09)
const TIPOS_LOCAL_OPERACIONAL = ['offshore', 'terrestre', 'site'] as const;

export class ServiceCliente {
    private readonly repositorio: RepositoryCliente;

    /**
     * @param repositorio Repository usado para acessar os dados (pode ser trocado em testes).
     */
    constructor(repositorio: RepositoryCliente = repositoryCliente) {
        this.repositorio = repositorio;
    }

    /** Lista todos os clientes. */
    listar(): Promise<Cliente[]> {
        return this.repositorio.listar();
    }

    /**
     * Busca um cliente pelo id.
     * @throws AppError 404 se não existir.
     */
    async buscarPorId(id: number): Promise<Cliente> {
        const cliente = await this.repositorio.buscarPorId(id);
        if (!cliente) {
            throw AppError.naoEncontrado('Cliente não encontrado');
        }
        return cliente;
    }

    /**
     * Valida o corpo e cria um cliente.
     * Obrigatórios: `nome`, `categoria`. Opcionais: `razao_social`, `ramo_atuacao`.
     * @param corpo O `req.body` recebido.
     */
    async criar(corpo: unknown): Promise<Cliente> {
        const dados = lerCorpo(corpo);
        const locaisOperacionais = this.validarLocaisOperacionais(dados.locais_operacionais)
        const novo: DadosCriacaoCliente = {
            nome: exigirTexto(dados.nome, 'nome', { maximo: TEXTO_MAXIMO }),
            categoria: exigirTexto(dados.categoria, 'categoria', { maximo: TEXTO_MAXIMO }),
            razao_social: textoOpcional(dados.razao_social, 'razao_social', { maximo: TEXTO_MAXIMO }),
            ramo_atuacao: textoOpcional(dados.ramo_atuacao, 'ramo_atuacao', { maximo: TEXTO_MAXIMO }),
            locais_operacionais: locaisOperacionais,
        };
        return this.repositorio.criar(novo);
    }

    /**
     * Valida o corpo e atualiza um cliente.
     * @param id Id do cliente.
     * @param corpo O `req.body` recebido.
     * @param parcial `false` (PUT): todos os obrigatórios precisam vir e opcionais ausentes viram `null`.
     *                `true` (PATCH): só os campos enviados são validados e alterados.
     */
    async atualizar(id: number, corpo: unknown, parcial: boolean): Promise<Cliente> {
        const dados = lerCorpo(corpo);
        const alteracoes = this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);
        return this.repositorio.atualizar(id, alteracoes);
    }

    /** Remove um cliente. */
    remover(id: number): Promise<void> {
        return this.repositorio.remover(id);
    }

    /** Monta o objeto de alterações conforme o modo (PUT ou PATCH). */
    private montarAlteracoes(dados: CorpoRequisicao, parcial: boolean): DadosAtualizacaoCliente {
        const alteracoes: DadosAtualizacaoCliente = {};
        if (!parcial || campoPresente(dados, 'nome')) {
            alteracoes.nome = exigirTexto(dados.nome, 'nome', { maximo: TEXTO_MAXIMO });
        }
        if (!parcial || campoPresente(dados, 'categoria')) {
            alteracoes.categoria = exigirTexto(dados.categoria, 'categoria', { maximo: TEXTO_MAXIMO });
        }
        if (!parcial || campoPresente(dados, 'razao_social')) {
            alteracoes.razao_social = textoOpcional(dados.razao_social, 'razao_social', { maximo: TEXTO_MAXIMO });
        }
        if (!parcial || campoPresente(dados, 'ramo_atuacao')) {
            alteracoes.ramo_atuacao = textoOpcional(dados.ramo_atuacao, 'ramo_atuacao', { maximo: TEXTO_MAXIMO });
        }
        if (!parcial || campoPresente(dados, 'locais_operacionais')) {
            alteracoes.locais_operacionais = this.validarLocaisOperacionais(dados.locais_operacionais)
        }
        return alteracoes;
    }

    //
    private validarLocaisOperacionais(valor: unknown): DadosCriacaoLocalOperacional[] {
        if (!Array.isArray(valor)) {
            throw AppError.requisicaoInvalida('locais_operacionais deve ser uma lista');
        }
        return valor.map((item, indice) => {
            const local = lerCorpo(item);
            return {
                tipo: exigirEnum(local.tipo, TIPOS_LOCAL_OPERACIONAL, `locais_operacionais[${indice}].tipo`),
                descricao: exigirTexto(local.descricao, `locais_operacionais[${indice}].descricao`, { maximo: TEXTO_MAXIMO }),
            };
        });
    }
}

/** Instância única usada pelo controller. */
export const serviceCliente = new ServiceCliente();