import {
  AgentTask,
  BriefBandKey,
  BriefLine,
  IntakeKind,
  SpecIntake,
  SpecSource,
  UnderstandingBrief,
} from '../types/specai';
import { PlannedCall, TOPICS } from './specAiAgent';

/**
 * The intake — turning "here is my problem" into a task with a direction.
 *
 * This is the most consequential step in the module and the cheapest to get
 * right. Every stage after it inherits the direction set here: the sources are
 * judged relevant against it, the questions are raised against it, and four
 * stages later a backlog is generated from it. A vague start does not stay
 * vague, it becomes a confidently wrong specification.
 *
 * So the intake does three things and refuses to skip any of them. It says what
 * kind of input it got, because logs and prose yield different facts. It writes
 * back a short brief, so you can see whether it understood you before any work
 * is done on it. And it proposes a task with an explicit out-of-scope line — or,
 * when the input is too thin to support one, it asks instead of inventing one.
 */

// ───────────────────────────── Classification ─────────────────────────────

/** Shapes that identify an input without needing to understand it. */
const SHAPES: {
  kind: IntakeKind;
  reason: string;
  test: (text: string) => boolean;
}[] = [
  {
    kind: 'System logs',
    reason: 'timestamped lines with severity markers',
    test: (t) =>
      /\b(ERROR|WARN|FATAL|SEVERE|Exception|Traceback|stack ?trace)\b/.test(t) ||
      /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(t) ||
      /\bat [\w.$]+\([\w.]+:\d+\)/.test(t),
  },
  {
    kind: 'Issue description',
    reason: 'a tracker ticket shape — steps, expected and actual',
    test: (t) =>
      /\b(steps to reproduce|expected(\s+result|\s+behaviou?r)?:|actual(\s+result|\s+behaviou?r)?:|acceptance criteria)\b/i.test(
        t
      ) || /\b[A-Z][A-Z0-9]{1,9}-\d+\b/.test(t),
  },
  {
    kind: 'Meeting notes',
    reason: 'attributed lines, as in a transcript or minutes',
    test: (t) =>
      /^\s*[-*•]\s+/m.test(t) && /\b(agreed|action item|discussed|decided|attendees|AI:)\b/i.test(t),
  },
];

const classify = (text: string): { kind: IntakeKind; reason: string } => {
  for (const s of SHAPES) if (s.test(text)) return { kind: s.kind, reason: s.reason };

  /* Prose is the default, but only if there is enough of it to be a statement
     rather than a title. */
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words >= 8
    ? { kind: 'Problem statement', reason: 'prose describing intent' }
    : { kind: 'Unclear', reason: `only ${words} word${words === 1 ? '' : 's'} — too short to read` };
};

// ───────────────────────────── Signal extraction ─────────────────────────────

/** The distinct error signatures in a log paste, most frequent first. */
const errorSignatures = (text: string): { signature: string; count: number }[] => {
  const counts = new Map<string, number>();

  for (const line of text.split(/\r?\n/)) {
    const m =
      /\b(?:ERROR|WARN|FATAL|SEVERE)\b[^A-Za-z0-9]*(.{0,90})/.exec(line) ??
      /\b([A-Z][\w.]*(?:Exception|Error|Timeout))\b/.exec(line);
    if (!m) continue;

    /* Numbers, ids and quoted values are what vary between occurrences of the
       same fault, so they are stripped before counting. */
    const signature = m[1]
      .replace(/\b[0-9a-f]{8,}\b/gi, '<id>')
      .replace(/\b\d+(\.\d+)?(ms|s|MB|KB)?\b/g, '<n>')
      .replace(/["'][^"']{0,40}["']/g, '<value>')
      .replace(/\s+/g, ' ')
      .trim();
    if (signature.length < 4) continue;

    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([signature, count]) => ({ signature, count }))
    .sort((a, b) => b.count - a.count);
};

/** Service or component names, as they appear in log prefixes and stack frames. */
const components = (text: string): string[] => {
  const found = new Set<string>();
  for (const m of text.matchAll(/\b([a-z][a-z0-9]*(?:[-_][a-z0-9]+)+)\b/g)) {
    const name = m[1];
    if (/(service|api|gateway|worker|consumer|controller|repo|client|adapter|job)$/.test(name))
      found.add(name);
  }
  return [...found].slice(0, 6);
};

const ticketKeys = (text: string): string[] => [
  ...new Set([...text.matchAll(/\b[A-Z][A-Z0-9]{1,9}-\d+\b/g)].map((m) => m[0])),
];

/** Collapse to one line, capped. */
const oneLine = (text: string, cap = 400): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > cap ? `${flat.slice(0, cap - 1)}…` : flat;
};

/** The first line — a ticket's title, or the opening of a note. */
const firstLine = (text: string): string =>
  oneLine(text.split(/\r?\n/).find((l) => l.trim() !== '') ?? text, 160);

const INTENT =
  /\b(?:should|must|we want|we need|ought to|instead of|intended behaviou?r|target state|expected to)\b/i;

/**
 * The sentence where you say what should happen, if there is one.
 *
 * This is what closes the loop. Logs and notes describe a situation and never
 * state an intent, so the agent has to ask — but the question has to stop being
 * asked once it is answered, or answering it achieves nothing.
 *
 * Split on lines before sentences. A stack frame is full of full stops that end
 * no sentence, and a bulleted note can run to hundreds of words containing none
 * at all — either way, searching flattened prose for a sentence returns a
 * fragment of a stack trace or the entire input.
 */
const intentSentence = (text: string): string | undefined => {
  const chunks = text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((c) => c.replace(/\s+/g, ' ').trim())
    .filter((c) => c.length > 12);

  const hit = chunks.find((c) => INTENT.test(c));
  return hit ? oneLine(hit, 220) : undefined;
};

// ───────────────────────────── The reading ─────────────────────────────

export interface IntakeReading {
  intake: SpecIntake;
  /** The tool calls, so the classification and extraction are auditable. */
  toolCalls: PlannedCall[];
  /** What the agent says back — the concise brief, as a conversational turn. */
  reply: string;
}

const timeFor = (name: string, payload: string): number =>
  40 + ((name.length * 37 + payload.length * 11) % 560);

/**
 * Read an intake. Returns a task when there is enough to propose one, and the
 * questions it needs answered when there is not.
 */
export const readIntake = (raw: string): IntakeReading => {
  const text = raw.trim();
  const { kind, reason } = classify(text);
  const words = text.split(/\s+/).filter(Boolean).length;

  const toolCalls: PlannedCall[] = [
    {
      name: 'classify_input',
      argument: `${words} words, ${text.split(/\r?\n/).length} lines`,
      durationMs: timeFor('classify_input', text.slice(0, 200)),
      status: kind === 'Unclear' ? 'empty' : 'ok',
      result: kind === 'Unclear' ? `Could not place this: ${reason}.` : `${kind} — ${reason}.`,
    },
  ];

  const signals: { label: string; value: string }[] = [];
  const needs: string[] = [];
  /* What the rest of the pipeline will read. Each kind of input yields it
     differently, so it is set where the extraction happens rather than guessed
     back out of the raw text afterwards. */
  let statement = oneLine(text);
  /* Whether you have said what correct looks like. Logs and notes never do on
     their own, so this is what the agent asks for — and what stops it asking
     again once you have answered. */
  const intent = intentSentence(text);

  // ── What each kind of input is worth extracting ───────────────────────────

  if (kind === 'System logs') {
    const errors = errorSignatures(text);
    const parts = components(text);

    toolCalls.push({
      name: 'extract_signals',
      argument: 'error signatures',
      durationMs: timeFor('extract_signals', text.slice(0, 300)),
      status: errors.length > 0 ? 'ok' : 'empty',
      result:
        errors.length > 0
          ? `${errors.length} distinct signature${errors.length === 1 ? '' : 's'}, ${errors.reduce(
              (n, e) => n + e.count,
              0
            )} occurrences.`
          : 'Severity markers present but no repeated signature to group on.',
      excerpt: errors[0]?.signature,
    });

    if (errors.length > 0) {
      statement = `${errors[0].signature} is failing repeatedly — ${errors[0].count} occurrence${
        errors[0].count === 1 ? '' : 's'
      } in this sample.`;
      signals.push({
        label: 'Dominant fault',
        value: `${errors[0].signature} (${errors[0].count}×)`,
      });
      if (errors.length > 1)
        signals.push({
          label: 'Other faults',
          value: errors
            .slice(1, 4)
            .map((e) => `${e.signature} (${e.count}×)`)
            .join(' · '),
        });
    }

    if (parts.length > 0) {
      toolCalls.push({
        name: 'extract_signals',
        argument: 'components',
        durationMs: timeFor('components', parts.join()),
        status: 'ok',
        result: `${parts.length} named component${parts.length === 1 ? '' : 's'}.`,
        excerpt: parts.join(', '),
      });
      signals.push({ label: 'Components named', value: parts.join(', ') });
    }

    /* Logs say what broke. On their own they never say what it should have done
       instead, and that is the part a specification is made of. */
    if (intent) statement = `${statement} It should instead: ${intent}`;
    else
      needs.push(
        'What should happen instead? Logs show the failure; they do not say what correct looks like.'
      );
    if (errors.length === 0)
      needs.push('Which of these lines is the problem you care about?');
  }

  if (kind === 'Issue description') {
    const keys = ticketKeys(text);
    const expected = /expected(?:\s+result|\s+behaviou?r)?:?\s*(.{10,200})/i.exec(text);
    const actual = /actual(?:\s+result|\s+behaviou?r)?:?\s*(.{10,200})/i.exec(text);

    toolCalls.push({
      name: 'extract_signals',
      argument: 'expected vs actual',
      durationMs: timeFor('extract_signals', text.slice(0, 300)),
      status: expected || actual ? 'ok' : 'empty',
      result:
        expected && actual
          ? 'Both sides of the gap are stated.'
          : expected || actual
          ? 'Only one side of the gap is stated.'
          : 'Neither expected nor actual behaviour is stated.',
      excerpt: (expected ?? actual)?.[1].replace(/\s+/g, ' ').trim(),
    });

    const want = expected?.[1].replace(/\s+/g, ' ').trim();
    const got = actual?.[1].replace(/\s+/g, ' ').trim();

    /* The title alone is a label; the gap between the two sides is the problem. */
    statement = want && got
      ? `${firstLine(text)} Expected: ${want} Actual: ${got}`
      : firstLine(text);

    if (keys.length > 0) signals.push({ label: 'Tracker items', value: keys.join(', ') });
    if (want) signals.push({ label: 'Expected', value: want });
    if (got) signals.push({ label: 'Actual', value: got });

    if (!expected) {
      if (intent) statement = `${statement} Intended: ${intent}`;
      else needs.push('What is the expected behaviour? Only the failure is described.');
    }
  }

  if (kind === 'Meeting notes') {
    const decisions = [...text.matchAll(/^\s*[-*•]\s*(?:agreed|decided)\b[:\s]*(.{5,160})/gim)].map(
      (m) => m[1].replace(/\s+/g, ' ').trim()
    );

    toolCalls.push({
      name: 'extract_signals',
      argument: 'decisions',
      durationMs: timeFor('extract_signals', text.slice(0, 300)),
      status: decisions.length > 0 ? 'ok' : 'empty',
      result:
        decisions.length > 0
          ? `${decisions.length} decision${decisions.length === 1 ? '' : 's'} recorded.`
          : 'Discussion, but nothing marked as decided.',
      excerpt: decisions[0],
    });

    if (decisions.length > 0)
      signals.push({ label: 'Decided in the room', value: decisions.slice(0, 3).join(' · ') });

    if (intent) statement = intent;
    else
      needs.push(
        'Which of this is the problem to solve, rather than context around it? Notes cover more than one thing by nature.'
      );
  }

  // ── Subject matching — what this is about ─────────────────────────────────

  const topics = TOPICS.filter((t) => t.match.test(text));
  toolCalls.push({
    name: 'match_topic',
    argument: topics.length > 0 ? topics.map((t) => t.key).join(', ') : 'no match',
    durationMs: timeFor('match_topic', text.slice(0, 120)),
    status: topics.length > 0 ? 'ok' : 'empty',
    result:
      topics.length > 0
        ? `Recognised as ${topics.map((t) => t.noun).join(' and ')} work.`
        : 'No subject I have standard questions for. I will read your sources without a prior.',
  });

  if (topics.length > 0)
    signals.push({ label: 'Subject', value: topics.map((t) => t.noun).join(', ') });

  const subject = topics[0]?.noun;

  // ── Can a task be proposed? ───────────────────────────────────────────────

  if (kind === 'Unclear') needs.unshift('What is the problem, in a sentence or two?');
  if (kind === 'Problem statement' && words < 15)
    needs.push(
      'Who is affected, and what does the current behaviour cost them? A statement this short gives me nothing to judge relevance against.'
    );

  /* A task is only proposed when the input carries a direction. Producing one
     from a fragment would be inventing the direction and hiding that it was
     invented — the same failure the terminal refuses on every turn. */
  const derivable = kind !== 'Unclear' && needs.length === 0;

  const task: AgentTask | undefined = derivable
    ? {
        title: subject
          ? `Specify the ${subject} change`
          : 'Specify this change from the sources',
        statement,
        steps: [
          'Read every indexed source against this statement and keep only what bears on it',
          'Report what is stated outright, what I am inferring, and what nothing covers',
          subject
            ? `Raise the ${subject} decisions that propagate into every downstream artifact`
            : 'Raise the decisions that propagate into every downstream artifact',
          'Build the project brief from that, with a source on every line',
        ],
        outOfScope:
          kind === 'System logs'
            ? 'Diagnosing the fault. This produces a specification for the fix, not a root-cause analysis.'
            : 'Anything no connected source speaks to — that becomes an open question rather than a requirement.',
      }
    : undefined;

  // ── The concise brief ─────────────────────────────────────────────────────

  const conciseBrief = derivable
    ? [
        statement,
        signals.length > 0
          ? `What I took from your input: ${signals
              .map((s) => `${s.label.toLowerCase()} — ${s.value}`)
              .join('; ')}.`
          : '',
        subject
          ? `I am treating this as ${subject} work, which comes with its own set of decisions I will put to you rather than assume.`
          : 'I do not recognise the subject, so I will take my direction entirely from your sources rather than from a prior.',
      ]
        .filter(Boolean)
        .join('\n\n')
    : [
        kind === 'Unclear'
          ? 'I cannot tell what problem this describes yet.'
          : kind === 'Problem statement'
          ? 'I read this as a problem statement, but there is not enough in it to aim anything at.'
          : `I read this as ${kind.toLowerCase()}, which tells me what is happening but not what should happen instead.`,
        signals.length > 0
          ? `What I could take from it: ${signals
              .map((s) => `${s.label.toLowerCase()} — ${s.value}`)
              .join('; ')}.`
          : '',
        'Everything downstream is read against this, so I would rather ask than start in the wrong direction.',
      ]
        .filter(Boolean)
        .join('\n\n');

  const reply = derivable
    ? `${conciseBrief}\n\nHere is what I propose to do. Accept it and I will start reading; change the statement if I have aimed this wrong.`
    : `${conciseBrief}\n\n${needs.length === 1 ? 'One thing first' : `${needs.length} things first`}: ${needs.join(' ')}`;

  return {
    intake: {
      raw: text,
      kind,
      kindReason: reason,
      conciseBrief,
      signals,
      task,
      needs,
    },
    toolCalls,
    reply,
  };
};

/**
 * The brief, at the moment requirements gathering starts.
 *
 * This is first-level information and it is labelled as such: the statement is
 * yours, the signals came out of what you pasted, and nothing here has been
 * corroborated by a source yet. The agent adds to these bands as it reads, so the
 * brief starts populated rather than empty and grows from the same place.
 */
export const seedBriefFromIntake = (
  intake: SpecIntake,
  statement: string,
  sources: SpecSource[]
): UnderstandingBrief => {
  const indexed = sources.filter((s) => s.ingest === 'Indexed');

  const bands: Record<BriefBandKey, BriefLine[]> = {
    understood: [
      {
        id: 'brief-v1-intake-statement',
        /* Same wording the opening read uses, so the first read folds into this
           line instead of restating it. */
        text: `The problem, as you stated it: ${statement}`,
        evidenceClass: 'User decision',
        sourceIds: [],
        sourceSummary: 'Stated by you at intake',
      },
      ...intake.signals.map((s, i) => ({
        id: `brief-v1-intake-signal-${i}`,
        text: `${s.label}: ${s.value}`,
        evidenceClass: 'Source fact' as const,
        sourceIds: [],
        sourceSummary: `Extracted from the ${intake.kind.toLowerCase()} you pasted`,
      })),
    ],
    decided: [],
    inferring: [],
    cannotTell:
      indexed.length === 0
        ? [
            {
              id: 'brief-v1-intake-nosources',
              text: 'Whether any of this holds. Nothing is connected yet, so none of it has been checked against a source.',
              evidenceClass: 'AI assumption',
              sourceIds: [],
              sourceSummary: 'No sources indexed',
            },
          ]
        : [],
  };

  return {
    version: 1,
    summary: [
      `This project exists because: ${statement}`,
      intake.task
        ? `${intake.task.title}. ${intake.task.steps[0]}, then report what is stated outright and what nothing covers.`
        : '',
      indexed.length === 0
        ? 'Nothing is connected yet, so everything below came from your intake rather than a source. Add sources and the agent will corroborate or contradict it.'
        : `First level only — this came from your intake. The agent is reading ${
            indexed.length
          } source${indexed.length === 1 ? '' : 's'} against it now, and every line it adds will name where it came from.`,
      `Not in scope: ${intake.task?.outOfScope ?? 'not yet bounded.'}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    generatedFrom: { problemStatement: statement, sourceIds: indexed.map((s) => s.id) },
    bands,
    stale: false,
  };
};
