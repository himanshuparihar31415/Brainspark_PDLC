import React, { useState } from 'react';
import { PipelinePhase, PhaseItem, ModuleKey, ItemStatus } from '../../types';
import { ITEM_STATUS_DAYS, moduleDef } from '../../data/modules';
import { ArrowRight, Info } from 'lucide-react';

type SortKey = 'Most urgent' | 'Due date' | 'Longest in status' | 'Phase';
type FilterChip = 'All' | 'Blocked' | 'In review' | 'Due this week';

const STATUS_PILL: Record<ItemStatus, string> = {
  'To do': 'bg-slate-100 text-slate-600',
  'In progress': 'bg-blue-50 text-blue-700',
  Blocked: 'bg-rose-50 text-rose-700',
  'In review': 'bg-indigo-50 text-indigo-700',
  Done: 'bg-emerald-50 text-emerald-700',
};

export interface MyTaskRow extends PhaseItem {
  module: ModuleKey;
  /** ISO date; may be absent for pipeline items with no committed date. */
  due?: string;
  daysUntilDue?: number;
}

/**
 * Urgency combines due date, time blocked, and review wait — the same definition
 * exposed in the tooltip, so the sort is explainable.
 */
const urgencyScore = (t: MyTaskRow): number => {
  let score = t.daysInStatus;
  if (t.status === 'Blocked') score += 20;
  if (t.status === 'In review') score += 8;
  if (t.daysUntilDue !== undefined) {
    if (t.daysUntilDue < 0) score += 30;
    else if (t.daysUntilDue <= 2) score += 12;
  }
  return score;
};

export const buildMyTasks = (phases: PipelinePhase[], userName: string): MyTaskRow[] =>
  phases.flatMap((p) =>
    p.items
      .filter((i) => i.owner === userName && i.status !== 'Done')
      .map((i) => ({ ...i, module: p.module }))
  );

interface MyTasksQueueProps {
  tasks: MyTaskRow[];
  onOpen: (module: ModuleKey) => void;
}

/**
 * Personal queue. Distinct from the pipeline: the pipeline is the project's
 * state, My Tasks is yours.
 */
export const MyTasksQueue: React.FC<MyTasksQueueProps> = ({ tasks, onOpen }) => {
  const [sort, setSort] = useState<SortKey>('Most urgent');
  const [chip, setChip] = useState<FilterChip>('All');

  const filtered = tasks.filter((t) => {
    if (chip === 'Blocked') return t.status === 'Blocked';
    if (chip === 'In review') return t.status === 'In review';
    if (chip === 'Due this week') return t.daysUntilDue !== undefined && t.daysUntilDue <= 7;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'Due date':
        return (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999);
      case 'Longest in status':
        return b.daysInStatus - a.daysInStatus;
      case 'Phase':
        return moduleDef(a.module).name.localeCompare(moduleDef(b.module).name);
      default:
        return urgencyScore(b) - urgencyScore(a);
    }
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-slate-900">Project Tasks</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Everything assigned to you, most urgent first.
          </p>
        </div>

        <label className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
          >
            {(['Most urgent', 'Due date', 'Longest in status', 'Phase'] as SortKey[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(['All', 'Blocked', 'In review', 'Due this week'] as FilterChip[]).map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
              chip === c
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c}
          </button>
        ))}
        <span
          className="ml-1 flex items-center gap-1 text-[10px] text-slate-400"
          title="Urgency combines due date, time blocked, and review wait."
        >
          <Info className="h-3 w-3" />
          How urgency works
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {sorted.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500">
            {tasks.length === 0
              ? 'You have no assigned tasks right now.'
              : 'No tasks match this filter.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sorted.map((t) => {
              const overThreshold = t.daysInStatus > ITEM_STATUS_DAYS;
              const overdue = t.daysUntilDue !== undefined && t.daysUntilDue < 0;
              const dueSoon = t.daysUntilDue !== undefined && t.daysUntilDue >= 0 && t.daysUntilDue <= 2;

              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900">
                    {t.title}
                  </span>

                  <span className="hidden w-20 shrink-0 text-right text-[10px] text-slate-500 sm:block">
                    {moduleDef(t.module).name}
                  </span>

                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      STATUS_PILL[t.status]
                    }`}
                  >
                    {t.status}
                  </span>

                  <span
                    className={`w-8 shrink-0 text-right font-mono text-[10px] ${
                      overThreshold ? 'font-bold text-amber-700' : 'text-slate-400'
                    }`}
                    title={`${t.daysInStatus} days in ${t.status.toLowerCase()}`}
                  >
                    {t.daysInStatus}d
                  </span>

                  <span
                    className={`hidden w-20 shrink-0 text-right font-mono text-[10px] md:block ${
                      overdue
                        ? 'font-bold text-rose-600'
                        : dueSoon
                        ? 'font-bold text-amber-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {t.due ?? '—'}
                  </span>

                  <button
                    onClick={() => onOpen(t.module)}
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
    </section>
  );
};
