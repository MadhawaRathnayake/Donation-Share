import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';
import { ToastContext, type ToastMessage } from './toast-context';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const dismiss = useCallback((id: string) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const notify = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl ${toast.tone === 'error' ? 'border-danger/30 bg-danger-soft text-danger-dark' : toast.tone === 'success' ? 'border-brand/30 bg-brand-soft text-brand-dark' : 'border-info/30 bg-info-soft text-info-dark'}`}>
            {toast.tone === 'success' ? <Check size={19} /> : toast.tone === 'error' ? <AlertCircle size={19} /> : <Info size={19} />}
            <div className="min-w-0 flex-1"><p className="font-bold">{toast.title}</p>{toast.message && <p className="mt-0.5 text-sm opacity-80">{toast.message}</p>}</div>
            <button className="rounded p-1 hover:bg-white/60" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}><X size={17} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
