import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardCard, SpecAiState } from '../../types/specai';
import {
  CARD_TYPES,
  SOURCE_BADGE,
  cardSources,
  indexedSources,
  sourceGlyph,
} from '../../data/specai';
import { FileCheck, GitBranch, Pencil, Plus, Trash2, X } from 'lucide-react';

/** A single card. Leads with where it came from, then what it says. */
const Card: React.FC<{
  card: BoardCard;
  state: SpecAiState;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onOpen: () => void;
}> = ({ card, state, selected, disabled, onToggle, onOpen }) => {
  const meta = CARD_TYPES[card.type];
  const sources = cardSources(card, state);
  const direct = state.sources.find((s) => s.id === card.sourceId);
  const badge = direct ? SOURCE_BADGE[direct.type] : undefined;

  /* Silence means sourced. Only a guess wears a mark. */
  const isGuess =
    card.evidenceClass === 'AI assumption' || card.evidenceClass === 'Inferred interpretation';

  return (
    <article
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/card', card.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onToggle}
      onDoubleClick={onOpen}
      title={
        sources.length
          ? `From ${sources.join(' and ')} · click to select · double-click to open`
          : 'Click to select · double-click to open'
      }
      className={`rounded-xl border-2 bg-white p-2.5 transition-shadow ${meta.border} ${
        selected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
      } ${disabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} hover:shadow-md`}
    >
      {/* Where this came from */}
      <div className="flex items-center gap-1.5">
        {badge ? (
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[7px] font-bold ${badge.tint}`}
          >
            {sourceGlyph(direct.name)}
          </span>
        ) : card.type === 'Disagreement' ? (
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-rose-500" />
        ) : card.type === 'Requirement seed' ? (
          <FileCheck className="h-3.5 w-3.5 shrink-0 text-violet-500" />
        ) : (
          <Pencil className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
        )}

        <span className="min-w-0 flex-1 truncate text-[9.5px] font-bold text-slate-500">
          {sources.length > 0
            ? sources.join(' ↔ ')
            : card.type === 'Note'
            ? (card.author ?? 'Your note')
            : 'No source'}
        </span>

        {isGuess && (
          <span
            title={`${card.evidenceClass} — not something a source said`}
            className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-800"
          >
            guess
          </span>
        )}
      </div>

      {/* What it says */}
      <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-slate-900">{card.title}</p>

      {card.type === 'Disagreement' && card.conflict && (
        <div className="mt-1.5 space-y-1 border-t border-rose-100 pt-1.5">
          <p className="text-[10px] leading-snug text-slate-600">
            <span className="font-bold text-slate-400">{card.conflict.claimASource}: </span>
            {card.conflict.claimA}
          </p>
          <p className="text-[10px] leading-snug text-slate-600">
            <span className="font-bold text-slate-400">{card.conflict.claimBSource}: </span>
            {card.conflict.claimB}
          </p>
        </div>
      )}

      {/* A seed rests on other cards, so it says how much it rests on */}
      {card.type === 'Requirement seed' && card.relations.length > 0 && (
        <p className="mt-1.5 border-t border-violet-100 pt-1.5 text-[9.5px] text-slate-400">
          Rests on {card.relations.length} {card.relations.length === 1 ? 'piece' : 'pieces'} of
          context
        </p>
      )}
    </article>
  );
};

/**
 * The Requirement Chalk Board. Pieces of context from your sources, grouped by
 * what they tell you. A card's lane is its only position — drag it to another
 * lane to say it belongs somewhere else.
 */
export const ChalkBoard: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onInspect: (cardId: string) => void;
  onOpenConflict: (cardId: string) => void;
}> = ({ state, disabled, selectedIds, onSelectionChange, onInspect, onOpenConflict }) => {
  const { runBoardAction, moveCardToLane, addCard, currentUser, addToast } = useApp();

  const [composing, setComposing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [over, setOver] = useState<string | null>(null);

  const selected = state.cards.filter((c) => selectedIds.includes(c.id));

  const toggle = (id: string) =>
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:h-[32rem] max-lg:shrink-0">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-3.5 py-2.5">
        <h3 className="text-[12px] font-extrabold tracking-tight text-slate-900">
          Requirement Chalk Board
        </h3>
        <span className="text-[10px] text-slate-400">· what your sources say about this</span>

        <div className="ml-auto flex items-center gap-1.5">
          {selectedIds.length > 0 && (
            <span className="mr-0.5 text-[10px] font-bold text-indigo-600">
              {selectedIds.length} selected
            </span>
          )}
          <button
            onClick={() => {
              setDraft({ title: '', body: '' });
              setComposing('lane-proposed');
            }}
            disabled={disabled}
            title="Something you know that no source records"
            className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10.5px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Plus className="h-3 w-3" /> Note
          </button>
        </div>
      </div>

      {/* Lanes */}
      <div className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
        {/* items-start so a lane is only as tall as what is in it */}
        <div className="flex min-w-max items-start gap-2.5 p-2.5">
          {state.lanes.map((lane) => {
            const cards = state.cards.filter((c) => c.laneId === lane.id);

            return (
              <section
                key={lane.id}
                onDragOver={(e) => {
                  if (disabled) return;
                  e.preventDefault();
                  setOver(lane.id);
                }}
                onDragLeave={() => setOver((l) => (l === lane.id ? null : l))}
                onDrop={(e) => {
                  setOver(null);
                  const cardId = e.dataTransfer.getData('text/card');
                  if (cardId && !disabled) moveCardToLane(state.projectId, cardId, lane.id);
                }}
                className={`flex w-64 shrink-0 flex-col rounded-xl border transition-colors ${
                  over === lane.id
                    ? 'border-indigo-400 bg-indigo-50/70'
                    : 'border-slate-200 bg-white/70'
                }`}
              >
                <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-2.5 py-2">
                  <h4 className="min-w-0 truncate text-[10.5px] font-extrabold text-slate-700">
                    {lane.name}
                  </h4>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                    {cards.length}
                  </span>
                </header>

                <div className="space-y-2 p-2">
                  {cards.length === 0 ? (
                    <p className="px-1 py-3 text-center text-[9.5px] leading-relaxed text-slate-400">
                      Nothing here yet.
                    </p>
                  ) : (
                    cards.map((card) => (
                      <Card
                        key={card.id}
                        card={card}
                        state={state}
                        disabled={disabled}
                        selected={selectedIds.includes(card.id)}
                        onToggle={() => toggle(card.id)}
                        onOpen={() =>
                          card.type === 'Disagreement'
                            ? onOpenConflict(card.id)
                            : onInspect(card.id)
                        }
                      />
                    ))
                  )}
                </div>

                {!disabled && (
                  <div className="shrink-0 border-t border-slate-200 p-1.5">
                    <button
                      onClick={() => {
                        setDraft({ title: '', body: '' });
                        setComposing(lane.id);
                      }}
                      className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg py-1 text-[9.5px] font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    >
                      <Plus className="h-2.5 w-2.5" /> Note
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {/* What was read, and how much of it earned a place here */}
      <div className="shrink-0 border-t border-slate-200 px-3.5 py-1.5">
        <span className="text-[9.5px] text-slate-400">
          {indexedSources(state).length} sources read · {state.cards.length}{' '}
          {state.cards.length === 1 ? 'piece' : 'pieces'} on the board
        </span>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-3.5 py-2">
          <span className="min-w-0 flex-1 truncate text-[10.5px] text-slate-500">
            {[...new Set(selected.flatMap((c) => cardSources(c, state)))].join(' · ') ||
              'your notes'}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                runBoardAction(state.projectId, 'draft', selectedIds);
                onSelectionChange([]);
              }}
              disabled={disabled}
              className="cursor-pointer rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10.5px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Draft requirement
            </button>
            <button
              onClick={() => {
                runBoardAction(state.projectId, 'remove', selectedIds);
                onSelectionChange([]);
              }}
              disabled={disabled}
              title="Remove from the board"
              className="cursor-pointer rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => onSelectionChange([])}
              title="Clear selection"
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

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
            <h3 className="text-sm font-extrabold text-slate-900">Add a note</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              For something you know that none of your sources record. It goes into{' '}
              <b className="text-slate-700">
                {state.lanes.find((l) => l.id === composing)?.name ?? 'the board'}
              </b>
              .
            </p>

            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="What do you know?"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-600"
            />
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={3}
              placeholder="Any detail worth keeping (optional)"
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
                  if (!draft.title.trim()) {
                    addToast('Write what you know first.', 'error');
                    return;
                  }
                  addCard(state.projectId, {
                    laneId: composing,
                    type: 'Note',
                    state: 'Confirmed',
                    title: draft.title.trim(),
                    content: draft.body.trim(),
                    // Yours, so it is a decision rather than something a source said.
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
    </section>
  );
};
