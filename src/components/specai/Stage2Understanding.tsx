import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState, UnderstandingKey } from '../../types/specai';
import { CARD_TYPES, UNDERSTANDING_COPY } from '../../data/specai';
import { History, RefreshCw, Pencil, Check, Link2, ChevronDown } from 'lucide-react';

/** Stage 2 — Project Understanding and the formal requirement register. */
export const Stage2Understanding: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const { updateUnderstanding, regenerateUnderstanding, currentUser } = useApp();

  const [editing, setEditing] = useState<UnderstandingKey | null>(null);
  const [sourceMap, setSourceMap] = useState<UnderstandingKey | null>(null);
  const [openReq, setOpenReq] = useState<string | null>(null);

  const disabled = readOnly || locked;

  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      {/* Understanding sections */}
      <div className="min-w-0 space-y-3">
        {state.understanding.map((section) => {
          const copy = UNDERSTANDING_COPY[section.key];
          const isEditing = editing === section.key;
          const editor = state.sectionEditors[section.key];
          const cards = state.cards.filter((c) => section.supportingCardIds.includes(c.id));

          return (
            <section key={section.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">{copy.header}</h3>

                <div className="flex flex-wrap items-center gap-2">
                  {editor && editor !== currentUser?.name && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                      {editor} is editing this section
                    </span>
                  )}

                  {cards.length > 0 && (
                    <button
                      onClick={() => setSourceMap(sourceMap === section.key ? null : section.key)}
                      className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      <Link2 className="h-3 w-3" />
                      {cards.length} sources
                    </button>
                  )}

                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <History className="h-3 w-3" />
                    {section.versions} versions
                  </span>

                  {!disabled && (
                    <>
                      <button
                        onClick={() => setEditing(isEditing ? null : section.key)}
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
                        <RefreshCw className="h-3 w-3" /> Regenerate
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
                  rows={4}
                  placeholder={copy.helper}
                  className="mt-2.5 w-full rounded-xl border border-indigo-300 px-3 py-2 text-xs leading-relaxed outline-none focus:border-indigo-600"
                />
              ) : section.body.trim() === '' ? (
                <p className="mt-2.5 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[11px] text-slate-400">
                  {copy.helper}
                </p>
              ) : (
                <p className="mt-2.5 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                  {section.body}
                </p>
              )}

              {/* Source map — every statement traces back to an extract */}
              {sourceMap === section.key && (
                <div className="mt-2.5 space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Supporting cards
                  </div>
                  {cards.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-[10px]">
                      <span className="shrink-0 rounded bg-white px-1 py-0.5 font-bold text-slate-600">
                        {CARD_TYPES[c.type].label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-700">{c.title}</span>
                      {c.provenance && (
                        <span className="shrink-0 text-slate-400">{c.provenance.system}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Formal requirement register */}
      <aside className="min-w-0 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-extrabold text-slate-900">
            Formal requirements ({state.requirements.length})
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Promoted from confirmed seeds, with the evidence retained.
          </p>
        </div>

        {state.requirements.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[11px] text-slate-400">
            No confirmed requirements yet.
          </p>
        ) : (
          state.requirements.map((req) => {
            const open = openReq === req.id;
            return (
              <article
                key={req.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <button
                  onClick={() => setOpenReq(open ? null : req.id)}
                  className="flex w-full cursor-pointer items-start justify-between gap-2 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-indigo-600">
                        {req.id}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          req.priority === 'P0'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {req.priority}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                        {req.type}
                      </span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        {req.status}
                      </span>
                    </div>
                    <h4 className="mt-1 text-xs font-bold leading-tight text-slate-900">
                      {req.title}
                    </h4>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {open && (
                  <div className="space-y-2 border-t border-slate-200 px-4 py-3">
                    {(
                      [
                        ['Actor', req.actor],
                        ['Need', req.need],
                        ['Business value', req.businessValue],
                        ['Preconditions', req.preconditions],
                        ['Main behavior', req.mainBehavior],
                        ['Fallback', req.fallback ?? '—'],
                        ['Owner', req.owner],
                        ['Evidence', req.evidenceSummary],
                        ['Confidence', `${Math.round(req.confidence * 100)}%`],
                      ] as [string, string][]
                    ).map(([k, v]) => (
                      <div key={k} className="text-[10px] leading-relaxed">
                        <span className="font-bold text-slate-500">{k}: </span>
                        <span className="text-slate-800">{v}</span>
                      </div>
                    ))}

                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Acceptance criteria ({req.acceptance.length} scenarios)
                      </div>
                      {req.acceptance.map((ac) => (
                        <p
                          key={ac.id}
                          className="mb-1.5 font-mono text-[9px] leading-relaxed text-slate-700"
                        >
                          <b className="text-slate-500">Given</b> {ac.given}
                          <br />
                          <b className="text-slate-500">When</b> {ac.when}
                          <br />
                          <b className="text-slate-500">Then</b> {ac.then}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </aside>
    </div>
  );
};
