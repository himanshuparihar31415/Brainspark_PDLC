import React, { useState } from 'react';
import { GitCommitHorizontal, Info } from 'lucide-react';
import { RepoPolicy, UntrackedChange, UntrackedPolicy } from '../../types/codeiq';
import {
  CHANGE_CLASS_COPY,
  UNTRACKED_POLICY_COPY,
  bulkTolerable,
  changeClassOf,
} from '../../data/codeiq';

/**
 * Change that arrived with no story behind it.
 *
 * Not a violation by default. A hotfix at 2am, a dependency bump, an agent
 * tidying imports — plenty of real work legitimately has no acceptance
 * criterion, and a module that flagged all of it would be ignored within a week.
 * What the panel is for is deciding which kind each one is.
 *
 * Two columns carry the judgement, and they are deliberately not one: `message`
 * is what the author said they did, `summary` is what the semantic diff observed.
 * Where they disagree is the row worth opening — a commit calling itself a null
 * guard that also moved a timeout is the case this screen exists to surface, and
 * a single "description" column would hide it.
 *
 * On bulk: an earlier version of this panel refused bulk actions outright, on the
 * grounds that they offer to skip the one judgement that cannot be skipped. That
 * holds for auto-ticket, which creates work. It does not hold for tolerating four
 * `renovate[bot]` lockfile bumps the diff already found to change no behaviour —
 * there the ceremony was the problem. So bulk exists, and it is narrow: cosmetic
 * only, never unclassified, and one audit entry over a named set.
 */

const POLICIES: UntrackedPolicy[] = ['flag', 'auto-ticket', 'tolerate'];

const ALL = '__all__';

export const UntrackedPanel: React.FC<{
  untracked: UntrackedChange[];
  /**
   * Needed for the change-class gate. A repository with semantic diff off
   * produces no classification, and the panel cannot know that from the commit.
   */
  repos: RepoPolicy[];
  onSetPolicy: (commit: string, policy: UntrackedPolicy) => void;
  onTolerateMany: (commits: string[]) => void;
}> = ({ untracked, repos, onSetPolicy, onTolerateMany }) => {
  const [repoFilter, setRepoFilter] = useState<string>(ALL);
  const [policyFilter, setPolicyFilter] = useState<string>(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const repoNames = [...new Set(untracked.map((u) => u.repo))].sort();

  const visible = untracked.filter(
    (u) =>
      (repoFilter === ALL || u.repo === repoFilter) &&
      (policyFilter === ALL || u.policy === policyFilter)
  );

  /*
   * The bulk action acts on the intersection of selected, visible and tolerable —
   * never on the raw selection. Otherwise narrowing the filter after ticking
   * boxes would tolerate commits that are no longer on the screen, which is the
   * worst kind of bulk action: one whose scope the reader cannot see.
   */
  const tolerable = bulkTolerable(visible, repos);
  const actionable = tolerable.filter((u) => selected.has(u.commit));

  const toggle = (commit: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(commit)) next.delete(commit);
      else next.add(commit);
      return next;
    });

  const allTicked = tolerable.length > 0 && actionable.length === tolerable.length;
  const toggleAll = () =>
    setSelected(allTicked ? new Set() : new Set(tolerable.map((u) => u.commit)));

  const applyBulk = () => {
    onTolerateMany(actionable.map((u) => u.commit));
    setSelected(new Set());
  };

  return (
    <div className="cq-wrap wide">
      <div>
        <h2 className="cq-h2">Untracked change</h2>
        <p className="cq-hsub">
          Commits CodeIQ could not join to any story. How much of this is acceptable is a property
          of the repository rather than of the commit — which is why the policy sits on each row and
          the repository is the first filter.
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
        <>
          <div className="cq-ubar">
            <label>
              <span>Repository</span>
              <select
                className="cq-sel"
                value={repoFilter}
                onChange={(e) => setRepoFilter(e.target.value)}
              >
                <option value={ALL}>All repositories ({repoNames.length})</option>
                {repoNames.map((r) => (
                  <option key={r} value={r}>
                    {r} ({untracked.filter((u) => u.repo === r).length})
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Policy</span>
              <select
                className="cq-sel"
                value={policyFilter}
                onChange={(e) => setPolicyFilter(e.target.value)}
              >
                <option value={ALL}>All policies</option>
                {POLICIES.map((p) => (
                  <option key={p} value={p}>
                    {UNTRACKED_POLICY_COPY[p].label} (
                    {untracked.filter((u) => u.policy === p).length})
                  </option>
                ))}
              </select>
            </label>

            <button
              className="cq-btn primary"
              disabled={actionable.length === 0}
              onClick={applyBulk}
              title={
                tolerable.length === 0
                  ? 'Nothing here is classified cosmetic, so nothing can be tolerated in bulk.'
                  : 'Tolerate every ticked commit. Cosmetic only — behavioural and unclassified change stays a per-row decision.'
              }
            >
              Tolerate selected ({actionable.length})
            </button>
          </div>

          <section className="cq-card">
            <div className="cq-utable">
              <div className="cq-utr head">
                <span>
                  <input
                    type="checkbox"
                    checked={allTicked}
                    onChange={toggleAll}
                    disabled={tolerable.length === 0}
                    aria-label={`Select all ${tolerable.length} cosmetic commits in view`}
                  />
                </span>
                <span>Change set</span>
                <span>Commit</span>
                <span>What changed</span>
                <span>Author</span>
                <span>Type</span>
                <span>Policy</span>
              </div>

              {visible.map((u) => {
                const cls = changeClassOf(u, repos);
                const canBulk = cls === 'cosmetic' && u.policy !== 'tolerate';
                return (
                  <div className="cq-utr" key={u.commit}>
                    <span>
                      <input
                        type="checkbox"
                        checked={selected.has(u.commit)}
                        onChange={() => toggle(u.commit)}
                        disabled={!canBulk}
                        aria-label={`Select ${u.commit}`}
                        title={
                          canBulk
                            ? 'Include in a bulk tolerate'
                            : u.policy === 'tolerate'
                            ? 'Already tolerated.'
                            : 'Only commits the diff classified cosmetic can be tolerated in bulk.'
                        }
                      />
                    </span>

                    <span className="sha">
                      <GitCommitHorizontal size={11} />
                      {u.commit}
                    </span>

                    {/* The author's own words, mono because it is a literal. */}
                    <span className="msg" title={u.message}>
                      {u.message}
                    </span>

                    {/* CodeIQ's reading of the same commit. */}
                    <span className="obs" title={u.summary}>
                      {u.summary}
                      <em>
                        {u.repo} · {u.at} · {u.files} {u.files === 1 ? 'file' : 'files'}
                      </em>
                    </span>

                    <span className="who" title={u.author}>
                      {u.author}
                    </span>

                    <span
                      className={`cq-type ${cls}`}
                      title={CHANGE_CLASS_COPY[cls].helper}
                    >
                      {CHANGE_CLASS_COPY[cls].label}
                    </span>

                    {/*
                     * Three named outcomes rather than a dismiss button. Tolerate is
                     * a decision with a reason behind it; a change that simply
                     * disappeared from the list would be indistinguishable from one
                     * that was never found.
                     */}
                    <span>
                      <select
                        className="cq-sel"
                        value={u.policy}
                        onChange={(e) => onSetPolicy(u.commit, e.target.value as UntrackedPolicy)}
                        title={UNTRACKED_POLICY_COPY[u.policy].helper}
                        aria-label={`Policy for ${u.commit}`}
                      >
                        {POLICIES.map((p) => (
                          <option key={p} value={p}>
                            {UNTRACKED_POLICY_COPY[p].label}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="cq-count">
              <span>
                Showing {visible.length} of {untracked.length}{' '}
                {untracked.length === 1 ? 'commit' : 'commits'}
                {tolerable.length > 0 && ` · ${tolerable.length} can be tolerated in bulk`}
              </span>
              {(repoFilter !== ALL || policyFilter !== ALL) && (
                <button
                  className="cq-link"
                  onClick={() => {
                    setRepoFilter(ALL);
                    setPolicyFilter(ALL);
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </section>

          {/*
           * Named, not hidden. A repository with semantic diff off cannot classify
           * anything, and its rows read "not classified" above — this says where
           * that comes from, because otherwise it looks like a gap in the data
           * rather than a setting somebody chose.
           */}
          {repos.some((r) => !r.semanticDiff) && (
            <p className="cq-degraded row">
              {/* Info, not a tick. This is a caveat, and a tick reads as cleared. */}
              <Info size={13} />
              <span>
              {repos
                .filter((r) => !r.semanticDiff)
                .map((r) => r.repo)
                .join(', ')}{' '}
              {repos.filter((r) => !r.semanticDiff).length === 1 ? 'runs' : 'run'} with semantic diff
              off, so commits there cannot be classified behavioural or cosmetic. They are listed,
              not judged — and they cannot be tolerated in bulk.
              </span>
            </p>
          )}

          <p className="cq-foot">
            <b>Untracked is not the same as unauthorized.</b> The count here is only worth reading
            against a repository&rsquo;s own convention — a repo that tolerates refactors by policy
            should show a long list and no alarm.
          </p>
        </>
      )}
    </div>
  );
};
