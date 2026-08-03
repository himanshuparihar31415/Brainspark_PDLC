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

/** Animated SVG icons for pipeline module cards */
const PipelineModuleIcon: React.FC<{ module: string }> = ({ module }) => {
  const size = 32;
  const common = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };

  if (module === 'specai') return (
    <svg {...common}>
      <rect x="6" y="4" width="20" height="24" rx="3" fill="#eef2ff" stroke="#6366f1" strokeWidth="1.2" />
      <path d="M10 10h12M10 14h10M10 18h7" stroke="#a5b4fc" strokeWidth="1.2" strokeLinecap="round">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2.5s" repeatCount="indefinite" />
      </path>
      <circle cx="22" cy="22" r="5" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.2">
        <animate attributeName="r" values="4.5;5.5;4.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <path d="M20.5 22l1 1 2.5-2.5" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (module === 'design') return (
    <svg {...common}>
      <rect x="4" y="6" width="24" height="20" rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.2" />
      <rect x="8" y="10" width="7" height="5" rx="1" fill="#fde68a" stroke="#f59e0b" strokeWidth="0.8">
        <animate attributeName="y" values="10;9;10" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="17" y="10" width="7" height="5" rx="1" fill="#fde68a" stroke="#f59e0b" strokeWidth="0.8">
        <animate attributeName="y" values="10;11;10" dur="3s" repeatCount="indefinite" />
      </rect>
      <path d="M11.5 18v3M20.5 18v3" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" strokeDasharray="1 1.5">
        <animate attributeName="stroke-dashoffset" values="0;-5" dur="1.5s" repeatCount="indefinite" />
      </path>
      <circle cx="16" cy="23" r="2" fill="#fde68a" stroke="#f59e0b" strokeWidth="0.8" />
    </svg>
  );

  if (module === 'codeiq') return (
    <svg {...common}>
      <rect x="5" y="5" width="22" height="22" rx="4" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.2" />
      <path d="M11 12l-3 4 3 4" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M21 12l3 4-3 4" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M18 9l-4 14" stroke="#6ee7b7" strokeWidth="1.2" strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" values="20;0" dur="2s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="20" />
      </path>
    </svg>
  );

  if (module === 'intelliqa') return (
    <svg {...common}>
      <circle cx="16" cy="16" r="11" fill="#faf5ff" stroke="#8b5cf6" strokeWidth="1.2" />
      <path d="M12 16l2.5 2.5L20 13" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dashoffset" values="12;0" dur="1.5s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="12" />
      </path>
      <circle cx="16" cy="16" r="11" fill="none" stroke="#c4b5fd" strokeWidth="0.6" strokeDasharray="3 2">
        <animateTransform attributeName="transform" type="rotate" values="0 16 16;360 16 16" dur="8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );

  // release
  return (
    <svg {...common}>
      <path d="M16 4l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3" fill="#fecaca" stroke="#ef4444" strokeWidth="0.8">
        <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="16" r="8" fill="none" stroke="#fca5a5" strokeWidth="0.5" opacity="0.6">
        <animate attributeName="r" values="8;10;8" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

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

/** One column in the pipeline row — icon-centric card with flip-to-stats. */
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
  const [showStats, setShowStats] = useState(false);

  const blockedCount = phase.items.filter((i) => i.status === 'Blocked').length;
  const pct = phase.total === 0 ? 0 : Math.round((phase.done / phase.total) * 100);
  const notStarted = phase.status === 'Not started';

  const MODULE_SUBTITLES: Record<string, string> = {
    specai: 'Requirements Intelligence Studio',
    design: 'Design & Prototyping Hub',
    codeiq: 'Intelligent Code Generation',
    intelliqa: 'Autonomous Testing Studio',
    release: 'Release Command Center',
  };

  const MODULE_DESCS: Record<string, string> = {
    specai: 'Transforms business objectives into structured epics & user stories.',
    design: 'Generates interactive flows to validate before code is written.',
    codeiq: 'Produces production-ready, reusable code from validated designs.',
    intelliqa: 'Enables Shift-Left quality engineering through AI-generated test scenarios.',
    release: 'Orchestrates release readiness, deployment intelligence, environment validation.',
  };

  const borderColor =
    phase.status === 'Blocked' ? 'border-rose-300/60'
    : phase.status === 'Waiting' ? 'border-amber-300/60'
    : phase.status === 'Complete' ? 'border-emerald-300/60'
    : 'border-white/60';

  return (
    <div
      className={`platform-card group relative flex flex-col overflow-hidden ${borderColor} ${
        notStarted ? 'opacity-60' : ''
      }`}
      style={{ minHeight: '270px', perspective: '1000px', background: 'linear-gradient(135deg, rgba(219,234,254,0.55) 0%, rgba(255,237,213,0.45) 100%)' }}
    >
      {/* Ambient glow on hover */}
      <div className="pointer-events-none absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-indigo-400/0 blur-2xl transition-all duration-500 group-hover:bg-indigo-400/20" />

      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: showStats ? 'rotateY(180deg)' : 'none' }}
      >
        {/* ──── FRONT FACE ──── */}
        <div className="absolute inset-0 flex flex-col p-4" style={{ backfaceVisibility: 'hidden' }}>
          {/* Animated SVG Icon — circular container like reference */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white border border-slate-200/60 mx-auto mb-3 shadow-md shadow-slate-200/50">
            <PipelineModuleIcon module={phase.module} />
          </div>

          {/* Name + subtitle */}
          <h3 className="text-center text-sm font-bold text-slate-900">{def.name}</h3>
          <p className="text-center text-[10px] italic text-indigo-600 mt-0.5">{MODULE_SUBTITLES[def.key]}</p>
          <p className="text-center text-[10px] text-slate-500 mt-2 leading-relaxed line-clamp-2">{MODULE_DESCS[def.key]}</p>

          {/* Status + progress (compact) */}
          <div className="mt-auto pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_PILL[phase.status]}`}>
                {phase.status}
              </span>
              {focused && (
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">Yours</span>
              )}
            </div>

            <div className="h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  phase.status === 'Blocked' ? 'bg-rose-500'
                  : phase.status === 'Complete' ? 'bg-emerald-500'
                  : 'bg-indigo-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="font-mono text-[10px] text-slate-500 text-center">{phase.done}/{phase.total} {completionPhrase}</div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {notStarted && !isFirstEligible ? (
                <span className="text-[10px] text-slate-300">—</span>
              ) : (
                <button
                  onClick={onOpen}
                  className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  {notStarted && isFirstEligible ? <>Start <Play className="h-2.5 w-2.5" /></> : <>Open <ArrowRight className="h-2.5 w-2.5" /></>}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setShowStats(true); }}
                className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors"
              >
                <TrendingUp className="h-2.5 w-2.5" /> Stats
              </button>
            </div>
          </div>
        </div>

        {/* ──── BACK FACE (Stats) ──── */}
        <div
          className="absolute inset-0 flex flex-col p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-900">{def.name} Stats</span>
            <button
              onClick={() => setShowStats(false)}
              className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              ← Card
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 flex-1">
            <div className="rounded-lg bg-white border border-slate-100 px-2.5 py-2">
              <div className="text-base font-black text-slate-900">{phase.done}</div>
              <div className="text-[9px] text-slate-500">Completed</div>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-2.5 py-2">
              <div className="text-base font-black text-slate-900">{phase.total - phase.done}</div>
              <div className="text-[9px] text-slate-500">Remaining</div>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-2.5 py-2">
              <div className="text-base font-black text-slate-900">{pct}%</div>
              <div className="text-[9px] text-slate-500">Progress</div>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-2.5 py-2">
              <div className={`text-base font-black ${blockedCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{blockedCount}</div>
              <div className="text-[9px] text-slate-500">Blocked</div>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-2.5 py-2">
              <div className="text-base font-black text-indigo-600">+{phase.movementThisWeek}</div>
              <div className="text-[9px] text-slate-500">{unit}/week</div>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-2.5 py-2">
              <div className="text-base font-black text-slate-900">{phase.items.length}</div>
              <div className="text-[9px] text-slate-500">Total items</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
            {phase.items.length > 0 && (
              <button
                onClick={onToggle}
                className="text-[10px] font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                {expanded ? 'Collapse' : `${phase.items.length} items ↓`}
              </button>
            )}
            <button
              onClick={onOpen}
              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              Open <ArrowRight className="h-2.5 w-2.5" />
            </button>
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
