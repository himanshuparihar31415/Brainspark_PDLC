import { ArchArtifact, FlowDiagram, ModuleNode, UserStory } from '../types/specai';
import { DELIVERY_STORIES } from './deliveryData';

/**
 * Payloads produced when a stage locks. They live apart from the initial state
 * deliberately: nothing downstream exists until the upstream version is locked,
 * so the artifact package is generated on locking Understanding, the module map
 * on approving artifacts, and the stories on finalizing the map.
 */

// ═══════════════════════════════ FLOW DIAGRAMS ═══════════════════════════════


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
      'Registered customers may authenticate with platform biometrics (Face ID, Touch ID, Android BiometricPrompt). PIN remains available as fallback and is required after three consecutive failures. No biometric template ever leaves the device.\n\n' +
      '## 7. Functional Requirements\n' +
      'FR-01  Detect biometric capability on launch using platform APIs (BiometricManager / LAContext).\n' +
      'FR-02  Register a device against the customer record with a unique device fingerprint.\n' +
      'FR-03  Exchange a local biometric assertion for a session token (JWT, 15-min TTL).\n' +
      'FR-04  Count consecutive failures per device; fall back to PIN at three.\n' +
      'FR-05  Hide biometric entry points on unsupported or rooted/jailbroken devices.\n' +
      'FR-06  Allow customers to name registered devices for identification.\n' +
      'FR-07  Revoke a device from any active session; revoked devices cannot re-enrol without PIN.\n' +
      'FR-08  Display all registered devices in account settings with a last-used timestamp.\n' +
      'FR-09  Issue single-use biometric challenges with a 60-second TTL.\n' +
      'FR-10  Publish a SecurityEvent on every threshold breach.\n' +
      'FR-11  Rate-limit challenge requests to 5 per minute per device.\n' +
      'FR-12  Require re-authentication for device revocation.\n\n' +
      '## 8. Non-functional Requirements\n' +
      '**Performance** — p50 login under 1.5s, p95 under 2.5s; challenge generation under 50ms server-side.\n' +
      '**Availability** — 99.95% monthly at the gateway. RTO 15 minutes, RPO 0. The PIN path stays functional during an Auth Service outage.\n' +
      '**Security** — TLS 1.3 in transit, AES-256-GCM at rest. Audit events retained seven years. No biometric template is ever stored server-side.\n' +
      '**Accessibility** — WCAG 2.2 AA on every authentication screen, including screen-reader announcements for prompt state changes.\n' +
      '**Scale** — 50,000 concurrent authentication sessions, stateless services with Redis-backed counters.',
    versions: 2,
    status: 'In review',
    confidence: 'high',
    stale: false,
    reviewComments: 2,
    changeTag: '~ Changed',
  },

  // ── Architecture ───────────────────────────────────────────────────────────
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

  // ── Decisions ──────────────────────────────────────────────────────────────
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

  // ── Visuals ────────────────────────────────────────────────────────────────
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
