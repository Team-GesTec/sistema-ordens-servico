import { useEffect, useMemo, useRef, useState } from "react";

export interface AutocompleteOption {
    value: number | string;
    label: string;
    description?: string;
    disabled?: boolean;
}

interface AutocompleteProps {
    id: string;
    options: AutocompleteOption[];
    value: number | string | null;
    onChange: (value: number | string | null) => void;
    placeholder: string;
    disabled?: boolean;
    clearable?: boolean;
    emptyMessage?: string;
}

function normalizar(valor: string): string {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export default function Autocomplete({
    id,
    options,
    value,
    onChange,
    placeholder,
    disabled = false,
    clearable = false,
    emptyMessage = "Nenhum resultado encontrado.",
}: AutocompleteProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [busca, setBusca] = useState("");
    const [aberto, setAberto] = useState(false);

    const selecionado = options.find((option) => option.value === value);

    useEffect(() => {
        if (selecionado) {
            setBusca(selecionado.label);
        }
    }, [selecionado?.value, selecionado?.label]);

    useEffect(() => {
        function handleOutsideClick(event: PointerEvent) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setAberto(false);

                if (selecionado) {
                    setBusca(selecionado.label);
                }
            }
        }

        document.addEventListener("pointerdown", handleOutsideClick);

        return () => {
            document.removeEventListener("pointerdown", handleOutsideClick);
        };
    }, [selecionado?.value, selecionado?.label]);

    const filtradas = useMemo(() => {
        const termo = normalizar(busca);

        if (!termo) {
            return options;
        }

        return options.filter((option) =>
            normalizar(
                `${option.label} ${option.description ?? ""}`,
            ).includes(termo),
        );
    }, [options, busca]);

    function selecionar(option: AutocompleteOption) {
        if (option.disabled) {
            return;
        }

        setBusca(option.label);
        setAberto(false);
        onChange(option.value);
    }

    function limpar() {
        setBusca("");
        setAberto(false);
        onChange(null);
    }

    return (
        <div className="autocomplete" ref={wrapperRef}>
            <div className="autocomplete-control">
                <input
                    id={id}
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={aberto}
                    aria-controls={`${id}-options`}
                    aria-activedescendant={undefined}
                    autoComplete="off"
                    value={busca}
                    placeholder={placeholder}
                    disabled={disabled}
                    onFocus={() => setAberto(true)}
                    onChange={(event) => {
                        setBusca(event.target.value);
                        setAberto(true);

                        // Um texto digitado não conta como seleção válida.
                        onChange(null);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setAberto(false);

                            if (selecionado) {
                                setBusca(selecionado.label);
                            }
                        }
                    }}
                />

                {clearable && value !== null && !disabled && (
                    <button
                        type="button"
                        className="autocomplete-clear"
                        aria-label="Limpar seleção"
                        onClick={limpar}
                    >
                        ×
                    </button>
                )}
            </div>

            {aberto && !disabled && (
                <div
                    className="autocomplete-options"
                    id={`${id}-options`}
                    role="listbox"
                >
                    {filtradas.length === 0 ? (
                        <div className="autocomplete-empty">
                            {emptyMessage}
                        </div>
                    ) : (
                        filtradas.map((option) => (
                            <button
                                key={`${typeof option.value}-${option.value}`}
                                id={`${id}-option-${option.value}`}
                                type="button"
                                role="option"
                                aria-selected={option.value === value}
                                className={`autocomplete-option ${
                                    option.value === value ? "selected" : ""
                                }`}
                                disabled={option.disabled}
                                onMouseDown={(event) =>
                                    event.preventDefault()
                                }
                                onClick={() => selecionar(option)}
                            >
                                <span className="autocomplete-option-label">
                                    {option.label}
                                </span>

                                {option.description && (
                                    <span className="autocomplete-option-description">
                                        {option.description}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}