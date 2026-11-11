/**
 * docs/swagger.ts
 *
 * Documento OpenAPI 3.0 da API do SGOS, servido em /docs (interface) e /docs/openapi.json (JSON).
 * Cada módulo mantém o seu trecho em `docs/swaggerX.ts` (paths + schemas); aqui eles são juntados.
 * A US#4.4 deve acrescentar os trechos dos demais módulos seguindo o mesmo formato.
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE03: criado com o trecho da auditoria (US#2.10).
 */
import { pathsAuditoria, schemasAuditoria } from './swaggerAuditoria';

export const documentoOpenApi = {
    openapi: '3.0.3',
    info: {
        title: 'SGOS — API',
        version: '1.0.0',
        description: 'Sistema de Gestão de Ordens de Serviço (GesTec / ALTAVE). Erros sempre no formato `{ "mensagem": "..." }`.',
    },
    servers: [{ url: '/' }],
    tags: [{ name: 'Auditoria', description: 'Histórico de atividades das O.S. e logs de auditoria (US#2.10)' }],
    paths: {
        ...pathsAuditoria,
    },
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            ...schemasAuditoria,
        },
    },
};
