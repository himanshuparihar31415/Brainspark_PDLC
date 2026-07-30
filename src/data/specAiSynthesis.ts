import {
  BoardCard,
  BriefBandKey,
  BriefLine,
  QuestionTrack,
  SourceType,
  SpecQuestion,
  SpecSource,
  UnderstandingBrief,
} from '../types/specai';

/**
 * Synthesis — turns a problem statement plus everything indexed into a
 * provisional reading, a question queue, and flag cards for the board.
 *
 * Two rules shape all of it. First, a line never claims more than its sources
 * support: anything reasoned lands in `inferring`, anything unsourced lands in
 * `cannotTell` and becomes a question rather than a confident sentence. Second,
 * absence is a finding — "no API specification is connected" is information, and
 * suppressing it is what makes generated overviews feel authoritative and be wrong.
 */

export interface SynthesisInput {
  problemStatement: string;
  sources: SpecSource[];
  /** Existing board cards, so a flag is never raised twice. */
  cards: BoardCard[];
  /** Anything already settled with the agent. Becomes the decided band. */
  settled: SpecQuestion[];
  /** Version of the brief being produced. */
  version: number;
  pmName: string;
  architectName: string;
}

export interface SynthesisResult {
  brief: UnderstandingBrief;
  questions: SpecQuestion[];
  /** Pieces of context for the board. Positionless — the board lays them out. */
  boardCards: Omit<BoardCard, 'id'>[];
}

/** Subject areas the statement can be about, and what each one forces you to decide. */
const TOPICS: {
  key: string;
  match: RegExp;
  noun: string;
  architecture: string[];
  product: string[];
}[] = [
  {
    key: 'auth',
    match: /\b(login|log[- ]?in|auth\w*|biometric|password|passcode|sign[- ]?in|mfa|otp|sso|session)\b/i,
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
      'Is the migration one-off or does the old and new shape have to coexist?',
      'What is the rollback position once records have been rewritten?',
    ],
    product: ['What historical range has to be available on day one?'],
  },
];

/**
 * What each kind of source can tell you about a topic. A finding only reaches the
 * board when its topic matches the problem statement AND that kind of source is
 * indexed — so a source with nothing to say about your problem puts nothing on the
 * board, and an unmatched topic puts nothing there at all.
 *
 * This is the filter. Without it retrieval dumps every passage that vaguely
 * matches and leaves the reader to sort it out, which is worse than nothing
 * because it looks like the work was done.
 */
const FINDINGS: {
  topic: string;
  from: SourceType;
  /** Which lane this belongs in once it reaches the board. */
  lane: string;
  says: string;
  detail: string;
  excerpt: string;
}[] = [
  {
    topic: 'auth',
    from: 'App',
    lane: 'lane-current',
    says: 'Every session starts with a PIN, and a new device also needs an OTP.',
    detail: 'No biometric path exists in the running application today.',
    excerpt: 'Screens observed: Login → OTP verification → Dashboard.',
  },
  {
    topic: 'auth',
    from: 'Repository',
    lane: 'lane-constraints',
    says: 'Session tokens have a fixed expiry that other channels share.',
    detail: 'Changing it here changes it everywhere that reads the same configuration.',
    excerpt: 'security.jwt.access-token-ttl: 15m',
  },
  {
    topic: 'auth',
    from: 'Confluence',
    lane: 'lane-constraints',
    says: 'Every customer-facing channel must federate through the central identity gateway.',
    detail: 'No new identity provider is available to this project.',
    excerpt: 'All customer-facing channels must federate through the central OAuth gateway.',
  },
  {
    topic: 'auth',
    from: 'Transcript',
    lane: 'lane-decisions',
    says: 'Repeated authentication failures fall back to the existing method and raise a security event.',
    detail: 'The failure sequence is logged, not just the final outcome.',
    excerpt: 'Agreed: three strikes, then PIN. Log the failure sequence.',
  },
  {
    topic: 'payments',
    from: 'Repository',
    lane: 'lane-current',
    says: 'Payment submission is already idempotent on a client-supplied key.',
    detail: 'A retry with the same key will not double-charge.',
    excerpt: 'Idempotency-Key header required on POST /payments',
  },
  {
    topic: 'payments',
    from: 'Confluence',
    lane: 'lane-constraints',
    says: 'Settlement is reconciled nightly against the ledger, not in real time.',
    detail: 'Anything expecting immediate confirmation will need a different path.',
    excerpt: 'Nightly reconciliation window: 23:00–01:00 IST.',
  },
  {
    topic: 'notify',
    from: 'Repository',
    lane: 'lane-current',
    says: 'Delivery is fire-and-forget, with no receipt returned to the sender.',
    detail: 'Anything needing confirmation of delivery does not exist yet.',
    excerpt: 'notification-service publishes to queue; no ack channel.',
  },
  {
    topic: 'data',
    from: 'Repository',
    lane: 'lane-constraints',
    says: 'The old and new record shapes would have to coexist during any migration.',
    detail: 'Nothing supports a hard cutover.',
    excerpt: 'schema_version column read by three services.',
  },
];

const nextId = (prefix: string, n: number) => `${prefix}-${n}`;

export const synthesize = (input: SynthesisInput): SynthesisResult => {
  const { problemStatement, sources, cards, settled, version, pmName, architectName } = input;

  const indexed = sources.filter((s) => s.ingest === 'Indexed');
  const failed = sources.filter((s) => s.ingest === 'Failed');
  const of = (type: SourceType) => indexed.filter((s) => s.type === type);
  const has = (type: SourceType) => of(type).length > 0;
  /* Coverage is asked of the sources themselves. Absence is a finding, so these
     are deliberately easy to fail: if nothing describes contracts, say so. */
  const covers = (pattern: RegExp, types: SourceType[]) =>
    indexed.some((x) => types.includes(x.type) || pattern.test(x.name));
  const coversContracts = covers(/api|openapi|swagger|contract|endpoint/i, ['Repository']);
  const coversDesign = covers(/design|flow|figma|wireframe|mockup|screen/i, ['Image']);

  const statement = problemStatement.trim();
  const topics = TOPICS.filter((t) => t.match.test(statement));
  /** Fall back to a generic line of questioning rather than pretending to know the domain. */
  const subject = topics[0]?.noun ?? 'this change';

  let seq = 0;
  const line = (
    text: string,
    evidenceClass: BriefLine['evidenceClass'],
    backing: SpecSource[]
  ): BriefLine => ({
    id: nextId(`brief-v${version}`, ++seq),
    text,
    evidenceClass,
    sourceIds: backing.map((s) => s.id),
    sourceSummary: backing.length
      ? backing.map((s) => s.name).join(' · ')
      : 'No source — stated by you',
  });

  const bands: Record<BriefBandKey, BriefLine[]> = {
    understood: [],
    decided: [],
    inferring: [],
    cannotTell: [],
  };

  /* Everything settled with the agent, so the brief reflects the conversation
     rather than staying the first impression it started as. */
  for (const q of settled)
    bands.decided.push(
      line(
        `${q.text} — ${q.answer ?? 'settled without a note.'}`,
        q.status === 'Assumed' ? 'AI assumption' : 'User decision',
        []
      )
    );

  // ── What I understand ──────────────────────────────────────────────────────

  if (statement)
    bands.understood.push(
      line(`The ask, as you stated it: ${statement.replace(/\s+/g, ' ')}`, 'User decision', [])
    );

  if (has('Jira'))
    bands.understood.push(
      line(
        `The backlog already tracks work in this area (${
          of('Jira')[0].detail ?? 'indexed'
        }), so this is not starting from nothing.`,
        'Source fact',
        of('Jira')
      )
    );

  if (has('Transcript'))
    bands.understood.push(
      line(
        `Stakeholders described the intent directly in ${of('Transcript').length} recorded ${
          of('Transcript').length === 1 ? 'conversation' : 'conversations'
        }, so the motivation is first-hand rather than relayed.`,
        'Source fact',
        of('Transcript')
      )
    );

  if (has('App'))
    bands.understood.push(
      line(
        'The current journey has been observed in the running application, so present-day behaviour is known rather than remembered.',
        'Source fact',
        of('App')
      )
    );

  if (has('Repository'))
    bands.understood.push(
      line(
        `The existing implementation is indexed (${
          of('Repository')
            .map((s) => s.name)
            .join(', ')
        }), so current structure is fact and not assumption.`,
        'Source fact',
        of('Repository')
      )
    );

  if (has('Confluence'))
    bands.understood.push(
      line(
        'Platform standards are indexed and constrain what any solution is allowed to do.',
        'Source fact',
        of('Confluence')
      )
    );

  const written = [...of('DOCX'), ...of('PDF'), ...of('TXT')];
  if (written.length)
    bands.understood.push(
      line(
        `${written.length} written ${
          written.length === 1 ? 'document' : 'documents'
        } cover this in prose, indexed and quotable.`,
        'Source fact',
        written
      )
    );

  if (has('Image'))
    bands.understood.push(
      line(
        `${of('Image').length} screen ${
          of('Image').length === 1 ? 'capture' : 'captures'
        } were read as images — treat anything drawn from them as an extraction, not a quotation.`,
        'Inferred interpretation',
        of('Image')
      )
    );

  // ── What I'm inferring ─────────────────────────────────────────────────────

  if (has('Jira') && has('Transcript'))
    bands.inferring.push(
      line(
        `Priority looks contested: the backlog phases ${subject} while the conversations treat it as immediate. I am reading the conversations as more current.`,
        'AI assumption',
        [...of('Jira'), ...of('Transcript')]
      )
    );

  if (has('App') && !has('Repository'))
    bands.inferring.push(
      line(
        'Behaviour comes from watching the application. Without the code, the mechanism producing that behaviour is a guess.',
        'AI assumption',
        of('App')
      )
    );

  if (has('Repository'))
    bands.inferring.push(
      line(
        'Nothing states the target design, so I am assuming this extends the indexed services rather than replacing them.',
        'AI assumption',
        of('Repository')
      )
    );

  if (topics.length === 0 && statement)
    bands.inferring.push(
      line(
        'I could not place this statement in a domain I recognise, so my questions below are general rather than specific to it.',
        'AI assumption',
        []
      )
    );

  // ── What I can't tell yet ──────────────────────────────────────────────────

  if (!coversContracts)
    bands.cannotTell.push(
      line(
        'What the contracts look like — no API specification is connected, so every interface below is inferred.',
        'AI assumption',
        []
      )
    );

  if (!coversDesign)
    bands.cannotTell.push(
      line(
        'What the intended experience is — no design or flow source is connected.',
        'AI assumption',
        []
      )
    );

  if (!has('Repository') && !written.some((s) => /legacy|architecture|as[- ]is/i.test(s.name)))
    bands.cannotTell.push(
      line(
        'How the system is built today — nothing describes the existing architecture, so I cannot say what this has to fit into.',
        'AI assumption',
        []
      )
    );

  bands.cannotTell.push(
    line(
      'What the acceptance bar is — no test plan or QA source is connected, so success stays a matter of opinion.',
      'AI assumption',
      []
    )
  );

  for (const f of failed)
    bands.cannotTell.push(
      line(
        `Anything covered by ${f.name} — it failed to ingest${
          f.ingestNote ? ` (${f.ingestNote})` : ''
        }, so it is absent from this reading.`,
        'AI assumption',
        [f]
      )
    );

  if (indexed.length === 0)
    bands.cannotTell.push(
      line(
        'Almost everything. Nothing has finished indexing, so this reading is built from your statement alone.',
        'AI assumption',
        []
      )
    );

  // ── Questions ──────────────────────────────────────────────────────────────

  let qSeq = 0;
  const question = (
    track: QuestionTrack,
    text: string,
    rationale: string
  ): SpecQuestion => ({
    id: nextId(`q-v${version}`, ++qSeq),
    track,
    text,
    rationale,
    owner: track === 'Architecture' ? architectName : pmName,
    status: 'Open',
  });

  const questions: SpecQuestion[] = [];

  // Product — scope and priority, which no source can settle on its own.
  if (has('Jira') && has('Transcript'))
    questions.push(
      question(
        'Product',
        `Is ${subject} required for this release, or is the backlog's phasing correct?`,
        'The backlog and the recorded conversations disagree, and nothing indexed breaks the tie.'
      )
    );

  questions.push(
    question(
      'Product',
      'What is explicitly out of scope for this release?',
      'No source draws the outer edge, so scope creep has nothing to push against.'
    )
  );

  for (const t of topics) for (const q of t.product) questions.push(question('Product', q, `Standard unknown for ${t.noun} work; no indexed source answers it.`));

  // Architecture — the questions that propagate into every downstream artifact.
  if (has('Repository'))
    questions.push(
      question(
        'Architecture',
        `Does this extend ${of('Repository')[0].name}, or land in a new service?`,
        'The repository is indexed but nothing states where new capability belongs.'
      )
    );
  else
    questions.push(
      question(
        'Architecture',
        'Is this greenfield, or is there an existing system I have not been shown?',
        'No repository or architecture source is connected, so I cannot tell which.'
      )
    );

  if (coversContracts)
    questions.push(
      question(
        'Architecture',
        'Is this an additive change to the existing endpoints, or a new contract version?',
        'The API specification is indexed, so this is a decision rather than an unknown.'
      )
    );

  if (has('Confluence'))
    questions.push(
      question(
        'Architecture',
        'Which platform standards apply here, and does anything need a documented exception?',
        'Standards are indexed and binding, but which clauses bite is not stated.'
      )
    );

  for (const t of topics)
    for (const q of t.architecture)
      questions.push(
        question('Architecture', q, `Unresolved for ${t.noun}; no indexed source covers it.`)
      );

  questions.push(
    question(
      'Architecture',
      'What is the failure mode when the new path is unavailable?',
      'Every source describes the happy path. None describes degradation.'
    )
  );

  // ── Cards for the board ─────────────────────────────────────────

  const boardCards: Omit<BoardCard, 'id'>[] = [];
  const alreadyOnBoard = (t: string) =>
    cards.some((c) => c.title.toLowerCase() === t.toLowerCase());

  const topicKeys = topics.map((t) => t.key);
  for (const f of FINDINGS) {
    if (!topicKeys.includes(f.topic)) continue;

    const backing = of(f.from)[0];
    if (!backing || alreadyOnBoard(f.says)) continue;

    boardCards.push({
      sourceId: backing.id,
      laneId: f.lane,
      type: 'Context',
      state: 'Confirmed',
      title: f.says,
      content: f.detail,
      evidenceClass: 'Source fact',
      provenance: {
        system: backing.type,
        itemId: backing.name,
        indexedAt: 'this reading',
        excerpt: f.excerpt,
      },
      relations: [],
      aiCreated: true,
      rationale: `Read from ${backing.name} because it bears on the problem statement.`,
    });
  }

  /* A disagreement is not a piece of context — it is a decision you have to make,
     so it gets its own card carrying both versions. */
  const disagreement = `Two sources disagree on when ${subject} is needed.`;
  if (has('Jira') && has('Transcript') && !alreadyOnBoard(disagreement))
    boardCards.push({
      laneId: 'lane-decisions',
      type: 'Disagreement',
      state: 'Flagged',
      title: disagreement,
      content: 'One phases it into a later release. The other treats it as needed now.',
      evidenceClass: 'Source fact',
      conflict: {
        claimA: `The backlog phases ${subject} into a later release.`,
        claimASource: of('Jira')[0].name,
        claimB: `The conversations treat ${subject} as needed now.`,
        claimBSource: of('Transcript')[0].name,
        observedState: has('App')
          ? 'The running application does not implement it at all.'
          : 'No observed application state to compare against.',
      },
      relations: [],
      aiCreated: true,
      rationale: `Synthesis v${version}: compared backlog phasing against transcript language.`,
    });

  /* A source that failed to ingest becomes a question, not a card — there is no
     context to put on the board, only something you need to deal with. */
  for (const f of failed)
    questions.push(
      question(
        'Product',
        `Can ${f.name} be re-supplied in a readable form?`,
        `It failed to ingest${
          f.ingestNote ? ` (${f.ingestNote})` : ''
        }, so nothing it covers reached this reading.`
      )
    );

  const readCount = indexed.length;
  const summary = [
    statement
      ? `This project exists because: ${statement.replace(/\s+/g, ' ')}`
      : 'No problem statement has been written yet, so this reading has nothing to aim at.',
    readCount === 0
      ? 'Nothing has finished indexing, so everything below comes from that statement alone.'
      : `I read ${readCount} source${readCount === 1 ? '' : 's'} against it — ${indexed
          .map((x) => x.name)
          .join(', ')} — and put ${boardCards.length} ${
          boardCards.length === 1 ? 'piece' : 'pieces'
        } of context on the board. The rest of what I read repeats the problem statement, corroborates something already there, or does not bear on it, so it stayed in the source.`,
    bands.understood.length > 0
      ? `What is firm: ${bands.understood.length} things are stated outright by a source, and ${
          bands.decided.length
        } more have been settled with me. Those are safe to build on.`
      : 'Nothing is firm yet.',
    bands.inferring.length > 0 || bands.cannotTell.length > 0
      ? `What is not firm: I am assuming ${bands.inferring.length} thing${
          bands.inferring.length === 1 ? '' : 's'
        } that no source actually states, and ${bands.cannotTell.length} question${
          bands.cannotTell.length === 1 ? '' : 's'
        } have no source at all. Those are listed below, and the architecture ones hold the stage gate until you settle them.`
      : 'Nothing outstanding.',
    questions.filter((q) => q.track === 'Architecture').length > 0
      ? 'The architecture questions matter most: an unanswered "where does this live?" propagates into every artifact generated after this stage, so it is cheapest to settle here.'
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    brief: {
      version,
      summary,
      generatedFrom: {
        problemStatement: statement,
        sourceIds: indexed.map((s) => s.id),

      },
      bands,
      stale: false,
    },
    questions,
    boardCards,
  };
};
