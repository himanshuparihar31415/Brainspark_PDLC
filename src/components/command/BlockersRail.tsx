import React, { useState } from 'react';
import { ModuleKey, PipelinePhase } from '../../types';
import { BLOCKED_DAYS_HARD, BLOCKED_DAYS_WARN, moduleDef } from '../../data/modules';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface BlockerRow {
  id: string;
  title: string;
  module: ModuleKey;
  blockedBy: string;
  daysBlocked: number;
  owner: string;
}

export const buildBlockers = (phases: PipelinePhase[]): BlockerRow[] =>
  phases.flatMap((p) =>
    p.items
      .filter((i) => i.status === 'Blocked')
      .map((i) => ({
        id: i.id,
        title: i.title,
        module: p.module,
        // Falls back to the phase-level reason when the item has none of its own.
        blockedBy: p.blockedBy ?? 'Awaiting upstream dependency',
        daysBlocked: i.daysInStatus,
        owner: i.owner,
      }))
  );

export const BlockersRail: React.FC<{
  blockers: BlockerRow[];
  onOpen: (module: ModuleKey) => void;
}> = ({ blockers, onOpen }) => {
  const [sortDesc, setSortDesc] = useState(true);

  // Collapses to a single line when there is nothing to triage.
  if (blockers.length === 0) {
    return (
      <section>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-800">No blockers. ✓</span>
        </div>
      </section>
    );
  }

  const sorted = [...blockers].sort((a, b) =>
    sortDesc ? b.daysBlocked - a.daysBlocked : a.daysBlocked - b.daysBlocked
  );

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">
          Blockers ({blockers.length})
        </h2>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="cursor-pointer text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          Sort by time blocked {sortDesc ? '▾' : '▴'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {sorted.map((b) => {
            const hard = b.daysBlocked >= BLOCKED_DAYS_HARD;
            const warn = b.daysBlocked >= BLOCKED_DAYS_WARN;

            return (
              <div key={b.id} className="flex items-start gap-3 px-4 py-3">
                <AlertTriangle
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    hard ? 'text-rose-600' : 'text-amber-600'
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-900">{b.title}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {moduleDef(b.module).name} · {b.blockedBy}
                  </div>
                  {hard && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-700">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {b.daysBlocked}d — needs attention
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[10px] font-semibold text-slate-700">{b.owner}</div>
                  <div
                    className={`font-mono text-[10px] font-bold ${
                      hard ? 'text-rose-600' : warn ? 'text-amber-700' : 'text-slate-500'
                    }`}
                  >
                    {b.daysBlocked}d
                  </div>
                </div>

                <button
                  onClick={() => onOpen(b.module)}
                  className="flex shrink-0 cursor-pointer items-center gap-0.5 self-center text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Open <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
