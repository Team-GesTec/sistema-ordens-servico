import { useState } from "react";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/filters.css";
import "../styles/cards.css";
import "../styles/details.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import CustomSelect from "../components/CustomSelect";
import type { SelectOption } from "../components/CustomSelect";
import { getStoredUser } from "../services/auth";

const setorOptions: SelectOption[] = [{ value: 0, label: "Todos os setores" }];

function Home() {
    const [search, setSearch] = useState("");
    const [selectedSetor, setSelectedSetor] = useState(0);
    const usuario = getStoredUser();

    return (
        <div className="layout">
            <main className="main">
                <div className="container">
                    <div className="filter">
                        <input
                            type="text"
                            placeholder="Pesquisar ordem de serviço"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            disabled
                            aria-label="Pesquisar ordem de serviço"
                        />

                        <CustomSelect
                            options={setorOptions}
                            value={selectedSetor}
                            onChange={setSelectedSetor}
                            placeholder="Todos os setores"
                        />

                        <div className="filter-button">
                            <button disabled></button>
                            <button disabled></button>
                            <button disabled></button>
                        </div>
                    </div>

                    <div className="form-card">
                        <h1 className="form-title">Olá, {usuario?.nome ?? usuario?.usuario ?? "usuário"}.</h1>
                        <p className="form-hint">
                            Sua sessão foi validada pelo backend em <code>GET /auth/me</code>.
                        </p>
                        <p className="form-hint">
                            A interface de O.S. não exibe dados fictícios: o backend atual possui apenas <code>POST /ordens-servico</code> e não disponibiliza <code>GET /ordens-servico</code>. Por isso, não é possível carregar uma lista real para os cards desta Home sem inventar um endpoint.
                        </p>
                        {search && <p className="form-hint">O filtro de pesquisa ficará disponível quando a API de listagem de O.S. existir.</p>}
                    </div>
                </div>
            </main>
            <aside className="details" />
        </div>
    );
}

export default Home;
