import React, { useState } from 'react';
import './codeiq.css';
import { useApp } from '../../context/AppContext';
import { Criterion, ReviewTarget, ThrashRow } from '../../types/codeiq';
import { REVIEW_TARGETS, THRASH } from '../../data/codeiq';
import { ReviewPanel } from './ReviewPanel';
import { DashboardPanel } from './DashboardPanel';

/**
 * CodeIQ — intent-to-code lineage and adjudication.
 *
 * Two surfaces, because those are the two the module actually owes anyone: the
 * review panel a developer or reviewer reads against a PR, and the leadership
 * dashboard. The traceability graph is a third surface and is not built here.
 *
 * In the product these are not both a portal. The review panel belongs inline
 * in the IDE and on the PR comment — a developer should almost never "go to
 * CodeIQ". The tab strip is a demo affordance, and the copy says so rather than
 * quietly implying a portal-first design.
 */

type Surface = 'review' | 'dashboard';

/** Who is acting, for the dismissal record. Never anonymous. */
const stamp = () =>
  new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const CodeIQView: React.FC = () => {
  const { currentUser, addToast, addAuditLog } = useApp();
  const actor = currentUser?.name ?? 'Unknown user';

  const [surface, setSurface] = useState<Surface>('review');
  const [targets, setTargets] = useState<ReviewTarget[]>(REVIEW_TARGETS);
  const [activeTicket, setActiveTicket] = useState(REVIEW_TARGETS[0].ticket);
  const [thrash, setThrash] = useState<ThrashRow[]>(THRASH);

  const target = targets.find((t) => t.ticket === activeTicket) ?? targets[0];

  /** Rewrite one criterion inside the active target, leaving everything else alone. */
  const patchCriterion = (id: string, fn: (c: Criterion) => Criterion) =>
    setTargets((all) =>
      all.map((t) =>
        t.ticket !== target.ticket
          ? t
          : { ...t, criteria: t.criteria.map((c) => (c.id === id ? fn(c) : c)) }
      )
    );

  /**
   * What each action does.
   *
   * The two that change the verdict — "not applicable" and "drift accepted" —
   * write a dismissal rather than deleting the row. A silently removed finding
   * is indistinguishable from one that was never found, and the graph is only
   * worth trusting if an override leaves a name behind it.
   */
  const act = (criterion: Criterion, action: string, secondary: boolean) => {
    const audit = (outcome: string) =>
      addAuditLog('CodeIQ Adjudication', `${target.ticket} · ${criterion.id}`, action, outcome);

    if (!secondary) {
      switch (criterion.status) {
        case 'missing':
          patchCriterion(criterion.id, (c) => ({ ...c, flaggedUpstream: true }));
          addToast(`${criterion.id} sent back to Spec AI as unrealized.`);
          audit('Returned upstream to Spec AI');
          return;
        case 'drifted':
          addToast(`${criterion.id} flagged for rework. The PR is not blocked.`, 'info');
          audit('Flagged for rework; merge not gated');
          return;
        case 'partial':
          addToast(`Showing the part of ${criterion.id} with no mapped code.`, 'info');
          audit('Inspected partial coverage');
          return;
        default:
          addToast(`Evidence for ${criterion.id} — ${criterion.files.length} mapped files.`, 'info');
          audit('Viewed evidence');
          return;
      }
    }

    /* Secondary actions are the overrides, and all of them are recorded. */
    const as: Criterion['dismissal'] =
      criterion.status === 'drifted'
        ? {
            by: actor,
            at: stamp(),
            as: 'drift accepted',
            reason: 'Realized behaviour accepted as intended; the criterion is now out of date.',
          }
        : criterion.status === 'missing'
        ? {
            by: actor,
            at: stamp(),
            as: 'not applicable',
            reason: 'Marked not applicable to this change set.',
          }
        : criterion.status === 'partial'
        ? {
            by: actor,
            at: stamp(),
            as: 'accepted as complete',
            reason: 'Remaining scope accepted as out of this ticket.',
          }
        : undefined;

    if (!as) {
      addToast('Mapping disputed. Recorded against the lineage.', 'info');
      audit('Mapping disputed');
      return;
    }

    patchCriterion(criterion.id, (c) => ({ ...c, dismissal: as }));
    addToast(`${criterion.id} — ${as.as}. Recorded against ${actor}.`, 'info');
    audit(`Dismissed as ${as.as}`);
  };

  const sendUpstream = (row: ThrashRow) => {
    setThrash((rows) =>
      rows.map((r) =>
        r.ticket === row.ticket && r.criterionId === row.criterionId
          ? { ...r, sentUpstream: true }
          : r
      )
    );
    addToast(`${row.ticket} ${row.criterionId} sent to Spec AI as under-specified.`);
    addAuditLog(
      'CodeIQ Thrash Signal',
      `${row.ticket} · ${row.criterionId}`,
      `${row.discarded} of ${row.attempts} attempts discarded over ${row.days} days`,
      'Emitted upstream to Spec AI'
    );
  };

  const openTicket = (key: string) => {
    if (!targets.some((t) => t.ticket === key)) {
      addToast(`No review panel wired for ${key} in this mock.`, 'info');
      return;
    }
    setActiveTicket(key);
    setSurface('review');
  };

  return (
    <div className="cq">
      <header className="cq-top">
        <span className="cq-mark">
          CodeIQ
          <em>intent → code lineage</em>
        </span>

        <div className="cq-tabs">
          <button className={surface === 'review' ? 'on' : ''} onClick={() => setSurface('review')}>
            Review
          </button>
          <button
            className={surface === 'dashboard' ? 'on' : ''}
            onClick={() => setSurface('dashboard')}
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="cq-body">
        {surface === 'review' ? (
          <ReviewPanel
            target={target}
            targets={targets}
            onPickTarget={setActiveTicket}
            onAct={act}
          />
        ) : (
          <DashboardPanel
            thrash={thrash}
            onSendUpstream={sendUpstream}
            onOpenTicket={openTicket}
          />
        )}
      </div>
    </div>
  );
};
