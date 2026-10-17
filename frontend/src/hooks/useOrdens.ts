/**
 * Hook da tela de O.S.: carrega ordens, clientes, departamentos e projetos, controla filtros, modais
 * e permissões por perfil, e integra com a API para cadastrar, editar, alterar status e ativar/inativar.
 *
 * AJ-06: o cadastro de O.S. antiga (com data de abertura) é aceito só para o gestor; após o sucesso,
 * abre o detalhe da O.S. com os dados reais devolvidos pela API (abertura e SLA calculados no backend).
 */

import { useEffect, useMemo, useState } from "react";
import { authService, getStoredUser } from "../services/auth";
import { ApiError } from "../services/api";
import { clienteService } from "../services/cliente";
import { departamentoService } from "../services/departamento";
import { projetoService } from "../services/projeto";
import { ordemServicoService } from "../services/ordemServico";
import type {
    Cliente,
    Departamento,
    OrdemServico,
    OrdemServicoInput,
    Projeto,
    StatusOrdemServico,
} from "../types/api";
import {
    correspondeBuscaOrdem,
    type FiltroStatusOrdem,
} from "../utils/ordemServicoUtils";

function mensagemErro(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
}

export function useOrdens() {
    const [ordens, setOrdens] = useState<OrdemServico[]>([]);
    const [alterandoStatusId, setAlterandoStatusId] = useState<number | null>(null);
    const [alterandoPrazo, setAlterandoPrazo] = useState(false);
    const [ordensInativas, setOrdensInativas] = useState<OrdemServico[]>([]);
    const [carregandoInativas, setCarregandoInativas] = useState(false);
    const [mostrarInativas, setMostrarInativas] = useState(false);

    const [confirmacaoAtivo, setConfirmacaoAtivo] = useState<{
        ordem: OrdemServico;
        acao: "inativar" | "reativar";
    } | null>(null);

    const [inativandoId, setInativandoId] = useState<number | null>(null);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [projetos, setProjetos] = useState<Projeto[]>([]);

    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] =
        useState<FiltroStatusOrdem>("todos");

    const [formularioAberto, setFormularioAberto] = useState(false);
    const [ordemEmEdicao, setOrdemEmEdicao] =
        useState<OrdemServico | null>(null);

    const [detalhesAbertos, setDetalhesAbertos] = useState(false);
    const [ordemSelecionada, setOrdemSelecionada] =
        useState<OrdemServico | null>(null);

    const [perfilGestor, setPerfilGestor] = useState(
        () => getStoredUser()?.tipo === "gestor",
    );

    const [usuarioAtualId, setUsuarioAtualId] = useState<number | null>(
        () => getStoredUser()?.id ?? null,
    );

    const [podeCriar, setPodeCriar] = useState(() => {
        const tipo = getStoredUser()?.tipo;
        return tipo === "gestor" || tipo === "tecnico";
    });

    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    const podeGerenciar = perfilGestor;

    useEffect(() => {
        let ativo = true;

        async function carregarDados() {
            try {
                let gestor = false;
                let podeCriarOS = false;

                if (authService.hasSession()) {
                    try {
                        const usuario = await authService.me();



                        setUsuarioAtualId(usuario.id);

                        gestor = usuario.tipo === "gestor";
                        podeCriarOS =
                            usuario.tipo === "gestor" ||
                            usuario.tipo === "tecnico";
                    } catch {
                        setUsuarioAtualId(null);
                        gestor = false;
                        podeCriarOS = false;
                    }
                }

                if (!ativo) return;

                setPerfilGestor(gestor);
                setPodeCriar(podeCriarOS);

                const [
                    ordensApi,
                    clientesApi,
                    departamentosApi,
                    projetosApi,
                ] = await Promise.all([
                    ordemServicoService.listar(),
                    clienteService.listar(),
                    departamentoService.listar(),
                    projetoService.listar(),
                ]);

                if (!ativo) return;

                setOrdens(ordensApi);
                setClientes(clientesApi);
                setDepartamentos(departamentosApi);
                setProjetos(projetosApi);
            } catch (error) {
                if (ativo) {
                    setErro(
                        mensagemErro(
                            error,
                            "Não foi possível carregar os dados das ordens de serviço.",
                        ),
                    );
                }
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        void carregarDados();

        return () => {
            ativo = false;
        };
    }, []);

    const ordensFiltradas = useMemo(() => {
        const fonte = mostrarInativas ? ordensInativas : ordens;

        return fonte.filter((ordem) => {
            const correspondeStatus =
                filtroStatus === "todos" ||
                ordem.status === filtroStatus;

            return (
                correspondeStatus &&
                correspondeBuscaOrdem(ordem, busca)
            );
        });
    }, [
        ordens,
        ordensInativas,
        mostrarInativas,
        busca,
        filtroStatus,
    ]);

    function limparErro() {
        setErro(null);
    }

    function abrirCadastro() {
        if (!podeCriar) {
            setErro("Seu perfil não tem permissão para cadastrar ordens de serviço.");
            return;
        }

        setOrdemEmEdicao(null);
        setErro(null);
        setMensagem(null);
        setFormularioAberto(true);
    }

    function iniciarEdicao(ordem: OrdemServico) {
        if (!podeGerenciar) {
            setErro("Apenas gestores podem editar ordens de serviço.");
            return;
        }

        setDetalhesAbertos(false);
        setOrdemSelecionada(null);

        if (ordem.status === "concluido" || ordem.status === "bloqueado") {
            setErro("Esta ordem de serviço não pode ser editada no estado atual.");
            return;
        }

        setOrdemEmEdicao(ordem);
        setErro(null);
        setMensagem(null);
        setFormularioAberto(true);
    }

    function fecharFormulario() {
        if (salvando) return;

        setFormularioAberto(false);
        setOrdemEmEdicao(null);
        setErro(null);
    }

    async function carregarOrdens(): Promise<void> {
        const resultado = await ordemServicoService.listar();
        setOrdens(resultado);
    }

    async function carregarOrdensInativas(): Promise<void> {
        if (!podeGerenciar) {
            setErro("Apenas gestores podem consultar ordens inativas.");
            return;
        }

        setCarregandoInativas(true);
        setErro(null);

        try {
            const resultado = await ordemServicoService.listarInativas();
            setOrdensInativas(resultado);
        } catch (error) {
            setErro(
                mensagemErro(
                    error,
                    "Não foi possível carregar as ordens inativas.",
                ),
            );
        } finally {
            setCarregandoInativas(false);
        }
    }

    function solicitarAlteracaoAtivo(
        ordem: OrdemServico,
        acao: "inativar" | "reativar",
    ): void {
        if (!podeGerenciar) {
            setErro("Apenas gestores podem ativar ou inativar ordens.");
            return;
        }

        const novoAtivo = acao === "reativar";

        if (ordem.ativo === novoAtivo) {
            setErro(
                novoAtivo
                    ? "Esta ordem já está ativa."
                    : "Esta ordem já está inativa.",
            );
            return;
        }

        setErro(null);
        setMensagem(null);
        setConfirmacaoAtivo({ ordem, acao });
    }

    function fecharConfirmacaoAtivo(): void {
        if (inativandoId !== null) return;

        setConfirmacaoAtivo(null);
        setErro(null);
    }

    async function confirmarAlteracaoAtivo(): Promise<void> {
        if (!podeGerenciar || !confirmacaoAtivo || inativandoId !== null) {
            return;
        }

        const { ordem, acao } = confirmacaoAtivo;
        const novoAtivo = acao === "reativar";

        setInativandoId(ordem.id);
        setErro(null);
        setMensagem(null);

        try {
            await ordemServicoService.alterarAtivo(ordem.id, novoAtivo);

            setMensagem(
                novoAtivo
                    ? `OS #${ordem.id} reativada com sucesso.`
                    : `OS #${ordem.id} inativada com sucesso.`,
            );

            setConfirmacaoAtivo(null);

            const ordensAtivasAtualizadas = await ordemServicoService.listar();
            setOrdens(ordensAtivasAtualizadas);

            const ordensInativasAtualizadas =
                await ordemServicoService.listarInativas();
            setOrdensInativas(ordensInativasAtualizadas);
        } catch (error) {
            setErro(
                mensagemErro(
                    error,
                    "Não foi possível alterar a situação da ordem de serviço.",
                ),
            );
        } finally {
            setInativandoId(null);
        }
    }

    async function abrirDetalhes(ordem: OrdemServico): Promise<void> {
        setOrdemSelecionada(ordem);
        setDetalhesAbertos(true);
        setCarregandoDetalhes(true);
        setErro(null);

        try {
            const detalhe = await ordemServicoService.buscarPorId(ordem.id);
            setOrdemSelecionada(detalhe);
        } catch (error) {
            setErro(
                mensagemErro(
                    error,
                    "Não foi possível carregar os detalhes da ordem de serviço.",
                ),
            );
        } finally {
            setCarregandoDetalhes(false);
        }
    }

    function fecharDetalhes() {
        setDetalhesAbertos(false);
        setOrdemSelecionada(null);
        setErro(null);
    }

    async function alterarStatusOrdem(
        novoStatus: StatusOrdemServico,
    ): Promise<void> {
        const ordem = ordemSelecionada;

        if (!ordem) return;

        const ehResponsavel = ordem.responsavel_id === usuarioAtualId;

        if (!podeGerenciar && !ehResponsavel) {
            setErro("Apenas o gestor ou o responsável pela OS pode alterar o status.");
            return;
        }

        if (!ordem.ativo) {
            setErro("Não é possível alterar o status de uma OS inativa.");
            return;
        }

        if (ordem.status === "bloqueado" || ordem.status === "concluido") {
            setErro("Esta OS não permite alteração de status por esta operação.");
            return;
        }

        if (novoStatus === "bloqueado") {
            setErro("O bloqueio deve utilizar a operação específica de bloqueio.");
            return;
        }

        if (novoStatus === "concluido") {
            setErro(
                "A conclusão exige um parecer técnico persistido. " +
                "Essa etapa depende da integração responsável por salvar o parecer.",
            );
            return;
        }

        if (ordem.status === novoStatus) return;

        setAlterandoStatusId(ordem.id);
        setErro(null);
        setMensagem(null);

        try {
            const atualizada = await ordemServicoService.alterarStatus(
                ordem.id,
                novoStatus,
            );

            setOrdemSelecionada(atualizada);
            setOrdens((atuais) =>
                atuais.map((item) =>
                    item.id === atualizada.id ? atualizada : item,
                ),
            );

            setMensagem(
                `Status da OS #${atualizada.id} alterado com sucesso.`,
            );
        } catch (error) {
            setErro(
                mensagemErro(
                    error,
                    "Não foi possível alterar o status da ordem de serviço.",
                ),
            );
        } finally {
            setAlterandoStatusId(null);
        }
    }

    async function alterarPrazoOrdem(
        novoPrazo: string,
        justificativa: string,
    ): Promise<void> {
        const ordem = ordemSelecionada;

        if (!ordem || alterandoPrazo) return;

        if (!podeGerenciar) {
            setErro("Apenas gestores podem alterar o prazo final.");
            return;
        }

        if (!ordem.ativo) {
            setErro("Não é possível alterar o prazo de uma OS inativa.");
            return;
        }

        if (ordem.status === "bloqueado" || ordem.status === "concluido") {
            setErro("Esta OS não permite alteração de prazo no estado atual.");
            return;
        }

        if (!novoPrazo) return;

        if (!justificativa.trim()) {
            setErro("Informe o motivo da alteração do prazo.");
            return;
        }

        setAlterandoPrazo(true);
        setErro(null);
        setMensagem(null);

        try {
            // Fim do dia no fuso do usuário, enviado como ISO completo
            const dataLimiteSla = new Date(`${novoPrazo}T23:59:59`).toISOString();

            const atualizada = await ordemServicoService.alterarPrazo(
                ordem.id,
                dataLimiteSla,
                justificativa.trim(),
            );

            setOrdemSelecionada(atualizada);
            setOrdens((atuais) =>
                atuais.map((item) =>
                    item.id === atualizada.id ? atualizada : item,
                ),
            );

            setMensagem(`Prazo da OS #${atualizada.id} alterado com sucesso.`);
        } catch (error) {
            setErro(
                mensagemErro(
                    error,
                    "Não foi possível alterar o prazo da ordem de serviço.",
                ),
            );
        } finally {
            setAlterandoPrazo(false);
        }
    }

    async function salvarOrdem(dados: OrdemServicoInput): Promise<void> {
        const autorizado = ordemEmEdicao
            ? podeGerenciar
            : podeCriar;

        if (!autorizado) {
            setErro(
                ordemEmEdicao
                    ? "Apenas gestores podem editar ordens de serviço."
                    : "Seu perfil não tem permissão para cadastrar ordens de serviço.",
            );
            return;
        }

        if (
            !dados.titulo.trim() ||
            !dados.descricao.trim() ||
            !dados.tipo ||
            !dados.cliente_id ||
            !dados.departamento_id
        ) {
            setErro(
                "Preencha título, descrição, tipo, cliente e departamento.",
            );
            return;
        }

        if (
            ordemEmEdicao &&
            (ordemEmEdicao.status === "concluido" ||
                ordemEmEdicao.status === "bloqueado")
        ) {
            setErro("Esta ordem de serviço não pode ser editada no estado atual.");
            return;
        }

        // AJ-06: O.S. antiga (data de abertura informada) é exclusiva do gestor
        const cadastroAntiga = !ordemEmEdicao && dados.data_criacao !== undefined;

        if (cadastroAntiga && !podeGerenciar) {
            setErro("Apenas gestores podem cadastrar ordens de serviço antigas.");
            return;
        }

        if (
            cadastroAntiga &&
            dados.status === "concluido" &&
            !dados.parecer_tecnico?.trim()
        ) {
            setErro("O parecer técnico é obrigatório para cadastrar uma O.S. concluída.");
            return;
        }

        let ordemAntigaCriada: OrdemServico | null = null;

        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            const payload: OrdemServicoInput = {
                ...dados,
                titulo: dados.titulo.trim(),
                descricao: dados.descricao.trim(),
            };

            if (ordemEmEdicao) {
                await ordemServicoService.atualizar(
                    ordemEmEdicao.id,
                    payload,
                );

                setMensagem(
                    `Ordem de serviço #${ordemEmEdicao.id} atualizada com sucesso.`,
                );
            } else {
                const criada = await ordemServicoService.criar(payload);

                setMensagem(
                    cadastroAntiga
                        ? `Ordem de serviço antiga #${criada.id} cadastrada com sucesso.`
                        : `Ordem de serviço #${criada.id} cadastrada com sucesso.`,
                );
                setBusca("");
                setFiltroStatus("todos");

                if (cadastroAntiga) {
                    ordemAntigaCriada = criada;
                }
            }

            await carregarOrdens();

            setFormularioAberto(false);
            setOrdemEmEdicao(null);

            // AJ-06: mostra a O.S. antiga com os dados reais da API (abertura e SLA calculado)
            if (ordemAntigaCriada) {
                void abrirDetalhes(ordemAntigaCriada);
            }
        } catch (error) {
            setErro(
                mensagemErro(
                    error,
                    ordemEmEdicao
                        ? "Não foi possível atualizar a ordem de serviço."
                        : "Não foi possível cadastrar a ordem de serviço.",
                ),
            );
        } finally {
            setSalvando(false);
        }
    }

    return {
        ordens,
        ordensFiltradas,
        clientes,
        departamentos,
        projetos,

        carregando,
        carregandoDetalhes,
        salvando,

        busca,
        setBusca,
        filtroStatus,
        setFiltroStatus,

        podeGerenciar,
        usuarioAtualId,
        podeCriar,
        mensagem,
        erro,
        limparErro,

        formularioAberto,
        ordemEmEdicao,
        abrirCadastro,
        iniciarEdicao,
        fecharFormulario,
        salvarOrdem,

        detalhesAbertos,
        alterarStatusOrdem,
        alterarPrazoOrdem,
        alterandoPrazo,
        alterandoStatusId,
        podeAlterarStatus: Boolean(
            ordemSelecionada &&
            ordemSelecionada.ativo &&
            usuarioAtualId !== null &&
            (podeGerenciar || ordemSelecionada.responsavel_id === usuarioAtualId) &&
            ordemSelecionada.status !== "bloqueado" &&
            ordemSelecionada.status !== "concluido",
        ),
        ordemSelecionada,
        abrirDetalhes,
        fecharDetalhes,

        ordensInativas,
        carregandoInativas,
        mostrarInativas,
        setMostrarInativas,

        carregarOrdensInativas,
        confirmacaoAtivo,
        inativandoId,
        solicitarAlteracaoAtivo,
        fecharConfirmacaoAtivo,
        confirmarAlteracaoAtivo,
    };
}