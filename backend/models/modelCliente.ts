/**
 * models/modelCliente.ts
 *
 * Tipos do objeto Cliente.
 *
 * ALTERAÇÃO (16/09/2026): `CorpoCliente` (formato bruto do req.body) foi substituído por
 * `DadosCriacaoCliente`/`DadosAtualizacaoCliente` — dados JÁ validados pelo service. A leitura e
 * validação do corpo agora ficam em `services/serviceCliente.ts`.
 * ALTERAÇÃO (21/09/2026): Adiciona a lista aceita para localOperacional com os valores
 * 'offshore' | 'terrestre' | 'site'
 * O campo descrição em DadosCriacaoLocalOperacional será considerado opcional até segunda ordem
 * Caso contrário, não seria possível adicionar Cliente, pois a tabela locais_operacionais
 * exige o valor de descrição, que não está solicitado nesta U.S.
 */
import type { clientes } from '../prisma/generated/client';

/** Cliente como está no banco e como a API devolve (campos em snake_case, iguais ao schema.prisma). */
export type Cliente = clientes;

export interface DadosCriacaoLocalOperacional {
    descricao: string;
    tipo: 'offshore' | 'terrestre' | 'site';
}

/** Dados validados para criar um cliente. */
export interface DadosCriacaoCliente {
    nome: string;
    categoria: string;
    razao_social: string | null;
    ramo_atuacao: string | null;
    locais_operacionais: DadosCriacaoLocalOperacional[];
}

/**
 * Dados validados para atualizar um cliente (só os campos presentes são alterados).
 * `locais_operacionais` fica de fora: o update de locais operacionais exige uma estratégia
 * própria (substituição total ou diff por id) ainda não definida com o time — ver US#1.1.
 */
export type DadosAtualizacaoCliente = Partial<Omit<DadosCriacaoCliente, 'locais_operacionais'>>;