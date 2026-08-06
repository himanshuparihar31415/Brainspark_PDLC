import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import {
  canEditSpecAi,
  knowledgeReadiness,
  stageDef,
  activeStage,
  workspaceProgress,
} from '../../data/specai';
import { ArrowRight, Lock, MessageSquare, Sparkles } from 'lucide-react';

/**
 * The Spec AI door in the Command Centre, and the one place a specification
 * starts.
 *
 * A spec begins with a problem statement and nothing else, so that is what this
 * card asks for — the field is the entry point, not a button that opens a wizard
 * which then asks the same question. Once a spec exists the card stops asking and
 * starts reporting: the statement it is working from, and the two counts that
 * decide whether the reading can be trusted yet.
 */
export const SpecAiCard: React.FC<{ projectId: string; projectName: string }> = ({
  projectId,
  projectName,
}) => {
  const { specAiFor, startFromProblem, navigateTo, currentRole } = useApp();

  const state: SpecAiState = specAiFor(projectId);
  const canEdit = canEditSpecAi(currentRole);

  const [draft, setDraft] = useState('');

  /* The intake is what makes a spec exist. Before it, everything else is empty. */
  const started = Boolean(state.intake?.acceptedAt);
  const readiness = knowledgeReadiness(state);
  const openQuestions = state.questions.filter((q) => q.status === 'Open').length;
  const progress = workspaceProgress(state);
  const stage = stageDef(activeStage(state));

  /* The redesigned conversational surface. */
  const open = () => navigateTo('Spec AI v2');

  const start = () => {
    const statement = draft.trim();
    if (!statement) return;
    startFromProblem(projectId, statement);
    setDraft('');
    /* Straight into the thread — the agent starts reading on the way. */
    open();
  };

  return (
    <section
      className="platform-card overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(219,234,254,0.55) 0%, rgba(255,237,213,0.45) 100%)',
      }}
      aria-label="Spec AI"
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/60 bg-white shadow-md shadow-slate-200/50">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">
                Spec AI
                {started && (
                  <span className="font-medium text-slate-500"> · {stage.title}</span>
                )}
              </h2>
              <p className="text-[10px] font-medium text-slate-600">
                {started ? projectName : 'Requirements Intelligence Studio'}
              </p>
            </div>
          </div>

          {started && (
            <div className="shrink-0 text-right">
              <div className="font-mono text-sm font-bold text-slate-900">{progress}%</div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                worked through
              </div>
            </div>
          )}
        </div>

        {started ? (
          <>
            {/* The statement everything downstream is read against. */}
            <blockquote className="border-l-2 border-indigo-300 pl-3 text-xs leading-relaxed text-slate-700">
              {state.problemStatement || <span className="text-slate-400">No statement recorded.</span>}
            </blockquote>

            <div className="h-1 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Only the two things that block trusting the reading. */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                {readiness.conflictsOpen > 0 && (
                  <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-violet-700">
                    {readiness.conflictsOpen} to decide
                  </span>
                )}
                {openQuestions > 0 && (
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                    {openQuestions} to answer
                  </span>
                )}
                {readiness.conflictsOpen === 0 && openQuestions === 0 && (
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                    Nothing outstanding
                  </span>
                )}
                <span className="text-slate-500">
                  {readiness.sourcesReady} of {state.sources.length} sources read
                </span>
              </div>

              <button
                onClick={open}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Open chat
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </>
        ) : canEdit ? (
          <>
            <p className="text-xs leading-relaxed text-slate-600">
              Start with the problem, in your own words. One or two lines is enough — the
              agent reads what you bring in and asks for the rest.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  /* Enter sends; newlines need a modifier, as in the thread. */
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    start();
                  }
                }}
                rows={2}
                placeholder="e.g. Checkout abandonment is up 18% since the loyalty programme launched…"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs leading-relaxed text-slate-900 outline-none focus:border-indigo-600"
              />
              <button
                onClick={start}
                disabled={draft.trim() === ''}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                Start
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </>
        ) : (
          /* Read-only personas can follow the spec but not open one. */
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="text-[11px] leading-relaxed text-slate-600">
              No specification started yet. The Product Manager or Architect opens one — you
              can read along once it exists.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
