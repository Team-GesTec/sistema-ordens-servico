import "../styles/ajuda.css";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const swaggerUrl = import.meta.env.VITE_SWAGGER_URL || (apiBase ? `${apiBase}/docs` : "/docs");
const manualUrl = import.meta.env.VITE_MANUAL_URL || "/manual/Manual-Usuario.pdf";

function Ajuda() {
  return (
    <main className="dashboard ajuda-page">
      <header className="page-heading">
        <div><p className="eyebrow">SUPORTE E DOCUMENTAÇÃO</p><h1>Ajuda</h1><p>Encontre orientações de uso e consulte os contratos da API do SGOS.</p></div>
      </header>
      <section className="ajuda-grid" aria-label="Materiais de ajuda">
        <article className="ajuda-card">
          <div className="ajuda-icon"><i className="fa-solid fa-code" aria-hidden="true" /></div>
          <div><h2>Documentação da API</h2><p>Consulte endpoints, métodos HTTP, parâmetros, autenticação, respostas e exemplos. A documentação pode ser acessada por clientes e desenvolvedores externos.</p></div>
          <a className="ajuda-action" href={swaggerUrl} target="_blank" rel="noreferrer">Abrir Swagger <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a>
        </article>
        <article className="ajuda-card">
          <div className="ajuda-icon"><i className="fa-solid fa-book-open" aria-hidden="true" /></div>
          <div><h2>Manual do usuário</h2><p>Consulte o guia de instalação e os manuais organizados por perfil: Gestor, Técnico e Analista.</p></div>
          <a className="ajuda-action" href={manualUrl} target="_blank" rel="noreferrer">Visualizar manual <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></a>
          <a className="ajuda-secondary" href={manualUrl} download>Baixar PDF <i className="fa-solid fa-download" aria-hidden="true" /></a>
        </article>
      </section>
    </main>
  );
}

export default Ajuda;
