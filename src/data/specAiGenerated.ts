import { ArchArtifact, FlowDiagram, ModuleNode, UserStory } from '../types/specai';
import { DELIVERY_STORIES } from './deliveryData';

/**
 * Payloads produced when a stage locks. They live apart from the initial state
 * deliberately: nothing downstream exists until the upstream version is locked,
 * so the artifact package is generated on locking Understanding, the module map
 * on approving artifacts, and the stories on finalizing the map.
 */

// ═══════════════════════════════ FLOW DIAGRAMS ═══════════════════════════════

const C4_DIAGRAM: FlowDiagram = {
  direction: 'TB',
  nodes: [
    { id: 'customer', label: 'Customer', type: 'actor', x: 300, y: 0, subtitle: 'Retail banking user' },
    { id: 'mobile', label: 'Mobile App', type: 'container', x: 300, y: 120, subtitle: 'React Native · iOS/Android' },
    { id: 'gateway', label: 'OAuth Gateway', type: 'container', x: 80, y: 260, subtitle: 'Kong / OAuth 2.0 + OIDC' },
    { id: 'auth', label: 'Auth Service', type: 'component', x: 300, y: 260, subtitle: 'Java · Spring Boot' },
    { id: 'device', label: 'Device Registry', type: 'component', x: 520, y: 260, subtitle: 'PostgreSQL backed' },
    { id: 'risk', label: 'Risk Engine', type: 'component', x: 160, y: 400, subtitle: 'Real-time scoring' },
    { id: 'audit', label: 'Audit Event Bus', type: 'system', x: 440, y: 400, subtitle: 'Kafka · 7yr retention' },
  ],
  edges: [
    { id: 'e1', source: 'customer', target: 'mobile', label: 'Uses' },
    { id: 'e2', source: 'mobile', target: 'gateway', label: 'HTTPS' },
    { id: 'e3', source: 'mobile', target: 'auth', label: 'Challenge/Verify' },
    { id: 'e4', source: 'auth', target: 'device', label: 'Lookup binding' },
    { id: 'e5', source: 'auth', target: 'risk', label: 'Score attempt', animated: true },
    { id: 'e6', source: 'auth', target: 'audit', label: 'Publish events', animated: true },
    { id: 'e7', source: 'device', target: 'audit', label: 'Registration events' },
  ],
};

const SEQUENCE_DIAGRAM: FlowDiagram = {
  direction: 'LR',
  nodes: [
    { id: 'user', label: 'Customer', type: 'actor', x: 0, y: 140 },
    { id: 'app', label: 'Mobile App', type: 'container', x: 200, y: 80 },
    { id: 'bio', label: 'Native Biometric\nAPI', type: 'system', x: 200, y: 220 },
    { id: 'authsvc', label: 'Auth Service', type: 'component', x: 440, y: 80 },
    { id: 'risksvc', label: 'Risk Engine', type: 'component', x: 440, y: 220 },
    { id: 'tokensvc', label: 'Token Service', type: 'component', x: 660, y: 140 },
  ],
  edges: [
    { id: 'sq1', source: 'user', target: 'app', label: '1. Tap login' },
    { id: 'sq2', source: 'app', target: 'bio', label: '2. Prompt biometric' },
    { id: 'sq3', source: 'bio', target: 'app', label: '3. Signed assertion' },
    { id: 'sq4', source: 'app', target: 'authsvc', label: '4. POST /verify' },
    { id: 'sq5', source: 'authsvc', target: 'risksvc', label: '5. Score', animated: true },
    { id: 'sq6', source: 'authsvc', target: 'tokensvc', label: '6. Issue token' },
    { id: 'sq7', source: 'tokensvc', target: 'app', label: '7. JWT response' },
  ],
};

const INTEGRATION_MAP: FlowDiagram = {
  direction: 'LR',
  nodes: [
    { id: 'auth', label: 'Auth Service', type: 'component', x: 0, y: 120 },
    { id: 'device', label: 'Device Registry', type: 'component', x: 250, y: 0 },
    { id: 'risk', label: 'Risk Engine', type: 'component', x: 250, y: 120 },
    { id: 'audit', label: 'Audit Bus', type: 'system', x: 250, y: 240 },
    { id: 'notify', label: 'Notification\nService', type: 'system', x: 500, y: 0 },
    { id: 'store', label: 'Event Store', type: 'system', x: 500, y: 240 },
  ],
  edges: [
    { id: 'i1', source: 'auth', target: 'device', label: 'Sync · gRPC' },
    { id: 'i2', source: 'auth', target: 'risk', label: 'Sync · REST' },
    { id: 'i3', source: 'auth', target: 'audit', label: 'Async · Kafka', animated: true },
    { id: 'i4', source: 'device', target: 'notify', label: 'Async · Kafka', animated: true },
    { id: 'i5', source: 'device', target: 'audit', label: 'Async · Kafka', animated: true },
    { id: 'i6', source: 'audit', target: 'store', label: 'Stream' },
  ],
};

const HLD_DIAGRAM: FlowDiagram = {
  direction: 'TB',
  nodes: [
    { id: 'client', label: 'Mobile Client', type: 'container', x: 260, y: 0, subtitle: 'React Native' },
    { id: 'cdn', label: 'CDN / WAF', type: 'system', x: 260, y: 100, subtitle: 'Cloudflare' },
    { id: 'gateway', label: 'API Gateway', type: 'container', x: 260, y: 200, subtitle: 'Rate limit · Auth' },
    { id: 'authsvc', label: 'Auth Service', type: 'component', x: 100, y: 320, subtitle: 'Challenge + Verify' },
    { id: 'devicesvc', label: 'Device Service', type: 'component', x: 280, y: 320, subtitle: 'Registration' },
    { id: 'risksvc', label: 'Risk Service', type: 'component', x: 460, y: 320, subtitle: 'Scoring' },
    { id: 'postgres', label: 'PostgreSQL', type: 'system', x: 100, y: 460, subtitle: 'Primary store' },
    { id: 'redis', label: 'Redis', type: 'system', x: 280, y: 460, subtitle: 'Failure counter' },
    { id: 'kafka', label: 'Kafka', type: 'system', x: 460, y: 460, subtitle: 'Event streaming' },
  ],
  edges: [
    { id: 'h1', source: 'client', target: 'cdn' },
    { id: 'h2', source: 'cdn', target: 'gateway' },
    { id: 'h3', source: 'gateway', target: 'authsvc', label: '/auth/*' },
    { id: 'h4', source: 'gateway', target: 'devicesvc', label: '/devices/*' },
    { id: 'h5', source: 'gateway', target: 'risksvc', label: '/risk/*' },
    { id: 'h6', source: 'authsvc', target: 'postgres' },
    { id: 'h7', source: 'authsvc', target: 'redis', label: 'Counter', animated: true },
    { id: 'h8', source: 'devicesvc', target: 'postgres' },
    { id: 'h9', source: 'risksvc', target: 'kafka', animated: true },
    { id: 'h10', source: 'authsvc', target: 'kafka', animated: true },
  ],
};

const LLD_DIAGRAM: FlowDiagram = {
  direction: 'TB',
  nodes: [
    { id: 'capcheck', label: 'Capability\nCheck', type: 'decision', x: 250, y: 0, subtitle: 'Client-side' },
    { id: 'challenge', label: 'Request\nChallenge', type: 'component', x: 100, y: 130, subtitle: 'POST /challenge' },
    { id: 'bioprompt', label: 'Biometric\nPrompt', type: 'system', x: 100, y: 260, subtitle: 'OS-level UI' },
    { id: 'verify', label: 'Verify\nAssertion', type: 'component', x: 100, y: 390, subtitle: 'POST /verify' },
    { id: 'counter', label: 'Failure\nCounter', type: 'component', x: 400, y: 260, subtitle: 'Redis atomic incr' },
    { id: 'fallback', label: 'PIN Fallback', type: 'decision', x: 400, y: 390, subtitle: 'count >= 3?' },
    { id: 'token', label: 'Issue Token', type: 'component', x: 100, y: 520, subtitle: 'JWT · 15min TTL' },
    { id: 'pinflow', label: 'PIN Auth\nFlow', type: 'container', x: 400, y: 520, subtitle: 'Existing flow' },
  ],
  edges: [
    { id: 'l1', source: 'capcheck', target: 'challenge', label: 'Supported' },
    { id: 'l2', source: 'capcheck', target: 'fallback', label: 'Not supported' },
    { id: 'l3', source: 'challenge', target: 'bioprompt' },
    { id: 'l4', source: 'bioprompt', target: 'verify', label: 'Success' },
    { id: 'l5', source: 'bioprompt', target: 'counter', label: 'Failure' },
    { id: 'l6', source: 'counter', target: 'fallback', label: 'Threshold check' },
    { id: 'l7', source: 'verify', target: 'token', label: 'Valid' },
    { id: 'l8', source: 'fallback', target: 'pinflow', label: 'count >= 3' },
  ],
};

const MINDMAP_DIAGRAM: FlowDiagram = {
  direction: 'LR',
  nodes: [
    { id: 'root', label: 'Authentication', type: 'topic', x: 300, y: 200 },
    { id: 'bio', label: 'Biometric Login', type: 'topic', x: 560, y: 60 },
    { id: 'pin', label: 'PIN Fallback', type: 'topic', x: 560, y: 160 },
    { id: 'otp', label: 'OTP Step-up', type: 'topic', x: 560, y: 260 },
    { id: 'session', label: 'Session Mgmt', type: 'topic', x: 560, y: 360 },
    { id: 'faceid', label: 'Face ID', type: 'default', x: 780, y: 0 },
    { id: 'touchid', label: 'Touch ID', type: 'default', x: 780, y: 60 },
    { id: 'challenge', label: 'Challenge/Response', type: 'default', x: 780, y: 120 },
    { id: 'counter', label: 'Failure Counter', type: 'default', x: 780, y: 180 },
    { id: 'sms', label: 'SMS OTP', type: 'default', x: 780, y: 240 },
    { id: 'totp', label: 'TOTP App', type: 'default', x: 780, y: 300 },
    { id: 'ttl', label: 'Token TTL', type: 'default', x: 780, y: 360 },
    { id: 'refresh', label: 'Refresh Flow', type: 'default', x: 780, y: 420 },
  ],
  edges: [
    { id: 'm1', source: 'root', target: 'bio' },
    { id: 'm2', source: 'root', target: 'pin' },
    { id: 'm3', source: 'root', target: 'otp' },
    { id: 'm4', source: 'root', target: 'session' },
    { id: 'm5', source: 'bio', target: 'faceid' },
    { id: 'm6', source: 'bio', target: 'touchid' },
    { id: 'm7', source: 'bio', target: 'challenge' },
    { id: 'm8', source: 'pin', target: 'counter' },
    { id: 'm9', source: 'otp', target: 'sms' },
    { id: 'm10', source: 'otp', target: 'totp' },
    { id: 'm11', source: 'session', target: 'ttl' },
    { id: 'm12', source: 'session', target: 'refresh' },
  ],
};

const APPFLOW_DIAGRAM: FlowDiagram = {
  direction: 'TB',
  nodes: [
    { id: 'launch', label: 'App Launch', type: 'actor', x: 250, y: 0 },
    { id: 'capcheck', label: 'Capability\nDetection', type: 'decision', x: 250, y: 110 },
    { id: 'bioprompt', label: 'Biometric\nPrompt', type: 'container', x: 120, y: 230 },
    { id: 'pinscreen', label: 'PIN Entry', type: 'container', x: 380, y: 230 },
    { id: 'success', label: 'Auth Success', type: 'system', x: 120, y: 350 },
    { id: 'fail3', label: '3 Failures', type: 'decision', x: 120, y: 460 },
    { id: 'dashboard', label: 'Dashboard', type: 'system', x: 250, y: 560 },
  ],
  edges: [
    { id: 'a1', source: 'launch', target: 'capcheck' },
    { id: 'a2', source: 'capcheck', target: 'bioprompt', label: 'Supported' },
    { id: 'a3', source: 'capcheck', target: 'pinscreen', label: 'Not supported' },
    { id: 'a4', source: 'bioprompt', target: 'success', label: 'Match' },
    { id: 'a5', source: 'bioprompt', target: 'fail3', label: 'No match' },
    { id: 'a6', source: 'fail3', target: 'pinscreen', label: '≥ 3 attempts' },
    { id: 'a7', source: 'success', target: 'dashboard' },
    { id: 'a8', source: 'pinscreen', target: 'dashboard', label: 'Valid PIN' },
  ],
};

const DEPGRAPH_DIAGRAM: FlowDiagram = {
  direction: 'TB',
  nodes: [
    { id: 'auth', label: 'Authentication', type: 'component', x: 250, y: 0 },
    { id: 'device', label: 'Device\nManagement', type: 'component', x: 80, y: 140 },
    { id: 'risk', label: 'Risk & Fraud', type: 'component', x: 420, y: 140 },
    { id: 'notify', label: 'Notifications', type: 'system', x: 80, y: 280 },
    { id: 'audit', label: 'Audit &\nCompliance', type: 'system', x: 420, y: 280 },
  ],
  edges: [
    { id: 'd1', source: 'auth', target: 'device', label: 'Reads bindings' },
    { id: 'd2', source: 'auth', target: 'risk', label: 'Scores' },
    { id: 'd3', source: 'device', target: 'notify', label: 'Alerts' },
    { id: 'd4', source: 'auth', target: 'audit', label: 'Events', animated: true },
    { id: 'd5', source: 'risk', target: 'audit', label: 'Events', animated: true },
    { id: 'd6', source: 'device', target: 'audit', label: 'Events', animated: true },
  ],
};

const CONTEXT_DIAGRAM: FlowDiagram = {
  direction: 'TB',
  nodes: [
    { id: 'customer', label: 'Customer', type: 'actor', x: 250, y: 0, subtitle: 'End user' },
    { id: 'mobile', label: 'Mobile Banking\nApp', type: 'container', x: 250, y: 130, subtitle: 'FinEdge V2' },
    { id: 'gateway', label: 'OAuth Gateway', type: 'system', x: 60, y: 280, subtitle: 'Existing infra' },
    { id: 'auth', label: 'Auth Service', type: 'component', x: 250, y: 280, subtitle: 'New (scope)' },
    { id: 'devicereg', label: 'Device Registry', type: 'component', x: 440, y: 280, subtitle: 'New (scope)' },
    { id: 'risk', label: 'Risk Engine', type: 'system', x: 60, y: 420, subtitle: 'Existing' },
    { id: 'audit', label: 'Audit Bus', type: 'system', x: 250, y: 420, subtitle: 'Existing' },
    { id: 'notify', label: 'Notification\nService', type: 'system', x: 440, y: 420, subtitle: 'Existing' },
  ],
  edges: [
    { id: 'cx1', source: 'customer', target: 'mobile', label: 'Uses' },
    { id: 'cx2', source: 'mobile', target: 'gateway' },
    { id: 'cx3', source: 'mobile', target: 'auth', label: 'Biometric flow' },
    { id: 'cx4', source: 'auth', target: 'devicereg', label: 'Verify binding' },
    { id: 'cx5', source: 'auth', target: 'risk', label: 'Score' },
    { id: 'cx6', source: 'auth', target: 'audit', animated: true },
    { id: 'cx7', source: 'devicereg', target: 'notify', animated: true },
  ],
};

// ═══════════════════════════════ ARTIFACTS ════════════════════════════════════

export const GENERATED_ARTIFACTS = (): ArchArtifact[] => [
  // ── Product ────────────────────────────────────────────────────────────────
  {
    id: 'art-prd',
    group: 'Product',
    label: 'PRD',
    body:
      '# Mobile Banking V2 — Biometric Authentication\n\n' +
      '## Vision\n' +
      'Enable one-tap biometric login for retail banking customers, reducing friction while maintaining security posture equivalent to or exceeding PIN-based authentication.\n\n' +
      '## Problem Statement\n' +
      'Current PIN-based login averages 8.2 seconds and drives 12% session abandonment on the login screen. Competitor apps offer biometric login, creating a differentiation gap.\n\n' +
      '## Success Metrics\n' +
      '• Login time reduced to < 2 seconds (p95)\n' +
      '• Session abandonment at login drops below 4%\n' +
      '• Biometric adoption > 60% of eligible users within 90 days\n' +
      '• Zero security regressions — no unauthorized access attributable to biometrics\n\n' +
      '## Scope\n' +
      'In-scope: biometric authentication, device registration, failure-counter fallback, secure PIN backup.\n' +
      'Out-of-scope: voice authentication, behavioral biometrics, cross-device session migration.\n\n' +
      '## Section 6.2 — Biometric Login Flow\n' +
      'Registered customers may authenticate with platform biometrics (Face ID, Touch ID, Android BiometricPrompt). PIN remains available as fallback and is required after three consecutive failures. No biometric template ever leaves the device.',
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
      '# Functional Requirements Document\n\n' +
      '## Authentication Requirements\n' +
      'FR-01  Detect biometric capability on launch using platform APIs (BiometricManager / LAContext).\n' +
      'FR-02  Register a device against the customer record with a unique device fingerprint.\n' +
      'FR-03  Exchange a local biometric assertion for a session token (JWT, 15-min TTL).\n' +
      'FR-04  Count consecutive failures per device; fall back to PIN at three.\n' +
      'FR-05  Hide biometric entry points on unsupported or rooted/jailbroken devices.\n\n' +
      '## Device Management Requirements\n' +
      'FR-06  Allow customers to name registered devices for identification.\n' +
      'FR-07  Revoke device from any active session; revoked devices cannot re-enrol without PIN.\n' +
      'FR-08  Display all registered devices in account settings with last-used timestamp.\n\n' +
      '## Security Requirements\n' +
      'FR-09  All biometric challenges are single-use with 60-second TTL.\n' +
      'FR-10  Publish a SecurityEvent on every threshold breach.\n' +
      'FR-11  Rate-limit challenge requests to 5 per minute per device.\n' +
      'FR-12  Require re-authentication for device revocation.\n\n' +
      '## Observability\n' +
      'FR-13  Emit structured logs for every auth attempt (success, failure, fallback trigger).\n' +
      'FR-14  Expose Prometheus metrics: auth_attempts_total, auth_failures_total, fallback_triggers_total.',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },
  {
    id: 'art-nfr',
    group: 'Product',
    label: 'Non-functional Requirements',
    body:
      '# Non-functional Requirements\n\n' +
      '## Performance\n' +
      '• P50 login latency: < 1.5s (network + server + client combined)\n' +
      '• P95 login latency: < 2.5s\n' +
      '• Challenge generation: < 50ms server-side\n' +
      '• Token issuance: < 100ms server-side\n\n' +
      '## Availability & Reliability\n' +
      '• Monthly availability: 99.95% (measured at the gateway)\n' +
      '• RTO: 15 minutes · RPO: 0 (synchronous replication)\n' +
      '• Graceful degradation: PIN path remains functional during Auth Service outage\n\n' +
      '## Security & Compliance\n' +
      '• Encryption: TLS 1.3 in transit, AES-256-GCM at rest\n' +
      '• Audit events retained for 7 years (regulatory requirement)\n' +
      '• No biometric templates stored server-side — device-bound only\n' +
      '• PCI-DSS v4.0 compliant credential handling\n\n' +
      '## Accessibility\n' +
      '• WCAG 2.2 AA compliance for all auth screens\n' +
      '• Screen reader announcements for biometric prompt state changes\n\n' +
      '## Scalability\n' +
      '• Support 50,000 concurrent auth sessions\n' +
      '• Horizontal scaling via stateless service design + Redis-backed counters',
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
      '# Business Rules\n\n' +
      '## Authentication Rules\n' +
      'BR-01  Three consecutive biometric failures on a device force PIN authentication.\n' +
      'BR-02  A revoked device may never authenticate biometrically until explicitly re-enrolled.\n' +
      'BR-03  Rooted or jailbroken devices are never offered biometrics; PIN remains available.\n' +
      'BR-04  Failure counter resets on any successful authentication (biometric or PIN).\n\n' +
      '## Enrollment Rules\n' +
      'BR-05  A customer may register a maximum of 5 devices simultaneously.\n' +
      'BR-06  New device registration requires a valid PIN authentication first.\n' +
      'BR-07  Registration is device-bound — changing the biometric set (e.g., adding a fingerprint) invalidates enrollment.\n\n' +
      '## Session Rules\n' +
      'BR-08  Session tokens have a 15-minute TTL; refresh tokens have a 7-day TTL.\n' +
      'BR-09  Concurrent sessions from the same device are collapsed (latest wins).\n' +
      'BR-10  High-risk operations (transfers > $5000) require step-up regardless of session validity.',
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
      '# User Journeys\n\n' +
      '## Journey 1: Returning Customer — One-Tap Login\n' +
      'Pre: Customer has a registered device with enrolled biometrics.\n' +
      '1. Customer opens app → biometric prompt appears within 500ms\n' +
      '2. Customer authenticates via Face ID / Touch ID\n' +
      '3. App receives session token → navigates to dashboard\n' +
      'Post: Session active, failure counter stays at 0.\n\n' +
      '## Journey 2: New Device — Register & Enrol\n' +
      'Pre: Customer on an unregistered device.\n' +
      '1. Customer authenticates via PIN\n' +
      '2. App prompts "Enable biometric login?"\n' +
      '3. Customer accepts → device fingerprint registered\n' +
      '4. Future logins offer biometric prompt\n' +
      'Post: Device in registry, enrollment reference stored on device.\n\n' +
      '## Journey 3: Locked Out — Three Failures\n' +
      'Pre: Customer has a registered device.\n' +
      '1. Biometric fails (1st, 2nd attempt) → retry prompt\n' +
      '2. Biometric fails (3rd attempt) → security event published\n' +
      '3. App presents PIN entry with "Biometric temporarily unavailable" message\n' +
      '4. Successful PIN resets the counter\n' +
      'Post: Counter reset, biometric available again on next login.\n\n' +
      '## Journey 4: Lost Device — Remote Revoke\n' +
      'Pre: Customer has multiple devices registered.\n' +
      '1. Customer goes to Settings → Devices on another device\n' +
      '2. Taps "Revoke" on the lost device → confirmation prompt\n' +
      '3. Device record marked revoked; any active session invalidated\n' +
      'Post: Lost device cannot biometrically authenticate. PIN still works for self-service recovery.',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },

  // ── Architecture ───────────────────────────────────────────────────────────
  {
    id: 'art-overview',
    group: 'Architecture',
    label: 'Architecture Overview',
    body:
      '# Architecture Overview\n\n' +
      '## Design Philosophy\n' +
      'The biometric authentication subsystem follows a layered, event-driven architecture where the mobile client owns the biometric lifecycle and the server-side services own identity verification and risk assessment. No biometric template ever leaves the device boundary.\n\n' +
      '## Key Components\n' +
      '• Mobile App (React Native) — client-side biometric orchestration\n' +
      '• OAuth Gateway (Kong) — rate limiting, protocol translation, TLS termination\n' +
      '• Auth Service (Java/Spring Boot) — challenge issuance, assertion verification, token minting\n' +
      '• Device Registry (PostgreSQL) — device bindings, enrollment references, trust scores\n' +
      '• Risk Engine — real-time attempt scoring (velocity, geo, device trust)\n' +
      '• Audit Event Bus (Kafka) — immutable event stream for compliance (7yr retention)\n\n' +
      '## Cross-Cutting Concerns\n' +
      '• Observability: OpenTelemetry traces span the full auth flow from client to token issuance\n' +
      '• Resilience: Circuit breakers on Risk Engine calls; auth completes without scoring if breaker is open\n' +
      '• Security: mTLS between services, secret rotation via Vault, zero-trust network policies',
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
      '# High-Level Design (HLD)\n\n' +
      '## System Topology\n' +
      'Three-tier architecture: Mobile Client → API Gateway → Microservices → Data Stores.\n' +
      'All inter-service communication uses mTLS. External traffic terminates TLS at CDN/WAF.\n\n' +
      '## Service Boundaries\n' +
      '| Service | Responsibility | Tech Stack | Data Store |\n' +
      '|---------|---------------|------------|------------|\n' +
      '| Auth Service | Challenge, verify, token | Java 21 · Spring Boot 3 | PostgreSQL 16 |\n' +
      '| Device Service | Registration, revocation | Java 21 · Spring Boot 3 | PostgreSQL 16 |\n' +
      '| Risk Service | Attempt scoring | Python · FastAPI | Redis (features) |\n' +
      '| Token Service | JWT mint/refresh/revoke | Go | Redis (sessions) |\n\n' +
      '## Section 4.3 — Biometric Login Flow\n' +
      '1. Mobile app performs local capability check (BiometricManager.canAuthenticate)\n' +
      '2. App requests challenge from Auth Service (POST /auth/biometric/challenge)\n' +
      '3. OS-level biometric prompt shown; signed assertion returned to app\n' +
      '4. App sends assertion to Auth Service (POST /auth/biometric/verify)\n' +
      '5. Auth Service validates device binding via Device Registry\n' +
      '6. Auth Service scores attempt via Risk Engine (circuit-breaker protected)\n' +
      '7. Auth Service issues session token (JWT, 15-min TTL) via Token Service\n' +
      '8. Audit event published to Kafka\n\n' +
      '## Failure Handling\n' +
      '• Redis atomic INCR per device:attempt_count with 24h TTL\n' +
      '• Threshold (3) checked after each failed verification\n' +
      '• Successful auth resets counter to 0\n' +
      '• Counter is device-scoped, not user-scoped\n\n' +
      '## Deployment\n' +
      '• Kubernetes (EKS) with namespace isolation per environment\n' +
      '• GitOps via ArgoCD; canary deployments with Flagger\n' +
      '• Database migrations via Flyway; backwards-compatible only',
    versions: 3,
    status: 'Approved',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    changeTag: '~ Changed',
    flowDiagram: HLD_DIAGRAM,
  },
  {
    id: 'art-lld',
    group: 'Architecture',
    label: 'LLD',
    body:
      '# Low-Level Design (LLD)\n\n' +
      '## Component: Biometric Capability Check\n' +
      'Entry: App launch → BiometricManager.canAuthenticate(BIOMETRIC_STRONG)\n' +
      'Result: BIOMETRIC_SUCCESS | BIOMETRIC_ERROR_* | BIOMETRIC_STATUS_*\n' +
      'If not BIOMETRIC_SUCCESS → hide biometric CTA, show PIN only.\n\n' +
      '## Component: Challenge Issuer (Auth Service)\n' +
      'Endpoint: POST /auth/biometric/challenge\n' +
      'Input: { deviceId, customerId }\n' +
      'Process:\n' +
      '  1. Validate device binding exists and is not revoked\n' +
      '  2. Generate cryptographic nonce (32 bytes, SecureRandom)\n' +
      '  3. Store nonce in Redis with key challenge:{deviceId}:{nonce} TTL=60s\n' +
      '  4. Return { challenge: nonce, expiresAt: now+60s }\n\n' +
      '## Component: Assertion Verifier (Auth Service)\n' +
      'Endpoint: POST /auth/biometric/verify\n' +
      'Input: { deviceId, challenge, signedAssertion }\n' +
      'Process:\n' +
      '  1. Retrieve challenge from Redis (fails if expired or missing)\n' +
      '  2. Verify signature against stored device public key\n' +
      '  3. Delete challenge from Redis (single-use)\n' +
      '  4. If valid → reset failure counter, call Token Service\n' +
      '  5. If invalid → increment failure counter (INCR device:{id}:failures)\n' +
      '  6. Check threshold: if counter >= 3 → return fallback_required: true\n\n' +
      '## Component: Failure Counter\n' +
      'Store: Redis\n' +
      'Key: device:{deviceId}:failures\n' +
      'Operations: INCR (on failure), DEL (on success), GET (on threshold check)\n' +
      'TTL: 24 hours (auto-reset if device unused for a day)\n' +
      'Atomicity: INCR is atomic; no race conditions.\n\n' +
      '## Component: Token Issuance\n' +
      'Service: Token Service (Go)\n' +
      'Token: JWT signed with RS256 (key rotation every 90 days)\n' +
      'Claims: { sub, deviceId, iat, exp(15m), jti, scope: ["banking:read", "banking:write"] }\n' +
      'Refresh: Opaque token stored in Redis, 7-day TTL, rotated on use.',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    flowDiagram: LLD_DIAGRAM,
  },
  {
    id: 'art-c4',
    group: 'Architecture',
    label: 'C4',
    body:
      '# C4 Model\n\n' +
      '## Level 1 — System Context\n' +
      'FinEdge Mobile Banking exists within the Northstar Digital Banking estate. External actors:\n' +
      '• Customer (person) — uses the mobile app for banking\n' +
      '• Regulatory Body — receives compliance reports\n' +
      '• Partner APIs — card networks, payment rails (out of scope for auth)\n\n' +
      '## Level 2 — Container Diagram\n' +
      '| Container | Technology | Purpose |\n' +
      '|-----------|-----------|----------|\n' +
      '| Mobile App | React Native | Client-side UX and biometric orchestration |\n' +
      '| OAuth Gateway | Kong | Protocol translation, rate limiting, TLS termination |\n' +
      '| Auth Service | Java/Spring Boot | Challenge/verify, session management |\n' +
      '| Device Registry | Java/Spring Boot | Device lifecycle, trust scoring |\n' +
      '| Risk Engine | Python/FastAPI | Real-time fraud/risk scoring |\n' +
      '| Audit Bus | Kafka | Immutable event streaming for compliance |\n' +
      '| Token Store | Redis | Session tokens, failure counters |\n' +
      '| Identity DB | PostgreSQL | Devices, enrollments, audit trail |\n\n' +
      '## Level 3 — Component (Auth Service)\n' +
      '• ChallengeIssuer — generates and stores single-use challenges\n' +
      '• AssertionVerifier — validates device signatures against stored public keys\n' +
      '• FailureCounter — Redis-backed atomic counter with threshold logic\n' +
      '• TokenMinter — delegates to Token Service for JWT creation\n' +
      '• AuditPublisher — emits structured events to Kafka topic auth.events\n\n' +
      '## Level 4 — Code (key classes)\n' +
      '• BiometricChallengeController (REST entry)\n' +
      '• ChallengeService → NonceGenerator, RedisRepository\n' +
      '• VerificationService → SignatureValidator, DeviceBindingRepository\n' +
      '• FailureCounterService → RedisAtomicCounter\n' +
      '• AuthEventPublisher → KafkaTemplate<AuthEvent>',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    note: 'Context, Container, Component, and Code levels.',
    diagramFlow: ['Mobile App', 'OAuth Gateway', 'Auth Service', 'Device Registry'],
    flowDiagram: C4_DIAGRAM,
  },
  {
    id: 'art-sequence',
    group: 'Architecture',
    label: 'Sequence Diagrams',
    body:
      '# Sequence Diagrams\n\n' +
      '## BIO-LOGIN-01: Successful Biometric Authentication\n' +
      '```\n' +
      'Customer → Mobile App     : Tap login\n' +
      'Mobile App → OS Biometric : requestAuthentication()\n' +
      'OS Biometric → Mobile App : signedAssertion\n' +
      'Mobile App → Auth Service : POST /auth/biometric/verify\n' +
      'Auth Service → Device Reg : validateBinding(deviceId)\n' +
      'Device Reg → Auth Service : binding valid\n' +
      'Auth Service → Risk Engine: scoreAttempt(context)\n' +
      'Risk Engine → Auth Service: score: 0.12 (low risk)\n' +
      'Auth Service → Token Svc  : issueToken(claims)\n' +
      'Token Svc → Auth Service  : JWT + refresh token\n' +
      'Auth Service → Audit Bus  : publish(AuthSuccess)\n' +
      'Auth Service → Mobile App : 200 { token, refreshToken }\n' +
      'Mobile App → Customer     : Dashboard displayed\n' +
      '```\n\n' +
      '## BIO-LOGIN-02: Third Failure — Fallback to PIN\n' +
      '```\n' +
      'Customer → Mobile App     : Tap login\n' +
      'Mobile App → OS Biometric : requestAuthentication()\n' +
      'OS Biometric → Mobile App : ERROR_FAILED\n' +
      'Mobile App → Auth Service : POST /auth/biometric/verify (failure report)\n' +
      'Auth Service → Redis      : INCR device:{id}:failures → 3\n' +
      'Auth Service → Audit Bus  : publish(ThresholdBreached)\n' +
      'Auth Service → Mobile App : 200 { fallback_required: true }\n' +
      'Mobile App → Customer     : Show PIN entry screen\n' +
      '```\n\n' +
      '## BIO-LOGIN-03: Device Registration\n' +
      '```\n' +
      'Customer → Mobile App     : Settings → Enable Biometric\n' +
      'Mobile App → Auth Service : authenticated session required\n' +
      'Mobile App → OS Biometric : generateKeyPair()\n' +
      'OS Biometric → Mobile App : publicKey\n' +
      'Mobile App → Device Reg   : POST /devices/register { publicKey, fingerprint }\n' +
      'Device Reg → Audit Bus    : publish(DeviceRegistered)\n' +
      'Device Reg → Mobile App   : 201 { deviceId }\n' +
      'Mobile App → Customer     : "Biometric login enabled"\n' +
      '```',
    versions: 2,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Customer', 'Mobile App', 'Biometric API', 'Auth Service', 'Token Service'],
    flowDiagram: SEQUENCE_DIAGRAM,
  },
  {
    id: 'art-integration',
    group: 'Architecture',
    label: 'Integration Map',
    body:
      '# Integration Map\n\n' +
      '## Synchronous Integrations\n' +
      '| Source | Target | Protocol | SLA | Circuit Breaker |\n' +
      '|--------|--------|----------|-----|----------------|\n' +
      '| Auth Service | Device Registry | gRPC/mTLS | p99 < 50ms | Yes (50% threshold) |\n' +
      '| Auth Service | Risk Engine | REST/mTLS | p99 < 200ms | Yes (30% threshold) |\n' +
      '| Auth Service | Token Service | gRPC/mTLS | p99 < 30ms | No (critical path) |\n\n' +
      '## Asynchronous Integrations\n' +
      '| Source | Target | Transport | Topic | Partitions |\n' +
      '|--------|--------|-----------|-------|------------|\n' +
      '| Auth Service | Audit Bus | Kafka | auth.events | 12 |\n' +
      '| Device Registry | Audit Bus | Kafka | device.events | 6 |\n' +
      '| Device Registry | Notifications | Kafka | notification.requests | 6 |\n' +
      '| Risk Engine | Audit Bus | Kafka | risk.events | 6 |\n\n' +
      '## External Dependencies\n' +
      '• Apple Push Notification Service (APNs) — via Notification Service\n' +
      '• Firebase Cloud Messaging (FCM) — via Notification Service\n' +
      '• HashiCorp Vault — secret management for all services\n\n' +
      '## Failure Modes\n' +
      '• Risk Engine down → auth proceeds without scoring (degraded mode, flag in audit)\n' +
      '• Device Registry down → auth fails (hard dependency)\n' +
      '• Kafka unavailable → events buffered locally, replayed on recovery',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Auth Service', 'Risk Engine', 'Audit Bus'],
    flowDiagram: INTEGRATION_MAP,
  },

  // ── Contracts ──────────────────────────────────────────────────────────────
  {
    id: 'art-openapi',
    group: 'Contracts',
    label: 'OpenAPI',
    body:
      '# OpenAPI Specification (v3.1.0)\n\n' +
      '## Auth Service Endpoints\n' +
      '```yaml\n' +
      'paths:\n' +
      '  /auth/biometric/challenge:\n' +
      '    post:\n' +
      '      summary: Request biometric challenge\n' +
      '      requestBody: { deviceId: string, customerId: string }\n' +
      '      responses:\n' +
      '        200: { challenge: string, expiresAt: ISO8601 }\n' +
      '        404: Device not registered\n' +
      '        429: Rate limit exceeded\n\n' +
      '  /auth/biometric/verify:\n' +
      '    post:\n' +
      '      summary: Verify biometric assertion\n' +
      '      requestBody: { deviceId, challenge, signedAssertion }\n' +
      '      responses:\n' +
      '        200: { token, refreshToken, fallback_required? }\n' +
      '        401: Invalid assertion\n' +
      '        410: Challenge expired\n\n' +
      '  /devices/register:\n' +
      '    post:\n' +
      '      summary: Register new device\n' +
      '      security: [BearerAuth]\n' +
      '      requestBody: { publicKey, fingerprint, deviceName }\n' +
      '      responses:\n' +
      '        201: { deviceId, registeredAt }\n' +
      '        409: Device already registered\n\n' +
      '  /devices/{deviceId}:\n' +
      '    delete:\n' +
      '      summary: Revoke device\n' +
      '      security: [BearerAuth, StepUp]\n' +
      '      responses:\n' +
      '        204: Device revoked\n' +
      '        404: Device not found\n' +
      '```\n\n' +
      '## Authentication Schemes\n' +
      '• BearerAuth: JWT in Authorization header\n' +
      '• StepUp: requires recent PIN/biometric verification (< 5 min)',
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
    body:
      '# Event Contracts\n\n' +
      '## Event Schema (CloudEvents v1.0 envelope)\n' +
      'All events follow CloudEvents spec with the following extensions:\n' +
      '• ce-tenantid: string — multi-tenant correlation\n' +
      '• ce-severity: info | warning | critical\n\n' +
      '## Domain Events\n\n' +
      '### DeviceRegistered\n' +
      '```json\n' +
      '{ "customerId": "uuid", "deviceId": "uuid", "fingerprint": "sha256",\n' +
      '  "deviceName": "iPhone 15 Pro", "occurredAt": "ISO8601" }\n' +
      '```\n\n' +
      '### BiometricEnrolled\n' +
      '```json\n' +
      '{ "customerId": "uuid", "deviceId": "uuid", "biometricType": "FACE_ID",\n' +
      '  "enrollmentRef": "opaque-handle", "occurredAt": "ISO8601" }\n' +
      '```\n\n' +
      '### BiometricFailureThresholdReached\n' +
      '```json\n' +
      '{ "customerId": "uuid", "deviceId": "uuid", "failureCount": 3,\n' +
      '  "lastFailureReason": "SIGNATURE_MISMATCH", "occurredAt": "ISO8601" }\n' +
      '```\n' +
      'Severity: warning\n\n' +
      '### DeviceRevoked\n' +
      '```json\n' +
      '{ "customerId": "uuid", "deviceId": "uuid", "revokedBy": "uuid",\n' +
      '  "reason": "USER_INITIATED | ADMIN_ACTION", "occurredAt": "ISO8601" }\n' +
      '```\n' +
      'Severity: info (user) | critical (admin)\n\n' +
      '## Topic Partitioning\n' +
      'Partition key: customerId (ensures ordering per customer)',
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
      '# Entity-Relationship Model\n\n' +
      '## Entities\n\n' +
      '### CustomerDevice\n' +
      '| Column | Type | Constraints |\n' +
      '|--------|------|------------|\n' +
      '| id | UUID | PK |\n' +
      '| customer_id | UUID | FK → Customer, NOT NULL |\n' +
      '| device_name | VARCHAR(100) | |\n' +
      '| fingerprint | VARCHAR(64) | UNIQUE |\n' +
      '| public_key | TEXT | NOT NULL |\n' +
      '| status | ENUM(active, revoked) | DEFAULT active |\n' +
      '| registered_at | TIMESTAMPTZ | NOT NULL |\n' +
      '| revoked_at | TIMESTAMPTZ | |\n' +
      '| last_used_at | TIMESTAMPTZ | |\n\n' +
      '### AuthAttempt\n' +
      '| Column | Type | Constraints |\n' +
      '|--------|------|------------|\n' +
      '| id | UUID | PK |\n' +
      '| device_id | UUID | FK → CustomerDevice |\n' +
      '| customer_id | UUID | FK → Customer |\n' +
      '| method | ENUM(biometric, pin, otp) | |\n' +
      '| result | ENUM(success, failure, fallback) | |\n' +
      '| risk_score | DECIMAL(4,3) | |\n' +
      '| occurred_at | TIMESTAMPTZ | NOT NULL |\n' +
      '| ip_address | INET | |\n\n' +
      '### BiometricEnrollment\n' +
      '| Column | Type | Constraints |\n' +
      '|--------|------|------------|\n' +
      '| id | UUID | PK |\n' +
      '| device_id | UUID | FK → CustomerDevice, UNIQUE |\n' +
      '| enrollment_ref | VARCHAR(256) | Opaque OS handle |\n' +
      '| biometric_type | ENUM(face, fingerprint) | |\n' +
      '| enrolled_at | TIMESTAMPTZ | NOT NULL |\n\n' +
      '## Relationships\n' +
      '• CustomerDevice (1) ← (many) AuthAttempt\n' +
      '• CustomerDevice (1) ← (1) BiometricEnrollment\n' +
      '• Customer (1) ← (max 5) CustomerDevice\n\n' +
      '## Retention Policy\n' +
      '• AuthAttempt: 7 years (regulatory)\n' +
      '• CustomerDevice: retained until account closure\n' +
      '• BiometricEnrollment: deleted on revocation (no template stored)',
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
    body:
      '# Schema & Data Architecture Notes\n\n' +
      '## Zero Biometric Storage Principle\n' +
      'No biometric template, feature vector, or raw biometric data is ever stored server-side. The BiometricEnrollment.enrollment_ref holds only an opaque OS-issued handle that references the on-device Secure Enclave / TEE key.\n\n' +
      '## Indexing Strategy\n' +
      '• CustomerDevice: composite index on (customer_id, status) for active device lookup\n' +
      '• AuthAttempt: partitioned by occurred_at (monthly) for efficient retention management\n' +
      '• AuthAttempt: index on (device_id, occurred_at DESC) for failure-counter queries\n\n' +
      '## Migration Strategy\n' +
      '• All migrations via Flyway (versioned, forward-only)\n' +
      '• Backwards-compatible: new columns are nullable or have defaults\n' +
      '• Blue-green deployment: old code must still function against new schema\n\n' +
      '## Multi-Tenant Isolation\n' +
      '• Schema-per-tenant for data isolation\n' +
      '• Tenant ID carried in JWT claims and validated at service boundary\n' +
      '• Cross-tenant queries impossible by design (no shared schema access)',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },

  // ── Decisions ──────────────────────────────────────────────────────────────
  {
    id: 'art-stack',
    group: 'Decisions',
    label: 'Technology Recommendation',
    body:
      '# Technology Recommendation\n\n' +
      '## Client\n' +
      '• React Native 0.74+ with New Architecture (Fabric/TurboModules)\n' +
      '• expo-local-authentication for cross-platform biometric abstraction\n' +
      '• react-native-keychain for secure credential storage\n\n' +
      '## Backend Services\n' +
      '• Java 21 (LTS) with Spring Boot 3.3 — Auth Service, Device Service\n' +
      '• Go 1.22 — Token Service (high-throughput, low-latency requirement)\n' +
      '• Python 3.12 + FastAPI — Risk Engine (ML model serving)\n\n' +
      '## Data Stores\n' +
      '• PostgreSQL 16 — primary relational store (devices, attempts, enrollments)\n' +
      '• Redis 7.2 (Cluster) — failure counters, challenge TTL, session cache\n' +
      '• Kafka 3.7 (Confluent) — event streaming with Schema Registry\n\n' +
      '## Infrastructure\n' +
      '• Kubernetes (AWS EKS) — container orchestration\n' +
      '• ArgoCD — GitOps deployment\n' +
      '• Kong — API Gateway with OAuth 2.0 / OIDC plugins\n' +
      '• HashiCorp Vault — secrets management, key rotation\n' +
      '• Prometheus + Grafana + OpenTelemetry — observability stack\n\n' +
      '## Rationale\n' +
      'Existing platform already runs Java/Spring and PostgreSQL — minimizes operational overhead. Go chosen for Token Service due to sub-10ms latency requirement. Redis chosen for counters due to atomic INCR guarantees.',
    versions: 1,
    status: 'Generated',
    confidence: 'low',
    stale: false,
    reviewComments: 1,
  },
  {
    id: 'art-adr',
    group: 'Decisions',
    label: 'ADRs',
    body:
      '# Architecture Decision Records\n\n' +
      '## ADR-001: Reuse Existing OAuth Gateway\n' +
      'Status: Accepted · Date: 2026-07-15\n' +
      'Context: Building a new gateway would delay delivery by 6 weeks and duplicate operational burden.\n' +
      'Decision: Reuse existing Kong gateway; add biometric-specific rate-limit rules.\n' +
      'Consequences: Coupled to Kong version lifecycle; gateway team becomes a dependency.\n\n' +
      '## ADR-002: Device-Bound Enrollment\n' +
      'Status: Accepted · Date: 2026-07-16\n' +
      'Context: Server-stored biometric templates are a high-value target and require regulatory approval.\n' +
      'Decision: Enrollment is device-bound; server stores only an opaque public key.\n' +
      'Consequences: Users must re-enrol on new devices; lost device means re-enrollment after PIN auth.\n\n' +
      '## ADR-003: Centralized Session Audit\n' +
      'Status: Accepted · Date: 2026-07-17\n' +
      'Context: Regulatory requirement for 7-year audit retention of all authentication events.\n' +
      'Decision: All auth events published to Kafka; consumed by immutable event store.\n' +
      'Consequences: Every auth path must emit events; adds ~5ms latency (async, non-blocking).\n\n' +
      '## ADR-004: Platform-Native Biometrics Only\n' +
      'Status: Accepted · Date: 2026-07-18\n' +
      'Context: Third-party biometric SDKs introduce supply-chain risk and privacy concerns.\n' +
      'Decision: Use only iOS LocalAuthentication / Android BiometricPrompt. Never store templates.\n' +
      'Consequences: Limited to biometric types the OS supports; no custom liveness detection.\n\n' +
      '## ADR-005: Redis for Failure Counters\n' +
      'Status: Accepted · Date: 2026-07-20\n' +
      'Context: Failure counter must be atomic, fast, and device-scoped with auto-expiry.\n' +
      'Decision: Redis INCR with 24h TTL. Counter is per-device, not per-customer.\n' +
      'Consequences: Redis becomes a hard dependency for the failure path; mitigated by cluster HA.',
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
      '# Risks and Trade-offs\n\n' +
      '## Technical Risks\n\n' +
      '### R1: OS Biometric Behavior Variance (Medium)\n' +
      'Risk: iOS and Android have different biometric APIs, error codes, and fallback behaviors.\n' +
      'Mitigation: Abstraction layer (expo-local-authentication); comprehensive device matrix testing.\n' +
      'Residual: Edge cases on Android OEM customizations (Samsung, Xiaomi face unlock differences).\n\n' +
      '### R2: Redis Single Point of Failure (Low)\n' +
      'Risk: Redis cluster outage blocks failure-counter checks.\n' +
      'Mitigation: Redis Sentinel + 3-node cluster. Fallback: allow auth without counter check if Redis unreachable (log degraded mode).\n\n' +
      '### R3: Device Binding Replay Attack (Low)\n' +
      'Risk: Stolen device with biometric bypass could authenticate.\n' +
      'Mitigation: Challenge is single-use with 60s TTL; device must present a fresh OS-generated assertion each time.\n\n' +
      '## Trade-offs\n\n' +
      '### T1: Device-Bound vs. Server-Stored Templates\n' +
      'Chose: Device-bound.\n' +
      'Gained: Zero biometric data on servers, simpler compliance, no template storage liability.\n' +
      'Lost: Cannot authenticate on a new device without re-enrollment via PIN.\n\n' +
      '### T2: Async Audit vs. Sync Audit\n' +
      'Chose: Async (Kafka).\n' +
      'Gained: Sub-5ms overhead on auth path; decoupled audit store evolution.\n' +
      'Lost: Eventual consistency — audit record may lag auth by up to 2 seconds under load.\n\n' +
      '### T3: Per-Device Counter vs. Per-Customer Counter\n' +
      'Chose: Per-device.\n' +
      'Gained: A failure on one device does not lock out all devices; isolated impact.\n' +
      'Lost: Attacker with access to 5 devices gets 15 attempts total (mitigated by risk scoring).',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
  },

  // ── Visuals ────────────────────────────────────────────────────────────────
  {
    id: 'art-mindmap',
    group: 'Visuals',
    label: 'Mind Map',
    body:
      '# Authentication Mind Map\n\n' +
      'Central topic: Authentication\n\n' +
      '## Branch 1: Biometric Login\n' +
      '• Face ID (iOS LAContext)\n' +
      '• Touch ID (iOS LAContext)\n' +
      '• Android BiometricPrompt (BIOMETRIC_STRONG)\n' +
      '• Challenge/Response protocol\n' +
      '• Device binding verification\n\n' +
      '## Branch 2: PIN Fallback\n' +
      '• Failure counter threshold (3 attempts)\n' +
      '• Device-scoped counter (Redis INCR)\n' +
      '• Auto-reset on success\n' +
      '• 24h TTL auto-expiry\n\n' +
      '## Branch 3: OTP Step-up\n' +
      '• SMS OTP (6 digits, 5-min TTL)\n' +
      '• TOTP app integration\n' +
      '• Used for high-risk operations\n' +
      '• Not part of standard login flow\n\n' +
      '## Branch 4: Session Management\n' +
      '• JWT access tokens (15-min TTL)\n' +
      '• Refresh tokens (7-day TTL, rotated)\n' +
      '• Concurrent session handling (latest wins per device)\n' +
      '• Token revocation on device revoke',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Authentication', 'Biometric', 'Fallback'],
    flowDiagram: MINDMAP_DIAGRAM,
  },
  {
    id: 'art-appflow',
    group: 'Visuals',
    label: 'App Flow',
    body:
      '# Application Flow Diagram\n\n' +
      '## Primary Flow: Biometric Login\n' +
      'App Launch → Capability Detection → [Supported?]\n' +
      '  → YES: Show Biometric Prompt → [Success?]\n' +
      '    → YES: Issue Token → Dashboard\n' +
      '    → NO: Increment Counter → [Counter >= 3?]\n' +
      '      → YES: Show PIN Entry → [Valid?] → Dashboard\n' +
      '      → NO: Retry Biometric Prompt\n' +
      '  → NO: Show PIN Entry → [Valid?] → Dashboard\n\n' +
      '## Secondary Flow: Device Registration\n' +
      'Settings → Devices → "Enable Biometric" → PIN Auth Required\n' +
      '  → Generate Key Pair → Register with Server → Success → Enable CTA\n\n' +
      '## Edge Cases\n' +
      '• Rooted device detected → PIN only, biometric CTA hidden\n' +
      '• Revoked device → PIN only, "Biometric unavailable" message\n' +
      '• OS biometric changed → Enrollment invalidated → Re-enrollment required\n' +
      '• Network offline → Cached session valid? → Dashboard (read-only)',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Launch', 'Capability check', 'Biometric prompt', 'Dashboard'],
    flowDiagram: APPFLOW_DIAGRAM,
  },
  {
    id: 'art-depgraph',
    group: 'Visuals',
    label: 'Dependency Graph',
    body:
      '# Module Dependency Graph\n\n' +
      '## Direct Dependencies\n' +
      '• Authentication → Device Management (reads bindings, validates enrollment)\n' +
      '• Authentication → Risk & Fraud (scores each attempt, circuit-breaker protected)\n' +
      '• Device Management → Notifications (alerts on new device, revocation)\n' +
      '• All modules → Audit & Compliance (event streaming, immutable trail)\n\n' +
      '## Dependency Rules\n' +
      '• No circular dependencies allowed\n' +
      '• Audit module has zero outbound dependencies (pure sink)\n' +
      '• Notifications is fire-and-forget (no blocking calls)\n\n' +
      '## Coupling Analysis\n' +
      '| Module | Afferent (in) | Efferent (out) | Instability |\n' +
      '|--------|:---:|:---:|:---:|\n' +
      '| Authentication | 0 | 2 | 1.00 (most unstable) |\n' +
      '| Device Mgmt | 1 | 2 | 0.67 |\n' +
      '| Risk & Fraud | 1 | 1 | 0.50 |\n' +
      '| Notifications | 1 | 0 | 0.00 (most stable) |\n' +
      '| Audit | 4 | 0 | 0.00 (most stable) |',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Device Mgmt', 'Authentication', 'Risk & Fraud'],
    flowDiagram: DEPGRAPH_DIAGRAM,
  },
  {
    id: 'art-context',
    group: 'Visuals',
    label: 'System Context',
    body:
      '# System Context Diagram\n\n' +
      '## Actors & Systems\n' +
      '• Customer (Person) — retail banking user accessing via mobile app\n' +
      '• Mobile Banking App — FinEdge V2, React Native client\n' +
      '• OAuth Gateway — existing infrastructure, handles all inbound traffic\n' +
      '• Auth Service — NEW, handles biometric challenge/verify\n' +
      '• Device Registry — NEW, manages device lifecycle\n' +
      '• Risk Engine — existing, extended with biometric-specific scoring rules\n' +
      '• Audit Event Bus — existing Kafka cluster, new topics added\n' +
      '• Notification Service — existing, new event types consumed\n\n' +
      '## Boundary Definition\n' +
      'Inside project boundary (new/modified): Auth Service, Device Registry, Mobile App biometric module.\n' +
      'Outside boundary (existing, consumed as-is): Gateway, Risk Engine, Audit Bus, Notification Service.\n\n' +
      '## Data Flows\n' +
      '• Customer → Mobile App: biometric assertion (local, never transmitted)\n' +
      '• Mobile App → Auth Service: challenge request, signed assertion\n' +
      '• Auth Service → Device Registry: binding validation\n' +
      '• Auth Service → Risk Engine: attempt context for scoring\n' +
      '• Auth Service → Audit Bus: all auth events (async)\n' +
      '• Device Registry → Notification Service: device lifecycle events (async)',
    versions: 1,
    status: 'Generated',
    confidence: 'high',
    stale: false,
    reviewComments: 0,
    diagramFlow: ['Customer', 'Mobile App', 'Auth Service', 'Audit Bus'],
    flowDiagram: CONTEXT_DIAGRAM,
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

/**
 * Stories are delivery records, not Spec AI internals: the same thirty rows power
 * Stage 5, the project delivery view, My Delivery and the Command Centre card.
 * Locking the module map hands them over rather than minting a parallel set —
 * there is one backlog, so there is one list of it.
 *
 * Copied on the way out so a mutation in the workspace cannot reach back into the
 * seed.
 */
export const GENERATED_STORIES = (): UserStory[] =>
  DELIVERY_STORIES.map((s) => ({ ...s, acceptance: s.acceptance.map((a) => ({ ...a })) }));
