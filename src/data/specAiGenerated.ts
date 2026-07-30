import { ArchArtifact, ModuleNode, UserStory } from '../types/specai';

/**
 * Payloads produced when a stage locks. They live apart from the initial state
 * deliberately: nothing downstream exists until the upstream version is locked,
 * so the artifact package is generated on locking Understanding, the module map
 * on approving artifacts, and the stories on finalizing the map.
 */

export const GENERATED_ARTIFACTS = (): ArchArtifact[] => [
  // ── Product
  {
    id: 'art-prd',
    group: 'Product',
    label: 'PRD',
    body:
      'Mobile Banking V2 login modernization: biometric authentication, device registration, and secure fallback.\n\n' +
      'Section 6.2 Biometric login — registered customers may authenticate with platform biometrics. PIN remains available as fallback and is required after three consecutive failures.',
    versions: 2,
    status: 'In review',
    confidence: 'high',
    stale: false,
    reviewComments: 2,
    changeTag: '~ Changed',
  },
  {
    id: 'art-frd',
    group: 'Product',
    label: 'Functional Requirements',
    body:
      'FR-01 Detect biometric capability on launch.\n' +
      'FR-02 Register a device against the customer record.\n' +
      'FR-03 Exchange a local biometric assertion for a session token.\n' +
      'FR-04 Count consecutive failures and fall back to PIN at three.\n' +
      'FR-05 Hide biometric entry points on unsupported devices.',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },
  {
    id: 'art-nfr',
    group: 'Product',
    label: 'Non-functional requirements',
    body: 'P95 login under 2.5 seconds · 99.95% monthly availability · audit events retained 7 years · WCAG 2.2 AA · encryption in transit and at rest.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },
  {
    id: 'art-rules',
    group: 'Product',
    label: 'Business Rules',
    body:
      'BR-01 Three consecutive biometric failures force PIN.\n' +
      'BR-02 A revoked device may never authenticate biometrically.\n' +
      'BR-03 Rooted or jailbroken devices are not offered biometrics.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },
  {
    id: 'art-journeys',
    group: 'Product',
    label: 'User Journeys',
    body:
      'Returning customer · one-tap login.\n' +
      'New device · register then enrol.\n' +
      'Locked out · three failures then PIN.\n' +
      'Lost device · revoke from another session.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },

  // ── Architecture
  {
    id: 'art-overview',
    group: 'Architecture',
    label: 'Architecture Overview',
    body: 'Mobile app uses native biometric APIs, Auth Service, Device Registry, Risk Engine, and the Audit Event Bus. No biometric template ever leaves the device.',
    versions: 2,
    status: 'Approved',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    changeTag: '~ Changed',
  },
  {
    id: 'art-hld',
    group: 'Architecture',
    label: 'HLD',
    body:
      'Section 4.3 Biometric login — the app performs a local capability check, requests a challenge from Auth Service, and returns a signed assertion.\n\n' +
      'Auth Service validates the device binding through Device Registry, scores the attempt with Risk Engine, and issues a session token honouring the existing 15-minute TTL.',
    versions: 3,
    status: 'Approved',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    changeTag: '~ Changed',
  },
  {
    id: 'art-lld',
    group: 'Architecture',
    label: 'LLD',
    body:
      'Defines biometric capability check, registration challenge, token exchange, failure counter, and fallback flow.\n\n' +
      'The failure counter is device-scoped, persisted, and reset on any successful authentication.',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },
  {
    id: 'art-c4',
    group: 'Architecture',
    label: 'C4',
    body:
      'L1 System Context — FinEdge within the Northstar estate.\n' +
      'L2 Container — app, gateway, Auth Service, Device Registry, Risk Engine, Audit Bus.\n' +
      'L3 Component — Auth Service split into challenge issuer, assertion verifier, and failure counter.',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    note: 'Context, Container, and Component levels.',
    diagramFlow: ['Mobile App', 'OAuth Gateway', 'Auth Service', 'Device Registry'],
  },
  {
    id: 'art-sequence',
    group: 'Architecture',
    label: 'Sequence Diagrams',
    body: 'BIO-LOGIN-01 · Customer to Mobile App to Native Biometric API to Auth Service to Risk Engine to Token Service.',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Customer', 'Mobile App', 'Biometric API', 'Auth Service', 'Token Service'],
  },
  {
    id: 'art-integration',
    group: 'Architecture',
    label: 'Integration Map',
    body: 'Auth Service to Device Registry (sync) · Auth Service to Audit Bus (async) · Auth Service to Risk Engine (sync) · Device Registry to Notifications (async).',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Auth Service', 'Risk Engine', 'Audit Bus'],
  },

  // ── Contracts
  {
    id: 'art-openapi',
    group: 'Contracts',
    label: 'OpenAPI',
    body:
      'openapi: 3.1.0\n' +
      'paths:\n' +
      '  /devices/register:         post\n' +
      '  /auth/biometric/challenge: post\n' +
      '  /auth/biometric/verify:    post\n' +
      '  /devices/{id}:             delete',
    versions: 4,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    note: 'Generated per service boundary. Target version set by your admin.',
  },
  {
    id: 'art-events',
    group: 'Contracts',
    label: 'Event Contracts',
    body: 'DeviceRegistered · BiometricEnrolled · BiometricFailureThresholdReached · DeviceRevoked. All carry customerId, deviceId, and occurredAt.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },
  {
    id: 'art-er',
    group: 'Contracts',
    label: 'ER Model',
    body:
      'CustomerDevice has many AuthAttempt\n' +
      'CustomerDevice has one BiometricEnrollmentReference\n' +
      'CustomerDevice has many SessionToken\n' +
      'SecurityEvent (deviceId, type, occurredAt)',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },
  {
    id: 'art-schema',
    group: 'Contracts',
    label: 'Schema Notes',
    body: 'No biometric template is stored. BiometricEnrollmentReference holds only an opaque OS-issued handle. AuthAttempt is retained 7 years for audit.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },

  // ── Decisions
  {
    id: 'art-stack',
    group: 'Decisions',
    label: 'Technology Recommendation',
    body: 'React Native · Java services on the existing platform · PostgreSQL · Redis for the failure counter · OAuth 2.0 and OIDC through the existing gateway · existing event streaming.',
    versions: 1,
    status: 'Generated',
    // Held deliberately: this is the artifact that blocks the approval gate.
    confidence: 'low',
    stale: false,
    reviewComments: 1,
  },
  {
    id: 'art-adr',
    group: 'Decisions',
    label: 'ADRs',
    body:
      'ADR-001 Reuse the existing OAuth gateway — accepted.\n' +
      'ADR-002 Device-bound enrolment — accepted.\n' +
      'ADR-003 Centralized session audit — accepted.\n' +
      'ADR-004 Use platform-native biometrics; never store biometric templates in FinEdge systems — accepted.',
    versions: 2,
    status: 'Approved',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    note: 'Auto-generated and version-tracked, so decisions stay current as the system evolves.',
  },
  {
    id: 'art-risks',
    group: 'Decisions',
    label: 'Risks and Trade-offs',
    body:
      'Risk: OS biometric behaviour differs across vendors — mitigate with capability detection.\n' +
      'Trade-off: device-bound enrolment adds a registration step but avoids storing templates.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },

  // ── Visuals
  {
    id: 'art-mindmap',
    group: 'Visuals',
    label: 'Mind Map',
    body: 'Authentication branches into biometric login, PIN fallback, OTP step-up, and session management.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Authentication', 'Biometric', 'Fallback'],
  },
  {
    id: 'art-appflow',
    group: 'Visuals',
    label: 'App Flow',
    body: 'Launch, capability check, biometric prompt, dashboard — with a PIN branch after three failures.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Launch', 'Capability check', 'Biometric prompt', 'Dashboard'],
  },
  {
    id: 'art-depgraph',
    group: 'Visuals',
    label: 'Dependency Graph',
    body: 'Authentication depends on Device Management and Risk & Fraud. Notifications depends on Device Management. Audit receives from all.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Device Mgmt', 'Authentication', 'Risk & Fraud'],
  },
  {
    id: 'art-context',
    group: 'Visuals',
    label: 'System Context',
    body: 'Customer, Mobile App, OAuth Gateway, Auth Service, Device Registry, Risk Engine, Audit Bus, Notification Service.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Customer', 'Mobile App', 'Auth Service', 'Audit Bus'],
  },
];

export const GENERATED_MODULES = (): ModuleNode[] => [
  {
    id: 'mod-auth',
    name: 'Authentication',
    dependsOn: ['mod-device', 'mod-risk'],
    features: [
      {
        id: 'ft-pin',
        name: 'PIN login',
        capabilities: [{ id: 'cap-pin-entry', name: 'PIN entry & validation' }],
        requirementIds: [],
      },
      {
        id: 'ft-bio',
        name: 'Biometric login',
        capabilities: [
          { id: 'cap-cap-check', name: 'Capability detection' },
          { id: 'cap-challenge', name: 'Challenge exchange' },
          { id: 'cap-fallback', name: 'Failure counter & fallback' },
        ],
        requirementIds: ['REQ-AUTH-012', 'SEC-REQ-008'],
      },
      {
        id: 'ft-otp',
        name: 'OTP step-up',
        capabilities: [{ id: 'cap-otp', name: 'One-time code delivery' }],
        requirementIds: [],
      },
      {
        id: 'ft-session',
        name: 'Session management',
        capabilities: [{ id: 'cap-token', name: 'Token issue & refresh' }],
        requirementIds: ['REQ-AUTH-012'],
      },
    ],
  },
  {
    id: 'mod-device',
    name: 'Device Management',
    dependsOn: ['mod-auth', 'mod-notify'],
    features: [
      {
        id: 'ft-register',
        name: 'Register device',
        capabilities: [{ id: 'cap-bind', name: 'Device binding' }],
        requirementIds: ['REQ-AUTH-012'],
      },
      { id: 'ft-rename', name: 'Rename device', capabilities: [], requirementIds: [] },
      {
        id: 'ft-revoke',
        name: 'Revoke device',
        capabilities: [{ id: 'cap-revoke', name: 'Revocation store' }],
        requirementIds: ['SEC-REQ-008'],
      },
      { id: 'ft-trust', name: 'Device trust score', capabilities: [], requirementIds: [] },
    ],
  },
  {
    id: 'mod-risk',
    name: 'Risk & Fraud',
    dependsOn: ['mod-auth', 'mod-audit'],
    features: [
      {
        id: 'ft-scoring',
        name: 'Risk scoring',
        capabilities: [{ id: 'cap-score', name: 'Attempt scoring' }],
        requirementIds: [],
      },
      {
        id: 'ft-rooted',
        name: 'Rooted-device check',
        capabilities: [],
        requirementIds: ['REQ-AUTH-012'],
      },
      {
        id: 'ft-abnormal',
        name: 'Abnormal-login detection',
        capabilities: [],
        requirementIds: ['SEC-REQ-008'],
      },
    ],
  },
  {
    id: 'mod-notify',
    name: 'Notifications',
    dependsOn: ['mod-device'],
    features: [
      { id: 'ft-new-device', name: 'New-device alert', capabilities: [], requirementIds: [] },
      {
        id: 'ft-enrol-alert',
        name: 'Biometric enrollment alert',
        capabilities: [],
        requirementIds: [],
      },
      { id: 'ft-revoke-alert', name: 'Revocation alert', capabilities: [], requirementIds: [] },
    ],
  },
  {
    id: 'mod-audit',
    name: 'Audit & Compliance',
    dependsOn: [],
    features: [
      {
        id: 'ft-auth-log',
        name: 'Authentication event logging',
        capabilities: [{ id: 'cap-events', name: 'Security event emission' }],
        requirementIds: ['SEC-REQ-008'],
      },
      { id: 'ft-trail', name: 'Decision trail', capabilities: [], requirementIds: [] },
      { id: 'ft-retention', name: 'Retention export', capabilities: [], requirementIds: [] },
    ],
  },
];

export const GENERATED_STORIES = (): UserStory[] => [
  {
    id: 'st-1',
    key: 'FMB2-AUTH-031',
    title: 'Authenticate using registered device biometrics',
    storyType: 'User story',
    role: 'returning retail customer',
    goal: 'authenticate using device biometrics',
    benefit: 'I can access my account without repeatedly entering my PIN',
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
    ],
    priority: 'P0',
    points: 5,
    moduleName: 'Authentication',
    featureName: 'Biometric login',
    linkedRequirementIds: ['REQ-AUTH-012', 'SEC-REQ-008'],
    linkedArtifactIds: ['art-prd', 'art-hld', 'art-sequence', 'art-openapi'],
    sourceEvidence: 'Jira FMB2-142 · Zoom workshop · live app observation · ADR-004',
    stale: false,
    deliveryStatus: 'Done',
    exported: true,
  },
  {
    id: 'st-2',
    key: 'FMB2-AUTH-032',
    title: 'Implement biometric capability detection and challenge exchange',
    storyType: 'Technical story',
    role: 'mobile engineer',
    goal: 'native capability detection and a secure challenge exchange',
    benefit: 'the app only offers biometrics where it can honour them',
    acceptance: [
      {
        given: 'an unsupported device',
        when: 'the app launches',
        then: 'no biometric prompt is registered',
      },
      {
        given: 'a supported device',
        when: 'a challenge is requested',
        then: 'the assertion is verified server-side before a token is issued',
      },
    ],
    priority: 'P0',
    points: 8,
    moduleName: 'Authentication',
    featureName: 'Biometric login',
    linkedRequirementIds: ['REQ-AUTH-012'],
    linkedArtifactIds: ['art-lld', 'art-c4'],
    sourceEvidence: 'auth-service config · HLD 4.3',
    stale: false,
    deliveryStatus: 'Done',
    exported: true,
  },
  {
    id: 'st-3',
    key: 'FMB2-AUTH-033',
    title: 'Create biometric challenge and verification endpoints',
    storyType: 'API story',
    role: 'backend engineer',
    goal: 'challenge and verify endpoints in Auth Service',
    benefit: 'the client has a contract to build against',
    acceptance: [
      {
        given: 'a registered device',
        when: 'POST /auth/biometric/challenge is called',
        then: 'a single-use challenge is returned with a short TTL',
      },
      {
        given: 'a signed assertion',
        when: 'POST /auth/biometric/verify is called',
        then: 'a session token is issued on success',
      },
    ],
    priority: 'P0',
    points: 5,
    moduleName: 'Authentication',
    featureName: 'Biometric login',
    linkedRequirementIds: ['REQ-AUTH-012'],
    linkedArtifactIds: ['art-openapi'],
    sourceEvidence: 'OpenAPI auth/biometric',
    stale: false,
    deliveryStatus: 'In progress',
    exported: true,
  },
  {
    id: 'st-4',
    key: 'FMB2-SEC-014',
    title: 'Enforce PIN fallback after three failed biometric attempts',
    storyType: 'Security story',
    role: 'security reviewer',
    goal: 'a hard fallback and a recorded security event',
    benefit: 'repeated failures are visible to fraud analysis',
    acceptance: [
      {
        given: 'three consecutive biometric failures',
        when: 'the third failure is recorded',
        then: 'PIN is required and a security event is published',
      },
    ],
    priority: 'P0',
    points: 5,
    moduleName: 'Authentication',
    featureName: 'Biometric login',
    linkedRequirementIds: ['SEC-REQ-008'],
    linkedArtifactIds: ['art-rules', 'art-events'],
    sourceEvidence: 'Security review 24 Jul 2026',
    stale: false,
    deliveryStatus: 'Exported',
    exported: true,
  },
  {
    id: 'st-5',
    key: 'FMB2-DATA-009',
    title: 'Create CustomerDevice and AuthAttempt persistence',
    storyType: 'Data story',
    role: 'data engineer',
    goal: 'device and attempt tables with retention controls',
    benefit: 'audit obligations are met without storing biometric data',
    acceptance: [
      {
        given: 'a completed authentication attempt',
        when: 'the record is written',
        then: 'it carries deviceId and occurredAt and no biometric template',
      },
    ],
    priority: 'P1',
    points: 5,
    moduleName: 'Audit & Compliance',
    featureName: 'Authentication event logging',
    linkedRequirementIds: ['SEC-REQ-008'],
    linkedArtifactIds: ['art-er', 'art-schema'],
    sourceEvidence: 'ER model · ADR-004',
    stale: false,
    deliveryStatus: 'Exported',
    exported: true,
  },
  {
    id: 'st-6',
    key: 'FMB2-QA-021',
    title: 'Validate biometric fallback scenarios',
    storyType: 'Testing story',
    role: 'QA engineer',
    goal: 'coverage across Face ID, Touch ID, unsupported, lockout, fallback and revoked devices',
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
    featureName: 'Biometric login',
    linkedRequirementIds: ['REQ-AUTH-012', 'SEC-REQ-008'],
    linkedArtifactIds: ['art-nfr', 'art-sequence'],
    sourceEvidence: 'FRD FR-04 · BR-01',
    stale: false,
    deliveryStatus: 'Draft',
    exported: false,
  },
  {
    id: 'st-7',
    key: 'FMB2-MIG-004',
    title: 'Backfill trusted-device records',
    storyType: 'Migration story',
    role: 'platform engineer',
    goal: 'existing device-registration data migrated into CustomerDevice',
    benefit: 'already-enrolled customers are not asked to register again',
    acceptance: [
      {
        given: 'a customer enrolled in the legacy device flow',
        when: 'the backfill runs',
        then: 'a CustomerDevice record exists with the original enrolment date',
      },
    ],
    priority: 'P2',
    points: 8,
    moduleName: 'Device Management',
    featureName: 'Register device',
    linkedRequirementIds: ['REQ-AUTH-012'],
    linkedArtifactIds: ['art-er'],
    sourceEvidence: 'Legacy authentication architecture.pdf',
    stale: false,
    deliveryStatus: 'Blocked',
    exported: true,
  },
];
