import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/darkmode.css";
import "../styles/filters.css";
import "../styles/forms.css";
import "../styles/autocomplete.css";
import "../styles/projetos.css";

import ProjetoAtivoModal from "../components/projetos/ProjetoAtivoModal";
import ProjetoCard from "../components/projetos/ProjetoCard";
import ProjetoDetalhesModal from "../components/projetos/ProjetoDetalhesModal";
import ProjetoFormModal from "../components/projetos/ProjetoFormModal";
import ProjetosBuscaAutocomplete from "../components/projetos/ProjetosBuscaAutocomplete";
import Autocomplete, { type AutocompleteOption } from "../components/common/Autocomplete";
import { useProjetos } from "../hooks/useProjetos";
import { ApiError } from "../services/api";
import { projetoService } from "../services/projeto";
import type { StatusProjeto } from "../types/api";

const STATUS_OPTIONS: AutocompleteOption[] = [
    { value: "todos", label: "Todos os status" },
    { value: "em_planejamento", label: "Em planejamento" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "pausado", label: "Pausado" },
    { value: "concluido", label: "Concluído" },
];

function Projetos() {
    const projetos = useProjetos();
    const [searchParams, setSearchParams] = useSearchParams();
    const idVisualizar = searchParams.get("visualizar");
    const idVisualizarProcessado = useRef<string | null>(null);
    const [erroDetalheDireto, setErroDetalheDireto] = useState<string | null>(null);
    
    const modalAberto = projetos.formularioAberto || Boolean(projetos.confirmacaoAtivo);

    useEffect(() => {
        if (!idVisualizar) {
            idVisualizarProcessado.current = null;
            return;
        }
        if (projetos.carregando || idVisualizarProcessado.current === idVisualizar) return;
        
        idVisualizarProcessado.current = idVisualizar;
        const id = Number(idVisualizar);
        
        if (Number.isSafeInteger(id) && id > 0) {
            setErroDetalheDireto(null);
            void projetoService.buscarPorId(id)
                .then((detalhe) => projetos.setProjetoSelecionado(detalhe))
                .catch((error: unknown) => setErroDetalheDireto(error instanceof ApiError ? error.message : "Não foi possível abrir os detalhes do projeto no escopo da sua conta."));
        } else {
            setErroDetalheDireto("Identificador do projeto inválido.");
        }
        
        setSearchParams((atuais) => {
            const proximos = new URLSearchParams(atuais);
            proximos.delete("visualizar");
            return proximos;
        }, { replace: true });
    }, [idVisualizar, projetos.carregando, projetos.setProjetoSelecionado, setSearchParams]);

    return (
        <div className="layout">
            <main className="main">
                <div className="container projetos-container">
                    <header className="projetos-page-header">
                        <div>
                            <p className="projetos-eyebrow">GESTÃO DO SGOS</p>
                            <h1>Projetos</h1>
                            <p className="projetos-subtitle">Acompanhe o andamento, os relacionamentos e as ordens de serviço de cada projeto.</p>
                        </div>
                        {projetos.podeGerenciar && !projetos.mostrarInativos && (
                            <button type="button" className="projeto-btn-primary" onClick={projetos.abrirCadastro}>+ Novo projeto</button>
                        )}
                    </header>

                    {projetos.mensagem && !modalAberto && <div className="projetos-feedback projetos-feedback--success" role="status">{projetos.mensagem}</div>}
                    {projetos.erro && !modalAberto && <div className="projetos-feedback projetos-feedback--error" role="alert">{projetos.erro}</div>}
                    {erroDetalheDireto && <div className="projetos-feedback projetos-feedback--error" role="alert">{erroDetalheDireto}</div>}

                    <section className="projetos-toolbar" aria-label="Pesquisar e filtrar projetos">
                        <ProjetosBuscaAutocomplete
                            projetos={projetos.projetos}
                            value={projetos.busca}
                            onChange={projetos.setBusca}
                        />
                        <div className="projetos-filter-wrap projetos-status-filter-wrap">
                            <label htmlFor="projetos-status-filter">Status</label>
                            <Autocomplete
                                id="projetos-status-filter"
                                options={STATUS_OPTIONS}
                                value={projetos.filtroStatus}
                                onChange={(value) => projetos.setFiltroStatus(value === null ? "todos" : value as "todos" | StatusProjeto)}
                                placeholder="Todos os status"
                                emptyMessage="Nenhum status encontrado."
                            />
                        </div>
                        {projetos.podeGerenciar && (
                            <button type="button" className="projeto-btn-secondary projetos-toggle-inativos" onClick={() => void projetos.alternarInativos()} aria-pressed={projetos.mostrarInativos}>
                                {projetos.mostrarInativos ? "Ver projetos ativos" : "Consultar inativos"}
                            </button>
                        )}
                    </section>

                    <div className="projetos-list-header">
                        <div>
                            <h2>{projetos.mostrarInativos ? "Projetos inativos" : "Projetos ativos"}</h2>
                            <p>{projetos.projetos.length} resultado(s)</p>
                        </div>
                        {projetos.carregando && <span className="projetos-loading" role="status">Carregando…</span>}
                    </div>

                    {projetos.carregando ? (
                        <div className="projetos-empty"><span className="projetos-loading-mark" aria-hidden="true" />Carregando projetos...</div>
                    ) : projetos.projetos.length === 0 ? (
                        <div className="projetos-empty">
                            <strong>{projetos.mostrarInativos ? "Nenhum projeto inativo encontrado" : "Nenhum projeto encontrado"}</strong>
                            <p>{projetos.busca || projetos.filtroStatus !== "todos" ? "Altere a pesquisa ou os filtros para ver outros resultados." : projetos.mostrarInativos ? "Não há registros inativos para consultar." : projetos.podeGerenciar ? "Cadastre um projeto para começar a acompanhar as ordens de serviço." : "Ainda não há projetos ativos disponíveis."}</p>
                        </div>
                    ) : (
                        <div className="projetos-grid">
                            {projetos.projetos.map((projeto) => (
                                <ProjetoCard
                                    key={projeto.id}
                                    projeto={projeto}
                                    podeGerenciar={projetos.podeGerenciar}
                                    bloqueado={projetos.salvando || projetos.alterandoAtivoId !== null}
                                    onAbrir={(selecionado) => void projetos.abrirDetalhes(selecionado)}
                                    onEditar={projetos.iniciarEdicao}
                                    onAlterarAtivo={projetos.solicitarAlteracaoAtivo}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <ProjetoFormModal
                aberto={projetos.formularioAberto}
                projeto={projetos.projetoEmEdicao}
                clientes={projetos.clientes}
                departamentos={projetos.departamentos}
                salvando={projetos.salvando}
                erro={projetos.erro}
                carregandoOpcoes={projetos.carregandoOpcoes}
                onClose={projetos.fecharFormulario}
                onSave={projetos.salvarProjeto}
            />
            <ProjetoDetalhesModal
                projeto={projetos.projetoSelecionado}
                podeGerenciar={projetos.podeGerenciar}
                onClose={() => projetos.setProjetoSelecionado(null)}
                onEditar={projetos.iniciarEdicao}
                onAlterarAtivo={projetos.solicitarAlteracaoAtivo}
            />
            <ProjetoAtivoModal
                projeto={projetos.confirmacaoAtivo?.projeto ?? null}
                acao={projetos.confirmacaoAtivo?.acao ?? null}
                processando={projetos.alterandoAtivoId !== null}
                erro={projetos.confirmacaoAtivo ? projetos.erro : null}
                onClose={projetos.fecharConfirmacaoAtivo}
                onConfirmar={() => void projetos.confirmarAlteracaoAtivo()}
            />
        </div>
    );
}

export default Projetos;
