import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState, UnderstandingKey } from '../../types/specai';
import { UNDERSTANDING_COPY } from '../../data/specai';
import { History, RefreshCw, Pencil, Check, Clock, Info } from 'lucide-react';

/** Stage 2 — Project Understanding: the convergence of everything brought in. */
export const Stage2Understanding: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const {
    updateUnderstanding,
    regenerateUnderstanding,
    setOpenQuestionStatus,
    currentUser,
  } = useApp();

  const [editingKey, setEditingKey] = useState<UnderstandingKey | null>(null);
  const [historyKey, setHistoryKey] = useState<UnderstandingKey | null>(null);

  const disabled = readOnly || locked;
  const outstanding = state.openQuestions.filter((q) => q.status === 'Open');

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_22rem]">
      <div className="min-w-0 space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-[11px] text-slate-600">
          Edits are saved as you go. Regenerating one section won’t touch your edits elsewhere.
        </span>
      </div>

      {state.understanding
        .filter((s) => s.key !== 'questions')
        .map((section) => {
          const copy = UNDERSTANDING_COPY[section.key];
          const isEditing = editingKey === section.key;
          const editor = state.sectionEditors[section.key];

          return (
            <section
              key={section.key}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">{copy.header}</h3>

                <div className="flex items-center gap-2.5">
                  {/* Soft lock — dual-persona concurrency */}
                  {editor && editor !== currentUser?.name && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                      {editor} is editing this section
                    </span>
                  )}

                  <button
                    onClick={() => setHistoryKey(historyKey === section.key ? null : section.key)}
                    className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    <History className="h-3 w-3" />
                    {section.versions} versions
                  </button>

                  {!disabled && (
                    <>
                      <button
                        onClick={() => setEditingKey(isEditing ? null : section.key)}
                        className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {isEditing ? (
                          <>
                            <Check className="h-3 w-3" /> Done
                          </>
                        ) : (
                          <>
                            <Pencil className="h-3 w-3" /> Edit
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => regenerateUnderstanding(state.projectId, section.key)}
                        className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                      >
                        <RefreshCw className="h-3 w-3" /> Regenerate this section
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea
                  autoFocus
                  value={section.body}
                  onChange={(e) => updateUnderstanding(state.projectId, section.key, e.target.value)}
                  rows={5}
                  placeholder={copy.helper}
                  className="mt-3 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-600"
                />
              ) : section.body.trim() === '' ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                  {copy.helper}
                </p>
              ) : (
                <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                  {section.body}
                </p>
              )}

              {historyKey === section.key && (
                <div className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Version history
                  </div>
                  {Array.from({ length: section.versions }, (_, i) => section.versions - i).map(
                    (v) => (
                      <div
                        key={v}
                        className="flex items-center justify-between gap-2 text-[10px] text-slate-600"
                      >
                        <span className="font-mono font-bold">v{v}</span>
                        <span className="text-slate-400">
                          {v === section.versions ? 'current' : 'superseded'}
                        </span>
                      </div>
                    )
                  )}
                  {section.versions === 0 && (
                    <p className="text-[10px] text-slate-400">No versions stored yet.</p>
                  )}
                </div>
              )}
            </section>
          );
        })}

      </div>

      {/* Open questions — an action list, not buried prose */}
      <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-6">
        <h3 className="text-sm font-extrabold text-slate-900">
          Open questions ({outstanding.length})
        </h3>

        {state.openQuestions.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
            {UNDERSTANDING_COPY.questions.helper}
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {state.openQuestions.map((q) => (
              <div key={q.id} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    q.status === 'Open'
                      ? 'bg-amber-100 text-amber-800'
                      : q.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {q.status}
                </span>

                <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-800">
                  {q.text}
                </p>

                {q.status === 'Open' && !disabled && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setOpenQuestionStatus(state.projectId, q.id, 'Resolved')}
                      className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-emerald-600 hover:underline"
                    >
                      <Check className="h-3 w-3" /> Resolve
                    </button>
                    <button
                      onClick={() => setOpenQuestionStatus(state.projectId, q.id, 'Deferred')}
                      className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:underline"
                    >
                      <Clock className="h-3 w-3" /> Defer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
