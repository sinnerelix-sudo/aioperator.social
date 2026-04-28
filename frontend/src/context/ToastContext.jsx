import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);

let id = 0;

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  warning: 'bg-amber-500',
  info: 'bg-slate-900',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((tid) => {
    setToasts((prev) => prev.filter((t) => t.id !== tid));
  }, []);

  const push = useCallback(
    (type, message, opts = {}) => {
      id += 1;
      const tid = id;
      const duration = opts.duration ?? 4000;
      setToasts((prev) => [...prev, { id: tid, type, message }]);
      if (duration > 0) {
        setTimeout(() => dismiss(tid), duration);
      }
      return tid;
    },
    [dismiss]
  );

  const toast = {
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    warning: (m, o) => push('warning', m, o),
    info: (m, o) => push('info', m, o),
    dismiss,
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div
        className="fixed left-0 right-0 top-0 z-[9999] flex flex-col items-center gap-2 px-3 pt-3 pointer-events-none"
        data-testid="toast-container"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              data-testid={`toast-${t.type}`}
              className={`pointer-events-auto w-full max-w-md ${
                COLORS[t.type] || COLORS.info
              } text-white shadow-2xl rounded-xl px-4 py-3 flex items-start gap-3 animate-slide-down`}
              role="status"
              aria-live="polite"
            >
              <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
              <div className="flex-1 text-sm font-medium leading-snug">{t.message}</div>
              <button
                onClick={() => dismiss(t.id)}
                className="opacity-70 hover:opacity-100 transition-opacity"
                aria-label="close"
                data-testid="toast-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
