import { BoardNote, KnowledgeChannel, SpecAiState } from '../types/specai';

/** Channels a project draws knowledge from, with index health. */
const incedoChannels = (): KnowledgeChannel[] => [
  { id: 'ch-jira', label: 'Jira', detail: '184 items', status: 'Ready', connectorId: 'conn-jira', itemsIndexed: 184, lastSync: '12 min ago' },
  { id: 'ch-confluence', label: 'Confluence', detail: '16 pages', status: 'Ready', connectorId: 'conn-confluence', itemsIndexed: 16, lastSync: '1 hour ago' },
  { id: 'ch-docs', label: 'Documents', detail: '4 files', status: 'Ready', itemsIndexed: 4, lastSync: 'Just now' },
  { id: 'ch-meetings', label: 'Meetings', detail: '3 transcripts', status: 'Ready', itemsIndexed: 3, lastSync: '2 days ago' },
  { id: 'ch-app', label: 'Live app', detail: 'exploring', status: 'Indexing', itemsIndexed: 12, lastSync: 'in progress' },
  { id: 'ch-code', label: 'Code', detail: '3 repos', status: 'Ready', connectorId: 'conn-github', itemsIndexed: 96, lastSync: '18 min ago' },
  { id: 'ch-flows', label: 'Flows', detail: '5 captured', status: 'Ready', itemsIndexed: 5, lastSync: '3 hours ago' },
];

const emptyChannels = (): KnowledgeChannel[] => [
  { id: 'ch-jira', label: 'Jira', detail: 'not connected', status: 'Not connected', connectorId: 'conn-jira', itemsIndexed: 0, lastSync: 'Never' },
  { id: 'ch-docs', label: 'Documents', detail: 'none yet', status: 'Not connected', itemsIndexed: 0, lastSync: 'Never' },
];

const emptyChalkBoard = () => ({
  started: false,
  activeLayer: 'Scope' as const,
  layers: {
    Scope: 'Not yet' as const,
    Dependencies: 'Not yet' as const,
    'Acceptance criteria': 'Not yet' as const,
  },
  messages: [],
  acceptedRequirements: 0,
});

/**
 * Mobile Banking V2 sits mid-pipeline: Knowledge and Understanding locked,
 * Architecture current with one low-confidence artifact holding the gate, and
 * Modules / Stories still locked out. That exercises every stage-rail state at
 * once, and stories exist so traceability and staleness are visible after the
 * gates are cleared.
 */
const mobileBankingV2: SpecAiState = {
  projectId: 'p-mobile-v2',
  currentStage: 'architecture',
  lockedStages: ['knowledge', 'understanding'],
  sources: [
    { id: 'src-1', name: 'Mobile Banking V2 — PRD v4.docx', type: 'DOCX' },
    { id: 'src-2', name: 'Retail wealth requirements (raw notes).txt', type: 'TXT' },
    { id: 'src-3', name: 'Legacy mainframe ledger architecture.pdf', type: 'PDF' },
    { id: 'src-4', name: 'Confluence — Mobile Platform Standards', type: 'Confluence' },
  ],
  channels: incedoChannels(),
  boardNotes: [
    { id: 'bn-1', kind: 'Feature idea', title: 'Biometric login', body: 'FaceID and TouchID for returning users with passcode fallback.', source: 'Source: Product note', x: 24, y: 28 },
    { id: 'bn-2', kind: 'Observed flow', title: 'Current login journey', body: 'Login → OTP verification → Dashboard. Passcode login only today.', source: 'Source: Live application', x: 268, y: 52 },
    { id: 'bn-3', kind: 'Conflict', title: 'Launch priority mismatch', body: 'Jira marks biometrics optional. The discovery transcript calls it launch-critical.', source: '2 sources disagree', x: 512, y: 26 },
    { id: 'bn-4', kind: 'Technical context', title: 'Authentication service', body: 'JWT refresh endpoint exists. Device enrolment is not implemented.', source: 'Source: customer-auth-service', x: 120, y: 236 },
    { id: 'bn-5', kind: 'Open question', title: 'Fallback behaviour', body: 'Should failed biometric attempts fall back to passcode immediately, or after three retries?', source: 'Needs stakeholder input', x: 404, y: 252 },
    { id: 'bn-6', kind: 'Requirement', title: 'Idempotent transfers', body: 'Every ledger command carries an idempotency key so a retry can never double-post.', source: 'Accepted via Chalk Board', x: 660, y: 220 },
  ],
  flaggedQuestions: [
    {
      id: 'flag-1',
      question:
        'Biometric login is mandatory in the PRD but optional in the raw notes. Which governs?',
      fromSources: 'PRD v4 vs. raw notes',
      status: 'Resolved',
      resolution: 'Mandatory, with a passcode fallback for unsupported devices.',
    },
    {
      id: 'flag-2',
      question: 'Two different session-timeout values appear (10 min and 15 min).',
      fromSources: 'PRD v4 vs. Confluence standards',
      status: 'Resolved',
      resolution: 'Confluence standard wins: 15 minutes with idle warning at 13.',
    },
  ],
  chalkBoard: {
    started: true,
    activeLayer: 'Acceptance criteria',
    layers: { Scope: 'Locked', Dependencies: 'Locked', 'Acceptance criteria': 'Validating' },
    messages: [
      {
        id: 'cb-1',
        from: 'bot',
        text: 'Let’s start with scope. What should the biometric quick-login cover?',
      },
      {
        id: 'cb-2',
        from: 'user',
        text: 'FaceID and TouchID for returning users, with a passcode fallback.',
      },
      {
        id: 'cb-3',
        from: 'bot',
        text: 'Scope locked. Moving to dependencies. What must exist before this can work?',
      },
      {
        id: 'cb-4',
        from: 'user',
        text: 'Device enrolment, the JWT refresh endpoint, and FINRA session logging.',
      },
      {
        id: 'cb-5',
        from: 'bot',
        text: 'Dependencies locked. Now acceptance criteria — how do we know it works?',
      },
    ],
    acceptedRequirements: 6,
  },
  understanding: [
    {
      key: 'objective',
      body: 'Ship a next-generation mobile wealth and trading experience with AI-native assistance, cutting time-to-first-trade for returning users and meeting FINRA supervision requirements end to end.',
      versions: 3,
    },
    {
      key: 'stakeholders',
      body: 'Retail investors (primary users) · Advisors (supervision view) · Compliance (FINRA evidence) · Platform engineering (mainframe ledger integration) · Support (recovery flows).',
      versions: 2,
    },
    {
      key: 'scope',
      body: 'In scope: biometric quick login, portfolio view, transfers, trade placement, AI assistant.\nOut of scope: tax reporting, statement archive migration, advisor-side desktop tooling.',
      versions: 4,
    },
    {
      key: 'assumptions',
      body: 'The mainframe ledger exposes a read replica by Q3. Device enrolment reuses the existing identity provider. Trading hours logic is inherited unchanged from V1.',
      versions: 2,
    },
    {
      key: 'questions',
      body: 'Tracked as an action list below.',
      versions: 1,
    },
  ],
  openQuestions: [
    {
      id: 'oq-1',
      text: 'Does the AI assistant need advisor sign-off before surfacing a recommendation?',
      status: 'Open',
    },
    {
      id: 'oq-2',
      text: 'Which markets are in scope for the initial trading release?',
      status: 'Resolved',
    },
    {
      id: 'oq-3',
      text: 'Do we support joint accounts in V2 or defer to V2.1?',
      status: 'Deferred',
    },
  ],
  archMode: 'Brownfield',
  hasLegacyArchitecture: true,
  artifacts: [
    {
      id: 'art-hld',
      group: 'Design docs',
      label: 'High Level Design (HLD)',
      body: 'Client (React Native) → BFF (mobile-gateway) → domain services (identity, portfolio, transfer, trading) → mainframe ledger adapter.\n\nThe BFF owns session and biometric enrolment; the ledger adapter isolates the mainframe behind an idempotent command interface so retries are safe.',
      versions: 5,
      confidence: 'high',
      changeTag: '~ Changed',
    },
    {
      id: 'art-lld',
      group: 'Design docs',
      label: 'Low Level Design (LLD)',
      body: 'BiometricAuthModal → POST /v2/auth/biometric → enrolment check → JWT mint (15 min) with refresh sliding window.\n\nTransferService splits into command handlers with idempotency keys persisted for 24h to survive mainframe retries.',
      versions: 3,
      confidence: 'high',
      changeTag: '~ Changed',
    },
    {
      id: 'art-nfr',
      group: 'Design docs',
      label: 'Non-functional requirements',
      body: 'p95 cold start < 2.0s · p95 transfer confirm < 800ms · availability 99.95% · WCAG 2.1 AA · FINRA session logging retained 7 years · all data resident in Incedo AWS.',
      versions: 2,
      confidence: 'high',
    },
    {
      id: 'art-context',
      group: 'Diagrams',
      label: 'Context & flow diagrams',
      body: 'Actors: Investor, Advisor, Compliance Reviewer.\nExternal systems: Identity Provider, Mainframe Ledger, Market Data Feed, Notification Gateway.',
      versions: 2,
      confidence: 'high',
      note: 'Exports as SVG or PNG.',
    },
    {
      id: 'art-c4',
      group: 'Diagrams',
      label: 'System architecture (C4)',
      body: 'L1 System Context — Mobile Banking V2 within the Incedo estate.\nL2 Container — app, BFF, four domain services, ledger adapter, event bus.\nL3 Component — transfer service broken into command handlers, validators and the idempotency store.',
      versions: 4,
      confidence: 'high',
      note: 'Context, Container, and Component levels.',
    },
    {
      id: 'art-sequence',
      group: 'Diagrams',
      label: 'Sequence diagrams',
      body: 'Biometric login · Funded transfer with retry · Trade placement with market-hours rejection · Session expiry and refresh.',
      versions: 3,
      confidence: 'high',
    },
    {
      id: 'art-openapi',
      group: 'Contracts',
      label: 'API contracts (OpenAPI)',
      body: 'openapi: 3.1.0\npaths:\n  /v2/auth/biometric:  post — enrol / verify\n  /v2/portfolio:       get  — holdings + valuation\n  /v2/wealth/transfer: post — idempotent funded transfer\n  /v2/trades:          post — place order',
      versions: 6,
      confidence: 'high',
      note: 'Generated per service boundary. Target version set by your admin.',
    },
    {
      id: 'art-er',
      group: 'Contracts',
      label: 'Database design (ER & schema)',
      body: 'account —< holding >— instrument\naccount —< transfer_command (idempotency_key unique)\nsession (device_id, biometric_enrolled_at, expires_at)',
      versions: 3,
      confidence: 'high',
    },
    {
      id: 'art-stack',
      group: 'Decisions',
      label: 'Technology stack recommendation',
      body: 'React Native + TypeScript · Node BFF on Fargate · PostgreSQL Aurora · EventBridge · Terraform · GitHub Actions.\n\nRationale: reuses existing platform-engineering skills and the approved Incedo AWS landing zone.',
      versions: 2,
      // Held deliberately: the stack recommendation is the gate-blocking artifact.
      confidence: 'low',
    },
    {
      id: 'art-adr',
      group: 'Decisions',
      label: 'Architecture Decision Records (ADRs)',
      body: 'ADR-001 Idempotency keys on all ledger commands — accepted.\nADR-002 15-minute session with sliding refresh — accepted.\nADR-003 Ledger adapter over direct mainframe access — accepted.\nADR-004 Defer joint-account support to V2.1 — proposed.',
      versions: 4,
      confidence: 'high',
      note: 'Auto-generated and version-tracked, so decisions stay current as the system evolves.',
    },
  ],
  modules: [
    {
      id: 'mod-auth',
      name: 'Authentication',
      features: [
        { id: 'ft-bio', name: 'Biometric quick login' },
        { id: 'ft-jwt', name: 'JWT refresh' },
        { id: 'ft-recovery', name: 'Passcode fallback & recovery' },
      ],
      dependsOn: [],
    },
    {
      id: 'mod-portfolio',
      name: 'Portfolio',
      features: [
        { id: 'ft-holdings', name: 'Holdings & valuation' },
        { id: 'ft-perf', name: 'Performance history' },
      ],
      dependsOn: ['mod-auth'],
    },
    {
      id: 'mod-transfers',
      name: 'Transfers',
      features: [
        { id: 'ft-funded', name: 'Funded transfer' },
        { id: 'ft-idem', name: 'Idempotent retry' },
      ],
      dependsOn: ['mod-auth', 'mod-portfolio'],
    },
    {
      id: 'mod-trading',
      name: 'Trading',
      features: [
        { id: 'ft-place', name: 'Place order' },
        { id: 'ft-hours', name: 'Market-hours validation' },
      ],
      dependsOn: ['mod-auth', 'mod-portfolio'],
    },
    {
      id: 'mod-assistant',
      name: 'AI Assistant',
      features: [{ id: 'ft-explain', name: 'Explain my portfolio' }],
      dependsOn: ['mod-portfolio'],
    },
  ],
  stories: [
    {
      id: 'st-1',
      title: 'Enable biometric login for returning customers',
      storyType: 'User story',
      role: 'returning investor',
      goal: 'sign in with FaceID',
      benefit: 'I can reach my portfolio without typing a password',
      acceptance: [
        {
          given: 'my device is enrolled for biometrics',
          when: 'I open the app and pass the FaceID prompt',
          then: 'I land on my portfolio with a 15-minute session',
        },
        {
          given: 'biometrics fail twice',
          when: 'I choose the fallback',
          then: 'I am asked for my passcode and the attempt is logged for supervision',
        },
      ],
      priority: 'P0',
      points: 5,
      moduleName: 'Authentication',
      featureName: 'Biometric quick login',
      linkedArtifactIds: ['art-lld', 'art-openapi', 'art-sequence'],
      stale: false,
      exported: true,
    },
    {
      id: 'st-2',
      title: 'Guarantee idempotent transfers on retry',
      storyType: 'Technical story',
      role: 'investor',
      goal: 'move money between my accounts without a duplicate ever posting',
      benefit: 'I can trust the transfer even on a flaky connection',
      acceptance: [
        {
          given: 'I submit a transfer and the network drops',
          when: 'the client retries with the same idempotency key',
          then: 'exactly one ledger posting exists',
        },
      ],
      priority: 'P0',
      points: 8,
      moduleName: 'Transfers',
      featureName: 'Idempotent retry',
      linkedArtifactIds: ['art-hld', 'art-er', 'art-openapi'],
      // The HLD was regenerated after this story was written.
      stale: true,
      exported: true,
    },
    {
      id: 'st-3',
      title: 'Show holdings with current valuation',
      storyType: 'User story',
      role: 'investor',
      goal: 'see my holdings and their current value',
      benefit: 'I know where I stand before I trade',
      acceptance: [
        {
          given: 'I have funded holdings',
          when: 'I open the portfolio tab',
          then: 'each holding shows quantity, price and day change',
        },
      ],
      priority: 'P1',
      points: 5,
      moduleName: 'Portfolio',
      featureName: 'Holdings & valuation',
      linkedArtifactIds: ['art-openapi', 'art-er'],
      stale: false,
      exported: true,
    },
    {
      id: 'st-4',
      title: 'Reject orders outside market hours',
      storyType: 'User story',
      role: 'investor',
      goal: 'be told clearly when the market is closed',
      benefit: 'I do not think my order was accepted when it was not',
      acceptance: [
        {
          given: 'the market for my instrument is closed',
          when: 'I place an order',
          then: 'I see a rejection naming the next open window',
        },
      ],
      priority: 'P1',
      points: 3,
      moduleName: 'Trading',
      featureName: 'Market-hours validation',
      linkedArtifactIds: ['art-sequence'],
      stale: false,
      exported: false,
    },
    {
      id: 'st-5',
      title: 'Explain portfolio movement on request',
      storyType: 'User story',
      role: 'investor',
      goal: 'ask why my portfolio moved today',
      benefit: 'I understand my position without calling an advisor',
      acceptance: [
        {
          given: 'my portfolio changed by more than 1% today',
          when: 'I ask the assistant what happened',
          then: 'I get an explanation citing the contributing holdings',
        },
      ],
      priority: 'P2',
      points: 8,
      moduleName: 'AI Assistant',
      featureName: 'Explain my portfolio',
      linkedArtifactIds: ['art-hld', 'art-adr'],
      stale: false,
      exported: false,
    },
    {
      id: 'st-6',
      title: 'Enforce device binding and revocation',
      storyType: 'Security story',
      role: 'security reviewer',
      goal: 'every biometric enrolment bound to a revocable device record',
      benefit: 'a lost device can be cut off without a password reset',
      acceptance: [
        {
          given: 'an enrolled device is reported lost',
          when: 'an operator revokes the binding',
          then: 'the next biometric attempt from that device is refused and the event is audited',
        },
      ],
      priority: 'P0',
      points: 8,
      moduleName: 'Authentication',
      featureName: 'Passcode fallback & recovery',
      linkedArtifactIds: ['art-lld', 'art-er'],
      stale: false,
      exported: false,
    },
    {
      id: 'st-7',
      title: 'Validate biometric fallback scenarios',
      storyType: 'Testing story',
      role: 'QA engineer',
      goal: 'coverage across failed, unsupported and revoked biometric paths',
      benefit: 'the fallback never leaks why authentication failed',
      acceptance: [
        {
          given: 'biometric authentication is unavailable',
          when: 'the customer attempts to log in',
          then: 'the configured fallback is presented without exposing sensitive detail',
        },
      ],
      priority: 'P1',
      points: 5,
      moduleName: 'Authentication',
      featureName: 'Biometric quick login',
      linkedArtifactIds: ['art-sequence', 'art-nfr'],
      stale: false,
      exported: false,
    },
  ],
  jiraSyncedMinutesAgo: 14,
  sectionEditors: {
    // Soft lock demonstrating dual-persona concurrency.
    'art-c4': 'David Chen',
  },
};

/** Cloud Core Modernization — Brownfield, still in Stage 1 with an open flag. */
const cloudCore: SpecAiState = {
  projectId: 'p-cloud-mig',
  currentStage: 'knowledge',
  lockedStages: [],
  sources: [
    { id: 'cc-src-1', name: 'Mainframe ledger inventory.pdf', type: 'PDF' },
    { id: 'cc-src-2', name: 'Cloud landing zone standards (Confluence)', type: 'Confluence' },
  ],
  channels: incedoChannels(),
  boardNotes: [
    { id: 'cc-bn-1', kind: 'Technical context', title: 'Mainframe ledger inventory', body: '14 ledgers catalogued; 3 have no documented owner.', source: 'Source: inventory PDF', x: 32, y: 40 },
    { id: 'cc-bn-2', kind: 'Conflict', title: 'Ledger count mismatch', body: 'Inventory lists 14, the migration brief names 11.', source: '2 sources disagree', x: 320, y: 90 },
    { id: 'cc-bn-3', kind: 'Open question', title: 'Event ordering', body: 'Is strict ordering required on the settlement stream, or is per-key ordering enough?', source: 'Needs architecture input', x: 120, y: 250 },
  ],
  flaggedQuestions: [
    {
      id: 'cc-flag-1',
      question:
        'The inventory lists 14 ledgers; the migration brief names 11. Which three are excluded?',
      fromSources: 'Ledger inventory vs. migration brief',
      status: 'Open',
    },
    {
      id: 'cc-flag-2',
      question: 'Event ordering guarantee is unstated for the settlement stream.',
      fromSources: 'Landing zone standards',
      status: 'Open',
    },
  ],
  chalkBoard: emptyChalkBoard(),
  understanding: [
    { key: 'objective', body: '', versions: 0 },
    { key: 'stakeholders', body: '', versions: 0 },
    { key: 'scope', body: '', versions: 0 },
    { key: 'assumptions', body: '', versions: 0 },
    { key: 'questions', body: '', versions: 0 },
  ],
  openQuestions: [],
  archMode: 'Brownfield',
  hasLegacyArchitecture: true,
  artifacts: [],
  modules: [],
  stories: [],
  sectionEditors: {},
};

/** Acme B2B Partner Portal — Greenfield, fresh, nothing added yet. */
const acmePortal: SpecAiState = {
  projectId: 'p-acme-portal',
  currentStage: 'knowledge',
  lockedStages: [],
  sources: [],
  channels: emptyChannels(),
  boardNotes: [] as BoardNote[],
  flaggedQuestions: [],
  chalkBoard: emptyChalkBoard(),
  understanding: [
    { key: 'objective', body: '', versions: 0 },
    { key: 'stakeholders', body: '', versions: 0 },
    { key: 'scope', body: '', versions: 0 },
    { key: 'assumptions', body: '', versions: 0 },
    { key: 'questions', body: '', versions: 0 },
  ],
  openQuestions: [],
  archMode: 'Greenfield',
  hasLegacyArchitecture: false,
  artifacts: [],
  modules: [],
  stories: [],
  sectionEditors: {},
};

export const INITIAL_SPEC_AI: SpecAiState[] = [mobileBankingV2, cloudCore, acmePortal];

/** Projects with no Spec AI row start from a blank Greenfield pipeline. */
export const blankSpecAiState = (projectId: string): SpecAiState => ({
  ...acmePortal,
  projectId,
});
