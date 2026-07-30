import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, X } from 'lucide-react';

/**
 * The stage gate, as the primary action in the strip row.
 *
 * It never refuses. If something is unresolved it says what, and locking anyway is
 * a choice you are allowed to make — the list is recorded on the lock so what you
 * carried forward stays traceable. Blocking only ever amounted to assuming the
 * tool knows the work better than the person doing it.
 */
export const GateButton: React.FC<{
  label: string;
  warnings: string[];
  locked: boolean;
  readOnly: boolean;
  /** Extra copy for the confirmation, on stages where locking is consequential. */
  confirm?: { title: string; body: string };
  onLock: () => void;
}> = ({ label, warnings, locked, readOnly, confirm, onLock }) => {
  const [confirming, setConfirming] = useState(false);

  if (locked) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
        <Check className="h-3.5 w-3.5" /> Stage locked
      </span>
    );
  }

  const needsConfirm = warnings.length > 0 || Boolean(confirm);

  return (
    <>
      <button
        onClick={() => (needsConfirm ? setConfirming(true) : onLock())}
        disabled={readOnly}
        title={
          readOnly
            ? 'You have read-only access to this workspace.'
            : warnings.length > 0
            ? `${warnings.length} thing${
                warnings.length === 1 ? '' : 's'
              } unresolved — you can still lock`
            : 'Version-locks this stage and generates the next one.'
        }
        className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
          readOnly
            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
            : 'cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {label}
        {warnings.length > 0 && !readOnly && (
          <span className="rounded bg-white/20 px-1 text-[10px] font-bold">{warnings.length}</span>
        )}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setConfirming(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md animate-in zoom-in-95 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                {confirm?.title ?? 'Lock this stage?'}
              </h2>
              <button
                onClick={() => setConfirming(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {confirm?.body ?? 'The next stage will be generated from this version.'}
            </p>

            {warnings.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Carrying forward {warnings.length} unresolved{' '}
                  {warnings.length === 1 ? 'thing' : 'things'}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {warnings.map((w) => (
                    <li key={w} className="text-[10.5px] leading-relaxed text-amber-900">
                      · {w}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] leading-relaxed text-amber-800">
                  These are recorded on the lock, so anything generated from here can be traced back
                  to what was still open.
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep editing
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onLock();
                }}
                className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Lock &amp; continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
