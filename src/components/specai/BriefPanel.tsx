import React from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import {
  BRIEF_BANDS,
  BRIEF_BAND_COPY,
  EVIDENCE_CLASSES,
  indexedSources,
} from '../../data/specai';
import { QuestionQueue } from './QuestionQueue';
import { AlertTriangle, Loader2, MessageSquare, RefreshCw, Sparkles } from 'lucide-react';

/**
 * What the agent currently understands about the project, long enough to read on
 * its own. The bands are never merged: a brief that blurs what is known with what
 * is guessed is worse than none, because it launders assumptions into facts.
 *
 * It is provisional by design. Settling a question with the agent marks it out of
 * date, and refreshing folds the answer in — so the brief improves as you use it
 * rather than staying a first impression.
 */
export const BriefPanel: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  onTalkToAgent: () => void;
}> = ({ state, disabled, onTalkToAgent }) => {
  const { synthesizeUnderstanding } = useApp();

  const brief = state.brief;
  const busy = Boolean(state.generating);
  const readable = indexedSources(state).length;

  if (busy)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        <p className="text-[10.5px] text-slate-500">{state.generating}</p>
      </div>
    );

  if (!brief)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Sparkles className="h-5 w-5 text-slate-300" />
        <p className="text-[10.5px] leading-relaxed text-slate-500">
          No brief yet. Once you have stated the problem, the agent reads across everything indexed
          and writes up what it understands, what it is assuming, and what is still missing.
        </p>
        <button
          onClick={() => synthesizeUnderstanding(state.projectId)}
          disabled={disabled}
          className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-[10.5px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Write the brief
        </button>
      </div>
    );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
          v{brief.version}
        </span>
        <span className="text-[9.5px] text-slate-400">
          from {brief.generatedFrom.sourceIds.length} sources
        </span>
        <button
          onClick={onTalkToAgent}
          className="ml-auto flex cursor-pointer items-center gap-1 text-[9.5px] font-bold text-indigo-600 hover:underline"
        >
          <MessageSquare className="h-2.5 w-2.5" /> Talk to the agent
        </button>
      </div>

      {brief.stale && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2">
          <p className="flex items-start gap-1.5 text-[10px] font-bold leading-relaxed text-amber-900">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
            {brief.staleReason ?? 'Inputs changed since this was written.'}
          </p>
          <button
            onClick={() => synthesizeUnderstanding(state.projectId)}
            disabled={disabled}
            className="mt-1.5 flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[9.5px] font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Refresh from {readable} sources
          </button>
        </div>
      )}

      {/* The narrative — readable on its own, without the detail below it */}
      <div className="space-y-2 border-b border-slate-200 pb-3">
        {brief.summary.split('\n\n').map((para, i) => (
          <p
            key={i}
            className={`leading-relaxed ${
              i === 0 ? 'text-[11.5px] font-semibold text-slate-900' : 'text-[11px] text-slate-600'
            }`}
          >
            {para}
          </p>
        ))}
      </div>

      {/* The detail behind it, kept in separate bands */}
      <div className="mt-3 space-y-3.5">
        {BRIEF_BANDS.map((key) => {
          const copy = BRIEF_BAND_COPY[key];
          const lines = brief.bands[key];
          if (lines.length === 0) return null;

          return (
            <section key={key}>
              <h4 className="text-[11px] font-extrabold tracking-tight text-slate-900">
                {copy.header}
                <span className="ml-1.5 font-mono text-[9px] font-bold text-slate-400">
                  {lines.length}
                </span>
              </h4>
              <p className="mt-0.5 text-[9.5px] leading-snug text-slate-400">{copy.helper}</p>

              <div className="mt-1.5 space-y-1.5">
                {lines.map((l) => (
                  <div
                    key={l.id}
                    className={`rounded-r-lg border-l-2 bg-slate-50/70 py-1.5 pl-2.5 pr-2 ${copy.accent}`}
                  >
                    <p className="text-[10.5px] leading-relaxed text-slate-700">{l.text}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {/* Silence means sourced — only a guess is marked. */}
                      {(l.evidenceClass === 'AI assumption' ||
                        l.evidenceClass === 'Inferred interpretation') && (
                        <span
                          className={`rounded px-1 py-0.5 text-[8px] font-bold ${
                            EVIDENCE_CLASSES[l.evidenceClass].chip
                          }`}
                          title={l.evidenceClass}
                        >
                          {EVIDENCE_CLASSES[l.evidenceClass].short}
                        </span>
                      )}
                      <span
                        title={l.sourceSummary}
                        className="min-w-0 flex-1 truncate text-[9px] text-slate-400"
                      >
                        {l.sourceSummary}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* What the agent needs answered, settled inline */}
      <div className="mt-4 border-t border-slate-200 pt-3">
        <QuestionQueue state={state} disabled={disabled} />
      </div>

    </div>
  );
};
