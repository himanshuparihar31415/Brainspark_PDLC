import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState, SpecSource } from '../../types/specai';
import {
  ARCHETYPES,
  INGEST_COPY,
  INTAKE_ACCEPT,
  SOURCE_BADGE,
  SOURCE_TYPE_FOR_FILE,
  knowledgeReadiness,
  sourceGlyph,
} from '../../data/specai';
import { ChalkBoard } from './ChalkBoard';
import { CardInspector } from './CardInspector';
import { ConflictResolver } from './ConflictResolver';
import { ProblemStatement } from './ProblemStatement';
import { RightRail } from './RightRail';
import { SourceDrawer } from './SourceDrawer';
import { AlertTriangle, BookOpen, Link2, Loader2, Plus, Sparkles, Upload, X } from 'lucide-react';

/** Human file size for the source's detail line. */
const sizeLabel = (bytes: number): string =>
  bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Stage 1 — Knowledge Creation & Contextualization.
 *
 * Two columns: the board, and something that can read across it. Sources sit in
 * a strip above both rather than in a column of their own — with the board
 * filling itself from them, a permanent list was repeating what every card
 * already says.
 */
export const Stage1Knowledge: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
  /** Owned by the shell, because the stage header acts on the same selection. */
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}> = ({ state, readOnly, locked, selectedIds, onSelectionChange }) => {
  const { connectors, addSpecSource, applyArchetype, addToast } = useApp();

  const [inspectId, setInspectId] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [source, setSource] = useState<SpecSource | null>(null);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const picker = useRef<HTMLInputElement>(null);

  const disabled = readOnly || locked;
  const r = knowledgeReadiness(state);
  const confluenceReady = Boolean(
    connectors.find((c) => c.id === 'conn-confluence')?.activatedProject
  );

  const ingestFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      addSpecSource(
        state.projectId,
        file.name,
        SOURCE_TYPE_FOR_FILE(file.name),
        sizeLabel(file.size)
      );
    }
    setAdding(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {/* What everything below is read against */}
      <ProblemStatement state={state} disabled={disabled} />

      {/* The sources, and how ready they leave the board */}
      <div className="flex flex-wrap items-center gap-1.5">
        {state.sources.map((s) => {
          const ingest = INGEST_COPY[s.ingest];

          return (
            <button
              key={s.id}
              onClick={() => setSource(s)}
              title={`${s.name} · ${s.detail ?? s.type} · ${ingest.label}`}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <span
                className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[8px] font-bold ${
                  SOURCE_BADGE[s.type].tint
                }`}
              >
                {sourceGlyph(s.name)}
                <span
                  className={`absolute -bottom-px -right-px h-1.5 w-1.5 rounded-full border border-white ${ingest.dot}`}
                />
              </span>
              <span className="text-[10px] font-bold text-slate-800">{s.name}</span>
              <span className="text-[10px] text-slate-400">· {s.detail ?? s.type}</span>
              {s.ingest === 'Parsing' && (
                <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-amber-600" />
              )}
            </button>
          );
        })}

        {/* Intake */}
        <div className="relative">
          <input
            ref={picker}
            type="file"
            multiple
            accept={INTAKE_ACCEPT}
            onChange={(e) => {
              ingestFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <button
            onClick={() => setAdding(!adding)}
            disabled={disabled}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-2.5 w-2.5" /> Add source
          </button>

          {adding && (
            <div className="absolute left-0 top-full z-30 mt-1.5 w-60 space-y-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Add source
                </span>
                <button
                  onClick={() => setAdding(false)}
                  className="cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              <button
                onClick={() => picker.current?.click()}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-3 w-3 text-slate-400" /> Documents, images, audio
              </button>

              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1">
                <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url.trim()) {
                      addSpecSource(state.projectId, url.trim(), 'URL', 'Linked page');
                      setUrl('');
                      setAdding(false);
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
                  addSpecSource(state.projectId, 'MOB space import', 'Confluence', 'Space export');
                  setAdding(false);
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
                    setAdding(false);
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

        <div
          title={r.explanation}
          className="ml-auto flex shrink-0 cursor-help items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5"
        >
          <span className="text-[10px] font-bold text-slate-700">Readiness {r.percent}%</span>
          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
            <span
              className={`block h-full rounded-full ${
                r.percent >= 85 ? 'bg-emerald-500' : r.percent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${r.percent}%` }}
            />
          </span>
          {r.conflictsOpen > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-rose-600">
              <AlertTriangle className="h-2.5 w-2.5" />
              {r.conflictsOpen}
            </span>
          )}
        </div>
      </div>

      {/*
        Each panel owns its height and its own scroll, so reading the brief never
        moves the board and a long lane never pushes the rail off screen. Below lg
        they stack and this column scrolls instead.
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto lg:flex-row lg:overflow-hidden">
        <ChalkBoard
          state={state}
          disabled={disabled}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          onInspect={setInspectId}
          onOpenConflict={(id) => {
            setInspectId(null);
            setConflictId(id);
          }}
        />

        <RightRail
          state={state}
          disabled={disabled}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
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

      <SourceDrawer source={source} onClose={() => setSource(null)} />
    </div>
  );
};
