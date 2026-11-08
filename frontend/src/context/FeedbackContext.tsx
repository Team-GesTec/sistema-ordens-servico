import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { subscribeToToasts, type FeedbackToastEvent } from "../services/feedbackEvents";

export interface ToastRecord extends FeedbackToastEvent {
    id: string;
    createdAt: number;
}

interface FeedbackContextValue {
    toasts: ToastRecord[];
    dismissToast: (id: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function novoId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastRecord[]>([]);

    useEffect(() => subscribeToToasts((evento) => {
        const novo: ToastRecord = { ...evento, id: novoId(), createdAt: Date.now() };
        setToasts((atuais) => [novo, ...atuais].slice(0, 20));
    }), []);

    const dismissToast = useCallback((id: string) => {
        setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
    }, []);

    const value = useMemo(() => ({ toasts, dismissToast }), [toasts, dismissToast]);
    return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackContextValue {
    const context = useContext(FeedbackContext);
    if (!context) throw new Error("useFeedback deve ser utilizado dentro de FeedbackProvider.");
    return context;
}
