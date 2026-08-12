import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { isActivated } from '../../data/connectors';
import { SpecAiState, SpecSource } from '../../types/specai';
import {
  INGEST_COPY,
  INTAKE_ACCEPT,
  SOURCE_BADGE,
  SOURCE_TYPE_FOR_FILE,
  sourceGlyph,
} from '../../data/specai';
import { BookOpen, Link2, Loader2, Paperclip, Upload, X } from 'lucide-react';

/** Human file size for the source's detail line. */
const sizeLabel = (bytes: number): string =>
  bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Sources, attached to the conversation.
 *
 * They used to live in a bar of their own above the workspace, which meant a
 * permanent band of chrome for something you touch a few times a session. A chat
 * already has a place for "here, look at this" — so it goes on the composer, next
 * to the thing you are typing into, and the list only exists while it is open.
 */
export const SourceAttach: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  onOpenSource: (source: SpecSource) => void;
}> = ({ state, disabled, onOpenSource }) => {
  const { connectors, currentScope, addSpecSource, addToast } = useApp();

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const picker = useRef<HTMLInputElement>(null);

  /* Scoped to this project. It used to read a single platform-wide flag, so one
     project connecting Confluence answered yes for every other project. */
  const confluenceReady = isActivated(
    connectors.find((c) => c.id === 'conn-confluence'),
    currentScope.projectId,
    currentScope.departmentId
  );
  const parsing = state.sources.some((s) => s.ingest === 'Parsing' || s.ingest === 'Queued');

  const ingestFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files))
      addSpecSource(
        state.projectId,
        file.name,
        SOURCE_TYPE_FOR_FILE(file.name),
        sizeLabel(file.size)
      );
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
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
        onClick={() => setOpen(!open)}
        disabled={disabled}
        title={`${state.sources.length} source${state.sources.length === 1 ? '' : 's'} attached`}
        className="flex cursor-pointer items-center gap-1 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {parsing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
        ) : (
          <Paperclip className="h-3.5 w-3.5" />
        )}
        {state.sources.length > 0 && (
          <span className="text-[9.5px] font-bold">{state.sources.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-64 space-y-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Sources
            </span>
            <button
              onClick={() => setOpen(false)}
              className="cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* What is already attached */}
          {state.sources.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onOpenSource(s);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
            >
              <span
                className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[7.5px] font-bold ${
                  SOURCE_BADGE[s.type].tint
                }`}
              >
                {sourceGlyph(s.name)}
                <span
                  className={`absolute -bottom-px -right-px h-1.5 w-1.5 rounded-full border border-white ${
                    INGEST_COPY[s.ingest].dot
                  }`}
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-slate-800">
                {s.name}
              </span>
              <span className="shrink-0 text-[9px] text-slate-400">{s.detail ?? s.type}</span>
            </button>
          ))}

          {state.sources.length > 0 && <div className="border-t border-slate-100" />}

          <button
            onClick={() => picker.current?.click()}
            className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-3 w-3 text-slate-400" /> Documents, images, audio
          </button>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1">
            <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url.trim()) {
                  addSpecSource(state.projectId, url.trim(), 'URL', 'Linked page');
                  setUrl('');
                  setOpen(false);
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
              setOpen(false);
            }}
            className={`flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold ${
              confluenceReady
                ? 'cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <BookOpen className="h-3 w-3" /> Import from Confluence
          </button>
        </div>
      )}
    </div>
  );
};
