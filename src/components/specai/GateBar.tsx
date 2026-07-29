import React, { useState } from 'react';
import { GateCheck } from '../../data/specai';
import { AlertTriangle, ArrowRight, Check, Lock, X } from 'lucide-react';

/**
 * The stage gate. Locking is the only way forward, and a closed gate always says
 * why rather than simply being greyed out.
 */
export const GateBar: React.FC<{
  label: string;
  check: GateCheck;
  locked: boolean;
  readOnly: boolean;
  /** Optional confirmation copy; shown in a dialog before locking. */
  confirm?: { title: string; body: string };
  onLock: () => void;
}> = ({ label, check, locked, readOnly, confirm, onLock }) => {
  const [confirming, setConfirming] = useState(false);

  if (locked) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="text-xs font-bold text-emerald-800">
          Stage locked. Finalized documents are version-locked before the pipeline proceeds.
        </span>
      </div>
    );
  }

  const disabled = !check.ok || readOnly;
  const reason = readOnly
    ? 'You have read-only access to this workspace.'
    : check.reason;

  return (
    <>
      <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          {disabled ? (
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
          ) : (
            <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
          <span
            className={`text-[11px] font-semibold ${
              disabled ? 'text-amber-800' : 'text-slate-500'
            }`}
          >
            {reason ?? 'Locking this stage unlocks the next one.'}
          </span>
        </div>

        <button
          onClick={() => (confirm ? setConfirming(true) : onLock())}
          disabled={disabled}
          title={disabled ? reason : undefined}
          className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
            disabled
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {label}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {confirming && confirm && (
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
                {confirm.title}
              </h2>
              <button
                onClick={() => setConfirming(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{confirm.body}</p>
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
