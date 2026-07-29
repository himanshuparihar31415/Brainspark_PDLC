import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardCard, CardType, SpecAiState } from '../../types/specai';
import { BOARD_ACTIONS, CARD_STATES, CARD_TYPES, EVIDENCE_CLASSES } from '../../data/specai';
import {
  FileText,
  Eye,
  Sparkles,
  HelpCircle,
  GitBranch,
  Lock,
  Check,
  FileCheck,
  Plus,
  Bot,
  X,
} from 'lucide-react';

const ICONS: Record<CardTypeMetaIcon, React.ElementType> = {
  file: FileText,
  eye: Eye,
  spark: Sparkles,
  question: HelpCircle,
  split: GitBranch,
  lock: Lock,
  check: Check,
  'file-check': FileCheck,
};

type CardTypeMetaIcon = 'file' | 'eye' | 'spark' | 'question' | 'split' | 'lock' | 'check' | 'file-check';

const ADDABLE: CardType[] = ['Evidence', 'Observation', 'Idea', 'Question', 'Constraint', 'Decision'];

/** Compact card: title, two-line preview, source badge, state, confidence. */
const Card: React.FC<{
  card: BoardCard;
  selected: boolean;
  onToggle: () => void;
  onInspect: () => void;
}> = ({ card, selected, onToggle, onInspect }) => {
  const meta = CARD_TYPES[card.type];
  const Icon = ICONS[meta.icon];

  return (
    <div
      onClick={onToggle}
      onDoubleClick={onInspect}
      title="Click to select · double-click to inspect"
      className={`cursor-pointer rounded-xl border bg-white p-2.5 transition-all hover:shadow-md ${
        meta.border
      } ${selected ? 'ring-2 ring-indigo-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${meta.chip}`}
        >
          <Icon className="h-2.5 w-2.5" />
          {card.type}
        </span>
        {card.aiCreated && (
          <span
            title="AI-created — confirm before it can become a requirement seed"
            className="flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-800"
          >
            <Bot className="h-2.5 w-2.5" />
            AI
          </span>
        )}
      </div>

      <h4 className="mt-1.5 text-[11px] font-bold leading-tight text-slate-900">{card.title}</h4>
      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-600">{card.content}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-1.5">
        <span
          className={`rounded px-1 py-0.5 text-[8px] font-bold ${
            EVIDENCE_CLASSES[card.evidenceClass].chip
          }`}
          title={card.evidenceClass}
        >
          {EVIDENCE_CLASSES[card.evidenceClass].short}
        </span>
        <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${CARD_STATES[card.state].chip}`}>
          {card.state}
        </span>
        {card.provenance && (
          <span className="truncate text-[8px] text-slate-400">{card.provenance.system}</span>
        )}
        {card.confidence !== undefined && (
          <span className="ml-auto font-mono text-[8px] text-slate-400">
            {Math.round(card.confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * The Requirement Chalk Board. Constrained rather than free-floating: cards sit
 * in named lanes, carry one of eight types, and advance through a visible
 * lifecycle. AI acts on the selection, never on the board as a whole.
 */
export const BoardCanvas: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onInspect: (cardId: string) => void;
}> = ({ state, disabled, selectedIds, onSelectionChange, onInspect }) => {
  const { runBoardAction, moveCardToLane, addCard, addLane, renameLane, currentUser } = useApp();

  const [composing, setComposing] = useState<{ type: CardType; laneId: string } | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [renaming, setRenaming] = useState<string | null>(null);

  const selected = state.cards.filter((c) => selectedIds.includes(c.id));
  const typeSummary = [...new Set(selected.map((c) => c.type))].join(', ');

  const toggle = (id: string) =>
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Lanes */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
        {state.lanes.map((lane) => {
          const cards = state.cards.filter((c) => c.laneId === lane.id);

          return (
            <section
              key={lane.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const cardId = e.dataTransfer.getData('text/card');
                if (cardId) moveCardToLane(state.projectId, cardId, lane.id);
              }}
              className="flex min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-slate-50/60"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                {renaming === lane.id ? (
                  <input
                    autoFocus
                    defaultValue={lane.name}
                    onBlur={(e) => {
                      renameLane(state.projectId, lane.id, e.target.value || lane.name);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    className="min-w-0 flex-1 rounded border border-indigo-300 px-1.5 py-0.5 text-[11px] font-bold outline-none"
                  />
                ) : (
                  <button
                    onDoubleClick={() => !disabled && setRenaming(lane.id)}
                    title={disabled ? undefined : 'Double-click to rename'}
                    className="min-w-0 truncate text-left text-[11px] font-extrabold text-slate-800"
                  >
                    {lane.name}
                  </button>
                )}
                <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                  {cards.length}
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                {cards.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[10px] text-slate-400">
                    Pull something from your sources, add a rough note, or describe the feature you
                    are exploring.
                  </p>
                ) : (
                  cards.map((card) => (
                    <div
                      key={card.id}
                      draggable={!disabled}
                      onDragStart={(e) => e.dataTransfer.setData('text/card', card.id)}
                    >
                      <Card
                        card={card}
                        selected={selectedIds.includes(card.id)}
                        onToggle={() => toggle(card.id)}
                        onInspect={() => onInspect(card.id)}
                      />
                    </div>
                  ))
                )}
              </div>

              {!disabled && (
                <div className="border-t border-slate-200 p-1.5">
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setComposing({ type: e.target.value as CardType, laneId: lane.id });
                      setDraft({ title: '', body: '' });
                    }}
                    className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-600"
                  >
                    <option value="">+ Add card…</option>
                    {ADDABLE.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!disabled && (
        <button
          onClick={() => addLane(state.projectId, `Lane ${state.lanes.length + 1}`)}
          className="mt-2 flex w-fit cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
        >
          <Plus className="h-2.5 w-2.5" /> Add lane
        </button>
      )}

      {/* Selection-scoped action bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        {selectedIds.length === 0 ? (
          <span className="text-[11px] text-slate-500">Select cards to use AI actions.</span>
        ) : (
          <>
            <span className="text-[11px] font-bold text-slate-800">
              Ask about {selectedIds.length} selected card{selectedIds.length === 1 ? '' : 's'}
            </span>
            <span className="text-[10px] text-slate-400">{typeSummary}</span>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {BOARD_ACTIONS.map((a) => {
                const ok = selectedIds.length >= a.minSelection;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      runBoardAction(state.projectId, a.id, selectedIds);
                      onSelectionChange([]);
                    }}
                    disabled={disabled || !ok}
                    title={ok ? undefined : `Needs at least ${a.minSelection} cards`}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                      a.id === 'remove'
                        ? 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                        : a.id === 'draft'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    } ${!ok || disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  >
                    {a.label}
                  </button>
                );
              })}
              <button
                onClick={() => onSelectionChange([])}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                title="Clear selection"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Compose dialog */}
      {composing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setComposing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md animate-in zoom-in-95 rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h3 className="text-sm font-extrabold text-slate-900">Add {composing.type}</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Required: {CARD_TYPES[composing.type].requiredFields.join(' · ')}
            </p>

            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Title"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-600"
            />
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={3}
              placeholder="Describe the item…"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-600"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setComposing(null)}
                className="cursor-pointer rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addCard(state.projectId, {
                    laneId: composing.laneId,
                    type: composing.type,
                    state: 'Captured',
                    title: draft.title.trim() || 'Untitled item',
                    content: draft.body.trim() || 'Rough note.',
                    // Hand-entered content is a user decision, not a sourced fact.
                    evidenceClass: 'User decision',
                    author: currentUser?.name,
                    aiCreated: false,
                  });
                  setComposing(null);
                }}
                className="cursor-pointer rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Add to board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
