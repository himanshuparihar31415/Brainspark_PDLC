import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import { indexedSources } from '../../data/specai';
import { Loader2, Pencil, Sparkles, Target } from 'lucide-react';

/**
 * The high-level ask. This exists so synthesis has something to aim at — the
 * difference between "what is in these files" and "what do we know about this
 * problem" is the whole value of the reading that follows.
 */
export const ProblemStatement: React.FC<{
  state: SpecAiState;
  disabled: boolean;
}> = ({ state, disabled }) => {
  const { setProblemStatement, synthesizeUnderstanding } = useApp();

  const saved = state.problemStatement.trim();
  const [editing, setEditing] = useState(saved === '');
  const [draft, setDraft] = useState(state.problemStatement);

  const busy = Boolean(state.generating);
  const readable = indexedSources(state).length;
  const hasBrief = Boolean(state.brief);

  const runLabel = busy
    ? 'Reading…'
    : hasBrief
    ? state.brief?.stale
      ? 'Re-run reading'
      : `Reading v${state.brief?.version}`
    : 'Build first reading';

  const run = () => {
    if (draft.trim() !== state.problemStatement) setProblemStatement(state.projectId, draft);
    setEditing(false);
    synthesizeUnderstanding(state.projectId);
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-start gap-2.5 rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50 px-3.5 py-2.5 ring-1 ring-inset ring-indigo-100">
        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
        <div className="min-w-0 flex-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
            Problem
          </span>
          <p className="text-[12px] font-semibold leading-snug text-slate-900">{saved}</p>
        </div>

        {!disabled && (
          <button
            onClick={() => {
              setDraft(state.problemStatement);
              setEditing(true);
            }}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          >
            <Pencil className="h-2.5 w-2.5" /> Edit
          </button>
        )}

        <button
          onClick={() => synthesizeUnderstanding(state.projectId)}
          disabled={disabled || busy}
          title={`Reads your statement plus ${readable} indexed source${
            readable === 1 ? '' : 's'
          }.`}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10.5px] font-bold transition-colors ${
            state.brief?.stale && !busy
              ? 'cursor-pointer bg-amber-500 text-white hover:bg-amber-600'
              : 'cursor-pointer bg-slate-900 text-white hover:bg-slate-800'
          } disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400`}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {runLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 px-3.5 py-3">
      <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-900">
        <Target className="h-3.5 w-3.5 text-indigo-600" />
        What problem are we solving?
      </label>
      <p className="mt-0.5 text-[10px] text-slate-500">
        A few sentences is enough. Everything below is read against this, so a vague statement gets
        a vague reading.
      </p>

      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        disabled={disabled}
        placeholder="Returning customers abandon login because…"
        className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11.5px] leading-relaxed outline-none focus:border-indigo-600 disabled:cursor-not-allowed"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={run}
          disabled={disabled || busy || draft.trim() === ''}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {busy ? 'Reading…' : 'Save and build the reading'}
        </button>

        {saved !== '' && (
          <button
            onClick={() => {
              setDraft(state.problemStatement);
              setEditing(false);
            }}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}

        <span className="text-[10px] text-slate-500">
          {readable} source{readable === 1 ? '' : 's'} ready to read
        </span>
      </div>
    </div>
  );
};
