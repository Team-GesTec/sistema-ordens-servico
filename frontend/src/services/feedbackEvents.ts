export type FeedbackToastVariant = "success" | "error" | "warning" | "info";

export interface FeedbackToastEvent {
    title: string;
    message: string;
    variant: FeedbackToastVariant;
    duration?: number;
    persistent?: boolean;
    onDismiss?: () => void | boolean | Promise<void | boolean>;
}

type FeedbackListener = (toast: FeedbackToastEvent) => void;

const listeners = new Set<FeedbackListener>();

/** Publica um feedback visual sem acoplar os serviços HTTP aos componentes React. */
export function publishToast(toast: FeedbackToastEvent): void {
    listeners.forEach((listener) => listener(toast));
}

/** Assina os eventos de feedback. O retorno remove a assinatura. */
export function subscribeToToasts(listener: FeedbackListener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
