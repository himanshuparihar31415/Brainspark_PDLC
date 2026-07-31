import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import { ArrowRight, Loader2, Target } from 'lucide-react';

/**
 * Where a project starts: one question.
 *
 * Everything after this is read against the answer — which sources count as
 * relevant, which questions get raised, what ends up in the backlog. So it is the
 * one thing the module will not proceed without, and the only thing on screen
 * until it has one.
 *
 * Paste whatever you have. Prose, a log dump, a ticket, notes from the room — it
 * all gets read, and what the agent takes from it becomes the first lines of the
 * brief. What it cannot work out becomes an open question rather than a screen
 * you have to clear.
 */
export const IntakeGate: React.FC<{ state: SpecAiState; readOnly: boolean }> = ({
  state,
  readOnly,
}) => {
  const { startFromProblem } = useApp();

  const [draft, setDraft] = useState('');
  const busy = Boolean(state.generating);
  const ready = draft.trim() !== '' && !readOnly && !busy;

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-xl">
        <h1 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900">
          <Target className="h-4 w-4 text-indigo-600" />
          Start with a problem statement
        </h1>
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
          Everything after this is read against it. Prose, logs, a ticket, notes — whatever you have.
        </p>

        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ready)
              startFromProblem(state.projectId, draft);
          }}
          rows={5}
          disabled={readOnly || busy}
          placeholder="Returning customers abandon login because a PIN is demanded every single time…"
          className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-[12px] leading-relaxed outline-none transition-colors focus:border-indigo-500 disabled:cursor-not-allowed"
        />

        <button
          onClick={() => startFromProblem(state.projectId, draft)}
          disabled={!ready}
          className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {busy ? 'Reading…' : 'Gather requirements'}
          {!busy && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
};
