import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Check, Clock, FileWarning, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { projectDelivery } from '../../data/delivery';
import { pmMetrics } from '../../data/pmMetrics';
import { codeIqProjectFor, countBy, trustSplit, unbuiltStories } from '../../data/codeiq';

/**
 * What is waiting on this project, beneath the rollup.
 *
 * Every persona now opens the same dashboard — the Project Admin's tiles and
 * phase strip — which answers *how is the project doing*. It does not answer *is
 * anything waiting on me*, and that was the whole job of the separate PDLC
 * dashboard this replaces. So the question comes back here, below the numbers,
 * for everyone rather than for one role.
 *
 * Three bands, in the order they are acted on:
 *
 *   · CodeIQ — was the work that says it is done actually built
 *   · Waiting — the specific things that have stopped, by name
 *   · Specification — the Product Manager's own queue, and only theirs
 *
 * Written in the platform's own styling rather than a module stylesheet. The view
 * it replaces imported Spec AI v2's CSS, which meant the project dashboard was a
 * third visual language on a screen that belongs to the platform.
 */

type Health = 'needs-you' | 'clear' | 'dark';

const HEALTH: Record<Health, { label: string; cls: string }> = {
  'needs-you': { label: 'Needs you', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  clear: { label: 'Clear', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  dark: { label: 'No data', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

interface Item {
  id: string;
  kind: 'Blocked' | 'Approval' | 'Decision' | 'Not built';
  title: string;
  meta: string;
}

const KIND_ICON: Record<Item['kind'], React.ReactNode> = {
  Blocked: <AlertTriangle className="h-3 w-3" />,
  Approval: <Clock className="h-3 w-3" />,
  Decision: <HelpCircle className="h-3 w-3" />,
  'Not built': <FileWarning className="h-3 w-3" />,
};

const KIND_TONE: Record<Item['kind'], string> = {
  Blocked: 'bg-rose-50 text-rose-700 border-rose-200',
  Approval: 'bg-amber-50 text-amber-800 border-amber-200',
  Decision: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Not built': 'bg-rose-50 text-rose-700 border-rose-200',
};

const Stat: React.FC<{
  n: number | string | null;
  label: string;
  hint: string;
  tone?: 'bad' | 'warn';
}> = ({ n, label, hint, tone }) => (
  <div className="min-w-0" title={hint}>
    <div
      className={`font-mono text-xl font-extrabold leading-none ${
        n === null
          ? 'text-slate-300'
          : tone === 'bad'
          ? 'text-rose-600'
          : tone === 'warn'
          ? 'text-amber-600'
          : 'text-slate-900'
      }`}
    >
      {n === null ? '—' : n}
    </div>
    <div className="mt-1 text-[11px] text-slate-500">{label}</div>
  </div>
);

export const ProjectSignals: React.FC = () => {
  const { currentScope, currentRole, projects, tasks, specAiFor, codeIqFor, navigateTo } = useApp();

  const project = projects.find((p) => p.id === currentScope.projectId) ?? null;
  const spec = specAiFor(project?.id ?? '');

  /*
   * Spec AI owns the backlog, so its stories are this project's stories.
   *
   * The view this replaces read `project.id === 'p-mobile-v2' ? DELIVERY_STORIES
   * : []` — a hardcoded project id, which meant every other project's dashboard
   * was drawn from an empty backlog. Reading the state answers the question for
   * whichever project is in scope.
   */
  const delivery = useMemo(
    () => (project ? projectDelivery({ project, stories: spec.stories, tasks }) : null),
    [project, spec.stories, tasks]
  );

  /* One project at a time — see codeIqProjectFor for why there is no rollup. */
  const cqProject = codeIqProjectFor(currentScope, projects);
  const cq = codeIqFor(cqProject?.id ?? '');

  if (!project || !delivery) return null;

  const openDecisions = spec.questions.filter((q) => q.status === 'Open');
  const { attention } = delivery;

  /* Null, not zero: no lineage and no gaps look identical at 0. */
  const unbuilt = cq.indexed ? unbuiltStories(cq.targets) : null;
  const unbuiltCriteria =
    unbuilt === null ? null : unbuilt.reduce((n, t) => n + countBy(t.criteria).missing, 0);
  const trust = trustSplit(cq.targets);

  const items: Item[] = [
    ...attention.blockedTasks.map((t) => ({
      id: t.id,
      kind: 'Blocked' as const,
      title: t.title,
      meta: t.assignee,
    })),
    ...attention.blockedStories.map((s) => ({
      id: s.id,
      kind: 'Blocked' as const,
      title: s.title,
      meta: s.key,
    })),
    ...attention.pendingApprovals.map((t) => ({
      id: t.id,
      kind: 'Approval' as const,
      title: t.title,
      meta: t.reviewHoursOpen ? `${t.reviewHoursOpen}h open` : t.assignee,
    })),
    ...openDecisions.map((q) => ({
      id: q.id,
      kind: 'Decision' as const,
      title: q.text,
      meta: 'unanswered',
    })),
    /*
     * A story marked done whose criteria have no code is waiting on somebody by
     * exactly the same definition as a blocked task — the difference is that
     * nobody has noticed yet. Which is why it belongs in this list rather than
     * only inside CodeIQ.
     */
    ...(unbuilt ?? []).map((t) => ({
      id: t.storyId,
      kind: 'Not built' as const,
      title: t.title,
      meta: `${countBy(t.criteria).missing} ${
        countBy(t.criteria).missing === 1 ? 'criterion' : 'criteria'
      }`,
    })),
  ];

  /*
   * Worst first, and this ordering is load-bearing because the list renders only
   * its first eight.
   *
   * Built in source order the unbuilt rows landed last, so on a project with
   * eight blocked tasks and approvals they were sliced off the bottom every time
   * — present in the count, invisible on the screen. Blocked outranks them
   * because somebody has already said they are stuck; unbuilt comes next
   * precisely because nobody has noticed yet, which is the whole reason it is
   * worth surfacing above an approval queue people can already see.
   */
  const RANK: Record<Item['kind'], number> = {
    Blocked: 0,
    'Not built': 1,
    Approval: 2,
    Decision: 3,
  };
  items.sort((a, b) => RANK[a.kind] - RANK[b.kind]);

  const instrumented = delivery.stories.length > 0 || tasks.some((t) => t.projectId === project.id);

  /*
   * Health has to count the unbuilt work.
   *
   * Without it a project with nothing blocked, nothing awaiting approval and five
   * criteria claimed-done-with-no-code reads "Clear" — which is the exact false
   * all-clear CodeIQ exists to prevent.
   */
  const health: Health = !instrumented ? 'dark' : items.length > 0 ? 'needs-you' : 'clear';

  const isPm = currentRole === 'Product Manager';
  const pm = isPm ? pmMetrics(spec, cq) : [];

  return (
    <div className="space-y-6">
      {/* ── Was the work that says it is done actually built ── */}
      <section className="platform-card px-5 py-4">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">CodeIQ</h2>
            <p className="text-[11px] text-slate-500">
              Acceptance criteria mapped onto the code that was actually written.
            </p>
          </div>
          <button
            className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
            onClick={() => navigateTo('CodeIQ')}
          >
            Open CodeIQ <ArrowRight className="h-3 w-3" />
          </button>
        </header>

        {!cq.feeds.source ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500">
            No source control is connected for this project, so nothing has been read. Which is not
            the same as finding no gaps.
          </p>
        ) : !cq.indexed ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500">
            {cq.feeds.live.join(' and ')} connected, nothing indexed yet. No verdict either way on
            what has been built.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Stat
                n={unbuiltCriteria}
                label="criteria with no code"
                tone={unbuiltCriteria ? 'bad' : undefined}
                hint="Acceptance criteria with nothing in the change set behind them, on work already marked done."
              />
              <Stat
                n={trust.overstated}
                label={`of ${trust.claimed} marked done`}
                tone={trust.overstated ? 'warn' : undefined}
                hint="Stories the tracker calls done that still carry a missing, drifted or partial criterion."
              />
              <Stat
                n={cq.state.untracked.length}
                label="untracked commits"
                hint="Commits CodeIQ could not join to any story. Not a violation by default — each repo carries a policy."
              />
            </div>

            {/* The named stories, because a count is not something you can act on. */}
            {unbuilt !== null && unbuilt.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                {unbuilt.slice(0, 4).map((t) => (
                  <li key={t.storyId} className="flex items-center gap-2.5 text-xs">
                    <span className="font-mono text-[11px] text-indigo-600">{t.storyKey}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{t.title}</span>
                    <span className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-px font-mono text-[10px] font-bold text-rose-700">
                      {countBy(t.criteria).missing} not built
                    </span>
                  </li>
                ))}
                {unbuilt.length > 4 && (
                  <li className="text-[11px] text-slate-400">+{unbuilt.length - 4} more</li>
                )}
              </ul>
            )}
          </>
        )}
      </section>

      {/* ── What is waiting, by name ── */}
      <section className="platform-card px-5 py-4">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-extrabold text-slate-900">Waiting</h2>
            <span
              className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${HEALTH[health].cls}`}
            >
              {HEALTH[health].label}
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">{items.length}</span>
        </header>

        {!instrumented ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500">
            Nothing reports against this project yet. The {project.completion}% on the project
            record is entered by hand.
          </p>
        ) : items.length === 0 ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Nothing waiting
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.slice(0, 8).map((i) => (
              <li key={`${i.kind}-${i.id}`} className="flex items-center gap-2.5 text-xs">
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-px text-[10px] font-bold ${
                    KIND_TONE[i.kind]
                  }`}
                >
                  {KIND_ICON[i.kind]}
                  {i.kind}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-700">{i.title}</span>
                <span className="shrink-0 font-mono text-[10px] text-slate-400">{i.meta}</span>
              </li>
            ))}
            {items.length > 8 && (
              <li className="text-[11px] text-slate-400">+{items.length - 8} more</li>
            )}
          </ul>
        )}
      </section>

      {/* ── The specification owner's own queue. Nobody else has one. ── */}
      {isPm && (
        <section className="platform-card px-5 py-4">
          <header className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold text-slate-900">Specification</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Product Manager
            </span>
          </header>
          <div className="grid grid-cols-3 gap-4">
            {pm.map((m) => (
              <Stat
                key={m.key}
                n={m.value}
                label={m.label}
                hint={`${m.hint} ${m.why}`}
                tone={m.tone === 'low' ? 'bad' : m.tone === 'med' ? 'warn' : undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
