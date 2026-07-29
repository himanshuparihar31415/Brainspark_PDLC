import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardCard, CardType, SpecAiState } from '../../types/specai';
import { CARD_STATES, CARD_TYPES, EVIDENCE_CLASSES, cardFooter } from '../../data/specai';
import {
  Bot,
  Check,
  Eye,
  FileCheck,
  FileText,
  GitBranch,
  Group,
  HelpCircle,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  file: FileText,
  eye: Eye,
  spark: Sparkles,
  question: HelpCircle,
  split: GitBranch,
  lock: Lock,
  check: Check,
  'file-check': FileCheck,
};

const ADDABLE: CardType[] = [
  'Evidence',
  'Observation',
  'Idea',
  'Question',
  'Constraint',
  'Decision',
];

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
  const [composing, setComposing] = useState<{ type: CardType; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [adding, setAdding] = useState(false);

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
              runBoardAction(state.projectId, 'group', selectedIds);
              onSelectionChange([]);
            }}
            disabled={disabled || selectedIds.length < 2}
            title={
              selectedIds.length < 2
                ? 'Select at least two cards to group them.'
                : 'Group the selection into its own lane'
            }
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10.5px] font-bold transition-colors ${
              disabled || selectedIds.length < 2
                ? 'cursor-not-allowed border-slate-200 text-slate-300'
                : 'cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Group className="h-3 w-3" /> Group selected
          </button>

          <div className="relative">
            <button
              onClick={() => setAdding(!adding)}
              disabled={disabled}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10.5px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <Plus className="h-3 w-3" /> Card
            </button>

            {adding && (
              <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {ADDABLE.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setAdding(false);
                      setDraft({ title: '', body: '' });
                      setComposing({
                        type: t,
                        x: 24 + (state.cards.length % 4) * COL_W,
                        y: extent.h - ROW_H + 24,
                      });
                    }}
                    className="flex w-full cursor-pointer items-center justify-between px-2.5 py-1.5 text-left text-[10.5px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {CARD_TYPES[t].label}
                    <span className="text-[9px] text-slate-400">{t}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-0 flex-1 overflow-auto bg-slate-50/40">
        <div
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onDragOver={(e) => {
            if (!disabled) e.preventDefault();
          }}
          onDrop={(e) => {
            const sourceId = e.dataTransfer.getData('text/source');
            const source = state.sources.find((s) => s.id === sourceId);
            if (!source || disabled) return;

            const p = canvasPoint(e);
            addCard(state.projectId, {
              x: Math.max(0, Math.round(p.x - CARD_W / 2)),
              y: Math.max(0, Math.round(p.y - 40)),
              laneId: 'lane-inputs',
              type: 'Evidence',
              state: 'Captured',
              title: source.name,
              content: `Pulled in from ${source.name}. Open the card to narrow it to the part that matters.`,
              // Dragged straight off a source, so it is a sourced fact until edited.
              evidenceClass: 'Source fact',
              provenance: {
                system: source.type,
                itemId: source.name,
                indexedAt: 'just now',
                excerpt: source.detail ?? source.type,
              },
              aiCreated: false,
            });
          }}
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
            const Icon = ICONS[meta.icon];
            const isSelected = selectedIds.includes(card.id);
            const isDragging = drag?.id === card.id;
            const pos = isDragging && ghost ? ghost : { x, y };

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
                  card.type === 'Conflict' ? onOpenConflict(card.id) : onInspect(card.id)
                }
                title="Drag to move · click to select · double-click to open"
                style={{ left: pos.x, top: pos.y, width: CARD_W }}
                className={`absolute rounded-xl border-2 bg-white p-2.5 shadow-sm transition-shadow select-none ${
                  meta.border
                } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''} ${
                  isDragging ? 'z-10 shadow-xl' : 'hover:shadow-md'
                } ${disabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${meta.chip}`}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {meta.label}
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

                <h4 className="mt-2 text-[12px] font-bold leading-snug text-slate-900">
                  {card.title}
                </h4>
                <p className="mt-1 line-clamp-3 text-[10.5px] leading-relaxed text-slate-600">
                  {card.content}
                </p>

                <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-1.5">
                  <span className="min-w-0 flex-1 truncate text-[9.5px] text-slate-400">
                    {cardFooter(card)}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold ${
                      CARD_STATES[card.state].chip
                    }`}
                    title={`${card.state} · ${card.evidenceClass}`}
                  >
                    {EVIDENCE_CLASSES[card.evidenceClass].short}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Selection bar — direct manipulation, kept out of the way until it applies */}
      {selectedIds.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-3.5 py-2">
          <span className="text-[10.5px] text-slate-500">
            {[...new Set(selected.map((c) => CARD_TYPES[c.type].label))].join(' · ')}
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
            <h3 className="text-sm font-extrabold text-slate-900">
              Add {CARD_TYPES[composing.type].label}
            </h3>
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
                  if (!draft.title.trim()) {
                    addToast('Give the card a title first.', 'error');
                    return;
                  }
                  addCard(state.projectId, {
                    x: composing.x,
                    y: composing.y,
                    laneId: 'lane-inputs',
                    type: composing.type,
                    state: 'Captured',
                    title: draft.title.trim(),
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
    </section>
  );
};
