// src/contexts/ToastContext.tsx — avisos rápidos ("toasts") e confirmações

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Button, Modal } from "../components/ui";

type ToastTone = "success" | "error" | "info";
interface Toast { id: number; message: string; tone: ToastTone }
interface ConfirmOptions { title: string; message?: ReactNode; confirmLabel?: string; danger?: boolean }

interface ToastValue {
    toast: (message: string, tone?: ToastTone) => void;
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastValue>({ toast: () => {}, confirm: async () => false });

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

    const toast = useCallback((message: string, tone: ToastTone = "success") => {
        const id = Date.now() + Math.random();
        setToasts(t => [...t, { id, message, tone }]);
        window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
    }, []);

    const confirm = useCallback((opts: ConfirmOptions) =>
        new Promise<boolean>(resolve => setPending({ ...opts, resolve })), []);

    const close = (v: boolean) => { pending?.resolve(v); setPending(null); };

    return (
        <ToastContext.Provider value={{ toast, confirm }}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-24 lg:bottom-6 z-[80] flex flex-col items-center gap-2 px-4">
                {toasts.map(t => {
                    const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertTriangle : Info;
                    const color = t.tone === "success" ? "text-success" : t.tone === "error" ? "text-danger" : "text-info";
                    return (
                        <div key={t.id} className="animate-pop pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg shadow-2xl">
                            <Icon className={`h-[18px] w-[18px] shrink-0 ${color}`} />
                            {t.message}
                        </div>
                    );
                })}
            </div>
            <Modal
                open={!!pending}
                onClose={() => close(false)}
                size="sm"
                title={pending?.title}
                footer={<>
                    <Button onClick={() => close(false)}>Cancelar</Button>
                    <Button variant={pending?.danger ? "danger" : "primary"} onClick={() => close(true)}>{pending?.confirmLabel || "Confirmar"}</Button>
                </>}
            >
                <div className="text-sm text-fg-muted">{pending?.message}</div>
            </Modal>
        </ToastContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
