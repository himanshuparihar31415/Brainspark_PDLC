import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Eye, X } from 'lucide-react';

/**
 * The forward action for every stage, in the same place on every stage:
 * bottom-right.
 *
 * There used to be one gate button in the header row, which meant the thing you
 * do last was the first thing you saw, and it moved as the header reflowed. One
 * bar at the foot of the workspace gives the pipeline a consistent "and then?" —
 * the left of it says what is unresolved, the right of it moves you on.
 *
 * It never refuses. If something is outstanding it names it, and continuing
 * anyway is a choice you are allowed to make: the list is recorded on the lock so
 * what you carried forward stays traceable. Blocking only ever amounted to
 * assuming the tool knows the work better than the person doing it.
 */
export const StageFooter: React.FC<{
  /** Where Next goes, e.g. "Project Understanding". Absent on the last stage. */
  nextTitle?: string;
  warnings: string[];
  locked: boolean;
  readOnly: boolean;
  /** Extra copy for the confirmation, on stages where locking is consequential. */
  confirm?: { title: string; body: string };
  /** Locks this stage and moves on. */
  onLockAndContinue: () => void;
  /** Moves on without locking — used when the stage is already locked. */
  onContinue: () => void;
}> = ({
  nextTitle,
  warnings,
  locked,
  readOnly,
  confirm,
  onLockAndContinue,
  onContinue,
}) => {
  const [confirming, setConfirming] = useState(false);

  const needsConfirm = warnings.length > 0 || Boolean(confirm);
  const last = !nextTitle;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 pt-1">
        {/* What you are carrying forward, stated before you do it */}
        <span className="min-w-0 flex items-center gap-1.5 text-[10.5px]">
          {locked ? (
            <>
              <Check className="h-3 w-3 shrink-0 text-emerald-600" />
              <span className="font-semibold text-emerald-700">Locked</span>
            </>
          ) : readOnly ? (
            <>
              <Eye className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="text-slate-500">
                Read-only — Spec AI belongs to the PM and Architect
              </span>
            </>
          ) : warnings.length > 0 ? (
            <>
              <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
              <span className="truncate text-amber-800">
                {warnings.length} unresolved {warnings.length === 1 ? 'item' : 'items'} —{' '}
                {warnings[0].toLowerCase()}
                {warnings.length > 1 && ` (+${warnings.length - 1} more)`}
              </span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3 shrink-0 text-emerald-600" />
              <span className="text-slate-500">Nothing outstanding here</span>
            </>
          )}
        </span>

        {last ? (
          <span className="shrink-0 text-[10.5px] font-semibold text-slate-400">
            Last stage — export from the table above
          </span>
        ) : (
          <button
            onClick={() => {
              if (locked) return onContinue();
              if (readOnly) return onContinue();
              if (needsConfirm) return setConfirming(true);
              onLockAndContinue();
            }}
            title={
              locked
                ? `Go to ${nextTitle}`
                : readOnly
                ? `You cannot lock this stage — going to ${nextTitle} to read it`
                : warnings.length > 0
                ? `${warnings.length} unresolved — you can still continue`
                : `Locks this stage and generates ${nextTitle}`
            }
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Next: {nextTitle}
            {!locked && !readOnly && warnings.length > 0 && (
              <span className="rounded bg-white/20 px-1 text-[10px] font-bold">
                {warnings.length}
              </span>
            )}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

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
                {confirm?.title ?? 'Lock this stage and continue?'}
              </h2>
              <button
                onClick={() => setConfirming(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {confirm?.body ?? `${nextTitle} will be generated from this version.`}
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
                  onLockAndContinue();
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
