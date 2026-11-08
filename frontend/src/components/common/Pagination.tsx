interface PaginationProps {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, totalItems, pageSize = 10, onPageChange }: PaginationProps) {
    if (totalItems <= pageSize) return null;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
        .filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1);

    return (
        <nav className="gestec-pagination" aria-label="Paginação dos resultados">
            <span className="gestec-pagination-summary">Exibindo <strong>{start}–{end}</strong> de <strong>{totalItems}</strong></span>
            <div className="gestec-pagination-controls">
                <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Página anterior">
                    <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                </button>
                {pages.map((number, index) => {
                    const previous = pages[index - 1];
                    return (
                        <span className="gestec-pagination-unit" key={number}>
                            {previous !== undefined && number - previous > 1 && <span className="gestec-pagination-ellipsis" aria-hidden="true">…</span>}
                            <button type="button" className={page === number ? "active" : ""} onClick={() => onPageChange(number)} aria-current={page === number ? "page" : undefined} aria-label={`Página ${number}`}>
                                {number}
                            </button>
                        </span>
                    );
                })}
                <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Próxima página">
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
}
