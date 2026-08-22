import React from 'react';
import { GitCommitHorizontal } from 'lucide-react';
import { UntrackedChange, UntrackedPolicy } from '../../types/codeiq';
import { UNTRACKED_POLICY_COPY } from '../../data/codeiq';

/**
 * Change that arrived with no story behind it.
 *
 * Not a violation by default. A hotfix at 2am, a dependency bump, an agent
 * tidying imports — plenty of real work legitimately has no acceptance criterion,
 * and a module that flagged all of it would be ignored within a week. What the
 * panel is for is deciding which kind each one is, per repository, once.
 *
 * The prototype this is taken from offered a checkbox column and a bulk
 * auto-ticket button. That is left out on purpose: the whole judgement here is
 * "does this change need a story", and a bulk action offers to skip exactly the
 * part that cannot be skipped.
 */

const POLICIES: UntrackedPolicy[] = ['flag', 'auto-ticket', 'tolerate'];

export const UntrackedPanel: React.FC<{
  untracked: UntrackedChange[];
  onSetPolicy: (commit: string, policy: UntrackedPolicy) => void;
}> = ({ untracked, onSetPolicy }) => {
  /* Group by repo, because the policy is a repo-level decision. */
  const repos = [...new Set(untracked.map((u) => u.repo))].sort();

  return (
    <div className="cq-wrap">
      <div>
        <h2 className="cq-h2">Untracked change</h2>
        <p className="cq-hsub">
          Commits CodeIQ could not join to any story. Grouped by repository, because how much of
          this is acceptable is a property of the repository rather than of the commit.
        </p>
      </div>

      {untracked.length === 0 ? (
        <div className="cq-blank">
          <b>Every commit joined to a story.</b>
          <p>
            Nothing in the indexed history is missing a link. This is the state the join-key
            convention is meant to produce.
          </p>
        </div>
      ) : (
        repos.map((repo) => {
          const rows = untracked.filter((u) => u.repo === repo);
          return (
            <div className="cq-card" key={repo}>
              <div>
                <h2 className="cq-h2">{repo}</h2>
                <p className="cq-hsub">
                  {rows.length} unjoined {rows.length === 1 ? 'commit' : 'commits'}
                </p>
              </div>

              {rows.map((u) => (
                <div className="cq-ut" key={u.commit}>
                  <div className="head">
                    <GitCommitHorizontal size={13} />
                    <span className="sha">{u.commit}</span>
                    <span className="summary">{u.summary}</span>
                  </div>
                  <div className="meta">
                    <span>{u.author}</span>
                    <span>{u.at}</span>
                    <span>
                      {u.files} {u.files === 1 ? 'file' : 'files'}
                    </span>
                  </div>

                  {/*
                   * Three named outcomes rather than a dismiss button. Tolerate is
                   * a decision with a reason behind it; a change that simply
                   * disappeared from the list would be indistinguishable from one
                   * that was never found.
                   */}
                  <div className="acts">
                    {POLICIES.map((p) => (
                      <button
                        key={p}
                        className={`cq-pill ${u.policy === p ? 'on' : ''}`}
                        onClick={() => onSetPolicy(u.commit, p)}
                        title={UNTRACKED_POLICY_COPY[p].helper}
                      >
                        {UNTRACKED_POLICY_COPY[p].label}
                      </button>
                    ))}
                    <span className="helper">{UNTRACKED_POLICY_COPY[u.policy].helper}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}

      <p className="cq-foot">
        <b>Untracked is not the same as unauthorized.</b> The count here is only worth reading
        against a repository's own convention — a repo that tolerates refactors by policy should
        show a long list and no alarm.
      </p>
    </div>
  );
};
