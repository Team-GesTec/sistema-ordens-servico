import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

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
    onSearchChange?: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    clearable?: boolean;
    emptyMessage?: string;
    loading?: boolean;
    loadingMessage?: string;
}

interface DropdownPosition {
    left: number;
    width: number;
    top?: number | "auto";
    bottom?: number;
    maxHeight: number;
    darkMode: boolean;
}

function normalizar(valor: string): string {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function proximoIndiceHabilitado(
    atual: number,
    direcao: 1 | -1,
    options: AutocompleteOption[],
): number {
    if (options.length === 0) return -1;

    const base = atual < 0 ? (direcao === 1 ? -1 : 0) : atual;
    for (let passo = 1; passo <= options.length; passo += 1) {
        const indice = (base + direcao * passo + options.length) % options.length;
        if (!options[indice].disabled) return indice;
    }

    return -1;
}

export default function Autocomplete({
    id,
    options,
    value,
    onChange,
    onSearchChange,
    placeholder,
    disabled = false,
    clearable = false,
    emptyMessage = "Nenhum resultado encontrado.",
    loading = false,
    loadingMessage = "Carregando opções...",
}: AutocompleteProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const controlRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);
    const [busca, setBusca] = useState("");
    const [aberto, setAberto] = useState(false);
    const [indiceAtivo, setIndiceAtivo] = useState(-1);
    const [posicao, setPosicao] = useState<DropdownPosition | null>(null);

    const selecionado = options.find((option) => option.value === value);

    useEffect(() => {
        if (selecionado) setBusca(selecionado.label);
    }, [selecionado?.value, selecionado?.label]);

    useEffect(() => {
        function handleOutsidePointer(event: PointerEvent) {
            const alvo = event.target as Node;
            const dentroDoControle = Boolean(wrapperRef.current?.contains(alvo));
            const dentroDasOpcoes = Boolean(optionsRef.current?.contains(alvo));

            if (!dentroDoControle && !dentroDasOpcoes) {
                setAberto(false);
                setIndiceAtivo(-1);
                if (selecionado) setBusca(selecionado.label);
            }
        }

        document.addEventListener("pointerdown", handleOutsidePointer);
        return () => document.removeEventListener("pointerdown", handleOutsidePointer);
    }, [selecionado?.value, selecionado?.label]);

    const filtradas = useMemo(() => {
        const termo = normalizar(busca);
        if (!termo) return options;

        return options.filter((option) =>
            normalizar(`${option.label} ${option.description ?? ""}`).includes(termo),
        );
    }, [options, busca]);

    useEffect(() => {
        if (!aberto || disabled) {
            setPosicao(null);
            return;
        }

        function atualizarPosicao() {
            const controle = controlRef.current;
            if (!controle) return;

            const retangulo = controle.getBoundingClientRect();
            const espacoAbaixo = window.innerHeight - retangulo.bottom - 10;
            const espacoAcima = retangulo.top - 10;
            const acima = espacoAbaixo < 160 && espacoAcima > espacoAbaixo;
            const espacoDisponivel = Math.max(80, acima ? espacoAcima : espacoAbaixo);

            setPosicao({
                left: retangulo.left,
                width: retangulo.width,
                ...(acima
                    ? { top: "auto", bottom: window.innerHeight - retangulo.top + 5 }
                    : { top: retangulo.bottom + 5 }),
                maxHeight: Math.min(240, espacoDisponivel),
                darkMode: Boolean(wrapperRef.current?.closest(".dark-mode")),
            });
        }

        atualizarPosicao();
        window.addEventListener("resize", atualizarPosicao);
        window.addEventListener("scroll", atualizarPosicao, true);
        return () => {
            window.removeEventListener("resize", atualizarPosicao);
            window.removeEventListener("scroll", atualizarPosicao, true);
        };
    }, [aberto, disabled, filtradas.length]);

    useEffect(() => {
        if (!aberto) setIndiceAtivo(-1);
    }, [aberto]);

    function selecionar(option: AutocompleteOption) {
        if (option.disabled) return;
        setBusca(option.label);
        setAberto(false);
        setIndiceAtivo(-1);
        onChange(option.value);
    }

    function limpar() {
        setBusca("");
        setAberto(false);
        setIndiceAtivo(-1);
        onChange(null);
        onSearchChange?.("");
    }

    function abrirOpcoes() {
        // Ao reabrir um valor selecionado, mostrar as opções disponíveis em vez de
        // filtrar a lista pela própria etiqueta selecionada. O ID continua preservado.
        if (selecionado && busca === selecionado.label) setBusca("");
        setAberto(true);
    }

    function tratarTecla(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direcao = event.key === "ArrowDown" ? 1 : -1;
            if (!aberto) {
                const reabrindoSelecao = Boolean(selecionado && busca === selecionado.label);
                if (reabrindoSelecao) setBusca("");
                setAberto(true);
                const opcoesAoAbrir = reabrindoSelecao ? options : filtradas;
                setIndiceAtivo(proximoIndiceHabilitado(-1, direcao, opcoesAoAbrir));
            } else {
                setIndiceAtivo((atual) => proximoIndiceHabilitado(atual, direcao, filtradas));
            }
            return;
        }

        if (event.key === "Enter" && aberto) {
            const opcao = filtradas[indiceAtivo];
            if (opcao && !opcao.disabled) selecionar(opcao);
            event.preventDefault();
            return;
        }

        if (event.key === "Escape" && aberto) {
            event.preventDefault();
            setAberto(false);
            setIndiceAtivo(-1);
            setBusca(selecionado?.label ?? "");
        }
    }

    const opcaoAtiva = indiceAtivo >= 0 ? filtradas[indiceAtivo] : undefined;
    const estiloOpcoes: CSSProperties | undefined = posicao
        ? {
              position: "fixed",
              left: posicao.left,
              right: "auto",
              width: posicao.width,
              ...(posicao.top !== undefined ? { top: posicao.top } : {}),
              ...(posicao.bottom !== undefined ? { bottom: posicao.bottom } : {}),
              maxHeight: posicao.maxHeight,
          }
        : undefined;

    return (
        <div className="autocomplete" ref={wrapperRef}>
            <div className="autocomplete-control" ref={controlRef}>
                <input
                    id={id}
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={aberto}
                    aria-controls={`${id}-options`}
                    aria-activedescendant={
                        aberto && opcaoAtiva
                            ? `${id}-option-${opcaoAtiva.value}`
                            : undefined
                    }
                    autoComplete="off"
                    value={busca}
                    placeholder={placeholder}
                    disabled={disabled}
                    onFocus={abrirOpcoes}
                    onClick={() => {
                        if (!aberto) abrirOpcoes();
                    }}
                    onBlur={() => {
                        setAberto(false);
                        if (selecionado) setBusca(selecionado.label);
                    }}
                    onChange={(event) => {
                        // A consulta digitada não apaga a relação atual até que o usuário escolha
                        // outra opção ou limpe explicitamente a seleção.
                        setBusca(event.target.value);
                        setIndiceAtivo(-1);
                        setAberto(true);
                        onSearchChange?.(event.target.value);
                    }}
                    onKeyDown={tratarTecla}
                />

                {clearable && value !== null && !disabled && (
                    <button
                        type="button"
                        className="autocomplete-clear"
                        aria-label="Limpar seleção"
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={limpar}
                    >
                        ×
                    </button>
                )}
            </div>

            {aberto && !disabled && posicao && createPortal(
                <div
                    ref={optionsRef}
                    className={`autocomplete-options${posicao.darkMode ? " autocomplete-options--dark" : ""}`}
                    id={`${id}-options`}
                    role="listbox"
                    style={estiloOpcoes}
                >
                    {loading ? (
                        <div className="autocomplete-empty" role="status">{loadingMessage}</div>
                    ) : filtradas.length === 0 ? (
                        <div className="autocomplete-empty">{emptyMessage}</div>
                    ) : (
                        filtradas.map((option, index) => (
                            <div
                                key={`${typeof option.value}-${option.value}`}
                                id={`${id}-option-${option.value}`}
                                role="option"
                                aria-selected={option.value === value}
                                aria-disabled={Boolean(option.disabled)}
                                className={`autocomplete-option${option.value === value ? " selected" : ""}${index === indiceAtivo ? " active" : ""}`}
                                onPointerDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setIndiceAtivo(index)}
                                onClick={() => selecionar(option)}
                            >
                                <span className="autocomplete-option-label">{option.label}</span>
                                {option.description && (
                                    <span className="autocomplete-option-description">{option.description}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>,
                document.body,
            )}
        </div>
    );
}
