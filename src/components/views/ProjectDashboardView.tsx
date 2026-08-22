import React, { useMemo } from 'react';
import '../specaiv2/specai-v2.css';
import { useApp } from '../../context/AppContext';
import { projectDelivery } from '../../data/delivery';
import { DELIVERY_STORIES } from '../../data/deliveryData';
import { pmMetrics } from '../../data/pmMetrics';
import { AlertTriangle, ArrowRight, Check, Clock, HelpCircle } from 'lucide-react';

/**
 * The project dashboard, for the people doing the work.
 *
 * It is not a project-management readout. A Product Manager, an Architect, a QA
 * Engineer and a developer all open this to answer one question — *is anything
 * waiting on me, and is this project in trouble* — and everything that does not
 * help answer it was making that harder to see.
 *
 * So it is three things and nothing else: whether the project is healthy, the
 * few counts that mean a person is stopped, and the specific list of what is
 * waiting. Scope integrity, per-feature burndown, story and point ratios were
 * all real numbers, and all of them are somebody's weekly review rather than
 * anybody's Monday morning.
 *
 * The one exception is the Product Manager, who owns the specification rather
 * than the delivery and gets a second band for it. Nobody else has one, and a
 * band that is empty for a role should not render at all.
 *
 * The state is derived, not reported: `project.completion` is typed by hand,
 * while blocked work and unanswered decisions can actually be counted. A project
 * with nothing reporting is called out as such rather than drawn at zero — no
 * data and no problems look identical at 0%.
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
  const { currentScope, currentRole, projects, tasks, agents, specAiFor, codeIqFor, navigateTo } =
    useApp();

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

  if (!project || !delivery) {
    return (
      <div className="sx dsh">
        <div className="dsh-empty">No project is in scope.</div>
      </div>
    );
  }

  const { attention, measures } = delivery;
  const instrumented = delivery.stories.length > 0;

  /* The PM owns the specification rather than the delivery, so they get a second
     band. Everyone else sees the three counts and the list. */
  const isPm = currentRole === 'Product Manager';
  const pm = isPm ? pmMetrics(spec, codeIqFor(project.id)) : [];

  const blocked = attention.blockedStories.length + attention.blockedTasks.length;
  const approvals = attention.pendingApprovals.length;
  const waiting = blocked + approvals + openDecisions.length;

  const health: Health = !instrumented ? 'dark' : waiting > 0 ? 'needs-you' : 'clear';

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
          {/* ── The only counts that mean somebody is stopped ── */}
          <div className="dsh-tiles lean">
            <Tile
              n={blocked}
              label="blocked"
              tone={blocked ? 'low' : 'high'}
              hint="Stories and tasks explicitly marked Blocked."
              why="Someone has stopped and said so. Self-reported, which makes it the most reliable number here and the first one worth acting on."
            />
            <Tile
              n={approvals}
              label="approvals"
              tone={approvals ? 'med' : 'high'}
              hint="Tasks sitting in Needs Approval."
              why="Work that is finished and not counted. Approval queues are invisible in a completion percentage, which is why they get their own number."
            />
            {/* For a PM this is the Specification band's job, in more detail. */}
            {!isPm && (
              <Tile
                n={openDecisions.length}
                label="decisions"
                tone={openDecisions.length ? 'med' : 'high'}
                hint="Spec AI questions still open."
                why="Questions retrieval could not answer. Each one is being carried forward as an assumption until somebody settles it."
              />
            )}
            <Tile
              n={`${measures.completionPercent}%`}
              label="stories done"
              hint="Stories at Done as a share of stories that report at all."
              why="Counted from delivery status, not the completion figure typed on the project record. Stories with no tracker item are excluded, so a thin backlog reads high."
            />
          </div>

          {/* ── The specification owner's numbers ──
              Shown only to the Product Manager, and only three: what must I
              answer, what must I approve, did what I specified get built. Each
              one is a verb. */}
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

          {/* ── What is actually waiting, by name ──
              The counts above say how much; this says which. It is the only
              block on the page anybody can act on directly. */}
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
 * Two lines rather than one: `hint` says what is being counted, `why` says why a
 * person should care and where the number came from. A tooltip that only
 * restates the label is worse than none, because it teaches you to stop reading
 * them.
 */
const Tile: React.FC<{
  n: number | string | null;
  label: string;
  tone?: 'high' | 'med' | 'low';
  hint: string;
  why?: string;
}> = ({ n, label, tone, hint, why }) => {
  const empty = n === null;

  return (
    <div
      className={`dsh-tile dsh-tip-host ${tone ?? ''} ${empty ? 'nodata' : ''}`}
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
