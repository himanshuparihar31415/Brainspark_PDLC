import { SpecAiState } from '../types/specai';
import { CodeIqReading } from '../types/codeiq';
import { claimedDone, countBy } from './codeiq';

/**
 * The Product Manager's numbers.
 *
 * Three, deliberately. A PM does not run delivery — they own the specification,
 * so the questions they arrive with are: what must I answer, what must I
 * approve, and did the thing I specified actually get built. Each of these
 * three is one of those, and each one is a verb.
 *
 * An earlier version carried seven. The other four — requirement-seed count,
 * acceptance-criteria coverage, churn per requirement, unconfirmed claims —
 * were all true and none of them told a person to do something today. They are
 * a quarterly conversation, and putting them beside the three that are actually
 * actionable made all seven read as reference.
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

/*
 * Only projects with lineage indexed have a CodeIQ reading, and showing one
 * project's against another would be confident nonsense.
 *
 * This used to be a hardcoded allowlist of project ids, which was the right
 * instinct against the wrong data model: CodeIQ's rows were platform-wide, so
 * the only way to stop them leaking was to name the one project they belonged
 * to. Now the state answers the question itself.
 */
export const pmMetrics = (spec: SpecAiState, codeIq: CodeIqReading): PmMetric[] => {
  const openProduct = spec.questions.filter(
    (q) => q.status === 'Open' && q.track === 'Product'
  ).length;

  const awaitingSignOff = spec.artifacts.filter((a) => a.status !== 'Approved').length;

  /* Null, not zero: no lineage and no gaps look identical at 0. */
  const notBuilt = codeIq.indexed
    ? claimedDone(codeIq.targets).reduce((n, t) => n + countBy(t.criteria).missing, 0)
    : null;

  return [
    {
      key: 'decisions',
      label: 'to answer',
      value: openProduct,
      tone: openProduct > 0 ? 'low' : 'high',
      hint: 'Open product questions the agent could not settle from the sources.',
      why: 'Nobody else can answer these. Everything generated downstream inherits the answer, so an open one propagates into every artifact written after it.',
    },
    {
      key: 'signoff',
      label: 'to approve',
      value: awaitingSignOff,
      tone: awaitingSignOff > 0 ? 'med' : 'high',
      hint: 'Artifacts generated from the brief that nobody has approved yet.',
      why: 'Downstream work is generated from these whether or not they were read. An unapproved artifact is not a blocked one — it is one carrying its assumptions forward unchallenged.',
    },
    {
      key: 'not-built',
      label: 'not built',
      value: notBuilt,
      tone: notBuilt === null ? undefined : notBuilt > 0 ? 'low' : 'high',
      hint: codeIq.indexed
        ? 'Acceptance criteria with no code behind them, on work already marked done.'
        : 'No code lineage is connected for this project.',
      why: codeIq.indexed
        ? 'From CodeIQ. These are the criteria you specified that nothing in the change set addresses — the gap between what the tracker claims and what was built.'
        : 'CodeIQ correlates IDE, git and tracker events for this project once its repositories are connected. Until then there is nothing honest to report here.',
    },
  ];
};
