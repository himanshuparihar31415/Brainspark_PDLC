import { Task } from '../types';

/**
 * What counts as critical, in one place.
 *
 * My Activity and the Project Tasks screen both have to agree on this, or a row
 * you clicked because it was flagged arrives somewhere that does not think it is
 * — so the rule lives here rather than being written twice.
 *
 * Deliberately narrow. A panel that flags everything flags nothing, and the
 * whole point of surfacing other people's work is that you only see it when it
 * has actually stopped.
 */

/** Hours an approval can sit before it is somebody's problem. */
export const REVIEW_STALE_HOURS = 24;

export type CriticalReason = 'Blocked' | 'Overdue' | 'Approval waiting' | 'High priority';

/**
 * Why this task is critical, or null if it is not. Returning the reason rather
 * than a boolean is what lets the row say *why* it is on the list — a flag with
 * no explanation is just a red dot you learn to ignore.
 *
 * `now` is injected so the caller controls the clock; the fixture dates sit in
 * 2026 and a hard-coded `Date.now()` would make this untestable.
 */
export const criticalReason = (task: Task, now: Date = new Date()): CriticalReason | null => {
  if (task.status === 'Completed') return null;

  if (task.status === 'Blocked') return 'Blocked';

  const due = new Date(task.dueDate);
  if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) return 'Overdue';

  if (task.status === 'Needs Approval' && (task.reviewHoursOpen ?? 0) >= REVIEW_STALE_HOURS)
    return 'Approval waiting';

  if (task.priority === 'High') return 'High priority';

  return null;
};

export const isCritical = (task: Task, now?: Date): boolean => criticalReason(task, now) !== null;

/** Worst first: stopped, then late, then waiting, then merely important. */
const ORDER: CriticalReason[] = ['Blocked', 'Overdue', 'Approval waiting', 'High priority'];

export const compareCritical = (a: Task, b: Task, now?: Date): number => {
  const ra = criticalReason(a, now);
  const rb = criticalReason(b, now);
  const ia = ra ? ORDER.indexOf(ra) : ORDER.length;
  const ib = rb ? ORDER.indexOf(rb) : ORDER.length;
  if (ia !== ib) return ia - ib;
  /* Within a band, the one that has been waiting longest. */
  return (b.reviewHoursOpen ?? 0) - (a.reviewHoursOpen ?? 0);
};

export const REASON_TONE: Record<CriticalReason, string> = {
  Blocked: 'bg-rose-500',
  Overdue: 'bg-rose-400',
  'Approval waiting': 'bg-amber-500',
  'High priority': 'bg-indigo-400',
};

export const REASON_CHIP: Record<CriticalReason, string> = {
  Blocked: 'bg-rose-50 text-rose-700 border-rose-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  'Approval waiting': 'bg-amber-50 text-amber-800 border-amber-200',
  'High priority': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

/**
 * Critical work sitting in projects other than the one you are scoped to, and
 * not assigned to you.
 *
 * Yours already appears above, grouped by project — repeating it here would
 * double-count the queue. What this adds is the thing you would otherwise only
 * find by switching projects one at a time and looking.
 */
export const criticalElsewhere = (
  tasks: Task[],
  currentProjectId: string | undefined,
  mine: (t: Task) => boolean,
  now?: Date
): Task[] =>
  tasks
    .filter((t) => t.projectId !== currentProjectId && !mine(t) && isCritical(t, now))
    .sort((a, b) => compareCritical(a, b, now));
