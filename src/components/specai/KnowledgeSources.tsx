import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import {
  ARCHETYPES,
  INGEST_COPY,
  INTAKE_ACCEPT,
  SOURCE_BADGE,
  SOURCE_TYPE_FOR_FILE,
} from '../../data/specai';
import {
  BookOpen,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

/** Human file size for the source's second line. */
const sizeLabel = (bytes: number): string =>
  bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Intake. Everything the specification is built out of, as named things with a
 * visible ingest state — a source that has not finished parsing cannot be read,
 * and the reading says so rather than pretending the material is there.
 *
 * Rows are draggable: dropping one on the chalk board pulls that context in as a
 * card, which is why the list sits beside the board rather than behind a dialog.
 */
export const KnowledgeSources: React.FC<{
  state: SpecAiState;
  disabled: boolean;
}> = ({ state, disabled }) => {
  const { connectors, addSpecSource, removeSpecSource, retrySpecSource, applyArchetype, addToast } =
    useApp();

  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [dropping, setDropping] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const confluenceReady = Boolean(
    connectors.find((c) => c.id === 'conn-confluence')?.activatedProject
  );

  const close = () => {
    setAdding(false);
    setUrl('');
  };

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
    close();
  };

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white max-lg:max-h-72 lg:w-48 xl:w-56">
      <div className="shrink-0 border-b border-slate-200 px-3.5 py-3">
        <h3 className="text-[12px] font-extrabold tracking-tight text-slate-900">
          Knowledge sources
        </h3>
        <p className="mt-0.5 text-[10px] text-slate-500">What the brief is built from.</p>
      </div>

      <div
        onDragOver={(e) => {
          if (disabled) return;
          // Only intercept files; a source row being dragged to the board must pass through.
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          if (disabled || !e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setDropping(false);
          ingestFiles(e.dataTransfer.files);
        }}
        className={`min-h-0 flex-1 overflow-y-auto p-1.5 ${
          dropping ? 'bg-indigo-50/60 ring-2 ring-inset ring-indigo-400' : ''
        }`}
      >
        {state.sources.length === 0 ? (
          <p className="px-2 py-8 text-center text-[10px] leading-relaxed text-slate-400">
            Nothing brought in yet. Drop files here, or add a source below.
          </p>
        ) : (
          state.sources.map((s) => {
            const badge = SOURCE_BADGE[s.type];
            const ingest = INGEST_COPY[s.ingest];
            const readable = s.ingest === 'Indexed';

            return (
              <div
                key={s.id}
                title={
                  readable
                    ? s.name
                    : `${s.name} — ${ingest.label}${s.ingestNote ? `: ${s.ingestNote}` : ''}`
                }
                className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 ${
                  readable ? '' : 'opacity-70'
                }`}
              >
                <span
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[9px] font-bold ${badge.tint}`}
                >
                  {badge.glyph}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${ingest.dot}`}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold leading-tight text-slate-800">
                    {s.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {s.ingest === 'Parsing' && (
                      <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-amber-600" />
                    )}
                    <span
                      className={`truncate text-[9.5px] leading-tight ${
                        s.ingest === 'Failed' ? 'font-bold text-rose-600' : 'text-slate-400'
                      }`}
                    >
                      {readable
                        ? (s.detail ?? s.type)
                        : s.ingest === 'Failed'
                        ? (s.ingestNote ?? 'Failed to parse')
                        : ingest.label}
                    </span>
                  </div>
                </div>

                {!disabled && s.ingest === 'Failed' && (
                  <button
                    onClick={() => retrySpecSource(state.projectId, s.id)}
                    title="Retry ingestion"
                    className="shrink-0 cursor-pointer text-slate-400 hover:text-indigo-600"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}

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
                addSpecSource(state.projectId, 'MOB space import', 'Confluence', 'Confluence space');
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
