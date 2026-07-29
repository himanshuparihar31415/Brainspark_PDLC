import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KnowledgeChannel, SpecAiState } from '../../types/specai';
import { ARCHETYPES, knowledgeReadiness } from '../../data/specai';
import { BoardCanvas } from './BoardCanvas';
import { CardInspector } from './CardInspector';
import { ConflictResolver } from './ConflictResolver';
import { SourceDrawer } from './SourceDrawer';
import {
  Upload,
  Link2,
  BookOpen,
  Trash2,
  AlertTriangle,
  Sparkles,
  FileText,
  Plus,
  ChevronDown,
} from 'lucide-react';

const DOT: Record<KnowledgeChannel['status'], string> = {
  Ready: 'bg-emerald-500',
  Partial: 'bg-amber-500',
  Indexing: 'bg-amber-500',
  'Not connected': 'bg-slate-300',
};

/** Stage 1 — Knowledge Creation and the Requirement Chalk Board. */
export const Stage1Knowledge: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const { connectors, addSpecSource, removeSpecSource, applyArchetype, addToast } = useApp();

  const [urlValue, setUrlValue] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [channel, setChannel] = useState<KnowledgeChannel | null>(null);
  const [trayOpen, setTrayOpen] = useState(true);
  const [archOpen, setArchOpen] = useState(false);

  const disabled = readOnly || locked;
  const confluenceReady = Boolean(
    connectors.find((c) => c.id === 'conn-confluence')?.activatedProject
  );
  const r = knowledgeReadiness(state);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Context strip — the eight knowledge domains */}
      <div className="flex flex-wrap items-center gap-1.5">
        {state.channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setChannel(ch)}
            title={`${ch.label} · ${ch.status} · ${ch.itemsIndexed} indexed items · ${ch.scope} · Synced ${ch.lastSync}`}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] transition-colors hover:border-slate-300"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[ch.status]}`} />
            <span className="font-bold text-slate-800">{ch.label}</span>
            <span className="text-slate-400">{ch.detail}</span>
          </button>
        ))}
        <button
          onClick={() => addToast('Source picker opened.', 'info')}
          disabled={disabled}
          className="flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-2.5 w-2.5" /> Add source
        </button>
      </div>

      {/* Knowledge readiness */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-extrabold text-slate-900">
            Knowledge readiness: {r.percent}%
          </span>
          <p className="mt-0.5 text-[10px] text-slate-500">{r.explanation}</p>
        </div>
        <div className="flex items-center gap-2 sm:w-52">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                r.percent >= 85 ? 'bg-emerald-500' : r.percent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${r.percent}%` }}
            />
          </div>
          {r.conflictsOpen > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-rose-600">
              <AlertTriangle className="h-2.5 w-2.5" />
              {r.conflictsOpen}
            </span>
          )}
        </div>
      </div>

      {/* Source tray + board */}
      <div className="flex min-h-0 flex-1 gap-3">
        {trayOpen && (
          <aside className="hidden w-52 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white xl:flex">
            <button
              onClick={() => setTrayOpen(false)}
              className="flex w-full cursor-pointer items-center justify-between border-b border-slate-200 px-3 py-2.5 text-left"
            >
              <span className="text-[11px] font-extrabold text-slate-900">
                Sources ({state.sources.length})
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {state.sources.length === 0 ? (
                <p className="px-1 py-4 text-center text-[10px] text-slate-400">
                  Add a source or start with a rough description.
                </p>
              ) : (
                state.sources.map((s) => (
                  <div
                    key={s.id}
                    className="group flex items-start gap-2 rounded-lg p-1.5 hover:bg-slate-50"
                  >
                    <FileText className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[10px] font-bold text-slate-800">{s.name}</div>
                      <div className="text-[9px] text-slate-400">{s.type}</div>
                    </div>
                    {!disabled && (
                      <button
                        onClick={() => removeSpecSource(state.projectId, s.id)}
                        className="shrink-0 cursor-pointer text-slate-300 opacity-0 hover:text-rose-600 group-hover:opacity-100"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-1.5 border-t border-slate-200 p-2">
              <button
                onClick={() =>
                  addSpecSource(
                    state.projectId,
                    `Uploaded document ${state.sources.length + 1}.pdf`,
                    'PDF'
                  )
                }
                disabled={disabled}
                className="flex w-full cursor-pointer flex-col items-center gap-0.5 rounded-lg border-2 border-dashed border-slate-300 px-2 py-2.5 hover:border-indigo-400 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-700">Drop files or browse</span>
              </button>

              <div className="flex items-center gap-1">
                <Link2 className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                <input
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && urlValue.trim()) {
                      addSpecSource(state.projectId, urlValue.trim(), 'URL');
                      setUrlValue('');
                    }
                  }}
                  disabled={disabled}
                  placeholder="paste a URL"
                  className="min-w-0 flex-1 rounded border border-slate-200 bg-slate-50/60 px-1.5 py-1 text-[9px] outline-none focus:border-indigo-600 focus:bg-white disabled:cursor-not-allowed"
                />
              </div>

              <button
                onClick={() =>
                  confluenceReady
                    ? addSpecSource(state.projectId, 'Confluence — MOB space import', 'Confluence')
                    : addToast('This needs the Confluence connector. Ask your admin.', 'error')
                }
                disabled={disabled}
                className={`w-full rounded-lg border px-2 py-1 text-[9px] font-bold ${
                  confluenceReady && !disabled
                    ? 'cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <BookOpen className="mr-1 inline h-2.5 w-2.5" />
                Import from Confluence
              </button>

              <button
                onClick={() => setArchOpen(!archOpen)}
                className="flex w-full cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-50"
              >
                <Sparkles className="h-2.5 w-2.5 text-orange-500" />
                Archetype (advanced)
              </button>

              {archOpen &&
                ARCHETYPES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => applyArchetype(state.projectId, a.id)}
                    disabled={disabled}
                    title={a.description}
                    className="w-full cursor-pointer rounded border border-slate-200 px-1.5 py-1 text-left text-[9px] font-semibold text-slate-700 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {a.name}
                  </button>
                ))}
            </div>
          </aside>
        )}

        {!trayOpen && (
          <button
            onClick={() => setTrayOpen(true)}
            className="hidden h-fit shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-3 text-[9px] font-bold text-slate-600 [writing-mode:vertical-rl] hover:bg-slate-50 xl:block"
          >
            Sources ({state.sources.length})
          </button>
        )}

        <BoardCanvas
          state={state}
          disabled={disabled}
          selectedIds={selected}
          onSelectionChange={setSelected}
          onInspect={setInspectId}
        />
      </div>

      {/* Right-drawer modes — only one open at a time */}
      {conflictId ? (
        <ConflictResolver
          state={state}
          cardId={conflictId}
          readOnly={disabled}
          onClose={() => setConflictId(null)}
        />
      ) : (
        <CardInspector
          state={state}
          cardId={inspectId}
          readOnly={disabled}
          onClose={() => setInspectId(null)}
          onOpenConflict={(id) => {
            setInspectId(null);
            setConflictId(id);
          }}
        />
      )}

      <SourceDrawer channel={channel} onClose={() => setChannel(null)} />
    </div>
  );
};
