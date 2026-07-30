import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArtifactStatus, SpecAiState } from '../../types/specai';
import { ARTIFACT_GROUP_ORDER } from '../../data/specai';
import { DiagramRenderer } from './DiagramRenderer';
import {
  AlertTriangle,
  Check,
  Download,
  History,
  Info,
  MessageSquare,
  Pencil,
  RefreshCw,
  GitCompare,
} from 'lucide-react';

const STATUS_CHIP: Record<ArtifactStatus, string> = {
  'Not generated': 'bg-slate-100 text-slate-500',
  Generated: 'bg-blue-50 text-blue-700',
  'In review': 'bg-amber-50 text-amber-800',
  Approved: 'bg-emerald-50 text-emerald-700',
};

const CHANGE_STYLE: Record<string, string> = {
  '+ New': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  '~ Changed': 'border-amber-200 bg-amber-50 text-amber-800',
  '− Deprecated': 'border-rose-200 bg-rose-50 text-rose-700',
};

/** Stage 3 — Artifact Studio: the generated package, grouped and traceable. */
export const Stage3Artifacts: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const { setArchMode, updateArtifact, regenerateArtifact, reviewArtifact, addToast, currentUser } =
    useApp();

  const [selectedId, setSelectedId] = useState<string>(state.artifacts[0]?.id ?? '');
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const [diff, setDiff] = useState(false);

  const disabled = readOnly || locked;
  const selected = state.artifacts.find((a) => a.id === selectedId) ?? state.artifacts[0];
  const needsReview = state.artifacts.filter((a) => a.confidence === 'low' || a.stale);

  const ModeBar = (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="flex overflow-hidden rounded-lg border border-slate-200">
        {(['Greenfield', 'Brownfield'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setArchMode(state.projectId, m)}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${
              state.archMode === m
                ? 'bg-indigo-600 text-white'
                : 'cursor-pointer bg-white text-slate-600 hover:bg-slate-50'
            } disabled:cursor-not-allowed`}
          >
            {m}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        {state.archMode === 'Greenfield'
          ? 'New project — full package generated from scratch.'
          : 'Extending an existing system — output is a change diff against the legacy architecture you added in the Knowledge stage.'}
      </p>
      {state.archMode === 'Brownfield' && (
        <button
          onClick={() => setDiff(!diff)}
          className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
        >
          <GitCompare className="h-3.5 w-3.5" />
          {diff ? 'Back to artifacts' : 'Architecture changes'}
        </button>
      )}
    </section>
  );

  if (state.artifacts.length === 0) {
    return (
      <div className="space-y-4">
        {ModeBar}
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
          Nothing generated yet. Lock Project Understanding to generate the package.
        </p>
      </div>
    );
  }

  if (diff) {
    const bands: { title: string; tag?: string }[] = [
      { title: 'Changes', tag: '~ Changed' },
      { title: 'Stays' },
      { title: 'Deprecated', tag: '− Deprecated' },
    ];

    return (
      <div className="space-y-4">
        {ModeBar}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-extrabold text-slate-900">Architecture changes</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            {bands.map((band) => {
              const items = state.artifacts.filter((a) =>
                band.tag ? a.changeTag === band.tag : !a.changeTag
              );
              return (
                <div key={band.title}>
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {band.title} ({items.length})
                  </h4>
                  <div className="space-y-1.5">
                    {items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[10px] text-slate-400">
                        Nothing in this band.
                      </p>
                    ) : (
                      items.map((a) => (
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
                                CHANGE_STYLE[a.changeTag]
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
      </div>
    );
  }

  const editor = selected ? state.sectionEditors[selected.id] : undefined;

  return (
    <div className="space-y-3">
      {ModeBar}

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-[11px] text-slate-600">
          Regenerating one artifact or section preserves your edits everywhere else.
        </span>
      </div>

      {needsReview.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          <span className="text-[11px] font-bold text-amber-900">
            {needsReview.length} artifact{needsReview.length === 1 ? '' : 's'} need review before the
            package can be approved.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Grouped index */}
        <aside className="space-y-3">
          {ARTIFACT_GROUP_ORDER.map((group) => {
            const items = state.artifacts.filter((a) => a.group === group);
            if (items.length === 0) return null;

            return (
              <div key={group}>
                <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group}
                </h4>
                <div className="space-y-0.5">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedId(a.id);
                        setEditing(false);
                        setHistory(false);
                      }}
                      className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                        selected?.id === a.id
                          ? 'bg-indigo-50 font-bold text-indigo-800'
                          : 'cursor-pointer text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px]">{a.label}</span>
                      {(a.confidence === 'low' || a.stale) && (
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-amber-600" />
                      )}
                      {a.reviewComments > 0 && (
                        <span className="shrink-0 rounded bg-slate-100 px-1 text-[8px] font-bold text-slate-500">
                          {a.reviewComments}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Viewer / editor */}
        {selected && (
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-slate-900">{selected.label}</h3>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      STATUS_CHIP[selected.status]
                    }`}
                  >
                    {selected.status}
                  </span>
                  {selected.stale && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                      Marked for review
                    </span>
                  )}
                </div>
                {selected.note && (
                  <p className="mt-0.5 text-[10px] text-slate-400">{selected.note}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {editor && editor !== currentUser?.name && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                    {editor} is editing
                  </span>
                )}
                <button
                  onClick={() => setHistory(!history)}
                  className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                >
                  <History className="h-3 w-3" /> Version history
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
                      <MessageSquare className="h-3 w-3" /> Annotate
                    </button>
                  </>
                )}
              </div>
            </div>

            {(selected.confidence === 'low' || selected.stale) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                <span className="text-[11px] font-bold text-amber-900">
                  {selected.stale
                    ? 'A source decision changed. Review this artifact.'
                    : 'Low confidence — review before approving.'}
                </span>
                {!disabled && (
                  <button
                    onClick={() => reviewArtifact(state.projectId, selected.id)}
                    className="ml-auto cursor-pointer rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-700"
                  >
                    Mark reviewed
                  </button>
                )}
              </div>
            )}

            {selected.flowDiagram && (
              <>
                <DiagramRenderer diagram={selected.flowDiagram} />
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Download className="h-3 w-3" />
                  Interactive diagram — pan, zoom, and explore. Export as SVG or PNG.
                </div>
              </>
            )}
            {!selected.flowDiagram && selected.diagramFlow && (
              <>
                <div className="mt-3 flex min-h-[10rem] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    {selected.diagramFlow.map((node, i, arr) => (
                      <React.Fragment key={node}>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 shadow-sm">
                          {node}
                        </div>
                        {i < arr.length - 1 && <span className="text-slate-400">→</span>}
                      </React.Fragment>
                    ))}
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
                className="mt-3 w-full rounded-xl border border-indigo-300 px-3 py-2.5 font-mono text-[11px] leading-relaxed outline-none focus:border-indigo-600"
              />
            ) : (
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 font-mono text-[11px] leading-relaxed text-slate-700">
                {selected.body}
              </pre>
            )}

            {history && (
              <div className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Version history · {selected.versions} versions
                </div>
                {Array.from({ length: selected.versions }, (_, i) => selected.versions - i).map(
                  (v) => (
                    <div key={v} className="flex justify-between gap-2 text-[10px] text-slate-600">
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
    </div>
  );
};
