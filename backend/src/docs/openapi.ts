export const especificacaoOpenApi = {
    openapi: '3.0.3',
    info: {
        title: 'SGOS API',
        version: '1.0.0',
        description: 'Endpoints de notificações persistidas do usuário autenticado.',
    },
    servers: [{ url: '/' }],
    components: {
        securitySchemes: {
            BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            Notificacao: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    os_id: { type: 'integer' },
                    funcionario_id: { type: 'integer' },
                    tipo: { type: 'string', enum: ['status_alterado', 'sla_critica', 'sla_expirada', 'responsavel_definido', 'departamento_definido'] },
                    titulo: { type: 'string' },
                    mensagem: { type: 'string' },
                    lida: { type: 'boolean' },
                    data_criacao: { type: 'string', format: 'date-time' },
                },
            },
        },
    },
    security: [{ BearerAuth: [] }],
    paths: {
        '/departamento/{id}/equipe': {
            get: {
                summary: 'Consulta funcionários, projetos e ordens de serviço vinculados ao departamento',
                parameters: [
                    { in: 'path', name: 'id', required: true, schema: { type: 'integer', minimum: 1 } },
                    { in: 'query', name: 'historico', required: false, description: 'Quando true, inclui registros inativos. Por padrão, retorna somente registros ativos.', schema: { type: 'boolean', default: false } },
                ],
                responses: {
                    '200': { description: 'Visão da equipe e dos vínculos do departamento.' },
                    '400': { description: 'Identificador ou parâmetro inválido.' },
                    '401': { description: 'Token inválido ou ausente.' },
                    '403': { description: 'Somente Gestores podem consultar registros históricos/inativos.' },
                    '404': { description: 'Departamento não encontrado.' },
                },
            },
        },
        '/notificacoes': {
            get: {
                summary: 'Lista notificações do usuário autenticado',
                parameters: [
                    { in: 'query', name: 'pagina', schema: { type: 'integer', minimum: 1, default: 1 } },
                    { in: 'query', name: 'limite', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
                    { in: 'query', name: 'lida', schema: { type: 'boolean' } },
                ],
                responses: { '200': { description: 'Página de notificações do usuário autenticado.' }, '401': { description: 'Token inválido ou ausente.' } },
            },
        },
        '/notificacoes/nao-lidas/contagem': {
            get: { summary: 'Conta notificações não lidas do usuário autenticado', responses: { '200': { description: 'Contagem de notificações não lidas.' }, '401': { description: 'Token inválido ou ausente.' } } },
        },
        '/notificacoes/{id}': {
            get: {
                summary: 'Consulta uma notificação pertencente ao usuário autenticado',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
                responses: { '200': { description: 'Notificação encontrada.' }, '404': { description: 'Notificação não encontrada para este usuário.' } },
            },
        },
        '/notificacoes/{id}/lida': {
            patch: {
                summary: 'Marca uma notificação como lida',
                parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
                responses: { '204': { description: 'Notificação marcada como lida.' }, '404': { description: 'Notificação não encontrada para este usuário.' } },
            },
        },
        '/notificacoes/lidas': {
            patch: { summary: 'Marca todas as notificações do usuário como lidas', responses: { '200': { description: 'Quantidade de notificações atualizadas.' } } },
        },
    },
};
