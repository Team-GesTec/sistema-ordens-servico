import { useEffect, useMemo, useRef, useState } from "react";
import type { FiltroResponsavelOrdem, FiltroStatusOrdem } from "../../utils/ordemServicoUtils";
import { STATUS_LABELS } from "../../utils/ordemServicoUtils";
import { prazoFiltrosValidos } from "../../utils/prazoOrdem";

export type TipoVisualizacaoOrdens = "cartoes" | "kanban";

export interface VisualizacaoOrdemSalva {
    id: string;
    nome: string;
    busca: string;
    status: FiltroStatusOrdem;
    responsavelId: FiltroResponsavelOrdem;
    dataEntregaInicio: string;
    dataEntregaFim: string;
    diasRestantesMin: string;
    diasRestantesMax: string;
    visualizacao: TipoVisualizacaoOrdens;
    atualizadoEm: string;
}

interface OrdemServicoVisualizacoesSalvasProps {
    usuarioId: number | null;
    busca: string;
    status: FiltroStatusOrdem;
    responsavelId: FiltroResponsavelOrdem;
    visualizacao: TipoVisualizacaoOrdens;
    onAplicar: (visualizacao: VisualizacaoOrdemSalva) => void;
}

const CHAVE_BASE = "sgos.ordens.visualizacoes.v1.usuario.";
const MAXIMO_VISUALIZACOES = 30;
const STATUS_VALIDOS = new Set<string>(["todos", ...Object.keys(STATUS_LABELS)]);

function responsavelValido(valor: unknown): valor is FiltroResponsavelOrdem {
    return valor === "todos" || valor === "sem_responsavel" ||
        (typeof valor === "number" && Number.isSafeInteger(valor) && valor > 0);
}

function filtroDataArmazenadoValido(valor: unknown): valor is string {
    if (valor === undefined || valor === "") return true;
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.toISOString().slice(0, 10) === valor;
}

function filtroDuracaoArmazenadoValido(valor: unknown): valor is string {
    return valor === undefined || valor === "" ||
        (typeof valor === "string" && /^-?\d+$/.test(valor) && Number.isSafeInteger(Number(valor)));
}

function lerVisualizacoes(valor: string | null): { visualizacoes: VisualizacaoOrdemSalva[]; corrigidas: boolean } {
    if (!valor) return { visualizacoes: [], corrigidas: false };
    try {
        const dados: unknown = JSON.parse(valor);
        if (!Array.isArray(dados)) return { visualizacoes: [], corrigidas: true };
        const validas = dados.filter((item): item is VisualizacaoOrdemSalva => {
            if (!item || typeof item !== "object") return false;
            const registro = item as Record<string, unknown>;
            return typeof registro.id === "string" && registro.id.length > 0 &&
                typeof registro.nome === "string" && registro.nome.trim().length > 0 &&
                typeof registro.busca === "string" &&
                typeof registro.status === "string" && STATUS_VALIDOS.has(registro.status) &&
                responsavelValido(registro.responsavelId) &&
                (registro.visualizacao === "cartoes" || registro.visualizacao === "kanban") &&
                typeof registro.atualizadoEm === "string";
        });
        const temFiltrosLegados = dados.some((item) => Boolean(item && typeof item === "object" && ("diasCorridosMin" in item || "diasCorridosMax" in item || "diasUteisMin" in item || "diasUteisMax" in item)));
        let corrigidas = validas.length !== dados.length || validas.length > MAXIMO_VISUALIZACOES || temFiltrosLegados;
        const normalizadas = validas.map((item) => {
            const camposPrazo = [
                item.dataEntregaInicio,
                item.dataEntregaFim,
            ];
            const camposDuracao = [
                item.diasRestantesMin,
                item.diasRestantesMax,
            ];
            const datasValidas = camposPrazo.every((campo) => filtroDataArmazenadoValido(campo));
            const duracoesValidas = camposDuracao.every((campo) => filtroDuracaoArmazenadoValido(campo));
            if (!datasValidas || !duracoesValidas) corrigidas = true;
            const filtros = {
                dataEntregaInicio: datasValidas && typeof item.dataEntregaInicio === "string" ? item.dataEntregaInicio : "",
                dataEntregaFim: datasValidas && typeof item.dataEntregaFim === "string" ? item.dataEntregaFim : "",
                diasRestantesMin: duracoesValidas && typeof item.diasRestantesMin === "string" ? item.diasRestantesMin : "",
                diasRestantesMax: duracoesValidas && typeof item.diasRestantesMax === "string" ? item.diasRestantesMax : "",
            };
            if (!prazoFiltrosValidos(filtros)) {
                corrigidas = true;
                Object.assign(filtros, {
                    dataEntregaInicio: "", dataEntregaFim: "",
                    diasRestantesMin: "", diasRestantesMax: "",
                });
            }
            return { ...item, ...filtros };
        });
        return { visualizacoes: normalizadas.slice(0, MAXIMO_VISUALIZACOES), corrigidas };
    } catch {
        return { visualizacoes: [], corrigidas: true };
    }
}

function criarId(): string {
    try {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
            return crypto.randomUUID();
        }
    } catch {
        // Fallback apenas para o identificador local de preferência, não de domínio.
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function OrdemServicoVisualizacoesSalvas({
    usuarioId,
    busca,
    status,
    responsavelId,
    visualizacao,
    onAplicar,
}: OrdemServicoVisualizacoesSalvasProps) {
    const [salvas, setSalvas] = useState<VisualizacaoOrdemSalva[]>([]);
    const [selecionadaId, setSelecionadaId] = useState("");
    const [novoNome, setNovoNome] = useState("");
    const [editandoNome, setEditandoNome] = useState(false);
    const [nomeEdicao, setNomeEdicao] = useState("");
    const [modalAberto, setModalAberto] = useState(false);
    const [feedback, setFeedback] = useState<{ texto: string; erro: boolean } | null>(null);
    const [avisoArmazenamento, setAvisoArmazenamento] = useState<string | null>(null);
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const nomeRef = useRef<HTMLInputElement | null>(null);

    const chave = usuarioId && Number.isSafeInteger(usuarioId) && usuarioId > 0
        ? `${CHAVE_BASE}${usuarioId}`
        : null;
    const selecionada = useMemo(
        () => salvas.find((item) => item.id === selecionadaId) ?? null,
        [salvas, selecionadaId],
    );

    useEffect(() => {
        setSelecionadaId("");
        setEditandoNome(false);
        setFeedback(null);
        setAvisoArmazenamento(null);
        if (!chave) {
            setSalvas([]);
            return;
        }
        try {
            const leitura = lerVisualizacoes(window.localStorage.getItem(chave));
            setSalvas(leitura.visualizacoes);
            if (leitura.corrigidas) {
                setAvisoArmazenamento("Uma ou mais visualizações locais estavam inválidas ou incompatíveis. Configurações inválidas foram ignoradas e filtros de prazo incompatíveis foram limpos para proteger a listagem.");
            }
        } catch {
            setSalvas([]);
            setAvisoArmazenamento("O navegador não permite ler as visualizações salvas.");
        }
    }, [chave]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (modalAberto && !dialog.open) {
            dialog.showModal();
            nomeRef.current?.focus();
        } else if (!modalAberto && dialog.open) {
            dialog.close();
        }
    }, [modalAberto]);

    function persistir(proximas: VisualizacaoOrdemSalva[], sucesso: string, proximaSelecao?: string) {
        if (!chave) {
            setFeedback({ texto: "Não foi possível identificar o proprietário das visualizações.", erro: true });
            return false;
        }
        try {
            window.localStorage.setItem(chave, JSON.stringify(proximas));
            setSalvas(proximas);
            if (proximaSelecao !== undefined) setSelecionadaId(proximaSelecao);
            setFeedback({ texto: sucesso, erro: false });
            return true;
        } catch {
            setFeedback({ texto: "Não foi possível salvar no armazenamento deste navegador. Verifique o espaço disponível e as permissões do navegador.", erro: true });
            return false;
        }
    }

    function nomeDuplicado(nome: string, ignorarId?: string): boolean {
        const normalizado = nome.trim().toLocaleLowerCase("pt-BR");
        return salvas.some((item) => item.id !== ignorarId && item.nome.trim().toLocaleLowerCase("pt-BR") === normalizado);
    }

    function abrirModal() {
        setFeedback(null);
        setEditandoNome(false);
        setNomeEdicao("");
        setModalAberto(true);
    }

    function fecharModal() {
        setModalAberto(false);
        setEditandoNome(false);
    }

    function salvarNova() {
        const nome = novoNome.trim();
        if (!nome) {
            setFeedback({ texto: "Informe um nome para a visualização.", erro: true });
            nomeRef.current?.focus();
            return;
        }
        if (nome.length > 60) {
            setFeedback({ texto: "O nome pode ter no máximo 60 caracteres.", erro: true });
            return;
        }
        if (nomeDuplicado(nome)) {
            setFeedback({ texto: "Já existe uma visualização com esse nome neste navegador.", erro: true });
            return;
        }
        if (salvas.length >= MAXIMO_VISUALIZACOES) {
            setFeedback({ texto: `O limite local é de ${MAXIMO_VISUALIZACOES} visualizações por usuário. Selecione e remova uma visualização existente antes de salvar outra.`, erro: true });
            return;
        }
        const nova: VisualizacaoOrdemSalva = {
            id: criarId(), nome, busca, status, responsavelId,
            dataEntregaInicio: "", dataEntregaFim: "",
            diasRestantesMin: "", diasRestantesMax: "",
            visualizacao, atualizadoEm: new Date().toISOString(),
        };
        if (persistir([nova, ...salvas], `Visualização “${nome}” salva neste navegador.`, nova.id)) {
            setNovoNome("");
        }
    }

    function atualizarSelecionada() {
        if (!selecionada) return;
        const confirmar = window.confirm(`Substituir os filtros salvos de “${selecionada.nome}” pelos filtros atuais?`);
        if (!confirmar) return;
        const atualizada = { ...selecionada, busca, status, responsavelId, visualizacao, atualizadoEm: new Date().toISOString() };
        persistir(salvas.map((item) => item.id === selecionada.id ? atualizada : item), `Filtros da visualização “${selecionada.nome}” atualizados.`);
    }

    function iniciarRenomeacao() {
        if (!selecionada) return;
        setNomeEdicao(selecionada.nome);
        setEditandoNome(true);
        setFeedback(null);
    }

    function confirmarRenomeacao() {
        if (!selecionada) return;
        const nome = nomeEdicao.trim();
        if (!nome || nome.length > 60) {
            setFeedback({ texto: "Informe um nome de até 60 caracteres.", erro: true });
            return;
        }
        if (nomeDuplicado(nome, selecionada.id)) {
            setFeedback({ texto: "Já existe uma visualização com esse nome neste navegador.", erro: true });
            return;
        }
        if (persistir(salvas.map((item) => item.id === selecionada.id ? { ...item, nome, atualizadoEm: new Date().toISOString() } : item), `Visualização renomeada para “${nome}”.`)) {
            setEditandoNome(false);
        }
    }

    function removerSelecionada() {
        if (!selecionada) return;
        if (!window.confirm(`Remover a visualização “${selecionada.nome}”? Esta ação não pode ser desfeita.`)) return;
        const proximas = salvas.filter((item) => item.id !== selecionada.id);
        if (persistir(proximas, `Visualização “${selecionada.nome}” removida.`, "")) {
            setEditandoNome(false);
        }
    }

    function aplicarSelecionada() {
        if (!selecionada) return;
        onAplicar(selecionada);
        fecharModal();
    }

    if (!usuarioId) return null;

    return (
        <div className="ordens-views-control">
            <button
                type="button"
                className="ordens-views-open projeto-btn-secondary"
                onClick={abrirModal}
                aria-label="Visualizações salvas"
                title="Visualizações salvas"
            >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Visualizações salvas</span>
            </button>

            <dialog
                ref={dialogRef}
                className="projeto-modal projeto-form-modal ordens-views-dialog"
                aria-labelledby="ordens-views-title"
                onCancel={(event) => { event.preventDefault(); fecharModal(); }}
                onClose={() => setModalAberto(false)}
            >
                <div className="projeto-modal-header ordens-views-dialog-header">
                    <div>
                        <p className="projetos-eyebrow">ORDENS DE SERVIÇO</p>
                        <h2 id="ordens-views-title">PREFERÊNCIAS DA LISTAGEM</h2>
                    </div>
                    <button type="button" className="projeto-modal-close ordens-views-close" onClick={fecharModal} aria-label="Fechar configuração de visualizações" title="Fechar">×</button>
                </div>

                <div className="ordens-views-dialog-body">
                    <h3 className="ordens-views-section-title">Visualizações salvas</h3>
                    <p className="ordens-views-question">Deseja salvar os filtros atuais em suas visualizações?</p>
                    <p className="ordens-views-active-layout">Layout ativo: <strong>{visualizacao === "cartoes" ? "Cartões" : "Kanban"}</strong></p>
                    {avisoArmazenamento && <p className="ordens-views-feedback is-error" role="alert">{avisoArmazenamento}</p>}
                    <div className="ordens-views-context">
                        <span>Preferências pessoais deste navegador; não são sincronizadas entre dispositivos.</span>
                        <span className="ordens-views-count">{salvas.length}/{MAXIMO_VISUALIZACOES}</span>
                    </div>

                    <div className="ordens-views-fields">
                        <label className="ordens-views-name-field" htmlFor="ordens-view-new-name">
                            Nome da visualização
                            <input
                                ref={nomeRef}
                                id="ordens-view-new-name"
                                value={novoNome}
                                maxLength={60}
                                required
                                onChange={(event) => setNovoNome(event.target.value)}
                                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); salvarNova(); } }}
                                placeholder="Ex.: Minhas ordens aguardando"
                                aria-describedby="ordens-view-name-help"
                            />
                            <small id="ordens-view-name-help">Use um nome de até 60 caracteres.</small>
                        </label>
                        <label className="ordens-views-select-field" htmlFor="ordens-view-selected">
                            Visualizações disponíveis
                            <select id="ordens-view-selected" value={selecionadaId} onChange={(event) => { setSelecionadaId(event.target.value); setEditandoNome(false); setFeedback(null); }}>
                                <option value="">Selecione uma visualização</option>
                                {salvas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                            </select>
                            <small>Escolha uma configuração para aplicar ou gerenciar.</small>
                        </label>
                    </div>

                    {salvas.length >= MAXIMO_VISUALIZACOES && <p className="ordens-views-limit" role="status">Limite de 30 visualizações atingido. Selecione uma configuração existente para aplicar ou remova uma antes de salvar outra.</p>}

                    <div className="ordens-views-primary-actions">
                        <button type="button" className="projeto-btn-primary" onClick={salvarNova} disabled={salvas.length >= MAXIMO_VISUALIZACOES}>Salvar nova visualização</button>
                        <button type="button" className="projeto-btn-secondary" onClick={aplicarSelecionada} disabled={!selecionada}>Aplicar selecionada</button>
                    </div>

                    {selecionada && <section className="ordens-views-manage" aria-label={`Gerenciar visualização ${selecionada.nome}`}>
                        <h3>Gerenciar “{selecionada.nome}”</h3>
                        {editandoNome ? (
                            <div className="ordens-views-rename">
                                <label htmlFor="ordens-view-rename">Novo nome</label>
                                <input id="ordens-view-rename" value={nomeEdicao} maxLength={60} onChange={(event) => setNomeEdicao(event.target.value)} />
                                <div className="ordens-views-secondary-actions">
                                    <button type="button" className="projeto-btn-secondary" onClick={confirmarRenomeacao}>Confirmar nome</button>
                                    <button type="button" className="projeto-btn-secondary" onClick={() => setEditandoNome(false)}>Cancelar renomeação</button>
                                </div>
                            </div>
                        ) : (
                            <div className="ordens-views-secondary-actions">
                                <button type="button" className="projeto-btn-secondary" onClick={atualizarSelecionada}>Atualizar com filtros atuais</button>
                                <button type="button" className="projeto-btn-secondary" onClick={iniciarRenomeacao}>Renomear</button>
                                <button type="button" className="projeto-btn-danger" onClick={removerSelecionada}>Remover</button>
                            </div>
                        )}
                    </section>}

                    {feedback && <p className={`ordens-views-feedback${feedback.erro ? " is-error" : ""}`} role={feedback.erro ? "alert" : "status"}>{feedback.texto}</p>}
                </div>

                <div className="projeto-modal-actions ordens-views-dialog-footer">
                    <button type="button" className="projeto-btn-secondary" onClick={fecharModal}>Cancelar</button>
                </div>
            </dialog>
        </div>
    );
}
