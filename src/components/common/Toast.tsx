import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-md flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border p-4 type-body-strong elevation-floating ${
            toast.type === 'success'
              ? 'material-acrylic-strong border-emerald-200/60 text-slate-800'
              : toast.type === 'error'
              ? 'border-rose-200/80 bg-rose-50/90 text-rose-900 backdrop-blur-xl'
              : 'material-acrylic-strong border-indigo-200/60 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            )}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />}
            {toast.type === 'info' && <Info className="h-5 w-5 shrink-0 text-indigo-600" />}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 text-slate-400 transition-colors hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
