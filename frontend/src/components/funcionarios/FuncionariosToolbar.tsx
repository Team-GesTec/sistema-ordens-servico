import Autocomplete, { type AutocompleteOption } from "../common/Autocomplete";
import type { Departamento, Funcionario, PerfilFuncionario } from "../../types/api";

export type SituacaoFuncionario = "ativos" | "inativos" | "todos";

interface FuncionariosToolbarProps {
    funcionarios: Funcionario[];
    departamentos: Departamento[];
    selecionadoId: number | null;
    onSelecionadoChange: (id: number | null) => void;
    onBuscaChange: (busca: string) => void;
    situacao: SituacaoFuncionario;
    onSituacaoChange: (situacao: SituacaoFuncionario) => void;
    perfil: PerfilFuncionario | "todos";
    onPerfilChange: (perfil: PerfilFuncionario | "todos") => void;
    podeGerenciar: boolean;
    carregando: boolean;
}

const PERFIL_OPTIONS: { value: PerfilFuncionario | "todos"; label: string }[] = [
    { value: "todos", label: "Todos os perfis" },
    { value: "gestor", label: "Gestor/Admin" },
    { value: "analista", label: "Analista/Líder" },
    { value: "tecnico", label: "Técnico" },
];

export default function FuncionariosToolbar({
    funcionarios,
    departamentos,
    selecionadoId,
    onSelecionadoChange,
    onBuscaChange,
    situacao,
    onSituacaoChange,
    perfil,
    onPerfilChange,
    podeGerenciar,
    carregando,
}: FuncionariosToolbarProps) {
    const options: AutocompleteOption[] = funcionarios.map((funcionario) => {
        const departamento = departamentos.find((item) => item.id === funcionario.departamento_id);
        return {
            value: funcionario.id,
            label: funcionario.nome || `Funcionário #${funcionario.id}`,
            description: `${funcionario.usuario} · ${departamento?.nome ?? `Departamento #${funcionario.departamento_id}`} · ${funcionario.ativo ? "Ativo" : "Inativo"}`,
        };
    });

    return (
        <section className="projetos-toolbar funcionarios-toolbar" aria-label="Pesquisar e filtrar funcionários">
            <div className="projetos-filter-wrap funcionarios-search-wrap">
                <label htmlFor="funcionarios-busca">Pesquisar funcionário</label>
                <Autocomplete
                    id="funcionarios-busca"
                    options={options}
                    value={selecionadoId}
                    onChange={(value) => onSelecionadoChange(value === null ? null : Number(value))}
                    onSearchChange={onBuscaChange}
                    placeholder="Buscar por nome, usuário ou departamento"
                    clearable
                    loading={carregando}
                    loadingMessage="Carregando funcionários..."
                    emptyMessage="Nenhum funcionário corresponde à pesquisa."
                />
            </div>

            <div className="projetos-filter-wrap">
                <label htmlFor="funcionarios-situacao">Situação</label>
                <select
                    id="funcionarios-situacao"
                    value={situacao}
                    onChange={(event) => onSituacaoChange(event.target.value as SituacaoFuncionario)}
                >
                    <option value="ativos">Ativos</option>
                    <option value="inativos">Inativos</option>
                    {podeGerenciar && <option value="todos">Todos</option>}
                </select>
            </div>

            <div className="projetos-filter-wrap funcionarios-perfil-wrap">
                <label htmlFor="funcionarios-perfil">Perfil</label>
                <select
                    id="funcionarios-perfil"
                    value={perfil}
                    onChange={(event) => onPerfilChange(event.target.value as PerfilFuncionario | "todos")}
                >
                    {PERFIL_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
            </div>
        </section>
    );
}
