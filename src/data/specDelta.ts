import {
  FACTS,
  Impact,
  NODES,
  Reading,
  SysNode,
  factsFor,
  impactFrom,
  linkTo,
  nodeById,
  reconcile,
} from './specSystemModel';

/**
 * Current state → proposed state → implementation delta.
 *
 * The delta is the product. A requirement document says what should be true; a
 * delta says what has to change for it to become true, against a system that
 * already exists. It is also the most derivable object here: current state comes
 * out of reconciling the sources, proposed state comes out of the problem
 * statement plus whatever the user has decided, and the delta is the difference.
 *
 * Every delta line names the nodes it touches, which is what makes impact
 * analysis a traversal instead of a list somebody maintains by hand.
 */

export type DeltaKind = 'add' | 'change' | 'extend' | 'remove';

export interface DeltaLine {
  id: string;
  kind: DeltaKind;
  text: string;
  /** System nodes this lands on — the seed set for impact. */
  touches: string[];
  /** Which layer of the build this belongs to. */
  area: 'Frontend' | 'Backend' | 'Data' | 'API' | 'Security' | 'Test' | 'Observability';
  /** An unresolved decision this cannot be finished without. */
  blockedBy?: string;
}

/** What the sources say is true today, stated plainly. */
export const currentState = (): { text: string; reading?: Reading }[] => {
  const readings = reconcile(FACTS);
  return [
    { text: 'Password and PIN login on mobile', reading: readings.find((r) => r.property === 'PIN fallback') },
    { text: 'All login traffic routed through the shared OAuth gateway', reading: readings.find((r) => r.property === 'Login routing') },
    { text: 'Device registration already exists and is callable', reading: readings.find((r) => r.property === 'Device binding') },
    { text: 'Session expires after 30 minutes of inactivity', reading: readings.find((r) => r.property === 'Session timeout') },
    { text: 'No biometric enrolment or challenge anywhere in the codebase', reading: readings.find((r) => r.property === 'Biometric authentication') },
  ];
};

/** What the problem statement, plus anything the user has decided, asks for. */
export const proposedState = (decided: string[] = []): string[] => [
  'Biometric enrolment for eligible returning users',
  'Biometric authentication on registered devices',
  'PIN fallback retained as the alternate path',
  'Device revocation when biometric access is withdrawn',
  'Existing OAuth gateway retained unchanged',
  ...decided,
];

/**
 * The delta. Ordered roughly the way it would be built, not by area — a plan you
 * could hand to someone reads front to back.
 */
export const DELTA: DeltaLine[] = [
  {
    id: 'd-enrol-ui',
    kind: 'add',
    area: 'Frontend',
    text: 'Add the biometric enrolment screen and its consent step',
    touches: ['scr-biometric', 'flow-enrol', 'app-mobile'],
    blockedBy: 'Is enrolment mandatory or optional?',
  },
  {
    id: 'd-eligibility',
    kind: 'add',
    area: 'Backend',
    text: 'Add device eligibility validation before enrolment is offered',
    touches: ['svc-device', 'api-devices', 'ent-device'],
  },
  {
    id: 'd-profile',
    kind: 'extend',
    area: 'Data',
    text: 'Extend the customer profile with a biometric opt-in and its consent timestamp',
    touches: ['ent-customer', 'svc-profile', 'api-profile'],
  },
  {
    id: 'd-challenge',
    kind: 'add',
    area: 'API',
    text: 'Add POST /auth/biometric for challenge and assertion verification',
    touches: ['api-biometric', 'svc-auth'],
  },
  {
    id: 'd-orchestration',
    kind: 'change',
    area: 'Backend',
    text: 'Update login orchestration to try biometric first and fall back to PIN',
    touches: ['svc-auth', 'api-verify', 'flow-login', 'scr-login'],
  },
  {
    id: 'd-binding',
    kind: 'change',
    area: 'Security',
    text: 'Reinstate the device binding assertion removed in a41f9c',
    touches: ['svc-auth', 'api-register', 'ent-device'],
  },
  {
    id: 'd-revoke',
    kind: 'add',
    area: 'Backend',
    text: 'Add revocation so a withdrawn device loses biometric access immediately',
    touches: ['svc-device', 'ent-device', 'svc-notify'],
    blockedBy: 'Should biometric access be disabled after a PIN reset?',
  },
  {
    id: 'd-events',
    kind: 'add',
    area: 'Observability',
    text: 'Emit enrolment, challenge and revocation events to security monitoring',
    touches: ['svc-secmon', 'svc-auth', 'ent-attempt'],
  },
  {
    id: 'd-tests',
    kind: 'add',
    area: 'Test',
    text: 'Cover the biometric path, its failure modes and the PIN fallback it replaces',
    touches: ['tst-oauth', 'tst-pin', 'tst-device'],
  },
];

export const DELTA_AREAS = [
  'Frontend',
  'Backend',
  'Data',
  'API',
  'Security',
  'Observability',
  'Test',
] as const;

/** Impact for the whole delta, or for one line of it. */
export const deltaImpact = (lines: DeltaLine[] = DELTA): Impact =>
  impactFrom([...new Set(lines.flatMap((l) => l.touches))]);

export const touchedNodes = (line: DeltaLine): SysNode[] =>
  line.touches.map(nodeById).filter(Boolean) as SysNode[];

/** Nodes the problem statement puts in scope — the subgraph worth reading deeply. */
export const SCOPE_SEEDS = ['app-mobile', 'svc-auth', 'svc-device', 'svc-profile'];

/**
 * A scope candidate, with why it is here and how sure we are.
 *
 * Scope is the one decision every later artefact inherits, so it should show its
 * working rather than presenting a list to accept on faith. Relevance falls out
 * of how close a thing sits to the change, whether the delta actually touches it,
 * and whether any source has said anything about it.
 */
export interface ScopeItem {
  node: SysNode;
  hop: number;
  relevance: number;
  why: string;
  /** Every system that has said something about this. */
  origins: string[];
}

export const scopeItems = (): ScopeItem[] => {
  const impact = impactFrom(SCOPE_SEEDS);
  const seeds = new Set(SCOPE_SEEDS);
  const touched = new Set(DELTA.flatMap((d) => d.touches));

  const build = (n: SysNode, hop: number): ScopeItem => {
    let relevance = hop === 0 ? 0.95 : hop === 1 ? 0.78 : 0.56;
    const facts = factsFor(n.id);
    if (touched.has(n.id)) relevance += 0.08;
    if (facts.length > 0) relevance += 0.04;
    if (n.proposed) relevance += 0.03;

    const link = hop > 0 ? linkTo(n.id, seeds) : undefined;
    const near = link ? nodeById(link.other)?.label : undefined;

    const why =
      hop === 0
        ? 'Named in the problem statement'
        : link && near
        ? `${link.kind} ${near}`
        : touched.has(n.id)
        ? 'The delta lands on it'
        : `${hop} hops from the change`;

    return {
      node: n,
      hop,
      relevance: Math.min(0.99, Math.round(relevance * 100) / 100),
      why,
      origins: [...new Set([n.system, ...facts.map((f) => f.system)])],
    };
  };

  const items: ScopeItem[] = [
    ...impact.direct.map((n) => build(n, seeds.has(n.id) ? 0 : 1)),
    ...impact.inferred.map((n) => build(n, 2)),
  ];

  return items.sort((a, b) => b.relevance - a.relevance);
};

/** Clubbed by the system they were discovered through. */
export const scopeBySource = (): { system: string; items: ScopeItem[] }[] => {
  const groups = new Map<string, ScopeItem[]>();
  for (const item of scopeItems()) {
    groups.set(item.node.system, [...(groups.get(item.node.system) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([system, items]) => ({ system, items }))
    .sort((a, b) => b.items.length - a.items.length);
};

export const scopeNodes = (): SysNode[] => {
  const impact = impactFrom(SCOPE_SEEDS);
  return [...impact.direct, ...impact.inferred];
};

/** Everything the delta will not touch, so scope has an outer edge. */
export const outOfScope = (): SysNode[] => {
  const inScope = new Set(scopeNodes().map((n) => n.id));
  return NODES.filter((n) => !inScope.has(n.id));
};
