
import { useMemo, useState } from "react";
import type { OrdemServico } from "../../types/api";
import {
    correspondeBuscaOrdem,
    STATUS_LABELS,
    type FiltroStatusOrdem,
} from "../../utils/ordemServicoUtils";

interface OrdensToolbarProps {
    busca: string;
    onBuscaChange: (valor: string) => void;
    filtroStatus: FiltroStatusOrdem;
    onFiltroStatusChange: (valor: FiltroStatusOrdem) => void;
    ordens: OrdemServico[];
    podeCriar: boolean;
    onCadastrar: () => void;
    podeGerenciar: boolean;
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
    podeCriar,
    podeGerenciar,
    mostrarInativas,
    carregandoInativas,
    onAlternarInativas,
    onCadastrar,
}: OrdensToolbarProps) {
    const [sugestoesAbertas, setSugestoesAbertas] = useState(false);

    const termoBusca = busca.trim();

    const sugestoes = useMemo(() => {
        if (!termoBusca || /^#\d+$/.test(termoBusca)) {
            return [];
        }

        return ordens
            .filter((ordem) =>
                correspondeBuscaOrdem(ordem, termoBusca),
            )
            .slice(0, 6);
    }, [ordens, termoBusca]);

    const filtros: { value: FiltroStatusOrdem; label: string }[] = [
        { value: "todos", label: "Todas" },
        ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
            value: value as keyof typeof STATUS_LABELS,
            label,
        })),
    ];

    function contar(status: FiltroStatusOrdem): number {
        if (status === "todos") return ordens.length;

        return ordens.filter((ordem) => ordem.status === status).length;
    }

    return (
        <section
            className="ordens-toolbar"
            aria-label="Busca e filtros de ordens de serviço"
        >
            <div className="ordens-toolbar-top">
                <div className="ordens-search-wrapper">
                    <label htmlFor="ordens-busca">
                        Pesquisar ordens de serviço
                    </label>

                    <input
                        id="ordens-busca"
                        className="ordens-search"
                        type="search"
                        placeholder="Pesquisar por título, descrição ou número..."
                        autoComplete="off"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls="ordens-sugestoes"
                        aria-expanded={
                            sugestoesAbertas && sugestoes.length > 0
                        }
                        value={busca}
                        onFocus={() => setSugestoesAbertas(true)}
                        onBlur={() => setSugestoesAbertas(false)}
                        onChange={(event) => {
                            onBuscaChange(event.target.value);
                            setSugestoesAbertas(true);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                setSugestoesAbertas(false);
                            }
                        }}
                    />

                    {sugestoesAbertas &&
                        termoBusca &&
                        sugestoes.length > 0 && (
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
                                        onMouseDown={(event) =>
                                            event.preventDefault()
                                        }
                                        onClick={() => {
                                            onBuscaChange(`#${ordem.id}`);
                                            setSugestoesAbertas(false);
                                        }}
                                    >
                                        <span className="ordens-sugestao-header">
                                            <strong>OS #{ordem.id}</strong>
                                            <span>
                                                {STATUS_LABELS[ordem.status]}
                                            </span>
                                        </span>

                                        <span className="ordens-sugestao-titulo">
                                            {ordem.titulo}
                                        </span>

                                        <span className="ordens-sugestao-descricao">
                                            {ordem.descricao}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                </div>

                {podeCriar && (
                    <button
                        type="button"
                        className="ordens-btn-primary"
                        onClick={onCadastrar}
                    >
                        <span aria-hidden="true">+</span>
                        Nova ordem de serviço
                    </button>
                )}
                {podeGerenciar && (
                    <button
                        type="button"
                        className="ordens-btn-secondary"
                        onClick={onAlternarInativas}
                        disabled={carregandoInativas}
                    >
                        {carregandoInativas
                            ? "Carregando..."
                            : mostrarInativas
                            ? "Ver OS ativas"
                            : "Ver OS inativas"}
                    </button>
                )}
            </div>

            <div
                className="ordens-status-filters"
                role="group"
                aria-label="Filtrar ordens por status"
            >
                {filtros.map((filtro) => (
                    <button
                        key={filtro.value}
                        type="button"
                        className={
                            filtroStatus === filtro.value
                                ? "ordens-status-filter active"
                                : "ordens-status-filter"
                        }
                        aria-pressed={filtroStatus === filtro.value}
                        onClick={() => onFiltroStatusChange(filtro.value)}
                    >
                        {filtro.label}
                        <span className="ordens-status-count">
                            {contar(filtro.value)}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}

export default OrdensToolbar;
