import { Role } from '../../types';
import { SysKind } from '../../data/specSystemModel';

/**
 * The same specification, entered from different doors.
 *
 * A Product Manager and a Developer are not looking at different data — they are
 * looking at the same delta with different questions in hand. The panel should
 * open where their question lives, order its tabs the way they would, and say
 * what "done" means for them, rather than presenting one neutral surface that
 * suits nobody in particular.
 *
 * Read-only personas get a journey too. Being unable to edit is not the same as
 * having nothing to do — reviewing what a change lands on is most of the work.
 */

export type WsTab = 'system' | 'impact' | 'questions';

export interface JourneyStep {
  id: string;
  label: string;
  hint: string;
  /** Where pressing it takes you. */
  tab: WsTab;
  /** Which lens the impact panel should open on. */
  lens?: 'jira' | 'code';
  /**
   * Steps the system can judge for itself. The rest complete when the person has
   * actually been and looked, which is the honest signal available.
   */
  auto?: 'scope' | 'decisions' | 'approved' | 'drift' | 'generated';
}

export interface Lens {
  role: string;
  title: string;
  blurb: string;
  tabs: WsTab[];
  defaultTab: WsTab;
  impactLens: 'jira' | 'code';
  /** Node kinds this persona reasons in; the rest dim on the map. */
  focus: SysKind[];
  steps: JourneyStep[];
}

const PM: Lens = {
  role: 'Product Manager',
  title: 'Decide what gets built',
  blurb: 'Confirm the shape of the change, settle what only you can settle, then approve it.',
  tabs: ['questions', 'impact', 'system'],
  defaultTab: 'questions',
  impactLens: 'jira',
  focus: ['ticket', 'flow', 'screen'],
  steps: [
    {
      id: 'scope',
      label: 'Confirm scope',
      hint: 'What the systems will be read against',
      tab: 'system',
      auto: 'scope',
    },
    {
      id: 'decisions',
      label: 'Settle decisions',
      hint: 'Only what retrieval could not answer',
      tab: 'questions',
      auto: 'decisions',
    },
    {
      id: 'backlog',
      label: 'Check the backlog shape',
      hint: 'Epic, stories and points this becomes',
      tab: 'impact',
      lens: 'jira',
    },
    {
      id: 'approve',
      label: 'Approve the specification',
      hint: 'Finalize locks it and starts generation',
      tab: 'questions',
      auto: 'approved',
    },
  ],
};

const ARCHITECT: Lens = {
  role: 'Architect',
  title: 'Make the change coherent',
  blurb: 'Reconcile what the sources disagree about, then check the shape of what gets added.',
  tabs: ['system', 'impact', 'questions'],
  defaultTab: 'system',
  impactLens: 'code',
  focus: ['service', 'endpoint', 'entity'],
  steps: [
    {
      id: 'drift',
      label: 'Resolve drift',
      hint: 'Where implementation and intent disagree',
      tab: 'system',
      auto: 'drift',
    },
    {
      id: 'proposed',
      label: 'Review what is added',
      hint: 'The proposed nodes on the map',
      tab: 'system',
    },
    {
      id: 'repos',
      label: 'Check the blast radius',
      hint: 'Repositories, schema and contracts',
      tab: 'impact',
      lens: 'code',
    },
    {
      id: 'artifacts',
      label: 'Approve the design artifacts',
      hint: 'HLD, LLD and the contract change',
      tab: 'impact',
      auto: 'generated',
    },
  ],
};

const ENGINEER: Lens = {
  role: 'Engineering',
  title: 'Know what you are being asked to build',
  blurb: 'Read the delta against the repositories it lands on, and say what is missing.',
  tabs: ['impact', 'system', 'questions'],
  defaultTab: 'impact',
  impactLens: 'code',
  focus: ['service', 'endpoint', 'entity', 'test'],
  steps: [
    { id: 'repos', label: 'Touched repositories', hint: 'Which repos and which files', tab: 'impact', lens: 'code' },
    { id: 'schema', label: 'Schema migration', hint: 'What gates everything else', tab: 'impact', lens: 'code' },
    { id: 'contract', label: 'API contract change', hint: 'New and changed endpoints', tab: 'system' },
    { id: 'gaps', label: 'Flag what is unanswered', hint: 'Anything you cannot build from', tab: 'questions' },
  ],
};

const QA: Lens = {
  role: 'Quality',
  title: 'Find what nothing covers',
  blurb: 'The delta says what changes; the tests say what is actually checked. Mind the gap.',
  tabs: ['impact', 'questions', 'system'],
  defaultTab: 'impact',
  impactLens: 'code',
  focus: ['test', 'flow', 'screen'],
  steps: [
    { id: 'coverage', label: 'Existing coverage', hint: 'What the suites already assert', tab: 'system' },
    { id: 'newtests', label: 'Tests the delta needs', hint: 'Paths with nothing behind them', tab: 'impact', lens: 'code' },
    { id: 'criteria', label: 'Acceptance criteria', hint: 'What "done" has to mean', tab: 'questions' },
  ],
};

const DESIGN: Lens = {
  role: 'Design',
  title: 'See the journey that changes',
  blurb: 'Which screens exist, which are being asked for, and where the flow branches.',
  tabs: ['system', 'questions', 'impact'],
  defaultTab: 'system',
  impactLens: 'jira',
  focus: ['flow', 'screen'],
  steps: [
    { id: 'journeys', label: 'Affected journeys', hint: 'Login, recovery, enrolment', tab: 'system' },
    { id: 'screens', label: 'Screens to design', hint: 'Outlined nodes do not exist yet', tab: 'system' },
    { id: 'states', label: 'Failure and empty states', hint: 'Usually where the gaps are', tab: 'questions' },
  ],
};

const RELEASE: Lens = {
  role: 'Release',
  title: 'Judge whether this can ship',
  blurb: 'What has to land together, what can be flagged off, and what rollback costs.',
  tabs: ['impact', 'system', 'questions'],
  defaultTab: 'impact',
  impactLens: 'code',
  focus: ['service', 'entity', 'test'],
  steps: [
    { id: 'radius', label: 'Deployment radius', hint: 'Repositories in one release', tab: 'impact', lens: 'code' },
    { id: 'order', label: 'Ordering constraints', hint: 'Schema gates the rest', tab: 'impact', lens: 'code' },
    { id: 'risk', label: 'Unresolved risk', hint: 'Anything carried forward', tab: 'questions' },
  ],
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
