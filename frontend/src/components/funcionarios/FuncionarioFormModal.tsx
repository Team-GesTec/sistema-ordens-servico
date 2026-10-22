import { useEffect, useState, type FormEvent } from "react";
import Autocomplete, { type AutocompleteOption } from "../common/Autocomplete";
import type { Departamento, Funcionario, PerfilFuncionario } from "../../types/api";

export interface DadosFormularioFuncionario {
    nome: string;
    usuario: string;
    departamento_id: number | null;
    tipo: PerfilFuncionario;
    senha: string;
}

interface FuncionarioFormModalProps {
    aberto: boolean;
    funcionario: Funcionario | null;
    modoDuplicacao?: boolean;
    departamentos: Departamento[];
    salvando: boolean;
    carregandoOpcoes: boolean;
    erro: string | null;
    onClose: () => void;
    onSave: (dados: DadosFormularioFuncionario) => Promise<void>;
}

const FORM_INICIAL: DadosFormularioFuncionario = {
    nome: "",
    usuario: "",
    departamento_id: null,
    tipo: "tecnico",
    senha: "",
};

export default function FuncionarioFormModal({
    aberto,
    funcionario,
    modoDuplicacao = false,
    departamentos,
    salvando,
    carregandoOpcoes,
    erro,
    onClose,
    onSave,
}: FuncionarioFormModalProps) {
    const [form, setForm] = useState<DadosFormularioFuncionario>(FORM_INICIAL);
    const [erroLocal, setErroLocal] = useState<string | null>(null);

    useEffect(() => {
        if (!aberto) return;
        setForm(funcionario ? modoDuplicacao ? {
            nome: funcionario.nome,
            usuario: "",
            departamento_id: null,
            tipo: "tecnico",
            senha: "",
        } : {
            nome: funcionario.nome,
            usuario: funcionario.usuario,
            departamento_id: funcionario.departamento_id,
            tipo: funcionario.tipo,
            senha: "",
        } : FORM_INICIAL);
        setErroLocal(null);
    }, [aberto, funcionario, modoDuplicacao]);

    if (!aberto) return null;

    const departamentosElegiveis = form.tipo === 'tecnico'
        ? departamentos.filter((departamento) => departamento.responsavel_id !== null)
        : departamentos;
    const departamentoOptions: AutocompleteOption[] = departamentosElegiveis.map((departamento) => ({
        value: departamento.id,
        label: departamento.nome,
        description: form.tipo === 'tecnico' ? 'Possui Analista/Líder designado' : `Departamento #${departamento.id}`,
    }));

    async function enviar(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErroLocal(null);
        if (!form.nome.trim() || !form.usuario.trim() || form.departamento_id === null) {
            setErroLocal("Preencha nome, usuário e departamento.");
            return;
        }
        if ((!funcionario || modoDuplicacao) && form.senha.length < 8) {
            setErroLocal("A senha deve ter pelo menos 8 caracteres.");
            return;
        }
        if (form.senha && form.senha.length < 8) {
            setErroLocal("A nova senha deve ter pelo menos 8 caracteres.");
            return;
        }
        await onSave({ ...form, nome: form.nome.trim(), usuario: form.usuario.trim() });
    }

    return (
        <div className="projeto-modal-overlay funcionario-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="projeto-modal projeto-form-modal funcionario-form-modal" role="dialog" aria-modal="true" aria-labelledby="funcionario-form-title">
                <header className="projeto-modal-header">
                    <div>
                        <span className="projetos-eyebrow">GESTÃO DE ACESSOS</span>
                        <h2 id="funcionario-form-title">{modoDuplicacao ? "Duplicar funcionário — revisar dados" : funcionario ? "Editar funcionário" : "Novo funcionário"}</h2>
                        <p>Dados de acesso, perfil e departamento do colaborador.</p>
                    </div>
                    <button type="button" className="projeto-modal-close" onClick={onClose} disabled={salvando} aria-label="Fechar formulário">×</button>
                </header>
                {(erroLocal || erro) && <div className="projetos-feedback projetos-feedback--error" role="alert">{erroLocal ?? erro}</div>}
                <form onSubmit={(event) => void enviar(event)} autoComplete="off">
                    <div className="projeto-form-grid funcionario-form-grid">
                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="funcionario-nome">Nome completo *</label>
                            <input id="funcionario-nome" value={form.nome} onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))} maxLength={150} required disabled={salvando} autoComplete="name" />
                        </div>
                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="funcionario-usuario">Usuário / login *</label>
                            <input id="funcionario-usuario" value={form.usuario} onChange={(event) => setForm((atual) => ({ ...atual, usuario: event.target.value }))} maxLength={100} required disabled={salvando} autoComplete="username" />
                        </div>
                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="funcionario-departamento">Departamento *</label>
                            <Autocomplete id="funcionario-departamento" options={departamentoOptions} value={form.departamento_id} onChange={(value) => setForm((atual) => ({ ...atual, departamento_id: value === null ? null : Number(value) }))} placeholder="Pesquisar departamento" disabled={salvando} loading={carregandoOpcoes} loadingMessage="Carregando departamentos..." emptyMessage={form.tipo === 'tecnico' ? 'Nenhum departamento tem um responsável Analista/Líder designado.' : 'Nenhum departamento encontrado.'} />
                            {form.tipo === 'tecnico' && departamentoOptions.length === 0 && <small role="status">Cadastre um Analista/Líder ativo e atribua-o como responsável antes de criar Técnicos.</small>}
                        </div>
                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="funcionario-perfil">Perfil de acesso *</label>
                            <select id="funcionario-perfil" value={form.tipo} onChange={(event) => setForm((atual) => ({ ...atual, tipo: event.target.value as PerfilFuncionario }))} disabled={salvando}>
                                <option value="gestor">Gestor</option>
                                <option value="analista">Analista</option>
                                <option value="tecnico">Técnico</option>
                            </select>
                        </div>
                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="funcionario-senha">{funcionario && !modoDuplicacao ? "Nova senha (opcional)" : "Senha *"}</label>
                            <input id="funcionario-senha" type="password" value={form.senha} onChange={(event) => setForm((atual) => ({ ...atual, senha: event.target.value }))} minLength={8} required={!funcionario || modoDuplicacao} disabled={salvando} autoComplete="new-password" placeholder={funcionario && !modoDuplicacao ? "Deixe vazio para manter a senha atual" : "Mínimo de 8 caracteres"} />
                            {funcionario && !modoDuplicacao && <small>Por segurança, a senha atual nunca é exibida. Deixe vazio para mantê-la.</small>}
                        </div>
                    </div>
                    <footer className="projeto-modal-actions">
                        <button type="button" className="projeto-btn-secondary" onClick={onClose} disabled={salvando}>Cancelar</button>
                        <button type="submit" className="projeto-btn-primary" disabled={salvando || carregandoOpcoes}>{salvando ? "Salvando..." : modoDuplicacao ? "Criar novo funcionário" : funcionario ? "Salvar alterações" : "Cadastrar funcionário"}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
