import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type NotificationCategory = "OS" | "Projetos" | "Pessoas" | "SLA" | "Sistema";
type NotificationTone = "success" | "info" | "warning" | "danger";
type NotificationFilter = "all" | "unread" | "read" | "archived";

interface MockNotification {
    id: string;
    category: NotificationCategory;
    tone: NotificationTone;
    title: string;
    description: string;
    timeLabel: string;
    isRead: boolean;
    isArchived: boolean;
}

const NOTIFICACOES_INICIAIS: MockNotification[] = [
    {
        id: "mock-os-created", category: "OS", tone: "success", title: "Ordem criada com sucesso",
        description: "A OS-2024-0156 foi cadastrada e já está disponível na lista de ordens.",
        timeLabel: "Há 2 minutos", isRead: false, isArchived: false,
    },
    {
        id: "mock-os-updated", category: "OS", tone: "info", title: "Ordem atualizada",
        description: "O status da OS-2024-0148 foi alterado para Em andamento.",
        timeLabel: "Há 18 minutos", isRead: false, isArchived: false,
    },
    {
        id: "mock-sla-risk", category: "SLA", tone: "warning", title: "Atenção ao prazo de atendimento",
        description: "Uma ordem de serviço está próxima do vencimento do SLA.",
        timeLabel: "Há 35 minutos", isRead: false, isArchived: false,
    },
    {
        id: "mock-project", category: "Projetos", tone: "info", title: "Projeto atualizado",
        description: "O progresso do projeto Infraestrutura de rede foi atualizado.",
        timeLabel: "Hoje, 09:32", isRead: true, isArchived: false,
    },
    {
        id: "mock-person", category: "Pessoas", tone: "success", title: "Cadastro atualizado",
        description: "As informações de um colaborador foram atualizadas.",
        timeLabel: "Hoje, 08:46", isRead: true, isArchived: false,
    },
    {
        id: "mock-export", category: "Sistema", tone: "success", title: "Exportação concluída",
        description: "O relatório demonstrativo está pronto para consulta.",
        timeLabel: "Ontem, 16:20", isRead: true, isArchived: true,
    },
];

function CategoryIcon({ category }: { category: NotificationCategory }) {
    const icon: Record<NotificationCategory, ReactNode> = {
        OS: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 8h6m-6 4h6m-6 4h3" /></>,
        Projetos: <><path d="M4 19V5m0 14h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
        Pessoas: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 8a3 3 0 0 1 0 6m1 1a4 4 0 0 1 3.5 4" /></>,
        SLA: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
        Sistema: <><path d="M12 3.5v3m0 11v3M3.5 12h3m11 0h3M5.9 5.9l2.2 2.2m7.8 7.8 2.2 2.2m0-12.2-2.2 2.2m-7.8 7.8-2.2 2.2" /><circle cx="12" cy="12" r="4" /></>,
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
    const [items, setItems] = useState<MockNotification[]>(NOTIFICACOES_INICIAIS);
    const [filter, setFilter] = useState<NotificationFilter>("all");
    const [category, setCategory] = useState<NotificationCategory | "Todas">("Todas");
    const [search, setSearch] = useState("");

    const unreadCount = items.filter((item) => !item.isRead && !item.isArchived).length;
    const filteredItems = useMemo(() => items.filter((item) => {
        const matchesFilter = filter === "all"
            ? !item.isArchived
            : filter === "unread"
                ? !item.isRead && !item.isArchived
                : filter === "read"
                    ? item.isRead && !item.isArchived
                    : item.isArchived;
        const matchesCategory = category === "Todas" || item.category === category;
        const query = search.trim().toLocaleLowerCase("pt-BR");
        const matchesSearch = !query || `${item.title} ${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(query);
        return matchesFilter && matchesCategory && matchesSearch;
    }), [items, filter, category, search]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    const markRead = (id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
    const toggleArchive = (id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, isArchived: !item.isArchived, isRead: true } : item));
    const markAllRead = () => setItems((current) => current.map((item) => item.isArchived ? item : { ...item, isRead: true }));
    const clearRead = () => setItems((current) => current.filter((item) => !item.isRead || item.isArchived));
    const clearArchived = () => setItems((current) => current.filter((item) => !item.isArchived));

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
                            onChange={(event) =>
                                setCategory(event.target.value as NotificationCategory | "Todas")
                            }
                            aria-label="Filtrar por categoria"
                        >
                            <option value="Todas">Todas as categorias</option>
                            <option value="OS">Ordens de serviço</option>
                            <option value="Projetos">Projetos</option>
                            <option value="Pessoas">Pessoas</option>
                            <option value="SLA">SLA</option>
                            <option value="Sistema">Sistema</option>
                        </select>
                    </div>

                    <nav className="gestec-notification-tabs" aria-label="Filtrar notificações">
                        {([
                            ["all", "Todas"], ["unread", "Não lidas"], ["read", "Lidas"], ["archived", "Arquivadas"],
                        ] as Array<[NotificationFilter, string]>).map(([value, label]) => (
                            <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
                        ))}
                    </nav>

                    <div className="gestec-notification-list">
                        {filteredItems.length === 0 ? (
                            <div className="gestec-notification-empty">
                                <span><BellIcon /></span>
                                <strong>Nenhuma notificação encontrada</strong>
                                <p>Experimente alterar os filtros ou a pesquisa.</p>
                            </div>
                        ) : filteredItems.map((item) => (
                            <article key={item.id} className={`gestec-notification-item ${item.isRead ? "is-read" : "is-unread"} ${item.isArchived ? "is-archived" : ""}`}>
                                <span className={`gestec-notification-item-icon tone-${item.tone}`} aria-hidden="true"><CategoryIcon category={item.category} /></span>
                                <div className="gestec-notification-item-body">
                                    <div className="gestec-notification-item-topline">
                                        <span className="gestec-notification-category">{item.category}</span>
                                        {!item.isRead && !item.isArchived && <span className="gestec-notification-unread-dot" aria-label="Não lida" />}
                                    </div>
                                    <button type="button" className="gestec-notification-item-title" onClick={() => markRead(item.id)}>{item.title}</button>
                                    <p>{item.description}</p>
                                    <time>{item.timeLabel}</time>
                                    <div className="gestec-notification-item-actions">
                                        {!item.isRead && <button type="button" onClick={() => markRead(item.id)}>Marcar como lida</button>}
                                        <button type="button" onClick={() => toggleArchive(item.id)}>{item.isArchived ? "Restaurar" : "Arquivar"}</button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <footer className="gestec-notification-footer">
                        <button type="button" onClick={markAllRead} disabled={unreadCount === 0}>Marcar todas como lidas</button>
                        {filter === "archived" && <button type="button" onClick={clearArchived} disabled={!items.some((item) => item.isArchived)}>Limpar arquivadas</button>}
                        {(filter === "all" || filter === "read") && <button type="button" onClick={clearRead} disabled={!items.some((item) => item.isRead && !item.isArchived)}>Limpar lidas</button>}
                    </footer>
                    <p className="gestec-notification-demo-note">Conteúdo demonstrativo · Não sincronizado com o servidor</p>
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
                {unreadCount > 0 && <span className="gestec-notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                <span className="gestec-notification-fab-pulse" />
            </button>
        </div>
    );
}
