import React from 'react';
import { Lock } from 'lucide-react';
import { JoinKeyScheme, RepoPolicy, UntrackedPolicy } from '../../types/codeiq';
import { JOIN_KEY_COPY, UNTRACKED_POLICY_COPY } from '../../data/codeiq';

/**
 * How each repository is read.
 *
 * This is configuration, not adjudication, and the difference is the reason it
 * is the only authority-gated surface in the module. Anyone downstream of the
 * spec may dispute a verdict on the review panel; changing the join-key scheme
 * changes every verdict at once, and turning the semantic diff off makes a
 * formatting-only commit count as delivery.
 *
 * It sits in the workspace rather than in project settings because there is no
 * per-project settings screen a Tech Lead or Developer can reach — `ProjectsView`
 * is visible to Tenant and Department Admins only and has no per-project drawer.
 * Read-only is the default here, so a Developer can still see the convention that
 * governs their own repository, which is the thing they most need from it.
 */

const JOIN_KEYS: JoinKeyScheme[] = ['commit-trailer', 'branch-name', 'pr-link', 'none'];
const UNTRACKED: UntrackedPolicy[] = ['flag', 'auto-ticket', 'tolerate'];

export const RepoPolicyPanel: React.FC<{
  repos: RepoPolicy[];
  editable: boolean;
  onChange: (repo: string, next: Partial<RepoPolicy>) => void;
}> = ({ repos, editable, onChange }) => (
  <div className="cq-wrap">
    <div>
      <h2 className="cq-h2">Repository policy</h2>
      <p className="cq-hsub">
        How commits in each repository are joined to the stories they deliver.{' '}
        {editable
          ? 'A change applies to commits indexed from now on, not retrospectively.'
          : 'Read-only for your role — a change here re-scopes every verdict in the project.'}
      </p>
    </div>

    {repos.length === 0 ? (
      <div className="cq-blank">
        <b>No repositories bound to this project.</b>
        <p>
          Repositories arrive through the source-control connector. Once one is activated for this
          project it appears here with its join-key scheme.
        </p>
      </div>
    ) : (
      repos.map((r) => (
        <div className="cq-card" key={r.repo}>
          <div className="cq-rp-head">
            <div style={{ minWidth: 0 }}>
              <h2 className="cq-h2">{r.repo}</h2>
              <p className="cq-hsub">{r.language}</p>
            </div>
            <span className="cq-rp-meta">
              {r.activeContributors} contributors · indexed {r.lastIndexedAt}
            </span>
            {!editable && (
              <span className="cq-rp-locked">
                <Lock size={11} /> read-only
              </span>
            )}
          </div>

          {/* ── The setting everything else depends on ── */}
          <div className="cq-rp-row">
            <div className="lbl">
              <b>Join key</b>
              <span>What links a commit to a story.</span>
            </div>
            <div className="opts">
              {JOIN_KEYS.map((k) => (
                <button
                  key={k}
                  className={`cq-pill ${r.joinKey === k ? 'on' : ''} ${k === 'none' ? 'risk' : ''}`}
                  disabled={!editable}
                  onClick={() => onChange(r.repo, { joinKey: k })}
                >
                  {JOIN_KEY_COPY[k].label}
                </button>
              ))}
              <span className="helper">{JOIN_KEY_COPY[r.joinKey].helper}</span>
            </div>
          </div>

          <div className="cq-rp-row">
            <div className="lbl">
              <b>Untracked change</b>
              <span>What happens to a commit with no story behind it.</span>
            </div>
            <div className="opts">
              {UNTRACKED.map((u) => (
                <button
                  key={u}
                  className={`cq-pill ${r.untracked === u ? 'on' : ''}`}
                  disabled={!editable}
                  onClick={() => onChange(r.repo, { untracked: u })}
                >
                  {UNTRACKED_POLICY_COPY[u].label}
                </button>
              ))}
              <span className="helper">{UNTRACKED_POLICY_COPY[r.untracked].helper}</span>
            </div>
          </div>

          {/*
           * The semantic diff is what separates a behavioural change from a
           * formatting one. Off, a prettier run reads as realizing a criterion —
           * so the copy states the consequence rather than the feature.
           */}
          <div className="cq-rp-row">
            <div className="lbl">
              <b>Semantic diff</b>
              <span>Separates behavioural change from cosmetic.</span>
            </div>
            <div className="opts">
              <button
                className={`cq-pill ${r.semanticDiff ? 'on' : ''}`}
                disabled={!editable}
                onClick={() => onChange(r.repo, { semanticDiff: true })}
              >
                On
              </button>
              <button
                className={`cq-pill ${!r.semanticDiff ? 'on' : ''} risk`}
                disabled={!editable}
                onClick={() => onChange(r.repo, { semanticDiff: false })}
              >
                Off
              </button>
              <span className="helper">
                {r.semanticDiff
                  ? 'A formatting-only commit does not count as realizing a criterion.'
                  : 'Off — any touched file counts, so a formatting commit reads as delivery.'}
              </span>
            </div>
          </div>
        </div>
      ))
    )}

    <p className="cq-foot">
      <b>Policy is not retrospective.</b> Changing the join key does not re-link commits already
      indexed. The dashboard's join-key percentage is measured over history as it was read, which is
      why it can stay low for a while after a scheme is fixed.
    </p>
  </div>
);
