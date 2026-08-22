import { UserStory } from '../types/specai';
import { ClaimedStatus } from '../types/codeiq';

/**
 * The Spec AI → CodeIQ handoff, and the only place the two modules touch.
 *
 * CodeIQ used to hold its own hand-authored acceptance criteria. They read
 * plausibly and joined to nothing: a criterion in `data/codeiq.ts` had no
 * relationship to any story a PM had actually written, so the module was
 * adjudicating code against text nobody upstream owned. Everything below exists
 * so that a criterion CodeIQ reports on is provably the one Spec AI wrote.
 *
 * The direction is one-way by design. CodeIQ reads stories; it never edits them.
 * The only thing that travels back upstream is the thrash signal, and that goes
 * through Spec AI's own question queue rather than by mutating a story.
 */

/** One criterion, as CodeIQ receives it. Text and identity only — no verdict. */
export interface IntakeCriterion {
  /** Spec AI's criterion id, scoped to the story. */
  id: string;
  given: string;
  when: string;
  then: string;
}

export interface CodeIqIntake {
  /** Tenancy. Always present, never derived from a project name. */
  projectId: string;
  /** Immutable join to UserStory.id. */
  storyId: string;
  /** e.g. 'FMB2-AUTH-031' — display, and the tracker's own id. */
  storyKey: string;
  title: string;
  owner: string;
  criteria: IntakeCriterion[];
  /** What the tracker claims, read from the story rather than restated. */
  claimed: ClaimedStatus;
  /**
   * Provenance. Drives the accuracy caveat on the review panel: mapping is far
   * more reliable against Given/When/Then than against prose, and the panel
   * should say which it had.
   */
  structured: boolean;
  /**
   * True when a linked requirement or artifact moved after the story was
   * generated — which means the spec changed *after* the code was written. A
   * drift cause CodeIQ can name for free, so it is carried through.
   */
  specMovedAfterCode: boolean;
  staleReason?: string;
}

/**
 * A draft story is not adjudicable.
 *
 * It has never been exported, so nothing has been built against it and no
 * tracker holds a claim about it. Reporting its criteria as having no code would
 * be counting work nobody started as a gap — the module's headline number is
 * "criteria with no code", and inflating it with unstarted work is the fastest
 * way to make people stop believing it.
 */
export const isAdjudicable = (story: UserStory) => story.deliveryStatus !== 'Draft';

/** Every story in this project that CodeIQ is entitled to report on. */
export const intakeForProject = (projectId: string, stories: UserStory[]): CodeIqIntake[] =>
  stories.filter(isAdjudicable).map((story) => ({
    projectId,
    storyId: story.id,
    storyKey: story.key,
    title: story.title,
    owner: story.owner ?? 'Unassigned',
    /* Safe: isAdjudicable already excluded 'Draft'. */
    claimed: story.deliveryStatus as ClaimedStatus,
    criteria: story.acceptance.map((c) => ({
      id: c.id,
      given: c.given,
      when: c.when,
      then: c.then,
    })),
    /*
     * Every criterion Spec AI writes is Given/When/Then, so a story is
     * structured when it has criteria at all. A story exported with none is the
     * unstructured case, and it is the one where mapping accuracy collapses.
     */
    structured: story.acceptance.length > 0,
    specMovedAfterCode: story.stale,
    staleReason: story.staleReason,
  }));

/** One story's intake, or null when it is a draft or absent. */
export const intakeForStory = (
  projectId: string,
  stories: UserStory[],
  storyKey: string
): CodeIqIntake | null =>
  intakeForProject(projectId, stories).find((i) => i.storyKey === storyKey) ?? null;

/** The sentence the review panel prints about where its criteria came from. */
export const intakeNote = (intake: CodeIqIntake): string => {
  const count = intake.criteria.length;
  if (count === 0) {
    return 'Exported with no acceptance criteria — nothing to map code against.';
  }
  const base = `Structured criteria from Spec AI · Given/When/Then · ${count} criteria`;
  return intake.specMovedAfterCode
    ? `${base} · spec changed after this code landed${
        intake.staleReason ? ` (${intake.staleReason})` : ''
      }`
    : base;
};
