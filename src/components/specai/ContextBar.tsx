import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState, SpecSource } from '../../types/specai';
import {
  ARCHETYPES,
  INGEST_COPY,
  INTAKE_ACCEPT,
  SOURCE_BADGE,
  SOURCE_TYPE_FOR_FILE,
  indexedSources,
  knowledgeReadiness,
  sourceGlyph,
} from '../../data/specai';
import {
  BookOpen,
  ChevronDown,
  Link2,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Upload,
  X,
} from 'lucide-react';

/** Human file size for the source's detail line. */
const sizeLabel = (bytes: number): string =>
  bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * The problem statement and the sources, collapsed to one line.
 *
 * Both are setup: you write the statement once and add sources occasionally, but
 * they were taking two full-width banners above the work for the rest of the
 * session. Collapsed by default they still say the two things worth knowing at a
 * glance — what we are solving, and how much is readable — and open when you
 * actually need to change them.
 */
export const ContextBar: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  onOpenSource: (source: SpecSource) => void;
}> = ({ state, disabled, onOpenSource }) => {
  const { connectors, addSpecSource, applyArchetype, setProblemStatement, askAgent, addToast } =
    useApp();

  const saved = state.problemStatement.trim();
  /* Nothing to collapse until there is something to say — a blank workspace opens
     on the one thing it needs from you. */
  const [open, setOpen] = useState(saved === '');
  const [editing, setEditing] = useState(saved === '');
  const [draft, setDraft] = useState(state.problemStatement);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const picker = useRef<HTMLInputElement>(null);

  const busy = Boolean(state.generating);
  const readable = indexedSources(state).length;
  const r = knowledgeReadiness(state);
  const confluenceReady = Boolean(
    connectors.find((c) => c.id === 'conn-confluence')?.activatedProject
  );

  const ingestFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files))
      addSpecSource(state.projectId, file.name, SOURCE_TYPE_FOR_FILE(file.name), sizeLabel(file.size));
    setAdding(false);
  };

  const saveAndRead = () => {
    if (draft.trim() !== state.problemStatement) setProblemStatement(state.projectId, draft);
    setEditing(false);
    setOpen(false);
    askAgent(state.projectId, '');
  };

  // ── Collapsed: one line ──────────────────────────────────────────────────────

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        title="Show the problem statement and sources"
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50/70"
      >
        <Target className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
          {saved || 'No problem statement yet'}
        </span>

        <span className="hidden shrink-0 items-center gap-1 sm:flex">
          {state.sources.slice(0, 4).map((s) => (
            <span
              key={s.id}
              title={`${s.name} · ${INGEST_COPY[s.ingest].label}`}
              className={`flex h-4 w-4 items-center justify-center rounded-full font-mono text-[7.5px] font-bold ${
                SOURCE_BADGE[s.type].tint
              }`}
            >
              {sourceGlyph(s.name)}
            </span>
          ))}
          {state.sources.length > 4 && (
            <span className="text-[9px] font-bold text-slate-400">
              +{state.sources.length - 4}
            </span>
          )}
        </span>

        <span className="shrink-0 text-[10px] font-bold text-slate-400">{r.percent}% ready</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
    );

  // ── Expanded ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />

        <div className="min-w-0 flex-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
            What problem are we solving?
          </span>

          {/* The task this project was started from, so the direction stays visible */}
          {state.intake?.task && !editing && (
            <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-indigo-600">
              <ListChecks className="h-2.5 w-2.5" />
              {state.intake.task.title}
              <span className="font-normal text-slate-400">
                · read as {state.intake.kind.toLowerCase()}
              </span>
            </p>
          )}

          {editing ? (
            <>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                disabled={disabled}
                placeholder="Returning customers abandon login because…"
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] leading-relaxed outline-none focus:border-indigo-600 disabled:cursor-not-allowed"
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button
                  onClick={saveAndRead}
                  disabled={disabled || busy || draft.trim() === ''}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10.5px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {busy ? 'Reading…' : 'Save and read my sources'}
                </button>
                {saved !== '' && (
                  <button
                    onClick={() => {
                      setDraft(state.problemStatement);
                      setEditing(false);
                    }}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
                <span className="text-[10px] text-slate-500">
                  {readable} source{readable === 1 ? '' : 's'} ready to read
                </span>
              </div>
            </>
          ) : (
            <p className="text-[11.5px] font-semibold leading-snug text-slate-900">{saved}</p>
          )}
        </div>

        {!editing && !disabled && (
          <button
            onClick={() => {
              setDraft(state.problemStatement);
              setEditing(true);
            }}
            className="shrink-0 cursor-pointer text-[10px] font-bold text-indigo-600 hover:underline"
          >
            Edit
          </button>
        )}

        <button
          onClick={() => setOpen(false)}
          title="Collapse"
          className="shrink-0 cursor-pointer rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-180" />
        </button>
      </div>

      {/* Sources */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-indigo-100 pt-2">
        {state.sources.map((s) => {
          const ingest = INGEST_COPY[s.ingest];

          return (
            <button
              key={s.id}
              onClick={() => onOpenSource(s)}
              title={`${s.name} · ${s.detail ?? s.type} · ${ingest.label}`}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 transition-colors hover:border-slate-300"
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
            className="flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white/70 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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

        <span
          title={r.explanation}
          className="ml-auto flex shrink-0 cursor-help items-center gap-2 text-[10px] font-bold text-slate-600"
        >
          {r.percent}% ready
          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white">
            <span
              className={`block h-full rounded-full ${
                r.percent >= 85 ? 'bg-emerald-500' : r.percent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${r.percent}%` }}
            />
          </span>
        </span>
      </div>
    </div>
  );
};
