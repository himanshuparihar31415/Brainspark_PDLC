import React from 'react';
import { ModuleKey, Task } from '../../types';
import { MODULE_DEFS, REVIEW_HOURS_WARN, moduleKeyFor, relativeTime } from '../../data/modules';
import { ArrowRight, Hourglass } from 'lucide-react';

export interface ReviewRow {
  id: string;
  artifact: string;
  module: ModuleKey;
  /** Minutes since the agent produced it. */
  producedMinutesAgo: number;
  /** The Review Turnaround clock. */
  waitingHours: number;
}

/*
 * Falling back to 'specai' keeps the row renderable when a tracker sends a module
 * name the platform has never seen. It is a display default, not a claim: the
 * resolver returning null is the signal that a label needs adding to
 * MODULE_DEFS.aliases.
 */
const moduleKeyFromName = (name: string): ModuleKey => moduleKeyFor(name) ?? 'specai';

export const buildReviewQueue = (tasks: Task[]): ReviewRow[] =>
  tasks
    .filter((t) => t.status === 'Needs Approval')
    .map((t) => ({
      id: t.id,
      artifact: t.artifactTitle ?? t.title,
      module: moduleKeyFromName(t.module),
      producedMinutesAgo: (t.reviewHoursOpen ?? 1) * 60,
      waitingHours: t.reviewHoursOpen ?? 0,
    }))
    .sort((a, b) => b.waitingHours - a.waitingHours);

const formatWait = (hours: number): string =>
  hours >= 24 ? `${Math.floor(hours / 24)}d` : `${hours}h`;

export const AwaitingReview: React.FC<{
  rows: ReviewRow[];
  onReview: (module: ModuleKey) => void;
}> = ({ rows, onReview }) => (
  <section className="space-y-2.5">
    <div>
      <h2 className="text-base font-extrabold tracking-tight text-slate-900">
        Awaiting review ({rows.length})
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Artifacts an agent produced that need a human decision.
      </p>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500">
          Nothing waiting on your review.
        </p>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {rows.map((r) => {
              const late = r.waitingHours > REVIEW_HOURS_WARN;
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Hourglass
                    className={`h-3.5 w-3.5 shrink-0 ${
                      late ? 'text-amber-600' : 'text-indigo-500'
                    }`}
                  />

                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900">
                    {r.artifact}
                  </span>

                  <span className="hidden w-20 shrink-0 text-right text-[10px] text-slate-500 sm:block">
                    {MODULE_DEFS.find((d) => d.key === r.module)?.name}
                  </span>

                  <span className="hidden w-24 shrink-0 text-right text-[10px] text-slate-400 md:block">
                    {relativeTime(r.producedMinutesAgo)}
                  </span>

                  <span
                    className={`w-10 shrink-0 text-right font-mono text-[10px] font-bold ${
                      late ? 'text-amber-700' : 'text-slate-500'
                    }`}
                    title="Review turnaround so far"
                  >
                    {formatWait(r.waitingHours)}
                  </span>

                  <button
                    onClick={() => onReview(r.module)}
                    className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-indigo-700"
                  >
                    Review <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
          <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] text-slate-500">
            Reviewing here opens the artifact in its module workspace.
          </p>
        </>
      )}
    </div>
  </section>
);
