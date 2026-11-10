import { repositoryNotificacao, type RepositoryNotificacao } from '../repositories/repositoryNotificacao';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import type { TipoNotificacao } from '../models/modelNotificacao';
import type { OrdemServico } from '../models/modelOrdemServico';
import { AppError } from '../errors/AppError';

const TITULOS: Record<TipoNotificacao, string> = {
    status_alterado: 'Status da ordem de serviço alterado',
    sla_critica: 'SLA em estado crítico',
    sla_expirada: 'SLA expirado',
    responsavel_definido: 'Você foi definido como responsável técnico',
    departamento_definido: 'Ordem de serviço atribuída ao seu departamento',
};

export class ServiceNotificacao {
    constructor(
        private readonly repositorio: RepositoryNotificacao = repositoryNotificacao,
        private readonly ordens: Pick<RepositoryOrdemServico, 'listar'> = repositoryOrdemServico,
    ) {}

    async notificarOrdem(
        ordem: OrdemServico,
        tipo: TipoNotificacao,
        mensagem: string,
        destinatarios?: number[],
        evitarDuplicidade = false,
    ): Promise<number> {
        const ids = destinatarios ?? await this.repositorio.listarDestinatarios(ordem.departamento_id, ordem.responsavel_id);
        const unicos = [...new Set(ids)];
        const existentes = evitarDuplicidade
            ? await Promise.all(unicos.map(async (id) => ({ id, existe: await this.repositorio.existe(ordem.id, id, tipo) })))
            : unicos.map((id) => ({ id, existe: false }));
        return this.repositorio.criarEmLote(existentes.filter((item) => !item.existe).map(({ id }) => ({
            os_id: ordem.id,
            funcionario_id: id,
            tipo,
            titulo: TITULOS[tipo],
            mensagem,
        })));
    }

    async gerarNotificacoesSla(agora: Date = new Date()): Promise<number> {
        const ordens = (await this.ordens.listar()).filter((ordem) => ordem.ativo);
        let criadas = 0;
        for (const ordem of ordens) {
            if (!ordem.data_limite_sla || ordem.status === 'concluido' || ordem.status === 'bloqueado') continue;
            if (agora.getTime() >= ordem.data_limite_sla.getTime()) {
                await this.repositorio.removerAlertaCritico(ordem.id);
                criadas += await this.notificarOrdem(ordem, 'sla_expirada', `O prazo de SLA da O.S. ${ordem.id} (${ordem.titulo}) expirou.`, undefined, true);
                continue;
            }
            const umDiaAntes = ordem.data_limite_sla.getTime() - 24 * 60 * 60 * 1000;
            if (agora.getTime() >= umDiaAntes && agora.getTime() <= ordem.data_limite_sla.getTime()) {
                criadas += await this.notificarOrdem(ordem, 'sla_critica', `A O.S. ${ordem.id} (${ordem.titulo}) vence em até 1 dia.`, undefined, true);
            }
        }
        return criadas;
    }

    async listarDoFuncionario(funcionarioId: number, pagina = 1, limite = 20, lida?: boolean) {
        if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(limite) || limite < 1 || limite > 100) {
            throw AppError.requisicaoInvalida('pagina deve ser maior que zero e limite deve estar entre 1 e 100.');
        }
        const resultado = await this.repositorio.listarPorFuncionario(funcionarioId, pagina, limite, lida);
        return { ...resultado, pagina, limite, totalPaginas: Math.ceil(resultado.total / limite) };
    }

    contarNaoLidas(funcionarioId: number) {
        return this.repositorio.contarNaoLidas(funcionarioId);
    }

    async consultar(funcionarioId: number, id: string) {
        const notificacao = await this.repositorio.buscarDoFuncionario(funcionarioId, id);
        if (!notificacao) throw AppError.naoEncontrado('Notificação não encontrada.');
        return notificacao;
    }

    async marcarUmaComoLida(funcionarioId: number, id: string): Promise<void> {
        if (!(await this.repositorio.marcarUmaComoLida(funcionarioId, id))) throw AppError.naoEncontrado('Notificação não encontrada.');
    }

    marcarTodasComoLidas(funcionarioId: number) {
        return this.repositorio.marcarTodasComoLidas(funcionarioId);
    }
}

export const serviceNotificacao = new ServiceNotificacao();
