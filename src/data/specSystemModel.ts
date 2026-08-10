/**
 * The current system, as a graph — and the reconciliation layer over it.
 *
 * This is not the specification taxonomy. That is a checklist of what a document
 * should say, identical for every problem. This is *this* system: its screens,
 * services, endpoints, entities, repositories and tests, and how they connect.
 * The problem statement selects a subgraph of it.
 *
 * The important part is not the nodes, it is what a source is *entitled to
 * assert*. Code and a running app can only tell you what is true now. Tests tell
 * you what is true and checked. Jira and documents tell you what somebody asked
 * for. Architecture tells you what the design permits. Treating those as four
 * competing opinions is what produces a confidently wrong specification; treating
 * them as answers to four different questions is what makes drift legible.
 */

export type SysKind =
  | 'ticket'
  | 'app'
  | 'service'
  | 'screen'
  | 'endpoint'
  | 'entity'
  | 'repo'
  | 'test'
  | 'flow';

export type EdgeKind = 'contains' | 'calls' | 'reads' | 'writes' | 'renders' | 'covers';

export interface SysNode {
  id: string;
  label: string;
  kind: SysKind;
  /** Which connected system this was discovered through. */
  system: string;
  detail?: string;
  /** Not in the codebase — the problem statement is asking for it. */
  proposed?: boolean;
}

export interface SysEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

/* ─────────────────────── authority and lifecycle ─────────────────────── */

/** What a source is entitled to assert. */
export type Authority = 'observed' | 'verified' | 'intended' | 'permitted';

export const AUTHORITY_COPY: Record<Authority, { label: string; says: string }> = {
  observed: { label: 'Observed', says: 'what is true now' },
  verified: { label: 'Verified', says: 'true and checked by a test' },
  intended: { label: 'Intended', says: 'what someone asked for' },
  permitted: { label: 'Permitted', says: 'what the design allows' },
};

/**
 * Where a fact sits in its own life. `planned-not-built` is the one that matters:
 * a ticket describing something that was never implemented reads as current state
 * unless it is called out, and that is the single most common way one of these
 * specifications ends up confidently wrong.
 */
export type Lifecycle =
  | 'active'
  | 'planned-not-built'
  | 'deprecated'
  | 'requested'
  | 'inferred'
  | 'decided';

export interface Fact {
  id: string;
  nodeId: string;
  /** The thing being asserted about, e.g. "session timeout". */
  property: string;
  value: string;
  authority: Authority;
  lifecycle: Lifecycle;
  /** Which connected system, and where in it. */
  system: string;
  locator: string;
  /** What would fail if this stopped being true. Absent means unverifiable. */
  check?: string;
  /** Facts drawn from the same origin do not count as independent agreement. */
  origin?: string;
}

/**
 * Which projects this model actually describes.
 *
 * The graph below is one system — a mobile bank's authentication stack. Showing
 * it for a project it has nothing to do with is worse than showing nothing,
 * because it is confident and wrong, which is the exact failure the whole
 * reconciliation layer exists to prevent. Anything not listed here gets an
 * empty state and says so.
 */
export const MODELLED_PROJECTS = ['p-mobile-v2'];

export const hasSystemModel = (projectId: string): boolean =>
  MODELLED_PROJECTS.includes(projectId);

/* ─────────────────────────── the mock system ─────────────────────────── */

export const NODES: SysNode[] = [
  {
    id: 'jira-epic',
    label: 'AUTH-40 Authentication',
    kind: 'ticket',
    system: 'Jira',
    detail: 'epic · 5 open',
  },
  {
    id: 'jira-biometric',
    label: 'AUTH-61 Biometric login',
    kind: 'ticket',
    system: 'Jira',
    detail: 'story · refinement',
  },
  {
    id: 'jira-sec',
    label: 'SEC-402 Session policy',
    kind: 'ticket',
    system: 'Jira',
    detail: 'story · open',
  },
  { id: 'app-mobile', label: 'Mobile App', kind: 'app', system: 'Apps', detail: 'iOS · Android' },

  { id: 'scr-login', label: 'Login Screen', kind: 'screen', system: 'Apps' },
  { id: 'scr-pin', label: 'PIN Fallback', kind: 'screen', system: 'Apps' },
  { id: 'scr-device', label: 'Device Registration', kind: 'screen', system: 'Apps' },
  {
    id: 'scr-biometric',
    label: 'Biometric Prompt',
    kind: 'screen',
    system: 'Apps',
    proposed: true,
    detail: 'does not exist yet',
  },

  { id: 'svc-auth', label: 'Auth Service', kind: 'service', system: 'Code', detail: 'Java · Spring' },
  { id: 'svc-device', label: 'Device Registry', kind: 'service', system: 'Code' },
  { id: 'svc-profile', label: 'Customer Profile', kind: 'service', system: 'Code' },
  { id: 'svc-risk', label: 'Risk Engine', kind: 'service', system: 'Code' },
  { id: 'svc-notify', label: 'Notification Service', kind: 'service', system: 'Code' },
  { id: 'svc-secmon', label: 'Security Monitoring', kind: 'service', system: 'Code' },
  { id: 'gw-oauth', label: 'OAuth Gateway', kind: 'service', system: 'Code' },

  { id: 'api-verify', label: 'POST /auth/verify', kind: 'endpoint', system: 'Code' },
  { id: 'api-token', label: 'POST /auth/token', kind: 'endpoint', system: 'Code' },
  { id: 'api-devices', label: 'GET /devices', kind: 'endpoint', system: 'Code' },
  { id: 'api-register', label: 'POST /devices/register', kind: 'endpoint', system: 'Code' },
  { id: 'api-profile', label: 'PATCH /profile', kind: 'endpoint', system: 'Code' },
  {
    id: 'api-biometric',
    label: 'POST /auth/biometric',
    kind: 'endpoint',
    system: 'Code',
    proposed: true,
  },

  { id: 'ent-customer', label: 'Customer', kind: 'entity', system: 'Code' },
  { id: 'ent-device', label: 'Device', kind: 'entity', system: 'Code' },
  { id: 'ent-session', label: 'Session', kind: 'entity', system: 'Code' },
  { id: 'ent-attempt', label: 'AuthAttempt', kind: 'entity', system: 'Code' },

  { id: 'repo-mobile', label: 'mobile-app', kind: 'repo', system: 'Code' },
  { id: 'repo-auth', label: 'authentication-service', kind: 'repo', system: 'Code' },
  { id: 'repo-device', label: 'device-registry', kind: 'repo', system: 'Code' },

  { id: 'tst-oauth', label: 'OAuth suite', kind: 'test', system: 'Code', detail: '38 cases' },
  { id: 'tst-pin', label: 'PIN fallback suite', kind: 'test', system: 'Code', detail: '12 cases' },
  { id: 'tst-session', label: 'Session timeout', kind: 'test', system: 'Code', detail: '4 cases' },
  { id: 'tst-device', label: 'Device registration', kind: 'test', system: 'Code', detail: '9 cases' },

  { id: 'flow-login', label: 'Login journey', kind: 'flow', system: 'Flows' },
  { id: 'flow-recover', label: 'Recovery journey', kind: 'flow', system: 'Flows' },
  {
    id: 'flow-enrol',
    label: 'Enrolment journey',
    kind: 'flow',
    system: 'Flows',
    proposed: true,
    detail: 'does not exist yet',
  },
];

export const EDGES: SysEdge[] = [
  { from: 'jira-epic', to: 'jira-biometric', kind: 'contains' },
  { from: 'jira-epic', to: 'jira-sec', kind: 'contains' },
  { from: 'jira-biometric', to: 'scr-biometric', kind: 'covers' },
  { from: 'jira-biometric', to: 'svc-auth', kind: 'covers' },
  { from: 'jira-sec', to: 'ent-session', kind: 'covers' },
  { from: 'app-mobile', to: 'scr-login', kind: 'contains' },
  { from: 'app-mobile', to: 'scr-pin', kind: 'contains' },
  { from: 'app-mobile', to: 'scr-device', kind: 'contains' },
  { from: 'app-mobile', to: 'scr-biometric', kind: 'contains' },
  { from: 'repo-mobile', to: 'app-mobile', kind: 'contains' },

  { from: 'flow-login', to: 'scr-login', kind: 'renders' },
  { from: 'flow-login', to: 'scr-pin', kind: 'renders' },
  { from: 'flow-recover', to: 'scr-pin', kind: 'renders' },
  { from: 'flow-enrol', to: 'scr-biometric', kind: 'renders' },
  { from: 'flow-enrol', to: 'scr-device', kind: 'renders' },

  { from: 'scr-login', to: 'api-verify', kind: 'calls' },
  { from: 'scr-pin', to: 'api-verify', kind: 'calls' },
  { from: 'scr-device', to: 'api-register', kind: 'calls' },
  { from: 'scr-biometric', to: 'api-biometric', kind: 'calls' },

  { from: 'gw-oauth', to: 'api-verify', kind: 'calls' },
  { from: 'svc-auth', to: 'api-verify', kind: 'contains' },
  { from: 'svc-auth', to: 'api-token', kind: 'contains' },
  { from: 'svc-auth', to: 'api-biometric', kind: 'contains' },
  { from: 'svc-device', to: 'api-devices', kind: 'contains' },
  { from: 'svc-device', to: 'api-register', kind: 'contains' },
  { from: 'svc-profile', to: 'api-profile', kind: 'contains' },

  { from: 'repo-auth', to: 'svc-auth', kind: 'contains' },
  { from: 'repo-device', to: 'svc-device', kind: 'contains' },

  { from: 'svc-auth', to: 'ent-session', kind: 'writes' },
  { from: 'svc-auth', to: 'ent-attempt', kind: 'writes' },
  { from: 'svc-auth', to: 'svc-risk', kind: 'calls' },
  { from: 'svc-auth', to: 'svc-device', kind: 'calls' },
  { from: 'svc-device', to: 'ent-device', kind: 'writes' },
  { from: 'svc-profile', to: 'ent-customer', kind: 'writes' },
  { from: 'svc-auth', to: 'svc-secmon', kind: 'calls' },
  { from: 'svc-device', to: 'svc-notify', kind: 'calls' },

  { from: 'tst-oauth', to: 'api-verify', kind: 'covers' },
  { from: 'tst-pin', to: 'scr-pin', kind: 'covers' },
  { from: 'tst-session', to: 'ent-session', kind: 'covers' },
  { from: 'tst-device', to: 'api-register', kind: 'covers' },
];

/**
 * Facts, each carrying who said it and what they were entitled to say.
 *
 * The session-timeout set is the worked example: four systems, four different
 * numbers, and no vote required once you know which question each was answering.
 */
export const FACTS: Fact[] = [
  {
    id: 'f-timeout-code',
    nodeId: 'ent-session',
    property: 'Session timeout',
    value: '30 minutes',
    authority: 'observed',
    lifecycle: 'active',
    system: 'Code',
    locator: 'authentication-service/config/session.yml',
    check: 'session.inactivity.minutes',
  },
  {
    id: 'f-timeout-test',
    nodeId: 'ent-session',
    property: 'Session timeout',
    value: '30 minutes',
    authority: 'verified',
    lifecycle: 'active',
    system: 'Tests',
    locator: 'SessionTimeoutTest#expiresAfterThirtyMinutes',
    check: 'SessionTimeoutTest',
  },
  {
    id: 'f-timeout-jira',
    nodeId: 'ent-session',
    property: 'Session timeout',
    value: '15 minutes',
    authority: 'intended',
    lifecycle: 'active',
    system: 'Jira',
    locator: 'SEC-402 — align session policy',
    origin: 'security-policy',
  },
  {
    id: 'f-timeout-arch',
    nodeId: 'ent-session',
    property: 'Session timeout',
    value: 'Configurable per channel',
    authority: 'permitted',
    lifecycle: 'active',
    system: 'Architecture',
    locator: 'Identity flow — session boundary',
  },

  {
    id: 'f-pin-code',
    nodeId: 'scr-pin',
    property: 'PIN fallback',
    value: 'Present and reachable',
    authority: 'observed',
    lifecycle: 'active',
    system: 'Code',
    locator: 'mobile-app/src/auth/PinFallback.tsx',
    check: 'PinFallbackSuite',
  },
  {
    id: 'f-pin-test',
    nodeId: 'scr-pin',
    property: 'PIN fallback',
    value: 'Present and reachable',
    authority: 'verified',
    lifecycle: 'active',
    system: 'Tests',
    locator: 'PinFallbackSuite — 12 cases',
    check: 'PinFallbackSuite',
  },
  {
    id: 'f-pin-jira',
    nodeId: 'scr-pin',
    property: 'PIN fallback',
    value: 'Removed in the redesign',
    authority: 'intended',
    lifecycle: 'planned-not-built',
    system: 'Jira',
    locator: 'MOB-118 — remove PIN entry',
  },

  {
    id: 'f-binding-api',
    nodeId: 'api-register',
    property: 'Device binding',
    value: 'Supported per device',
    authority: 'permitted',
    lifecycle: 'active',
    system: 'APIs',
    locator: 'POST /devices/register — bindingId',
  },
  {
    id: 'f-binding-git',
    nodeId: 'svc-auth',
    property: 'Device binding',
    value: 'Check removed, not replaced',
    authority: 'observed',
    lifecycle: 'active',
    system: 'Git',
    locator: 'a41f9c — drop device binding assertion',
  },

  {
    id: 'f-oauth-arch',
    nodeId: 'gw-oauth',
    property: 'Login routing',
    value: 'All login traffic via the shared OAuth gateway',
    authority: 'permitted',
    lifecycle: 'active',
    system: 'Architecture',
    locator: 'Identity flow — container view',
  },
  {
    id: 'f-oauth-code',
    nodeId: 'gw-oauth',
    property: 'Login routing',
    value: 'OAuth 2.0 with PKCE',
    authority: 'observed',
    lifecycle: 'active',
    system: 'Code',
    locator: 'authentication-service/OAuthConfig.java',
    check: 'OAuthSuite',
  },

  {
    id: 'f-bio-none',
    nodeId: 'scr-biometric',
    property: 'Biometric authentication',
    value: 'Not implemented anywhere',
    authority: 'observed',
    lifecycle: 'requested',
    system: 'Code',
    locator: 'no match across 3 repositories',
  },
];

/* ─────────────────────────── reconciliation ─────────────────────────── */

export interface Reading {
  property: string;
  nodeId: string;
  by: Partial<Record<Authority, Fact>>;
  /** Implementation and intent disagree. */
  drift: boolean;
  /** Independent origins backing the strongest claim. */
  independent: number;
  confidence: number;
  /** Whether anything can falsify this. */
  verifiable: boolean;
  summary: string;
  /** Present when the user has to choose. */
  decision?: string;
}

const bestValue = (r: Partial<Record<Authority, Fact>>) =>
  (r.verified ?? r.observed ?? r.intended ?? r.permitted)?.value ?? 'unknown';

/**
 * Groups facts by what they are about and reads them against each other.
 *
 * Confidence comes from independent origins, not from how many rows agree —
 * three documents descended from one policy are one source, not three.
 */
export const reconcile = (facts: Fact[] = FACTS): Reading[] => {
  const groups = new Map<string, Fact[]>();
  for (const f of facts) {
    const key = `${f.nodeId}::${f.property}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  return [...groups.values()].map((group) => {
    const by: Partial<Record<Authority, Fact>> = {};
    for (const f of group) by[f.authority] = f;

    const observedVal = (by.verified ?? by.observed)?.value;
    const intendedVal = by.intended?.value;
    const drift = Boolean(observedVal && intendedVal && observedVal !== intendedVal);

    const origins = new Set(group.map((f) => f.origin ?? f.system));
    const verifiable = group.some((f) => Boolean(f.check));

    /* Verified beats observed beats stated; unverifiable claims are capped. */
    let confidence = by.verified ? 0.94 : by.observed ? 0.82 : by.intended ? 0.55 : 0.4;
    confidence += Math.min(0.05, (origins.size - 1) * 0.02);
    if (!verifiable) confidence = Math.min(confidence, 0.6);
    if (drift) confidence = Math.min(confidence, 0.7);

    const parts: string[] = [];
    if (by.observed) parts.push(`observed ${by.observed.value.toLowerCase()}`);
    if (by.verified && by.verified.value !== by.observed?.value)
      parts.push(`verified ${by.verified.value.toLowerCase()}`);
    if (by.intended) parts.push(`intended ${by.intended.value.toLowerCase()}`);
    if (by.permitted) parts.push(`permitted ${by.permitted.value.toLowerCase()}`);

    const planned = group.find((f) => f.lifecycle === 'planned-not-built');

    return {
      property: group[0].property,
      nodeId: group[0].nodeId,
      by,
      drift,
      independent: origins.size,
      confidence: Math.round(confidence * 100) / 100,
      verifiable,
      summary: parts.join(' · '),
      decision: drift
        ? planned
          ? `${planned.system} describes this as ${planned.value.toLowerCase()}, but nothing implements it. Keep ${bestValue(
              by
            ).toLowerCase()}, or build the change?`
          : `Keep ${observedVal?.toLowerCase()}, or align with the documented ${intendedVal?.toLowerCase()}?`
        : undefined,
    };
  });
};

/* ─────────────────────────── impact traversal ─────────────────────────── */

const neighbours = (id: string): string[] => [
  ...EDGES.filter((e) => e.from === id).map((e) => e.to),
  ...EDGES.filter((e) => e.to === id).map((e) => e.from),
];

export interface Impact {
  direct: SysNode[];
  inferred: SysNode[];
  potential: SysNode[];
}

/**
 * Impact by walking the graph rather than by listing modules from memory.
 * One hop is direct, two is inferred, three is worth mentioning.
 */
export const impactFrom = (seeds: string[]): Impact => {
  const byId = new Map(NODES.map((n) => [n.id, n]));
  const seen = new Set(seeds);
  const rings: string[][] = [];
  let frontier = seeds;

  for (let hop = 0; hop < 3; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of neighbours(id)) {
        if (seen.has(nb)) continue;
        seen.add(nb);
        next.push(nb);
      }
    }
    rings.push(next);
    frontier = next;
  }

  const pick = (ids: string[]) => ids.map((i) => byId.get(i)).filter(Boolean) as SysNode[];
  return {
    direct: pick([...seeds, ...rings[0]]),
    inferred: pick(rings[1] ?? []),
    potential: pick(rings[2] ?? []),
  };
};

/** Edge from a node to one of a given set, for explaining why it is in scope. */
export const linkTo = (id: string, targets: Set<string>): { kind: EdgeKind; other: string } | undefined => {
  const e =
    EDGES.find((x) => x.from === id && targets.has(x.to)) ??
    EDGES.find((x) => x.to === id && targets.has(x.from));
  if (!e) return undefined;
  return { kind: e.kind, other: e.from === id ? e.to : e.from };
};

export const nodeById = (id: string) => NODES.find((n) => n.id === id);
export const factsFor = (id: string) => FACTS.filter((f) => f.nodeId === id);
