import React, { useMemo } from 'react';
import '../specaiv2/specai-v2.css';
import { useApp } from '../../context/AppContext';
import { projectDelivery } from '../../data/delivery';
import { DELIVERY_STORIES } from '../../data/deliveryData';
import { DeliveryModule, deliveryTree } from '../../data/completion';
import { GENERATED_MODULES } from '../../data/specAiGenerated';
import { pmMetrics } from '../../data/pmMetrics';
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
  const { currentScope, currentRole, projects, tasks, agents, specAiFor, navigateTo } = useApp();

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

  /* The PM owns the specification rather than the delivery, so they get a second
     band. Everyone else sees the dashboard unchanged. */
  const isPm = currentRole === 'Product Manager';
  const pm = isPm ? pmMetrics(spec, delivery, project.id) : [];

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
            <Tile
              n={waiting}
              label="waiting"
              tone={waiting ? 'low' : 'high'}
              hint="Everything stopped on somebody: blocked work, pending approvals and unanswered decisions."
              why="The one number that says whether the project is moving. It is a roll-up of the four tiles beside it, so a rise here always has a specific cause next to it."
            />
            <Tile
              n={blocked}
              label="blocked"
              tone={blocked ? 'low' : 'high'}
              hint="Stories and tasks explicitly marked Blocked."
              why="Someone has stopped and said so. Unlike drift, this is self-reported, which makes it the most reliable signal here and the first one worth acting on."
            />
            <Tile
              n={attention.pendingApprovals.length}
              label="approvals"
              tone={attention.pendingApprovals.length ? 'med' : 'high'}
              hint="Tasks sitting in Needs Approval."
              why="Work that is finished and not counted. Approval queues are invisible in a completion percentage, which is why they get their own number."
            />
            <Tile
              n={openDecisions.length}
              label="decisions"
              tone={openDecisions.length ? 'med' : 'high'}
              hint="Spec AI questions still open, across both tracks."
              why="Questions retrieval could not answer. Each one is being carried forward as an assumption until somebody settles it."
            />
            <Tile
              n={drifting}
              label="drifting"
              tone={drifting ? 'med' : 'high'}
              hint="Scope-integrity failures: unscheduled, unworked, off-spec, stale and detached items."
              why="Nothing here is blocked, so none of it will announce itself. It is the quiet divergence between what was specified and what is being delivered — broken out in Scope integrity below."
            />
            <Tile
              n={`${measures.completionPercent}%`}
              label="stories done"
              hint="Stories at Done as a share of stories that report at all."
              why="Counted from delivery status, not from the completion figure typed on the project record. Stories with no tracker item are excluded, so this can read high on a thin backlog — read it beside 'never scheduled'."
            />
            <Tile
              n={`${measures.completedStories}/${measures.totalStories}`}
              label="stories"
              hint="Completed stories against the total that report."
              why="The absolute pair behind the percentage. A small denominator is the usual reason a completion figure looks better than the project feels."
            />
            <Tile
              n={`${measures.completedPoints}/${measures.totalPoints}`}
              label="points"
              hint="Completed story points against the total."
              why="Points and story counts diverge when the remaining work is the large work. If this trails the story ratio, what is left is heavier than what is done."
            />
          </div>

          {/* ── The specification owner's numbers ──
              Shown only to the Product Manager. A PM does not run delivery, so
              the questions they arrive with are different ones: what is still
              undecided and sitting on me, what does the spec assert that nothing
              backs, and did the thing I specified actually get built. */}
          {isPm && (
            <section className="dsh-card dsh-pm">
              <header>
                <b>Specification</b>
                <i>Product Manager</i>
              </header>
              <div className="dsh-tiles pm">
                {pm.map((m) => (
                  <Tile
                    key={m.key}
                    n={m.value}
                    label={m.label}
                    tone={m.tone}
                    hint={m.hint}
                    why={m.why}
                  />
                ))}
              </div>
            </section>
          )}

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
                <Tile
                  compact
                  n={gaps.neverExported.length}
                  label="never scheduled"
                  hint="Specified, but no tracker item was ever created."
                  why="The specification committed to these and nothing was ever opened against them. They are the most common way scope quietly disappears between Spec AI and delivery."
                />
                <Tile
                  compact
                  n={gaps.storiesWithoutTasks.length}
                  label="no work behind"
                  hint="Committed scope nobody is delivering."
                  why="A tracker item exists but no task sits under it. Distinct from blocked — nobody has stopped, because nobody has started."
                />
                <Tile
                  compact
                  n={gaps.tasksWithoutStories.length}
                  label="off-spec"
                  hint="Story-work being done that no specification asked for."
                  why="Effort that traces to no requirement. Sometimes necessary, always worth knowing about: it is spend the specification cannot account for."
                />
                <Tile
                  compact
                  n={gaps.staleStories.length}
                  label="stale"
                  hint="An upstream artifact changed after these were written."
                  why="Regenerating an artifact flags every story tracing to it. Nothing was deleted — these are being delivered against a version of the spec that has since moved."
                />
                <Tile
                  compact
                  n={tree?.orphans.length ?? 0}
                  label="detached"
                  hint="Attached to a feature the module map no longer has."
                  why="The module or feature was renamed, merged or removed after the story was generated. Detached stories vanish from every by-feature roll-up, including the one below."
                />
                <Tile
                  compact
                  neutral
                  n={`${measures.costAttributionPercent}%`}
                  label="spend attributed"
                  hint="Share of spend that can be traced to a specification."
                  why="The rest is real money against work with no requirement behind it. A low figure does not mean waste — it means the link was never recorded, so the question cannot be answered either way."
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

/**
 * A number and what it means.
 *
 * The tooltip is not decoration here. A dashboard figure is only actionable if
 * you know what it counts and why it moved, and a two-word label cannot carry
 * either — so every tile explains itself on hover and on keyboard focus.
 *
 * Two lines rather than one: `hint` says what is being counted, `why` says why
 * a person should care and where the number came from. A tooltip that only
 * restates the label is worse than none, because it teaches you to stop reading
 * them.
 *
 * Native `title` was the previous answer and is the wrong one — it waits a
 * second, truncates, cannot be styled, and never appears on focus, so it is
 * invisible to anyone not using a mouse.
 */
const Tile: React.FC<{
  n: number | string | null;
  label: string;
  tone?: 'high' | 'med' | 'low';
  hint: string;
  why?: string;
  /** Renders the compact form used inside the scope-integrity card. */
  compact?: boolean;
  /** A ratio rather than a count: zero is not automatically good. */
  neutral?: boolean;
}> = ({ n, label, tone, hint, why, compact, neutral }) => {
  const empty = n === null;
  const base = compact ? 'dsh-gap' : 'dsh-tile';

  return (
    <div
      className={`${base} dsh-tip-host ${tone ?? ''} ${
        compact && n === 0 ? 'zero' : ''
      } ${neutral ? 'neutral' : ''} ${empty ? 'nodata' : ''}`}
      tabIndex={0}
      /* The accessible name; the styled card below is the readable one. */
      aria-label={`${label}: ${empty ? 'no data' : n}. ${hint}`}
    >
      <b>{empty ? '—' : n}</b>
      <span>{label}</span>

      <span className="dsh-tip" role="tooltip">
        <b>{label}</b>
        <span>{hint}</span>
        {why && <em>{why}</em>}
      </span>
    </div>
  );
};
