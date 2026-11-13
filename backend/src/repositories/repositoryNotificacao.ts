import { prisma } from '../prisma/client';
import type { TipoNotificacao } from '../models/modelNotificacao';

interface NotificacaoBanco {
    id: string;
    os_id: number;
    funcionario_id: number;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
    lida: boolean;
    data_criacao: Date;
    ordens_servico?: { id: number; titulo: string; status: string };
}

export class RepositoryNotificacao {
    async criarEmLote(dados: Array<{
        os_id: number;
        funcionario_id: number;
        tipo: TipoNotificacao;
        titulo: string;
        mensagem: string;
    }>): Promise<number> {
        if (dados.length === 0) return 0;
        const comandos = dados.map((notificacao) => prisma.$executeRaw`
            INSERT INTO notificacoes (os_id, funcionario_id, tipo, titulo, mensagem)
            VALUES (${notificacao.os_id}, ${notificacao.funcionario_id}, ${notificacao.tipo}, ${notificacao.titulo}, ${notificacao.mensagem})
        `);
        const resultados = await prisma.$transaction(comandos);
        return resultados.reduce((total, quantidade) => total + quantidade, 0);
    }

    async listarPorFuncionario(funcionarioId: number, pagina: number, limite: number, lida?: boolean) {
        const deslocamento = (pagina - 1) * limite;
        const dados = lida === undefined
            ? await prisma.$queryRaw<NotificacaoBanco[]>`
                SELECT n.*, json_build_object('id', os.id, 'titulo', os.titulo, 'status', os.status) AS ordens_servico
                FROM notificacoes n
                INNER JOIN ordens_servico os ON os.id = n.os_id
                WHERE n.funcionario_id = ${funcionarioId}
                ORDER BY n.data_criacao DESC
                LIMIT ${limite} OFFSET ${deslocamento}
            `
            : await prisma.$queryRaw<NotificacaoBanco[]>`
                SELECT n.*, json_build_object('id', os.id, 'titulo', os.titulo, 'status', os.status) AS ordens_servico
                FROM notificacoes n
                INNER JOIN ordens_servico os ON os.id = n.os_id
                WHERE n.funcionario_id = ${funcionarioId} AND n.lida = ${lida}
                ORDER BY n.data_criacao DESC
                LIMIT ${limite} OFFSET ${deslocamento}
            `;
        const contagem = lida === undefined
            ? await prisma.$queryRaw<Array<{ total: number }>>`SELECT COUNT(*)::int AS total FROM notificacoes WHERE funcionario_id = ${funcionarioId}`
            : await prisma.$queryRaw<Array<{ total: number }>>`SELECT COUNT(*)::int AS total FROM notificacoes WHERE funcionario_id = ${funcionarioId} AND lida = ${lida}`;
        return { dados, total: contagem[0]?.total ?? 0 };
    }

    async contarNaoLidas(funcionarioId: number): Promise<number> {
        const resultado = await prisma.$queryRaw<Array<{ total: number }>>`
            SELECT COUNT(*)::int AS total FROM notificacoes WHERE funcionario_id = ${funcionarioId} AND lida = false
        `;
        return resultado[0]?.total ?? 0;
    }

    async buscarDoFuncionario(funcionarioId: number, id: string): Promise<NotificacaoBanco | null> {
        const resultado = await prisma.$queryRaw<NotificacaoBanco[]>`
            SELECT n.*, json_build_object('id', os.id, 'titulo', os.titulo, 'status', os.status) AS ordens_servico
            FROM notificacoes n
            INNER JOIN ordens_servico os ON os.id = n.os_id
            WHERE n.id = ${id}::uuid AND n.funcionario_id = ${funcionarioId}
            LIMIT 1
        `;
        return resultado[0] ?? null;
    }

    async marcarUmaComoLida(funcionarioId: number, id: string): Promise<boolean> {
        const resultado = await prisma.$executeRaw`
            UPDATE notificacoes SET lida = true WHERE id = ${id}::uuid AND funcionario_id = ${funcionarioId}
        `;
        return resultado > 0;
    }

    marcarTodasComoLidas(funcionarioId: number): Promise<number> {
        return prisma.$executeRaw`
            UPDATE notificacoes SET lida = true WHERE funcionario_id = ${funcionarioId} AND lida = false
        `;
    }

    async removerAlertaCritico(osId: number): Promise<void> {
        await prisma.$executeRaw`DELETE FROM notificacoes WHERE os_id = ${osId} AND tipo = 'sla_critica'`;
    }

    async existe(osId: number, funcionarioId: number, tipo: TipoNotificacao): Promise<boolean> {
        const resultado = await prisma.$queryRaw<Array<{ existe: boolean }>>`
            SELECT EXISTS(SELECT 1 FROM notificacoes WHERE os_id = ${osId} AND funcionario_id = ${funcionarioId} AND tipo = ${tipo}) AS existe
        `;
        return resultado[0]?.existe ?? false;
    }

    async listarDestinatarios(departamentoId: number, responsavelId: number | null): Promise<number[]> {
        const funcionarios = responsavelId === null
            ? await prisma.$queryRaw<Array<{ id: number }>>`
                SELECT id FROM funcionarios WHERE ativo = true AND departamento_id = ${departamentoId}
            `
            : await prisma.$queryRaw<Array<{ id: number }>>`
                SELECT id FROM funcionarios WHERE ativo = true AND (departamento_id = ${departamentoId} OR id = ${responsavelId})
            `;
        return funcionarios.map((funcionario) => funcionario.id);
    }
}

export const repositoryNotificacao = new RepositoryNotificacao();
