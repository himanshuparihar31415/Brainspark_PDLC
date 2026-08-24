import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  FileCode2,
  GitBranch,
  Sparkles,
} from 'lucide-react';
import { Criterion, CriterionStatus, ReviewTarget } from '../../types/codeiq';
import {
  ACCURACY_NOTE,
  STATUS_ACTION,
  STATUS_COPY,
  countBy,
  gapHeadline,
} from '../../data/codeiq';

/**
 * The review panel — the acceptance-criteria checklist.
 *
 * This is the surface that lives inline in the IDE and on the PR; the portal
 * rendering here is the same content given room. Three rules run through it:
 *
 *   · Lead with the gap, never a completion score. A percentage is
 *     directionally right, precisely wrong, and over-trusted the moment it
 *     exists — so the headline counts what has no code.
 *   · Every status carries an action, not just a colour. A row you can only
 *     look at is a report; a row you can act on is a tool.
 *   · Dismissals are recorded, never silent. The lineage is only worth
 *     trusting if every override left a name and a reason behind it.
 */

const STATUS_ORDER: CriterionStatus[] = ['missing', 'drifted', 'partial', 'covered'];

/** Worst first. The thing needing attention should never be below the fold. */
const rank = (c: Criterion) => STATUS_ORDER.indexOf(c.status);

const CriterionRow: React.FC<{
  criterion: Criterion;
  open: boolean;
  onToggle: () => void;
  onAct: (criterion: Criterion, action: string, secondary: boolean) => void;
}> = ({ criterion: c, open, onToggle, onAct }) => {
  const copy = STATUS_COPY[c.status];
  const actions = STATUS_ACTION[c.status];
  const kept = c.lineage.filter((g) => g.kept);
  const discarded = c.lineage.filter((g) => !g.kept);
  const behavioral = c.files.filter((f) => f.change === 'behavioral').length;

  return (
    <div className={`cq-c ${c.dismissal ? 'dismissed' : ''}`}>
      <button className="cq-ch" onClick={onToggle}>
        <span className={`cq-st ${copy.tone}`}>{copy.label}</span>
        <span className="cq-cid">{c.id}</span>

        <span className="cq-ct">
          <b>Given</b>
          {c.given} <b>When</b>
          {c.when} <b>Then</b>
          {c.then}
          <span className="cq-cmeta">
            <span>
              {c.files.length === 0
                ? 'no files mapped'
                : `${behavioral} behavioural · ${c.files.length} mapped`}
            </span>
            <span className={c.tests.present ? '' : 'no-test'}>
              {c.tests.present ? 'unit test present' : 'no unit test'}
            </span>
            {discarded.length > 0 && <span>{discarded.length} discarded</span>}
            <span>{Math.round(c.confidence * 100)}% confidence</span>
          </span>
        </span>

        <span className="cq-caret">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {open && (
        <div className="cq-cb">
          {/* What the analysis says this status means, in one line. */}
          <p className="cq-why" style={{ paddingLeft: 0 }}>
            {copy.helper}
          </p>

          {/* ── Mapped files, with the semantic-diff verdict on each ── */}
          <div className="cq-sec">
            <span className="cq-sech">Mapped code</span>
            {c.files.length === 0 ? (
              <div className="cq-empty-files">
                Nothing in this change set addresses the criterion. Not a low-confidence
                mapping — no candidate was found at all.
              </div>
            ) : (
              c.files.map((f) => (
                <React.Fragment key={f.path + f.lines}>
                  <div className="cq-file">
                    <span className="path">{f.path}</span>
                    <span className="lines">{f.lines}</span>
                    <span className={`cq-tag ${f.change}`}>{f.change}</span>
                  </div>
                  {f.why && <p className="cq-why">{f.why}</p>}
                </React.Fragment>
              ))
            )}
          </div>

          {/* ── Drift: what was asked for against what got built ── */}
          {c.drift && (
            <div className="cq-drift">
              <div className="row">
                <b>Written</b>
                <span>{c.drift.expected}</span>
              </div>
              <div className="row">
                <b>Realized</b>
                <span>{c.drift.realized}</span>
              </div>
              <p className="exp">{c.drift.explanation}</p>
            </div>
          )}

          {/* ── Test evidence. Presence only — never a pass claim ── */}
          <div className="cq-sec">
            <span className="cq-sech">Test evidence</span>
            <p className="cq-why" style={{ paddingLeft: 0 }}>
              {c.tests.present ? (
                <>
                  {c.tests.refs.join(', ')} — a test exists and references this behaviour.
                  Whether it passes is IntelliQA's to say.
                </>
              ) : (
                'No unit test references this behaviour. Hygiene signal only.'
              )}
            </p>
          </div>

          {/* ── Generation lineage, kept and discarded ── */}
          <div className="cq-sec">
            <span className="cq-sech">
              Generation lineage
              {c.lineage.length === 0 ? ' — none recorded' : ''}
            </span>
            {c.lineage.length === 0 ? (
              <p className="cq-why" style={{ paddingLeft: 0 }}>
                No prompt was ever issued against this criterion. It was not attempted and
                abandoned — it was never started.
              </p>
            ) : (
              <>
                {kept.map((g) => (
                  <div className="cq-gen" key={g.id}>
                    <span className="mark">kept</span>
                    <span className="prompt">
                      “{g.prompt}”
                      <span className="who">
                        {g.agent} · {g.at}
                      </span>
                    </span>
                  </div>
                ))}
                {discarded.map((g) => (
                  <div className="cq-gen discarded" key={g.id}>
                    <span className="mark">discarded</span>
                    <span className="prompt">
                      “{g.prompt}”
                      <span className="who">
                        {g.agent} · {g.at}
                        {g.supersededBy ? ` · superseded by ${g.supersededBy}` : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── The record of an override, if one was made ── */}
          {c.dismissal && (
            <div className="cq-dismissed">
              <CircleSlash size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <b>{c.dismissal.as}</b> by {c.dismissal.by} · {c.dismissal.at}
                <br />
                {c.dismissal.reason}
              </span>
            </div>
          )}

          {/* ── Every status is an action ── */}
          <div className="cq-acts">
            <button
              className="cq-btn primary"
              disabled={Boolean(c.dismissal)}
              onClick={() => onAct(c, actions.primary, false)}
            >
              {actions.primary}
            </button>
            <button
              className="cq-btn"
              disabled={Boolean(c.dismissal)}
              onClick={() => onAct(c, actions.secondary, true)}
            >
              {actions.secondary}
            </button>
            <span className="cq-acc">{ACCURACY_NOTE[c.status]}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/*
 * The story picker is gone from this panel.
 *
 * It was a <select> of every target, which existed only because the list of
 * stories lived on a different surface. The list is beside this panel now, so a
 * dropdown duplicating it would be a second control for one choice — and the two
 * could disagree about which story is open.
 */
export const ReviewPanel: React.FC<{
  target: ReviewTarget;
  onAct: (criterion: Criterion, action: string, secondary: boolean) => void;
}> = ({ target, onAct }) => {
  const [filter, setFilter] = useState<CriterionStatus | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => countBy(target.criteria), [target.criteria]);
  const sorted = useMemo(
    () => [...target.criteria].sort((a, b) => rank(a) - rank(b)),
    [target.criteria]
  );
  const visible = filter === 'all' ? sorted : sorted.filter((c) => c.status === filter);
  const headline = gapHeadline(target.criteria);
  const clean = target.criteria.every((c) => c.status === 'covered' || c.dismissal);

  /* No cq-wrap here: the surface owns the page width and the column it sits in. */
  return (
    <div className="cq-detail-in">
      {/* ── What is being adjudicated ── */}
      <div className="cq-target">
        <div style={{ minWidth: 0 }}>
          <span className="key">{target.storyKey}</span>
          <span className="cq-from">from Spec AI</span>
          <h1>{target.title}</h1>
          <div className="cq-meta">
            <span>
              <GitBranch size={10} style={{ display: 'inline', marginRight: 4 }} />
              {target.repo} · {target.branch}
            </span>
            <span>{target.pr}</span>
            <span>{target.author}</span>
          </div>
          <div className="cq-meta" style={{ marginTop: 6 }}>
            <span style={{ fontFamily: 'var(--font-body)' }}>{target.intakeNote}</span>
          </div>
        </div>

        <div className="cq-claim">
          <b>Tracker says {target.claimed}</b>
          <i>CodeIQ does not change it — it only says what is true</i>
        </div>
      </div>

      {/* ── The headline: the gap, not a score ── */}
      <div className={`cq-gap ${clean ? 'clean' : ''}`}>
        {clean ? (
          <Sparkles size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        ) : (
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        )}
        <span>
          <b>{headline}</b>
          <p>
            {clean
              ? 'Mapping is 85–95% accurate on structured criteria. It does not mean the code is correct — that is IntelliQA downstream.'
              : 'Ranked worst first. There is no completion percentage here on purpose: the specific list is the honest output.'}
          </p>
        </span>
      </div>

      {/* ── Filters ── */}
      <div className="cq-filters">
        <button className={`cq-f ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          All <i>{target.criteria.length}</i>
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            className={`cq-f ${filter === s ? 'on' : ''}`}
            onClick={() => setFilter(filter === s ? 'all' : s)}
          >
            {/* The four tone names are the four CSS variables, by design. */}
            <span className="dot" style={{ background: `var(--${STATUS_COPY[s].tone})` }} />
            {STATUS_COPY[s].label} <i>{counts[s]}</i>
          </button>
        ))}
        <span className="cq-note">
          <FileCode2 size={10} style={{ display: 'inline', marginRight: 4 }} />
          static evidence only · no execution
        </span>
      </div>

      {/* ── The checklist ── */}
      <div className="cq-list">
        {visible.map((c) => (
          <CriterionRow
            key={c.id}
            criterion={c}
            open={open === c.id}
            onToggle={() => setOpen(open === c.id ? null : c.id)}
            onAct={onAct}
          />
        ))}
        {visible.length === 0 && (
          <div className="cq-empty-files">Nothing at this status.</div>
        )}
      </div>

      <p className="cq-foot">
        <b>What this is.</b> CodeIQ adjudicates whether the intent that entered the system was
        realized in code. It does not generate code, run tests, gate the merge, or claim the
        behaviour is correct. Gap mapping is the headline because it is the most accurate thing
        here; drift is an assist and is labelled as one.
      </p>
    </div>
  );
};
