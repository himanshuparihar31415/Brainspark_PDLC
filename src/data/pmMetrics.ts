import { SpecAiState } from '../types/specai';
import { ProjectDeliveryResponse } from './delivery';
import { THRASH, TICKET_ROLLUPS } from './codeiq';

/**
 * The Product Manager's numbers.
 *
 * A PM does not run the delivery — they own the specification, so the questions
 * they arrive with are different from the ones the generic dashboard answers.
 * Not "how much is done" but: what is still undecided and sitting on me, what
 * does the spec assert that nothing actually backs, and did the thing I
 * specified get built?
 *
 * Every metric here is derived from state that already exists. Nothing is a
 * hand-typed figure, and anything that cannot be counted honestly returns null
 * rather than zero — no data and no problem look identical at 0.
 */

/** Where a number sits. `low` is bad, `high` is good, `med` wants a look. */
export type MetricTone = 'high' | 'med' | 'low' | undefined;

export interface PmMetric {
  key: string;
  label: string;
  /** Null renders as an em dash — the metric could not be computed here. */
  value: number | string | null;
  tone: MetricTone;
  /** What the number counts. One sentence, plain. */
  hint: string;
  /** Why a Product Manager should care, and where it comes from. */
  why: string;
}

/**
 * Only projects with lineage connected have a CodeIQ reading. The fixture is
 * one project's, and showing it against another would be confident nonsense —
 * the same rule the system map follows.
 */
const CODEIQ_PROJECTS = ['p-mobile-v2'];
export const hasCodeIqSignal = (projectId: string) => CODEIQ_PROJECTS.includes(projectId);

/** Discarded more often than kept — the mark of an ambiguously written criterion. */
const REWORK_RATIO = 0.5;

export const pmMetrics = (
  spec: SpecAiState,
  delivery: ProjectDeliveryResponse,
  projectId: string
): PmMetric[] => {
  const openProduct = spec.questions.filter(
    (q) => q.status === 'Open' && q.track === 'Product'
  ).length;

  /* An inference or an assumption is a claim nothing has confirmed. It reads as
     fact in every artifact generated from it, which is the whole risk. */
  const briefLines = Object.values(spec.brief?.bands ?? {}).flat();
  const unconfirmed = briefLines.filter(
    (l) => l.evidenceClass !== 'Source fact' && l.evidenceClass !== 'User decision'
  ).length;

  const seeds = spec.cards.filter((c) => c.type === 'Requirement seed').length;

  /* CodeIQ can only adjudicate a story that carries Given/When/Then. One that
     does not is invisible to the lineage, however well it is written. */
  const stories = delivery.stories;
  const withAcceptance = stories.filter((s) => s.acceptance.length > 0).length;
  const acceptancePercent =
    stories.length === 0 ? null : Math.round((withAcceptance / stories.length) * 100);

  const awaitingSignOff = spec.artifacts.filter((a) => a.status !== 'Approved').length;

  const lineage = hasCodeIqSignal(projectId);
  const notBuilt = lineage
    ? TICKET_ROLLUPS.filter((t) => t.claimed === 'Done').reduce((n, t) => n + t.missing, 0)
    : null;
  const rework = lineage
    ? THRASH.filter((r) => r.attempts > 0 && r.discarded / r.attempts >= REWORK_RATIO).length
    : null;

  return [
    {
      key: 'decisions',
      label: 'on you',
      value: openProduct,
      tone: openProduct > 0 ? 'low' : 'high',
      hint: 'Open product questions the agent could not settle from the sources.',
      why: 'Nobody else can answer these. Everything generated downstream inherits the answer, so an open one propagates into every artifact written after it.',
    },
    {
      key: 'unconfirmed',
      label: 'unconfirmed',
      value: unconfirmed,
      tone: unconfirmed > 0 ? 'med' : 'high',
      hint: 'Brief claims classed as an inference or an assumption rather than a source fact.',
      why: 'No source backs these, but they read as fact in everything generated from the brief. Confirming one is cheap now and expensive after the artifacts are written.',
    },
    {
      key: 'requirements',
      label: 'requirements',
      value: seeds,
      tone: seeds > 0 ? undefined : 'med',
      hint: 'Brief lines promoted to requirement seeds.',
      why: 'The count of things the specification actually commits to building, as distinct from things it merely understands. A brief with no seeds has not decided anything yet.',
    },
    {
      key: 'acceptance',
      label: 'have criteria',
      value: acceptancePercent === null ? null : `${acceptancePercent}%`,
      tone:
        acceptancePercent === null
          ? undefined
          : acceptancePercent >= 90
          ? 'high'
          : acceptancePercent >= 70
          ? 'med'
          : 'low',
      hint: 'Share of stories carrying Given/When/Then acceptance criteria.',
      why: 'CodeIQ can only adjudicate a criterion it can read. A story with no structured acceptance is invisible to the lineage, so its delivery can never be proven — only claimed.',
    },
    {
      key: 'not-built',
      label: 'not built',
      value: notBuilt,
      tone: notBuilt === null ? undefined : notBuilt > 0 ? 'low' : 'high',
      hint: lineage
        ? 'Acceptance criteria with no code behind them, on work already marked done.'
        : 'No code lineage is connected for this project.',
      why: lineage
        ? 'From CodeIQ. These are the criteria you specified that nothing in the change set addresses — the gap between what the tracker claims and what was built.'
        : 'CodeIQ correlates IDE, git and tracker events for this project once its repositories are connected. Until then there is nothing honest to report here.',
    },
    {
      key: 'rework',
      label: 'causing rework',
      value: rework,
      tone: rework === null ? undefined : rework > 0 ? 'med' : 'high',
      hint: lineage
        ? 'Criteria where more generation attempts were discarded than kept.'
        : 'No code lineage is connected for this project.',
      why: lineage
        ? 'From CodeIQ. Repeated rework against one criterion is usually a writing problem rather than an engineering one — the criterion was ambiguous, and it cost a developer four days to find that out.'
        : 'Churn per requirement is computed from generation attempts, which arrive with the code lineage.',
    },
    {
      key: 'signoff',
      label: 'awaiting sign-off',
      value: awaitingSignOff,
      tone: awaitingSignOff > 0 ? 'med' : 'high',
      hint: 'Artifacts generated from the brief that nobody has approved yet.',
      why: 'Downstream work is generated from these whether or not they were read. An unapproved artifact is not a blocked one — it is one carrying its assumptions forward unchallenged.',
    },
  ];
};
