import React, { useState } from 'react';
import { GateCheck } from '../../data/specai';
import { ArrowRight, Check, X } from 'lucide-react';

/**
 * The stage gate, as the primary action in the stage header. Locking is the only
 * way forward, and a closed gate always says why rather than simply greying out.
 */
export const GateButton: React.FC<{
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
      <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
        <Check className="h-3.5 w-3.5" /> Stage locked
      </span>
    );
  }

  const disabled = !check.ok || readOnly;
  const reason = readOnly ? 'You have read-only access to this workspace.' : check.reason;

  return (
    <>
      <button
        onClick={() => (confirm ? setConfirming(true) : onLock())}
        disabled={disabled}
        title={disabled ? reason : 'Version-locks this stage and opens the next one.'}
        className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
            : 'cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>

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
