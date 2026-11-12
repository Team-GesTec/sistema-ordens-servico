import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { notificacaoService } from "../../services/notificacao";
import { publishToast } from "../../services/feedbackEvents";
import type { Notificacao } from "../../types/notificacao";

type FiltroNotificacao = "todas" | "nao_lidas" | "lidas";
type CategoriaNotificacao = "SLA" | "Status da OS" | "Responsável" | "Departamento";
type TomNotificacao = "success" | "info" | "warning" | "danger";

const FILTROS: Array<[FiltroNotificacao, string]> = [
    ["todas", "Todas"],
    ["nao_lidas", "Não lidas"],
    ["lidas", "Lidas"],
];

const CATEGORIAS: CategoriaNotificacao[] = ["SLA", "Status da OS", "Responsável", "Departamento"];

function categoriaNotificacao(tipo: Notificacao["tipo"]): CategoriaNotificacao {
    if (tipo.startsWith("sla_")) return "SLA";
    if (tipo === "status_alterado") return "Status da OS";
    if (tipo === "responsavel_definido") return "Responsável";
    return "Departamento";
}

function tomNotificacao(tipo: Notificacao["tipo"]): TomNotificacao {
    if (tipo.startsWith("sla_")) return "warning";
    if (tipo === "responsavel_definido") return "success";
    return "info";
}

function dataLegivel(data: string): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(data));
}

function CategoryIcon({ category }: { category: CategoriaNotificacao }) {
    const icon: Record<CategoriaNotificacao, ReactNode> = {
        "Status da OS": <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 8h6m-6 4h6m-6 4h3" /></>,
        "Responsável": <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 8a3 3 0 0 1 0 6m1 1a4 4 0 0 1 3.5 4" /></>,
        "SLA": <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
        "Departamento": <><path d="M12 3.5v3m0 11v3M3.5 12h3m11 0h3M5.9 5.9l2.2 2.2m7.8 7.8 2.2 2.2m0-12.2-2.2 2.2m-7.8 7.8-2.2 2.2" /><circle cx="12" cy="12" r="4" /></>,
    };
    return <svg viewBox="0 0 24 24" aria-hidden="true">{icon[category]}</svg>;
}

function BellIcon() {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
}

function CloseIcon() {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Notificacao[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<FiltroNotificacao>("todas");
    const [category, setCategory] = useState<CategoriaNotificacao | "Todas">("Todas");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const knownIds = useRef<Set<string>>(new Set());
    const monitorStarted = useRef(false);

    const load = useCallback(async () => {
        try {
            const [result, count, recentUnread] = await Promise.all([
                notificacaoService.listar(page, 30, filter === "todas" ? undefined : filter === "nao_lidas"),
                notificacaoService.contarNaoLidas(),
                notificacaoService.listar(1, 30, false),
            ]);

            if (!monitorStarted.current) {
                recentUnread.dados.forEach((n) => knownIds.current.add(n.id));
                monitorStarted.current = true;
            } else {
                const received = recentUnread.dados.filter((n) => !knownIds.current.has(n.id));
                recentUnread.dados.forEach((n) => knownIds.current.add(n.id));

                received.reverse().forEach((n) => {
                    publishToast({
                        title: n.titulo,
                        message: n.mensagem,
                        variant: "info",
                        duration: 7000,
                    });
                });
            }

            setItems(result.dados);
            setTotalPages(Math.max(1, result.totalPaginas));
            setUnreadCount(count.total);
        } catch (error) {
            console.error("Não foi possível carregar as notificações:", error);
        }
    }, [page, filter]);

    useEffect(() => {
        void load();
        const interval = window.setInterval(() => void load(), 5000);
        return () => window.clearInterval(interval);
    }, [load]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    // Busca e categoria filtram apenas a página carregada (o backend não recebe esses filtros).
    const filteredItems = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("pt-BR");
        return items.filter((item) => {
            const itemCategory = categoriaNotificacao(item.tipo);
            const matchesCategory = category === "Todas" || itemCategory === category;
            const matchesSearch =
                !query ||
                `${item.titulo} ${item.mensagem} ${itemCategory} OS ${item.os_id}`
                    .toLocaleLowerCase("pt-BR")
                    .includes(query);
            return matchesCategory && matchesSearch;
        });
    }, [items, category, search]);

    const changeFilter = (value: FiltroNotificacao) => {
        setFilter(value);
        setPage(1);
    };

    const markRead = async (id: string) => {
        setLoading(true);
        try {
            await notificacaoService.marcarUmaComoLida(id);
            await load();
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        setLoading(true);
        try {
            await notificacaoService.marcarTodasComoLidas();
            await load();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="gestec-notification-center">
            {open && <button type="button" className="gestec-notification-backdrop" aria-label="Fechar notificações" onClick={() => setOpen(false)} />}
            {open && (
                <section className="gestec-notification-panel" role="dialog" aria-modal="false" aria-labelledby="gestec-notification-title">
                    <header className="gestec-notification-header">
                        <div>
                            <span className="gestec-notification-eyebrow">CENTRAL DE ATIVIDADES</span>
                            <h2 id="gestec-notification-title">Notificações</h2>
                            <p>{unreadCount === 0 ? "Você está em dia." : `${unreadCount} ${unreadCount === 1 ? "notificação não lida" : "notificações não lidas"}`}</p>
                        </div>
                        <button type="button" className="gestec-notification-icon-button" aria-label="Fechar painel" onClick={() => setOpen(false)}><CloseIcon /></button>
                    </header>

                    <div className="gestec-notification-toolbar">
                        <div className="gestec-notification-search">
                            <span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg></span>
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar notificações..." aria-label="Buscar notificações" />
                        </div>
                        <select
                            className="select-notification"
                            value={category}
                            onChange={(event) => setCategory(event.target.value as CategoriaNotificacao | "Todas")}
                            aria-label="Filtrar por categoria"
                        >
                            <option value="Todas">Todas as categorias</option>
                            {CATEGORIAS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    <nav className="gestec-notification-tabs" aria-label="Filtrar notificações">
                        {FILTROS.map(([value, label]) => (
                            <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => changeFilter(value)}>{label}</button>
                        ))}
                    </nav>

                    <div className="gestec-notification-list">
                        {filteredItems.length === 0 ? (
                            <div className="gestec-notification-empty">
                                <span><BellIcon /></span>
                                <strong>Nenhuma notificação encontrada</strong>
                                <p>As atualizações das suas ordens aparecerão aqui.</p>
                            </div>
                        ) : filteredItems.map((item) => {
                            const itemCategory = categoriaNotificacao(item.tipo);
                            return (
                                <article key={item.id} className={`gestec-notification-item ${item.lida ? "is-read" : "is-unread"}`}>
                                    <span className={`gestec-notification-item-icon tone-${tomNotificacao(item.tipo)}`} aria-hidden="true"><CategoryIcon category={itemCategory} /></span>
                                    <div className="gestec-notification-item-body">
                                        <div className="gestec-notification-item-topline">
                                            <span className="gestec-notification-category">{itemCategory}</span>
                                            {!item.lida && <span className="gestec-notification-unread-dot" aria-label="Não lida" />}
                                        </div>
                                        <button type="button" className="gestec-notification-item-title" disabled={loading || item.lida} onClick={() => void markRead(item.id)}>{item.titulo}</button>
                                        <p>{item.mensagem}</p>
                                        <time dateTime={item.data_criacao}>OS #{item.os_id} · {dataLegivel(item.data_criacao)}</time>
                                        <div className="gestec-notification-item-actions">
                                            {!item.lida && <button type="button" disabled={loading} onClick={() => void markRead(item.id)}>Marcar como lida</button>}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <footer className="gestec-notification-footer">
                        <button type="button" onClick={() => void markAllRead()} disabled={loading || unreadCount === 0}>Marcar todas como lidas</button>
                        <div className="gestec-notification-pagination">
                            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Anterior</button>
                            <span>{page} / {totalPages}</span>
                            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Próxima</button>
                        </div>
                    </footer>
                </section>
            )}
            <button
                type="button"
                className={`gestec-notification-fab${open ? " is-open" : ""}`}
                onClick={() => setOpen((current) => !current)}
                aria-label={open ? "Fechar notificações" : `Abrir notificações, ${unreadCount} não lidas`}
                aria-expanded={open}
            >
                <BellIcon />
                {unreadCount > 0 && <span className="gestec-notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                <span className="gestec-notification-fab-pulse" />
            </button>
        </div>
    );
}
