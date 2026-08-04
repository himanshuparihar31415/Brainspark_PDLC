import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BreakdownRow, NavView } from '../../types';
import { MODULE_DEFS, formatTokens, formatUsd } from '../../data/modules';
import { canAccessNav } from '../../data/rbac';
import { RollupTiles, TileAction, TileKey } from '../dashboard/RollupTiles';
import { BreakdownModal, BreakdownSection } from '../dashboard/BreakdownModal';
import { ModuleStrip } from '../dashboard/ModuleStrip';
import { ProjectPhaseStrip } from '../dashboard/ProjectPhaseStrip';
import { Wallet, AlertTriangle } from 'lucide-react';

/** Tile behaviour per tier. Admin tiers redirect (detail lives on other
 *  screens); the Project Admin filters in place (detail is co-located). */
const TILE_SPECS: Record<'tenant' | 'department' | 'project', Record<TileKey, TileAction>> = {
  tenant: { headcount: 'redirect', cost: 'modal', tokens: 'modal', completion: 'redirect' },
  department: { headcount: 'redirect', cost: 'modal', tokens: 'modal', completion: 'redirect' },
  project: { headcount: 'filter', cost: 'modal', tokens: 'modal', completion: 'filter' },
};

const rank = (rows: BreakdownRow[]): BreakdownRow[] =>
  rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

export const DashboardView: React.FC = () => {
  const {
    currentScope,
    currentRole,
    departments,
    projects,
    teamMembers,
    tasks,
    agents,
    moduleActivity,
    agentUsage,
    navigateTo,
  } = useApp();

  const [openModal, setOpenModal] = useState<'cost' | 'tokens' | null>(null);
  const [activeFilter, setActiveFilter] = useState<TileKey | null>(null);

  /**
   * Two different axes, deliberately kept separate:
   *
   * `persona` decides the *layout* — which tile behaviours apply and which lower
   * strip renders. Keyed on role so they can never diverge: a Department Admin who
   * narrows scope to one project must not get project-tier tiles that filter a
   * module strip which cannot respond to them.
   *
   * `tier` decides the *numbers and breakdown axes* — keyed on scope, because if
   * only one department is in scope there is no point ranking by department.
   */
  const persona: 'tenant' | 'department' | 'project' =
    currentRole === 'Tenant Admin' ? 'tenant' : currentRole === 'Department Admin' ? 'department' : 'project';

  const tier = currentScope.type;

  // ── Scope resolution: which departments / projects this dashboard totals over
  const scopeDepartments = useMemo(
    () => (tier === 'tenant' ? departments : departments.filter((t) => t.id === currentScope.departmentId)),
    [tier, departments, currentScope.departmentId]
  );

  const scopeProjects = useMemo(() => {
    if (tier === 'tenant') return projects;
    if (tier === 'department') return projects.filter((p) => p.departmentId === currentScope.departmentId);
    return projects.filter((p) => p.id === currentScope.projectId);
  }, [tier, projects, currentScope.departmentId, currentScope.projectId]);

  const scopeProjectIds = scopeProjects.map((p) => p.id);
  const scopeActivity = moduleActivity.filter((a) => scopeProjectIds.includes(a.projectId));

  const scopeTasks = useMemo(
    () =>
      tier === 'project'
        ? tasks.filter((t) => t.project === currentScope.projectName)
        : tasks.filter((t) => scopeProjects.some((p) => p.name === t.project)),
    [tier, tasks, currentScope.projectName, scopeProjects]
  );

  // ── Tile values, aggregated rather than hardcoded
  const headcount =
    tier === 'tenant'
      ? scopeDepartments.reduce((a, t) => a + t.headcount, 0)
      : tier === 'department'
      ? scopeDepartments.reduce((a, t) => a + t.headcount, 0)
      : teamMembers.filter((m) => m.projectId === currentScope.projectId).length;

  const cost =
    tier === 'project'
      ? scopeProjects.reduce((a, p) => a + p.spend30d, 0)
      : scopeDepartments.reduce((a, t) => a + t.spend30d, 0);

  const costPrev =
    tier === 'project'
      ? scopeProjects.reduce((a, p) => a + p.spendPrev30d, 0)
      : scopeDepartments.reduce((a, t) => a + t.spendPrev30d, 0);

  const tokens =
    tier === 'project'
      ? scopeProjects.reduce((a, p) => a + p.tokens30d, 0)
      : scopeDepartments.reduce((a, t) => a + t.tokens30d, 0);

  const completion = scopeProjects.length
    ? Math.round(scopeProjects.reduce((a, p) => a + p.completion, 0) / scopeProjects.length)
    : 0;

  const budget = persona === 'department' ? scopeDepartments.reduce((a, t) => a + t.budget30d, 0) : undefined;

  const scopeLabel =
    tier === 'tenant'
      ? 'All Departments'
      : tier === 'department'
      ? `Department: ${currentScope.departmentName}`
      : `Project: ${currentScope.projectName}`;

  const scopeTitle =
    tier === 'tenant'
      ? 'Tenant-wide roll-up across every department'
      : tier === 'department'
      ? `${currentScope.departmentName} — all projects`
      : `${currentScope.projectName} — unified project view`;

  // ── Breakdown axes, re-axised per tier: by department → by project → by task/person
  const moduleRows = (metric: 'spend30d' | 'tokens30d'): BreakdownRow[] =>
    rank(
      MODULE_DEFS.map((def) => ({
        label: def.name,
        value: scopeActivity
          .filter((a) => a.module === def.key)
          .reduce((sum, a) => sum + a[metric], 0),
      }))
    );

  const agentRows = (metric: 'spend30d' | 'tokens30d'): BreakdownRow[] =>
    rank(
      agentUsage.map((u) => ({
        label: agents.find((a) => a.id === u.agentId)?.name ?? u.agentId,
        value: u[metric],
      }))
    ).slice(0, 5);

  const taskRows = (metric: 'costUsd' | 'tokens'): BreakdownRow[] =>
    rank(
      scopeTasks.map((t) => ({
        label: t.title,
        value: t[metric] ?? 0,
        sublabel: `${t.module} · ${t.assignee}`,
      }))
    ).slice(0, 6);

  const personRows = (): BreakdownRow[] => {
    const totals = new Map<string, number>();
    for (const t of scopeTasks) {
      totals.set(t.assignee, (totals.get(t.assignee) ?? 0) + (t.costUsd ?? 0));
    }
    return rank([...totals].map(([label, value]) => ({ label, value })));
  };

  const costSections: BreakdownSection[] =
    tier === 'tenant'
      ? [
          { title: 'By department', rows: rank(scopeDepartments.map((t) => ({ label: t.name, value: t.spend30d }))) },
          { title: 'By module', rows: moduleRows('spend30d') },
        ]
      : tier === 'department'
      ? [
          // A Department Admin acts at project level, so projects lead here.
          { title: 'By project', rows: rank(scopeProjects.map((p) => ({ label: p.name, value: p.spend30d }))) },
          { title: 'By module', rows: moduleRows('spend30d') },
        ]
      : [
          { title: 'By module', rows: moduleRows('spend30d') },
          { title: 'By task', rows: taskRows('costUsd') },
          { title: 'By person', rows: personRows() },
          { title: 'By agent service', rows: agentRows('spend30d') },
        ];

  const tokenSections: BreakdownSection[] =
    tier === 'tenant'
      ? [
          { title: 'By department', rows: rank(scopeDepartments.map((t) => ({ label: t.name, value: t.tokens30d }))) },
          { title: 'By module', rows: moduleRows('tokens30d') },
          { title: 'By agent service (top 5)', rows: agentRows('tokens30d') },
        ]
      : tier === 'department'
      ? [
          { title: 'By project', rows: rank(scopeProjects.map((p) => ({ label: p.name, value: p.tokens30d }))) },
          { title: 'By module', rows: moduleRows('tokens30d') },
          { title: 'By agent service (top 5)', rows: agentRows('tokens30d') },
        ]
      : [
          { title: 'By module', rows: moduleRows('tokens30d') },
          { title: 'By task', rows: taskRows('tokens') },
          { title: 'By agent service (top 5)', rows: agentRows('tokens30d') },
        ];

  const handleTileClick = (key: TileKey) => {
    const action = TILE_SPECS[persona][key];

    if (action === 'modal') {
      setOpenModal(key === 'cost' ? 'cost' : 'tokens');
      return;
    }

    if (action === 'filter') {
      setActiveFilter(activeFilter === key ? null : key);
      return;
    }

    // Redirects: land on the screen that already owns this data, pre-filtered.
    if (key === 'headcount') {
      navigateTo('Team', {
        // The Department Admin's lever is the cross-project pool, not the flat roster.
        teamTab: persona === 'department' ? 'shared' : 'roster',
        note:
          persona === 'department'
            ? "Showing your department's shared team."
            : 'Showing all people across the platform.',
      });
    } else if (key === 'completion') {
      navigateTo('Projects', {
        projectSort: 'completion-asc',
        note:
          persona === 'department'
            ? 'Your projects, furthest behind first.'
            : 'Sorted by completion — furthest behind first.',
      });
    }
  };

  const tokenDestination: NavView = canAccessNav(currentRole, 'My Services')
    ? 'My Services'
    : 'Agent Registry';

  const budgetUsedPct = budget ? Math.min(100, Math.round((cost / budget) * 100)) : 0;
  const budgetTone = budgetUsedPct >= 100 ? 'bad' : budgetUsedPct >= 85 ? 'warn' : 'good';

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in space-y-8 p-6 duration-200 md:p-8">
      <div>
        <h1 className="type-headline text-slate-900">Dashboard</h1>
        <p className="mt-1 type-body text-slate-500">{scopeTitle}</p>
      </div>

      {/* Department Admins own a spend envelope — the number they log in to check. */}
      {persona === 'department' && budget !== undefined && (
        <div
          className={`platform-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
            budgetTone === 'bad'
              ? '!border-rose-200 !bg-rose-50/80'
              : budgetTone === 'warn'
              ? '!border-amber-200 !bg-amber-50/80'
              : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                budgetTone === 'good' ? 'bg-slate-100 text-slate-600' : 'bg-white/70 text-amber-700'
              }`}
            >
              {budgetTone === 'good' ? (
                <Wallet className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Budget headroom
              </div>
              <div className="text-sm font-extrabold text-slate-900">
                {formatUsd(cost)} of {formatUsd(budget)}
                <span className="ml-2 text-xs font-medium text-slate-500">· 12 days left in period</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:w-64">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70">
              <div
                className={`h-full rounded-full ${
                  budgetTone === 'bad'
                    ? 'bg-rose-500'
                    : budgetTone === 'warn'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-xs font-bold text-slate-700">
              {budgetUsedPct}%
            </span>
          </div>
        </div>
      )}

      <RollupTiles
        headcount={headcount}
        cost={cost}
        costPrev={costPrev}
        budget={budget}
        tokens={tokens}
        completion={completion}
        scopeNoun={tier}
        specs={TILE_SPECS[persona]}
        activeFilter={activeFilter}
        onTileClick={handleTileClick}
      />

      {/* Lower strip is role-dependent: module roll-up for the admin tiers,
          single-project phase strip for the Project Admin. */}
      {persona === 'project' ? (
        <ProjectPhaseStrip activeFilter={activeFilter} completion={completion} />
      ) : (
        <ModuleStrip />
      )}

      <BreakdownModal
        open={openModal === 'cost'}
        title={`Cost breakdown — ${
          tier === 'tenant' ? 'All Departments' : currentScope.projectName ?? currentScope.departmentName
        }`}
        scopeLabel={scopeLabel}
        total={cost}
        totalLabel="last 30 days"
        format={formatUsd}
        sections={costSections}
        trend={{ current: cost, previous: costPrev, label: 'Spend vs last period' }}
        footerLink={
          persona === 'project'
            ? {
                // Filters the strip in place rather than navigating — the
                // Project Admin's detail is co-located on this screen.
                label: 'See most expensive tasks',
                onClick: () => {
                  setOpenModal(null);
                  setActiveFilter('cost');
                },
              }
            : {
                label: 'View top spenders',
                onClick: () => {
                  setOpenModal(null);
                  navigateTo('Projects', {
                    projectSort: 'spend-desc',
                    note: 'Top spenders — ranked by 30-day AI spend.',
                  });
                },
              }
        }
        emptyMessage="No cost data recorded for this period."
        onClose={() => setOpenModal(null)}
      />

      <BreakdownModal
        open={openModal === 'tokens'}
        title={`Token consumption — ${
          tier === 'tenant' ? 'All Departments' : currentScope.projectName ?? currentScope.departmentName
        }`}
        scopeLabel={scopeLabel}
        total={tokens}
        totalLabel="tokens, last 30 days"
        format={formatTokens}
        sections={tokenSections}
        footerLink={{
          // Tokens map to agent-service invocations. The destination is chosen
          // by entitlement: My Services where the role has it, otherwise the
          // (read-only) Agent Registry — a Project Admin has the latter, not
          // the former.
          label: tokenDestination === 'My Services' ? 'Open My Services' : 'Open Agent Registry',
          onClick: () => {
            setOpenModal(null);
            navigateTo(tokenDestination);
          },
        }}
        emptyMessage="No token data recorded for this period."
        onClose={() => setOpenModal(null)}
      />
    </div>
  );
};
