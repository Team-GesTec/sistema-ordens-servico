import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type { ToastRecord } from "../../context/FeedbackContext";

interface ToastViewportProps {
    toasts: ToastRecord[];
    onDismiss: (id: string) => void;
}

function ToastSymbol({ variant }: { variant: ToastRecord["variant"] }) {
    if (variant === "success") {
        return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" /></svg>;
    }
    if (variant === "error") {
        return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="m9 9 6 6m0-6-6 6" /></svg>;
    }
    if (variant === "warning") {
        return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 21 20H3L12 3.5Z" /><path d="M12 9v5m0 2.8h.01" /></svg>;
    }
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v5m0-8h.01" /></svg>;
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: string) => void }) {
    const dismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);
    const duration = toast.duration ?? (toast.variant === "success" ? 4500 : toast.variant === "warning" ? 6000 : toast.variant === "error" ? 8000 : 5000);
    const [paused, setPaused] = useState(false);
    const [remaining, setRemaining] = useState(duration);
    const [closing, setClosing] = useState(false);
    const startedAt = useRef(Date.now());
    const timer = useRef<number | undefined>(undefined);
    const pausedRef = useRef(false);

    useEffect(() => {
        if (paused || toast.persistent) return;
        startedAt.current = Date.now();
        timer.current = window.setTimeout(() => { void dismiss(); }, remaining);
        return () => {
            if (timer.current !== undefined) window.clearTimeout(timer.current);
        };
    }, [paused, remaining, dismiss, toast.persistent]);

    const pause = () => {
        if (pausedRef.current) return;
        pausedRef.current = true;
        if (timer.current !== undefined) window.clearTimeout(timer.current);
        const elapsed = Date.now() - startedAt.current;
        setRemaining((current) => Math.max(500, current - elapsed));
        setPaused(true);
    };

    const resume = () => {
        if (!pausedRef.current) return;
        pausedRef.current = false;
        setPaused(false);
    };
    const fechar = async () => {
        if (closing) return;
        setClosing(true);
        try {
            const resultado = await toast.onDismiss?.();
            if (resultado === false) {
                setClosing(false);
                return;
            }
            onDismiss(toast.id);
        } catch {
            setClosing(false);
        }
    };
    const stopClick = (event: MouseEvent<HTMLButtonElement>) => event.stopPropagation();

    return (
        <article
            className={`gestec-toast gestec-toast-${toast.variant}`}
            role={toast.variant === "error" ? "alert" : "status"}
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocus={pause}
            onBlur={resume}
        >
            <div className="gestec-toast-icon"><ToastSymbol variant={toast.variant} /></div>
            <div className="gestec-toast-content">
                <strong>{toast.title}</strong>
                <p>{toast.message}</p>
            </div>
            <button
                type="button"
                className="gestec-toast-close"
                aria-label="Fechar mensagem"
                disabled={closing}
                onClick={(event) => { stopClick(event); void fechar(); }}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
            {!toast.persistent && <span
                className={`gestec-toast-progress${paused ? " is-paused" : ""}`}
                style={{ "--toast-duration": `${duration}ms` } as CSSProperties & { "--toast-duration": string }}
            />}
        </article>
    );
}

export default function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
    return (
        <div className="gestec-toast-viewport" aria-label="Mensagens do sistema">
            {toasts.slice(0, 3).map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}
