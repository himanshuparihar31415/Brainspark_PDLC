import {
  AgentToolCall,
  BoardCard,
  BriefBandKey,
  BriefLine,
  EvidenceClass,
  SourceType,
  SpecQuestion,
  SpecSource,
} from '../types/specai';

/**
 * The agent behind the terminal — retrieval tables, tool catalog, and the run
 * that produces a turn.
 *
 * One rule decides the whole design: the agent may only say what a tool call
 * returned. Every reply below is assembled from tool results, and a question no
 * tool could answer produces "no source covers this" plus an open question,
 * never a plausible sentence. That is why the tool calls are on screen — they
 * are the evidence for the reply sitting under them, not decoration.
 *
 * Loaded on demand: the tables and prose here have no business in the initial
 * bundle, since only Spec AI ever runs them.
 */

// ───────────────────────────── Retrieval tables ─────────────────────────────

export interface Topic {
  key: string;
  match: RegExp;
  noun: string;
  architecture: string[];
  product: string[];
}

/** Subject areas a statement can be about, and what each forces you to decide. */
export const TOPICS: Topic[] = [
  {
    key: 'auth',
    match: /\b(login|log[- ]?in|auth\w*|biometric|password|passcode|sign[- ]?in|mfa|otp|sso|session|token)\b/i,
    noun: 'authentication',
    architecture: [
      'Where is the device or credential binding stored, and what revokes it when a device is lost?',
      'Does the session and token lifecycle change, or must the new path fit the existing expiry?',
      'Is step-up authentication decided client-side or by a risk service?',
    ],
    product: [
      'What happens to a customer whose device cannot support the new method?',
      'Is enrolment opt-in, or on by default for eligible customers?',
    ],
  },
  {
    key: 'payments',
    match: /\b(payment|checkout|refund|ledger|billing|settle\w*|invoice)\b/i,
    noun: 'payments',
    architecture: [
      'Is the ledger the source of truth, or the payment gateway?',
      'How are partial failures reconciled — compensating transaction or manual repair?',
      'What idempotency key protects a retried submission?',
    ],
    product: [
      'Which currencies and payment methods are in scope for the first release?',
      'Who is accountable when a settlement is delayed?',
    ],
  },
  {
    key: 'notify',
    match: /\b(notification|notify|alert|email|push|sms|reminder)\b/i,
    noun: 'notifications',
    architecture: [
      'Are deliveries fire-and-forget, or does the sender need a delivery receipt?',
      'Where do templates and per-customer preferences live?',
    ],
    product: ['Which events are worth interrupting a customer for, and which are not?'],
  },
  {
    key: 'data',
    match: /\b(migration|migrate|report\w*|analytic\w*|dashboard|data\s?(model|set|warehouse))\b/i,
    noun: 'data',
    architecture: [
      'Is the migration one-off, or do the old and new shapes have to coexist?',
      'What is the rollback position once records have been rewritten?',
    ],
    product: ['What historical range has to be available on day one?'],
  },
];

export interface Finding {
  topic: string;
  from: SourceType;
  says: string;
  detail: string;
  excerpt: string;
}

/**
 * What each kind of source can tell you about a topic. A finding is only reached
 * when its topic matches what is being asked AND that kind of source is indexed
 * — so a source with nothing to say about your problem returns nothing.
 *
 * This is the filter. Without it retrieval dumps every passage that vaguely
 * matches and leaves the reader to sort it out, which is worse than nothing
 * because it looks like the work was done.
 */
export const FINDINGS: Finding[] = [
  {
    topic: 'auth',
    from: 'App',
    says: 'Every session starts with a PIN, and a new device also needs an OTP.',
    detail: 'No biometric path exists in the running application today.',
    excerpt: 'Screens observed: Login → OTP verification → Dashboard.',
  },
  {
    topic: 'auth',
    from: 'Repository',
    says: 'Session tokens have a fixed expiry that other channels share.',
    detail: 'Changing it here changes it everywhere that reads the same configuration.',
    excerpt: 'security.jwt.access-token-ttl: 15m',
  },
  {
    topic: 'auth',
    from: 'Confluence',
    says: 'Every customer-facing channel must federate through the central identity gateway.',
    detail: 'No new identity provider is available to this project.',
    excerpt: 'All customer-facing channels must federate through the central OAuth gateway.',
  },
  {
    topic: 'auth',
    from: 'Transcript',
    says: 'Repeated authentication failures fall back to the existing method and raise a security event.',
    detail: 'The failure sequence is logged, not just the final outcome.',
    excerpt: 'Agreed: three strikes, then PIN. Log the failure sequence.',
  },
  {
    topic: 'auth',
    from: 'Jira',
    says: 'Login problems are already the largest single category of customer complaints.',
    detail: 'The backlog quantifies the pain but phases the fix into a later release.',
    excerpt: 'FMB2-142: Login abandonment — 31% of support contacts. Target: R3.',
  },
  {
    topic: 'payments',
    from: 'Repository',
    says: 'Payment submission is already idempotent on a client-supplied key.',
    detail: 'A retry with the same key will not double-charge.',
    excerpt: 'Idempotency-Key header required on POST /payments',
  },
  {
    topic: 'payments',
    from: 'Confluence',
    says: 'Settlement is reconciled nightly against the ledger, not in real time.',
    detail: 'Anything expecting immediate confirmation will need a different path.',
    excerpt: 'Nightly reconciliation window: 23:00–01:00 IST.',
  },
  {
    topic: 'notify',
    from: 'Repository',
    says: 'Delivery is fire-and-forget, with no receipt returned to the sender.',
    detail: 'Anything needing confirmation of delivery does not exist yet.',
    excerpt: 'notification-service publishes to queue; no ack channel.',
  },
  {
    topic: 'data',
    from: 'Repository',
    says: 'The old and new record shapes would have to coexist during any migration.',
    detail: 'Nothing supports a hard cutover.',
    excerpt: 'schema_version column read by three services.',
  },
];

/*
 * Five tools between them cover what is needed here: what have I got
 * (list_sources), what does this one source say (read_source), what does
 * anything say about X (search_sources), do two sources agree
 * (compare_sources), and is this covered at all (check_coverage).
 */

// ───────────────────────────── Run input & output ─────────────────────────────

/** A tool call carrying its outcome; the terminal mints the id and animates it. */
export type PlannedCall = Omit<AgentToolCall, 'id' | 'status'> & {
  status: 'ok' | 'empty' | 'error';
};

/** A line the turn wants folded into the brief. */
export interface BriefAddition {
  band: BriefBandKey;
  text: string;
  evidenceClass: EvidenceClass;
  sourceIds: string[];
  sourceSummary: string;
}

export interface AgentRun {
  toolCalls: PlannedCall[];
  /** The reply, assembled from what the tools returned. */
  reply: string;
  briefAdditions: BriefAddition[];
  /** Questions this turn could not answer from any source. */
  questions: Omit<SpecQuestion, 'id'>[];
  /** Per-source extract records, kept so a brief line can be traced to a quote. */
  evidence: Omit<BoardCard, 'id'>[];
}

export interface AgentRunInput {
  /** What the user typed. Empty means the opening read over everything. */
  message: string;
  problemStatement: string;
  sources: SpecSource[];
  /** Lines already in the brief, so the same sentence is not added twice. */
  existingBriefText: string[];
  /** Questions already open, so the same one is not raised twice. */
  existingQuestionText: string[];
  /** Evidence titles already recorded, so a re-read does not duplicate them. */
  existingEvidenceText: string[];
  /**
   * Questions you have already settled. A re-read has to carry these into the
   * decided band, or answering a question would make it vanish from the brief
   * instead of becoming part of what is known.
   */
  settled: SpecQuestion[];
  pmName: string;
  architectName: string;
}

// ───────────────────────────── Retrieval helpers ─────────────────────────────

/** Words worth searching on — everything else matches too much to be useful. */
const STOP =
  /^(the|a|an|and|or|but|if|is|are|was|were|be|been|do|does|did|to|of|in|on|for|with|at|by|from|as|it|its|this|that|these|those|what|which|who|whom|how|why|when|where|can|could|should|would|will|shall|may|might|must|we|our|us|you|your|i|me|my|they|them|their|there|here|about|into|over|under|any|all|some|no|not|so|than|then|too|very|just|also|has|have|had|get|got|tell|show|know|need|want|like)$/i;

const keywords = (text: string): string[] => [
  ...new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.test(w))
  ),
];

/** Duration for a tool line — derived from its arguments, never random. */
const timeFor = (name: string, payload: string): number =>
  40 + ((name.length * 37 + payload.length * 11) % 760);

const nameList = (sources: SpecSource[]): string => sources.map((s) => s.name).join(' · ');

/**
 * Crude stemming, so "repeatedly" reaches "repeated" and "devices" reaches
 * "device". Six characters is enough to survive an inflection without matching
 * an unrelated word that merely starts the same way.
 */
const stem = (word: string): string => (word.length > 6 ? word.slice(0, 6) : word);

/** How many of the message's words a finding actually contains. */
const matchScore = (f: Finding, words: string[]): number => {
  const hay = `${f.says} ${f.detail} ${f.excerpt} ${f.topic}`.toLowerCase();
  return words.filter((w) => hay.includes(stem(w))).length;
};

/**
 * A finding answers a message when it shares at least two of its words.
 *
 * One shared word is not a match, it is a coincidence — "how many devices may a
 * customer register" and "every customer-facing channel must federate" overlap
 * on "customer" and have nothing to do with each other. Returning that as an
 * answer is precisely the confident-and-wrong behaviour this module exists to
 * avoid, so the bar is two.
 */
const answers = (f: Finding, words: string[]): boolean =>
  matchScore(f, words) >= Math.min(2, words.length);

/**
 * The kinds of source whose absence is worth reporting. Deliberately easy to
 * fail: if nothing describes the contracts, the brief says so instead of
 * inferring them and sounding certain.
 *
 * Shared by the opening read and by "what is missing?", so the two can never
 * give different answers about the same gap.
 */
const COVERAGE: {
  kind: string;
  /** How the gap reads as a line of the brief. */
  label: string;
  /** What is absent, named so it can be listed in a sentence. */
  missing: string;
  types: SourceType[];
  pattern: RegExp;
}[] = [
  {
    kind: 'contracts',
    label: 'What the interfaces look like',
    missing: 'an API or contract specification',
    types: ['Repository'],
    pattern: /api|openapi|swagger|contract|endpoint/i,
  },
  {
    kind: 'design',
    label: 'What the intended experience is',
    missing: 'a design, flow or screen source',
    types: ['Image'],
    pattern: /design|flow|figma|wireframe|mockup|screen/i,
  },
  {
    kind: 'acceptance',
    label: 'What the acceptance bar is',
    missing: 'a test plan or QA source',
    types: [],
    pattern: /test|qa|acceptance|criteria/i,
  },
];

/** An extract record, so every brief line can be traced back to a quote. */
const evidenceFor = (finding: Finding, source: SpecSource): Omit<BoardCard, 'id'> => ({
  sourceId: source.id,
  type: 'Context',
  state: 'Confirmed',
  title: finding.says,
  content: finding.detail,
  evidenceClass: 'Source fact',
  provenance: {
    system: source.type,
    itemId: source.name,
    indexedAt: 'this reading',
    excerpt: finding.excerpt,
  },
  relations: [],
  aiCreated: true,
  rationale: `Read from ${source.name} because it bears on the problem statement.`,
});

// ─────────────────────────────── The opening read ───────────────────────────────

/**
 * Read every indexed source against the problem statement. This is what fills
 * the brief the first time, and the call per source is the answer to "did you
 * actually open the thing I gave you".
 */
const openingRun = (input: AgentRunInput): AgentRun => {
  const {
    problemStatement,
    sources,
    existingBriefText,
    existingEvidenceText,
    settled,
    pmName,
    architectName,
  } = input;

  const statement = problemStatement.trim();
  const indexed = sources.filter((s) => s.ingest === 'Indexed');
  const pending = sources.filter((s) => s.ingest === 'Parsing' || s.ingest === 'Queued');
  const failed = sources.filter((s) => s.ingest === 'Failed');

  const topics = TOPICS.filter((t) => t.match.test(statement));
  const topicKeys = topics.map((t) => t.key);
  const subject = topics[0]?.noun ?? 'this change';

  const toolCalls: PlannedCall[] = [
    {
      name: 'list_sources',
      argument: 'project',
      durationMs: timeFor('list_sources', String(sources.length)),
      status: sources.length > 0 ? 'ok' : 'empty',
      result:
        sources.length === 0
          ? 'Nothing is connected.'
          : `${indexed.length} readable, ${pending.length} still parsing, ${failed.length} failed.`,
    },
  ];

  const briefAdditions: BriefAddition[] = [];
  const evidence: Omit<BoardCard, 'id'>[] = [];

  const known = new Set(existingBriefText.map((t) => t.toLowerCase()));
  const recorded = new Set(existingEvidenceText.map((t) => t.toLowerCase()));
  const add = (a: BriefAddition) => {
    if (known.has(a.text.toLowerCase())) return;
    known.add(a.text.toLowerCase());
    briefAdditions.push(a);
  };

  /*
   * Questions are deduplicated here rather than only when they reach state, so
   * that the reply and the audit line report what actually happened. A re-read
   * claiming to have raised eight questions it had already asked is a lie about
   * its own work, and the count is the first thing anyone checks.
   */
  const asked = new Set(input.existingQuestionText.map((t) => t.toLowerCase()));
  const questions: Omit<SpecQuestion, 'id'>[] = [];
  const ask = (q: Omit<SpecQuestion, 'id'>) => {
    if (asked.has(q.text.toLowerCase())) return;
    asked.add(q.text.toLowerCase());
    questions.push(q);
  };

  if (statement)
    add({
      band: 'understood',
      text: `The ask, as you stated it: ${statement.replace(/\s+/g, ' ')}`,
      evidenceClass: 'User decision',
      sourceIds: [],
      sourceSummary: 'Stated by you',
    });

  /* Everything you have already settled, so the brief reflects the conversation
     rather than staying the first impression it started as. */
  for (const q of settled)
    add({
      band: 'decided',
      text: `${q.text} — ${q.answer ?? 'settled without a note.'}`,
      evidenceClass: q.status === 'Assumed' ? 'AI assumption' : 'User decision',
      sourceIds: [],
      sourceSummary:
        q.status === 'Deferred'
          ? `Deferred by ${q.owner}`
          : q.status === 'Assumed'
          ? `Assumed, pending confirmation by ${q.owner}`
          : `Answered by ${q.owner}`,
    });

  /* One read_source call per source. A source with nothing to say returns empty
     and contributes nothing — which is exactly why the call is shown: you can
     see it was opened, and see that it was quiet. */
  let found = 0;
  for (const source of indexed) {
    const hits = FINDINGS.filter((f) => topicKeys.includes(f.topic) && f.from === source.type);

    toolCalls.push({
      name: 'read_source',
      argument: source.name,
      sourceId: source.id,
      durationMs: timeFor('read_source', source.name + source.type),
      status: hits.length > 0 ? 'ok' : 'empty',
      result:
        hits.length > 0
          ? `${hits.length} passage${hits.length === 1 ? '' : 's'} bearing on the statement.`
          : topics.length === 0
          ? 'Read. The statement names no subject I could search this against.'
          : `Read. Nothing here bears on ${subject}.`,
      excerpt: hits[0]?.excerpt,
    });

    for (const f of hits) {
      found += 1;
      add({
        band: 'understood',
        text: f.says,
        evidenceClass: 'Source fact',
        sourceIds: [source.id],
        sourceSummary: source.name,
      });
      if (!recorded.has(f.says.toLowerCase())) {
        recorded.add(f.says.toLowerCase());
        evidence.push(evidenceFor(f, source));
      }
    }
  }

  for (const f of failed) {
    toolCalls.push({
      name: 'read_source',
      argument: f.name,
      sourceId: f.id,
      durationMs: timeFor('read_source', f.name),
      status: 'error',
      result: f.ingestNote ?? 'Ingestion failed — nothing from this reached the reading.',
    });

    add({
      band: 'cannotTell',
      text: `Anything covered by ${f.name} — it failed to ingest, so it is absent from this reading.`,
      evidenceClass: 'AI assumption',
      sourceIds: [f.id],
      sourceSummary: `${f.name} · unreadable`,
    });

    ask({
      track: 'Product',
      text: `Can ${f.name} be re-supplied in a readable form?`,
      rationale: `It failed to ingest${
        f.ingestNote ? ` (${f.ingestNote})` : ''
      }, so nothing it covers reached this reading.`,
      owner: pmName,
      status: 'Open',
    });
  }

  for (const g of COVERAGE) {
    const covered = indexed.some((s) => g.types.includes(s.type) || g.pattern.test(s.name));
    toolCalls.push({
      name: 'check_coverage',
      argument: g.kind,
      durationMs: timeFor('check_coverage', g.kind),
      status: covered ? 'ok' : 'empty',
      result: covered ? 'Covered by an indexed source.' : 'No source covers this.',
    });

    if (!covered)
      add({
        band: 'cannotTell',
        text: `${g.label} — no source covers it, so anything said about it downstream is a guess.`,
        evidenceClass: 'AI assumption',
        sourceIds: [],
        sourceSummary: 'Nothing indexed',
      });
  }

  /* A disagreement between two sources is a decision you have to make, so it is
     found explicitly rather than averaged into a summary. */
  const backlog = indexed.find((s) => s.type === 'Jira');
  const talk = indexed.find((s) => s.type === 'Transcript');
  const disagreement = `Two sources disagree on when ${subject} is needed.`;

  if (backlog && talk) {
    toolCalls.push({
      name: 'compare_sources',
      argument: `${backlog.name} ↔ ${talk.name}`,
      durationMs: timeFor('compare_sources', backlog.name + talk.name),
      status: 'ok',
      result: `They disagree on when ${subject} is needed.`,
      excerpt: 'Backlog phases it into a later release; the conversation treats it as immediate.',
    });

    add({
      band: 'inferring',
      text: `Priority is contested: the backlog phases ${subject} while the recorded conversation treats it as immediate. I am reading the conversation as the more current of the two.`,
      evidenceClass: 'AI assumption',
      sourceIds: [backlog.id, talk.id],
      sourceSummary: nameList([backlog, talk]),
    });

    ask({
      track: 'Product',
      text: `Is ${subject} required for this release, or is the backlog's phasing correct?`,
      rationale:
        'The backlog and the recorded conversation disagree, and nothing indexed breaks the tie.',
      owner: pmName,
      status: 'Open',
    });

    if (!recorded.has(disagreement.toLowerCase()))
      evidence.push({
        type: 'Disagreement',
        state: 'Flagged',
        title: disagreement,
        content: 'One phases it into a later release. The other treats it as needed now.',
        evidenceClass: 'Source fact',
        conflict: {
          claimA: `The backlog phases ${subject} into a later release.`,
          claimASource: backlog.name,
          claimB: `The conversation treats ${subject} as needed now.`,
          claimBSource: talk.name,
          observedState: indexed.some((s) => s.type === 'App')
            ? 'The running application does not implement it at all.'
            : 'No observed application state to compare against.',
        },
        relations: [],
        aiCreated: true,
        rationale: 'Compared backlog phasing against the language used in the conversation.',
      });
  }

  /* The architecture questions matter most: an unanswered one propagates into
     every artifact generated after this stage. */
  for (const t of topics) {
    for (const q of t.architecture)
      ask({
        track: 'Architecture',
        text: q,
        rationale: `Unresolved for ${t.noun}; no indexed source covers it.`,
        owner: architectName,
        status: 'Open',
      });
    for (const q of t.product)
      ask({
        track: 'Product',
        text: q,
        rationale: `Standard unknown for ${t.noun} work; no indexed source answers it.`,
        owner: pmName,
        status: 'Open',
      });
  }

  ask({
    track: 'Product',
    text: 'What is explicitly out of scope for this release?',
    rationale: 'No source draws the outer edge, so scope creep has nothing to push against.',
    owner: pmName,
    status: 'Open',
  });

  if (topics.length === 0 && statement)
    add({
      band: 'inferring',
      text: 'I could not place this statement in a subject I recognise, so my questions are general rather than specific to it.',
      evidenceClass: 'AI assumption',
      sourceIds: [],
      sourceSummary: 'No source — my own reading',
    });

  const uncovered = briefAdditions.filter((b) => b.band === 'cannotTell').length;
  const reply = [
    statement
      ? 'I read your statement against everything readable and kept only what bears on it.'
      : 'There is no problem statement yet, so I read the sources with nothing to aim at. Write one and ask me again — it changes what counts as relevant.',
    indexed.length === 0
      ? 'Nothing has finished indexing, so I have nothing to quote.'
      : `${indexed.length} source${indexed.length === 1 ? '' : 's'} read, ${found} passage${
          found === 1 ? '' : 's'
        } worth keeping. The quiet ones are listed above so you can see they were opened and had nothing to say about this.`,
    uncovered > 0
      ? `${uncovered} thing${
          uncovered === 1 ? '' : 's'
        } no source covers at all — those sit in the brief under what I can't tell rather than being smoothed over.`
      : '',
    questions.length > 0
      ? `I raised ${questions.length} question${
          questions.length === 1 ? '' : 's'
        } nothing indexed can answer. The architecture ones are cheapest to settle now, before anything is generated from this.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return { toolCalls, reply, briefAdditions, questions, evidence };
};

// ─────────────────────────────── A chat turn ───────────────────────────────

/**
 * Three shapes, decided by what you typed: a decision to record, a question the
 * sources can answer, or a question they cannot.
 */
const chatRun = (input: AgentRunInput): AgentRun => {
  const {
    message,
    problemStatement,
    sources,
    existingBriefText,
    existingQuestionText,
    existingEvidenceText,
    pmName,
    architectName,
  } = input;

  const text = message.trim().replace(/\s+/g, ' ');
  const indexed = sources.filter((s) => s.ingest === 'Indexed');
  const words = keywords(text);
  const asksSomething =
    /\?|^(what|which|who|how|why|when|where|is|are|does|do|can|could|should|tell|show|list|find|check|compare)\b/i.test(
      text
    );

  /* A statement is a decision, not a query. This is the one way the brief gains
     something no source said — and it is marked as yours rather than laundered
     into a fact. */
  if (!asksSomething && text.length > 12) {
    const already = existingBriefText.some((t) => t.toLowerCase() === text.toLowerCase());
    return {
      toolCalls: [
        {
          name: 'search_sources',
          argument: words.slice(0, 4).join(' ') || 'your statement',
          durationMs: timeFor('search_sources', text),
          status: 'ok',
          result: 'Checked whether anything indexed contradicts this before recording it.',
        },
      ],
      reply: already
        ? 'That is already in the brief as your decision, so I left it alone.'
        : 'Recorded in the brief as your decision — marked as yours, not as something a source says. It carries into the requirements when you lock this stage.',
      briefAdditions: already
        ? []
        : [
            {
              band: 'decided',
              text,
              evidenceClass: 'User decision',
              sourceIds: [],
              sourceSummary: 'Decided by you, in conversation',
            },
          ],
      questions: [],
      evidence: [],
    };
  }

  const toolCalls: PlannedCall[] = [];
  const briefAdditions: BriefAddition[] = [];
  const questions: Omit<SpecQuestion, 'id'>[] = [];
  const evidence: Omit<BoardCard, 'id'>[] = [];

  /*
   * Two questions are about the reading itself rather than about the sources, and
   * the agent can answer them from what it already knows. Without these, "what is
   * missing?" would fall through to "no source covers this" — technically true and
   * completely useless, since the whole point is that the agent knows what is
   * missing.
   */
  if (/\b(missing|gap|gaps|need|lack\w*|gone|absent|gaps?)\b/i.test(text)) {
    const uncovered: string[] = [];
    for (const g of COVERAGE) {
      const covered = indexed.some((s) => g.types.includes(s.type) || g.pattern.test(s.name));
      toolCalls.push({
        name: 'check_coverage',
        argument: g.kind,
        durationMs: timeFor('check_coverage', g.kind),
        status: covered ? 'ok' : 'empty',
        result: covered ? 'Covered by an indexed source.' : 'No source covers this.',
      });
      if (!covered) uncovered.push(g.missing);
    }

    return {
      toolCalls,
      reply:
        uncovered.length === 0
          ? 'Nothing structural is missing — every kind of source I check for is connected. What is left is the open questions, which are decisions rather than gaps.'
          : `${uncovered.length === 1 ? 'One kind of source is' : `${uncovered.length} kinds of source are`} not connected: ${uncovered.join(
              ', '
            )}. Each is already in the brief under what I can't tell — connecting any one of them turns a guess into a fact.`,
      briefAdditions: [],
      questions: [],
      evidence: [],
    };
  }

  const backlog = indexed.find((s) => s.type === 'Jira');
  const talk = indexed.find((s) => s.type === 'Transcript');

  if (
    /\b(agree|disagree\w*|conflict\w*|contradict\w*|priorit\w*|phasing|tension)\b/i.test(text) &&
    backlog &&
    talk
  ) {
    toolCalls.push({
      name: 'compare_sources',
      argument: `${backlog.name} ↔ ${talk.name}`,
      durationMs: timeFor('compare_sources', backlog.name + talk.name),
      status: 'ok',
      result: 'They do not agree.',
      excerpt: 'Backlog phases it into a later release; the conversation treats it as immediate.',
    });

    return {
      toolCalls,
      reply: `No. ${backlog.name} phases this into a later release while ${talk.name} treats it as needed now, and nothing indexed breaks the tie. That is a decision rather than a gap, so it is listed in the brief as something to settle — I am reading the conversation as the more current of the two until you say otherwise.`,
      briefAdditions: [],
      questions: [],
      evidence: [],
    };
  }

  const query = words.slice(0, 5).join(' ') || text.slice(0, 40);
  const candidates = FINDINGS.filter((f) => answers(f, words));
  const available = candidates
    .filter((f) => indexed.some((s) => s.type === f.from))
    .sort((a, b) => matchScore(b, words) - matchScore(a, words));
  const sourceCount = new Set(available.map((f) => f.from)).size;

  toolCalls.push({
    name: 'search_sources',
    argument: query,
    durationMs: timeFor('search_sources', query),
    status: available.length > 0 ? 'ok' : 'empty',
    result:
      available.length > 0
        ? `${available.length} match${available.length === 1 ? '' : 'es'} across ${sourceCount} source${
            sourceCount === 1 ? '' : 's'
          }.`
        : indexed.length === 0
        ? 'Nothing is indexed to search.'
        : `No passage in ${indexed.length} indexed source${
            indexed.length === 1 ? '' : 's'
          } mentions this.`,
  });

  /* Then open each source that matched, so the reply can quote it. */
  const quoted: { finding: Finding; source: SpecSource }[] = [];
  for (const f of available) {
    const source = indexed.find((s) => s.type === f.from);
    if (!source) continue;

    toolCalls.push({
      name: 'read_source',
      argument: source.name,
      sourceId: source.id,
      durationMs: timeFor('read_source', source.name + f.says),
      status: 'ok',
      result: f.says,
      excerpt: f.excerpt,
    });
    quoted.push({ finding: f, source });
  }

  if (quoted.length > 0) {
    const known = new Set(existingBriefText.map((t) => t.toLowerCase()));
    const recorded = new Set(existingEvidenceText.map((t) => t.toLowerCase()));

    for (const { finding, source } of quoted) {
      if (!known.has(finding.says.toLowerCase())) {
        known.add(finding.says.toLowerCase());
        briefAdditions.push({
          band: 'understood',
          text: finding.says,
          evidenceClass: 'Source fact',
          sourceIds: [source.id],
          sourceSummary: source.name,
        });
      }
      if (!recorded.has(finding.says.toLowerCase())) {
        recorded.add(finding.says.toLowerCase());
        evidence.push(evidenceFor(finding, source));
      }
    }

    const lead = quoted[0];
    const reply = [
      `${lead.source.name} answers this directly: ${lead.finding.says.replace(/\.$/, '')}. ${
        lead.finding.detail
      }`,
      quoted.length > 1
        ? `${quoted.length - 1} other source${
            quoted.length - 1 === 1 ? '' : 's'
          } bear on it too — each call above shows which and what it said.`
        : '',
      briefAdditions.length > 0
        ? `${briefAdditions.length} of that was not in the brief yet, so I added ${
            briefAdditions.length === 1 ? 'it' : 'them'
          } with the source attached.`
        : 'All of it was already in the brief, so nothing changed there.',
    ]
      .filter(Boolean)
      .join(' ');

    return { toolCalls, reply, briefAdditions, questions, evidence };
  }

  /* Nothing answered it. This branch is what keeps the module honest: the
     temptation is to answer anyway, and the cost is a specification resting on a
     sentence nobody can trace. */
  const topic = TOPICS.find((t) => t.match.test(text) || t.match.test(problemStatement));
  const isArchitectural =
    /\b(architect\w*|service|api|contract|token|session|scale|latency|deploy\w*|storage|database|schema|queue|cache|migration|rollback|failure|integrat\w*)\b/i.test(
      text
    );

  toolCalls.push({
    name: 'check_coverage',
    argument: topic?.key ?? 'this question',
    durationMs: timeFor('check_coverage', text),
    status: 'empty',
    result: 'No indexed source is authoritative on this.',
  });

  const alreadyAsked = existingQuestionText.some((t) => t.toLowerCase() === text.toLowerCase());
  if (!alreadyAsked)
    questions.push({
      track: isArchitectural ? 'Architecture' : 'Product',
      text,
      rationale: `Asked in conversation; searched ${indexed.length} indexed source${
        indexed.length === 1 ? '' : 's'
      } and none covers it.`,
      owner: isArchitectural ? architectName : pmName,
      status: 'Open',
    });

  if (!existingBriefText.some((t) => t.toLowerCase() === text.toLowerCase()))
    briefAdditions.push({
      band: 'cannotTell',
      text,
      evidenceClass: 'AI assumption',
      sourceIds: [],
      sourceSummary: `Searched ${indexed.length} source${
        indexed.length === 1 ? '' : 's'
      } — no coverage`,
    });

  const reply = [
    indexed.length === 0
      ? 'I have nothing readable to answer from yet.'
      : `Nothing in the ${indexed.length} source${
          indexed.length === 1 ? '' : 's'
        } I can read answers that, and I am not going to guess — a sentence you cannot trace is worse than a gap you can see.`,
    alreadyAsked
      ? 'It is already in the open questions.'
      : `It is now an open ${isArchitectural ? 'architecture' : 'product'} question for ${
          isArchitectural ? architectName : pmName
        }, and in the brief under what I can't tell.`,
    'If you already know the answer, type it as a statement and I will record it as your decision.',
  ]
    .filter(Boolean)
    .join(' ');

  return { toolCalls, reply, briefAdditions, questions, evidence };
};

/** Entry point. An empty message means the opening read over every source. */
export const runAgent = (input: AgentRunInput): AgentRun =>
  input.message.trim() === '' ? openingRun(input) : chatRun(input);

// ───────────────────────────── Folding into the brief ─────────────────────────────

/**
 * Add a turn's lines to the brief's bands. Existing lines are kept: the brief
 * accumulates through the conversation rather than being rewritten by whatever
 * was asked last.
 *
 * Ids are derived from the version and position rather than minted, so this
 * stays pure enough to run inside a state updater.
 */
export const foldIntoBands = (
  bands: Record<BriefBandKey, BriefLine[]>,
  additions: BriefAddition[],
  version: number
): Record<BriefBandKey, BriefLine[]> => {
  const next: Record<BriefBandKey, BriefLine[]> = {
    understood: [...bands.understood],
    decided: [...bands.decided],
    inferring: [...bands.inferring],
    cannotTell: [...bands.cannotTell],
  };

  additions.forEach((a, i) => {
    next[a.band] = [
      ...next[a.band],
      {
        id: `brief-v${version}-${a.band}-${i}`,
        text: a.text,
        evidenceClass: a.evidenceClass,
        sourceIds: a.sourceIds,
        sourceSummary: a.sourceSummary,
      },
    ];
  });

  return next;
};

export const EMPTY_BANDS = (): Record<BriefBandKey, BriefLine[]> => ({
  understood: [],
  decided: [],
  inferring: [],
  cannotTell: [],
});

/**
 * The narrative at the top of the brief, rewritten from the bands every time
 * they change. Derived rather than stored, so it can never describe a brief that
 * has moved on.
 */
export const briefNarrative = (
  problemStatement: string,
  bands: Record<BriefBandKey, BriefLine[]>,
  sources: SpecSource[],
  exchanges: number,
  openQuestions: number
): string => {
  const statement = problemStatement.trim();
  const indexed = sources.filter((s) => s.ingest === 'Indexed');

  return [
    statement
      ? `This project exists because: ${statement}`
      : 'No problem statement has been written yet, so this brief has nothing to aim at.',
    indexed.length === 0
      ? 'Nothing has finished indexing, so everything below came out of the conversation rather than a source.'
      : `Built from ${indexed.length} readable source${
          indexed.length === 1 ? '' : 's'
        } — ${nameList(indexed)} — across ${exchanges} exchange${
          exchanges === 1 ? '' : 's'
        } in the terminal. Every line below names where it came from.`,
    bands.understood.length > 0 || bands.decided.length > 0
      ? `What is firm: ${bands.understood.length} thing${
          bands.understood.length === 1 ? '' : 's'
        } a source states outright, and ${bands.decided.length} you settled in conversation. Those are safe to build on.`
      : 'Nothing is firm yet — ask the agent to read your sources.',
    bands.inferring.length > 0 || bands.cannotTell.length > 0
      ? `What is not firm: ${bands.inferring.length} thing${
          bands.inferring.length === 1 ? '' : 's'
        } I am assuming that no source states, and ${bands.cannotTell.length} that nothing covers at all. Both are listed below rather than folded into the prose.`
      : '',
    openQuestions > 0
      ? `${openQuestions} question${
          openQuestions === 1 ? ' is' : 's are'
        } still open. The architecture ones propagate into every artifact generated after this stage, so they are cheapest to settle here.`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};
