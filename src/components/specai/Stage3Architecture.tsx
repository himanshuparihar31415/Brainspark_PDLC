import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArchArtifact, ArtifactGroup, SpecAiState } from '../../types/specai';
import { ARTIFACT_GROUP_ORDER } from '../../data/specai';
import {
  AlertTriangle,
  Check,
  Download,
  History,
  Info,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  GitCompare,
} from 'lucide-react';

/** Node chains rendered for each diagram artifact. */
const DIAGRAM_FLOW: Record<string, string[]> = {
  'art-context': ['Investor', 'Mobile App', 'API Gateway', 'Core Banking'],
  'art-c4': ['App', 'BFF', 'Domain services', 'Ledger adapter'],
  'art-sequence': ['Device check', 'Challenge', 'Token mint', 'Session + audit'],
};

const CHANGE_BAND_STYLE: Record<string, string> = {
  '+ New': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  '~ Changed': 'border-amber-200 bg-amber-50 text-amber-800',
  '− Deprecated': 'border-rose-200 bg-rose-50 text-rose-700',
};

/** Stage 3 — Architecture & Design: the full package, generated in one pass. */
export const Stage3Architecture: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const {
    setArchMode,
    updateArtifact,
    regenerateArtifact,
    acceptArtifactConfidence,
    currentUser,
    addToast,
  } = useApp();

  const [selectedId, setSelectedId] = useState<string>(state.artifacts[0]?.id ?? '');
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [diffView, setDiffView] = useState(false);

  const disabled = readOnly || locked;
  const selected = state.artifacts.find((a) => a.id === selectedId) ?? state.artifacts[0];
  const lowConfidenceCount = state.artifacts.filter((a) => a.confidence === 'low').length;

  if (state.artifacts.length === 0) {
    return (
      <div className="space-y-4">
        <ModeSelector state={state} disabled={disabled} onChange={setArchMode} />
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
          No architecture generated yet. Lock the Project Understanding stage to generate the
          package.
        </p>
      </div>
    );
  }

  const grouped = ARTIFACT_GROUP_ORDER.map((group) => ({
    group: group as ArtifactGroup,
    items: state.artifacts.filter((a) => a.group === group),
  })).filter((g) => g.items.length > 0);

  const editor = selected ? state.sectionEditors[selected.id] : undefined;

  return (
    <div className="space-y-4">
      <ModeSelector state={state} disabled={disabled} onChange={setArchMode} />

      {/* Partial-regeneration guarantee */}
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-[11px] text-slate-600">
          Regenerating one artifact or section preserves your edits everywhere else.
        </span>
      </div>

      {lowConfidenceCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          <span className="text-[11px] font-bold text-amber-900">
            {lowConfidenceCount} low-confidence section
            {lowConfidenceCount === 1 ? '' : 's'} to review before locking.
          </span>
        </div>
      )}

      {state.archMode === 'Brownfield' && (
        <button
          onClick={() => setDiffView(!diffView)}
          className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
        >
          <GitCompare className="h-3.5 w-3.5" />
          {diffView ? 'Back to artifacts' : 'View architecture changes'}
        </button>
      )}

      {diffView ? (
        <BrownfieldDiff artifacts={state.artifacts} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
          {/* Grouped index */}
          <aside className="space-y-3">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group}
                </h4>
                <div className="space-y-1">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedId(a.id);
                        setEditing(false);
                        setShowHistory(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        selected?.id === a.id
                          ? 'bg-indigo-50 font-bold text-indigo-800'
                          : 'cursor-pointer text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px]">{a.label}</span>
                      {a.confidence === 'low' && (
                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                      )}
                      {a.changeTag && state.archMode === 'Brownfield' && (
                        <span className="shrink-0 font-mono text-[9px] text-slate-400">
                          {a.changeTag.charAt(0)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Viewer / editor */}
          {selected && (
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900">{selected.label}</h3>
                  {selected.note && (
                    <p className="mt-0.5 text-[10px] text-slate-400">{selected.note}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {editor && editor !== currentUser?.name && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                      {editor} is editing this section
                    </span>
                  )}

                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    <History className="h-3 w-3" />
                    Version history
                  </button>

                  {!disabled && (
                    <>
                      <button
                        onClick={() => setEditing(!editing)}
                        className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {editing ? (
                          <>
                            <Check className="h-3 w-3" /> Done
                          </>
                        ) : (
                          <>
                            <Pencil className="h-3 w-3" /> Edit inline
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => regenerateArtifact(state.projectId, selected.id)}
                        className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                      >
                        <RefreshCw className="h-3 w-3" /> Regenerate
                      </button>
                      <button
                        onClick={() => addToast('Annotation added for review.', 'info')}
                        className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                      >
                        <MessageSquarePlus className="h-3 w-3" /> Annotate
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Confidence chip, from the agent's self-reported score */}
              {selected.confidence === 'low' && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                  <span className="text-[11px] font-bold text-amber-900">
                    Low confidence — review before locking
                  </span>
                  {!disabled && (
                    <button
                      onClick={() => acceptArtifactConfidence(state.projectId, selected.id)}
                      className="ml-auto cursor-pointer rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-700"
                    >
                      Mark reviewed
                    </button>
                  )}
                </div>
              )}

              {/* Diagram artifacts get a rendered flow, not just their text body. */}
              {selected.group === 'Diagrams' && (
                <>
                  <div className="mt-3 flex min-h-[11rem] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {DIAGRAM_FLOW[selected.id]?.map((node, i, arr) => (
                        <React.Fragment key={node}>
                          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-slate-800 shadow-sm">
                            {node}
                          </div>
                          {i < arr.length - 1 && <span className="text-slate-400">→</span>}
                        </React.Fragment>
                      )) ?? (
                        <span className="text-[11px] text-slate-400">
                          Diagram renders on generation.
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Download className="h-3 w-3" />
                    Diagrams export as SVG or PNG.
                  </div>
                </>
              )}

              {editing ? (
                <textarea
                  autoFocus
                  value={selected.body}
                  onChange={(e) => updateArtifact(state.projectId, selected.id, e.target.value)}
                  rows={14}
                  className="mt-3 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-800 outline-none focus:border-indigo-600"
                />
              ) : (
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 font-mono text-[11px] leading-relaxed text-slate-700">
                  {selected.body}
                </pre>
              )}

              {showHistory && (
                <div className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Version history · {selected.versions} versions
                  </div>
                  {Array.from({ length: selected.versions }, (_, i) => selected.versions - i).map(
                    (v) => (
                      <div
                        key={v}
                        className="flex items-center justify-between gap-2 text-[10px] text-slate-600"
                      >
                        <span className="font-mono font-bold">v{v}</span>
                        <span className="text-slate-400">
                          {v === selected.versions ? 'current' : 'superseded'}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const ModeSelector: React.FC<{
  state: SpecAiState;
  disabled: boolean;
  onChange: (projectId: string, mode: 'Greenfield' | 'Brownfield') => void;
}> = ({ state, disabled, onChange }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex overflow-hidden rounded-lg border border-slate-200">
        {(['Greenfield', 'Brownfield'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(state.projectId, mode)}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${
              state.archMode === mode
                ? 'bg-indigo-600 text-white'
                : 'cursor-pointer bg-white text-slate-600 hover:bg-slate-50'
            } disabled:cursor-not-allowed`}
          >
            {mode}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-slate-500">
        {state.archMode === 'Greenfield'
          ? 'New project — full package generated from scratch.'
          : 'Extending an existing system — output is a change diff against the legacy architecture you added in the Knowledge stage.'}
      </p>
    </div>

    {state.archMode === 'Brownfield' && !state.hasLegacyArchitecture && (
      <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
        <span className="text-[11px] font-bold text-amber-900">
          Upload or link the existing architecture in the Knowledge stage first.
        </span>
      </div>
    )}
  </section>
);

const BrownfieldDiff: React.FC<{ artifacts: ArchArtifact[] }> = ({ artifacts }) => {
  const bands: { title: string; tag?: string }[] = [
    { title: 'Changes', tag: '~ Changed' },
    { title: 'Stays', tag: undefined },
    { title: 'Deprecated', tag: '− Deprecated' },
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-extrabold text-slate-900">Architecture changes</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {bands.map((band) => {
          const items = artifacts.filter((a) =>
            band.tag ? a.changeTag === band.tag : !a.changeTag
          );
          const newItems = band.title === 'Changes' ? artifacts.filter((a) => a.changeTag === '+ New') : [];
          const all = [...newItems, ...items];

          return (
            <div key={band.title}>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {band.title} ({all.length})
              </h4>
              <div className="space-y-1.5">
                {all.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[10px] text-slate-400">
                    Nothing in this band.
                  </p>
                ) : (
                  all.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
                        {a.label}
                      </span>
                      {a.changeTag && (
                        <span
                          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                            CHANGE_BAND_STYLE[a.changeTag]
                          }`}
                        >
                          {a.changeTag}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
