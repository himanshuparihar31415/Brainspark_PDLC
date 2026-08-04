import React from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, FolderGit2, Layers } from 'lucide-react';

export interface ScopeFilterValue {
  departmentId: string | 'all';
  projectId: string | 'all';
}

interface ScopeFilterBarProps {
  value: ScopeFilterValue;
  onChange: (next: ScopeFilterValue) => void;
  /** Screens with no per-project dimension (e.g. Departments) hide the project axis. */
  showProject?: boolean;
  /** Count of rows currently shown, appended to the echo line. */
  resultCount?: number;
  resultNoun?: string;
}

/**
 * Shared scope filter. A narrowing funnel — choosing a department repopulates the
 * project list, because projects only exist within a department.
 *
 * Entitlement decides which axes appear at all:
 *   Tenant Admin     → department + project (spans everything)
 *   Department Admin → project only (their department is fixed; a locked one-option
 *                      dropdown would be noise)
 *   everyone else    → nothing rendered; their scope is already pinned
 */
export const ScopeFilterBar: React.FC<ScopeFilterBarProps> = ({
  value,
  onChange,
  showProject = true,
  resultCount,
  resultNoun = 'results',
}) => {
  const { currentRole, currentScope, departments, projects } = useApp();

  const spansDepartments = currentRole === 'Tenant Admin';
  const spansProjects = spansDepartments || currentRole === 'Department Admin';

  if (!spansProjects) return null;

  const effectiveDepartmentId = spansDepartments ? value.departmentId : currentScope.departmentId ?? 'all';

  const selectableProjects =
    effectiveDepartmentId === 'all'
      ? projects
      : projects.filter((p) => p.departmentId === effectiveDepartmentId);

  const departmentLabel =
    effectiveDepartmentId === 'all'
      ? 'All departments'
      : departments.find((t) => t.id === effectiveDepartmentId)?.name ?? 'Department';

  const projectLabel =
    value.projectId === 'all'
      ? 'All projects'
      : projects.find((p) => p.id === value.projectId)?.name ?? 'Project';

  const dirty =
    (spansDepartments && value.departmentId !== 'all') || (showProject && value.projectId !== 'all');

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          Viewing{' '}
          <span className="font-bold text-slate-700">
            {departmentLabel}
            {showProject ? ` · ${projectLabel}` : ''}
          </span>
          {resultCount !== undefined && (
            <span className="text-slate-400">
              {' '}
              · {resultCount} {resultNoun}
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {spansDepartments && (
          <label className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <select
              value={value.departmentId}
              // Narrowing the department invalidates any project choice beneath it.
              onChange={(e) => onChange({ departmentId: e.target.value, projectId: 'all' })}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
            >
              <option value="all">All departments</option>
              {departments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {showProject && (
          <label className="flex items-center gap-1.5">
            <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <select
              value={value.projectId}
              onChange={(e) => onChange({ ...value, projectId: e.target.value })}
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
        )}

        {dirty && (
          <button
            onClick={() => onChange({ departmentId: 'all', projectId: 'all' })}
            className="cursor-pointer text-xs font-semibold text-indigo-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Initial filter state, seeded from the header scope so a screen opens aligned
 * with wherever the user already was.
 */
export const useScopeFilter = (): [ScopeFilterValue, (v: ScopeFilterValue) => void] => {
  const { currentScope } = useApp();
  const [value, setValue] = React.useState<ScopeFilterValue>({
    departmentId: currentScope.departmentId ?? 'all',
    projectId: currentScope.projectId ?? 'all',
  });
  return [value, setValue];
};
