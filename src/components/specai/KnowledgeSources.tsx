import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import { ARCHETYPES, SOURCE_BADGE } from '../../data/specai';
import { BookOpen, Link2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';

/**
 * Everything the specification is being built out of, as named things rather than
 * connector plumbing. Rows are draggable: dropping one on the chalk board pulls
 * that context in as a card, which is the whole point of keeping the list beside
 * the board instead of behind a dialog.
 */
export const KnowledgeSources: React.FC<{
  state: SpecAiState;
  disabled: boolean;
}> = ({ state, disabled }) => {
  const { connectors, addSpecSource, removeSpecSource, applyArchetype, addToast } = useApp();

  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');

  const confluenceReady = Boolean(
    connectors.find((c) => c.id === 'conn-confluence')?.activatedProject
  );

  const close = () => {
    setAdding(false);
    setUrl('');
  };

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:max-h-72 lg:w-48 xl:w-56">
      <div className="shrink-0 border-b border-slate-200 px-3.5 py-3">
        <h3 className="text-[12px] font-extrabold tracking-tight text-slate-900">
          Knowledge sources
        </h3>
        <p className="mt-0.5 text-[10px] text-slate-500">Drag context onto the board.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {state.sources.length === 0 ? (
          <p className="px-2 py-8 text-center text-[10px] leading-relaxed text-slate-400">
            Nothing brought in yet. Add a source, or start from a rough description.
          </p>
        ) : (
          state.sources.map((s) => {
            const badge = SOURCE_BADGE[s.type];

            return (
              <div
                key={s.id}
                draggable={!disabled}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/source', s.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                title={disabled ? s.name : `${s.name} — drag onto the board`}
                className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 ${
                  disabled ? '' : 'cursor-grab active:cursor-grabbing'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[9px] font-bold ${badge.tint}`}
                >
                  {badge.glyph}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold leading-tight text-slate-800">
                    {s.name}
                  </div>
                  <div className="mt-0.5 truncate text-[9.5px] leading-tight text-slate-400">
                    {s.detail ?? s.type}
                  </div>
                </div>

                {!disabled && (
                  <button
                    onClick={() => removeSpecSource(state.projectId, s.id)}
                    title="Remove source"
                    className="shrink-0 cursor-pointer text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 p-2">
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            disabled={disabled}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-2 py-2.5 text-[10.5px] font-bold text-slate-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> Add knowledge source
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Add source
              </span>
              <button
                onClick={close}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <button
              onClick={() => {
                addSpecSource(
                  state.projectId,
                  `Uploaded document ${state.sources.length + 1}`,
                  'PDF'
                );
                close();
              }}
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-3 w-3 text-slate-400" /> Drop files or browse
            </button>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1">
              <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim()) {
                    addSpecSource(state.projectId, url.trim(), 'URL');
                    close();
                  }
                }}
                placeholder="paste a URL, then Enter"
                className="min-w-0 flex-1 bg-transparent py-0.5 text-[10px] outline-none"
              />
            </div>

            <button
              onClick={() => {
                if (!confluenceReady) {
                  addToast('This needs the Confluence connector. Ask your admin.', 'error');
                  return;
                }
                addSpecSource(state.projectId, 'MOB space import', 'Confluence');
                close();
              }}
              className={`flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold ${
                confluenceReady
                  ? 'cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <BookOpen className="h-3 w-3" /> Import from Confluence
            </button>

            <div className="pt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Start from an archetype
            </div>
            {ARCHETYPES.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  applyArchetype(state.projectId, a.id);
                  close();
                }}
                title={a.description}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-left text-[10px] font-semibold text-slate-700 hover:border-indigo-400"
              >
                <Sparkles className="h-3 w-3 shrink-0 text-orange-500" />
                <span className="truncate">{a.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
