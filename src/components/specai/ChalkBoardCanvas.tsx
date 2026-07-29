import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardNote, NoteKind, SpecAiState } from '../../types/specai';
import { Plus, Trash2, ArrowUpRight, Layers } from 'lucide-react';

const KIND_STYLE: Record<NoteKind, { card: string; tag: string }> = {
  'Feature idea': { card: 'border-slate-200', tag: 'bg-indigo-50 text-indigo-700' },
  'Observed flow': { card: 'border-emerald-200', tag: 'bg-emerald-50 text-emerald-700' },
  Conflict: { card: 'border-rose-200', tag: 'bg-rose-50 text-rose-700' },
  'Technical context': { card: 'border-blue-200', tag: 'bg-blue-50 text-blue-700' },
  'Open question': { card: 'border-amber-200', tag: 'bg-amber-50 text-amber-800' },
  Requirement: { card: 'border-violet-300', tag: 'bg-violet-100 text-violet-700' },
};

const ADD_KINDS: NoteKind[] = ['Feature idea', 'Open question', 'Requirement'];

/**
 * The Requirement Chalk Board as a spatial surface: rough knowledge placed and
 * moved freely before any structure is imposed. Selection feeds the copilot, so
 * questions can be grounded in specific cards.
 */
export const ChalkBoardCanvas: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}> = ({ state, disabled, selectedIds, onSelectionChange }) => {
  const { moveBoardNote, removeBoardNote, promoteNoteToRequirement, addBoardNote, addToast } =
    useApp();

  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [composing, setComposing] = useState<NoteKind | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '' });

  const beginDrag = (e: React.PointerEvent, note: BoardNote) => {
    if (disabled || e.button !== 0) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: note.id,
      dx: e.clientX - rect.left - note.x,
      dy: e.clientY - rect.top - note.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    moveBoardNote(
      state.projectId,
      drag.id,
      Math.max(0, Math.min(e.clientX - rect.left - drag.dx, rect.width - 210)),
      Math.max(0, Math.min(e.clientY - rect.top - drag.dy, rect.height - 120))
    );
  };

  const toggleSelect = (id: string) =>
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );

  const conflicts = state.boardNotes.filter((n) => n.kind === 'Conflict').length;

  return (
    <div className="flex min-w-0 flex-col">
      {/* Board toolbar */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <strong className="text-sm font-extrabold text-slate-900">
            Requirement Chalk Board
          </strong>
          <span className="text-[11px] text-slate-500">· rough discovery space</span>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <span className="text-[10px] font-bold text-indigo-600">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => {
                  addToast(`Grouped ${selectedIds.length} items into a cluster.`);
                  onSelectionChange([]);
                }}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Layers className="h-2.5 w-2.5" /> Group selected
              </button>
            </>
          )}
          {conflicts > 0 && (
            <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
              {conflicts} conflict{conflicts === 1 ? '' : 's'} on board
            </span>
          )}
        </div>
      </div>

      {/* The canvas */}
      <div
        ref={boardRef}
        onPointerMove={onDrag}
        onPointerUp={() => (dragRef.current = null)}
        onClick={() => onSelectionChange([])}
        className="relative min-h-[34rem] flex-1 overflow-hidden rounded-2xl border border-slate-200"
        style={{
          backgroundImage:
            'linear-gradient(#eef1f6 1px, transparent 1px), linear-gradient(90deg, #eef1f6 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          backgroundColor: '#fbfcfe',
        }}
      >
        {state.boardNotes.length === 0 && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-xs text-slate-400">
            Nothing on the board yet. Pull a source in, or add a note below.
          </p>
        )}

        {state.boardNotes.map((note) => {
          const style = KIND_STYLE[note.kind];
          const selected = selectedIds.includes(note.id);

          return (
            <div
              key={note.id}
              onPointerDown={(e) => beginDrag(e, note)}
              onClick={(e) => {
                e.stopPropagation();
                toggleSelect(note.id);
              }}
              style={{ left: note.x, top: note.y }}
              className={`absolute w-[13.5rem] select-none rounded-2xl border bg-white p-3 shadow-lg shadow-slate-900/[0.07] transition-shadow ${
                style.card
              } ${selected ? 'ring-2 ring-indigo-500' : ''} ${
                disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${style.tag}`}
                >
                  {note.kind}
                </span>
                {!disabled && (
                  <div className="flex shrink-0 items-center gap-1">
                    {note.kind !== 'Requirement' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promoteNoteToRequirement(state.projectId, note.id);
                        }}
                        title="Promote to a formal requirement"
                        className="cursor-pointer text-slate-300 transition-colors hover:text-indigo-600"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBoardNote(state.projectId, note.id);
                      }}
                      className="cursor-pointer text-slate-300 transition-colors hover:text-rose-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <h4 className="mt-2 text-xs font-bold leading-tight text-slate-900">{note.title}</h4>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-600">{note.body}</p>
              <small className="mt-2 block border-t border-slate-100 pt-1.5 text-[9px] text-slate-400">
                {note.source}
              </small>
            </div>
          );
        })}

        {/* Floating add bar */}
        {!disabled && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur"
          >
            {ADD_KINDS.map((kind) => (
              <button
                key={kind}
                onClick={() => {
                  setComposing(kind);
                  setDraft({ title: '', body: '' });
                }}
                className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                <Plus className="h-2.5 w-2.5" /> {kind}
              </button>
            ))}
          </div>
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
            <h3 className="text-sm font-extrabold text-slate-900">Add {composing.toLowerCase()}</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Add rough knowledge now. Structure comes later.
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
                  addBoardNote(state.projectId, {
                    kind: composing,
                    title: draft.title.trim() || 'Untitled item',
                    body: draft.body.trim() || 'New knowledge item.',
                    source: 'Source: User input',
                    x: 40 + Math.round((state.boardNotes.length % 4) * 230),
                    y: 380 - Math.round((state.boardNotes.length % 2) * 120),
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
