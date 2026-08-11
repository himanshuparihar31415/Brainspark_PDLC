import {
  Criterion,
  CriterionStatus,
  ReviewTarget,
  ThrashRow,
  TicketRollup,
  UntrackedChange,
} from '../types/codeiq';

/**
 * CodeIQ mock data.
 *
 * Deliberately continuous with the Spec AI fixture — the same biometric-login
 * work, one stage further down the lifecycle. A criterion here is the same
 * Given/When/Then a story carried in Spec AI, which is the whole point of the
 * contract between the two modules.
 */

// ───────────────────────────── Copy ─────────────────────────────

export const STATUS_COPY: Record<
  CriterionStatus,
  { label: string; tone: string; helper: string }
> = {
  covered: {
    label: 'Covered',
    tone: 'ok',
    helper: 'Behavioural code maps to this criterion.',
  },
  partial: {
    label: 'Partial',
    tone: 'warn',
    helper: 'Some of the criterion is realized; part of it is not.',
  },
  drifted: {
    label: 'Drifted',
    tone: 'drift',
    helper: 'Code exists but does something other than what was written.',
  },
  missing: {
    label: 'Missing',
    tone: 'gap',
    helper: 'Nothing in the change set addresses this.',
  },
};

/**
 * The action each status offers. A status that is only a colour makes the
 * reader work out what to do with it; naming the action is the difference
 * between a report and a tool.
 */
export const STATUS_ACTION: Record<CriterionStatus, { primary: string; secondary: string }> = {
  covered: { primary: 'Show evidence', secondary: 'Dispute mapping' },
  partial: { primary: 'Show what is missing', secondary: 'Accept as complete' },
  drifted: { primary: 'Flag for rework', secondary: 'Accept drift as intended' },
  missing: { primary: 'Send back to SpecAI', secondary: 'Mark not applicable' },
};

/** Where each output sits on the accuracy ladder (PRD §6). */
export const ACCURACY_NOTE: Record<CriterionStatus, string> = {
  covered: 'Gap mapping · 85–95% accurate',
  partial: 'Gap mapping · 85–95% accurate',
  drifted: 'Drift detection · 60–75% accurate — an assist, not a verdict',
  missing: 'Gap mapping · 85–95% accurate',
};

// ───────────────────────── Review panel fixture ─────────────────────────

const enrolmentCriteria: Criterion[] = [
  {
    id: 'AC-1',
    given: 'a customer who has completed onboarding',
    when: 'they open the app on a device with a registered biometric',
    then: 'they are offered biometric login instead of a PIN prompt',
    status: 'covered',
    confidence: 0.94,
    files: [
      {
        path: 'mobile/src/auth/BiometricGate.tsx',
        lines: 'L18–L96',
        change: 'behavioral',
        why: 'New branch on the login route, guarded by enrolment state.',
      },
      {
        path: 'mobile/src/auth/useEnrolment.ts',
        lines: 'L1–L54',
        change: 'behavioral',
        why: 'Reads enrolment from the identity API.',
      },
    ],
    tests: { present: true, refs: ['BiometricGate.offers-biometric-when-enrolled'] },
    lineage: [
      {
        id: 'g1',
        agent: 'Claude Code',
        prompt: 'Add a biometric gate to the login route for enrolled customers',
        at: '14 Aug · 09:41',
        kept: true,
      },
    ],
  },
  {
    id: 'AC-2',
    given: 'a customer who declines the biometric prompt',
    when: 'they choose to continue',
    then: 'the PIN entry screen is shown with no loss of session',
    status: 'covered',
    confidence: 0.91,
    files: [
      {
        path: 'mobile/src/auth/BiometricGate.tsx',
        lines: 'L97–L131',
        change: 'behavioral',
      },
      {
        path: 'mobile/src/auth/pin/PinEntry.tsx',
        lines: 'L212–L219',
        change: 'cosmetic',
        why: 'Copy change only — does not affect the criterion.',
      },
    ],
    tests: { present: true, refs: ['BiometricGate.falls-back-to-pin'] },
    lineage: [
      {
        id: 'g2',
        agent: 'Claude Code',
        prompt: 'Handle the decline path and route to PIN entry keeping the session',
        at: '14 Aug · 10:07',
        kept: true,
      },
      {
        id: 'g2b',
        agent: 'Cursor',
        prompt: 'Fall back to PIN on decline',
        at: '14 Aug · 09:58',
        kept: false,
        supersededBy: 'g2',
      },
    ],
  },
  {
    id: 'AC-3',
    given: 'a device that has been used by more than one customer',
    when: 'a second customer enrols a biometric on it',
    then: 'the device binding is scoped per customer, not per device',
    status: 'drifted',
    confidence: 0.68,
    files: [
      {
        path: 'services/device/src/binding.ts',
        lines: 'L61–L140',
        change: 'behavioral',
        why: 'Binding record is written and read here.',
      },
    ],
    drift: {
      expected: 'Binding keyed on (deviceId, customerId).',
      realized: 'Binding keyed on deviceId alone; the second enrolment overwrites the first.',
      explanation:
        'The realized write path takes only the device identifier. A shared device would silently rebind to whoever enrolled last, which is the failure the criterion was written to prevent.',
    },
    tests: { present: false, refs: [] },
    lineage: [
      {
        id: 'g3',
        agent: 'Cursor',
        prompt: 'Store the device binding when a biometric is enrolled',
        at: '15 Aug · 11:22',
        kept: true,
      },
      {
        id: 'g3b',
        agent: 'Cursor',
        prompt: 'Add per-customer scoping to the binding key',
        at: '15 Aug · 11:40',
        kept: false,
        supersededBy: 'g3',
      },
    ],
  },
  {
    id: 'AC-4',
    given: 'a customer whose biometric has been revoked at OS level',
    when: 'they open the app',
    then: 'the enrolment is invalidated and they are asked to enrol again',
    status: 'missing',
    confidence: 0.89,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [],
  },
  {
    id: 'AC-5',
    given: 'three consecutive failed biometric attempts',
    when: 'the third attempt fails',
    then: 'biometric login is locked for the session and PIN is required',
    status: 'partial',
    confidence: 0.82,
    files: [
      {
        path: 'mobile/src/auth/BiometricGate.tsx',
        lines: 'L132–L168',
        change: 'behavioral',
        why: 'Counts failures and locks the prompt.',
      },
    ],
    drift: undefined,
    tests: { present: true, refs: ['BiometricGate.locks-after-three-failures'] },
    lineage: [
      {
        id: 'g5',
        agent: 'Claude Code',
        prompt: 'Lock biometric after three failed attempts within a session',
        at: '15 Aug · 16:03',
        kept: true,
      },
    ],
  },
  {
    id: 'AC-6',
    given: 'an enrolled customer',
    when: 'they enrol on a second device',
    then: 'both devices remain valid and are listed in security settings',
    status: 'missing',
    confidence: 0.9,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [
      {
        id: 'g6',
        agent: 'Cursor',
        prompt: 'List enrolled devices in security settings',
        at: '15 Aug · 17:31',
        kept: false,
        supersededBy: 'discarded — no surviving change set',
      },
    ],
  },
  {
    id: 'AC-7',
    given: 'a session older than the configured timeout',
    when: 'the customer returns to the app',
    then: 'biometric re-authentication is required before any account action',
    status: 'drifted',
    confidence: 0.63,
    files: [
      {
        path: 'services/auth/src/session.ts',
        lines: 'L88–L120',
        change: 'behavioral',
      },
    ],
    drift: {
      expected: 'Re-authentication after the configured timeout (security policy: 15 minutes).',
      realized: 'Re-authentication after 30 minutes, read from application configuration.',
      explanation:
        'Two sources disagreed on the timeout and the code took the application value. This is the unresolved conflict Spec AI carried forward, now realized in code.',
    },
    tests: { present: true, refs: ['session.requires-reauth-after-timeout'] },
    lineage: [
      {
        id: 'g7',
        agent: 'Claude Code',
        prompt: 'Require re-auth when the session has expired',
        at: '16 Aug · 09:12',
        kept: true,
      },
    ],
  },
  {
    id: 'AC-8',
    given: 'any biometric enrolment or revocation',
    when: 'it completes',
    then: 'an audit event is written with the customer, device and outcome',
    status: 'covered',
    confidence: 0.88,
    files: [
      {
        path: 'services/device/src/audit.ts',
        lines: 'L12–L47',
        change: 'behavioral',
      },
    ],
    tests: { present: true, refs: ['audit.writes-enrolment-event'] },
    lineage: [
      {
        id: 'g8',
        agent: 'Claude Code',
        prompt: 'Write an audit event on enrolment and revocation',
        at: '16 Aug · 10:44',
        kept: true,
      },
    ],
  },
  {
    id: 'AC-9',
    given: 'a customer on an unsupported device',
    when: 'they reach the login screen',
    then: 'no biometric option is shown and no enrolment prompt appears',
    status: 'covered',
    confidence: 0.86,
    files: [
      {
        path: 'mobile/src/auth/capability.ts',
        lines: 'L5–L38',
        change: 'behavioral',
      },
    ],
    tests: { present: true, refs: ['capability.hides-biometric-when-unsupported'] },
    lineage: [
      {
        id: 'g9',
        agent: 'VS Code',
        prompt: 'Hide the biometric option when the device cannot support it',
        at: '16 Aug · 11:20',
        kept: true,
      },
    ],
  },
];

const recoveryCriteria: Criterion[] = [
  {
    id: 'AC-1',
    given: 'a customer who has forgotten their PIN',
    when: 'they start recovery from the login screen',
    then: 'they are identified by biometric before any reset is offered',
    status: 'covered',
    confidence: 0.9,
    files: [
      { path: 'mobile/src/recovery/RecoveryStart.tsx', lines: 'L22–L74', change: 'behavioral' },
    ],
    tests: { present: true, refs: ['RecoveryStart.identifies-by-biometric'] },
    lineage: [
      {
        id: 'r1',
        agent: 'Claude Code',
        prompt: 'Gate PIN recovery behind biometric identification',
        at: '17 Aug · 09:05',
        kept: true,
      },
    ],
  },
  {
    id: 'AC-2',
    given: 'a customer with no biometric enrolled',
    when: 'they start recovery',
    then: 'they are routed to assisted recovery rather than being blocked',
    status: 'missing',
    confidence: 0.87,
    files: [],
    tests: { present: false, refs: [] },
    lineage: [],
  },
  {
    id: 'AC-3',
    given: 'a completed recovery',
    when: 'the new PIN is set',
    then: 'existing biometric enrolments on other devices are left intact',
    status: 'partial',
    confidence: 0.79,
    files: [
      { path: 'services/auth/src/recovery.ts', lines: 'L44–L88', change: 'behavioral' },
      { path: 'services/device/src/binding.ts', lines: 'L141–L149', change: 'cosmetic' },
    ],
    tests: { present: false, refs: [] },
    lineage: [
      {
        id: 'r3',
        agent: 'Cursor',
        prompt: 'Keep other device enrolments when a PIN is reset',
        at: '17 Aug · 14:18',
        kept: true,
      },
      {
        id: 'r3b',
        agent: 'Cursor',
        prompt: 'Reset all enrolments on PIN change',
        at: '17 Aug · 13:52',
        kept: false,
        supersededBy: 'r3',
      },
    ],
  },
];

export const REVIEW_TARGETS: ReviewTarget[] = [
  {
    ticket: 'FMB2-418',
    title: 'Enrol a device for biometric login',
    repo: 'mobile-banking',
    branch: 'feat/biometric-enrolment',
    pr: 'PR #2841',
    author: 'Sarah Johnson',
    claimed: 'Done',
    criteria: enrolmentCriteria,
    intakeNote: 'Structured criteria from SpecAI · Given/When/Then · 9 criteria',
  },
  {
    ticket: 'FMB2-423',
    title: 'PIN recovery for biometric customers',
    repo: 'mobile-banking',
    branch: 'feat/recovery-biometric',
    pr: 'PR #2856',
    author: 'Daniel Okafor',
    claimed: 'In review',
    criteria: recoveryCriteria,
    intakeNote: 'Structured criteria from SpecAI · Given/When/Then · 3 criteria',
  },
];

// ───────────────────────────── Dashboard fixture ─────────────────────────────

export const TICKET_ROLLUPS: TicketRollup[] = [
  {
    key: 'FMB2-418',
    title: 'Enrol a device for biometric login',
    owner: 'Sarah Johnson',
    claimed: 'Done',
    total: 9,
    covered: 4,
    partial: 1,
    drifted: 2,
    missing: 2,
  },
  {
    key: 'FMB2-402',
    title: 'Session timeout alignment across services',
    owner: 'Arjun Mehta',
    claimed: 'Done',
    total: 5,
    covered: 3,
    partial: 0,
    drifted: 2,
    missing: 0,
  },
  {
    key: 'FMB2-423',
    title: 'PIN recovery for biometric customers',
    owner: 'Daniel Okafor',
    claimed: 'In review',
    total: 3,
    covered: 1,
    partial: 1,
    drifted: 0,
    missing: 1,
  },
  {
    key: 'FMB2-388',
    title: 'Device registry read model',
    owner: 'Priya Nair',
    claimed: 'Done',
    total: 6,
    covered: 6,
    partial: 0,
    drifted: 0,
    missing: 0,
  },
  {
    key: 'FMB2-431',
    title: 'Customer profile merge on re-enrolment',
    owner: 'Sarah Johnson',
    claimed: 'Done',
    total: 4,
    covered: 1,
    partial: 1,
    drifted: 0,
    missing: 2,
  },
  {
    key: 'FMB2-440',
    title: 'Audit trail for security events',
    owner: 'Priya Nair',
    claimed: 'In progress',
    total: 4,
    covered: 2,
    partial: 0,
    drifted: 0,
    missing: 2,
  },
  {
    key: 'FMB2-377',
    title: 'Remove legacy PIN-only login path',
    owner: 'Daniel Okafor',
    claimed: 'Done',
    total: 3,
    covered: 3,
    partial: 0,
    drifted: 0,
    missing: 0,
  },
  {
    key: 'FMB2-445',
    title: 'Biometric prompt copy and accessibility',
    owner: 'Maya Kapoor',
    claimed: 'Done',
    total: 5,
    covered: 4,
    partial: 0,
    drifted: 0,
    missing: 1,
  },
];

export const THRASH: ThrashRow[] = [
  {
    criterionId: 'AC-3',
    ticket: 'FMB2-418',
    text: 'Device binding is scoped per customer, not per device',
    attempts: 11,
    discarded: 9,
    days: 4,
  },
  {
    criterionId: 'AC-2',
    ticket: 'FMB2-402',
    text: 'Session timeout matches the security policy',
    attempts: 8,
    discarded: 6,
    days: 5,
  },
  {
    criterionId: 'AC-1',
    ticket: 'FMB2-431',
    text: 'Profiles merge without losing the earlier enrolment',
    attempts: 7,
    discarded: 5,
    days: 3,
  },
  {
    criterionId: 'AC-3',
    ticket: 'FMB2-423',
    text: 'Other device enrolments survive a PIN reset',
    attempts: 5,
    discarded: 3,
    days: 2,
  },
  {
    criterionId: 'AC-6',
    ticket: 'FMB2-418',
    text: 'Multiple devices remain valid and are listed in settings',
    attempts: 4,
    discarded: 4,
    days: 2,
  },
];

export const UNTRACKED: UntrackedChange[] = [
  {
    repo: 'mobile-banking',
    commit: '4f2ac91',
    author: 'Daniel Okafor',
    summary: 'Hotfix: null guard on the enrolment response',
    files: 2,
    at: '16 Aug · 22:14',
    policy: 'flag',
  },
  {
    repo: 'services/auth',
    commit: 'ba07e3d',
    author: 'Cursor (agent)',
    summary: 'Refactor session helpers, extract token parser',
    files: 9,
    at: '16 Aug · 15:02',
    policy: 'auto-ticket',
  },
  {
    repo: 'services/device',
    commit: '19cc7f0',
    author: 'Priya Nair',
    summary: 'Dependency bump and lockfile',
    files: 3,
    at: '15 Aug · 08:47',
    policy: 'tolerate',
  },
  {
    repo: 'mobile-banking',
    commit: 'e70b155',
    author: 'Claude Code (agent)',
    summary: 'AI cleanup: dead code in the legacy PIN path',
    files: 14,
    at: '14 Aug · 19:30',
    policy: 'flag',
  },
];

// ───────────────────────────── Derivations ─────────────────────────────

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
    return 'Every criterion maps to behavioural code.';
  }

  const parts: string[] = [];
  if (missing > 0) parts.push(`${missing} ${missing === 1 ? 'criterion has' : 'criteria have'} no code`);
  if (drifted > 0) parts.push(`${drifted} drifted from what was written`);
  if (partial > 0) parts.push(`${partial} only partly realized`);
  return parts.join(' · ');
};

/** A ticket is genuinely done only when nothing is missing or drifted. */
export const isGenuinelyDone = (t: TicketRollup): boolean =>
  t.missing === 0 && t.drifted === 0 && t.partial === 0;

export const claimedDone = (rows: TicketRollup[] = TICKET_ROLLUPS): TicketRollup[] =>
  rows.filter((t) => t.claimed === 'Done');

/**
 * The trust metric: of the work marked done, how much stands up. Two numbers
 * rather than one — a single ratio hides which side of it you are on.
 */
export const trustSplit = (rows: TicketRollup[] = TICKET_ROLLUPS) => {
  const done = claimedDone(rows);
  const genuine = done.filter(isGenuinelyDone);
  return {
    claimed: done.length,
    genuine: genuine.length,
    overstated: done.length - genuine.length,
    /** Criteria with no code at all, across everything marked done. */
    missingCriteria: done.reduce((n, t) => n + t.missing, 0),
  };
};

export const ticketsWithGaps = (rows: TicketRollup[] = TICKET_ROLLUPS): TicketRollup[] =>
  rows.filter((t) => t.missing > 0 || t.drifted > 0 || t.partial > 0);

export const UNTRACKED_POLICY_COPY: Record<
  UntrackedChange['policy'],
  { label: string; helper: string }
> = {
  flag: { label: 'Flagged', helper: 'Raised for a human to link or dismiss.' },
  'auto-ticket': { label: 'Auto-ticketed', helper: 'A lightweight ticket was opened for it.' },
  tolerate: { label: 'Tolerated', helper: 'Repo policy accepts this without a ticket.' },
};
