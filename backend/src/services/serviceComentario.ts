import { prisma } from '../prisma/client';
import { AppError } from '../errors/AppError';
import type { Funcionario } from '../models/modelFuncionario';
import { exigirTexto } from '../utils/validacao';

type UsuarioComentario = Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>;

type ComentarioSql = {
    id: number;
    os_id: number;
    conteudo: string;
    criado_em: Date;
    autor_id: number;
    autor_nome: string;
    autor_tipo: string;
};

export interface ComentarioResposta {
    id: number;
    os_id: number;
    conteudo: string;
    criado_em: string;
    autor: { id: number; nome: string; tipo: string };
}

const TAMANHO_MAXIMO_COMENTARIO = 2000;

function paraResposta(comentario: ComentarioSql): ComentarioResposta {
    return {
        id: comentario.id,
        os_id: comentario.os_id,
        conteudo: comentario.conteudo,
        criado_em: comentario.criado_em.toISOString(),
        autor: {
            id: comentario.autor_id,
            nome: comentario.autor_nome,
            tipo: comentario.autor_tipo,
        },
    };
}

/** Comentários reais da equipe, armazenados em `comentarios_ordem`. */
export class ServiceComentario {
    private async exigirAcesso(osId: number, usuario: UsuarioComentario) {
        const ordem = await prisma.ordens_servico.findUnique({
            where: { id: osId },
            select: {
                id: true,
                ativo: true,
                departamento_id: true,
                responsavel_id: true,
            },
        });

        if (!ordem) {
            throw AppError.naoEncontrado(`O.S. ${osId} não encontrada`);
        }

        const permitido = usuario.tipo === 'gestor'
            || (usuario.tipo === 'tecnico'
                && ordem.ativo
                && (ordem.responsavel_id === usuario.id
                    || (ordem.responsavel_id === null && ordem.departamento_id === usuario.departamento_id)))
            || (usuario.tipo === 'analista' && ordem.departamento_id === usuario.departamento_id);

        if (!permitido) {
            throw AppError.acessoNegado('Você não tem permissão para acessar os comentários desta O.S.');
        }

        return ordem;
    }

    async listar(osId: number, usuario: UsuarioComentario): Promise<ComentarioResposta[]> {
        await this.exigirAcesso(osId, usuario);

        const comentarios = await prisma.$queryRaw<ComentarioSql[]>`
            SELECT
                c."id",
                c."os_id",
                c."conteudo",
                c."criado_em",
                f."id" AS "autor_id",
                f."nome" AS "autor_nome",
                f."tipo"::text AS "autor_tipo"
            FROM "public"."comentarios_ordem" c
            INNER JOIN "public"."funcionarios" f ON f."id" = c."funcionario_id"
            WHERE c."os_id" = ${osId}
            ORDER BY c."criado_em" ASC, c."id" ASC
        `;

        return comentarios.map(paraResposta);
    }

    async criar(osId: number, corpo: unknown, usuario: UsuarioComentario): Promise<ComentarioResposta> {
        const ordem = await this.exigirAcesso(osId, usuario);
        if (!ordem.ativo) {
            throw AppError.conflito('Não é possível comentar em uma O.S. inativa.');
        }

        const conteudo = exigirTexto(
            typeof corpo === 'object' && corpo !== null && !Array.isArray(corpo)
                ? (corpo as Record<string, unknown>).conteudo
                : undefined,
            'conteudo',
            { maximo: TAMANHO_MAXIMO_COMENTARIO },
        );

        return prisma.$transaction(async (tx) => {
            const [inserido] = await tx.$queryRaw<Array<{ id: number }>>`
                INSERT INTO "public"."comentarios_ordem" ("os_id", "funcionario_id", "conteudo")
                VALUES (${osId}, ${usuario.id}, ${conteudo})
                RETURNING "id"
            `;

            const [comentario] = await tx.$queryRaw<ComentarioSql[]>`
                SELECT
                    c."id",
                    c."os_id",
                    c."conteudo",
                    c."criado_em",
                    f."id" AS "autor_id",
                    f."nome" AS "autor_nome",
                    f."tipo"::text AS "autor_tipo"
                FROM "public"."comentarios_ordem" c
                INNER JOIN "public"."funcionarios" f ON f."id" = c."funcionario_id"
                WHERE c."id" = ${inserido.id}
                LIMIT 1
            `;

            if (!comentario) {
                throw new AppError('O comentário foi salvo, mas não pôde ser recuperado.', 500);
            }

            return paraResposta(comentario);
        });
    }
}

export const serviceComentario = new ServiceComentario();
