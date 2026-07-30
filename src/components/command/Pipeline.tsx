import React, { useState } from 'react';
import { ItemStatus, ModuleKey, PhaseStatus, PipelinePhase } from '../../types';
import { ITEM_STATUS_DAYS, MODULE_DEFS, STALE_DAYS, moduleDef } from '../../data/modules';
import {
  AlertTriangle,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  TrendingUp,
  Circle,
  Play,
} from 'lucide-react';

const STATUS_PILL: Record<PhaseStatus, string> = {
  'In progress': 'bg-blue-50 text-blue-700 border-blue-200',
  Blocked: 'bg-rose-50 text-rose-700 border-rose-200',
  Complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Not started': 'bg-slate-100 text-slate-600 border-slate-200',
  Waiting: 'bg-amber-50 text-amber-800 border-amber-200',
};

const ITEM_STATUS_PILL: Record<ItemStatus, string> = {
  'To do': 'bg-slate-100 text-slate-600',
  'In progress': 'bg-blue-50 text-blue-700',
  Blocked: 'bg-rose-50 text-rose-700',
  'In review': 'bg-indigo-50 text-indigo-700',
  Done: 'bg-emerald-50 text-emerald-700',
};

/**
 * The movement line — the lead metric. Deliberately distinct from the completion
 * bar: movement answers "is this going anywhere", completion answers "how far in".
 */
const MovementLine: React.FC<{ phase: PipelinePhase; unit: string }> = ({ phase, unit }) => {
  if (phase.status === 'Blocked') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        Stalled by blocker
      </div>
    );
  }

  if (phase.status === 'Not started') {
    return <div className="text-[11px] font-semibold text-slate-400">Not started</div>;
  }

  if (phase.status === 'Complete') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="h-3 w-3 shrink-0" />✓ Complete
      </div>
    );
  }

  if (phase.movementThisWeek === 0 && phase.daysSinceChange >= STALE_DAYS) {
    return (
      <div className="flex items-start gap-1.5 text-[11px] font-bold text-amber-700">
        <Circle className="mt-1 h-2 w-2 shrink-0 fill-current" />
        <span>Stale · no change in {phase.daysSinceChange} days</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
      <TrendingUp className="h-3 w-3 shrink-0" />+{phase.movementThisWeek} {unit} this week
    </div>
  );
};

/** One column in the pipeline row. */
const PhaseCard: React.FC<{
  phase: PipelinePhase;
  focused: boolean;
  isFirstEligible: boolean;
  expanded: boolean;
  annotation?: string;
  onToggle: () => void;
  onOpen: () => void;
}> = ({ phase, focused, isFirstEligible, expanded, annotation, onToggle, onOpen }) => {
  const def = moduleDef(phase.module);
  const { unit, completionPhrase } = def.pipeline;

  const blockedCount = phase.items.filter((i) => i.status === 'Blocked').length;
  const pct = phase.total === 0 ? 0 : Math.round((phase.done / phase.total) * 100);
  const notStarted = phase.status === 'Not started';

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border transition-all ${
        phase.status === 'Blocked'
          ? 'border-rose-300/70 bg-rose-50/40 backdrop-blur-xl'
          : phase.status === 'Waiting'
          ? 'border-amber-300/70 bg-amber-50/40 backdrop-blur-xl'
          : phase.status === 'Complete'
          ? 'border-emerald-200/80 bg-emerald-50/35 backdrop-blur-xl'
          : expanded
          ? 'glass-strong border-indigo-400/60 shadow-md'
          : focused
          ? 'glass-panel border-indigo-300/50 shadow-md ring-1 ring-indigo-200/60'
          : notStarted
          ? 'glass border-white/40 bg-white/35'
          : 'glass-panel border-white/60'
      }`}
      title={!focused ? 'Not your phase — open to view.' : undefined}
    >
      {/* Waiting banner replaces the movement line entirely */}
      {phase.status === 'Waiting' && (
        <div className="border-b border-amber-200 bg-amber-100/70 px-3 py-2">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-amber-700" />
            <span className="text-[10px] font-bold leading-snug text-amber-900">
              Waiting — {phase.unavailableCapability} unavailable
            </span>
          </div>
          <span className="mt-1 block text-[10px] font-bold text-amber-800">
            Check My Services →
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-3.5">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xs font-extrabold leading-tight text-slate-900">{def.name}</h3>
          {focused && (
            <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
              Yours
            </span>
          )}
        </div>
        <span
          className={`mt-1.5 w-fit rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${
            STATUS_PILL[phase.status]
          }`}
        >
          {phase.status}
        </span>

        {/* Line order is fixed: movement, completion, health. */}
        {phase.status !== 'Waiting' && (
          <div className="mt-2.5 min-h-[2rem]">
            <MovementLine phase={phase} unit={unit} />
          </div>
        )}

        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className={`h-full rounded-full ${
                phase.status === 'Blocked'
                  ? 'bg-rose-500'
                  : phase.status === 'Waiting'
                  ? 'bg-amber-500'
                  : phase.status === 'Complete'
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 font-mono text-[10px] leading-snug text-slate-600">
            {phase.done} / {phase.total} {completionPhrase}
          </div>
        </div>

        {/* Health — pinned to the card bottom so the row stays aligned */}
        <div className="mt-auto space-y-1.5 border-t border-slate-100 pt-2.5">
          {blockedCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
              <AlertTriangle className="h-2.5 w-2.5" />
              {blockedCount} blocked
            </span>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[10px] text-slate-500">{phase.ownerRole}</span>
            {annotation && (
              <span className="shrink-0 font-mono text-[10px] font-bold text-slate-700">
                {annotation}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {phase.items.length > 0 ? (
              <button
                onClick={onToggle}
                className="flex cursor-pointer items-center gap-0.5 text-[10px] font-bold text-slate-500 transition-colors hover:text-slate-800"
              >
                {expanded ? (
                  <>
                    Collapse <ChevronUp className="h-2.5 w-2.5" />
                  </>
                ) : (
                  <>
                    {phase.items.length} items <ChevronDown className="h-2.5 w-2.5" />
                  </>
                )}
              </button>
            ) : (
              <span />
            )}

            {/* A later not-started phase has no door at all. */}
            {notStarted && !isFirstEligible ? (
              <span className="text-[10px] text-slate-300">—</span>
            ) : (
              <button
                onClick={onOpen}
                className="flex shrink-0 cursor-pointer items-center gap-0.5 text-[10px] font-bold text-indigo-600 transition-colors hover:text-indigo-800"
              >
                {notStarted && isFirstEligible ? (
                  <>
                    Start <Play className="h-2.5 w-2.5" />
                  </>
                ) : (
                  <>
                    Open <ArrowRight className="h-2.5 w-2.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Full-width item table shown beneath the row for an expanded phase. */
const PhaseDetail: React.FC<{
  phase: PipelinePhase;
  /** False when the host is force-expanding every phase, where collapse is a no-op. */
  collapsible: boolean;
  onOpen: () => void;
  onClose: () => void;
}> = ({ phase, collapsible, onOpen, onClose }) => {
  const def = moduleDef(phase.module);

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-300 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-indigo-50/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-900">{def.name}</span>
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${
              STATUS_PILL[phase.status]
            }`}
          >
            {phase.status}
          </span>
        </div>
        {collapsible && (
          <button
            onClick={onClose}
            className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-slate-500 transition-colors hover:text-slate-800"
          >
            Collapse <ChevronUp className="h-3 w-3" />
          </button>
        )}
      </div>

      {phase.blockedBy && (
        <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-[11px] text-rose-900">
          <span className="font-bold">Blocked by: </span>
          {phase.blockedBy}
        </div>
      )}

      {phase.items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[11px] text-slate-400">
          No items in this phase yet.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {phase.items.map((item) => {
            const stale = item.daysInStatus >= STALE_DAYS && item.status !== 'Done';
            const overThreshold = item.daysInStatus > ITEM_STATUS_DAYS;
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-slate-900">
                    {item.title}
                  </div>
                  {stale && (
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-amber-700">
                      <Circle className="h-1.5 w-1.5 fill-current" />
                      Stale {item.daysInStatus}d
                    </span>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    ITEM_STATUS_PILL[item.status]
                  }`}
                >
                  {item.status}
                </span>

                <span
                  className={`hidden w-28 shrink-0 text-right font-mono text-[10px] sm:block ${
                    overThreshold ? 'font-bold text-amber-700' : 'text-slate-400'
                  }`}
                >
                  {item.daysInStatus}d in {item.status.toLowerCase()}
                </span>

                <span className="hidden w-28 shrink-0 truncate text-right text-[10px] text-slate-500 md:block">
                  {item.owner}
                </span>

                <button
                  onClick={onOpen}
                  className="flex shrink-0 cursor-pointer items-center gap-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Open <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface PipelineProps {
  phases: PipelinePhase[];
  /** Project Admin gets no focus phase — all five carry equal weight. */
  focusModule?: ModuleKey | null;
  onOpenModule: (module: ModuleKey) => void;
  /** Default module order, or worst-completion-first when a caller drives it. */
  sortBy?: 'module' | 'completion-asc' | 'annotation-desc';
  /**
   * Optional per-module caption supplied by the host zone. Kept as opaque
   * strings so this component stays free of analytics concerns — the governance
   * dashboard passes spend, the Command Centre passes nothing.
   */
  annotations?: Partial<Record<ModuleKey, { text: string; sortValue: number }>>;
  expandAll?: boolean;
}

/**
 * The pipeline: phase cards laid out left-to-right in delivery order, so the
 * shape of the whole run reads at a glance. Item detail opens as a full-width
 * panel beneath the row rather than inside a narrow column.
 */
export const Pipeline: React.FC<PipelineProps> = ({
  phases,
  focusModule,
  onOpenModule,
  sortBy = 'module',
  annotations,
  expandAll = false,
}) => {
  const byModuleOrder = MODULE_DEFS.map((def) => phases.find((p) => p.module === def.key)).filter(
    (p): p is PipelinePhase => p !== undefined
  );

  const ordered =
    sortBy === 'completion-asc'
      ? [...byModuleOrder].sort((a, b) => a.done / (a.total || 1) - b.done / (b.total || 1))
      : sortBy === 'annotation-desc'
      ? [...byModuleOrder].sort(
          (a, b) =>
            (annotations?.[b.module]?.sortValue ?? 0) - (annotations?.[a.module]?.sortValue ?? 0)
        )
      : byModuleOrder;

  const [expandedId, setExpandedId] = useState<string | null>(
    () => byModuleOrder.find((p) => p.module === focusModule && p.items.length > 0)?.id ?? null
  );

  // Only the earliest not-started phase offers a Start door.
  const firstEligibleId = ordered.find((p) => p.status === 'Not started')?.id ?? null;

  if (ordered.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
        No modules are enabled for this project yet.
      </p>
    );
  }

  const expandedPhases = expandAll
    ? ordered.filter((p) => p.items.length > 0)
    : ordered.filter((p) => p.id === expandedId);

  return (
    <div className="space-y-3">
      {/* The row. Collapses to fewer columns before stacking on small screens. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ordered.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            focused={focusModule === phase.module}
            isFirstEligible={phase.id === firstEligibleId}
            expanded={expandAll || expandedId === phase.id}
            annotation={annotations?.[phase.module]?.text}
            onToggle={() => setExpandedId(expandedId === phase.id ? null : phase.id)}
            onOpen={() => onOpenModule(phase.module)}
          />
        ))}
      </div>

      {expandedPhases.map((phase) => (
        <PhaseDetail
          key={`detail-${phase.id}`}
          phase={phase}
          collapsible={!expandAll}
          onOpen={() => onOpenModule(phase.module)}
          onClose={() => setExpandedId(null)}
        />
      ))}
    </div>
  );
};
