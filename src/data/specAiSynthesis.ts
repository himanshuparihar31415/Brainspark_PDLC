import {
  BoardCard,
  BriefBandKey,
  BriefLine,
  KnowledgeChannel,
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
  channels: KnowledgeChannel[];
  /** Existing board cards, so a flag is never raised twice. */
  cards: BoardCard[];
  /** Version of the brief being produced. */
  version: number;
  pmName: string;
  architectName: string;
}

export interface SynthesisResult {
  brief: UnderstandingBrief;
  questions: SpecQuestion[];
  /** Cards to append to the board. Positionless — the board lays them out. */
  flagCards: Omit<BoardCard, 'id'>[];
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

const nextId = (prefix: string, n: number) => `${prefix}-${n}`;

export const synthesize = (input: SynthesisInput): SynthesisResult => {
  const { problemStatement, sources, channels, cards, version, pmName, architectName } = input;

  const indexed = sources.filter((s) => s.ingest === 'Indexed');
  const failed = sources.filter((s) => s.ingest === 'Failed');
  const of = (type: SourceType) => indexed.filter((s) => s.type === type);
  const has = (type: SourceType) => of(type).length > 0;
  const channelReady = (id: string) => channels.find((c) => c.id === id)?.status === 'Ready';

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
    inferring: [],
    cannotTell: [],
  };

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

  if (!channelReady('ch-apis'))
    bands.cannotTell.push(
      line(
        'What the contracts look like — no API specification is connected, so every interface below is inferred.',
        'AI assumption',
        []
      )
    );

  if (!channelReady('ch-flows'))
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

  if (channelReady('ch-apis'))
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

  // ── Flag cards ─────────────────────────────────────────────────────────────

  const flagCards: Omit<BoardCard, 'id'>[] = [];
  const titleExists = (t: string) => cards.some((c) => c.title.toLowerCase() === t.toLowerCase());

  const conflictTitle = `Contested priority for ${subject}`;
  if (has('Jira') && has('Transcript') && !titleExists(conflictTitle))
    flagCards.push({
      laneId: 'lane-decisions',
      type: 'Conflict',
      state: 'Flagged',
      title: conflictTitle,
      content: 'The backlog and the recorded conversations do not agree on when this is needed.',
      evidenceClass: 'Inferred interpretation',
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

  for (const f of failed) {
    const t = `${f.name} could not be read`;
    if (titleExists(t)) continue;
    flagCards.push({
      laneId: 'lane-inputs',
      type: 'Question',
      state: 'Flagged',
      title: t,
      content: `Ingestion failed${
        f.ingestNote ? `: ${f.ingestNote}` : ''
      }. Re-upload it or accept that this reading has a hole where it should be.`,
      evidenceClass: 'Source fact',
      owner: pmName,
      dueState: 'Blocks a complete reading',
      relations: [],
      aiCreated: true,
      rationale: `Synthesis v${version}: source present but not indexed.`,
    });
  }

  return {
    brief: {
      version,
      generatedFrom: {
        problemStatement: statement,
        sourceIds: indexed.map((s) => s.id),
        channelIds: channels.filter((c) => c.status === 'Ready').map((c) => c.id),
      },
      bands,
      stale: false,
    },
    questions,
    flagCards,
  };
};
