import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../services/api";
import { authService } from "../services/auth";
import { departamentoService } from "../services/departamento";
import { funcionarioService } from "../services/funcionario";
import type { Departamento, Funcionario, FuncionarioAtualizacaoInput, FuncionarioInput, PerfilFuncionario } from "../types/api";
import type { DadosFormularioFuncionario } from "../components/funcionarios/FuncionarioFormModal";
import type { SituacaoFuncionario } from "../components/funcionarios/FuncionariosToolbar";

export type AcaoStatusFuncionario = "inativar" | "reativar";

function mensagemErro(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        if (error.status === 403) return `${error.message} A administração de funcionários é exclusiva de Gestores.`;
        return error.message;
    }
    return error instanceof Error && error.message ? error.message : fallback;
}

function normalizar(valor: string): string {
    return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function useFuncionarios() {
    const [funcionariosAtivos, setFuncionariosAtivos] = useState<Funcionario[]>([]);
    const [funcionariosInativos, setFuncionariosInativos] = useState<Funcionario[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [podeGerenciar, setPodeGerenciar] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
    const [carregandoOpcoes, setCarregandoOpcoes] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [alterandoStatusId, setAlterandoStatusId] = useState<number | null>(null);

    const [busca, setBusca] = useState("");
    const [funcionarioFiltroId, setFuncionarioFiltroId] = useState<number | null>(null);
    const [situacao, setSituacao] = useState<SituacaoFuncionario>("ativos");
    const [perfil, setPerfil] = useState<PerfilFuncionario | "todos">("todos");

    const [formularioAberto, setFormularioAberto] = useState(false);
    const [funcionarioEmEdicao, setFuncionarioEmEdicao] = useState<Funcionario | null>(null);
    const [detalhesAbertos, setDetalhesAbertos] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null);
    const [confirmacaoStatus, setConfirmacaoStatus] = useState<{ funcionario: Funcionario; acao: AcaoStatusFuncionario } | null>(null);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    async function carregarDados(inicial = false): Promise<boolean> {
        if (inicial) setCarregando(true);
        else setCarregandoOpcoes(true);
        try {
            const usuario = await authService.me();
            const gestor = usuario.tipo === "gestor";
            setPodeGerenciar(gestor);
            if (!gestor) setSituacao("ativos");

            const [ativos, departamentosApi] = await Promise.all([
                funcionarioService.listar(),
                departamentoService.listar(),
            ]);
            setFuncionariosAtivos(ativos);
            setDepartamentos(departamentosApi);

            if (gestor) {
                try {
                    setFuncionariosInativos(await funcionarioService.listarInativos());
                } catch (errorInativos) {
                    setFuncionariosInativos([]);
                    setErro(mensagemErro(errorInativos, "Não foi possível consultar funcionários inativos."));
                    return false;
                }
            } else {
                setFuncionariosInativos([]);
            }
            setErro(null);
            return true;
        } catch (error) {
            setErro(mensagemErro(error, "Não foi possível carregar funcionários e departamentos."));
            return false;
        } finally {
            setCarregando(false);
            setCarregandoOpcoes(false);
        }
    }

    useEffect(() => {
        void carregarDados(true);
        // A carga inicial é intencionalmente feita uma vez; recargas posteriores são chamadas após mutações.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const todosConhecidos = useMemo(
        () => [...funcionariosAtivos, ...funcionariosInativos].sort((a, b) => a.id - b.id),
        [funcionariosAtivos, funcionariosInativos],
    );
    const departamentosPorId = useMemo(() => new Map(departamentos.map((item) => [item.id, item])), [departamentos]);

    const funcionariosParaBusca = useMemo(() => {
        if (!podeGerenciar || situacao === "ativos") return funcionariosAtivos;
        if (situacao === "inativos") return funcionariosInativos;
        return todosConhecidos;
    }, [podeGerenciar, situacao, funcionariosAtivos, funcionariosInativos, todosConhecidos]);

    const funcionariosFiltrados = useMemo(() => {
        const fonte = situacao === "inativos" && podeGerenciar
            ? funcionariosInativos
            : situacao === "todos" && podeGerenciar
                ? todosConhecidos
                : funcionariosAtivos;
        const termo = normalizar(busca.trim());
        return fonte.filter((funcionario) => {
            if (funcionarioFiltroId !== null && funcionario.id !== funcionarioFiltroId) return false;
            if (perfil !== "todos" && funcionario.tipo !== perfil) return false;
            if (!termo) return true;
            const departamento = departamentosPorId.get(funcionario.departamento_id)?.nome ?? "";
            return normalizar(`${funcionario.nome} ${funcionario.usuario} ${departamento} ${funcionario.id}`).includes(termo);
        });
    }, [situacao, podeGerenciar, funcionariosInativos, todosConhecidos, funcionariosAtivos, funcionarioFiltroId, perfil, busca, departamentosPorId]);

    function aplicarFuncionarioLocal(funcionario: Funcionario): void {
        setFuncionariosAtivos((atuais) => {
            const semRegistro = atuais.filter((item) => item.id !== funcionario.id);
            return funcionario.ativo
                ? [...semRegistro, funcionario].sort((a, b) => a.id - b.id)
                : semRegistro;
        });
        setFuncionariosInativos((atuais) => {
            const semRegistro = atuais.filter((item) => item.id !== funcionario.id);
            return funcionario.ativo
                ? semRegistro
                : [...semRegistro, funcionario].sort((a, b) => a.id - b.id);
        });
    }

    function limparMensagens() {
        setErro(null);
        setMensagem(null);
    }

    function abrirCadastro() {
        if (!podeGerenciar) {
            setErro("Apenas Gestores podem cadastrar funcionários.");
            return;
        }
        limparMensagens();
        setFuncionarioEmEdicao(null);
        setFormularioAberto(true);
    }

    function iniciarEdicao(funcionario: Funcionario) {
        if (!podeGerenciar) {
            setErro("Apenas Gestores podem editar funcionários.");
            return;
        }
        limparMensagens();
        setDetalhesAbertos(false);
        setFuncionarioSelecionado(null);
        setFuncionarioEmEdicao(funcionario);
        setFormularioAberto(true);
    }

    function fecharFormulario() {
        if (salvando) return;
        setFormularioAberto(false);
        setFuncionarioEmEdicao(null);
        setErro(null);
    }

    async function salvarFuncionario(dados: DadosFormularioFuncionario): Promise<void> {
        if (!podeGerenciar) {
            setErro("Apenas Gestores podem cadastrar ou editar funcionários.");
            return;
        }
        if (!dados.departamento_id) {
            setErro("Selecione um departamento válido.");
            return;
        }

        setSalvando(true);
        setErro(null);
        setMensagem(null);
        let funcionarioSalvo: Funcionario;
        try {
            if (funcionarioEmEdicao) {
                const payload: FuncionarioAtualizacaoInput = {
                    nome: dados.nome,
                    usuario: dados.usuario,
                    departamento_id: dados.departamento_id,
                    tipo: dados.tipo,
                    ...(dados.senha !== "" ? { senha: dados.senha } : {}),
                };
                funcionarioSalvo = await funcionarioService.atualizar(funcionarioEmEdicao.id, payload);
            } else {
                const payload: FuncionarioInput = {
                    nome: dados.nome,
                    usuario: dados.usuario,
                    departamento_id: dados.departamento_id,
                    tipo: dados.tipo,
                    senha: dados.senha,
                };
                funcionarioSalvo = await funcionarioService.criar(payload);
            }
        } catch (error) {
            setErro(mensagemErro(error, funcionarioEmEdicao ? "Não foi possível atualizar o funcionário." : "Não foi possível cadastrar o funcionário."));
            setSalvando(false);
            return;
        }

        aplicarFuncionarioLocal(funcionarioSalvo);
        const textoSucesso = funcionarioEmEdicao
            ? `Funcionário "${funcionarioSalvo.nome}" atualizado com sucesso.`
            : `Funcionário "${funcionarioSalvo.nome}" cadastrado com sucesso.`;
        setMensagem(textoSucesso);
        setFormularioAberto(false);
        setFuncionarioEmEdicao(null);
        setSalvando(false);

        const atualizado = await carregarDados(false);
        if (!atualizado) {
            setMensagem(`${textoSucesso} A gravação foi confirmada pela API, mas a listagem não pôde ser atualizada; recarregue a tela.`);
        }
    }

    async function abrirDetalhes(funcionario: Funcionario): Promise<void> {
        setErro(null);
        setFuncionarioSelecionado(funcionario);
        setDetalhesAbertos(true);
        setCarregandoDetalhe(true);
        try {
            const detalhe = await funcionarioService.buscarPorId(funcionario.id);
            setFuncionarioSelecionado(detalhe);
        } catch (error) {
            setErro(mensagemErro(error, "Não foi possível carregar os detalhes do funcionário."));
        } finally {
            setCarregandoDetalhe(false);
        }
    }

    function solicitarAlteracaoStatus(funcionario: Funcionario, acao: AcaoStatusFuncionario): void {
        if (!podeGerenciar || alterandoStatusId !== null) {
            setErro("Apenas Gestores podem inativar ou reativar funcionários.");
            return;
        }
        setErro(null);
        setMensagem(null);
        setConfirmacaoStatus({ funcionario, acao });
    }

    function fecharConfirmacaoStatus(): void {
        if (alterandoStatusId !== null) return;
        setConfirmacaoStatus(null);
        setErro(null);
    }

    async function confirmarAlteracaoStatus(): Promise<void> {
        if (!podeGerenciar || !confirmacaoStatus || alterandoStatusId !== null) return;
        const { funcionario, acao } = confirmacaoStatus;
        setAlterandoStatusId(funcionario.id);
        setErro(null);
        setMensagem(null);

        let textoSucesso: string;
        try {
            const resultado = acao === "inativar"
                ? await funcionarioService.inativar(funcionario.id)
                : await funcionarioService.reativar(funcionario.id);
            aplicarFuncionarioLocal(resultado.funcionario);
            textoSucesso = resultado.mensagem;
        } catch (error) {
            setErro(mensagemErro(error, acao === "inativar" ? "Não foi possível inativar o funcionário." : "Não foi possível reativar o funcionário."));
            setAlterandoStatusId(null);
            return;
        }

        setMensagem(textoSucesso);
        setConfirmacaoStatus(null);
        setDetalhesAbertos(false);
        setFuncionarioSelecionado(null);
        setAlterandoStatusId(null);
        const atualizado = await carregarDados(false);
        if (!atualizado) setMensagem(`${textoSucesso} A operação foi confirmada pela API, mas a lista não foi atualizada. Recarregue a tela.`);
    }

    return {
        funcionariosAtivos,
        funcionariosInativos,
        funcionariosParaBusca,
        funcionariosFiltrados,
        departamentos,
        departamentosPorId,
        podeGerenciar,
        carregando,
        carregandoDetalhe,
        carregandoOpcoes,
        salvando,
        alterandoStatusId,
        busca,
        setBusca,
        funcionarioFiltroId,
        setFuncionarioFiltroId,
        situacao,
        setSituacao,
        perfil,
        setPerfil,
        formularioAberto,
        funcionarioEmEdicao,
        abrirCadastro,
        iniciarEdicao,
        fecharFormulario,
        salvarFuncionario,
        detalhesAbertos,
        funcionarioSelecionado,
        abrirDetalhes,
        fecharDetalhes: () => { setDetalhesAbertos(false); setCarregandoDetalhe(false); },
        confirmacaoStatus,
        solicitarAlteracaoStatus,
        fecharConfirmacaoStatus,
        confirmarAlteracaoStatus,
        mensagem,
        erro,
        limparMensagens,
    };
}
