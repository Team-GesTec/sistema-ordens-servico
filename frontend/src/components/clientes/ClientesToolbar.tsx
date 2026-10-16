
import { useMemo, useState } from "react";
import type { Cliente } from "../../types/api";
import {
    correspondeBusca,
    type FiltroSituacao,
} from "../../utils/clienteUtils";

interface ClientesToolbarProps {
    busca: string;
    onBuscaChange: (valor: string) => void;
    filtroSituacao: FiltroSituacao;
    onFiltroChange: (valor: FiltroSituacao) => void;
    clientes: Cliente[];
    podeGerenciar: boolean;
    onCadastrar: () => void;
}

function ClientesToolbar({
    busca,
    onBuscaChange,
    filtroSituacao,
    onFiltroChange,
    clientes,
    podeGerenciar,
    onCadastrar,
}: ClientesToolbarProps) {
    const [sugestoesAbertas, setSugestoesAbertas] = useState(false);

    const termoBusca = busca.trim();

    const sugestoes = useMemo(() => {
        if (!termoBusca) {
            return [];
        }

        return clientes
            .filter((cliente) => correspondeBusca(cliente, termoBusca))
            .slice(0, 6);
    }, [clientes, termoBusca]);

    return (
        <div className="clientes-toolbar">
            <div className="clientes-search-wrapper">
                <input
                    className="clientes-search"
                    type="search"
                    placeholder="Pesquisar cliente..."
                    aria-label="Pesquisar cliente"
                    aria-autocomplete="list"
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
                />

                {sugestoesAbertas &&
                    termoBusca &&
                    sugestoes.length > 0 && (
                        <div
                            className="clientes-sugestoes"
                            role="listbox"
                        >
                            {sugestoes.map((cliente) => (
                                <button
                                    key={cliente.id}
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    className="clientes-sugestao"
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onClick={() => {
                                        onBuscaChange(cliente.nome);
                                        setSugestoesAbertas(false);
                                    }}
                                >
                                    <span className="clientes-sugestao-nome">
                                        {cliente.nome}
                                    </span>

                                    <span className="clientes-sugestao-detalhe">
                                        {cliente.razao_social}
                                        {" · "}
                                        {cliente.ativo ? "Ativo" : "Inativo"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
            </div>

            <label className="clientes-filtro">
                <span>Situação</span>

                <select
                    value={filtroSituacao}
                    onChange={(event) =>
                        onFiltroChange(
                            event.target.value as FiltroSituacao
                        )
                    }
                >
                    <option value="ativos">Ativos</option>
                    <option value="inativos">Inativos</option>
                    <option value="todos">Todos</option>
                </select>
            </label>

            {podeGerenciar && (
                <button
                    type="button"
                    className="clientes-btn-primary"
                    onClick={onCadastrar}
                >
                    + Cadastrar Cliente
                </button>
            )}
        </div>
    );
}

export default ClientesToolbar;
