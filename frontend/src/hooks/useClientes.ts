
import { useEffect, useMemo, useRef, useState } from "react";
import { authService, getStoredUser } from "../services/auth";
import { clienteService } from "../services/cliente";
import type { Cliente, ClienteInput, PerfilFuncionario } from "../types/api";
import { publishToast } from "../services/feedbackEvents";
import { garantirPdfValido, nomeArquivoPdfCliente, salvarPdfCliente } from "../utils/download";
import {
    correspondeBusca,
    mensagemErro,
    mensagemErroExportacaoPdf,
    type AcaoStatus,
    type DadosFormularioCliente,
    type FiltroSituacao,
} from "../utils/clienteUtils";

export function useClientes() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [inativandoId, setInativandoId] = useState<number | null>(null);

    const [busca, setBusca] = useState("");
    const [filtroSituacao, setFiltroSituacao] =
        useState<FiltroSituacao>("ativos");

    const [modalAberto, setModalAberto] = useState(false);
    const [clienteEmEdicao, setClienteEmEdicao] =
        useState<Cliente | null>(null);

    const [clienteConfirmacao, setClienteConfirmacao] =
        useState<Cliente | null>(null);

    const [acaoConfirmacao, setAcaoConfirmacao] =
        useState<AcaoStatus | null>(null);

    const [perfil, setPerfil] = useState<PerfilFuncionario | null>(
        () => getStoredUser()?.tipo ?? null
    );

    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    // Exportação do relatório em PDF (US#2.9): id do cliente em exportação e erro exibido no modal.
    // O erro guarda o cliente a que pertence: uma falha que chega depois de trocar de cliente não
    // aparece no modal do outro.
    const [exportandoPdfId, setExportandoPdfId] = useState<number | null>(null);
    const [erroExportacaoPdf, setErroExportacaoPdf] = useState<{ clienteId: number; mensagem: string } | null>(null);
    const exportacaoPdfEmAndamento = useRef(false);

    const podeGerenciar = perfil === "gestor";
    // US#2.9: o backend libera o relatório do cliente para Gestor e Analista (403 aos demais).
    const podeExportarPdf = perfil === "gestor" || perfil === "analista";

    useEffect(() => {
        let ativo = true;

        async function carregarDados() {
            try {
                let perfilAtual: PerfilFuncionario | null = getStoredUser()?.tipo ?? null;

                if (authService.hasSession()) {
                    const usuario = await authService.me();
                    perfilAtual = usuario.tipo;

                    if (ativo) {
                        setPerfil(perfilAtual);
                    }
                } else if (ativo) {
                    setPerfil(null);
                    perfilAtual = null;
                }

                const isGestor = perfilAtual === "gestor";

                const resultado = await clienteService.listar();
                let inativos: Cliente[] = [];

                if (isGestor) {
                    try {
                        inativos = await clienteService.listarInativos();
                    } catch (errorInativos) {
                        if (ativo) setErro(mensagemErro(errorInativos, "Não foi possível consultar o histórico de clientes inativos."));
                    }
                }

                if (ativo) {
                    setClientes(
                        [...resultado, ...inativos.filter((item) => !resultado.some((ativoItem) => ativoItem.id === item.id))]
                            .sort((a, b) => a.id - b.id)
                    );
                }
            } catch (error) {
                if (ativo) {
                    setErro(
                        mensagemErro(
                            error,
                            "Não foi possível carregar os clientes."
                        )
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

    const clientesPorSituacao = useMemo(() => {
        return clientes.filter((cliente) => {
            if (filtroSituacao === "ativos") {
                return cliente.ativo;
            }

            if (filtroSituacao === "inativos") {
                return !cliente.ativo;
            }

            return true;
        });
    }, [clientes, filtroSituacao]);

    const clientesFiltrados = useMemo(() => {
        return clientesPorSituacao.filter((cliente) =>
            correspondeBusca(cliente, busca)
        );
    }, [clientesPorSituacao, busca]);

    function limparErro() {
        setErro(null);
    }

    function abrirCadastro() {
        setClienteEmEdicao(null);
        setErro(null);
        setMensagem(null);
        setModalAberto(true);
    }

    function fecharModal() {
        if (salvando) {
            return;
        }

        setModalAberto(false);
        setClienteEmEdicao(null);
        setErro(null);
    }

    function iniciarEdicao(cliente: Cliente) {
        setClienteEmEdicao(cliente);
        setErro(null);
        setMensagem(null);
        setModalAberto(true);
    }

    async function salvarCliente(
        dados: DadosFormularioCliente
    ): Promise<void> {
        if (!podeGerenciar) {
            setErro("Apenas gestores podem cadastrar ou editar clientes.");
            return;
        }

        const nome = dados.nome.trim();
        const razaoSocial = dados.razao_social.trim();
        const ramoAtuacao = dados.ramo_atuacao.trim();

        if (!nome || !razaoSocial || !ramoAtuacao) {
            setErro("Preencha nome, razão social e ramo de atuação.");
            return;
        }

        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            if (clienteEmEdicao) {
                const atualizado = await clienteService.atualizar(
                    clienteEmEdicao.id,
                    {
                        nome,
                        razao_social: razaoSocial,
                        ramo_atuacao: ramoAtuacao,
                    }
                );

                setClientes((anteriores) =>
                    anteriores.map((cliente) =>
                        cliente.id === atualizado.id
                            ? { ...cliente, ...atualizado }
                            : cliente
                    )
                );

                setMensagem(
                    `Cliente "${atualizado.nome}" atualizado com sucesso.`
                );
            } else {
                const payload: ClienteInput = {
                    nome,
                    razao_social: razaoSocial,
                    ramo_atuacao: ramoAtuacao,
                    locais_operacionais: [],
                };

                const criado = await clienteService.criar(payload);

                setClientes((anteriores) =>
                    [...anteriores, criado].sort(
                        (a, b) => a.id - b.id
                    )
                );

                setBusca("");
                setFiltroSituacao("ativos");

                setMensagem(
                    `Cliente "${criado.nome}" cadastrado com sucesso.`
                );
            }

            setModalAberto(false);
            setClienteEmEdicao(null);
        } catch (error) {
            setErro(
                mensagemErro(
                    error,
                    clienteEmEdicao
                        ? "Não foi possível atualizar o cliente."
                        : "Não foi possível cadastrar o cliente."
                )
            );
        } finally {
            setSalvando(false);
        }
    }

    async function salvarEdicaoDireta(
        clienteId: number,
        dados: Pick<ClienteInput, "nome" | "razao_social" | "ramo_atuacao">
    ): Promise<Cliente | null> {
        if (!podeGerenciar || salvando) return null;

        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            const atualizado = await clienteService.atualizar(clienteId, dados);

            setClientes((anteriores) =>
                anteriores.map((cliente) =>
                    cliente.id === atualizado.id
                        ? { ...cliente, ...atualizado }
                        : cliente
                )
            );

            setMensagem(`Cliente "${atualizado.nome}" atualizado com sucesso.`);
            return atualizado;
        } catch (error) {
            setErro(mensagemErro(error, "Não foi possível atualizar o cliente."));
            return null;
        } finally {
            setSalvando(false);
        }
    }

    function solicitarAlteracaoStatus(
        cliente: Cliente,
        acao: AcaoStatus
    ) {
        if (!podeGerenciar || inativandoId !== null) {
            return;
        }

        if (acao === "inativar" && !cliente.ativo) {
            return;
        }

        if (acao === "reativar" && cliente.ativo) {
            return;
        }

        setClienteConfirmacao(cliente);
        setAcaoConfirmacao(acao);
        setErro(null);
        setMensagem(null);
    }

    function fecharConfirmacao() {
        if (inativandoId !== null) {
            return;
        }

        setClienteConfirmacao(null);
        setAcaoConfirmacao(null);
        setErro(null);
    }

    async function confirmarAlteracaoStatus(): Promise<void> {
        if (
            !podeGerenciar ||
            !clienteConfirmacao ||
            !acaoConfirmacao ||
            inativandoId !== null
        ) {
            return;
        }

        const cliente = clienteConfirmacao;
        const acao = acaoConfirmacao;

        setInativandoId(cliente.id);
        setErro(null);
        setMensagem(null);

        try {
            if (acao === "inativar") {
                await clienteService.excluir(cliente.id);

                setClientes((anteriores) =>
                    anteriores.map((item) =>
                        item.id === cliente.id
                            ? { ...item, ativo: false }
                            : item
                    )
                );

                setMensagem(
                    `Cliente "${cliente.nome}" inativado com sucesso.`
                );
            } else {
                const resposta = await clienteService.ativar(cliente.id);

                setClientes((anteriores) =>
                    anteriores.map((item) =>
                        item.id === resposta.cliente.id
                            ? { ...item, ...resposta.cliente }
                            : item
                    )
                );

                setMensagem(
                    resposta.mensagem ||
                    `Cliente "${cliente.nome}" reativado com sucesso.`
                );
            }

            setClienteConfirmacao(null);
            setAcaoConfirmacao(null);
        } catch (error) {
            setErro(
                mensagemErro(
                    error,
                    acao === "inativar"
                        ? "Não foi possível inativar o cliente."
                        : "Não foi possível reativar o cliente."
                )
            );
        } finally {
            setInativandoId(null);
        }
    }

    /** Baixa o relatório do cliente em PDF (Gestor ou Analista) e salva como `Cliente-{id}.pdf`. */
    async function exportarPdf(cliente: Cliente): Promise<void> {
        // A ref bloqueia cliques repetidos antes mesmo de o botão ser desabilitado na tela.
        if (exportacaoPdfEmAndamento.current) return;

        if (!podeExportarPdf) {
            setErroExportacaoPdf({
                clienteId: cliente.id,
                mensagem: "Apenas gestores e analistas podem exportar o relatório do cliente em PDF.",
            });
            return;
        }

        exportacaoPdfEmAndamento.current = true;
        setExportandoPdfId(cliente.id);
        setErroExportacaoPdf(null);

        try {
            const blob = await clienteService.exportarPdf(cliente.id);
            await garantirPdfValido(blob);
            salvarPdfCliente(blob, cliente.id);
            publishToast({
                title: "PDF do cliente preparado",
                message: `O arquivo ${nomeArquivoPdfCliente(cliente.id)} foi enviado para download.`,
                variant: "success",
            });
        } catch (error) {
            setErroExportacaoPdf({ clienteId: cliente.id, mensagem: mensagemErroExportacaoPdf(error) });
        } finally {
            exportacaoPdfEmAndamento.current = false;
            setExportandoPdfId(null);
        }
    }

    function limparErroExportacaoPdf() {
        setErroExportacaoPdf(null);
    }

    return {
        clientes,
        clientesPorSituacao,
        clientesFiltrados,

        carregando,
        salvando,
        inativandoId,

        busca,
        setBusca,
        filtroSituacao,
        setFiltroSituacao,

        podeGerenciar,
        mensagem,
        erro,
        limparErro,

        modalAberto,
        clienteEmEdicao,
        abrirCadastro,
        fecharModal,
        iniciarEdicao,
        salvarCliente,
        salvarEdicaoDireta,

        clienteConfirmacao,
        acaoConfirmacao,
        solicitarAlteracaoStatus,
        fecharConfirmacao,
        confirmarAlteracaoStatus,

        podeExportarPdf,
        exportandoPdfId,
        erroExportacaoPdf,
        exportarPdf,
        limparErroExportacaoPdf,
    };
}
