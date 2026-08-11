import React, { useMemo } from 'react';
import '../specaiv2/specai-v2.css';
import { useApp } from '../../context/AppContext';
import { projectDelivery } from '../../data/delivery';
import { DELIVERY_STORIES } from '../../data/deliveryData';
import { DeliveryModule, deliveryTree } from '../../data/completion';
import { GENERATED_MODULES } from '../../data/specAiGenerated';
import { AlertTriangle, ArrowRight, Check, Clock, HelpCircle } from 'lucide-react';

/**
 * The project dashboard.
 *
 * Numbers, not sentences. An earlier version explained each state in a line of
 * prose — "someone is stopped, or waiting on a decision only you can make" —
 * which is a thing you read once and then have to read past every day after. A
 * dashboard is scanned, so the labels are two or three words and the figures do
 * the talking. Anything that needs a sentence is a tooltip.
 *
 * The state is derived, not reported: `project.completion` is typed by hand,
 * while blocked work, unscheduled specifications and unanswered decisions can
 * actually be counted. A project with nothing reporting is called out as such
 * rather than drawn at zero — no data and no problems look identical at 0%.
 */

type Health = 'needs-you' | 'drifting' | 'clear' | 'dark';

const HEALTH: Record<Health, string> = {
  'needs-you': 'Needs you',
  drifting: 'Drifting',
  clear: 'Clear',
  dark: 'No data',
};

interface Item {
  id: string;
  kind: 'Blocked' | 'Approval' | 'Decision';
  title: string;
  meta: string;
}

export const ProjectDashboardView: React.FC = () => {
  const { currentScope, projects, tasks, agents, specAiFor, navigateTo } = useApp();

  const project = projects.find((p) => p.id === currentScope.projectId) ?? projects[0];

  const delivery = useMemo(() => {
    if (!project) return null;
    /* Spec AI owns the backlog, so its stories are this project's stories. */
    const stories = project.id === 'p-mobile-v2' ? DELIVERY_STORIES : [];
    return projectDelivery({ project, stories, tasks });
  }, [project, tasks]);

  const spec = specAiFor(project?.id ?? '');
  const openDecisions = spec.questions.filter((q) => q.status === 'Open');
  const degraded = agents.filter((a) => !a.is_active);

  const tree = useMemo(
    () => (delivery ? deliveryTree(GENERATED_MODULES(), delivery.stories) : null),
    [delivery]
  );

  if (!project || !delivery) {
    return (
      <div className="sx dsh">
        <div className="dsh-empty">No project is in scope.</div>
      </div>
    );
  }

  const { gaps, attention, measures } = delivery;
  const instrumented = delivery.stories.length > 0;

  const blocked = attention.blockedStories.length + attention.blockedTasks.length;
  const waiting = blocked + attention.pendingApprovals.length + openDecisions.length;
  const drifting =
    gaps.storiesWithoutTasks.length +
    gaps.tasksWithoutStories.length +
    gaps.neverExported.length +
    gaps.staleStories.length;

  const health: Health = !instrumented
    ? 'dark'
    : waiting > 0
    ? 'needs-you'
    : drifting > 0
    ? 'drifting'
    : 'clear';

  const daysLeft = Math.round(
    (new Date(project.targetReleaseDate).getTime() - Date.now()) / 86_400_000
  );

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
      meta: t.reviewHoursOpen ? `${t.reviewHoursOpen}h` : t.assignee,
    })),
    ...openDecisions.map((q) => ({
      id: q.id,
      kind: 'Decision' as const,
      title: q.text,
      meta: 'unanswered',
    })),
  ];

  return (
    <div className="sx dsh">
      <header className="dsh-head">
        <div className="dsh-id">
          <span className="dsh-eyebrow">
            {project.departmentName} · {project.phase}
          </span>
          <h1>{project.name}</h1>
        </div>
        <span className={`dsh-chip ${health}`}>{HEALTH[health]}</span>
        {instrumented && (
          <span className="dsh-when">
            <b>{daysLeft > 0 ? daysLeft : 0}</b>d
            <em>{project.targetReleaseDate}</em>
          </span>
        )}
      </header>

      {!instrumented ? (
        <div className="dsh-dark">
          <b>—</b>
          <p>
            No stories or tasks report against this project. The {project.completion}% on the
            project record is entered by hand.
          </p>
          <button className="dsh-cta" onClick={() => navigateTo('Command Centre')}>
            Command Centre <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <>
          {/* ── The numbers ── */}
          <div className="dsh-tiles">
            <Tile n={waiting} label="waiting" tone={waiting ? 'low' : 'high'} />
            <Tile n={blocked} label="blocked" tone={blocked ? 'low' : 'high'} />
            <Tile
              n={attention.pendingApprovals.length}
              label="approvals"
              tone={attention.pendingApprovals.length ? 'med' : 'high'}
            />
            <Tile
              n={openDecisions.length}
              label="decisions"
              tone={openDecisions.length ? 'med' : 'high'}
            />
            <Tile n={drifting} label="drifting" tone={drifting ? 'med' : 'high'} />
            <Tile n={`${measures.completionPercent}%`} label="stories done" />
            <Tile n={`${measures.completedStories}/${measures.totalStories}`} label="stories" />
            <Tile n={`${measures.completedPoints}/${measures.totalPoints}`} label="points" />
          </div>

          <div className="dsh-cols">
            <section className="dsh-card">
              <header>
                <b>Waiting</b>
                <i>{items.length}</i>
              </header>

              {items.length === 0 ? (
                <p className="dsh-none">
                  <Check size={13} /> Nothing waiting
                </p>
              ) : (
                <ul className="dsh-list">
                  {items.slice(0, 8).map((i) => (
                    <li key={i.id}>
                      <span className={`dsh-k ${i.kind.toLowerCase()}`}>
                        {i.kind === 'Blocked' ? (
                          <AlertTriangle size={11} />
                        ) : i.kind === 'Approval' ? (
                          <Clock size={11} />
                        ) : (
                          <HelpCircle size={11} />
                        )}
                      </span>
                      <span className="dsh-t">{i.title}</span>
                      <span className="dsh-m">{i.meta}</span>
                    </li>
                  ))}
                </ul>
              )}

              {items.length > 8 && <p className="dsh-more">+{items.length - 8}</p>}
            </section>

            {/* Counts only. The sentence explaining each one is a tooltip — it is
                the same sentence every day once you have learnt it. */}
            <section className="dsh-card">
              <header>
                <b>Scope integrity</b>
              </header>
              <div className="dsh-gaps">
                <Gap
                  n={gaps.neverExported.length}
                  label="never scheduled"
                  hint="Specified, but no tracker item was ever created."
                />
                <Gap
                  n={gaps.storiesWithoutTasks.length}
                  label="no work behind"
                  hint="Committed scope nobody is delivering."
                />
                <Gap
                  n={gaps.tasksWithoutStories.length}
                  label="off-spec"
                  hint="Story-work being done that no specification asked for."
                />
                <Gap
                  n={gaps.staleStories.length}
                  label="stale"
                  hint="An upstream artifact changed after these were written."
                />
                <Gap
                  n={tree?.orphans.length ?? 0}
                  label="detached"
                  hint="Attached to a feature the module map no longer has."
                />
                <Gap
                  n={`${measures.costAttributionPercent}%`}
                  label="spend attributed"
                  hint="Share of spend that can be traced to a specification."
                  neutral
                />
              </div>
            </section>
          </div>

          {tree && (
            <section className="dsh-card">
              <header>
                <b>By feature</b>
              </header>
              <div className="dsh-feats">
                {tree.modules
                  .flatMap((m: DeliveryModule) =>
                    m.features
                      .filter((f) => f.stories.length > 0)
                      /* DeliveryFeature carries done/total, not a percentage —
                         it is derived here rather than assumed to exist. */
                      .map((f) => ({
                        ...f,
                        module: m.name,
                        percent: f.total === 0 ? 0 : Math.round((f.done / f.total) * 100),
                      }))
                  )
                  .sort((a, b) => a.percent - b.percent)
                  .map((f) => (
                    <div className="dsh-feat" key={`${f.module}-${f.name}`}>
                      <span className="dsh-fn">
                        {f.name}
                        <em>{f.module}</em>
                      </span>
                      <span className="dsh-bar">
                        <i style={{ width: `${f.percent}%` }} />
                      </span>
                      <span className="dsh-fp">{f.percent}%</span>
                      <span className="dsh-fc">
                        {f.done}/{f.total}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {degraded.length > 0 && (
            <p className="dsh-warn standalone">
              <AlertTriangle size={12} />
              {degraded.length} AI capabilit{degraded.length === 1 ? 'y' : 'ies'} inactive
            </p>
          )}
        </>
      )}
    </div>
  );
};

const Tile: React.FC<{
  n: number | string;
  label: string;
  tone?: 'high' | 'med' | 'low';
}> = ({ n, label, tone }) => (
  <div className={`dsh-tile ${tone ?? ''}`}>
    <b>{n}</b>
    <span>{label}</span>
  </div>
);

const Gap: React.FC<{
  n: number | string;
  label: string;
  hint: string;
  neutral?: boolean;
}> = ({ n, label, hint, neutral }) => (
  <div className={`dsh-gap ${n === 0 ? 'zero' : ''} ${neutral ? 'neutral' : ''}`} title={hint}>
    <b>{n}</b>
    <span>{label}</span>
  </div>
);
