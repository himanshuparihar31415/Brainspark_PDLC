import React from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import { BRIEF_BANDS, BRIEF_BAND_COPY, EVIDENCE_CLASSES, indexedSources } from '../../data/specai';
import { QuestionQueue } from './QuestionQueue';
import { AlertTriangle, ArrowUpRight, Loader2, RefreshCw, Scale, Sparkles } from 'lucide-react';

/**
 * The project brief — what the agent understands, written out of the conversation
 * in the terminal beside it. Every line arrived from a turn there, which is why
 * every line can name where it came from.
 *
 * The bands are never merged: a brief that blurs what is known with what is
 * guessed is worse than none, because it launders assumptions into facts.
 */
export const BriefPanel: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  /** Opens a disagreement for resolution. */
  onResolve: (cardId: string) => void;
}> = ({ state, disabled, onResolve }) => {
  const { askAgent, promoteBriefLine } = useApp();

  const brief = state.brief;
  const busy = Boolean(state.generating);
  const readable = indexedSources(state).length;
  const exchanges = state.transcript.filter((t) => t.from === 'you').length;
  const seeds = state.cards.filter((c) => c.type === 'Requirement seed');
  const seeded = new Set(seeds.map((c) => c.title.toLowerCase()));
  const disagreements = state.cards.filter(
    (c) => c.type === 'Disagreement' && c.state === 'Flagged'
  );

  const header = (
    <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 px-3.5 py-2.5">
      <span className="text-[10.5px] font-extrabold text-slate-900">Project brief</span>
      {brief && (
        <>
          <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
            v{brief.version}
          </span>
          <span className="text-[9.5px] text-slate-400">
            {exchanges === 0
              ? 'from the opening read'
              : `grown over ${exchanges} exchange${exchanges === 1 ? '' : 's'}`}
          </span>
        </>
      )}
    </div>
  );

  if (busy && !brief)
    return (
      <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:h-96 lg:h-full lg:w-72 xl:w-96">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <p className="text-[10.5px] text-slate-500">{state.generating}</p>
        </div>
      </aside>
    );

  if (!brief)
    return (
      <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:h-96 lg:h-full lg:w-72 xl:w-96">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Sparkles className="h-5 w-5 text-slate-300" />
          <p className="text-[10.5px] leading-relaxed text-slate-500">
            Nothing here yet. This fills itself from the terminal: whatever the agent reads or you
            decide lands here with its source attached, and the brief grows as you talk.
          </p>
        </div>
      </aside>
    );

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:h-[30rem] lg:h-full lg:w-72 xl:w-96">
      {header}

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {brief.stale && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2">
            <p className="flex items-start gap-1.5 text-[10px] font-bold leading-relaxed text-amber-900">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
              {brief.staleReason ?? 'Inputs changed since this was written.'}
            </p>
            <button
              onClick={() => askAgent(state.projectId, '')}
              disabled={disabled || busy}
              className="mt-1.5 flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[9.5px] font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-2.5 w-2.5" /> Re-read {readable} source
              {readable === 1 ? '' : 's'}
            </button>
          </div>
        )}

        {/* What has to be decided before anything downstream is safe */}
        {disagreements.length > 0 && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50/70 px-2.5 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-rose-900">
              <Scale className="h-3 w-3" />
              {disagreements.length} thing{disagreements.length === 1 ? '' : 's'} your sources
              disagree on
            </p>
            <div className="mt-1.5 space-y-1">
              {disagreements.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onResolve(c.id)}
                  className="flex w-full cursor-pointer items-start gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1.5 text-left hover:border-rose-300"
                >
                  <span className="min-w-0 flex-1 text-[10px] font-semibold leading-snug text-slate-800">
                    {c.title}
                  </span>
                  <ArrowUpRight className="mt-px h-2.5 w-2.5 shrink-0 text-rose-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* The narrative — readable on its own, without the detail below it */}
        <div className="space-y-2 border-b border-slate-200 pb-3">
          {brief.summary.split('\n\n').map((para, i) => (
            <p
              key={i}
              className={`leading-relaxed ${
                i === 0
                  ? 'text-[11.5px] font-semibold text-slate-900'
                  : 'text-[11px] text-slate-600'
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

            /* Only sourced or decided lines can become requirements. Promoting a
               guess would be the exact laundering the bands exist to prevent. */
            const promotable = key === 'understood' || key === 'decided';

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
                  {lines.map((l) => {
                    const isSeed = seeded.has(l.text.toLowerCase());

                    return (
                      <div
                        key={l.id}
                        className={`group rounded-r-lg border-l-2 bg-slate-50/70 py-1.5 pl-2.5 pr-2 ${copy.accent}`}
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

                          {promotable &&
                            !disabled &&
                            (isSeed ? (
                              <span className="shrink-0 text-[8.5px] font-bold text-emerald-700">
                                requirement
                              </span>
                            ) : (
                              <button
                                onClick={() => promoteBriefLine(state.projectId, l.id)}
                                title="Make this a requirement seed. The line stays here."
                                className="shrink-0 cursor-pointer text-[8.5px] font-bold text-indigo-600 opacity-0 transition-opacity hover:underline focus:opacity-100 group-hover:opacity-100"
                              >
                                → requirement
                              </button>
                            ))}
                        </div>
                      </div>
                    );
                  })}
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
    </aside>
  );
};
