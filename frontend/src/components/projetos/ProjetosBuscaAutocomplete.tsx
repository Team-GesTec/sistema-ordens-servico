import { useMemo, useState, type KeyboardEvent } from "react";
import type { Projeto } from "../../types/api";
import type { StatusProjeto } from "../../types/api";

interface ProjetosBuscaAutocompleteProps {
    projetos: Projeto[];
    value: string;
    onChange: (value: string) => void;
}

const STATUS_LABELS: Record<StatusProjeto, string> = {
    em_planejamento: "Em planejamento",
    em_andamento: "Em andamento",
    pausado: "Pausado",
    concluido: "Concluído",
};

function ProjetosBuscaAutocomplete({ projetos, value, onChange }: ProjetosBuscaAutocompleteProps) {
    const [aberto, setAberto] = useState(false);
    const [indiceAtivo, setIndiceAtivo] = useState(-1);

    const sugestoes = useMemo(() => {
        const termo = value.trim();
        if (!termo || /^#\d+$/.test(termo)) return [];
        return projetos.slice(0, 6);
    }, [projetos, value]);

    function selecionar(projeto: Projeto) {
        onChange(`#${projeto.id}`);
        setAberto(false);
        setIndiceAtivo(-1);
    }

    function tratarTecla(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Escape") {
            setAberto(false);
            setIndiceAtivo(-1);
            return;
        }

        if (event.key === "ArrowDown" && sugestoes.length > 0) {
            event.preventDefault();
            setAberto(true);
            setIndiceAtivo((atual) => (atual + 1) % sugestoes.length);
            return;
        }

        if (event.key === "ArrowUp" && sugestoes.length > 0) {
            event.preventDefault();
            setAberto(true);
            setIndiceAtivo((atual) => (atual <= 0 ? sugestoes.length - 1 : atual - 1));
            return;
        }

        if (event.key === "Enter" && aberto && indiceAtivo >= 0 && sugestoes[indiceAtivo]) {
            event.preventDefault();
            selecionar(sugestoes[indiceAtivo]);
        }
    }

    return (
        <div className="projetos-search-autocomplete">
            <label className="projetos-search-wrap" htmlFor="projetos-busca">
                <span aria-hidden="true">⌕</span>
                <input
                    id="projetos-busca"
                    className="projetos-search"
                    value={value}
                    onChange={(event) => {
                        onChange(event.target.value);
                        setAberto(true);
                        setIndiceAtivo(-1);
                    }}
                    onFocus={() => setAberto(true)}
                    onBlur={() => {
                        setAberto(false);
                        setIndiceAtivo(-1);
                    }}
                    onKeyDown={tratarTecla}
                    placeholder="Pesquisar por projeto, cliente ou código"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={aberto && sugestoes.length > 0}
                    aria-controls="projetos-busca-sugestoes"
                    aria-activedescendant={
                        aberto && indiceAtivo >= 0 && sugestoes[indiceAtivo]
                            ? `projetos-busca-opcao-${sugestoes[indiceAtivo].id}`
                            : undefined
                    }
                />
            </label>

            {aberto && sugestoes.length > 0 && (
                <div
                    id="projetos-busca-sugestoes"
                    className="projetos-search-suggestions"
                    role="listbox"
                    aria-label="Sugestões de projetos"
                >
                    {sugestoes.map((projeto, index) => (
                        <button
                            key={projeto.id}
                            id={`projetos-busca-opcao-${projeto.id}`}
                            type="button"
                            role="option"
                            aria-selected={index === indiceAtivo}
                            className={`projetos-search-suggestion${index === indiceAtivo ? " active" : ""}`}
                            onPointerDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setIndiceAtivo(index)}
                            onClick={() => selecionar(projeto)}
                        >
                            <span className="projetos-search-suggestion-header">
                                <strong>Projeto #{projeto.id}</strong>
                                <span>{STATUS_LABELS[projeto.status]}</span>
                            </span>
                            <span className="projetos-search-suggestion-title">{projeto.nome}</span>
                            <span className="projetos-search-suggestion-description">
                                Cliente: {projeto.cliente?.nome ?? `#${projeto.cliente_id}`}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProjetosBuscaAutocomplete;
