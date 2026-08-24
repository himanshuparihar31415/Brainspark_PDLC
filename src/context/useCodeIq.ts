import { useState } from 'react';
import { Connector, Role } from '../types';
import { UserStory } from '../types/specai';
import {
  Adjudication,
  CodeIqReading,
  CodeIqState,
  Criterion,
  RepoPolicy,
  ThrashReading,
  UntrackedPolicy,
} from '../types/codeiq';
import {
  INITIAL_CODE_IQ,
  UNTRACKED_POLICY_COPY,
  blankCodeIqState,
  buildTargets,
  codeIqFeeds,
  indexedAt,
  instrumentation,
  isIndexed,
  resolveThrash,
} from '../data/codeiq';
import { intakeForProject } from '../data/codeIqIntake';
import { criterionRef } from '../data/specai';

type Toast = (message: string, type?: 'success' | 'info' | 'error') => void;
type Audit = (action: string, target: string, input: string, output: string) => void;

interface Deps {
  addToast: Toast;
  addAuditLog: Audit;
  currentRole: Role;
  currentUserName: string;
  /**
   * Spec AI's stories for a project. CodeIQ consumes them and never writes them,
   * which is why this arrives as a reader rather than the slice reaching into
   * Spec AI's state — the dependency runs one way and is visible in the type.
   */
  storiesFor: (projectId: string) => UserStory[];
  /**
   * Raise a question against the spec. The one thing that travels back upstream,
   * and it is a question rather than an edit — see raiseSpecQuestion.
   */
  raiseSpecQuestion: (
    projectId: string,
    text: string,
    rationale: string
  ) => boolean;
  /** Platform connectors, for the feed gate. Read-only here. */
  connectors: Connector[];
  /** Department the project sits in, so the connector ladder can be checked. */
  departmentOf: (projectId: string) => string | undefined;
}

/** Who is acting, for the dismissal record. Never anonymous. */
const stamp = () =>
  new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * The CodeIQ state slice, keyed by project.
 *
 * Extracted from the view for the same reason Spec AI's was extracted from the
 * provider: the module's mutations belong next to each other. But the reason it
 * had to happen now is tenancy. CodeIQ's data was three module-level arrays held
 * in `useState` inside the view, which meant every project on the platform was
 * shown Mobile Banking V2's tickets under its own name, and an adjudication
 * recorded against one project mutated what every other project saw.
 *
 * Mirrors `useSpecAiSlice` deliberately — same `xFor(projectId)` reader, same
 * `patch()` that creates a missing row lazily — so the two modules are read the
 * same way.
 */
export const useCodeIqSlice = ({
  addToast,
  addAuditLog,
  currentUserName,
  storiesFor,
  raiseSpecQuestion,
  connectors,
  departmentOf,
}: Deps) => {
  const [codeIq, setCodeIq] = useState<CodeIqState[]>(INITIAL_CODE_IQ);

  /**
   * A project with no row is not an error. Most projects have never had source
   * control indexed, and the blank state says so rather than throwing.
   */
  const stateFor = (projectId: string): CodeIqState =>
    codeIq.find((s) => s.projectId === projectId) ?? blankCodeIqState(projectId);

  /**
   * What a view reads: the persisted state plus everything composed from Spec AI
   * at the moment of reading.
   *
   * Composing rather than storing is the whole point of the handoff. A story
   * reworded in Spec AI shows up here on the next render with no sync step, and
   * there is no copy of its criteria in this module that could disagree with it.
   * An unindexed project composes nothing, because reporting gaps against code
   * nobody has scanned would be inventing them.
   */
  const codeIqFor = (projectId: string): CodeIqReading => {
    const state = stateFor(projectId);
    const feeds = codeIqFeeds(connectors, projectId, departmentOf(projectId));
    const indexed = isIndexed(state);
    const empty: CodeIqReading = {
      state,
      indexed,
      indexedAt: indexedAt(state),
      feeds,
      targets: [],
      thrash: [],
      instrumentation: instrumentation([]),
    };

    /*
     * Two independent reasons to report nothing, and they are not the same
     * reason. No source-control feed means CodeIQ was never given the commits;
     * not indexed means it has them and has not scanned yet. Collapsing them
     * into one empty state would tell a Tech Lead to wait when what they
     * actually need to do is connect a repository.
     */
    if (!feeds.source || !indexed) return empty;

    const stories = storiesFor(projectId);
    const intakes = intakeForProject(projectId, stories);
    return {
      ...empty,
      targets: buildTargets(intakes, state.adjudications),
      thrash: resolveThrash(state.thrash, stories),
      instrumentation: instrumentation(intakes),
    };
  };

  /** Every mutation funnels through here so a missing row is created lazily. */
  const patch = (projectId: string, fn: (prev: CodeIqState) => CodeIqState) => {
    setCodeIq((all) => {
      const base = all.some((s) => s.projectId === projectId)
        ? all
        : [...all, blankCodeIqState(projectId)];
      return base.map((s) => (s.projectId === projectId ? fn(s) : s));
    });
  };

  /**
   * Record a human decision about one criterion.
   *
   * Writes into the adjudication overlay rather than into a criterion, because
   * there is no stored criterion to write into — the criterion is Spec AI's.
   */
  const patchAdjudication = (
    projectId: string,
    storyKey: string,
    criterionId: string,
    next: Adjudication
  ) => {
    const ref = criterionRef(storyKey, criterionId);
    patch(projectId, (s) => ({
      ...s,
      adjudications: { ...s.adjudications, [ref]: { ...s.adjudications[ref], ...next } },
    }));
  };

  /**
   * Adjudicate one criterion.
   *
   * The two actions that change a verdict — "not applicable" and "drift
   * accepted" — write a dismissal rather than deleting the row. A silently
   * removed finding is indistinguishable from one that was never found, and the
   * lineage is only worth trusting if an override leaves a name behind it.
   */
  const adjudicate = (
    projectId: string,
    storyKey: string,
    criterion: Criterion,
    action: string,
    secondary: boolean
  ) => {
    const audit = (outcome: string) =>
      addAuditLog(
        'CodeIQ Adjudication',
        criterionRef(storyKey, criterion.id),
        action,
        outcome
      );

    if (!secondary) {
      switch (criterion.status) {
        case 'missing':
          patchAdjudication(projectId, storyKey, criterion.id, { flaggedUpstream: true });
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
            by: currentUserName,
            at: stamp(),
            as: 'drift accepted',
            reason: 'Realized behaviour accepted as intended; the criterion is now out of date.',
          }
        : criterion.status === 'missing'
        ? {
            by: currentUserName,
            at: stamp(),
            as: 'not applicable',
            reason: 'Marked not applicable to this change set.',
          }
        : criterion.status === 'partial'
        ? {
            by: currentUserName,
            at: stamp(),
            as: 'accepted as complete',
            reason: 'Remaining scope accepted as out of this story.',
          }
        : undefined;

    if (!as) {
      addToast('Mapping disputed. Recorded against the lineage.', 'info');
      audit('Mapping disputed');
      return;
    }

    patchAdjudication(projectId, storyKey, criterion.id, { dismissal: as });
    addToast(`${criterion.id} — ${as.as}. Recorded against ${currentUserName}.`, 'info');
    audit(`Dismissed as ${as.as}`);
  };

  /**
   * Push a thrash signal back to Spec AI.
   *
   * This writes an open question into Spec AI's queue rather than firing a toast
   * and calling it delivered. The distinction matters: a criterion that caused
   * nine discarded attempts is a spec problem, and a signal that lands nowhere a
   * PM will see it is not a feedback loop.
   *
   * A question, not an edit. CodeIQ has evidence that the criterion was written
   * badly; it does not have the authority to rewrite it.
   */
  const sendThrashUpstream = (projectId: string, row: ThrashReading) => {
    const ref = criterionRef(row.storyKey, row.criterionId);
    const raised = raiseSpecQuestion(
      projectId,
      `${ref} — is this criterion specific enough to build once? ${row.text}`,
      `CodeIQ: ${row.discarded} of ${row.attempts} generation attempts discarded over ${row.days} days.`
    );

    patch(projectId, (s) => ({
      ...s,
      thrash: s.thrash.map((r) =>
        r.storyKey === row.storyKey && r.criterionId === row.criterionId
          ? { ...r, sentUpstream: true }
          : r
      ),
    }));

    addToast(
      raised
        ? `${ref} raised as an open question in Spec AI.`
        : `${ref} was already raised in Spec AI.`,
      raised ? 'success' : 'info'
    );
    addAuditLog(
      'CodeIQ Thrash Signal',
      ref,
      `${row.discarded} of ${row.attempts} attempts discarded over ${row.days} days`,
      raised ? 'Open question created in Spec AI' : 'Already raised; no duplicate created'
    );
  };

  /**
   * Change how this project treats a commit that arrived with no linked story.
   *
   * Repo policy, exercised from the untracked panel. Auto-ticketing is the only
   * one that creates work, so it is the only one that names what it created.
   */
  const setUntrackedPolicy = (projectId: string, commit: string, policy: UntrackedPolicy) => {
    patch(projectId, (s) => ({
      ...s,
      untracked: s.untracked.map((u) => (u.commit === commit ? { ...u, policy } : u)),
    }));
    addToast(`${commit} — ${UNTRACKED_POLICY_COPY[policy].label.toLowerCase()}.`, 'info');
    addAuditLog('CodeIQ Untracked Change', commit, `Policy set to ${policy}`, 'Recorded on the repo');
  };

  /**
   * Tolerate several commits at once.
   *
   * The panel restricts this to commits the semantic diff called cosmetic, and
   * that restriction is the whole reason a bulk action is defensible here:
   * tolerating a commit asserts it needed no story, which is a judgement, but
   * making that judgement one lockfile bump at a time is ceremony rather than
   * judgement. `auto-ticket` has no bulk equivalent, because it creates work.
   *
   * One audit entry naming every SHA, not one per row. A reader looking at this
   * later needs to see that the decision was made once, over a named set.
   */
  const tolerateUntracked = (projectId: string, commits: string[]) => {
    if (commits.length === 0) return;

    patch(projectId, (s) => ({
      ...s,
      untracked: s.untracked.map((u) =>
        commits.includes(u.commit) ? { ...u, policy: 'tolerate' as UntrackedPolicy } : u
      ),
    }));

    addToast(
      `${commits.length} ${commits.length === 1 ? 'commit' : 'commits'} tolerated — no story expected.`,
      'info'
    );
    addAuditLog(
      'CodeIQ Untracked Change',
      `${commits.length} commits`,
      `Bulk tolerate: ${commits.join(', ')}`,
      `Recorded against ${currentUserName}; classified cosmetic by semantic diff`
    );
  };

  /**
   * Change how a repository is read.
   *
   * Authority is checked at the call site rather than here — the slice records
   * what it is told and audits it, and the panel decides who may ask. Every
   * change is audited because it silently re-scopes every verdict in the
   * project: a join-key change can turn a clean report into a wall of untracked
   * change without a single commit moving.
   */
  const setRepoPolicy = (projectId: string, repo: string, next: Partial<RepoPolicy>) => {
    const before = stateFor(projectId).repos.find((r) => r.repo === repo);
    patch(projectId, (s) => ({
      ...s,
      repos: s.repos.map((r) => (r.repo === repo ? { ...r, ...next } : r)),
    }));

    const field = Object.keys(next)[0] ?? 'policy';
    addToast(`${repo} — ${field} updated. Re-index to apply it to history.`, 'info');
    addAuditLog(
      'CodeIQ Repo Policy',
      `${projectId} · ${repo}`,
      `${field}: ${String(before?.[field as keyof RepoPolicy])} → ${String(
        next[field as keyof RepoPolicy]
      )}`,
      'Applies to commits indexed from now on'
    );
  };

  return {
    codeIq,
    codeIqFor,
    adjudicate,
    sendThrashUpstream,
    setUntrackedPolicy,
    tolerateUntracked,
    setRepoPolicy,
  };
};

export type CodeIqSlice = ReturnType<typeof useCodeIqSlice>;
