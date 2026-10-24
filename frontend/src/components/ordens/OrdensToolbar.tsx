import { useMemo, useState, type ReactNode } from "react";
import Autocomplete, { type AutocompleteOption } from "../common/Autocomplete";
import type { Funcionario, OrdemServico } from "../../types/api";
import {
    correspondeBuscaOrdem,
    STATUS_LABELS,
    type FiltroResponsavelOrdem,
    type FiltroStatusOrdem,
} from "../../utils/ordemServicoUtils";

interface OrdensToolbarProps {
    busca: string;
    onBuscaChange: (valor: string) => void;
    filtroStatus: FiltroStatusOrdem;
    onFiltroStatusChange: (valor: FiltroStatusOrdem) => void;
    ordens: OrdemServico[];
    funcionarios?: Funcionario[];
    filtroResponsavelId?: FiltroResponsavelOrdem;
    onFiltroResponsavelChange?: (valor: FiltroResponsavelOrdem) => void;
    onLimparFiltros?: () => void;
    temFiltrosAplicados?: boolean;
    visualizacoesSalvas?: ReactNode;
    podeGerenciar?: boolean;
    mostrarInativas: boolean;
    carregandoInativas: boolean;
    onAlternarInativas: () => void;
}

function OrdensToolbar({
    busca,
    onBuscaChange,
    filtroStatus,
    onFiltroStatusChange,
    ordens,
    funcionarios = [],
    filtroResponsavelId = "todos",
    onFiltroResponsavelChange,
    onLimparFiltros,
    temFiltrosAplicados = false,
    visualizacoesSalvas,
    podeGerenciar = true,
    mostrarInativas,
    carregandoInativas,
    onAlternarInativas,
}: OrdensToolbarProps) {
    const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
    const termoBusca = busca.trim();

    const textoResponsavel = (ordem: OrdemServico): string => {
        const responsavel = funcionarios.find(
            (item) => item.id === ordem.responsavel_id,
        );
        return responsavel ? `${responsavel.nome} ${responsavel.usuario}` : "";
    };

    const sugestoes = useMemo(() => {
        if (!termoBusca || /^#\d+$/.test(termoBusca)) return [];
        return ordens
            .filter((ordem) =>
                correspondeBuscaOrdem(ordem, termoBusca, textoResponsavel(ordem)),
            )
            .slice(0, 6);
    // A lista depende também do conjunto de funcionários usados na pesquisa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ordens, funcionarios, termoBusca]);

    const filtros: { value: FiltroStatusOrdem; label: string }[] = [
        { value: "todos", label: "Todas" },
        ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
            value: value as FiltroStatusOrdem,
            label,
        })),
    ];

    function correspondeResponsavel(ordem: OrdemServico): boolean {
        if (filtroResponsavelId === "todos") return true;
        if (filtroResponsavelId === "sem_responsavel") {
            return ordem.responsavel_id === null;
        }
        return ordem.responsavel_id === filtroResponsavelId;
    }

    function correspondeBuscaEResponsavel(ordem: OrdemServico): boolean {
        return (
            correspondeResponsavel(ordem) &&
            correspondeBuscaOrdem(ordem, busca, textoResponsavel(ordem))
        );
    }

    function contar(status: FiltroStatusOrdem): number {
        return ordens.filter((ordem) => {
            const statusCorresponde = status === "todos" || ordem.status === status;
            return statusCorresponde && correspondeBuscaEResponsavel(ordem);
        }).length;
    }

    const opcoesResponsavel: AutocompleteOption[] = [
        { value: "todos", label: "Todos os responsáveis" },
        { value: "sem_responsavel", label: "Sem responsável" },
        ...funcionarios.map((funcionario) => ({
            value: funcionario.id,
            label: `${funcionario.nome || `Funcionário #${funcionario.id}`}${funcionario.ativo ? "" : " (inativo)"}`,
            description: `${funcionario.usuario} · ${funcionario.ativo ? "Ativo" : "Inativo"}`,
        })),
    ];

    function alterarFiltroResponsavel(valor: number | string | null) {
        if (!onFiltroResponsavelChange) return;
        if (valor === "sem_responsavel") {
            onFiltroResponsavelChange("sem_responsavel");
        } else if (
            typeof valor === "number" &&
            Number.isSafeInteger(valor) &&
            valor > 0
        ) {
            onFiltroResponsavelChange(valor);
        } else {
            onFiltroResponsavelChange("todos");
        }
    }

    return (
        <section
            className="projetos-toolbar ordens-toolbar-modern"
            aria-label="Busca e filtros de ordens de serviço"
        >
            <div className="ordens-toolbar-top">
                <div className="ordens-search-wrapper projetos-search-wrap ordens-search-field">
                    <label htmlFor="ordens-busca">Pesquisar ordens de serviço</label>
                    <input
                        id="ordens-busca"
                        className="projetos-search ordens-search"
                        type="search"
                        placeholder="Pesquisar por título, descrição ou número..."
                        autoComplete="off"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls="ordens-sugestoes"
                        aria-expanded={sugestoesAbertas && sugestoes.length > 0}
                        value={busca}
                        onFocus={() => setSugestoesAbertas(true)}
                        onBlur={() => setSugestoesAbertas(false)}
                        onChange={(event) => {
                            onBuscaChange(event.target.value);
                            setSugestoesAbertas(true);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") setSugestoesAbertas(false);
                        }}
                    />

                    {sugestoesAbertas && termoBusca && sugestoes.length > 0 && (
                        <div
                            id="ordens-sugestoes"
                            className="ordens-sugestoes"
                            role="listbox"
                            aria-label="Sugestões de ordens de serviço"
                        >
                            {sugestoes.map((ordem) => (
                                <button
                                    key={ordem.id}
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    className="ordens-sugestao"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                        onBuscaChange(`#${ordem.id}`);
                                        setSugestoesAbertas(false);
                                    }}
                                >
                                    <span className="ordens-sugestao-header">
                                        <strong>OS #{ordem.id}</strong>
                                        <span>{STATUS_LABELS[ordem.status]}</span>
                                    </span>
                                    <span className="ordens-sugestao-titulo">{ordem.titulo}</span>
                                    <span className="ordens-sugestao-descricao">{ordem.descricao}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {podeGerenciar && (
                    <button
                        type="button"
                        className="projeto-btn-secondary ordens-inativos-toggle"
                        onClick={onAlternarInativas}
                        disabled={carregandoInativas}
                        aria-pressed={mostrarInativas}
                    >
                        {carregandoInativas
                            ? "Carregando..."
                            : mostrarInativas
                              ? "Ver OS ativas"
                              : "Ver OS inativas"}
                    </button>
                )}
            </div>

            <div className="ordens-toolbar-filters">
                <div
                    className="ordens-status-filters"
                    role="group"
                    aria-label="Filtrar ordens por status"
                >
                    {filtros.map((filtro) => (
                        <button
                            key={filtro.value}
                            type="button"
                            className={filtroStatus === filtro.value ? "ordens-status-filter active" : "ordens-status-filter"}
                            aria-pressed={filtroStatus === filtro.value}
                            onClick={() => onFiltroStatusChange(filtro.value)}
                        >
                            {filtro.label}
                            <span className="ordens-status-count">{contar(filtro.value)}</span>
                        </button>
                    ))}
                </div>

                {onFiltroResponsavelChange && (
                    <div className="ordens-responsavel-filter">
                        <label htmlFor="ordens-responsavel-filter">Responsável</label>
                        <Autocomplete
                            id="ordens-responsavel-filter"
                            options={opcoesResponsavel}
                            value={filtroResponsavelId}
                            onChange={alterarFiltroResponsavel}
                            placeholder="Todos os responsáveis"
                            emptyMessage="Nenhum funcionário encontrado."
                        />
                    </div>
                )}

                {temFiltrosAplicados && onLimparFiltros && (
                    <button
                        type="button"
                        className="projeto-btn-secondary ordens-clear-filters"
                        onClick={onLimparFiltros}
                    >
                        Limpar filtros
                    </button>
                )}
                {visualizacoesSalvas}
            </div>
        </section>
    );
}

export default OrdensToolbar;