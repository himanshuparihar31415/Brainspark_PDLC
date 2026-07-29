import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import {
  Plus,
  Trash2,
  Merge,
  Split,
  MoveRight,
  Network,
  ListTree,
  Info,
  Box,
  CornerDownRight,
  Link2,
} from 'lucide-react';

/** Stage 4 — Module, Feature and Capability decomposition. */
export const Stage4Modules: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const {
    addSpecModule,
    addSpecFeature,
    addSpecCapability,
    removeSpecNode,
    reparentSpecFeature,
    mergeSpecModules,
    splitSpecModule,
  } = useApp();

  const [view, setView] = useState<'tree' | 'graph'>('tree');
  const [newModule, setNewModule] = useState('');
  const [featureDraft, setFeatureDraft] = useState<Record<string, string>>({});
  const [capDraft, setCapDraft] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');

  const disabled = readOnly || locked;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
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
                placeholder="New module"
                className="w-36 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-600 focus:bg-white"
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

            {state.modules.length > 1 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={mergeFrom}
                  onChange={(e) => setMergeFrom(e.target.value)}
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
                  value={mergeTo}
                  onChange={(e) => setMergeTo(e.target.value)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-indigo-600"
                >
                  <option value="">into…</option>
                  {state.modules
                    .filter((m) => m.id !== mergeFrom)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    mergeSpecModules(state.projectId, mergeFrom, mergeTo);
                    setMergeFrom('');
                    setMergeTo('');
                  }}
                  disabled={!mergeFrom || !mergeTo}
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
          No modules yet — approve the artifact package to generate the map, or add one.
        </p>
      ) : view === 'tree' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0 space-y-2.5">
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
                      {m.features.length} features ·{' '}
                      {m.features.reduce((n, f) => n + f.capabilities.length, 0)} capabilities
                    </span>
                  </div>
                  {!disabled && (
                    <button
                      onClick={() => removeSpecNode(state.projectId, m.id)}
                      className="cursor-pointer text-slate-400 hover:text-rose-600"
                      title="Remove module"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="mt-2.5 space-y-1.5 pl-4">
                  {m.features.map((f) => {
                    const open = expanded === f.id;
                    return (
                      <div key={f.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CornerDownRight className="h-3 w-3 shrink-0 text-slate-300" />
                          <button
                            onClick={() => setExpanded(open ? null : f.id)}
                            className="min-w-0 flex-1 cursor-pointer truncate text-left text-[11px] font-semibold text-slate-800"
                          >
                            {f.name}
                          </button>
                          <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                            Feature
                          </span>
                          {f.requirementIds.length > 0 && (
                            <span
                              title={f.requirementIds.join(', ')}
                              className="flex shrink-0 items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700"
                            >
                              <Link2 className="h-2.5 w-2.5" />
                              {f.requirementIds.length}
                            </span>
                          )}

                          {!disabled && state.modules.length > 1 && (
                            <select
                              value=""
                              onChange={(e) =>
                                e.target.value &&
                                reparentSpecFeature(state.projectId, f.id, e.target.value)
                              }
                              title="Re-parent"
                              className="shrink-0 cursor-pointer rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] outline-none"
                            >
                              <option value="">Move…</option>
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
                            <>
                              <button
                                onClick={() => splitSpecModule(state.projectId, m.id, f.id)}
                                title="Split into its own module"
                                className="shrink-0 cursor-pointer text-slate-400 hover:text-indigo-600"
                              >
                                <Split className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={() => removeSpecNode(state.projectId, m.id, f.id)}
                                className="shrink-0 cursor-pointer text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {open && (
                          <div className="mt-1.5 space-y-1 pl-6">
                            {f.capabilities.length === 0 ? (
                              <p className="text-[10px] text-slate-400">No capabilities yet.</p>
                            ) : (
                              f.capabilities.map((c) => (
                                <div key={c.id} className="flex items-center gap-2">
                                  <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                                  <span className="min-w-0 flex-1 truncate text-[10px] text-slate-600">
                                    {c.name}
                                  </span>
                                  <span className="shrink-0 rounded bg-white px-1 py-0.5 text-[8px] font-bold text-slate-400">
                                    Capability
                                  </span>
                                  {!disabled && (
                                    <button
                                      onClick={() =>
                                        removeSpecNode(state.projectId, m.id, f.id, c.id)
                                      }
                                      className="shrink-0 cursor-pointer text-slate-300 hover:text-rose-600"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}

                            {!disabled && (
                              <div className="flex items-center gap-1.5 pt-1">
                                <input
                                  value={capDraft[f.id] ?? ''}
                                  onChange={(e) =>
                                    setCapDraft({ ...capDraft, [f.id]: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    const v = (capDraft[f.id] ?? '').trim();
                                    if (e.key === 'Enter' && v) {
                                      addSpecCapability(state.projectId, m.id, f.id, v);
                                      setCapDraft({ ...capDraft, [f.id]: '' });
                                    }
                                  }}
                                  placeholder="New capability"
                                  className="w-40 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] outline-none focus:border-indigo-600"
                                />
                                <button
                                  onClick={() => {
                                    const v = (capDraft[f.id] ?? '').trim();
                                    if (!v) return;
                                    addSpecCapability(state.projectId, m.id, f.id, v);
                                    setCapDraft({ ...capDraft, [f.id]: '' });
                                  }}
                                  disabled={!(capDraft[f.id] ?? '').trim()}
                                  className="cursor-pointer rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {m.features.length === 0 && (
                    <p className="text-[10px] text-amber-700">
                      No features yet — a module needs at least one before the map can be finalized.
                    </p>
                  )}

                  {!disabled && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        value={featureDraft[m.id] ?? ''}
                        onChange={(e) => setFeatureDraft({ ...featureDraft, [m.id]: e.target.value })}
                        onKeyDown={(e) => {
                          const v = (featureDraft[m.id] ?? '').trim();
                          if (e.key === 'Enter' && v) {
                            addSpecFeature(state.projectId, m.id, v);
                            setFeatureDraft({ ...featureDraft, [m.id]: '' });
                          }
                        }}
                        placeholder="New feature"
                        className="w-40 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1 text-[11px] outline-none focus:border-indigo-600 focus:bg-white"
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

          {/* Dependency + traceability rail */}
          <aside className="h-fit space-y-3 xl:sticky xl:top-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-extrabold text-slate-900">Dependencies</h3>
              <div className="mt-2 space-y-2">
                {state.modules.filter((m) => m.dependsOn.length > 0).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-2 py-3 text-center text-[10px] text-slate-400">
                    No cross-module dependencies.
                  </p>
                ) : (
                  state.modules
                    .filter((m) => m.dependsOn.length > 0)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-200 px-2.5 py-2 text-[10px] leading-relaxed"
                      >
                        <b className="text-slate-900">{m.name}</b>
                        <br />
                        <span className="text-slate-500">
                          depends on{' '}
                          {m.dependsOn
                            .map((d) => state.modules.find((x) => x.id === d)?.name ?? d)
                            .join(', ')}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-extrabold text-slate-900">Traceability</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Features linked to confirmed requirements.
              </p>
              <div className="mt-2 space-y-1.5">
                {state.modules
                  .flatMap((m) => m.features.filter((f) => f.requirementIds.length > 0))
                  .map((f) => (
                    <div key={f.id} className="text-[10px] leading-relaxed">
                      <b className="text-slate-800">{f.name}</b>
                      <br />
                      <span className="font-mono text-indigo-600">
                        {f.requirementIds.join(' · ')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      ) : (
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
