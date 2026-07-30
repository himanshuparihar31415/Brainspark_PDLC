import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardCard, SpecAiState } from '../../types/specai';
import { CARD_TYPES, SOURCE_BADGE, indexedSources } from '../../data/specai';
import { FileCheck, GitBranch, Pencil, Plus, Trash2, X } from 'lucide-react';

/** Card footprint on the canvas, in pixels. Drives both layout and canvas size. */
const CARD_W = 224;
const ROW_H = 232;
const COL_W = 248;

type Placed = { card: BoardCard; x: number; y: number };

/**
 * The Requirement Chalk Board — a rough discovery space rather than a document.
 * Cards sit wherever you put them, carry one of eight constrained types, and
 * advance through a visible lifecycle. Position is presentational; the lane a
 * card belongs to is what grouping and downstream stages read.
 */
export const ChalkBoard: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onInspect: (cardId: string) => void;
  onOpenConflict: (cardId: string) => void;
}> = ({ state, disabled, selectedIds, onSelectionChange, onInspect, onOpenConflict }) => {
  const { runBoardAction, updateCard, addCard, currentUser, addToast } = useApp();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    offX: number;
    offY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  /** Live position while dragging, so the card follows the pointer without a commit per frame. */
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [composing, setComposing] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '' });

  /** Cards the AI just created have no position yet; they land below the arrangement. */
  const placed: Placed[] = useMemo(() => {
    const anchored = state.cards.filter((c) => c.x !== undefined && c.y !== undefined);
    const loose = state.cards.filter((c) => c.x === undefined || c.y === undefined);
    const baseY = anchored.length ? Math.max(...anchored.map((c) => c.y as number)) + ROW_H : 24;

    return [
      ...anchored.map((c) => ({ card: c, x: c.x as number, y: c.y as number })),
      ...loose.map((c, i) => ({
        card: c,
        x: 24 + (i % 4) * COL_W,
        y: baseY + Math.floor(i / 4) * ROW_H,
      })),
    ];
  }, [state.cards]);

  /** The canvas grows to hold the arrangement, and to hold a card mid-drag. */
  const extent = [...placed.map(({ x, y }) => ({ x, y })), ...(ghost ? [ghost] : [])].reduce(
    (acc, p) => ({ w: Math.max(acc.w, p.x + CARD_W + 32), h: Math.max(acc.h, p.y + ROW_H) }),
    { w: 1040, h: 640 }
  );

  const selected = state.cards.filter((c) => selectedIds.includes(c.id));

  const toggle = (id: string) =>
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );

  /** Pointer position translated into canvas coordinates. */
  const canvasPoint = (e: { clientX: number; clientY: number }) => {
    const box = canvasRef.current?.getBoundingClientRect();
    return box ? { x: e.clientX - box.left, y: e.clientY - box.top } : { x: 24, y: 24 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = canvasPoint(e);
    setGhost({ x: Math.max(0, p.x - drag.offX), y: Math.max(0, p.y - drag.offY) });

    // A few pixels of slop, so selecting a card never nudges it out of place.
    if (!drag.moved && Math.hypot(p.x - drag.startX, p.y - drag.startY) > 4) {
      setDrag({ ...drag, moved: true });
    }
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.moved && ghost) {
      updateCard(state.projectId, drag.id, { x: Math.round(ghost.x), y: Math.round(ghost.y) });
    } else {
      toggle(drag.id);
    }
    setDrag(null);
    setGhost(null);
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:h-[32rem] max-lg:shrink-0">
      {/* Board header */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-3.5 py-2.5">
        <h3 className="text-[12px] font-extrabold tracking-tight text-slate-900">
          Requirement Chalk Board
        </h3>
        <span className="text-[10px] text-slate-400">· rough discovery space</span>

        <div className="ml-auto flex items-center gap-1.5">
          {selectedIds.length > 0 && (
            <span className="mr-0.5 text-[10px] font-bold text-indigo-600">
              {selectedIds.length} selected
            </span>
          )}

          <button
            onClick={() => {
              setDraft({ title: '', body: '' });
              setComposing({ x: 24 + (state.cards.length % 4) * COL_W, y: extent.h - ROW_H + 24 });
            }}
            disabled={disabled}
            title="Something you know that no source records"
            className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10.5px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Plus className="h-3 w-3" /> Note
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-0 flex-1 overflow-auto bg-slate-50/40">
        <div
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ width: extent.w, height: extent.h }}
          className="relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"
        >
          {state.cards.length === 0 && (
            <p className="absolute left-1/2 top-16 w-72 -translate-x-1/2 text-center text-[11px] leading-relaxed text-slate-400">
              Nothing on the board yet. Drag a knowledge source across, or add a card to capture
              what you already know.
            </p>
          )}

          {placed.map(({ card, x, y }) => {
            const meta = CARD_TYPES[card.type];
            const isSelected = selectedIds.includes(card.id);
            const isDragging = drag?.id === card.id;
            const pos = isDragging && ghost ? ghost : { x, y };

            const source = state.sources.find((sc) => sc.id === card.sourceId);
            const badge = source ? SOURCE_BADGE[source.type] : undefined;
            /* Silence means sourced. Only a guess wears a mark. */
            const isGuess =
              card.evidenceClass === 'AI assumption' ||
              card.evidenceClass === 'Inferred interpretation';

            return (
              <article
                key={card.id}
                onPointerDown={(e) => {
                  if (disabled) return;
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  const p = canvasPoint(e);
                  setDrag({
                    id: card.id,
                    offX: p.x - x,
                    offY: p.y - y,
                    startX: p.x,
                    startY: p.y,
                    moved: false,
                  });
                  setGhost({ x, y });
                }}
                onClick={() => disabled && toggle(card.id)}
                onDoubleClick={() =>
                  card.type === 'Disagreement' ? onOpenConflict(card.id) : onInspect(card.id)
                }
                title="Drag to move · click to select · double-click to open"
                style={{ left: pos.x, top: pos.y, width: CARD_W }}
                className={`absolute select-none rounded-xl border-2 bg-white p-2.5 shadow-sm transition-shadow ${
                  meta.border
                } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''} ${
                  isDragging ? 'z-10 shadow-xl' : 'hover:shadow-md'
                } ${disabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
              >
                {/* Where this came from */}
                <div className="flex items-center gap-1.5">
                  {badge ? (
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[7px] font-bold ${badge.tint}`}
                    >
                      {badge.glyph}
                    </span>
                  ) : card.type === 'Disagreement' ? (
                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  ) : card.type === 'Requirement seed' ? (
                    <FileCheck className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                  )}

                  <span className="min-w-0 flex-1 truncate text-[9.5px] font-bold text-slate-500">
                    {source?.name ??
                      (card.type === 'Disagreement'
                        ? 'Two sources'
                        : card.type === 'Requirement seed'
                        ? 'Requirement seed'
                        : (card.author ?? 'Your note'))}
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
                <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-slate-900">
                  {card.title}
                </p>

                {card.type === 'Disagreement' && card.conflict && (
                  <div className="mt-1.5 space-y-1 border-t border-rose-100 pt-1.5">
                    <p className="text-[10px] leading-snug text-slate-600">
                      <span className="font-bold text-slate-400">
                        {card.conflict.claimASource}:{' '}
                      </span>
                      {card.conflict.claimA}
                    </p>
                    <p className="text-[10px] leading-snug text-slate-600">
                      <span className="font-bold text-slate-400">
                        {card.conflict.claimBSource}:{' '}
                      </span>
                      {card.conflict.claimB}
                    </p>
                  </div>
                )}
              </article>
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

      {/* Selection bar — direct manipulation, kept out of the way until it applies */}
      {selectedIds.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-3.5 py-2">
          <span className="min-w-0 flex-1 truncate text-[10.5px] text-slate-500">
            {selected
              .map((c) => state.sources.find((sc) => sc.id === c.sourceId)?.name ?? 'your note')
              .join(' · ')}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
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
              For something you know that none of your sources record.
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
                    x: composing.x,
                    y: composing.y,
                    laneId: 'lane-proposed',
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
