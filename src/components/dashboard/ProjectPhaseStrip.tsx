import React from 'react';
import { useApp } from '../../context/AppContext';
import { ModuleKey } from '../../types';
import { TileKey } from './RollupTiles';
import { MODULE_DEFS, formatUsd, moduleDef } from '../../data/modules';
import { Pipeline } from '../command/Pipeline';
import { BlockersRail, buildBlockers } from '../command/BlockersRail';
import { AwaitingReview, buildReviewQueue } from '../command/AwaitingReview';
import { CheckCircle2, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';

/**
 * One computed sentence answering "should I be worried today", derived from the
 * same numbers the tiles and rails already show.
 */
const healthHeadline = (
  completion: number,
  blockerCount: number,
  reviewCount: number
): { tone: 'good' | 'warn' | 'bad'; text: string } => {
  if (completion < 55) {
    return {
      tone: 'bad',
      text: `Behind — completion ${55 - completion}% under plan${
        blockerCount > 0 ? `, ${blockerCount} blocker${blockerCount === 1 ? '' : 's'}` : ''
      }.`,
    };
  }
  if (blockerCount > 0 || reviewCount > 2) {
    const parts: string[] = [];
    if (blockerCount > 0) parts.push(`${blockerCount} blocker${blockerCount === 1 ? '' : 's'}`);
    if (reviewCount > 2) parts.push('review backlog rising');
    return { tone: 'warn', text: `At risk — ${parts.join(', ')}.` };
  }
  return { tone: 'good', text: 'On track — no blockers, review queue clear.' };
};

interface ProjectPhaseStripProps {
  /** Which tile is filtering the strip in place, if any. */
  activeFilter: TileKey | null;
  completion: number;
}

/**
 * The Project Admin lower half of the unified view. Renders the same Command
 * Centre pipeline the PDLC personas see — all five phases at equal weight, no
 * focus phase — plus the governance-side health headline and the in-place
 * filters driven by the tiles above.
 */
export const ProjectPhaseStrip: React.FC<ProjectPhaseStripProps> = ({
  activeFilter,
  completion,
}) => {
  const { pipeline, tasks, currentScope, navigateTo, setActiveNav, addToast } = useApp();

  const projectPhases = pipeline.filter((p) => p.projectId === currentScope.projectId);
  const projectTasks = tasks.filter((t) => t.project === currentScope.projectName);

  const blockers = buildBlockers(projectPhases);
  const reviewRows = buildReviewQueue(projectTasks);
  const health = healthHeadline(completion, blockers.length, reviewRows.length);

  // Headcount tile → who is assigned to what right now (expand every phase).
  const showAssignments = activeFilter === 'headcount';
  // Cost modal footer → most expensive work surfaced in place.
  const showCosts = activeFilter === 'cost';

  const costByModule = MODULE_DEFS.reduce<
    Partial<Record<ModuleKey, { text: string; sortValue: number }>>
  >((acc, def) => {
    const spend = projectTasks
      .filter((t) => t.module.toLowerCase().includes(def.phaseMatch.toLowerCase()))
      .reduce((sum, t) => sum + (t.costUsd ?? 0), 0);
    if (spend > 0) acc[def.key] = { text: formatUsd(spend), sortValue: spend };
    return acc;
  }, {});

  const openWorkspace = (module: ModuleKey) => {
    addToast(`Opening ${moduleDef(module).name} workspace…`);
  };

  const toneCls =
    health.tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : health.tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-rose-200 bg-rose-50 text-rose-900';

  return (
    <div className="space-y-5 border-t border-slate-200 pt-6">
      {/* Health headline */}
      <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${toneCls}`}>
        {health.tone === 'good' ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        )}
        <span className="text-xs font-bold">{health.text}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Where the project stands now
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {currentScope.projectName} · live phase pipeline
            {activeFilter === 'completion' && ' — sorted furthest behind first'}
            {showAssignments && ' — showing current assignments'}
            {showCosts && ' — sorted by attributed AI spend'}
          </p>
        </div>
        <button
          onClick={() => setActiveNav('Command Centre')}
          className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
        >
          <span className="hidden sm:inline">Open Command Centre</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <Pipeline
        phases={projectPhases}
        // No focus phase: a Project Admin weighs all five equally.
        focusModule={null}
        onOpenModule={openWorkspace}
        sortBy={
          activeFilter === 'completion'
            ? 'completion-asc'
            : showCosts
            ? 'annotation-desc'
            : 'module'
        }
        annotations={showCosts ? costByModule : undefined}
        expandAll={showAssignments}
      />

      <AwaitingReview rows={reviewRows} onReview={openWorkspace} />

      <BlockersRail blockers={blockers} onOpen={openWorkspace} />

      {/* Secondary path out of the in-place headcount filter */}
      {showAssignments && (
        <button
          onClick={() =>
            navigateTo('Team', { note: `Managing the ${currentScope.projectName} roster.` })
          }
          className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
        >
          Manage team <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
