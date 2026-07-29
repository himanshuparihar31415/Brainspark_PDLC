import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ModuleKey } from '../../types';
import {
  MODULE_DEFS,
  ModuleRollup,
  formatMetric,
  formatTokens,
  formatUsd,
  poolContention,
  rollupModule,
} from '../../data/modules';
import { canAccessNav } from '../../data/rbac';
import {
  FileText,
  Pencil,
  SquareCode,
  CheckCircle2,
  Send,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  X,
  FolderGit2,
  Layers,
} from 'lucide-react';

const MODULE_ICON: Record<ModuleKey, React.ElementType> = {
  specai: FileText,
  design: Pencil,
  codeiq: SquareCode,
  intelliqa: CheckCircle2,
  release: Send,
};

const Trend: React.FC<{ value: number }> = ({ value }) => {
  if (value === 0) return <span className="text-[10px] text-slate-400">flat</span>;
  const up = value > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-[10px] font-bold ${
        up ? 'text-emerald-600' : 'text-rose-600'
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}
      {value}
    </span>
  );
};

const ModuleCard: React.FC<{
  rollup: ModuleRollup;
  contention: number;
  onOpen: () => void;
}> = ({ rollup, contention, onOpen }) => {
  const { def } = rollup;
  const Icon = MODULE_ICON[def.key];

  return (
    <button
      onClick={onOpen}
      disabled={rollup.empty}
      className={`flex flex-col rounded-2xl border bg-white p-4 text-left shadow-xs transition-all ${
        rollup.empty
          ? 'cursor-default border-slate-200 opacity-60'
          : 'cursor-pointer border-slate-200 hover:border-indigo-400 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-extrabold text-slate-900">{def.name}</span>
        </div>
        {contention > 0 && (
          <span
            className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800"
            title={`${def.pooledRoles.join(' / ')} are committed across overlapping projects`}
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            {contention} contending
          </span>
        )}
      </div>

      {rollup.empty ? (
        <div className="mt-4 flex-1 text-[11px] text-slate-400">
          No projects in this scope use {def.name}.
        </div>
      ) : (
        <>
          <div className="mt-3 text-[11px] font-semibold text-slate-500">
            {rollup.projectCount} {rollup.projectCount === 1 ? 'project' : 'projects'} in zone
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-slate-500">{def.primary.label}</span>
              <span className="font-mono text-sm font-bold text-slate-900">
                {formatMetric(rollup.primary, def.primary.unit)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-slate-500">{def.secondary.label}</span>
              <span className="font-mono text-xs font-semibold text-slate-700">
                {formatMetric(rollup.secondary, def.secondary.unit)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <div className="min-w-0">
              <div className="truncate text-[10px] text-slate-400">{def.quality.label}</div>
              <div className="font-mono text-xs font-bold text-slate-900">
                {formatMetric(rollup.quality, def.quality.unit)}
              </div>
            </div>
            <Trend value={rollup.qualityTrend} />
          </div>

          <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-indigo-600">
            View projects <ArrowRight className="h-3 w-3" />
          </div>
        </>
      )}
    </button>
  );
};

/** Module-scoped breakdown opened by clicking a card. */
const ModuleDetail: React.FC<{
  rollup: ModuleRollup;
  scopeLabel: string;
  projectNames: Record<string, string>;
  onClose: () => void;
  onViewProjects: () => void;
}> = ({ rollup, scopeLabel, projectNames, onClose, onViewProjects }) => {
  const { def } = rollup;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">
              {def.name} — module breakdown
            </h2>
            <span className="mt-1 inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {scopeLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: def.primary.label, value: formatMetric(rollup.primary, def.primary.unit) },
              { label: def.secondary.label, value: formatMetric(rollup.secondary, def.secondary.unit) },
              { label: def.quality.label, value: formatMetric(rollup.quality, def.quality.unit) },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="text-[10px] leading-tight text-slate-500">{m.label}</div>
                <div className="mt-1 font-mono text-base font-black text-slate-900">{m.value}</div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Projects in the {def.name} zone
            </h3>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {rollup.projectIds.map((pid) => (
                <div key={pid} className="flex items-center gap-2 px-3 py-2">
                  <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate text-xs font-semibold text-slate-800">
                    {projectNames[pid] ?? pid}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-[10px] text-slate-500">Module spend (30d)</div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                {formatUsd(rollup.spend30d)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-[10px] text-slate-500">Tokens (30d)</div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                {formatTokens(rollup.tokens30d)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-3.5">
          <button
            onClick={onViewProjects}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-800"
          >
            View projects using {def.name}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * The admin-tier lower strip: five capability modules summarised across every
 * project that uses them. This is the Super / Tenant Admin lens — not "one
 * project's phases" but "how is each capability performing across projects".
 */
export const ModuleStrip: React.FC = () => {
  const {
    currentRole,
    currentScope,
    tenants,
    projects,
    teamMembers,
    moduleActivity,
    navigateTo,
  } = useApp();

  // Super Admin gets the full Tenant → Project funnel. A Tenant Admin's tenant
  // is fixed, so their bar collapses to a single Project filter rather than
  // showing a locked single-option dropdown.
  const tenantLocked = currentRole !== 'Super Admin';
  const lockedTenantId = currentScope.tenantId;

  // Start aligned with the header scope so the strip and the tiles above it
  // agree on first render; the user can widen from there.
  const [tenantFilter, setTenantFilter] = useState<string>(lockedTenantId ?? 'all');
  const [projectFilter, setProjectFilter] = useState<string>(currentScope.projectId ?? 'all');
  const [openModule, setOpenModule] = useState<ModuleKey | null>(null);

  const effectiveTenantId = tenantLocked ? lockedTenantId ?? 'all' : tenantFilter;

  // Tenant choice repopulates the project list — projects only exist within a tenant.
  const selectableProjects = useMemo(
    () =>
      effectiveTenantId === 'all'
        ? projects
        : projects.filter((p) => p.tenantId === effectiveTenantId),
    [projects, effectiveTenantId]
  );

  const scopeProjects = useMemo(
    () =>
      projectFilter === 'all'
        ? selectableProjects
        : selectableProjects.filter((p) => p.id === projectFilter),
    [selectableProjects, projectFilter]
  );

  const scopeProjectIds = scopeProjects.map((p) => p.id);
  const projectNames = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const rollups = MODULE_DEFS.map((def) => rollupModule(def.key, moduleActivity, scopeProjectIds));

  const tenantName =
    effectiveTenantId === 'all'
      ? 'All tenants'
      : tenants.find((t) => t.id === effectiveTenantId)?.name ?? 'Tenant';
  const projectName =
    projectFilter === 'all' ? 'All projects' : projectNames[projectFilter] ?? 'Project';

  const scopeEcho = `${tenantName} · ${projectName}`;
  const filtersDirty = (!tenantLocked && tenantFilter !== 'all') || projectFilter !== 'all';

  const openRollup = openModule ? rollups.find((r) => r.key === openModule) : null;

  const goToProjects = (module: ModuleKey) => {
    setOpenModule(null);
    navigateTo('Projects', {
      projectModule: module,
      note: `Showing projects that use ${MODULE_DEFS.find((m) => m.key === module)?.name}.`,
    });
  };

  const canSeeProjects = canAccessNav(currentRole, 'Projects');

  return (
    <div className="space-y-4 border-t border-slate-200 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Where the projects stand now
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Modules — <span className="font-semibold text-slate-700">{scopeEcho}</span>
          </p>
        </div>

        {/* Narrowing funnel: tenant first, project second */}
        <div className="flex flex-wrap items-center gap-2">
          {!tenantLocked && (
            <label className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={tenantFilter}
                onChange={(e) => {
                  setTenantFilter(e.target.value);
                  setProjectFilter('all');
                }}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
              >
                <option value="all">All tenants</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-1.5">
            <FolderGit2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
            >
              <option value="all">All projects</option>
              {selectableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {filtersDirty && (
            <button
              onClick={() => {
                if (!tenantLocked) setTenantFilter('all');
                setProjectFilter('all');
              }}
              className="cursor-pointer text-xs font-semibold text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {rollups.map((r) => (
          <ModuleCard
            key={r.key}
            rollup={r}
            // Contention is a tenant-level signal: too fine for the platform
            // view, invisible from inside a single project.
            contention={
              currentRole === 'Tenant Admin' ? poolContention(r.key, teamMembers, scopeProjects) : 0
            }
            onOpen={() => setOpenModule(r.key)}
          />
        ))}
      </div>

      {openRollup && (
        <ModuleDetail
          rollup={openRollup}
          scopeLabel={scopeEcho}
          projectNames={projectNames}
          onClose={() => setOpenModule(null)}
          onViewProjects={() =>
            canSeeProjects ? goToProjects(openRollup.key) : setOpenModule(null)
          }
        />
      )}
    </div>
  );
};
