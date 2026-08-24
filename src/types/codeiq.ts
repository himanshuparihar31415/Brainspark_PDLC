import { StoryDeliveryStatus } from './specai';

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

/**
 * CodeIQ's verdict on one criterion — everything the analysis produces and
 * nothing it does not.
 *
 * Split from the criterion text on purpose. The text belongs to Spec AI and is
 * read fresh on every render; this is CodeIQ's own output, keyed to the
 * criterion by `criterionRef`. Keeping them in one flat object is how the module
 * ended up with hand-authored criteria that had drifted from the story they were
 * supposed to be adjudicating.
 */
export interface CriterionAnalysis {
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
}

/**
 * A human's override of the analysis. The only part of a criterion that
 * IntelliQA-style derivation cannot produce, so the only part CodeIQ persists.
 */
export interface Adjudication {
  dismissal?: Dismissal;
  /** Set when a criterion has been sent back to Spec AI as under-specified. */
  flaggedUpstream?: boolean;
}

/**
 * A criterion as the review panel reads it: Spec AI's text, CodeIQ's analysis,
 * and whatever a human has since decided about it. Composed, never stored.
 */
export interface Criterion extends CriterionAnalysis, Adjudication {
  /** The Spec AI criterion id, e.g. "AC-3". Scoped to its story. */
  id: string;
  given: string;
  when: string;
  then: string;
}

/**
 * What the tracker claims about a story.
 *
 * Derived from Spec AI's union rather than restated, so a status added upstream
 * cannot silently fall outside what CodeIQ handles. 'Draft' is excluded because a
 * draft has never been exported: no tracker holds a claim about it, so there is
 * nothing for CodeIQ to contradict.
 */
export type ClaimedStatus = Exclude<StoryDeliveryStatus, 'Draft'>;

/**
 * What the review panel is adjudicating — one change set against one story.
 *
 * `storyKey` was `ticket`. Under the platform's model a tracker ticket is a
 * story's identity after export rather than a separate record, so the two names
 * described the same thing while joining to nothing. `storyId` is the immutable
 * key; `storyKey` is what a person reads and what the tracker calls it.
 */
export interface ReviewTarget {
  /** Immutable join to UserStory.id. */
  storyId: string;
  /** e.g. "FMB2-AUTH-031" — display, and the tracker's own id. */
  storyKey: string;
  title: string;
  /**
   * Who owns the story, from Spec AI. Distinct from `author`, which is who
   * committed the code — and the difference is occasionally the finding.
   */
  owner: string;
  repo: string;
  branch: string;
  pr: string;
  author: string;
  /** Read from the story's delivery status, not typed by hand. */
  claimed: ClaimedStatus;
  criteria: Criterion[];
  /** Where the acceptance criteria came from, and whether they were structured. */
  intakeNote: string;
}

// ───────────────────────────── Dashboard ─────────────────────────────

/**
 * Churn per criterion, emitted back to Spec AI. A criterion that was rewritten
 * nine times was probably written badly, and that is a spec signal rather than
 * an engineering one.
 *
 * Carries no criterion text. It used to, and the stored copy was a paraphrase —
 * so the row naming a criterion could disagree with the criterion it named. The
 * text is resolved through `criterionRef` at read time, like everything else.
 */
export interface ThrashRow {
  criterionId: string;
  storyKey: string;
  /** Generation attempts against this criterion. */
  attempts: number;
  /** How many were discarded. */
  discarded: number;
  /** Distinct days the criterion was worked. */
  days: number;
  /** True once the signal has been pushed upstream to SpecAI. */
  sentUpstream?: boolean;
}

/** A thrash row with its criterion resolved from Spec AI. Composed, never stored. */
export interface ThrashReading extends ThrashRow {
  /** The criterion's `then`, read from the story. */
  text: string;
  storyTitle: string;
  /** False when the criterion no longer exists upstream — worth saying, not hiding. */
  resolved: boolean;
}

/** Per-repo handling of change that arrived with no linked ticket. */
export type UntrackedPolicy = 'flag' | 'auto-ticket' | 'tolerate';

export interface UntrackedChange {
  repo: string;
  commit: string;
  author: string;
  /**
   * The developer's own subject line, verbatim.
   *
   * Distinct from `summary` and the distinction is the point: this is what
   * somebody claimed they did, and the summary is what the diff observed. A
   * commit reading `refactor: tidy imports` that moved a rate limit is exactly
   * the row worth looking at, and collapsing the two columns hides it.
   */
  message: string;
  /** What the semantic diff observed, in CodeIQ's words rather than the author's. */
  summary: string;
  /**
   * Behavioural or cosmetic — the field that decides whether this commit needed a
   * story at all.
   *
   * Optional because it is an output, not a property of the commit. A repository
   * with `semanticDiff` off produces no classification, and storing one anyway
   * would let the panel show a verdict the analysis never reached.
   */
  change?: ChangeClass;
  files: number;
  at: string;
  policy: UntrackedPolicy;
}

/**
 * How a commit is joined to the story it delivers.
 *
 * This single setting decides whether CodeIQ can say anything at all about a
 * repository. It is the reason the dashboard reports a join-key percentage: a
 * repo on 'none' produces untracked change for every commit, and its gap report
 * is a statement about the convention rather than about the code.
 */
export type JoinKeyScheme = 'commit-trailer' | 'branch-name' | 'pr-link' | 'none';

/**
 * Per-repository configuration, scoped to a project.
 *
 * Configuration rather than adjudication, which is why it is authority-gated
 * while the review panel is not: anyone downstream of the spec may dispute a
 * verdict, but changing how commits are joined changes every verdict at once.
 */
export interface RepoPolicy {
  repo: string;
  language: string;
  joinKey: JoinKeyScheme;
  /** What happens to a commit with no story behind it. */
  untracked: UntrackedPolicy;
  /**
   * Whether the semantic diff runs. With it off, a formatting-only commit counts
   * as realizing a criterion — which is how a cosmetic change reads as delivery.
   */
  semanticDiff: boolean;
  /**
   * When this repo was last scanned. The only indexing fact in the module —
   * absent means never scanned, and a project is indexed when any of its repos
   * has been. The project used to carry its own `indexed` flag and its own
   * timestamp beside these, which is three fields for one thing and two of them
   * able to contradict the third.
   */
  lastIndexedAt?: string;
}

// ───────────────────────── Per-project state ─────────────────────────

/**
 * One project's CodeIQ workspace.
 *
 * Everything the module holds is scoped to a project, because lineage is. A
 * repository is bound to a project through a connector activation, and a
 * criterion belongs to a story that belongs to a project — so a flat list of
 * review targets shared across the platform could only ever be one project's
 * data shown to everyone.
 */
export interface CodeIqState {
  /** Immutable join key. Never the project's display name. */
  projectId: string;
  /**
   * Human overrides, keyed by `criterionRef(storyKey, criterionId)`.
   *
   * This is the only thing CodeIQ persists per criterion. Targets and rollups
   * are composed on read from Spec AI's stories plus the analysis, so a story
   * edited upstream shows up here without a sync step — and cannot go stale,
   * because there is no copy to go stale.
   */
  adjudications: Record<string, Adjudication>;
  thrash: ThrashRow[];
  untracked: UntrackedChange[];
  /**
   * One row per repository bound to this project, and the only place an indexing
   * timestamp lives. Whether the project is indexed at all is read off these.
   */
  repos: RepoPolicy[];
}

/**
 * What a view reads: the persisted state, plus everything derived from Spec AI
 * and the analysis at the moment of reading.
 */
export interface CodeIqReading {
  state: CodeIqState;
  /**
   * Whether anything has been scanned. Derived from the repos, so it cannot
   * disagree with them.
   *
   * The load-bearing distinction in the module. A project that was never indexed
   * has no verdict on its code; a project indexed with nothing open has one.
   * Both render as zero and only one of them is a problem.
   */
  indexed: boolean;
  /** Per-repo scan times, named rather than collapsed into one project figure. */
  indexedAt: { repo: string; at: string }[];
  /**
   * Which feeds are live for this project. Read before the numbers, because a
   * missing feed changes what the numbers mean rather than just their value.
   */
  feeds: { source: boolean; agent: boolean; live: string[] };
  /** Stories with code landed against them, in worst-first order. */
  targets: ReviewTarget[];
  /** Thrash rows with their criterion text resolved from Spec AI. */
  thrash: ThrashReading[];
  /** How much of the report can be trusted, as percentages. */
  instrumentation: { structuredPct: number; joinedPct: number; unjoined: number };
}
