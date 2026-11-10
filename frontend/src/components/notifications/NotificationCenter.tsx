import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/api";
import type { NotificacaoSla } from "../../types/notificacao";

type Filtro = "all" | "unread" | "read";
function Bell() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>; }
function Close() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>; }
function titulo(item: NotificacaoSla): string { return item.tipo === "em_risco" ? "SLA em risco" : item.tipo === "vencido" ? "SLA vencido" : item.tipo === "responsavel_atribuido" ? "Nova atribuição" : "Status atualizado"; }

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificacaoSla[]>([]);
    const [filtro, setFiltro] = useState<Filtro>("all");
    const carregar = useCallback(async () => { try { setItems(await apiRequest<NotificacaoSla[]>("/notificacoes")); } catch { /* erro já é exibido pelo cliente HTTP */ } }, []);
    useEffect(() => { void carregar(); const timer = window.setInterval(() => void carregar(), 30000); return () => window.clearInterval(timer); }, [carregar]);
    const naoLidas = items.filter((item) => !item.lida).length;
    const visiveis = useMemo(() => items.filter((item) => filtro === "all" || (filtro === "unread" ? !item.lida : item.lida)), [items, filtro]);
    const ler = async (id: string) => { await apiRequest<void>(`/notificacoes/${encodeURIComponent(id)}/lida`, { method: "PATCH" }); setItems((atual) => atual.map((item) => item.id === id ? { ...item, lida: true } : item)); };
    const lerTodas = async () => { await apiRequest<void>("/notificacoes/ler-todas", { method: "PATCH" }); setItems((atual) => atual.map((item) => ({ ...item, lida: true }))); };
    return <div className="gestec-notification-center">
        {open && <button type="button" className="gestec-notification-backdrop" aria-label="Fechar notificações" onClick={() => setOpen(false)} />}
        {open && <section className="gestec-notification-panel" role="dialog" aria-labelledby="gestec-notification-title"><header className="gestec-notification-header"><div><span className="gestec-notification-eyebrow">CENTRAL DE ATIVIDADES</span><h2 id="gestec-notification-title">Notificações</h2><p>{naoLidas ? `${naoLidas} ${naoLidas === 1 ? "notificação não lida" : "notificações não lidas"}` : "Você está em dia."}</p></div><button type="button" className="gestec-notification-icon-button" aria-label="Fechar painel" onClick={() => setOpen(false)}><Close /></button></header>
            <nav className="gestec-notification-tabs" aria-label="Filtrar notificações">{([["all", "Todas"], ["unread", "Não lidas"], ["read", "Lidas"]] as Array<[Filtro, string]>).map(([value, label]) => <button key={value} type="button" className={filtro === value ? "active" : ""} onClick={() => setFiltro(value)}>{label}</button>)}</nav>
            <div className="gestec-notification-list">{visiveis.length === 0 ? <div className="gestec-notification-empty"><span><Bell /></span><strong>Nenhuma notificação</strong><p>Você não possui avisos neste filtro.</p></div> : visiveis.map((item) => <article key={item.id} className={`gestec-notification-item ${item.lida ? "is-read" : "is-unread"}`}><span className="gestec-notification-item-icon tone-info"><Bell /></span><div className="gestec-notification-item-body"><div className="gestec-notification-item-topline"><span className="gestec-notification-category">O.S. {item.os_id}</span>{!item.lida && <span className="gestec-notification-unread-dot" aria-label="Não lida" />}</div><button type="button" className="gestec-notification-item-title" onClick={() => { if (!item.lida) void ler(item.id); }}>{titulo(item)}</button><p>{item.mensagem}</p><time>{new Date(item.data_criacao).toLocaleString("pt-BR")}</time>{!item.lida && <div className="gestec-notification-item-actions"><button type="button" onClick={() => void ler(item.id)}>Marcar como lida</button></div>}</div></article>)}</div>
            <footer className="gestec-notification-footer"><button type="button" onClick={() => void lerTodas()} disabled={!naoLidas}>Marcar todas como lidas</button></footer></section>}
        <button type="button" className={`gestec-notification-fab${open ? " is-open" : ""}`} onClick={() => setOpen((atual) => !atual)} aria-label={open ? "Fechar notificações" : `Abrir notificações, ${naoLidas} não lidas`} aria-expanded={open}><Bell />{naoLidas > 0 && <span className="gestec-notification-badge">{naoLidas > 9 ? "9+" : naoLidas}</span>}<span className="gestec-notification-fab-pulse" /></button>
    </div>;
}
