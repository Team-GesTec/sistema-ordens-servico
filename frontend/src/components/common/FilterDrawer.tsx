import { useEffect, useId, useState, type ReactNode } from "react";

interface FilterDrawerProps {
    children: ReactNode;
    activeCount?: number;
    onClear?: () => void;
    clearLabel?: string;
    title?: string;
}

export default function FilterDrawer({
    children,
    activeCount = 0,
    onClear,
    clearLabel = "Limpar filtros",
    title = "Filtros",
}: FilterDrawerProps) {
    const [aberto, setAberto] = useState(false);
    const tituloId = useId();

    useEffect(() => {
        if (!aberto) return;
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setAberto(false);
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [aberto]);

    return (
        <>
            <button
                type="button"
                className="gestec-filter-trigger"
                onClick={() => setAberto(true)}
                aria-haspopup="dialog"
                aria-expanded={aberto}
            >
                <i className="fa-solid fa-sliders" aria-hidden="true" />
                <span>Filtros</span>
                {activeCount > 0 && <span className="gestec-filter-count">{activeCount}</span>}
            </button>
            {aberto && (
                <div
                    className="gestec-filter-overlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setAberto(false);
                    }}
                >
                    <aside className="gestec-filter-drawer" role="dialog" aria-modal="true" aria-labelledby={tituloId}>
                        <header className="gestec-filter-drawer-header">
                            <div>
                                <span className="gestec-filter-eyebrow">PERSONALIZE A LISTA</span>
                                <h2 id={tituloId}>{title}</h2>
                                <p>Os resultados são atualizados com os dados atuais do sistema.</p>
                            </div>
                            <button type="button" className="gestec-filter-close" onClick={() => setAberto(false)} aria-label="Fechar filtros">
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                        </header>
                        <div className="gestec-filter-drawer-content">{children}</div>
                        <footer className="gestec-filter-drawer-footer">
                            {onClear && <button type="button" className="gestec-filter-clear" onClick={onClear}>{clearLabel}</button>}
                            <button type="button" className="gestec-filter-apply" onClick={() => setAberto(false)}>Concluir</button>
                        </footer>
                    </aside>
                </div>
            )}
        </>
    );
}
