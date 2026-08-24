import {
  AgentToolCall,
  AgentTurn,
  BoardCard,
  SpecAiState,
  SpecIntake,
  SpecQuestion,
  SpecSource,
  UnderstandingBrief,
  UnderstandingSection,
} from '../types/specai';
import { DELIVERY_STORIES } from './deliveryData';

/**
 * What the sources actually say about this problem. Five pieces, not forty — the
 * workshop request restates the problem statement, the Jira ticket is folded into
 * the disagreement it causes, and the enrolment question lives in the question
 * queue. None of those earn space here.
 */
const finEdgeCards: BoardCard[] = [
  {
    id: 'card-obs-login',
    sourceId: 'src-arch',
    type: 'Context',
    state: 'Confirmed',
    title: 'Every session starts with a PIN, and a new device also needs an OTP.',
    content:
      'Observed end to end: Login → OTP verification → Dashboard. The OTP expires after 120 seconds. There is no biometric path in the running app.',
    evidenceClass: 'Source fact',
    provenance: {
      system: 'Live App',
      itemId: 'Login flow · test.finedge.example',
      indexedAt: '2026-07-29 21:05',
      excerpt: 'Screens observed: Login → OTP verification → Dashboard. OTP expires after 120s.',
    },
    relations: [],
    aiCreated: false,
  },
  {
    id: 'card-con-token',
    sourceId: 'src-arch',
    type: 'Context',
    state: 'Confirmed',
    title: 'Access tokens expire after 15 minutes, and web shares the same setting.',
    content:
      'Set in auth-service configuration. Changing it for mobile would change it for the web channel too.',
    evidenceClass: 'Source fact',
    provenance: {
      system: 'Code',
      itemId: 'auth-service · application.yml',
      deepLink: 'https://github.example/auth-service/blob/main/application.yml',
      indexedAt: '2026-07-29 23:12',
      excerpt: 'security.jwt.access-token-ttl: 15m',
    },
    relations: [{ toCardId: 'card-seed-bio', kind: 'Depends on' }],
    aiCreated: false,
  },
  {
    id: 'card-con-oauth',
    sourceId: 'src-confluence',
    type: 'Context',
    state: 'Confirmed',
    title: 'Every customer-facing channel must federate through the central OAuth gateway.',
    content: 'No new identity provider is available to this project.',
    evidenceClass: 'Source fact',
    provenance: {
      system: 'Confluence',
      itemId: 'MOB · Architecture standards',
      indexedAt: '2026-07-28 17:40',
      excerpt: 'All customer-facing channels must federate through the central OAuth gateway.',
    },
    relations: [],
    aiCreated: false,
  },
  {
    id: 'card-dec-fallback',
    sourceId: 'src-zoom',
    type: 'Context',
    state: 'Confirmed',
    title: 'Three failed biometric attempts fall back to PIN and raise a security event.',
    content: 'Agreed in the security review. The failure sequence is logged, not just the outcome.',
    evidenceClass: 'Source fact',
    provenance: {
      system: 'Meetings',
      itemId: 'Security review · 24 Jul 2026',
      indexedAt: '2026-07-25 10:02',
      excerpt: 'Agreed: three strikes, then PIN. Log the failure sequence as a security event.',
    },
    relations: [{ toCardId: 'card-seed-bio', kind: 'Supports' }],
    aiCreated: false,
  },
  {
    id: 'card-conflict-priority',
    type: 'Disagreement',
    state: 'Flagged',
    title: 'Two sources disagree on when biometric login is needed.',
    content: 'The backlog phases it into 2.1. The discovery call treats it as needed at launch.',
    evidenceClass: 'Source fact',
    conflict: {
      claimA: 'Biometric login is planned for Phase 2 and marked P1.',
      claimASource: 'Jira',
      claimB: 'Biometric login is required for the Q4 2026 launch.',
      claimBSource: 'Zoom Scripts',
      observedState: 'The test application does not support biometric authentication at all.',
    },
    relations: [],
    aiCreated: true,
    rationale: 'Compared the priority field on FMB2-142 against launch language in the call.',
  },
  {
    id: 'card-seed-bio',
    type: 'Requirement seed',
    state: 'Requirement seed',
    title: 'Returning customer can authenticate using registered device biometrics',
    content:
      'Actor: returning retail customer. Need: authenticate with device biometrics. Value: fewer PIN-related drop-offs.',
    evidenceClass: 'User decision',
    confidence: 0.91,
    relations: [
      { toCardId: 'card-dec-fallback', kind: 'Supports' },
      { toCardId: 'card-con-token', kind: 'Depends on' },
    ],
    aiCreated: false,
  },
];

const finEdgeUnderstanding: UnderstandingSection[] = [
  {
    key: 'objective',
    body: 'Reduce login friction for returning retail-banking customers while preserving device and account security.',
    versions: 3,
    supportingCardIds: ['card-obs-login'],
  },
  {
    key: 'primaryUsers',
    body: 'Existing retail customer · newly registered customer · customer-support agent · fraud analyst.',
    versions: 2,
    supportingCardIds: [],
  },
  {
    key: 'currentState',
    body: 'PIN login is always required. OTP is required on new devices. Session expires after 15 minutes.',
    versions: 2,
    supportingCardIds: ['card-obs-login', 'card-con-token'],
  },
  {
    key: 'proposedState',
    body: 'Registered customers may use device biometrics, with PIN fallback and risk-based step-up authentication.',
    versions: 4,
    supportingCardIds: ['card-seed-bio', 'card-dec-fallback'],
  },
  {
    key: 'inScope',
    body: 'Device registration · biometric login · PIN fallback · token handling · audit events · supported-device messaging.',
    versions: 2,
    supportingCardIds: ['card-seed-bio'],
  },
  {
    key: 'outOfScope',
    body: 'Voice biometrics · desktop biometric login · business-banking users · third-party identity providers.',
    versions: 1,
    supportingCardIds: [],
  },
  {
    key: 'constraints',
    body: 'Existing OAuth gateway · RBI-aligned audit retention · native iOS and Android biometric APIs.',
    versions: 2,
    supportingCardIds: ['card-con-oauth', 'card-con-token'],
  },
  {
    key: 'assumptions',
    body: 'Device biometric enrollment is managed by the operating system; no biometric template is stored by FinEdge.',
    versions: 1,
    supportingCardIds: [],
  },
  {
    key: 'openQuestions',
    body: 'Maximum registered devices per customer · policy for rooted or jailbroken devices · offline behavior.',
    versions: 1,
    supportingCardIds: [],
  },
];

/**
 * Reading v1, produced before the whiteboard photo and the stand-up recording
 * arrived — hence stale. Re-running it is the demonstration: the new image is
 * folded in, and the failed audio becomes an acknowledged hole rather than a
 * silence.
 */
const finEdgeBrief: UnderstandingBrief = {
  version: 1,
  summary:
    'This project exists because returning customers abandon login when a PIN is demanded every single time. The goal is biometric login for customers who have already onboarded, without weakening device security or breaking the shared OAuth gateway.\n\nI read 4 sources against that — Jira, Confluence, the architecture files, and the Zoom scripts — and kept 5 pieces of context. The rest repeats the problem statement, corroborates something already there, or does not bear on it, so it stayed in the source.\n\nWhat is firm: four things are stated outright by a source — the PIN-then-OTP journey, the fifteen-minute token expiry shared with web, the mandatory central gateway, and the three-strikes fallback agreed in security review. Three more have been settled with me. Those are safe to build on.\n\nWhat is not firm: three things are my assumptions rather than anything a source states, and there is one place where your sources actively disagree — Jira phases biometrics into 2.1 while the discovery call treats it as needed at launch. That disagreement is listed in the brief and holds the stage gate.\n\nThe architecture questions matter most. An unanswered “where does this live?” propagates into every artifact generated after this stage, so it is cheapest to settle here. Four are still open.',
  generatedFrom: {
    problemStatement:
      'Returning customers abandon login because a PIN is demanded every single time. We want biometric login for customers who have already onboarded, without weakening device security or breaking the shared OAuth gateway.',
    sourceIds: ['src-jira', 'src-confluence', 'src-arch', 'src-zoom'],
  },
  bands: {
    understood: [
      {
        id: 'brief-v1-1',
        text: 'The ask, as you stated it: returning customers abandon login because a PIN is demanded every single time, and biometric login should serve customers who have already onboarded.',
        evidenceClass: 'User decision',
        sourceIds: [],
        sourceSummary: 'No source — stated by you',
      },
      {
        id: 'brief-v1-2',
        text: 'The backlog already tracks work in this area (184 selected items), so this is not starting from nothing.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-jira'],
        sourceSummary: 'Jira',
      },
      {
        id: 'brief-v1-3',
        text: 'Stakeholders described the intent directly in a recorded conversation, so the motivation is first-hand rather than relayed.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-zoom'],
        sourceSummary: 'Zoom Scripts',
      },
      {
        id: 'brief-v1-4',
        text: 'The current journey has been observed in the running application: PIN, then OTP on an unrecognised device, then the dashboard.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-arch'],
        sourceSummary: 'Architecture files',
      },
      {
        id: 'brief-v1-5',
        text: 'The existing implementation is indexed (customer-auth-service), so current structure is fact and not assumption — including a 15-minute access-token expiry shared with the web channel.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-arch'],
        sourceSummary: 'Architecture files',
      },
      {
        id: 'brief-v1-6',
        text: 'Platform standards are indexed and binding: every customer-facing channel federates through the central OAuth gateway, so no new identity provider is available to you.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-confluence'],
        sourceSummary: 'Confluence',
      },
    ],
    decided: [
      {
        id: 'brief-v1-d1',
        text:
          'Out of scope for this release — voice biometrics, desktop biometric login, business-banking users, and third-party identity providers are all excluded.',
        evidenceClass: 'User decision',
        sourceIds: [],
        sourceSummary: 'Settled with the agent',
      },
      {
        id: 'brief-v1-d2',
        text:
          'A device that cannot support biometrics simply hides the option and keeps PIN available. No degraded messaging.',
        evidenceClass: 'User decision',
        sourceIds: [],
        sourceSummary: 'Settled with the agent',
      },
      {
        id: 'brief-v1-d3',
        text:
          'Assuming the existing fifteen-minute token expiry holds. Biometric re-authentication issues a fresh token rather than extending one.',
        evidenceClass: 'AI assumption',
        sourceIds: [],
        sourceSummary: 'Assumed with the agent',
      },
    ],
    inferring: [
      {
        id: 'brief-v1-7',
        text: 'Priority looks contested: the backlog phases biometric login into 2.1 while the conversation treats it as launch-critical. I am reading the conversation as more current.',
        evidenceClass: 'AI assumption',
        sourceIds: ['src-jira', 'src-zoom'],
        sourceSummary: 'Jira · Zoom Scripts',
      },
      {
        id: 'brief-v1-8',
        text: 'Nothing states the target design, so I am assuming this extends customer-auth-service rather than introducing a separate enrolment service.',
        evidenceClass: 'AI assumption',
        sourceIds: ['src-arch'],
        sourceSummary: 'Architecture files',
      },
      {
        id: 'brief-v1-9',
        text: 'Device registration appears to be a precondition for biometrics, but that is my reading of the device-bound rule in the standards page rather than anything stated.',
        evidenceClass: 'AI assumption',
        sourceIds: ['src-confluence', 'src-arch'],
        sourceSummary: 'Confluence · Architecture files',
      },
    ],
    cannotTell: [
      {
        id: 'brief-v1-10',
        text: 'What the intended experience is — the flows channel is connected but no design covers the biometric prompt itself.',
        evidenceClass: 'AI assumption',
        sourceIds: [],
        sourceSummary: 'No source',
      },
      {
        id: 'brief-v1-11',
        text: 'What the acceptance bar is — no test plan or QA source is connected, so success stays a matter of opinion.',
        evidenceClass: 'AI assumption',
        sourceIds: [],
        sourceSummary: 'No source',
      },
      {
        id: 'brief-v1-12',
        text: 'How many devices one customer may register, and what happens on a rooted or jailbroken device.',
        evidenceClass: 'AI assumption',
        sourceIds: [],
        sourceSummary: 'No source',
      },
    ],
  },
  stale: true,
  staleReason: 'The architecture files were re-indexed after this reading.',
};

/**
 * The queue as it stands: one product question already answered, the
 * architecture ones still open. Those open ones are what hold the stage gate,
 * alongside the unresolved priority conflict.
 */
const finEdgeQuestions: SpecQuestion[] = [
  {
    id: 'q-v1-1',
    track: 'Product',
    text: 'Is authentication required for this release, or is the backlog’s phasing correct?',
    rationale:
      'The backlog and the recorded conversation disagree, and nothing indexed breaks the tie.',
    owner: 'Maya Kapoor',
    status: 'Open',
  },
  {
    id: 'q-v1-2',
    track: 'Product',
    text: 'What is explicitly out of scope for this release?',
    rationale: 'No source draws the outer edge, so scope creep has nothing to push against.',
    owner: 'Maya Kapoor',
    status: 'Answered',
    answer:
      'Voice biometrics, desktop biometric login, business-banking users, and third-party identity providers are all out.',
  },
  {
    id: 'q-v1-3',
    track: 'Product',
    text: 'What happens to a customer whose device cannot support the new method?',
    rationale: 'Standard unknown for authentication work; no indexed source answers it.',
    owner: 'Maya Kapoor',
    status: 'Answered',
    answer: 'The biometric option is hidden and PIN remains available. No degraded messaging.',
  },
  {
    id: 'q-v1-9',
    track: 'Architecture',
    text: 'Must a device be registered before biometrics can be enabled on it?',
    rationale: 'No source states the enrolment precondition either way.',
    owner: 'Arjun Mehta',
    status: 'Open',
  },
  {
    id: 'q-v1-4',
    track: 'Architecture',
    text: 'Does this extend customer-auth-service, or land in a new service?',
    rationale: 'The repository is indexed but nothing states where new capability belongs.',
    owner: 'Arjun Mehta',
    status: 'Open',
  },
  {
    id: 'q-v1-5',
    track: 'Architecture',
    text: 'Where is the device or credential binding stored, and what revokes it when a device is lost?',
    rationale: 'Unresolved for authentication; no indexed source covers it.',
    owner: 'Arjun Mehta',
    status: 'Open',
  },
  {
    id: 'q-v1-6',
    track: 'Architecture',
    text: 'Does the session and token lifecycle change, or must the new path fit the existing expiry?',
    rationale:
      'The 15-minute access-token expiry is indexed and shared with web, so this is a decision rather than an unknown.',
    owner: 'Arjun Mehta',
    status: 'Assumed',
    answer:
      'Assuming the existing 15-minute expiry holds. Biometric re-auth issues a fresh token rather than extending one.',
  },
  {
    id: 'q-v1-7',
    track: 'Architecture',
    text: 'Which platform standards apply here, and does anything need a documented exception?',
    rationale: 'Standards are indexed and binding, but which clauses bite is not stated.',
    owner: 'Arjun Mehta',
    status: 'Open',
  },
  {
    id: 'q-v1-8',
    track: 'Architecture',
    text: 'What is the failure mode when the new path is unavailable?',
    rationale: 'Every source describes the happy path. None describes degradation.',
    owner: 'Arjun Mehta',
    status: 'Deferred',
    answer: 'Deferred to HLD — falls back to the existing PIN path, detail to follow.',
  },
];

/**
 * The opening read that produced the brief above — reconstructed from the
 * extracts rather than written out.
 *
 * This workspace arrives mid-flight, with a brief already in hand. A brief with
 * no visible retrieval behind it is exactly what the terminal exists to prevent,
 * so each tool line is derived from the provenance on the extract it produced:
 * the calls and the brief cannot describe different readings, because they are
 * built from the same records.
 */
const openingRead = (
  sources: SpecSource[],
  cards: BoardCard[],
  brief: UnderstandingBrief,
  questionCount: number
): AgentTurn => {
  const conflict = cards.find((c) => c.type === 'Disagreement');
  const conflictSources = conflict?.conflict
    ? [conflict.conflict.claimASource, conflict.conflict.claimBSource]
    : [];

  const calls: AgentToolCall[] = [
    {
      id: 'seed-call-0',
      name: 'list_sources',
      argument: 'project',
      status: 'ok',
      durationMs: 96,
      result: `${sources.length} readable, 0 still parsing, 0 failed.`,
    },
  ];

  sources.forEach((source, i) => {
    const extracts = cards.filter((c) => c.sourceId === source.id);
    /* A source can matter without yielding an extract of its own — the backlog's
       contribution here is one half of a disagreement. */
    const inConflict = conflictSources.some((name) => name.includes(source.name));

    calls.push({
      id: `seed-call-${i + 1}`,
      name: 'read_source',
      argument: source.name,
      sourceId: source.id,
      status: extracts.length > 0 || inConflict ? 'ok' : 'empty',
      durationMs: 210 + i * 137,
      result:
        extracts.length > 0
          ? `${extracts.length} passage${extracts.length === 1 ? '' : 's'} bearing on the statement.`
          : inConflict
          ? 'Phasing found, but it contradicts another source.'
          : 'Read. Nothing here bears on authentication.',
      excerpt: extracts[0]?.provenance?.excerpt,
    });
  });

  if (conflict?.conflict)
    calls.push({
      id: `seed-call-${sources.length + 1}`,
      name: 'compare_sources',
      argument: `${conflict.conflict.claimASource} ↔ ${conflict.conflict.claimBSource}`,
      status: 'ok',
      durationMs: 488,
      result: conflict.title,
      excerpt: `${conflict.conflict.claimA} / ${conflict.conflict.claimB}`,
    });

  calls.push({
    id: `seed-call-${sources.length + 2}`,
    name: 'check_coverage',
    argument: 'acceptance',
    status: 'empty',
    durationMs: 74,
    result: 'No source covers this.',
  });

  const kept = cards.filter((c) => c.type === 'Context').length;

  return {
    id: 'seed-turn-open',
    from: 'agent',
    text: `I read your statement against everything readable and kept only what bears on it. ${sources.length} sources read, ${kept} passages worth keeping — the quiet ones are listed above so you can see they were opened and had nothing to say about this. I raised ${questionCount} questions nothing indexed can answer, and one place where two sources contradict each other, which is a decision rather than a gap.`,
    toolCalls: calls,
    /* Tied to the brief this read produced, so the two can never disagree. */
    briefEffect: {
      version: brief.version,
      added: Object.values(brief.bands).reduce((n, lines) => n + lines.length, 0),
    },
  };
};

const finEdgeSources: SpecSource[] = [
  { id: 'src-jira', name: 'Jira', type: 'Jira', detail: '184 items', ingest: 'Indexed' },
  {
    id: 'src-confluence',
    name: 'Confluence',
    type: 'Confluence',
    detail: '16 pages',
    ingest: 'Indexed',
  },
  {
    id: 'src-arch',
    name: 'Architecture files',
    type: 'PDF',
    detail: '4 files',
    ingest: 'Indexed',
  },
  {
    id: 'src-zoom',
    name: 'Zoom Scripts',
    type: 'Transcript',
    detail: '3 transcripts',
    ingest: 'Indexed',
  },
];

const FIN_EDGE_STATEMENT =
  'Returning customers abandon login because a PIN is demanded every single time. We want biometric login for customers who have already onboarded, without weakening device security or breaking the shared OAuth gateway.';

/**
 * This workspace opens mid-flight, so its intake is already accepted — the
 * statement below is what everything in it was read against. A blank project
 * gets the intake screen instead, which is where a real project starts.
 */
const finEdgeIntake: SpecIntake = {
  raw: FIN_EDGE_STATEMENT,
  kind: 'Problem statement',
  kindReason: 'prose describing intent',
  conciseBrief: [
    FIN_EDGE_STATEMENT,
    'What I took from your input: subject — authentication.',
    'I am treating this as authentication work, which comes with its own set of decisions I will put to you rather than assume.',
  ].join('\n\n'),
  signals: [{ label: 'Subject', value: 'authentication' }],
  task: {
    title: 'Specify the authentication change',
    statement: FIN_EDGE_STATEMENT,
    steps: [
      'Read every indexed source against this statement and keep only what bears on it',
      'Report what is stated outright, what I am inferring, and what nothing covers',
      'Raise the authentication decisions that propagate into every downstream artifact',
      'Build the project brief from that, with a source on every line',
    ],
    outOfScope:
      'Anything no connected source speaks to — that becomes an open question rather than a requirement.',
  },
  needs: [],
  acceptedAt: '2026-07-28T09:12:00.000Z',
};

const finEdge: SpecAiState = {
  sessionId: 'sess-fmb2-auth',
  projectId: 'p-mobile-v2',
  title: 'Biometric login for returning customers',
  createdAt: '2026-07-28T09:12:00.000Z',
  updatedAt: '2026-08-24T16:40:00.000Z',
  specKey: 'FMB2',
  currentStage: 'knowledge',
  lockedStages: [],
  intake: finEdgeIntake,
  problemStatement: FIN_EDGE_STATEMENT,
  sources: finEdgeSources,
  brief: finEdgeBrief,
  transcript: [
    openingRead(
      finEdgeSources,
      finEdgeCards,
      finEdgeBrief,
      finEdgeQuestions.filter((q) => q.status === 'Open').length
    ),
  ],
  questions: finEdgeQuestions,
  cards: finEdgeCards,
  understanding: finEdgeUnderstanding,
  requirements: [
    {
      id: 'REQ-AUTH-012',
      title: 'Biometric authentication for registered devices',
      type: 'Functional',
      status: 'Confirmed',
      priority: 'P0',
      actor: 'Returning retail customer',
      need: 'Authenticate using device-supported biometrics',
      businessValue: 'Reduce median login time and PIN-related abandonment',
      preconditions: 'Customer is enrolled, device is registered, biometrics are available',
      mainBehavior:
        'App prompts for Face ID or Touch ID and exchanges a successful local assertion for a session token',
      fallback: 'After three failed attempts, prompt for PIN',
      acceptance: [
        {
          id: 'AC-1',
          given: 'a registered supported device',
          when: 'biometric verification succeeds',
          then: 'the customer is authenticated and reaches the dashboard',
        },
        {
          id: 'AC-2',
          given: 'three consecutive biometric failures',
          when: 'the customer retries',
          then: 'the app requires PIN authentication',
        },
        {
          id: 'AC-3',
          given: 'biometric capability is unavailable',
          when: 'the login screen opens',
          then: 'the biometric option is hidden and PIN remains available',
        },
        {
          id: 'AC-4',
          given: 'a device binding has been revoked',
          when: 'biometric login is attempted from that device',
          then: 'the attempt is refused and a security event is recorded',
        },
        {
          id: 'AC-5',
          given: 'a successful biometric login',
          when: 'the session token is issued',
          then: 'the token honours the existing 15-minute expiry',
        },
        {
          id: 'AC-6',
          given: 'a rooted or jailbroken device',
          when: 'the login screen opens',
          then: 'biometric login is not offered',
        },
      ],
      evidenceCardIds: ['card-obs-login', 'card-con-token', 'card-dec-fallback'],
      evidenceSummary: '3 extracts · 1 Jira issue · 1 meeting transcript · 1 code constraint',
      confidence: 0.91,
      owner: 'Maya Kapoor',
    },
    {
      id: 'SEC-REQ-008',
      title: 'Biometric failure lockout and security event',
      type: 'Security',
      status: 'Confirmed',
      priority: 'P0',
      actor: 'Fraud analyst',
      need: 'A recorded trail for repeated biometric failures',
      businessValue: 'Detect credential-stuffing attempts against a known device',
      preconditions: 'Biometric login is enabled for the device',
      mainBehavior:
        'Three consecutive failures force PIN authentication and emit a security event to the audit bus',
      acceptance: [
        {
          id: 'AC-1',
          given: 'three consecutive biometric failures',
          when: 'the third failure is recorded',
          then: 'a security event carrying the device identifier is published',
        },
      ],
      evidenceCardIds: ['card-dec-fallback'],
      evidenceSummary: '1 recorded decision · 1 security review',
      confidence: 0.88,
      owner: 'Arjun Mehta',
    },
  ],
  archMode: 'Brownfield',
  hasLegacyArchitecture: true,
  artifacts: [],
  modules: [],
  /* The backlog already in delivery. Stage 5 and the project delivery view read
     these same rows; locking the module map would hand over this very list. */
  stories: DELIVERY_STORIES.map((x) => ({ ...x })),
  jiraMapping: {
    epic: 'FMB2 · Authentication modernization',
    release: '2.1',
    sprint: 'Sprint 24',
    issueTypes: {
      'User story': 'Story',
      'Technical story': 'Task',
      'API story': 'Task',
      'Data story': 'Task',
      'Testing story': 'Test',
      'Migration story': 'Task',
      // Security story left unmapped on purpose, so the export-blocked state is live.
    },
  },
  sectionEditors: { proposedState: 'Arjun Mehta' },
  saveState: 'Saved',
};

/** A fresh workspace with nothing brought in yet. */
const blank: SpecAiState = {
  sessionId: 'sess-acp-1',
  projectId: 'p-acme-portal',
  title: 'Untitled specification',
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  specKey: 'ACP',
  currentStage: 'knowledge',
  lockedStages: [],
  intake: undefined,
  problemStatement: '',
  sources: [],
  transcript: [],
  questions: [],
  cards: [],
  understanding: (
    [
      'objective',
      'primaryUsers',
      'currentState',
      'proposedState',
      'inScope',
      'outOfScope',
      'constraints',
      'assumptions',
      'openQuestions',
    ] as const
  ).map((key) => ({ key, body: '', versions: 0, supportingCardIds: [] })),
  requirements: [],
  archMode: 'Greenfield',
  hasLegacyArchitecture: false,
  artifacts: [],
  modules: [],
  stories: [],
  jiraMapping: { epic: '', release: '', sprint: '', issueTypes: {} },
  sectionEditors: {},
  saveState: 'Saved',
};

/* ─────────────────────────── Other open sessions ───────────────────────────
 *
 * A project does not have one problem worth specifying, it has several, and they
 * are worked on at different times and get to different places. These two sit
 * beside the authentication spec on the same project so the Command Centre's
 * session list has something to be a list of — one barely started, one waiting on
 * decomposition. Both are read through the same derivations as the first, so the
 * phase and the progress on each row are worked out, not written down here.
 */

const CARD_FREEZE_STATEMENT =
  'Customers who lose a card have to call the contact centre to freeze it and order a replacement. Card operations want both self-serve in the app.';

const cardFreezeIntake: SpecIntake = {
  raw: CARD_FREEZE_STATEMENT,
  kind: 'Problem statement',
  kindReason: 'prose describing intent',
  conciseBrief: [
    CARD_FREEZE_STATEMENT,
    'What I took from your input: subject — card servicing.',
  ].join('\n\n'),
  signals: [{ label: 'Subject', value: 'card servicing' }],
  task: {
    title: 'Specify self-serve card freeze and replacement',
    statement: CARD_FREEZE_STATEMENT,
    steps: [
      'Read the card operations material against this statement',
      'Report what is stated outright and what nothing covers',
      'Raise the ownership question before any artifact is generated',
    ],
    outOfScope: 'Anything no connected source speaks to becomes an open question.',
  },
  needs: [],
  acceptedAt: '2026-08-19T11:05:00.000Z',
};

const cardFreeze: SpecAiState = {
  ...blank,
  sessionId: 'sess-fmb2-cardfreeze',
  projectId: 'p-mobile-v2',
  title: 'Self-serve card freeze and replacement',
  createdAt: '2026-08-19T11:05:00.000Z',
  updatedAt: '2026-08-22T14:20:00.000Z',
  specKey: 'FMB2',
  intake: cardFreezeIntake,
  problemStatement: CARD_FREEZE_STATEMENT,
  understanding: blank.understanding.map((s) => ({ ...s })),
  brief: {
    version: 1,
    summary:
      'Card loss is handled entirely by the contact centre today. The ask is to move freeze and replacement into the app without changing who is allowed to do either.',
    generatedFrom: {
      problemStatement: CARD_FREEZE_STATEMENT,
      sourceIds: [],
    },
    bands: {
      understood: [
        {
          id: 'cf-1',
          text: 'Freeze and replacement are both contact-centre operations today; nothing in the app touches card state.',
          evidenceClass: 'Source fact',
          sourceIds: [],
          sourceSummary: 'Card operations runbook',
        },
        {
          id: 'cf-2',
          text: 'The ask, as you stated it: both operations should be self-serve in the app.',
          evidenceClass: 'User decision',
          sourceIds: [],
          sourceSummary: 'No source — stated by you',
        },
      ],
      decided: [],
      inferring: [
        {
          id: 'cf-3',
          text: 'A freeze is assumed to be reversible by the customer who applied it, since no source says otherwise.',
          evidenceClass: 'AI assumption',
          sourceIds: [],
          sourceSummary: 'Assumption — nothing confirms this',
        },
      ],
      cannotTell: [
        {
          id: 'cf-4',
          text: 'Whether a replacement can be ordered to an address other than the one on file.',
          evidenceClass: 'AI assumption',
          sourceIds: [],
          sourceSummary: 'No source addresses delivery address',
        },
      ],
    },
    stale: false,
  },
  questions: [
    {
      id: 'q-cf-1',
      track: 'Product',
      text: 'Can a customer unfreeze a card themselves, or does that stay with the contact centre?',
      rationale: 'The runbook covers freezing and says nothing about the reverse.',
      owner: 'Maya Kapoor',
      status: 'Open',
    },
    {
      id: 'q-cf-2',
      track: 'Product',
      text: 'Does a replacement order need a delivery address confirmation step?',
      rationale: 'No source states whether the address on file can be overridden.',
      owner: 'Maya Kapoor',
      status: 'Open',
    },
    {
      id: 'q-cf-3',
      track: 'Architecture',
      text: 'Which system owns card state — the core banking platform or the card processor?',
      rationale: 'Both are referenced in the runbook and neither is named as the system of record.',
      owner: 'Arjun Mehta',
      status: 'Open',
    },
  ],
};

const STATEMENTS_STATEMENT =
  'Statement download takes upwards of forty seconds on older iOS devices and times out on anything over twelve months of history.';

const statementsIntake: SpecIntake = {
  raw: STATEMENTS_STATEMENT,
  kind: 'Problem statement',
  kindReason: 'prose describing observed behaviour',
  conciseBrief: [
    STATEMENTS_STATEMENT,
    'What I took from your input: subject — document delivery performance.',
  ].join('\n\n'),
  signals: [{ label: 'Subject', value: 'document delivery' }],
  task: {
    title: 'Specify the statement download change',
    statement: STATEMENTS_STATEMENT,
    steps: [
      'Read the architecture files against this statement',
      'Establish where rendering happens today and what bounds the payload',
      'Produce the design and the contract the change is built from',
    ],
    outOfScope: 'Statement content and formatting; only delivery is in scope.',
  },
  needs: [],
  acceptedAt: '2026-06-30T10:00:00.000Z',
};

const statements: SpecAiState = {
  ...blank,
  sessionId: 'sess-fmb2-statements',
  projectId: 'p-mobile-v2',
  title: 'Statement download performance',
  createdAt: '2026-06-30T10:00:00.000Z',
  updatedAt: '2026-08-25T09:15:00.000Z',
  specKey: 'FMB2',
  intake: statementsIntake,
  problemStatement: STATEMENTS_STATEMENT,
  /* The definition was finalized, which is what let the artifacts be generated. */
  lockedStages: ['knowledge'],
  currentStage: 'artifacts',
  archMode: 'Brownfield',
  hasLegacyArchitecture: true,
  understanding: blank.understanding.map((s) => ({ ...s })),
  brief: {
    version: 3,
    summary:
      'Statement generation is synchronous and renders the PDF on the device. The agreed direction is to render server-side and hand the app a signed URL, which removes the device from the critical path entirely.',
    generatedFrom: {
      problemStatement: STATEMENTS_STATEMENT,
      sourceIds: [],
    },
    bands: {
      understood: [
        {
          id: 'st-1',
          text: 'PDF rendering happens on the device, against a payload that is unbounded in size.',
          evidenceClass: 'Source fact',
          sourceIds: [],
          sourceSummary: 'Architecture files',
        },
        {
          id: 'st-2',
          text: 'The gateway times out at thirty seconds, which is what the twelve-month case is hitting.',
          evidenceClass: 'Source fact',
          sourceIds: [],
          sourceSummary: 'Architecture files',
        },
      ],
      decided: [
        {
          id: 'st-3',
          text: 'Rendering moves server-side; the app receives a signed URL with a fifteen-minute expiry.',
          evidenceClass: 'User decision',
          sourceIds: [],
          sourceSummary: 'Settled with you',
        },
        {
          id: 'st-4',
          text: 'Statements older than twenty-four months are served from the archive tier, asynchronously.',
          evidenceClass: 'User decision',
          sourceIds: [],
          sourceSummary: 'Settled with you',
        },
      ],
      inferring: [],
      cannotTell: [],
    },
    stale: false,
  },
  questions: [
    {
      id: 'q-st-1',
      track: 'Architecture',
      text: 'What expiry should the signed URL carry?',
      rationale: 'No source states a policy for time-limited document links.',
      owner: 'Arjun Mehta',
      status: 'Answered',
      answer: 'Fifteen minutes, matching the access-token expiry already in use.',
    },
  ],
  artifacts: [
    {
      id: 'art-st-design',
      group: 'Architecture',
      label: 'Solution design — server-side statement rendering',
      body: 'Rendering moves to a statement service behind the gateway. The app requests a document, receives a signed URL, and downloads outside the API path.',
      versions: 2,
      status: 'Approved',
      confidence: 'high',
      stale: false,
      reviewComments: 3,
      assignee: 'Arjun Mehta',
    },
    {
      id: 'art-st-contract',
      group: 'Contracts',
      label: 'API contract — GET /statements/{id}/document',
      body: 'Returns a signed URL and an expiry. 202 with a poll location for archive-tier documents.',
      versions: 1,
      status: 'Approved',
      confidence: 'high',
      stale: false,
      reviewComments: 1,
      assignee: 'Arjun Mehta',
    },
    {
      id: 'art-st-prd',
      group: 'Product',
      label: 'PRD — Statement download',
      body: 'Statements open in under five seconds for any period the customer can select, with archive periods acknowledged rather than silently slow.',
      versions: 2,
      status: 'Approved',
      confidence: 'high',
      stale: false,
      reviewComments: 5,
      assignee: 'Maya Kapoor',
    },
  ],
};

export const INITIAL_SPEC_AI: SpecAiState[] = [finEdge, cardFreeze, statements, blank];

/** Ids minted here are for lazily created rows; the seeded ones are written out. */
let sessionSeq = 0;

export const blankSpecAiState = (
  projectId: string,
  sessionId = `sess-${Date.now().toString(36)}${(++sessionSeq).toString(36)}`,
  title = 'Untitled specification'
): SpecAiState => {
  const now = new Date().toISOString();
  return {
    ...blank,
    sessionId,
    projectId,
    title,
    createdAt: now,
    updatedAt: now,
    specKey: projectId.replace(/^p-/, '').toUpperCase().slice(0, 4),
    understanding: blank.understanding.map((s) => ({ ...s })),
    cards: [],
    problemStatement: '',
    sources: [],
    brief: undefined,
    intake: undefined,
    transcript: [],
    questions: [],
    lockedStages: [],
    artifacts: [],
    modules: [],
    stories: [],
  };
};
