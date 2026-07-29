import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import {
  Plus,
  Trash2,
  Merge,
  MoveRight,
  Network,
  ListTree,
  Info,
  Box,
  CornerDownRight,
} from 'lucide-react';

/** Stage 4 — Module & Feature Mapping: the system, decomposed. */
export const Stage4Modules: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const { addSpecModule, addSpecFeature, removeSpecNode, reparentSpecFeature, mergeSpecModules } =
    useApp();

  const [view, setView] = useState<'tree' | 'graph'>('tree');
  const [newModule, setNewModule] = useState('');
  const [featureDraft, setFeatureDraft] = useState<Record<string, string>>({});
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  const disabled = readOnly || locked;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          {(
            [
              { key: 'tree' as const, label: 'Tree view', icon: ListTree },
              { key: 'graph' as const, label: 'Dependency graph', icon: Network },
            ]
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${
                view === key
                  ? 'bg-indigo-600 text-white'
                  : 'cursor-pointer bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {!disabled && (
          <>
            <div className="flex items-center gap-1.5">
              <input
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newModule.trim()) {
                    addSpecModule(state.projectId, newModule.trim());
                    setNewModule('');
                  }
                }}
                placeholder="New module name"
                className="w-40 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-600 focus:bg-white"
              />
              <button
                onClick={() => {
                  if (!newModule.trim()) return;
                  addSpecModule(state.projectId, newModule.trim());
                  setNewModule('');
                }}
                disabled={!newModule.trim()}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Module
              </button>
            </div>

            {/* Merge: an explicit two-select action rather than a drag gesture */}
            {state.modules.length > 1 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={mergeSource}
                  onChange={(e) => setMergeSource(e.target.value)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-indigo-600"
                >
                  <option value="">Merge…</option>
                  {state.modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <MoveRight className="h-3 w-3 shrink-0 text-slate-400" />
                <select
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-indigo-600"
                >
                  <option value="">into…</option>
                  {state.modules
                    .filter((m) => m.id !== mergeSource)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    mergeSpecModules(state.projectId, mergeSource, mergeTarget);
                    setMergeSource('');
                    setMergeTarget('');
                  }}
                  disabled={!mergeSource || !mergeTarget}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Merge className="h-3 w-3" /> Merge
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {view === 'graph' && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-[11px] text-slate-600">
            Dependencies here drive story priority scoring in the next stage.
          </span>
        </div>
      )}

      {state.modules.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
          No modules yet — generate from the architecture or add one.
        </p>
      ) : view === 'tree' ? (
        <div className="space-y-3">
          {state.modules.map((m) => (
            <section key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Box className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900">{m.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                    Module
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {m.features.length} {m.features.length === 1 ? 'feature' : 'features'}
                  </span>
                </div>

                {!disabled && (
                  <button
                    onClick={() => removeSpecNode(state.projectId, m.id)}
                    className="cursor-pointer text-slate-400 transition-colors hover:text-rose-600"
                    title="Remove module"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="mt-2.5 space-y-1.5 pl-5">
                {m.features.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <CornerDownRight className="h-3 w-3 shrink-0 text-slate-300" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
                      {f.name}
                    </span>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                      Feature
                    </span>

                    {!disabled && state.modules.length > 1 && (
                      <select
                        value=""
                        onChange={(e) =>
                          e.target.value && reparentSpecFeature(state.projectId, f.id, e.target.value)
                        }
                        title="Re-parent this feature"
                        className="shrink-0 cursor-pointer rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] outline-none focus:border-indigo-600"
                      >
                        <option value="">Re-parent…</option>
                        {state.modules
                          .filter((x) => x.id !== m.id)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                      </select>
                    )}

                    {!disabled && (
                      <button
                        onClick={() => removeSpecNode(state.projectId, m.id, f.id)}
                        className="shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-rose-600"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}

                {m.features.length === 0 && (
                  <p className="text-[10px] text-amber-700">
                    No features yet — a module needs at least one before the map can be finalized.
                  </p>
                )}

                {!disabled && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      value={featureDraft[m.id] ?? ''}
                      onChange={(e) =>
                        setFeatureDraft({ ...featureDraft, [m.id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        const v = (featureDraft[m.id] ?? '').trim();
                        if (e.key === 'Enter' && v) {
                          addSpecFeature(state.projectId, m.id, v);
                          setFeatureDraft({ ...featureDraft, [m.id]: '' });
                        }
                      }}
                      placeholder="New feature name"
                      className="w-44 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1 text-[11px] outline-none focus:border-indigo-600 focus:bg-white"
                    />
                    <button
                      onClick={() => {
                        const v = (featureDraft[m.id] ?? '').trim();
                        if (!v) return;
                        addSpecFeature(state.projectId, m.id, v);
                        setFeatureDraft({ ...featureDraft, [m.id]: '' });
                      }}
                      disabled={!(featureDraft[m.id] ?? '').trim()}
                      className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-2.5 w-2.5" /> Feature
                    </button>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* Dependency graph — cross-module edges */
        <section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-5">
          {state.modules.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-800">
                {m.name}
              </span>
              {m.dependsOn.length === 0 ? (
                <span className="text-[10px] text-slate-400">no dependencies</span>
              ) : (
                <>
                  <span className="text-[10px] font-semibold text-slate-400">depends on</span>
                  {m.dependsOn.map((d) => (
                    <span
                      key={d}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700"
                    >
                      {state.modules.find((x) => x.id === d)?.name ?? d}
                    </span>
                  ))}
                </>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
