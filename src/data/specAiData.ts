import { DEFAULT_LANES } from './specai';
import {
  BoardCard,
  KnowledgeChannel,
  SpecAiState,
  SpecQuestion,
  UnderstandingBrief,
  UnderstandingSection,
} from '../types/specai';

/**
 * The eight knowledge domains in the context strip. Live App is deliberately
 * Partial — guided exploration is scoped in the first release.
 */
const finEdgeChannels = (): KnowledgeChannel[] => [
  {
    id: 'ch-jira',
    label: 'Jira',
    detail: '184 items',
    status: 'Ready',
    connectorId: 'conn-jira',
    itemsIndexed: 184,
    lastSync: '12 minutes ago',
    scope: 'Project FMB2 · Epics, Stories, Bugs · releases 2.0 and 2.1',
  },
  {
    id: 'ch-confluence',
    label: 'Confluence',
    detail: '16 pages',
    status: 'Ready',
    connectorId: 'conn-confluence',
    itemsIndexed: 16,
    lastSync: '1 hour ago',
    scope: 'MOB space · Product, Architecture, Security labels',
  },
  {
    id: 'ch-docs',
    label: 'Documents',
    detail: '4 files',
    status: 'Ready',
    itemsIndexed: 4,
    lastSync: 'Just now',
    scope: 'Project uploads',
  },
  {
    id: 'ch-meetings',
    label: 'Meetings',
    detail: '3 transcripts',
    status: 'Ready',
    itemsIndexed: 3,
    lastSync: '2 days ago',
    scope: 'Zoom transcript and product workshops',
  },
  {
    id: 'ch-app',
    label: 'Live App',
    detail: 'exploring',
    status: 'Partial',
    itemsIndexed: 12,
    lastSync: 'in progress',
    scope: 'Test environment · Login and Profile flows explored',
  },
  {
    id: 'ch-code',
    label: 'Code',
    detail: '3 repos',
    status: 'Ready',
    connectorId: 'conn-github',
    itemsIndexed: 96,
    lastSync: '18 minutes ago',
    scope: 'mobile-app, auth-service, notification-service',
  },
  {
    id: 'ch-apis',
    label: 'APIs',
    detail: '27 endpoints',
    status: 'Ready',
    itemsIndexed: 27,
    lastSync: '18 minutes ago',
    scope: 'Auth and customer-profile OpenAPI specs',
  },
  {
    id: 'ch-flows',
    label: 'Flows',
    detail: '5 captured',
    status: 'Ready',
    connectorId: 'conn-figma',
    itemsIndexed: 5,
    lastSync: '3 hours ago',
    scope: 'Imported Figma and observed app journeys',
  },
];

const emptyChannels = (): KnowledgeChannel[] => [
  {
    id: 'ch-jira',
    label: 'Jira',
    detail: 'not connected',
    status: 'Not connected',
    connectorId: 'conn-jira',
    itemsIndexed: 0,
    lastSync: 'Never',
    scope: '—',
  },
  {
    id: 'ch-docs',
    label: 'Documents',
    detail: 'none yet',
    status: 'Not connected',
    itemsIndexed: 0,
    lastSync: 'Never',
    scope: '—',
  },
];

/**
 * What the sources actually say about this problem. Five pieces, not forty — the
 * workshop request restates the problem statement, the Jira ticket is folded into
 * the disagreement it causes, and the enrolment question lives in the question
 * queue. None of those earn space here.
 */
const finEdgeCards: BoardCard[] = [
  {
    id: 'card-obs-login',
    sourceId: 'src-app',
    x: 24,
    y: 24,
    laneId: 'lane-current',
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
    sourceId: 'src-repo',
    x: 272,
    y: 40,
    laneId: 'lane-current',
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
    sourceId: 'src-standards',
    x: 520,
    y: 24,
    laneId: 'lane-current',
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
    sourceId: 'src-call',
    x: 24,
    y: 264,
    laneId: 'lane-decisions',
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
    x: 272,
    y: 288,
    laneId: 'lane-decisions',
    type: 'Disagreement',
    state: 'Flagged',
    title: 'Two sources disagree on when biometric login is needed.',
    content: 'The backlog phases it into 2.1. The discovery call treats it as needed at launch.',
    evidenceClass: 'Source fact',
    conflict: {
      claimA: 'Biometric login is planned for Phase 2 and marked P1.',
      claimASource: 'MBV2 Jira · FMB2-142',
      claimB: 'Biometric login is required for the Q4 2026 launch.',
      claimBSource: 'Product discovery call · 18 Jul 2026',
      observedState: 'The test application does not support biometric authentication at all.',
    },
    relations: [],
    aiCreated: true,
    rationale: 'Compared the priority field on FMB2-142 against launch language in the call.',
  },
  {
    id: 'card-seed-bio',
    x: 520,
    y: 268,
    laneId: 'lane-proposed',
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
  generatedFrom: {
    problemStatement:
      'Returning customers abandon login because a PIN is demanded every single time. We want biometric login for customers who have already onboarded, without weakening device security or breaking the shared OAuth gateway.',
    sourceIds: ['src-jira', 'src-standards', 'src-prd', 'src-call', 'src-app', 'src-repo', 'src-legacy'],
    channelIds: ['ch-jira', 'ch-confluence', 'ch-docs', 'ch-meetings', 'ch-code', 'ch-apis', 'ch-flows'],
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
        sourceSummary: 'MBV2 Jira',
      },
      {
        id: 'brief-v1-3',
        text: 'Stakeholders described the intent directly in a recorded conversation, so the motivation is first-hand rather than relayed.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-call'],
        sourceSummary: 'Product discovery call',
      },
      {
        id: 'brief-v1-4',
        text: 'The current journey has been observed in the running application: PIN, then OTP on an unrecognised device, then the dashboard.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-app'],
        sourceSummary: 'Test application',
      },
      {
        id: 'brief-v1-5',
        text: 'The existing implementation is indexed (customer-auth-service), so current structure is fact and not assumption — including a 15-minute access-token expiry shared with the web channel.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-repo'],
        sourceSummary: 'customer-auth-service',
      },
      {
        id: 'brief-v1-6',
        text: 'Platform standards are indexed and binding: every customer-facing channel federates through the central OAuth gateway, so no new identity provider is available to you.',
        evidenceClass: 'Source fact',
        sourceIds: ['src-standards'],
        sourceSummary: 'Platform Standards',
      },
    ],
    inferring: [
      {
        id: 'brief-v1-7',
        text: 'Priority looks contested: the backlog phases biometric login into 2.1 while the conversation treats it as launch-critical. I am reading the conversation as more current.',
        evidenceClass: 'AI assumption',
        sourceIds: ['src-jira', 'src-call'],
        sourceSummary: 'MBV2 Jira · Product discovery call',
      },
      {
        id: 'brief-v1-8',
        text: 'Nothing states the target design, so I am assuming this extends customer-auth-service rather than introducing a separate enrolment service.',
        evidenceClass: 'AI assumption',
        sourceIds: ['src-repo'],
        sourceSummary: 'customer-auth-service',
      },
      {
        id: 'brief-v1-9',
        text: 'Device registration appears to be a precondition for biometrics, but that is my reading of the device-bound rule in the standards page rather than anything stated.',
        evidenceClass: 'AI assumption',
        sourceIds: ['src-standards', 'src-app'],
        sourceSummary: 'Platform Standards · Test application',
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
  staleReason: '2 sources arrived after this reading — including one that failed to ingest.',
};

/**
 * The queue as it stands: one product question already answered, the
 * architecture ones still open. Those open ones are what hold the stage gate,
 * alongside the unresolved priority conflict on the board.
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

const finEdge: SpecAiState = {
  projectId: 'p-mobile-v2',
  specKey: 'FMB2',
  currentStage: 'knowledge',
  lockedStages: [],
  problemStatement:
    'Returning customers abandon login because a PIN is demanded every single time. We want biometric login for customers who have already onboarded, without weakening device security or breaking the shared OAuth gateway.',
  sources: [
    {
      id: 'src-jira',
      name: 'MBV2 Jira',
      type: 'Jira',
      detail: '184 selected items',
      ingest: 'Indexed',
    },
    {
      id: 'src-standards',
      name: 'Platform Standards',
      type: 'Confluence',
      detail: 'Confluence · 16 pages',
      ingest: 'Indexed',
    },
    {
      id: 'src-prd',
      name: 'Mobile Banking PRD',
      type: 'DOCX',
      detail: 'DOCX · indexed',
      ingest: 'Indexed',
    },
    {
      id: 'src-call',
      name: 'Product discovery call',
      type: 'Transcript',
      detail: 'Zoom transcript',
      ingest: 'Indexed',
    },
    {
      id: 'src-app',
      name: 'Test application',
      type: 'App',
      detail: '12 screens explored',
      ingest: 'Indexed',
    },
    {
      id: 'src-repo',
      name: 'customer-auth-service',
      type: 'Repository',
      detail: 'Repository · indexed',
      ingest: 'Indexed',
    },
    {
      id: 'src-legacy',
      name: 'Legacy authentication architecture',
      type: 'PDF',
      detail: 'PDF · 24 pages',
      ingest: 'Indexed',
    },
    {
      id: 'src-wireframes',
      name: 'Login wireframes (photo of whiteboard)',
      type: 'Image',
      detail: 'Image · 3 screens',
      ingest: 'Indexed',
      ingestNote: 'Text extracted from image',
    },
    {
      id: 'src-standup',
      name: 'Security stand-up recording',
      type: 'Audio',
      detail: 'Audio · 22 minutes',
      ingest: 'Failed',
      ingestNote: 'no speech track found',
    },
  ],
  brief: finEdgeBrief,
  questions: finEdgeQuestions,
  channels: finEdgeChannels(),
  lanes: DEFAULT_LANES,
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
          given: 'a registered supported device',
          when: 'biometric verification succeeds',
          then: 'the customer is authenticated and reaches the dashboard',
        },
        {
          given: 'three consecutive biometric failures',
          when: 'the customer retries',
          then: 'the app requires PIN authentication',
        },
        {
          given: 'biometric capability is unavailable',
          when: 'the login screen opens',
          then: 'the biometric option is hidden and PIN remains available',
        },
        {
          given: 'a device binding has been revoked',
          when: 'biometric login is attempted from that device',
          then: 'the attempt is refused and a security event is recorded',
        },
        {
          given: 'a successful biometric login',
          when: 'the session token is issued',
          then: 'the token honours the existing 15-minute expiry',
        },
        {
          given: 'a rooted or jailbroken device',
          when: 'the login screen opens',
          then: 'biometric login is not offered',
        },
      ],
      evidenceCardIds: ['card-obs-login', 'card-con-token', 'card-dec-fallback'],
      evidenceSummary: '3 board cards · 1 Jira issue · 1 meeting transcript · 1 code constraint',
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
          given: 'three consecutive biometric failures',
          when: 'the third failure is recorded',
          then: 'a security event carrying the device identifier is published',
        },
      ],
      evidenceCardIds: ['card-dec-fallback'],
      evidenceSummary: '1 board decision · 1 security review',
      confidence: 0.88,
      owner: 'Arjun Mehta',
    },
  ],
  archMode: 'Brownfield',
  hasLegacyArchitecture: true,
  artifacts: [],
  modules: [],
  stories: [],
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
  projectId: 'p-acme-portal',
  specKey: 'ACP',
  currentStage: 'knowledge',
  lockedStages: [],
  problemStatement: '',
  sources: [],
  questions: [],
  channels: emptyChannels(),
  lanes: DEFAULT_LANES,
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

export const INITIAL_SPEC_AI: SpecAiState[] = [finEdge, blank];

export const blankSpecAiState = (projectId: string): SpecAiState => ({
  ...blank,
  projectId,
  specKey: projectId.replace(/^p-/, '').toUpperCase().slice(0, 4),
  understanding: blank.understanding.map((s) => ({ ...s })),
  lanes: DEFAULT_LANES.map((l) => ({ ...l })),
  cards: [],
  problemStatement: '',
  sources: [],
  brief: undefined,
  questions: [],
});
