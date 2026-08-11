/**
 * CodeIQ — intent-to-code lineage and adjudication.
 *
 * CodeIQ answers one question: did the thing we asked for actually get built,
 * and can we prove it? It does not generate code and it does not assert
 * behavioural correctness — that is IntelliQA's job downstream.
 *
 * Two surfaces are modelled here (PRD §8.1 and §8.3): the review panel a
 * developer or reviewer sees inline, and the leadership dashboard. The
 * traceability graph (§8.2) is deliberately absent.
 */

/**
 * What happened to an acceptance criterion.
 *
 * `missing` is the load-bearing one — it is the gap report, the highest-accuracy
 * output, and the thing the product leads with. `drifted` is an assist rather
 * than a verdict: the analysis is 60–75% accurate and the UI has to say so.
 */
export type CriterionStatus = 'covered' | 'partial' | 'drifted' | 'missing';

/**
 * Semantic diff result. A file full of formatting changes has not realized a
 * requirement, and saying "12 files changed" without this distinction is how a
 * cosmetic commit reads as delivery.
 */
export type ChangeClass = 'behavioral' | 'cosmetic';

/** Which IDE agent produced a generation event. */
export type AgentSource = 'Cursor' | 'Claude Code' | 'VS Code';

export interface MappedFile {
  path: string;
  /** Line range touched, e.g. "L44–L91". */
  lines: string;
  change: ChangeClass;
  /** Why this file was mapped to the criterion. */
  why?: string;
}

/**
 * One generation attempt, kept or discarded. The discarded ones matter as much
 * as the survivors — they are what thrash is computed from, and they are the
 * only record of what the developer tried before this.
 */
export interface GenerationAttempt {
  id: string;
  agent: AgentSource;
  prompt: string;
  at: string;
  /** True when this generation survived into the final change set. */
  kept: boolean;
  /** Why it was discarded, when that can be inferred. */
  supersededBy?: string;
}

/**
 * Test evidence — presence only, never a pass claim. CodeIQ observes that a
 * test exists and references the criterion's behaviour; whether it passes is
 * IntelliQA's to say.
 */
export interface TestEvidence {
  present: boolean;
  /** Test names that reference this criterion's behaviour. */
  refs: string[];
}

/**
 * A recorded dismissal. Never silent — the graph is only worth trusting if
 * every override left a trace with a name against it.
 */
export interface Dismissal {
  by: string;
  at: string;
  reason: string;
  /** What the user asserted: the criterion does not apply, or the drift is intended. */
  as: 'not applicable' | 'drift accepted' | 'accepted as complete';
}

export interface Drift {
  /** What the criterion asked for. */
  expected: string;
  /** What the code actually does. */
  realized: string;
  explanation: string;
}

export interface Criterion {
  /** e.g. "AC-3". */
  id: string;
  given: string;
  when: string;
  then: string;
  status: CriterionStatus;
  /**
   * How sure the analysis is, 0–1. Surfaced rather than hidden because the
   * output is an assist on drift and a headline on gaps, and the difference
   * should be visible on the row.
   */
  confidence: number;
  files: MappedFile[];
  drift?: Drift;
  tests: TestEvidence;
  lineage: GenerationAttempt[];
  dismissal?: Dismissal;
  /** Set when a criterion has been sent back to SpecAI as under-specified. */
  flaggedUpstream?: boolean;
}

/** What the review panel is adjudicating — one PR against one ticket. */
export interface ReviewTarget {
  ticket: string;
  title: string;
  repo: string;
  branch: string;
  pr: string;
  author: string;
  /** What the tracker currently claims. */
  claimed: 'Done' | 'In review' | 'In progress';
  criteria: Criterion[];
  /** Where the acceptance criteria came from, and whether they were structured. */
  intakeNote: string;
}

// ───────────────────────────── Dashboard ─────────────────────────────

/** One ticket's adjudication, rolled up for leadership. */
export interface TicketRollup {
  key: string;
  title: string;
  owner: string;
  claimed: 'Done' | 'In review' | 'In progress';
  total: number;
  covered: number;
  partial: number;
  drifted: number;
  missing: number;
}

/**
 * Churn per requirement, emitted back to SpecAI. A criterion that was rewritten
 * nine times was probably written badly, and that is a spec signal rather than
 * an engineering one.
 */
export interface ThrashRow {
  criterionId: string;
  ticket: string;
  text: string;
  /** Generation attempts against this criterion. */
  attempts: number;
  /** How many were discarded. */
  discarded: number;
  /** Distinct days the criterion was worked. */
  days: number;
  /** True once the signal has been pushed upstream to SpecAI. */
  sentUpstream?: boolean;
}

/** Per-repo handling of change that arrived with no linked ticket. */
export type UntrackedPolicy = 'flag' | 'auto-ticket' | 'tolerate';

export interface UntrackedChange {
  repo: string;
  commit: string;
  author: string;
  summary: string;
  files: number;
  at: string;
  policy: UntrackedPolicy;
}
