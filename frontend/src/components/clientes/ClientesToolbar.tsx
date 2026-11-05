import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { Cliente } from "../../types/api";
import { correspondeBusca, type FiltroSituacao } from "../../utils/clienteUtils";

interface ClientesToolbarProps {
    busca: string;
    onBuscaChange: (valor: string) => void;
    filtroSituacao: FiltroSituacao;
    onFiltroChange: (valor: FiltroSituacao) => void;
    clientes: Cliente[];
}

interface SugestoesPosition {
    left: number;
    width: number;
    top?: number | "auto";
    bottom?: number;
    maxHeight: number;
    darkMode: boolean;
}

function ClientesToolbar({ busca, onBuscaChange, filtroSituacao, onFiltroChange, clientes }: ClientesToolbarProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
    const [indiceAtivo, setIndiceAtivo] = useState(-1);
    const [posicao, setPosicao] = useState<SugestoesPosition | null>(null);
    const termoBusca = busca.trim();

    const sugestoes = useMemo(() => {
        if (!termoBusca) return [];
        return clientes.filter((cliente) => correspondeBusca(cliente, termoBusca)).slice(0, 6);
    }, [clientes, termoBusca]);

    const menuVisivel = sugestoesAbertas && Boolean(termoBusca) && sugestoes.length > 0;

    useEffect(() => {
        if (!menuVisivel) {
            setPosicao(null);
            return;
        }

        function atualizarPosicao() {
            const controle = inputRef.current;
            if (!controle) return;

            const retangulo = controle.getBoundingClientRect();
            const espacoAbaixo = window.innerHeight - retangulo.bottom - 10;
            const espacoAcima = retangulo.top - 10;
            const acima = espacoAbaixo < 180 && espacoAcima > espacoAbaixo;
            const largura = Math.min(retangulo.width, window.innerWidth - 16);
            const esquerda = Math.max(8, Math.min(retangulo.left, window.innerWidth - largura - 8));
            const espacoDisponivel = Math.max(80, acima ? espacoAcima : espacoAbaixo);

            setPosicao({
                left: esquerda,
                width: largura,
                ...(acima
                    ? { top: "auto", bottom: window.innerHeight - retangulo.top + 5 }
                    : { top: retangulo.bottom + 5 }),
                maxHeight: Math.min(260, espacoDisponivel),
                darkMode: Boolean(controle.closest(".dark-mode")),
            });
        }

        atualizarPosicao();
        window.addEventListener("resize", atualizarPosicao);
        window.addEventListener("scroll", atualizarPosicao, true);
        return () => {
            window.removeEventListener("resize", atualizarPosicao);
            window.removeEventListener("scroll", atualizarPosicao, true);
        };
    }, [menuVisivel, sugestoes.length]);

    useEffect(() => {
        if (!menuVisivel) setIndiceAtivo(-1);
    }, [menuVisivel]);

    function selecionarCliente(cliente: Cliente) {
        onBuscaChange(cliente.nome || cliente.razao_social || String(cliente.id));
        setSugestoesAbertas(false);
        setIndiceAtivo(-1);
    }

    function tratarTecla(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Escape") {
            setSugestoesAbertas(false);
            setIndiceAtivo(-1);
            return;
        }

        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && sugestoes.length > 0) {
            event.preventDefault();
            setSugestoesAbertas(true);
            const direcao = event.key === "ArrowDown" ? 1 : -1;
            setIndiceAtivo((atual) => {
                if (atual < 0) return direcao === 1 ? 0 : sugestoes.length - 1;
                return (atual + direcao + sugestoes.length) % sugestoes.length;
            });
            return;
        }

        if (event.key === "Enter" && menuVisivel && indiceAtivo >= 0) {
            const cliente = sugestoes[indiceAtivo];
            if (cliente) {
                event.preventDefault();
                selecionarCliente(cliente);
            }
        }
    }

    const estiloSugestoes: CSSProperties | undefined = posicao
        ? {
              position: "fixed",
              left: posicao.left,
              right: "auto",
              width: posicao.width,
              ...(posicao.top !== undefined ? { top: posicao.top } : {}),
              ...(posicao.bottom !== undefined ? { bottom: posicao.bottom } : {}),
              maxHeight: posicao.maxHeight,
              zIndex: 2000,
          }
        : undefined;

    return (
        <section className="projetos-toolbar clientes-toolbar-modern" aria-label="Pesquisar e filtrar clientes">
            <div className="projetos-search-wrap clientes-search-wrapper">
                <span aria-hidden="true">⌕</span>
                <input
                    ref={inputRef}
                    id="clientes-busca"
                    className="projetos-search clientes-search"
                    type="search"
                    placeholder="Pesquisar por nome, razão social ou código"
                    aria-label="Pesquisar cliente"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="clientes-sugestoes"
                    aria-activedescendant={menuVisivel && indiceAtivo >= 0 ? `clientes-sugestao-${sugestoes[indiceAtivo]?.id}` : undefined}
                    aria-expanded={menuVisivel}
                    value={busca}
                    onFocus={() => setSugestoesAbertas(true)}
                    onBlur={() => setSugestoesAbertas(false)}
                    onChange={(event) => {
                        onBuscaChange(event.target.value);
                        setIndiceAtivo(-1);
                        setSugestoesAbertas(true);
                    }}
                    onKeyDown={tratarTecla}
                />
            </div>

            {menuVisivel && posicao && createPortal(
                <div
                    id="clientes-sugestoes"
                    className={`clientes-sugestoes${posicao.darkMode ? " clientes-sugestoes--dark" : ""}`}
                    role="listbox"
                    aria-label="Sugestões de clientes"
                    style={estiloSugestoes}
                >
                    {sugestoes.map((cliente, index) => (
                        <button
                            key={cliente.id}
                            id={`clientes-sugestao-${cliente.id}`}
                            type="button"
                            role="option"
                            tabIndex={-1}
                            aria-selected={index === indiceAtivo}
                            className={`clientes-sugestao${index === indiceAtivo ? " active" : ""}`}
                            onPointerDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setIndiceAtivo(index)}
                            onClick={() => selecionarCliente(cliente)}
                        >
                            <span className="clientes-sugestao-nome">{cliente.nome || `Cliente #${cliente.id}`}</span>
                            <span className="clientes-sugestao-detalhe">
                                {cliente.razao_social || "Razão social não informada"}
                                {" · "}
                                {cliente.ativo ? "Ativo" : "Inativo"}
                            </span>
                        </button>
                    ))}
                </div>,
                document.body,
            )}

            <label className="projetos-filter-wrap clientes-filtro" htmlFor="clientes-filtro-situacao">
                <span>Situação</span>
                <select id="clientes-filtro-situacao" value={filtroSituacao} onChange={(event) => onFiltroChange(event.target.value as FiltroSituacao)}>
                    <option value="ativos">Ativos</option>
                    <option value="inativos">Inativos</option>
                    <option value="todos">Todos</option>
                </select>
            </label>
        </section>
    );
}

export default ClientesToolbar;
