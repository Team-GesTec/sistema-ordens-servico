import { prisma } from '../prisma/client';
import { AppError } from '../errors/AppError';
import { criarPdfRelatorio, dataRelatorio, textoRelatorio } from '../utils/pdfRelatorio';

type OrdemRelatorio = Awaited<ReturnType<typeof buscarOrdem>>;

async function buscarOrdem(id: number) {
    return prisma.ordens_servico.findUnique({
        where: { id },
        include: {
            clientes: { select: { id: true, nome: true, razao_social: true } },
            projetos: { select: { id: true, nome: true } },
            departamentos: { select: { id: true, nome: true } },
            funcionarios_ordens_servico_responsavel_idTofuncionarios: { select: { id: true, nome: true } },
            funcionarios_ordens_servico_solicitante_idTofuncionarios: { select: { id: true, nome: true } },
            lancamentos_horas: {
                orderBy: [{ data_trabalho: 'desc' }, { id: 'desc' }],
                include: { funcionarios: { select: { nome: true } } },
            },
            auditoria: {
                where: { tipo_entidade: 'ordem_servico' },
                orderBy: [{ data_modificacao: 'desc' }, { id: 'desc' }],
                include: { funcionarios: { select: { nome: true } } },
            },
        },
    });
}

function statusExtenso(valor: string): string {
    return valor.replaceAll('_', ' ');
}

export class ServiceRelatorio {
    async gerarOrdemServico(id: number): Promise<{ nome: string; pdf: Buffer }> {
        const ordem = await buscarOrdem(id);
        if (!ordem) throw AppError.naoEncontrado(`O.S. ${id} não encontrada`);
        const totalMinutos = ordem.lancamentos_horas.reduce((total, item) => total + item.minutos, 0);
        const horas = `${Math.floor(totalMinutos / 60)}h ${String(totalMinutos % 60).padStart(2, '0')}min`;
        const pdf = await criarPdfRelatorio(`Relatório individual da O.S. #${ordem.id}`, `Documento gerado em ${dataRelatorio(new Date())}`, [
            { titulo: 'Identificação', campos: [
                { rotulo: 'O.S.', valor: `OS-${ordem.id}` }, { rotulo: 'Título', valor: ordem.titulo },
                { rotulo: 'Descrição', valor: ordem.descricao }, { rotulo: 'Cliente', valor: ordem.clientes?.nome ?? ordem.clientes?.razao_social },
                { rotulo: 'Projeto', valor: ordem.projetos?.nome }, { rotulo: 'Departamento', valor: ordem.departamentos.nome },
                { rotulo: 'Tipo', valor: ordem.tipo }, { rotulo: 'Criticidade', valor: ordem.criticidade },
                { rotulo: 'Abertura', valor: dataRelatorio(ordem.data_criacao) }, { rotulo: 'Início', valor: dataRelatorio(ordem.data_inicio) },
                { rotulo: 'Conclusão', valor: dataRelatorio(ordem.data_fim) }, { rotulo: 'Status', valor: statusExtenso(ordem.status) },
                { rotulo: 'Responsável', valor: ordem.funcionarios_ordens_servico_responsavel_idTofuncionarios?.nome },
                { rotulo: 'Solicitante', valor: ordem.funcionarios_ordens_servico_solicitante_idTofuncionarios.nome },
                { rotulo: 'Parecer técnico', valor: ordem.parecer_tecnico },
            ] },
            { titulo: 'Horas registradas', campos: [{ rotulo: 'Total acumulado', valor: horas }], linhas: ordem.lancamentos_horas.map((item) => `${item.data_trabalho.toISOString().slice(0, 10)} - ${Math.floor(item.minutos / 60)}h ${String(item.minutos % 60).padStart(2, '0')}min - ${item.funcionarios.nome} - status: ${statusExtenso(item.status_os)}`) },
            { titulo: 'Histórico de atividades', linhas: ordem.auditoria.map((item) => `${dataRelatorio(item.data_modificacao)} - ${item.funcionarios.nome} - ${item.acao}${item.campo_alterado ? ` - ${item.campo_alterado}` : ''}${item.dado_novo ? `: ${item.dado_novo}` : ''}`) },
        ]);
        return { nome: `OS-${id}.pdf`, pdf };
    }

    async gerarCliente(id: number): Promise<{ nome: string; pdf: Buffer }> {
        const cliente = await prisma.clientes.findUnique({ where: { id } });
        if (!cliente) throw AppError.naoEncontrado(`Cliente ${id} não encontrado`);
        const ordens = await prisma.ordens_servico.findMany({
            where: {
                ativo: true,
                OR: [{ cliente_id: id }, { projetos: { is: { cliente_id: id } } }],
            },
            orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
            include: { projetos: { select: { nome: true } } },
        });
        const porStatus = ordens.reduce<Record<string, number>>((acc, ordem) => {
            acc[ordem.status] = (acc[ordem.status] ?? 0) + 1;
            return acc;
        }, {});
        const resumo = Object.entries(porStatus).map(([status, quantidade]) => `${statusExtenso(status)}: ${quantidade}`).join(' | ');
        const pdf = await criarPdfRelatorio(`Relatório do cliente #${cliente.id}`, `Documento gerado em ${dataRelatorio(new Date())}`, [
            { titulo: 'Dados do cliente', campos: [
                { rotulo: 'Cliente', valor: `Cliente-${cliente.id}` }, { rotulo: 'Nome', valor: cliente.nome },
                { rotulo: 'Razão social', valor: cliente.razao_social }, { rotulo: 'Ramo de atuação', valor: cliente.ramo_atuacao },
                { rotulo: 'Situação', valor: cliente.ativo ? 'Ativo' : 'Inativo' }, { rotulo: 'Total de O.S. ativas', valor: ordens.length },
                { rotulo: 'Resumo por status', valor: resumo || 'Nenhuma O.S. ativa' },
            ] },
            { titulo: 'Ordens de serviço ativas', linhas: ordens.map((ordem) => {
                const descricao = ordem.descricao.length > 100 ? `${ordem.descricao.slice(0, 97)}...` : ordem.descricao;
                return `${ordem.data_criacao.toISOString().slice(0, 10)} - OS-${ordem.id} - ${ordem.titulo} - ${descricao} - ${statusExtenso(ordem.status)} - ${ordem.projetos?.nome ?? 'Sem projeto'}`;
            }) },
        ]);
        return { nome: `Cliente-${id}.pdf`, pdf };
    }

}

export const serviceRelatorio = new ServiceRelatorio();
