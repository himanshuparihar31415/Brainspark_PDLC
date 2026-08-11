import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ModuleKey, NavView } from '../../types';
import { FOCUS_MODULE_BY_ROLE, MODULE_DEFS, moduleDef, relativeTime } from '../../data/modules';
import { Pipeline } from '../command/Pipeline';
import { MyTasksQueue, buildMyTasks } from '../command/MyTasksQueue';
import { BlockersRail, buildBlockers } from '../command/BlockersRail';
import { AwaitingReview, buildReviewQueue } from '../command/AwaitingReview';
import { SpecAiCard } from '../command/SpecAiCard';
import { CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, FolderGit2 } from 'lucide-react';

/**
 * The orchestration zone: what is happening in this project's pipeline right now
 * and what to do next. Deliberately excludes analytics, agent configuration and
 * compliance tooling — anything needing a version history, audit trail or
 * threshold to make sense belongs in governance.
 */
export const CommandCentreView: React.FC = () => {
  const {
    currentRole,
    currentUser,
    currentScope,
    setCurrentScope,
    projects,
    tasks,
    agents,
    pipeline,
    addToast,
    navigateTo,
  } = useApp();

  const [minutesAgo, setMinutesAgo] = useState(2);

  // Personas bound to one project see no switcher; multi-project identities do.
  const reachableProjects = projects.filter((p) =>
    currentScope.type === 'project'
      ? p.id === currentScope.projectId
      : p.departmentId === currentScope.departmentId || currentScope.type === 'tenant'
  );
  const activeProject =
    projects.find((p) => p.id === currentScope.projectId) ?? reachableProjects[0] ?? projects[0];

  const projectPhases = pipeline.filter((p) => p.projectId === activeProject?.id);
  const enabledModules = projectPhases.map((p) => p.module);

  const focusModule = FOCUS_MODULE_BY_ROLE[currentRole] ?? null;
  const ownedModules: ModuleKey[] = focusModule ? [focusModule] : enabledModules;

  const myTasks = buildMyTasks(projectPhases, currentUser?.name ?? '');
  const blockers = buildBlockers(projectPhases);
  const reviewRows = buildReviewQueue(
    tasks.filter((t) => t.project === activeProject?.name && t.assignee === currentUser?.name)
  );

  // The only agent-awareness in this zone is indirect: a degraded capability
  // surfaces as a Waiting phase, linking out to My Services.
  // A deactivated agent means the capability behind some phase cannot be invoked.
  const inactiveAgents = agents.filter((a) => !a.is_active);
  const nothingNeedsYou =
    blockers.length === 0 && reviewRows.length === 0 && myTasks.length === 0;
  const pipelineHealthy = blockers.length === 0 && myTasks.every((t) => t.status !== 'Blocked');

  /** Module workspaces that exist as real destinations rather than a stub. */
  const WORKSPACE_ROUTE: Partial<Record<ModuleKey, NavView>> = {
    specai: 'Spec AI',
    codeiq: 'CodeIQ',
  };

  const openWorkspace = (module: ModuleKey) => {
    const def = moduleDef(module);
    const route = WORKSPACE_ROUTE[module];

    if (route) {
      // The workspace enforces its own read-only rule for non-owning personas.
      navigateTo(route);
      return;
    }

    const readOnly = !ownedModules.includes(module);
    addToast(
      readOnly
        ? `You have read-only access to this workspace. (${def.name})`
        : `${def.name} workspace is not built yet.`,
      'info'
    );
  };

  if (!activeProject) {
    return (
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <p className="platform-card px-4 py-8 text-center text-xs text-slate-500">
          No project is in scope.
        </p>
      </div>
    );
  }

  // Nothing ingested yet — point at the entry module rather than an empty stack.
  const emptyProject = projectPhases.every((p) => p.done === 0 && p.status === 'Not started');

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in space-y-7 p-6 duration-200 md:p-8">
      {/* ── Zone header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="type-headline text-slate-900">
            Command Centre
          </h1>
          <p className="mt-1 text-xs text-slate-500 md:text-sm">
            {activeProject.name} — live delivery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {reachableProjects.length > 1 && (
            <label className="flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={activeProject.id}
                onChange={(e) => {
                  const next = projects.find((p) => p.id === e.target.value);
                  if (next)
                    setCurrentScope({
                      type: 'project',
                      departmentId: next.departmentId,
                      departmentName: next.departmentName,
                      projectId: next.id,
                      projectName: next.name,
                    });
                }}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
              >
                {reachableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <span className="text-[11px] text-slate-400">Updated {relativeTime(minutesAgo)}</span>

          <button
            onClick={() => {
              setMinutesAgo(0);
              addToast('Live updates resumed.', 'info');
            }}
            title="Status updates automatically; refresh to pull now."
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Cross-cutting banners */}
      {inactiveAgents.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          <span className="text-xs font-semibold text-amber-900">
            Some AI features are degraded. See Dashboard for details.
          </span>
        </div>
      )}

      {emptyProject && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
          <span className="text-xs font-semibold text-indigo-900">
            This project is just getting started.
          </span>
          <button
            onClick={() => openWorkspace('specai')}
            className="flex cursor-pointer items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
          >
            Begin in Spec AI <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {nothingNeedsYou && !emptyProject && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-800">
            Nothing needs you right now. The pipeline is moving.
          </span>
        </div>
      )}

      {/*
        Spec AI leads the zone: a specification is where the pipeline comes from, so
        the door that opens one sits above the phases it will go on to fill.
      */}
      <SpecAiCard projectId={activeProject.id} projectName={activeProject.name} />

      {/* ── Pipeline */}
      <section className="space-y-2.5">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">Pipeline</h2>
        <Pipeline phases={projectPhases} focusModule={focusModule} onOpenModule={openWorkspace} />
        {pipelineHealthy && !nothingNeedsYou && (
          <p className="text-[11px] text-slate-500">
            Pipeline is moving. No blockers, nothing overdue.
          </p>
        )}
      </section>

      <MyTasksQueue tasks={myTasks} onOpen={openWorkspace} />

      <BlockersRail blockers={blockers} onOpen={openWorkspace} />

      <AwaitingReview rows={reviewRows} onReview={openWorkspace} />

    </div>
  );
};
