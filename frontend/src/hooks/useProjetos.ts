import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../services/api";
import { authService } from "../services/auth";
import { clienteService } from "../services/cliente";
import { departamentoService } from "../services/departamento";
import { projetoService } from "../services/projeto";
import type { Cliente, Departamento, Projeto, ProjetoDetalhe, ProjetoInput, StatusProjeto } from "../types/api";

type FiltroStatus = "todos" | StatusProjeto;
type AcaoAtivo = "inativar" | "reativar";

function mensagemErro(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        if (error.status === 403) return error.message || "Seu perfil não tem permissão para executar esta operação.";
        return error.message;
    }
    return error instanceof Error ? error.message : fallback;
}

export function useProjetos() {
    const [projetosAtivos, setProjetosAtivos] = useState<Projeto[]>([]);
    const [projetosInativos, setProjetosInativos] = useState<Projeto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [alterandoAtivoId, setAlterandoAtivoId] = useState<number | null>(null);
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
    const [mostrarInativos, setMostrarInativos] = useState(false);
    const [podeGerenciar, setPodeGerenciar] = useState(false);
    const [formularioAberto, setFormularioAberto] = useState(false);
    const [projetoEmEdicao, setProjetoEmEdicao] = useState<Projeto | null>(null);
    const [projetoSelecionado, setProjetoSelecionado] = useState<ProjetoDetalhe | null>(null);
    const [confirmacaoAtivo, setConfirmacaoAtivo] = useState<{ projeto: Projeto; acao: AcaoAtivo } | null>(null);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);


    useEffect(() => {
        let montado = true;
        async function inicializar() {
            setCarregando(true);
            try {
                const [usuario, clientesApi, departamentosApi, projetosApi] = await Promise.all([
                    authService.me(),
                    clienteService.listar(),
                    departamentoService.listar(),
                    projetoService.listar(),
                ]);
                if (!montado) return;
                const gestor = usuario.tipo === "gestor";
                setPodeGerenciar(gestor);
                setClientes(clientesApi);
                setDepartamentos(departamentosApi);
                setCarregandoOpcoes(false);
                setProjetosAtivos(projetosApi);
                if (gestor) {
                    const inativos = await projetoService.listarInativos();
                    if (montado) setProjetosInativos(inativos);
                }
            } catch (error) {
                if (montado) setErro(mensagemErro(error, "Não foi possível carregar os projetos."));
            } finally {
                if (montado) {
                    setCarregando(false);
                    setCarregandoOpcoes(false);
                }
            }
        }
        void inicializar();
        return () => { montado = false; };
    }, []);

    const projetosDaSituacao = mostrarInativos ? projetosInativos : projetosAtivos;
    const projetosFiltrados = useMemo(() => {
        const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        return projetosDaSituacao.filter((projeto) => {
            const codigoExato = termo.match(/^#(\d+)$/);
            const correspondeCodigo = codigoExato
                ? projeto.id === Number(codigoExato[1])
                : String(projeto.id).includes(termo);
            const correspondeTexto = !termo || correspondeCodigo || [
                projeto.nome,
                projeto.cliente?.nome ?? "",
                projeto.cliente?.razao_social ?? "",
            ].some((valor) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(termo));
            return correspondeTexto && (filtroStatus === "todos" || projeto.status === filtroStatus);
        });
    }, [projetosDaSituacao, busca, filtroStatus]);

    function limparFeedback() { setErro(null); setMensagem(null); }

    /** Atualiza cada lista independentemente e relata falhas sem repetir mutações. */
    async function recarregarListas(): Promise<void> {
        const [ativos, inativos] = await Promise.allSettled([
            projetoService.listar(),
            projetoService.listarInativos(),
        ]);
        const falhas: string[] = [];
        if (ativos.status === "fulfilled") setProjetosAtivos(ativos.value);
        else falhas.push(`ativos: ${mensagemErro(ativos.reason, "falha ao consultar projetos ativos")}`);
        if (inativos.status === "fulfilled") setProjetosInativos(inativos.value);
        else falhas.push(`inativos: ${mensagemErro(inativos.reason, "falha ao consultar projetos inativos")}`);
        if (falhas.length > 0) throw new Error(falhas.join("; "));
    }

    function abrirCadastro() {
        if (!podeGerenciar || salvando) return;
        setProjetoEmEdicao(null);
        limparFeedback();
        setFormularioAberto(true);
    }

    function iniciarEdicao(projeto: Projeto) {
        if (!podeGerenciar || salvando) return;
        setProjetoEmEdicao(projeto);
        setProjetoSelecionado(null);
        limparFeedback();
        setFormularioAberto(true);
    }

    function fecharFormulario() {
        if (salvando) return;
        setFormularioAberto(false);
        setProjetoEmEdicao(null);
        setErro(null);
    }

    async function salvarProjeto(dados: ProjetoInput): Promise<void> {
        if (!podeGerenciar) {
            setErro("Apenas gestores podem cadastrar ou editar projetos.");
            return;
        }
        setSalvando(true);
        limparFeedback();
        try {
            let salvo: Projeto;
            try {
                salvo = projetoEmEdicao
                    ? await projetoService.atualizar(projetoEmEdicao.id, dados)
                    : await projetoService.criar(dados);
            } catch (error) {
                setErro(mensagemErro(error, "Não foi possível salvar o projeto."));
                return;
            }

            // A API confirmou a gravação; falhas posteriores são apenas de atualização da tela.
            const estavaEditando = projetoEmEdicao !== null;
            setFormularioAberto(false);
            setProjetoEmEdicao(null);
            setMensagem(estavaEditando
                ? `Projeto "${salvo.nome}" atualizado com sucesso.`
                : `Projeto "${salvo.nome}" cadastrado com sucesso.`);

            try {
                await recarregarListas();
                if (projetoSelecionado?.id === salvo.id) {
                    setProjetoSelecionado(await projetoService.buscarPorId(salvo.id));
                }
            } catch (error) {
                setErro(`Projeto salvo com sucesso, mas não foi possível atualizar os dados exibidos. ${mensagemErro(error, "Falha ao recarregar a listagem ou os detalhes.")}`);
            }
        } finally {
            setSalvando(false);
        }
    }

    async function abrirDetalhes(projeto: Projeto): Promise<void> {
        limparFeedback();
        try {
            setProjetoSelecionado(await projetoService.buscarPorId(projeto.id));
        } catch (error) {
            setErro(mensagemErro(error, "Não foi possível carregar os detalhes do projeto."));
        }
    }

    function solicitarAlteracaoAtivo(projeto: Projeto, acao: AcaoAtivo): void {
        if (!podeGerenciar || alterandoAtivoId !== null) return;
        limparFeedback();
        setConfirmacaoAtivo({ projeto, acao });
    }

    function fecharConfirmacaoAtivo(): void {
        if (alterandoAtivoId !== null) return;
        setConfirmacaoAtivo(null);
        setErro(null);
    }

    async function confirmarAlteracaoAtivo(): Promise<void> {
        if (!podeGerenciar || !confirmacaoAtivo || alterandoAtivoId !== null) return;
        const { projeto, acao } = confirmacaoAtivo;
        const ativo = acao === "reativar";
        setAlterandoAtivoId(projeto.id);
        limparFeedback();
        try {
            try {
                await projetoService.alterarAtivo(projeto.id, ativo);
            } catch (error) {
                setErro(mensagemErro(error, "Não foi possível alterar o estado do projeto."));
                return;
            }

            // A mutação foi confirmada; não repetir a operação se algum GET falhar.
            setConfirmacaoAtivo(null);
            setMensagem(ativo
                ? `Projeto "${projeto.nome}" reativado com sucesso.`
                : `Projeto "${projeto.nome}" inativado com sucesso.`);
            try {
                await recarregarListas();
                if (projetoSelecionado?.id === projeto.id) {
                    setProjetoSelecionado(await projetoService.buscarPorId(projeto.id));
                }
            } catch (error) {
                setErro(`O projeto foi ${ativo ? "reativado" : "inativado"} com sucesso, mas não foi possível atualizar os dados exibidos. ${mensagemErro(error, "Falha ao recarregar a listagem ou os detalhes.")}`);
            }
        } finally {
            setAlterandoAtivoId(null);
        }
    }

    async function alternarInativos(): Promise<void> {
        if (!podeGerenciar) return;
        limparFeedback();
        const exibir = !mostrarInativos;
        setMostrarInativos(exibir);
        setFiltroStatus("todos");
        if (exibir && projetosInativos.length === 0) {
            setCarregando(true);
            try {
                setProjetosInativos(await projetoService.listarInativos());
            } catch (error) {
                setErro(mensagemErro(error, "Não foi possível carregar os projetos inativos."));
            } finally {
                setCarregando(false);
            }
        }
    }

    return {
        projetos: projetosFiltrados,
        clientes,
        departamentos,
        carregando,
        carregandoOpcoes,
        salvando,
        alterandoAtivoId,
        busca,
        setBusca,
        filtroStatus,
        setFiltroStatus,
        mostrarInativos,
        podeGerenciar,
        formularioAberto,
        projetoEmEdicao,
        projetoSelecionado,
        setProjetoSelecionado,
        confirmacaoAtivo,
        mensagem,
        erro,
        abrirCadastro,
        iniciarEdicao,
        fecharFormulario,
        salvarProjeto,
        abrirDetalhes,
        solicitarAlteracaoAtivo,
        fecharConfirmacaoAtivo,
        confirmarAlteracaoAtivo,
        alternarInativos,
        limparFeedback,
    };
}
