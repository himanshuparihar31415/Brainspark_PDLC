import { Project, ScopeContext } from '../types';
import { UserStory } from '../types/specai';
import {
  Adjudication,
  CodeIqState,
  JoinKeyScheme,
  RepoPolicy,
  Criterion,
  CriterionAnalysis,
  CriterionStatus,
  ReviewTarget,
  ThrashReading,
  ThrashRow,
  UntrackedChange,
} from '../types/codeiq';
import { Connector } from '../types';
import { CodeIqIntake, intakeNote } from './codeIqIntake';
import { isActivated } from './connectors';
import { criterionRef } from './specai';

/**
 * CodeIQ mock data.
 *
 * Deliberately continuous with the Spec AI fixture — the same biometric-login
 * work, one stage further down the lifecycle. A criterion here is the same
 * Given/When/Then a story carried in Spec AI, which is the whole point of the
 * contract between the two modules.
 */

// ───────────────────────────── Copy ─────────────────────────────

/*
 * The four statuses, named in plain words.
 *
 * They used to read Covered / Partial / Drifted / Missing, which is the module's
 * internal vocabulary rather than anybody's. `No code` in particular now matches
 * the chip on Project Tasks and the number on the project dashboard, so three
 * surfaces say one thing about the module's main finding instead of three.
 */
export const STATUS_COPY: Record<
  CriterionStatus,
  { label: string; tone: string; helper: string }
> = {
  covered: {
    label: 'Built',
    tone: 'ok',
    helper: 'Code in this change set does what the criterion asks for.',
  },
  partial: {
    label: 'Partly built',
    tone: 'warn',
    helper: 'Part of this is built. Part of it has nothing behind it.',
  },
  drifted: {
    label: 'Built differently',
    tone: 'drift',
    helper: 'Code exists, but it behaves differently from what was asked for.',
  },
  missing: {
    label: 'No code',
    tone: 'gap',
    helper: 'Nothing in this change set does what the criterion asks for.',
  },
};

/**
 * The same four statuses, short enough for a list chip.
 *
 * The master list was rendering its own words — "3 missing", "1 drifted",
 * "1 partial" — beside a detail column reading "No code", "Built differently",
 * "Partly built". Same data, two vocabularies, one screen. These sit directly
 * under STATUS_COPY so that renaming a status forces a look at both.
 */
export const STATUS_MINI: Record<CriterionStatus, string> = {
  covered: 'built',
  partial: 'partly built',
  drifted: 'differs',
  missing: 'no code',
};

/**
 * The action each status offers. A status that is only a colour makes the
 * reader work out what to do with it; naming the action is the difference
 * between a report and a tool.
 */
export const STATUS_ACTION: Record<CriterionStatus, { primary: string; secondary: string }> = {
  covered: { primary: 'Show the code', secondary: 'Wrong match' },
  partial: { primary: 'Show what is missing', secondary: 'Accept as done' },
  drifted: { primary: 'Ask for a fix', secondary: 'Accept as built' },
  missing: { primary: 'Ask the author', secondary: 'Does not apply' },
};

/**
 * The one caveat worth printing, and only where it applies.
 *
 * This was a per-status record printed under every criterion's actions, and three
 * of its four entries were the same sentence — so it appeared on every row and
 * told the reader nothing about the row they were on. Finding no code is reliable;
 * deciding that code behaves *differently* from a sentence is not, and that is the
 * only place a reader needs warning. It now shows inside an expanded
 * built-differently row, next to the comparison it qualifies.
 */
export const DRIFT_CAVEAT =
  'Reading intent out of code is the least reliable thing CodeIQ does. Treat this as a prompt to look, not as a finding.';

// ───────────────────────── Analysis fixture ─────────────────────────

/*
 * What CodeIQ found, keyed by `criterionRef(storyKey, criterionId)`.
 *
 * This is the module's own output and the only CodeIQ data authored by hand.
 * The criterion text is not here — it lives on the Spec AI story and is read
 * through the intake, so a criterion reworded upstream cannot leave a stale copy
 * behind in this file. That was the previous failure mode: 320 lines of
 * Given/When/Then in this module that no PM had ever seen.
 *
 * Only stories with code landed against them appear. A story that is exported
 * but has no entry here is not a gap and is not a clean bill of health — nothing
 * has been built against it yet, so there is nothing to adjudicate.
 */
export const ANALYSIS: Record<string, CriterionAnalysis> = {
  // ── FMB2-AUTH-031 · Sign in with device biometrics · tracker says Done ──
  'FMB2-AUTH-031#AC-1': {
    status: 'covered',
    confidence: 0.94,
    files: [
      {
        path: 'app/auth/BiometricGate.tsx',
        lines: 'L18–L96',
        change: 'behavioral',
        why: 'New branch on the login route, guarded by enrolment state.',
      },
      {
        path: 'app/auth/useEnrolment.ts',
        lines: 'L1–L54',
        change: 'behavioral',
        why: 'Reads enrolment from the identity API.',
      },
    ],
    tests: { present: true, refs: ['BiometricGate.offers-biometric-when-enrolled'] },
    lineage: [
      {
        id: 'g-031-1',
        agent: 'Claude Code',
        prompt: 'Add a biometric gate to the login route for enrolled customers',
        at: '14 Aug · 09:41',
        kept: true,
      },
    ],
  },
  'FMB2-AUTH-031#AC-2': {
    status: 'partial',
    confidence: 0.82,
    files: [
      { path: 'app/auth/BiometricGate.tsx', lines: 'L97–L131', change: 'behavioral' },
      {
        path: 'app/session/issueSession.ts',
        lines: 'L44–L61',
        change: 'behavioral',
        why: 'Issues the session and routes to the account summary. Nothing here writes the audit record the criterion also asks for.',
      },
    ],
    tests: { present: true, refs: ['issueSession.lands-on-summary'] },
    lineage: [
      {
        id: 'g-031-2',
        agent: 'Claude Code',
        prompt: 'Issue the session and route to the account summary after a biometric pass',
        at: '14 Aug · 10:07',
        kept: true,
      },
      {
        id: 'g-031-2b',
        agent: 'Cursor',
        prompt: 'Route to summary on biometric success',
        at: '14 Aug · 09:58',
        kept: false,
        supersededBy: 'g-031-2',
      },
    ],
  },
  'FMB2-AUTH-031#AC-3': {
    status: 'missing',
    confidence: 0.9,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [],
  },

  // ── FMB2-AUTH-032 · Fall back to PIN after three failures · Done ──
  'FMB2-AUTH-032#AC-1': {
    status: 'covered',
    confidence: 0.93,
    files: [
      {
        path: 'app/auth/attemptCounter.ts',
        lines: 'L1–L48',
        change: 'behavioral',
        why: 'Counts consecutive failures and refuses further biometric attempts.',
      },
      { path: 'app/auth/pin/PinEntry.tsx', lines: 'L88–L104', change: 'behavioral' },
    ],
    tests: { present: true, refs: ['attemptCounter.locks-after-three'] },
    lineage: [
      {
        id: 'g-032-1',
        agent: 'Cursor',
        prompt: 'Lock biometric attempts after three consecutive failures and show PIN entry',
        at: '15 Aug · 11:20',
        kept: true,
      },
    ],
  },
  'FMB2-AUTH-032#AC-2': {
    status: 'drifted',
    confidence: 0.66,
    files: [{ path: 'app/auth/attemptCounter.ts', lines: 'L49–L72', change: 'behavioral' }],
    drift: {
      expected: 'biometric sign-in is offered again on the next launch',
      realized: 'the lockout is held for 24 hours from the third failure, across launches',
      explanation:
        'The counter persists to secure storage with a 24-hour expiry rather than resetting per session. Written as a session rule, built as a time-boxed one.',
    },
    tests: { present: true, refs: ['attemptCounter.expires-after-24h'] },
    lineage: [
      {
        id: 'g-032-2',
        agent: 'Cursor',
        prompt: 'Persist the lockout so it survives an app restart',
        at: '15 Aug · 14:02',
        kept: true,
      },
    ],
  },
  'FMB2-AUTH-032#AC-3': {
    status: 'missing',
    confidence: 0.91,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [
      {
        id: 'g-032-3',
        agent: 'Claude Code',
        prompt: 'Emit a biometric_lockout security event with the device identifier',
        at: '15 Aug · 16:35',
        kept: false,
        supersededBy: 'discarded — no audit sink wired in this repo',
      },
    ],
  },

  // ── FMB2-DEV-018 · Bind an enrolment to a single device · Done ──
  'FMB2-DEV-018#AC-1': {
    status: 'covered',
    confidence: 0.95,
    files: [
      {
        path: 'identity/binding/create.ts',
        lines: 'L1–L88',
        change: 'behavioral',
        why: 'Creates the binding and returns its identifier.',
      },
    ],
    tests: { present: true, refs: ['binding.create.returns-identifier'] },
    lineage: [
      {
        id: 'g-018-1',
        agent: 'Claude Code',
        prompt: 'Create a device binding scoped to one device and return the binding id',
        at: '12 Aug · 15:14',
        kept: true,
      },
    ],
  },
  'FMB2-DEV-018#AC-2': {
    status: 'covered',
    confidence: 0.92,
    files: [
      { path: 'identity/binding/create.ts', lines: 'L89–L126', change: 'behavioral' },
    ],
    tests: { present: true, refs: ['binding.create.conflicts-with-409'] },
    lineage: [
      {
        id: 'g-018-2',
        agent: 'Claude Code',
        prompt: 'Return 409 with the existing binding when one already exists',
        at: '12 Aug · 15:51',
        kept: true,
      },
    ],
  },
  /*
   * The clean one, and the fixture needs it.
   *
   * Every story marked Done used to carry a gap, so the trust split read
   * "0 stand up / 3 overstated" and a reader clicking through never saw what a
   * good outcome looks like — which makes the module read as though it only ever
   * reports failure. This criterion was drift; AUTH-032 still carries a drift, so
   * nothing is lost by letting this story stand up.
   */
  'FMB2-DEV-018#AC-3': {
    status: 'covered',
    confidence: 0.91,
    files: [
      {
        path: 'identity/binding/create.ts',
        lines: 'L127–L149',
        change: 'behavioral',
        why: 'Fails closed with a 503 and creates no binding when attestation is unavailable.',
      },
    ],
    tests: { present: true, refs: ['binding.create.fails-closed'] },
    lineage: [
      {
        id: 'g-018-3',
        agent: 'Cursor',
        prompt: 'Fail closed when the attestation service is unavailable',
        at: '12 Aug · 16:30',
        kept: true,
      },
    ],
  },

  // ── FMB2-DEV-019 · Review and remove registered devices · In progress ──
  'FMB2-DEV-019#AC-1': {
    status: 'covered',
    confidence: 0.89,
    files: [
      {
        path: 'app/settings/DeviceList.tsx',
        lines: 'L1–L142',
        change: 'behavioral',
        why: 'Lists devices with name, last-used date and biometric state.',
      },
    ],
    tests: { present: true, refs: ['DeviceList.renders-last-used'] },
    lineage: [
      {
        id: 'g-019-1',
        agent: 'Claude Code',
        prompt: 'List registered devices with name, last used and whether biometrics are on',
        at: '18 Aug · 10:12',
        kept: true,
      },
    ],
  },
  'FMB2-DEV-019#AC-2': {
    status: 'partial',
    confidence: 0.78,
    files: [
      { path: 'app/settings/DeviceList.tsx', lines: 'L143–L178', change: 'behavioral' },
      {
        path: 'identity/binding/revoke.ts',
        lines: 'L1–L40',
        change: 'behavioral',
        why: 'Revokes the binding. Nothing in this change set ends the session on that device.',
      },
    ],
    tests: { present: false, refs: [] },
    lineage: [
      {
        id: 'g-019-2',
        agent: 'Claude Code',
        prompt: 'Revoke the binding and refresh the list',
        at: '18 Aug · 11:40',
        kept: true,
      },
    ],
  },
  'FMB2-DEV-019#AC-3': {
    status: 'missing',
    confidence: 0.87,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [],
  },

  // ── FMB2-AUTH-034 · Re-enrol after a factory reset · Blocked ──
  'FMB2-AUTH-034#AC-1': {
    status: 'missing',
    confidence: 0.88,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [
      {
        id: 'g-034-1',
        agent: 'Cursor',
        prompt: 'Offer enrolment again when the device attestation key has changed',
        at: '19 Aug · 09:05',
        kept: false,
        supersededBy: 'discarded — blocked on the attestation contract',
      },
      {
        id: 'g-034-1b',
        agent: 'Cursor',
        prompt: 'Detect a reset device and re-offer enrolment',
        at: '19 Aug · 09:48',
        kept: false,
        supersededBy: 'discarded — blocked on the attestation contract',
      },
    ],
  },
  'FMB2-AUTH-034#AC-2': {
    status: 'missing',
    confidence: 0.86,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [],
  },
  'FMB2-AUTH-034#AC-3': {
    status: 'missing',
    confidence: 0.84,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [],
  },
};

/**
 * The change set a story's code arrived in.
 *
 * Not derivable from a story — a repository, a branch and a PR number are facts
 * about the code, and they arrive through the source-control connector. Keyed by
 * story key, and its presence is what makes a story a review target at all.
 */
export interface ChangeSet {
  repo: string;
  branch: string;
  pr: string;
  author: string;
}

export const CHANGE_SETS: Record<string, ChangeSet> = {
  'FMB2-AUTH-031': {
    repo: 'mobile-banking',
    branch: 'feat/biometric-signin',
    pr: 'PR #2841',
    author: 'Priya Sharma',
  },
  'FMB2-AUTH-032': {
    repo: 'mobile-banking',
    branch: 'feat/pin-fallback',
    pr: 'PR #2856',
    author: 'Priya Sharma',
  },
  'FMB2-AUTH-034': {
    repo: 'mobile-banking',
    branch: 'feat/re-enrol-after-reset',
    pr: 'PR #2903',
    author: 'Priya Sharma',
  },
  'FMB2-DEV-018': {
    repo: 'identity-service',
    branch: 'feat/device-binding',
    pr: 'PR #1194',
    author: 'David Chen',
  },
  /*
   * Committed by someone other than the story owner — which happens, and is why
   * `owner` and `author` are separate fields rather than one.
   */
  'FMB2-DEV-019': {
    repo: 'mobile-banking',
    branch: 'feat/device-list',
    pr: 'PR #2877',
    author: 'Daniel Okafor',
  },
};

// ───────────────────────── Composition ─────────────────────────

/** What a criterion with no analysis is reported as. Never omitted — see below. */
const UNANALYSED: CriterionAnalysis = {
  status: 'missing',
  confidence: 0,
  files: [],
  tests: { present: false, refs: [] },
  lineage: [],
};

/**
 * Build one review target by joining a story's criteria to CodeIQ's analysis and
 * whatever a human has since decided about them.
 *
 * A criterion with no analysis is reported as missing at zero confidence rather
 * than dropped. Dropping it would shrink the denominator, and a gap report whose
 * denominator moves is worse than none at all — the numbers would improve every
 * time the analysis failed to run.
 */
export const buildTarget = (
  intake: CodeIqIntake,
  adjudications: Record<string, Adjudication>
): ReviewTarget | null => {
  const change = CHANGE_SETS[intake.storyKey];
  if (!change) return null;

  const criteria: Criterion[] = intake.criteria.map((c) => {
    const ref = criterionRef(intake.storyKey, c.id);
    return { ...c, ...(ANALYSIS[ref] ?? UNANALYSED), ...(adjudications[ref] ?? {}) };
  });

  return {
    storyId: intake.storyId,
    storyKey: intake.storyKey,
    title: intake.title,
    owner: intake.owner,
    ...change,
    claimed: intake.claimed,
    criteria,
    intakeNote: intakeNote(intake),
  };
};

/** Worst first. A story with unrealized criteria should never be below the fold. */
const severity = (t: ReviewTarget) => {
  const n = countBy(t.criteria);
  return n.missing * 3 + n.drifted * 2 + n.partial;
};

/**
 * Every story in this project that has code landed against it.
 *
 * A story that is exported with no change set is absent, which is correct and is
 * not the same as being clean: nothing has been built against it, so CodeIQ has
 * nothing to say. The dashboard counts what it can see and says how much that is.
 */
export const buildTargets = (
  intakes: CodeIqIntake[],
  adjudications: Record<string, Adjudication>
): ReviewTarget[] =>
  intakes
    .map((i) => buildTarget(i, adjudications))
    .filter((t): t is ReviewTarget => t !== null)
    .sort((a, b) => severity(b) - severity(a));

/**
 * Commits with no story behind them.
 *
 * `message` is the author's subject line and `summary` is what the semantic diff
 * observed, deliberately in different words. Where they disagree is the whole
 * value of the screen — see `4f2ac91`, whose subject calls itself a null guard
 * and whose diff also moved a timeout.
 *
 * `change` is absent on notification-service because that repo runs with
 * `semanticDiff: false`. Nothing classified those commits, so no classification
 * is recorded — the panel says "not classified" rather than guessing.
 */
export const UNTRACKED: UntrackedChange[] = [
  {
    repo: 'mobile-banking',
    commit: '4f2ac91',
    author: 'Daniel Okafor',
    message: 'fix(enrol): null guard on enrolment response',
    summary: 'Guards a null device id, and raises the binding timeout from 5s to 30s',
    change: 'behavioral',
    files: 2,
    at: '16 Aug · 22:14',
    policy: 'flag',
  },
  {
    repo: 'identity-service',
    commit: 'ba07e3d',
    author: 'Cursor (agent)',
    message: 'refactor(session): extract token parser',
    summary: 'Splits the session helper; token expiry is now evaluated before signature',
    change: 'behavioral',
    files: 9,
    at: '16 Aug · 15:02',
    policy: 'auto-ticket',
  },
  {
    repo: 'mobile-banking',
    commit: 'e70b155',
    author: 'Claude Code (agent)',
    message: 'chore: remove dead code in the legacy PIN path',
    summary: 'Deletes the unreachable PIN fallback branch and its two callers',
    change: 'behavioral',
    files: 14,
    at: '14 Aug · 19:30',
    policy: 'flag',
  },
  {
    repo: 'identity-service',
    commit: '19cc7f0',
    author: 'Priya Nair',
    message: 'chore(deps): bump jose and regenerate the lockfile',
    summary: 'Dependency versions and lockfile only. No reachable behaviour changed',
    change: 'cosmetic',
    files: 3,
    at: '15 Aug · 08:47',
    policy: 'tolerate',
  },
  {
    repo: 'identity-service',
    commit: '2d90fca',
    author: 'renovate[bot]',
    message: 'chore(deps): bump @types/node from 22.5.1 to 22.7.4',
    summary: 'Type definitions only. Nothing in the compiled output moved',
    change: 'cosmetic',
    files: 2,
    at: '15 Aug · 04:10',
    policy: 'flag',
  },
  {
    repo: 'mobile-banking',
    commit: '8b1c4e2',
    author: 'renovate[bot]',
    message: 'chore(deps): bump react-native-svg from 15.3.0 to 15.6.0',
    summary: 'Patch bump inside a vendored dependency. No first-party code touched',
    change: 'cosmetic',
    files: 2,
    at: '14 Aug · 03:52',
    policy: 'flag',
  },
  {
    repo: 'notification-service',
    commit: 'c04e881',
    author: 'Samir Patel',
    message: 'feat(push): exponential backoff on delivery retry',
    summary: 'Semantic diff is off for this repository — no classification was produced',
    files: 6,
    at: '16 Aug · 09:31',
    policy: 'flag',
  },
  {
    repo: 'notification-service',
    commit: '5ac2f18',
    author: 'Claude Code (agent)',
    message: 'style(templates): reformat docstrings',
    summary: 'Semantic diff is off for this repository — no classification was produced',
    files: 11,
    at: '13 Aug · 17:05',
    policy: 'flag',
  },
];

/**
 * What a change class means here, and what its absence means.
 *
 * The third entry is not a third class — it is the honest reading when the
 * analysis did not run. Showing `cosmetic` for an unclassified commit is the
 * failure this copy exists to prevent: it would turn "we did not look" into
 * "we looked and it was nothing".
 */
export const CHANGE_CLASS_COPY: Record<'behavioral' | 'cosmetic' | 'unknown', {
  label: string;
  helper: string;
}> = {
  behavioral: {
    label: 'behavioural',
    helper: 'The diff changes what the code does. Work like this usually wants a story.',
  },
  cosmetic: {
    label: 'cosmetic',
    helper: 'Formatting, dependencies or dead code. Nothing reachable changed behaviour.',
  },
  unknown: {
    label: 'not classified',
    helper:
      'Semantic diff is off for this repository, so nothing classified this commit. Not the same as finding it harmless.',
  },
};

/**
 * How to label one commit's change class, given its repository's settings.
 *
 * Two independent reasons to report nothing — no stored classification, or the
 * repo's semantic diff switched off since indexing — and both must land on
 * "not classified" rather than on a stale verdict.
 */
export const changeClassOf = (
  row: UntrackedChange,
  repos: RepoPolicy[]
): 'behavioral' | 'cosmetic' | 'unknown' => {
  const repo = repos.find((r) => r.repo === row.repo);
  if (!repo?.semanticDiff) return 'unknown';
  return row.change ?? 'unknown';
};

/**
 * Which rows a bulk tolerate may touch.
 *
 * Cosmetic only, and never an unclassified one. Tolerating a commit is asserting
 * it needed no story; doing that in bulk is only defensible where the analysis
 * actually said the commit changed no behaviour. Everything else stays a
 * one-at-a-time decision, which is the judgement the screen exists for.
 */
export const bulkTolerable = (rows: UntrackedChange[], repos: RepoPolicy[]): UntrackedChange[] =>
  rows.filter((r) => r.policy !== 'tolerate' && changeClassOf(r, repos) === 'cosmetic');

export const countBy = (criteria: Criterion[]): Record<CriterionStatus, number> => ({
  covered: criteria.filter((c) => c.status === 'covered').length,
  partial: criteria.filter((c) => c.status === 'partial').length,
  drifted: criteria.filter((c) => c.status === 'drifted').length,
  missing: criteria.filter((c) => c.status === 'missing').length,
});

/**
 * The headline sentence, and the one place the product's opinion shows.
 *
 * It names the gap rather than a completion score. A percentage is directionally
 * right and precisely wrong, and it gets over-trusted the moment it exists.
 */
export const gapHeadline = (criteria: Criterion[]): string => {
  const live = criteria.filter((c) => !c.dismissal);
  const missing = live.filter((c) => c.status === 'missing').length;
  const drifted = live.filter((c) => c.status === 'drifted').length;
  const partial = live.filter((c) => c.status === 'partial').length;

  if (missing === 0 && drifted === 0 && partial === 0) {
    return 'Everything asked for was built.';
  }

  const parts: string[] = [];
  if (missing > 0)
    parts.push(`${missing} ${missing === 1 ? 'criterion has' : 'criteria have'} no code`);
  if (drifted > 0) parts.push(`${drifted} built differently`);
  if (partial > 0) parts.push(`${partial} only partly built`);
  return parts.join(' · ');
};

export const UNTRACKED_POLICY_COPY: Record<
  UntrackedChange['policy'],
  { label: string; helper: string }
> = {
  flag: { label: 'Flagged', helper: 'Raised for a human to link or dismiss.' },
  'auto-ticket': { label: 'Auto-ticketed', helper: 'A lightweight ticket was opened for it.' },
  tolerate: { label: 'Tolerated', helper: 'Repo policy accepts this without a ticket.' },
};

/*
 * Churn per criterion, keyed to the story the criterion belongs to.
 *
 * These are the rows that go back to Spec AI. They carry no criterion text —
 * `resolveThrash` reads it from the story, so a row cannot end up naming a
 * criterion while quoting different words than the criterion holds.
 */
export const THRASH: ThrashRow[] = [
  { criterionId: 'AC-2', storyKey: 'FMB2-AUTH-032', attempts: 11, discarded: 9, days: 4 },
  { criterionId: 'AC-1', storyKey: 'FMB2-AUTH-034', attempts: 8, discarded: 6, days: 5 },
  { criterionId: 'AC-3', storyKey: 'FMB2-DEV-018', attempts: 7, discarded: 5, days: 3 },
  { criterionId: 'AC-2', storyKey: 'FMB2-DEV-019', attempts: 5, discarded: 3, days: 2 },
  { criterionId: 'AC-3', storyKey: 'FMB2-AUTH-031', attempts: 4, discarded: 4, days: 2 },
];

// ───────────────────────── Leadership derivations ─────────────────────────

/*
 * Read straight off the review targets.
 *
 * There used to be a `TicketRollup` between these and the targets, carrying a
 * story key, title, owner, claim and five counts — every one of them already on
 * the target or one `countBy` away. A second name for the same row is a second
 * thing to keep in step, and the dashboard is exactly where nobody would notice
 * the two had stopped agreeing.
 */

/** A story is genuinely done only when nothing is missing, drifted or partial. */
export const isGenuinelyDone = (t: ReviewTarget): boolean => {
  const n = countBy(t.criteria);
  return n.missing === 0 && n.drifted === 0 && n.partial === 0;
};

export const claimedDone = (targets: ReviewTarget[]): ReviewTarget[] =>
  targets.filter((t) => t.claimed === 'Done');

/**
 * The trust metric: of the work marked done, how much stands up. Two numbers
 * rather than one — a single ratio hides which side of it you are on.
 */
export const trustSplit = (targets: ReviewTarget[]) => {
  const done = claimedDone(targets);
  const genuine = done.filter(isGenuinelyDone);
  return {
    claimed: done.length,
    genuine: genuine.length,
    overstated: done.length - genuine.length,
    /** Criteria with no code at all, across everything marked done. */
    missingCriteria: done.reduce((n, t) => n + countBy(t.criteria).missing, 0),
  };
};

export const storiesWithGaps = (targets: ReviewTarget[]): ReviewTarget[] =>
  targets.filter((t) => !isGenuinelyDone(t));

/**
 * Stories claimed done whose criteria are not all realized.
 *
 * The one CodeIQ fact other surfaces are allowed to read — the tasks queue and
 * the project dashboard both ask this question and neither should answer it
 * itself. Three call sites writing "claimed done with missing criteria" three
 * ways is how they end up disagreeing about the same story.
 */
export const unbuiltStories = (targets: ReviewTarget[]): ReviewTarget[] =>
  claimedDone(targets).filter((t) => countBy(t.criteria).missing > 0);

/**
 * The lineage behind one task, or null when there is none to show.
 *
 * Joined on `storyId`, which is the immutable key both sides already carry —
 * never on the title or the display key. A task with no `storyId` is not a
 * failure to join: `taskType` marks operations, spikes and governance work as
 * legitimately story-less, and only `story-work` without a story is evidence of
 * something missing.
 */
export const targetForTask = (
  targets: ReviewTarget[],
  storyId: string | undefined
): ReviewTarget | null => (storyId ? targets.find((t) => t.storyId === storyId) ?? null : null);

/**
 * Criteria with no code behind the story this task delivers.
 *
 * Deliberately counts `missing` only. `missing` is the module's high-accuracy
 * output; drift is a 60–75% assist, and putting an assist on a task row — where
 * it sits beside a person's name and a sign-off button — would be lending it
 * authority the analysis does not have.
 */
export const unbuiltForTask = (targets: ReviewTarget[], storyId: string | undefined): number => {
  const target = targetForTask(targets, storyId);
  return target ? countBy(target.criteria).missing : 0;
};

// ───────────────────────── Dashboard tiles ─────────────────────────

/**
 * The findings a dashboard tile can narrow the story list to.
 *
 * `overstated` is not a criterion status — it is a property of a story, and it is
 * the one the module exists for. The other two are criterion counts rolled up to
 * the stories carrying them.
 */
export type GapFilter = 'missing' | 'overstated' | 'drifted';

/**
 * Does this story match the filter?
 *
 * Load-bearing: the tile's own number and the list it filters to are counted
 * through this same predicate. A tile reading 47 that filters to a list of 44 is
 * worse than no tile at all, because the reader has no way to tell which of the
 * two lied.
 */
export const matchesGapFilter = (t: ReviewTarget, filter: GapFilter): boolean => {
  const n = countBy(t.criteria);
  switch (filter) {
    case 'missing':
      return n.missing > 0;
    case 'drifted':
      return n.drifted > 0;
    case 'overstated':
      return t.claimed === 'Done' && !isGenuinelyDone(t);
  }
};

/** Stories under a filter, or all of them when nothing is selected. */
export const filterTargets = (targets: ReviewTarget[], filter: GapFilter | null) =>
  filter === null ? targets : targets.filter((t) => matchesGapFilter(t, filter));

export interface GapTile {
  filter: GapFilter;
  /** The headline figure. A string, because one of them is "3 of 3". */
  value: string;
  /** What the number counts, e.g. "criteria". Never omitted — 47 of what? */
  unit: string;
  label: string;
  /** The second line: scope, or the caveat the number has to carry. */
  note: string;
  tone: 'bad' | 'warn' | 'drift';
}

/**
 * The three filtering tiles, computed together.
 *
 * Computed here rather than in the panel so the numbers and the predicates
 * cannot drift apart, and so the copy that qualifies a number sits beside the
 * number. Drift carries its accuracy range in `note` because it is a 60–75%
 * assist sitting beside two counts that are not — and a tile row makes
 * everything on it look equally solid.
 */
export const gapTiles = (targets: ReviewTarget[]): GapTile[] => {
  const trust = trustSplit(targets);
  const criteriaWhere = (filter: GapFilter, pick: (n: Record<CriterionStatus, number>) => number) =>
    targets.filter((t) => matchesGapFilter(t, filter)).reduce((sum, t) => sum + pick(countBy(t.criteria)), 0);

  const noCode = criteriaWhere('missing', (n) => n.missing);
  const noCodeStories = targets.filter((t) => matchesGapFilter(t, 'missing')).length;
  const drifted = criteriaWhere('drifted', (n) => n.drifted);

  return [
    {
      filter: 'missing',
      value: String(noCode),
      unit: noCode === 1 ? 'criterion' : 'criteria',
      label: 'Nothing built for it',
      note: `In ${noCodeStories} ${noCodeStories === 1 ? 'story' : 'stories'}`,
      tone: 'bad',
    },
    {
      /*
       * Both numbers in the value, not one in the value and one in the unit.
       * A big `3` labelled `of 3 done` read as though three of something else
       * were done.
       */
      filter: 'overstated',
      value: `${trust.overstated} of ${trust.claimed}`,
      unit: 'marked done',
      label: 'Not fully built',
      note: 'Called done, but something is missing',
      tone: 'warn',
    },
    {
      filter: 'drifted',
      value: String(drifted),
      unit: drifted === 1 ? 'criterion' : 'criteria',
      label: 'Built differently',
      note: 'Worth a look, not a verdict',
      tone: 'drift',
    },
  ];
};

/**
 * Copy for the table once a filter is on.
 *
 * The title changes rather than a chip appearing beside an unchanged one. A
 * heading that still reads "Stories with gaps" over a list of two is how a
 * filtered view gets mistaken for the whole set.
 */
export const GAP_FILTER_COPY: Record<GapFilter, { title: string; subtitle: string }> = {
  missing: {
    title: 'Nothing built for it',
    subtitle: 'At least one thing the story asked for has no code behind it.',
  },
  overstated: {
    /*
     * The old subtitle read "The tracker says done. Something is missing,
     * drifted or only partly realized — whichever the tracker says." The closing
     * clause repeated the opening and did not parse.
     */
    title: 'Marked done, not fully built',
    subtitle: 'The tracker calls these done. Something in each one is still not built.',
  },
  drifted: {
    title: 'Built differently',
    subtitle: 'The code works, but not the way the story described it.',
  },
};

// ───────────────────────── Per-project state ─────────────────────────

/**
 * A project nobody has indexed yet. Empty, and honest about why: it has no
 * repositories, so `isIndexed` reads false and the workspace can say "no lineage
 * here" rather than showing a clean dashboard that implies the code was checked
 * and found blameless.
 */
export const blankCodeIqState = (projectId: string): CodeIqState => ({
  projectId,
  adjudications: {},
  thrash: [],
  untracked: [],
  repos: [],
});

/**
 * Repository policy for Mobile Banking V2.
 *
 * Two repos on two different join-key schemes on purpose. The commit trailer is
 * reliable; branch naming is not, and the identity service's lower join rate is
 * exactly the kind of thing the dashboard's join-key percentage is meant to
 * expose rather than average away.
 */
export const REPO_POLICIES: RepoPolicy[] = [
  {
    repo: 'mobile-banking',
    language: 'TypeScript · React Native',
    joinKey: 'commit-trailer',
    untracked: 'flag',
    semanticDiff: true,
    lastIndexedAt: '4 mins ago',
  },
  {
    repo: 'identity-service',
    language: 'TypeScript · Node',
    joinKey: 'branch-name',
    untracked: 'tolerate',
    semanticDiff: true,
    lastIndexedAt: '11 mins ago',
  },
  /*
   * The badly instrumented one, and it earns its place in the fixture.
   *
   * No join key means every commit here arrives untracked, and semantic diff off
   * means none of them can be classified. Both facts have to be visible
   * somewhere, or the module only ever demonstrates the case where it works.
   */
  {
    repo: 'notification-service',
    language: 'Kotlin · Spring',
    joinKey: 'none',
    untracked: 'flag',
    semanticDiff: false,
    lastIndexedAt: '2 hours ago',
  },
];

export const JOIN_KEY_COPY: Record<JoinKeyScheme, { label: string; helper: string }> = {
  'commit-trailer': {
    label: 'Commit trailer',
    helper:
      'A Story-Id line in the commit message. The most reliable, and the only one that survives a rebase.',
  },
  'branch-name': {
    label: 'Branch convention',
    helper:
      'Parsed from the branch name. Breaks on any branch that does not follow it, and nothing warns you.',
  },
  'pr-link': {
    label: 'PR link',
    helper:
      'Read from the pull request body. Joins the PR rather than the commit, so squashes lose the detail.',
  },
  none: {
    label: 'None',
    helper: 'No join. Every commit reads as untracked, and no criterion can be mapped to code.',
  },
};

/**
 * Seeded state.
 *
 * Only Mobile Banking V2 has lineage — every story CodeIQ has a change set for
 * is one of its. The other projects get no row, so they render a workspace that
 * names the reason rather than Mobile Banking's stories under their own name.
 *
 * Note what is *not* here: no targets, no rollups, no thrash text, and no
 * `indexed` flag. All of them are composed on read — from Spec AI's stories, or
 * from the repos above — so there is no copy in this module to fall out of date.
 */
export const INITIAL_CODE_IQ: CodeIqState[] = [
  {
    projectId: 'p-mobile-v2',
    adjudications: {},
    thrash: THRASH,
    untracked: UNTRACKED,
    repos: REPO_POLICIES,
  },
];

/**
 * Which project's lineage a scope is asking about.
 *
 * Lineage is only meaningful against one repository set at a time, so there is
 * no platform-wide or department-wide CodeIQ view to fall back to — a governance
 * role browsing above project level has to be landed somewhere concrete. The
 * order is: the project in scope, then the first project in the department in
 * scope, then the first project at all.
 *
 * Returns null only when there are no projects, which is the empty-tenant case.
 */
export const codeIqProjectFor = (scope: ScopeContext, projects: Project[]): Project | null => {
  if (scope.projectId) {
    const exact = projects.find((p) => p.id === scope.projectId);
    if (exact) return exact;
  }
  if (scope.departmentId) {
    const inDepartment = projects.find((p) => p.departmentId === scope.departmentId);
    if (inDepartment) return inDepartment;
  }
  return projects[0] ?? null;
};

// ───────────────────────── Connector gate ─────────────────────────

/**
 * CodeIQ cannot see a commit it was never given.
 *
 * Lineage needs two feeds: source control for the change sets, and an IDE agent
 * for the generation attempts. Source control is the hard requirement — without
 * it there is nothing to map criteria onto. The IDE feed is what makes the
 * lineage and thrash signals possible, so its absence degrades the module rather
 * than stopping it, and the UI should say which.
 */
export const CODEIQ_SOURCE_CONNECTORS = ['conn-github', 'conn-gitlab'];
export const CODEIQ_AGENT_CONNECTORS = ['conn-cursor'];

export interface CodeIqFeeds {
  /** A source-control connector is live for this project. */
  source: boolean;
  /** An IDE agent connector is live for this project. */
  agent: boolean;
  /** Names of the live feeds, for the reader. */
  live: string[];
}

export const codeIqFeeds = (
  connectors: Connector[],
  projectId: string,
  departmentId?: string
): CodeIqFeeds => {
  const live = (ids: string[]) =>
    connectors.filter((c) => ids.includes(c.id) && isActivated(c, projectId, departmentId));

  const source = live(CODEIQ_SOURCE_CONNECTORS);
  const agent = live(CODEIQ_AGENT_CONNECTORS);
  return {
    source: source.length > 0,
    agent: agent.length > 0,
    live: [...source, ...agent].map((c) => c.name),
  };
};

/**
 * How much of what CodeIQ reports can be trusted, as two percentages.
 *
 * Both are instrumentation-quality measures rather than delivery ones, and both
 * are worth more than they look: a gap report over criteria that mostly arrived
 * as prose, or over commits that mostly carry no join key, is a gap report about
 * the pipeline rather than about the code. Taken from the prototype's gap-report
 * endpoint, which had them and this module did not.
 */
export interface Instrumentation {
  /** Share of adjudicated stories whose criteria arrived as Given/When/Then. */
  structuredPct: number;
  /** Share of adjudicated stories whose change set could be joined to them. */
  joinedPct: number;
  /** Stories exported with code that CodeIQ could not join to a change set. */
  unjoined: number;
}

export const instrumentation = (intakes: CodeIqIntake[]): Instrumentation => {
  if (intakes.length === 0) return { structuredPct: 0, joinedPct: 0, unjoined: 0 };

  const structured = intakes.filter((i) => i.structured).length;
  const joined = intakes.filter((i) => CHANGE_SETS[i.storyKey]).length;
  return {
    structuredPct: Math.round((structured / intakes.length) * 100),
    joinedPct: Math.round((joined / intakes.length) * 100),
    unjoined: intakes.length - joined,
  };
};

// ───────────────────────── Index state ─────────────────────────

/**
 * Whether anything has been scanned for this project.
 *
 * Read off the repos rather than stored. The state used to carry an `indexed`
 * boolean and a project-level timestamp beside the per-repo ones — three fields
 * for one fact, and `indexed: true` with no timestamp anywhere was constructible.
 */
export const isIndexed = (state: CodeIqState): boolean =>
  state.repos.some((r) => Boolean(r.lastIndexedAt));

/**
 * Per-repo scan times, named rather than averaged into one project figure.
 *
 * There is no honest single answer: two repos scanned eleven minutes apart give a
 * project no one timestamp, and picking either would be arbitrary.
 */
export const indexedAt = (state: CodeIqState): { repo: string; at: string }[] =>
  state.repos
    .filter((r) => r.lastIndexedAt)
    .map((r) => ({ repo: r.repo, at: r.lastIndexedAt as string }));

// ───────────────────────── Thrash resolution ─────────────────────────

/**
 * Resolve each thrash row's criterion against Spec AI.
 *
 * `resolved: false` is reported rather than dropped. A rework signal whose
 * criterion no longer exists upstream is itself information — the criterion was
 * churning and then someone deleted or renumbered it — and silently omitting the
 * row would hide the one case where the signal mattered most.
 */
export const resolveThrash = (rows: ThrashRow[], stories: UserStory[]): ThrashReading[] =>
  rows.map((row) => {
    const story = stories.find((s) => s.key === row.storyKey);
    const criterion = story?.acceptance.find((c) => c.id === row.criterionId);
    return {
      ...row,
      storyTitle: story?.title ?? row.storyKey,
      text: criterion?.then ?? 'This criterion is no longer in the spec.',
      resolved: Boolean(criterion),
    };
  });
