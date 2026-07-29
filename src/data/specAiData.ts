import { DEFAULT_LANES } from './specai';
import {
  BoardCard,
  KnowledgeChannel,
  SpecAiState,
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
    detail: '184 issues',
    status: 'Ready',
    connectorId: 'conn-jira',
    itemsIndexed: 184,
    lastSync: '12 minutes ago',
    scope: 'Project FMB2 · Epics, Stories, Bugs · releases 2.0 and 2.1',
  },
  {
    id: 'ch-confluence',
    label: 'Confluence',
    detail: '36 pages',
    status: 'Ready',
    connectorId: 'conn-confluence',
    itemsIndexed: 36,
    lastSync: '1 hour ago',
    scope: 'MOB space · Product, Architecture, Security labels',
  },
  {
    id: 'ch-docs',
    label: 'Documents',
    detail: '8 files',
    status: 'Ready',
    itemsIndexed: 8,
    lastSync: 'Just now',
    scope: 'Project uploads',
  },
  {
    id: 'ch-meetings',
    label: 'Meetings',
    detail: '4 transcripts',
    status: 'Ready',
    itemsIndexed: 4,
    lastSync: '2 days ago',
    scope: 'Zoom transcript and product workshops',
  },
  {
    id: 'ch-app',
    label: 'Live App',
    detail: '12 screens, 3 flows',
    status: 'Partial',
    itemsIndexed: 12,
    lastSync: 'in progress',
    scope: 'Test environment · Login and Profile flows explored',
  },
  {
    id: 'ch-code',
    label: 'Code',
    detail: '3 repositories',
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
    detail: '6 flows',
    status: 'Ready',
    connectorId: 'conn-figma',
    itemsIndexed: 6,
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
 * The board mid-discovery: evidence and observations captured, one conflict still
 * flagged, and a requirement seed already confirmed off the back of linked cards.
 * The open conflict is what holds the stage gate.
 */
const finEdgeCards: BoardCard[] = [
  {
    id: 'card-ev-workshop',
    laneId: 'lane-inputs',
    type: 'Evidence',
    state: 'Captured',
    title: 'Biometric login requested for returning users',
    content:
      'Stakeholders asked for one-tap login for customers who have already been through onboarding.',
    evidenceClass: 'Source fact',
    provenance: {
      system: 'Meetings',
      itemId: 'Zoom workshop · 18 Jul 2026',
      deepLink: 'https://zoom.example/rec/FMB2-workshop-18jul',
      indexedAt: '2026-07-19 09:14',
      excerpt:
        '“If they have already onboarded, asking for a PIN every single time is the thing people complain about most.”',
    },
    relations: [{ toCardId: 'card-seed-bio', kind: 'Supports' }],
    aiCreated: false,
  },
  {
    id: 'card-ev-jira',
    laneId: 'lane-inputs',
    type: 'Evidence',
    state: 'Captured',
    title: 'FMB2-142: Add biometric login',
    content: 'Backlog item exists and is currently marked priority P1, targeted at Phase 2.',
    evidenceClass: 'Source fact',
    provenance: {
      system: 'Jira',
      itemId: 'FMB2-142',
      deepLink: 'https://jira.example/browse/FMB2-142',
      indexedAt: '2026-07-29 23:31',
      excerpt: 'Priority: P1 · Fix Version: 2.1 · Epic: Authentication modernization',
    },
    relations: [{ toCardId: 'card-conflict-priority', kind: 'Contradicts' }],
    aiCreated: false,
  },
  {
    id: 'card-obs-login',
    laneId: 'lane-current',
    type: 'Observation',
    state: 'Confirmed',
    title: 'PIN login followed by OTP on new device',
    content:
      'Every session starts with a PIN. A new device additionally requires an OTP before reaching the dashboard.',
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
    laneId: 'lane-current',
    type: 'Constraint',
    state: 'Confirmed',
    title: 'JWT access token expires in 15 minutes',
    content:
      'Session length is set in auth-service configuration and is shared with the web channel.',
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
    laneId: 'lane-current',
    type: 'Constraint',
    state: 'Confirmed',
    title: 'Use the existing OAuth gateway',
    content: 'All channels authenticate through the shared gateway; no new identity provider.',
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
    id: 'card-idea-faceid',
    laneId: 'lane-proposed',
    type: 'Idea',
    state: 'Interpreted',
    title: 'Use Face ID / Touch ID after device registration',
    content:
      'Once a device is registered, offer platform biometrics in place of the PIN for that device only.',
    evidenceClass: 'Inferred interpretation',
    author: 'Maya Kapoor',
    confidence: 0.84,
    rationale:
      'Derived from the workshop request plus the observed login flow; registration is implied by the device-bound rule in the standards page.',
    relations: [{ toCardId: 'card-seed-bio', kind: 'Refines' }],
    aiCreated: true,
  },
  {
    id: 'card-conflict-priority',
    laneId: 'lane-decisions',
    type: 'Conflict',
    state: 'Flagged',
    title: 'Biometric login release priority',
    content: 'The workshop treats biometrics as launch-critical; Jira has it as P1 for Phase 2.',
    evidenceClass: 'Source fact',
    conflict: {
      claimA: 'Biometric login is planned for Phase 2 and marked P1.',
      claimASource: 'Jira FMB2-142',
      claimB: 'Biometric login is required for the Q4 2026 launch.',
      claimBSource: 'Zoom workshop · 18 Jul 2026',
      observedState: 'The test application does not currently support biometric authentication.',
    },
    relations: [],
    aiCreated: true,
    rationale:
      'Detected by comparing the priority field on FMB2-142 against launch language in the workshop transcript.',
  },
  {
    id: 'card-q-enrollment',
    laneId: 'lane-decisions',
    type: 'Question',
    state: 'Flagged',
    title: 'Is device registration required before first biometric use?',
    content:
      'Nothing in the sources states whether a customer can enable biometrics on an unregistered device.',
    evidenceClass: 'AI assumption',
    owner: 'Arjun Mehta',
    dueState: 'Needed before HLD sign-off',
    relations: [],
    aiCreated: true,
    rationale: 'Raised as a gap: no source covers the enrolment precondition.',
  },
  {
    id: 'card-dec-fallback',
    laneId: 'lane-decisions',
    type: 'Decision',
    state: 'Confirmed',
    title: 'Fallback to PIN after three biometric failures',
    content: 'Three consecutive failures fall back to PIN and raise a security event.',
    evidenceClass: 'User decision',
    author: 'Security review',
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
    id: 'card-seed-bio',
    laneId: 'lane-proposed',
    type: 'Requirement seed',
    state: 'Requirement seed',
    title: 'Returning customer can authenticate using registered device biometrics',
    content:
      'Actor: returning retail customer. Need: authenticate with device biometrics. Value: fewer PIN-related drop-offs.',
    evidenceClass: 'User decision',
    confidence: 0.91,
    relations: [
      { toCardId: 'card-ev-workshop', kind: 'Supports' },
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
    supportingCardIds: ['card-ev-workshop', 'card-obs-login'],
  },
  {
    key: 'primaryUsers',
    body: 'Existing retail customer · newly registered customer · customer-support agent · fraud analyst.',
    versions: 2,
    supportingCardIds: ['card-ev-workshop'],
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
    supportingCardIds: ['card-idea-faceid', 'card-seed-bio', 'card-dec-fallback'],
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
    supportingCardIds: ['card-q-enrollment'],
  },
  {
    key: 'openQuestions',
    body: 'Maximum registered devices per customer · policy for rooted or jailbroken devices · offline behavior.',
    versions: 1,
    supportingCardIds: ['card-q-enrollment'],
  },
];

const finEdge: SpecAiState = {
  projectId: 'p-mobile-v2',
  specKey: 'FMB2',
  currentStage: 'knowledge',
  lockedStages: [],
  sources: [
    { id: 'src-1', name: 'FinEdge Mobile Banking V2 — PRD v4.docx', type: 'DOCX' },
    { id: 'src-2', name: 'Retail login research (raw notes).txt', type: 'TXT' },
    { id: 'src-3', name: 'Legacy authentication architecture.pdf', type: 'PDF' },
    { id: 'src-4', name: 'Confluence — MOB Platform Standards', type: 'Confluence' },
  ],
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
      evidenceCardIds: [
        'card-ev-workshop',
        'card-ev-jira',
        'card-obs-login',
        'card-con-token',
        'card-dec-fallback',
      ],
      evidenceSummary: '5 board cards · 2 Jira issues · 1 meeting transcript · 1 code constraint',
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
  sources: [],
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
});
