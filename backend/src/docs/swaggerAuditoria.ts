/**
 * docs/swaggerAuditoria.ts
 *
 * Trecho OpenAPI 3.0 da US#2.10: histórico de atividades de uma O.S. e logs globais de auditoria.
 * É juntado aos demais trechos em `docs/swagger.ts`.
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE03: criado.
 *
 * ALTERAÇÕES (06/11/2026):
 *  - GET /auditoria: parâmetros `data_inicio` e `data_fim`.
 */

const TIPOS_EVENTO = [
    'criacao',
    'edicao',
    'mudanca_status',
    'atribuicao_responsavel',
    'alteracao_sla',
    'anexo',
    'registro_horas',
    'ativacao',
];

const parametrosPaginacao = [
    {
        name: 'pagina',
        in: 'query',
        required: false,
        description: 'Página desejada (começa em 1).',
        schema: { type: 'integer', minimum: 1, default: 1 },
    },
    {
        name: 'limite',
        in: 'query',
        required: false,
        description: 'Registros por página.',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    },
];

const respostaErro = (descricao: string, exemplo: string) => ({
    description: descricao,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
            example: { mensagem: exemplo },
        },
    },
});

export const schemasAuditoria = {
    Erro: {
        type: 'object',
        required: ['mensagem'],
        properties: { mensagem: { type: 'string' } },
    },
    Paginacao: {
        type: 'object',
        description: 'Sem registros, `total` e `total_paginas` vêm zerados.',
        properties: {
            pagina: { type: 'integer', example: 1 },
            limite: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 37 },
            total_paginas: { type: 'integer', example: 4 },
        },
    },
    AtividadeAuditoria: {
        type: 'object',
        description: 'Registro imutável de auditoria, pronto para exibição.',
        properties: {
            id: { type: 'integer', example: 120 },
            os_id: { type: 'integer', example: 15 },
            funcionario_id: { type: 'integer', example: 3 },
            data_modificacao: { type: 'string', format: 'date-time', example: '2026-11-05T17:30:00.000Z' },
            data_hora: { type: 'string', description: 'dd/mm/aaaa hh:mm (Brasília)', example: '05/11/2026 14:30' },
            acao: { type: 'string', enum: ['insercao', 'atualizacao', 'exclusao'] },
            tipo_evento: { type: 'string', enum: TIPOS_EVENTO },
            descricao: { type: 'string', example: 'Status alterado de Em andamento para Concluído' },
            campo_alterado: { type: 'string', nullable: true, example: 'status' },
            dado_antigo: { type: 'string', nullable: true, example: 'em_andamento' },
            dado_novo: { type: 'string', nullable: true, example: 'concluido' },
            justificativa: { type: 'string', nullable: true },
            parecer: {
                type: 'string',
                nullable: true,
                description: 'Parecer técnico da mudança de status.',
                example: 'Troca do sensor realizada e testada',
            },
            apontamento_id: {
                type: 'integer',
                nullable: true,
                description: 'Lançamento de horas (US#2.7) que gerou o registro.',
            },
            funcionarios: {
                type: 'object',
                description: 'Responsável pela ação.',
                properties: {
                    id: { type: 'integer' },
                    nome: { type: 'string', example: 'Ana Souza' },
                    usuario: { type: 'string', example: 'ana.souza' },
                },
            },
            ordem_servico: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 15 },
                    titulo: { type: 'string', example: 'Instalação de rádio' },
                },
            },
        },
    },
    IndicadoresAuditoria: {
        type: 'object',
        description: 'Números dos cartões, calculados sobre o filtro aplicado (sem a paginação).',
        properties: {
            total_eventos: { type: 'integer', example: 37 },
            eventos_hoje: { type: 'integer', example: 4 },
            ordens_impactadas: { type: 'integer', example: 9 },
            ultimo_evento: { type: 'string', format: 'date-time', nullable: true },
            ultimo_evento_formatado: { type: 'string', nullable: true, example: '05/11/2026 14:30' },
        },
    },
};

export const pathsAuditoria = {
    '/ordens-servico/{id}/historico': {
        get: {
            tags: ['Auditoria'],
            summary: 'Atividades realizadas em uma O.S. (somente gestor)',
            description:
                'Somente os registros da O.S. informada, do mais recente ao mais antigo, com desempate pelo id ' +
                '(decrescente). O.S. sem atividades devolve `dados: []` e paginação zerada.',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
                ...parametrosPaginacao,
            ],
            responses: {
                200: {
                    description: 'Página do histórico.',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    dados: { type: 'array', items: { $ref: '#/components/schemas/AtividadeAuditoria' } },
                                    paginacao: { $ref: '#/components/schemas/Paginacao' },
                                },
                            },
                        },
                    },
                },
                400: respostaErro('Id ou paginação inválidos.', 'limite inválido: informe um número inteiro entre 1 e 100'),
                401: respostaErro('Token ausente, inválido ou expirado.', 'Token de acesso ausente. Envie o cabeçalho Authorization: Bearer <token>'),
                403: respostaErro('Usuário não é gestor.', 'Ação permitida apenas para o(s) perfil(is): gestor'),
                404: respostaErro('O.S. inexistente.', 'O.S. 999 não encontrada'),
            },
        },
    },
    '/auditoria': {
        get: {
            tags: ['Auditoria'],
            summary: 'Logs de auditoria de todas as O.S. (somente gestor)',
            description:
                'Lista paginada, do mais recente ao mais antigo, com desempate pelo id (decrescente). ' +
                'Os indicadores são calculados sobre o mesmo filtro (busca, tipo e período), sem a paginação. ' +
                'Somente leitura: não existem rotas de alteração ou exclusão de auditoria.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'busca',
                    in: 'query',
                    required: false,
                    description:
                        'Termo livre (sem diferenciar maiúsculas): descrição, campo, valores, justificativa, parecer, ' +
                        'nome do responsável e título da O.S. "12", "#12" ou "OS #12" também buscam a O.S. 12.',
                    schema: { type: 'string', maxLength: 100 },
                },
                {
                    name: 'tipo',
                    in: 'query',
                    required: false,
                    description: 'Tipo de evento.',
                    schema: { type: 'string', enum: TIPOS_EVENTO },
                },
                {
                    name: 'data_inicio',
                    in: 'query',
                    required: false,
                    description: 'Primeiro dia do período (inclusive), no fuso de Brasília.',
                    schema: { type: 'string', format: 'date', example: '2026-11-01' },
                },
                {
                    name: 'data_fim',
                    in: 'query',
                    required: false,
                    description: 'Último dia do período (inclusive), no fuso de Brasília. Não pode ser anterior a data_inicio.',
                    schema: { type: 'string', format: 'date', example: '2026-11-06' },
                },
                ...parametrosPaginacao,
            ],
            responses: {
                200: {
                    description: 'Página dos logs com os indicadores.',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    dados: { type: 'array', items: { $ref: '#/components/schemas/AtividadeAuditoria' } },
                                    paginacao: { $ref: '#/components/schemas/Paginacao' },
                                    indicadores: { $ref: '#/components/schemas/IndicadoresAuditoria' },
                                },
                            },
                        },
                    },
                },
                400: respostaErro('Filtro, período ou paginação inválidos.', 'data_inicio não pode ser posterior a data_fim'),
                401: respostaErro('Token ausente, inválido ou expirado.', 'Token de acesso ausente. Envie o cabeçalho Authorization: Bearer <token>'),
                403: respostaErro('Usuário não é gestor.', 'Ação permitida apenas para o(s) perfil(is): gestor'),
            },
        },
    },
};
