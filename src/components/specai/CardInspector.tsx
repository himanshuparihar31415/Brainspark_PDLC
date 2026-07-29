import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CardState, RelationKind, SpecAiState } from '../../types/specai';
import { CARD_STATES, CARD_TYPES, EVIDENCE_CLASSES, RELATION_KINDS } from '../../data/specai';
import { Bot, ExternalLink, Info, Link2, X } from 'lucide-react';

/** Lifecycle transitions offered from each state. */
const NEXT_STATE: Partial<Record<CardState, { label: string; to: CardState }[]>> = {
  Captured: [{ label: 'Confirm', to: 'Confirmed' }],
  Interpreted: [
    { label: 'Confirm', to: 'Confirmed' },
    { label: 'Reject', to: 'Superseded' },
  ],
  Flagged: [
    { label: 'Mark assumption', to: 'Confirmed' },
    { label: 'Supersede', to: 'Superseded' },
  ],
  Confirmed: [],
  'Requirement seed': [],
  Superseded: [],
};

/**
 * Right-drawer inspector. Shows the full provenance chain, the evidence class,
 * the lifecycle position, and — for generated content — why it was produced.
 */
export const CardInspector: React.FC<{
  state: SpecAiState;
  cardId: string | null;
  readOnly: boolean;
  onClose: () => void;
  onOpenConflict: (cardId: string) => void;
}> = ({ state, cardId, readOnly, onClose, onOpenConflict }) => {
  const { setCardState, createRequirementSeed, linkCards } = useApp();
  const [linkTarget, setLinkTarget] = useState('');
  const [linkKind, setLinkKind] = useState<RelationKind>('Supports');

  const card = state.cards.find((c) => c.id === cardId);
  if (!card) return null;

  const meta = CARD_TYPES[card.type];
  const transitions = NEXT_STATE[card.state] ?? [];

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/20 animate-in fade-in" />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${meta.chip}`}>
              {meta.label}
            </span>
            <h3 className="mt-1.5 text-sm font-extrabold leading-tight text-slate-900">
              {card.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-xs leading-relaxed text-slate-700">{card.content}</p>

          {/* Evidence hierarchy — never blur a fact with a guess */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                EVIDENCE_CLASSES[card.evidenceClass].chip
              }`}
            >
              {card.evidenceClass}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${CARD_STATES[card.state].chip}`}
            >
              {card.state}
            </span>
            {card.aiCreated && (
              <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                <Bot className="h-2.5 w-2.5" /> AI-created
              </span>
            )}
            {card.confidence !== undefined && (
              <span className="font-mono text-[10px] text-slate-500">
                confidence {Math.round(card.confidence * 100)}%
              </span>
            )}
          </div>

          {/* Provenance */}
          {card.provenance ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Provenance
              </div>
              <dl className="space-y-1.5 text-[10px]">
                {[
                  ['System', card.provenance.system],
                  ['Item', card.provenance.itemId ?? '—'],
                  ['Indexed', card.provenance.indexedAt],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="truncate font-semibold text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] italic leading-relaxed text-slate-600">
                {card.provenance.excerpt}
              </p>
              {card.provenance.deepLink && (
                <a
                  href={card.provenance.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Open in {card.provenance.system} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[10px] text-slate-400">
              No source item — this card was authored in the workspace.
            </p>
          )}

          {/* Why this was generated */}
          {card.rationale && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
              <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                <Info className="h-2.5 w-2.5" /> Why this was generated
              </div>
              <p className="text-[10px] leading-relaxed text-blue-900">{card.rationale}</p>
            </div>
          )}

          {/* Question ownership */}
          {card.type === 'Question' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[10px]">
              <div className="flex justify-between">
                <span className="text-amber-700">Owner</span>
                <b className="text-amber-900">{card.owner ?? 'Unassigned'}</b>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-amber-700">Due state</span>
                <b className="text-amber-900">{card.dueState ?? '—'}</b>
              </div>
            </div>
          )}

          {/* Relationships */}
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <Link2 className="h-2.5 w-2.5" /> Relationships ({card.relations.length})
            </div>
            {card.relations.length === 0 ? (
              <p className="text-[10px] text-slate-400">No links yet.</p>
            ) : (
              <div className="space-y-1">
                {card.relations.map((r) => (
                  <div
                    key={r.toCardId + r.kind}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5"
                  >
                    <span className="rounded bg-slate-100 px-1 py-0.5 text-[8px] font-bold text-slate-600">
                      {r.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-slate-700">
                      {state.cards.find((c) => c.id === r.toCardId)?.title ?? r.toCardId}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!readOnly && (
              <div className="mt-2 flex items-center gap-1.5">
                <select
                  value={linkKind}
                  onChange={(e) => setLinkKind(e.target.value as RelationKind)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-1.5 py-1 text-[10px] outline-none focus:border-indigo-600"
                >
                  {RELATION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <select
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(e.target.value)}
                  className="min-w-0 flex-1 cursor-pointer rounded-lg border border-slate-200 px-1.5 py-1 text-[10px] outline-none focus:border-indigo-600"
                >
                  <option value="">Link to…</option>
                  {state.cards
                    .filter((c) => c.id !== card.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title.slice(0, 40)}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    if (!linkTarget) return;
                    linkCards(state.projectId, card.id, linkTarget, linkKind);
                    setLinkTarget('');
                  }}
                  disabled={!linkTarget}
                  className="shrink-0 cursor-pointer rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                >
                  Link
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Allowed next
            </div>
            <p className="text-[10px] text-slate-600">
              {CARD_STATES[card.state].nextActions.join(' · ')}
            </p>
          </div>
        </div>

        {/* Lifecycle actions */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3.5">
            {card.conflict && card.state === 'Flagged' && (
              <button
                onClick={() => onOpenConflict(card.id)}
                className="cursor-pointer rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700"
              >
                Resolve conflict
              </button>
            )}
            {transitions.map((t) => (
              <button
                key={t.to}
                onClick={() => setCardState(state.projectId, card.id, t.to)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                {t.label}
              </button>
            ))}
            {card.state === 'Confirmed' && (
              <button
                onClick={() => {
                  createRequirementSeed(state.projectId, [card.id]);
                  onClose();
                }}
                className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"
              >
                Create requirement seed
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
