import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QuestionStatus, SpecAiState } from '../../types/specai';
import { QUESTION_STATUS_CHIP, QUESTION_TRACKS, QUESTION_TRACK_COPY } from '../../data/specai';
import { AlertTriangle, Check, HelpCircle, RotateCcw } from 'lucide-react';

/**
 * Everything the reading could not settle, split by who has to settle it.
 *
 * Open architecture questions hold the stage gate, because an unanswered "where
 * does this live?" propagates into every artifact generated downstream. All three
 * exits count — answered, assumed, or deferred — since a recorded assumption is
 * traceable and silence is not.
 */
export const QuestionQueue: React.FC<{
  state: SpecAiState;
  disabled: boolean;
}> = ({ state, disabled }) => {
  const { answerQuestion } = useApp();

  const [answering, setAnswering] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const open = state.questions.filter((q) => q.status === 'Open');
  const openArch = open.filter((q) => q.track === 'Architecture');

  const settle = (id: string, status: QuestionStatus) => {
    answerQuestion(state.projectId, id, status, draft);
    setAnswering(null);
    setDraft('');
  };

  if (state.questions.length === 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <HelpCircle className="h-5 w-5 text-slate-300" />
        <p className="text-[10.5px] leading-relaxed text-slate-500">
          No questions yet. Build the reading and anything the sources cannot answer lands here.
        </p>
      </div>
    );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        <span className="text-[9.5px] text-slate-400">
          {open.length} open · {state.questions.length - open.length} settled
        </span>
      </div>

      {openArch.length > 0 && (
        <p className="mb-2.5 flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-bold leading-relaxed text-amber-900">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          {openArch.length} architecture question{openArch.length === 1 ? '' : 's'} hold the stage
          gate. Answering, assuming, or deferring all clear it.
        </p>
      )}

      <div className="space-y-3">
        {QUESTION_TRACKS.map((track) => {
          const items = state.questions.filter((q) => q.track === track);
          if (items.length === 0) return null;

          return (
            <section key={track}>
              <h4 className="flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-tight text-slate-900">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    QUESTION_TRACK_COPY[track].chip
                  }`}
                >
                  {track}
                </span>
                <span className="font-mono text-[9px] font-bold text-slate-400">
                  {items.filter((q) => q.status === 'Open').length}/{items.length}
                </span>
              </h4>
              <p className="mt-0.5 text-[9.5px] leading-snug text-slate-400">
                {QUESTION_TRACK_COPY[track].helper}
              </p>

              <div className="mt-1.5 space-y-1.5">
                {items.map((q) => (
                  <article
                    key={q.id}
                    className={`rounded-xl border bg-white p-2.5 ${
                      q.status === 'Open' ? 'border-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="min-w-0 flex-1 text-[10.5px] font-bold leading-snug text-slate-900">
                        {q.text}
                      </p>
                      <span
                        className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold ${
                          QUESTION_STATUS_CHIP[q.status]
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>

                    <p className="mt-1 text-[9.5px] leading-relaxed text-slate-500">{q.rationale}</p>

                    {q.answer && (
                      <p className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] leading-relaxed text-slate-700">
                        {q.answer}
                      </p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-1.5">
                      <span className="mr-auto truncate text-[9px] text-slate-400">{q.owner}</span>

                      {disabled ? null : q.status !== 'Open' ? (
                        <button
                          onClick={() => answerQuestion(state.projectId, q.id, 'Open')}
                          className="flex cursor-pointer items-center gap-1 text-[9.5px] font-bold text-slate-500 hover:text-slate-800"
                        >
                          <RotateCcw className="h-2.5 w-2.5" /> Reopen
                        </button>
                      ) : answering === q.id ? null : (
                        <>
                          <button
                            onClick={() => {
                              setAnswering(q.id);
                              setDraft('');
                            }}
                            className="cursor-pointer rounded bg-indigo-600 px-1.5 py-0.5 text-[9.5px] font-bold text-white hover:bg-indigo-700"
                          >
                            Answer…
                          </button>
                          <button
                            onClick={() => answerQuestion(state.projectId, q.id, 'Assumed')}
                            title="Record it as an assumption — traceable, and revisitable later."
                            className="cursor-pointer rounded border border-slate-200 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            Assume
                          </button>
                          <button
                            onClick={() => answerQuestion(state.projectId, q.id, 'Deferred')}
                            className="cursor-pointer rounded border border-slate-200 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            Defer
                          </button>
                        </>
                      )}
                    </div>

                    {answering === q.id && (
                      <div className="mt-1.5">
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={2}
                          placeholder="What is the answer?"
                          className="w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] outline-none focus:border-indigo-600"
                        />
                        <div className="mt-1 flex items-center gap-1.5">
                          <button
                            onClick={() => settle(q.id, 'Answered')}
                            disabled={draft.trim() === ''}
                            className="flex cursor-pointer items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[9.5px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            <Check className="h-2.5 w-2.5" /> Save
                          </button>
                          <button
                            onClick={() => {
                              setAnswering(null);
                              setDraft('');
                            }}
                            className="cursor-pointer rounded border border-slate-200 px-2 py-0.5 text-[9.5px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
