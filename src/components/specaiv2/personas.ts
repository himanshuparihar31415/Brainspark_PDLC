import { Role } from '../../types';
import { SysKind } from '../../data/specSystemModel';

/**
 * The same specification, entered from different doors.
 *
 * A Product Manager and a Developer are not looking at different data — they are
 * looking at the same delta with different questions in hand. The panel should
 * open where their question lives and emphasise the layers they reason in. The
 * tabs themselves stay in one order for everyone — only the landing point and
 * the emphasis change.
 */

export type WsTab = 'system' | 'impact' | 'questions';

export interface Lens {
  role: string;
  /** Which tab this persona lands on. */
  defaultTab: WsTab;
  impactLens: 'jira' | 'code';
  /** Node kinds this persona reasons in; the rest dim on the map. */
  focus: SysKind[];
}

const PM: Lens = {
  role: 'Product Manager',
  defaultTab: 'questions',
  impactLens: 'jira',
  focus: ['ticket', 'flow', 'screen'],
};

const ARCHITECT: Lens = {
  role: 'Architect',
  defaultTab: 'system',
  impactLens: 'code',
  focus: ['service', 'endpoint', 'entity'],
};

const ENGINEER: Lens = {
  role: 'Engineering',
  defaultTab: 'impact',
  impactLens: 'code',
  focus: ['service', 'endpoint', 'entity', 'test'],
};

const QA: Lens = {
  role: 'Quality',
  defaultTab: 'impact',
  impactLens: 'code',
  focus: ['test', 'flow', 'screen'],
};

const DESIGN: Lens = {
  role: 'Design',
  defaultTab: 'system',
  impactLens: 'jira',
  focus: ['flow', 'screen'],
};

const RELEASE: Lens = {
  role: 'Release',
  defaultTab: 'impact',
  impactLens: 'code',
  focus: ['service', 'entity', 'test'],
};

const LENSES: Record<string, Lens> = {
  'Product Manager': PM,
  Architect: ARCHITECT,
  'Tech Lead': ENGINEER,
  Developer: ENGINEER,
  'QA Manager': QA,
  'QA Engineer': QA,
  Designer: DESIGN,
  'Release Manager': RELEASE,
};

/** Anyone without a journey of their own gets the product one, read-only. */
export const lensFor = (role: Role): Lens => LENSES[role] ?? PM;
