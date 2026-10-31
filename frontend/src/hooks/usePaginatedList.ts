import { useState } from "react";

export default function usePaginatedList<T>(items: readonly T[], pageSize = 10) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;

    return {
        page: currentPage,
        totalPages,
        pageSize,
        pageItems: items.slice(startIndex, startIndex + pageSize),
        setPage,
    };
}
