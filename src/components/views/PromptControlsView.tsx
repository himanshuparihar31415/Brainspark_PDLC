import React, { useMemo, useState } from 'react';
import { useApp, InstructionPublication } from '../../context/AppContext';
import { PromptInstruction } from '../../types';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCode,
  Globe,
  Layers,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

const PAGE_SIZE = 8;

type Scope = 'global' | 'project';
type VersionFilter = 'all' | 'active';

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-600';

const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1';

const selectClass =
  'bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold font-mono';

/** Identity of an instruction key, ignoring version. */
const keyOf = (i: PromptInstruction) =>
  `${i.module}/${i.workflow}/${i.template_name}#${i.project_id ?? 'global'}`;

const formatTimestamp = (iso: string | null): string =>
  iso ? iso.slice(0, 10) + ' ' + iso.slice(11, 16) : '—';

export const PromptControlsView: React.FC = () => {
  const {
    instructions,
    promptTemplates,
    publishInstruction,
    rollbackInstruction,
    deleteInstruction,
    projects,
    currentUser,
    currentScope,
  } = useApp();

  const [scope, setScope] = useState<Scope>('global');
  const [projectId, setProjectId] = useState<string>(
    currentScope.projectId ?? projects[0]?.id ?? ''
  );

  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [versionFilter, setVersionFilter] = useState<VersionFilter>('all');
  const [offset, setOffset] = useState<number>(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState<boolean>(true);

  const [publishOpen, setPublishOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<PromptInstruction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromptInstruction | null>(null);

  const [form, setForm] = useState<InstructionPublication>({
    module: promptTemplates[0]?.module ?? '',
    workflow: promptTemplates[0]?.workflow ?? '',
    template_name: promptTemplates[0]?.template_name ?? '',
    instructions_text: '',
    user_id: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  /*
   * Scope is a hard partition, not a filter: a global instruction and a project
   * override are separate keys with independent version series, so mixing them in
   * one list would make version numbers read as conflicting.
   */
  const inScope = useMemo(
    () =>
      instructions.filter((i) =>
        scope === 'global' ? !i.project_id : i.project_id === projectId
      ),
    [instructions, scope, projectId]
  );

  const moduleOptions = useMemo(
    () => Array.from(new Set(inScope.map((i) => i.module))).sort(),
    [inScope]
  );
  const workflowOptions = useMemo(
    () =>
      Array.from(
        new Set(
          inScope
            .filter((i) => moduleFilter === 'all' || i.module === moduleFilter)
            .map((i) => i.workflow)
        )
      ).sort(),
    [inScope, moduleFilter]
  );
  const templateOptions = useMemo(
    () =>
      Array.from(
        new Set(
          inScope
            .filter((i) => moduleFilter === 'all' || i.module === moduleFilter)
            .filter((i) => workflowFilter === 'all' || i.workflow === workflowFilter)
            .map((i) => i.template_name)
        )
      ).sort(),
    [inScope, moduleFilter, workflowFilter]
  );

  const filtered = useMemo(() => {
    return inScope
      .filter((i) => moduleFilter === 'all' || i.module === moduleFilter)
      .filter((i) => workflowFilter === 'all' || i.workflow === workflowFilter)
      .filter((i) => templateFilter === 'all' || i.template_name === templateFilter)
      .filter((i) => versionFilter === 'all' || i.is_active)
      .sort((a, b) => {
        const keyCompare = keyOf(a).localeCompare(keyOf(b));
        if (keyCompare !== 0) return keyCompare;
        return b.version_number - a.version_number;
      });
  }, [inScope, moduleFilter, workflowFilter, templateFilter, versionFilter]);

  const total = filtered.length;
  const safeOffset =
    offset >= total ? Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE) : offset;
  const page = filtered.slice(safeOffset, safeOffset + PAGE_SIZE);

  /** One card per key, showing whichever version is live right now. */
  const activeVersions = useMemo(
    () => inScope.filter((i) => i.is_active).sort((a, b) => keyOf(a).localeCompare(keyOf(b))),
    [inScope]
  );

  /** Versions present on the same key — a rollback needs at least two. */
  const siblingCount = (target: PromptInstruction) =>
    instructions.filter((i) => keyOf(i) === keyOf(target)).length;

  const resetPaging = (mutate: () => void) => {
    mutate();
    setOffset(0);
  };

  const scopeLabel = scope === 'global' ? 'Global' : projects.find((p) => p.id === projectId)?.name;

  const openPublish = () => {
    const seed = promptTemplates[0];
    setForm({
      module: seed?.module ?? '',
      workflow: seed?.workflow ?? '',
      template_name: seed?.template_name ?? '',
      instructions_text: '',
      user_id: currentUser?.email ?? '',
      ...(scope === 'project' ? { project_id: projectId } : {}),
    });
    setFormError(null);
    setPublishOpen(true);
  };

  /** Publishing targets a template triple, so the selectors move together. */
  const selectTemplate = (path: string) => {
    const template = promptTemplates.find((t) => t.path === path);
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      module: template.module,
      workflow: template.workflow,
      template_name: template.template_name,
    }));
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.instructions_text.trim()) {
      setFormError('Instructions text is required.');
      return;
    }
    if (!form.user_id.trim()) {
      setFormError('Author (user_id) is required.');
      return;
    }

    publishInstruction({
      ...form,
      instructions_text: form.instructions_text.trim(),
      user_id: form.user_id.trim(),
      ...(scope === 'project' ? { project_id: projectId } : { project_id: undefined }),
    });
    setPublishOpen(false);
    setOffset(0);
  };

  const selectedTemplatePath =
    promptTemplates.find(
      (t) =>
        t.module === form.module &&
        t.workflow === form.workflow &&
        t.template_name === form.template_name
    )?.path ?? '';

  return (
    <div className="density-compact p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Prompt Instructions
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Versioned instruction text layered onto the Jinja templates each workflow renders.
            Versions are append-only — publishing supersedes, it never overwrites.
          </p>
        </div>

        <button
          onClick={openPublish}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
        >
          <FileCode className="w-4 h-4" />
          Publish Version
        </button>
      </div>

      {/* Scope toggle */}
      <div className="platform-card flex flex-col sm:flex-row sm:items-center gap-3 p-3.5">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
          <button
            onClick={() => resetPaging(() => setScope('global'))}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              scope === 'global' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Global
          </button>
          <button
            onClick={() => resetPaging(() => setScope('project'))}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              scope === 'project' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Project
          </button>
        </div>

        {scope === 'project' && (
          <select
            value={projectId}
            onChange={(e) => resetPaging(() => setProjectId(e.target.value))}
            className={selectClass}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <p className="text-xs text-slate-500 sm:ml-auto">
          {scope === 'global'
            ? 'Instructions every project inherits unless it overrides them.'
            : 'Overrides that apply only to the selected project.'}
        </p>
      </div>

      {/* Active versions panel */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">
            Active versions — {scopeLabel ?? 'no project selected'}
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            {activeVersions.length} live {activeVersions.length === 1 ? 'key' : 'keys'}
          </span>
        </div>

        {activeVersions.length === 0 ? (
          <div className="platform-card p-8 text-center text-xs text-slate-500">
            Nothing is live in this scope yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeVersions.map((i) => (
              <div
                key={i.id}
                className="platform-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-bold text-slate-900 truncate">
                      {i.template_name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 truncate">
                      {i.module} / {i.workflow}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold">
                    v{i.version_number}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                  {i.instructions_text}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                  <span className="truncate">{i.user_id}</span>
                  <span className="font-mono shrink-0 pl-2">{formatTimestamp(i.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="platform-card flex flex-col lg:flex-row lg:items-center gap-3 p-3.5">
        <select
          value={moduleFilter}
          onChange={(e) =>
            resetPaging(() => {
              setModuleFilter(e.target.value);
              setWorkflowFilter('all');
              setTemplateFilter('all');
            })
          }
          className={selectClass}
        >
          <option value="all">All modules</option>
          {moduleOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={workflowFilter}
          onChange={(e) =>
            resetPaging(() => {
              setWorkflowFilter(e.target.value);
              setTemplateFilter('all');
            })
          }
          className={selectClass}
        >
          <option value="all">All workflows</option>
          {workflowOptions.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        <select
          value={templateFilter}
          onChange={(e) => resetPaging(() => setTemplateFilter(e.target.value))}
          className={selectClass}
        >
          <option value="all">All templates</option>
          {templateOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={versionFilter}
          onChange={(e) => resetPaging(() => setVersionFilter(e.target.value as VersionFilter))}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold"
        >
          <option value="all">All versions</option>
          <option value="active">Active only</option>
        </select>

        <span className="lg:ml-auto text-xs text-slate-400 font-medium shrink-0">
          <span className="font-bold text-slate-700">{total}</span> of {inScope.length} versions in
          scope
        </span>
      </div>

      {/* Version table */}
      <div className="platform-card overflow-hidden">
        {page.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No instruction versions match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4">Id</th>
                  <th className="py-3 px-4">Module / Workflow</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Published</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {page.map((i) => {
                  const isExpanded = expandedId === i.id;
                  const canRollback = !i.is_active && siblingCount(i) > 1;

                  return (
                    <React.Fragment key={i.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{i.id}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-semibold text-slate-800">{i.module}</div>
                          <div className="font-mono text-[10px] text-slate-400">{i.workflow}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-slate-700">{i.template_name}</div>
                          {i.project_id && (
                            <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[10px] font-bold">
                              {i.project_id}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          v{i.version_number}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 truncate max-w-[10rem]">
                          {i.user_id}
                        </td>
                        <td className="py-3.5 px-4">
                          {i.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Superseded
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {formatTimestamp(i.created_at)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : i.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold cursor-pointer"
                            >
                              {isExpanded ? 'Hide' : 'View'}
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            <button
                              onClick={() => setRollbackTarget(i)}
                              disabled={!canRollback}
                              title={
                                i.is_active
                                  ? 'Already the active version'
                                  : canRollback
                                  ? undefined
                                  : 'Only version on this key'
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Rollback
                            </button>

                            <button
                              onClick={() => setDeleteTarget(i)}
                              disabled={i.is_active}
                              title={
                                i.is_active
                                  ? 'The active version cannot be deleted — roll back first'
                                  : undefined
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <FileCode className="w-3.5 h-3.5" />
                                instructions_text · v{i.version_number}
                              </div>
                              <pre className="whitespace-pre-wrap bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl p-4 leading-relaxed overflow-x-auto">
                                {i.instructions_text}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs">
            <span className="text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-800">
                {safeOffset + 1}–{Math.min(safeOffset + PAGE_SIZE, total)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{total}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, safeOffset - PAGE_SIZE))}
                disabled={safeOffset === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={() => setOffset(safeOffset + PAGE_SIZE)}
                disabled={safeOffset + PAGE_SIZE >= total}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Templates discovery */}
      <div className="platform-card overflow-hidden">
        <button
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-sm font-extrabold text-slate-900">Templates</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              The Jinja skeletons on disk — instructions can only be published against one of these
              triples.
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
              templatesOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {templatesOpen && (
          <div className="border-t border-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="py-2.5 px-4">Module</th>
                  <th className="py-2.5 px-4">Workflow</th>
                  <th className="py-2.5 px-4">Template</th>
                  <th className="py-2.5 px-4">Path</th>
                  <th className="py-2.5 px-4">Versions in scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {promptTemplates.map((t) => {
                  const versions = inScope.filter(
                    (i) =>
                      i.module === t.module &&
                      i.workflow === t.workflow &&
                      i.template_name === t.template_name
                  );
                  const active = versions.find((v) => v.is_active);

                  return (
                    <tr key={t.path} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">{t.module}</td>
                      <td className="py-3 px-4 text-slate-600">{t.workflow}</td>
                      <td className="py-3 px-4 text-slate-800">{t.template_name}</td>
                      <td className="py-3 px-4 text-[10px] text-slate-400">{t.path}</td>
                      <td className="py-3 px-4">
                        {versions.length === 0 ? (
                          <span className="font-sans text-slate-400">
                            None — template renders bare
                          </span>
                        ) : (
                          <span className="font-sans text-slate-600">
                            {versions.length}{' '}
                            {active ? (
                              <span className="text-emerald-700 font-bold">
                                · v{active.version_number} live
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold">· none active</span>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Publish modal */}
      {publishOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePublish}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Publish new version</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Publishing to{' '}
                  <span className="font-bold text-slate-700">{scopeLabel ?? '—'}</span> scope. The
                  version number is assigned on publish.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublishOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className={labelClass}>Template</label>
              <select
                value={selectedTemplatePath}
                onChange={(e) => selectTemplate(e.target.value)}
                className={`${inputClass} font-mono font-semibold`}
              >
                {promptTemplates.map((t) => (
                  <option key={t.path} value={t.path}>
                    {t.module} / {t.workflow} / {t.template_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Module</label>
                <input readOnly value={form.module} className={`${inputClass} font-mono text-slate-500`} />
              </div>
              <div>
                <label className={labelClass}>Workflow</label>
                <input
                  readOnly
                  value={form.workflow}
                  className={`${inputClass} font-mono text-slate-500`}
                />
              </div>
              <div>
                <label className={labelClass}>Template name</label>
                <input
                  readOnly
                  value={form.template_name}
                  className={`${inputClass} font-mono text-slate-500`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Author (user_id)</label>
              <input
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                placeholder="you@incedolabs.com"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Instructions text</label>
              <textarea
                value={form.instructions_text}
                onChange={(e) => setForm({ ...form, instructions_text: e.target.value })}
                rows={10}
                required
                placeholder="The instruction text layered onto this template…"
                className="w-full bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl p-4 outline-none leading-relaxed border border-slate-800 focus:border-indigo-500"
              />
            </div>

            <div className="pt-1 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPublishOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Publish version
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rollback confirmation */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-6 h-6 text-indigo-600 shrink-0" />
              <h2 className="text-base font-extrabold text-slate-900">
                Reactivate v{rollbackTarget.version_number}?
              </h2>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <span className="font-mono font-bold text-slate-800">
                  {rollbackTarget.module}/{rollbackTarget.workflow}/{rollbackTarget.template_name}
                </span>{' '}
                will resolve to v{rollbackTarget.version_number} from the next invocation on.
              </p>
              <p>
                The version live today is demoted, not deleted — no new version is minted, and the
                history stays intact.
              </p>
            </div>

            <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl p-3 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {rollbackTarget.instructions_text}
            </div>

            <div className="pt-1 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setRollbackTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  rollbackInstruction(rollbackTarget.id);
                  setRollbackTarget(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Roll back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-rose-600 shrink-0" />
              <h2 className="text-base font-extrabold text-slate-900">
                Delete v{deleteTarget.version_number}?
              </h2>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This removes v{deleteTarget.version_number} of{' '}
              <span className="font-mono font-bold text-slate-800">
                {deleteTarget.template_name}
              </span>{' '}
              permanently. It cannot be rolled back to afterwards.
            </p>

            <div className="pt-1 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteInstruction(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Delete version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
