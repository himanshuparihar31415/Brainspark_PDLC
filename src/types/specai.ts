/**
 * Spec AI — converts fragmented product knowledge into an approved, traceable
 * specification package and delivery backlog.
 *
 * Five stages, each ending in an approve-and-lock gate. The organizing idea is
 * progressive structure: rough thinking first, formal documentation later.
 */
export type SpecStageKey =
  | 'knowledge'
  | 'understanding'
  | 'artifacts'
  | 'modules'
  | 'stories';

/**
 * Where a stage sits relative to your progress. `Ahead` means nothing upstream has
 * been locked yet, so what you see there is provisional — it does not mean you
 * cannot look. Reading ahead is how you find out what the earlier stages owe you.
 */
export type SpecStageState = 'Locked' | 'Current' | 'Ahead';

// ───────────────────── Stage 1: Knowledge & the agent terminal ─────────────────────

export type SourceType =
  | 'PDF'
  | 'DOCX'
  | 'TXT'
  | 'URL'
  | 'Confluence'
  | 'Jira'
  | 'Repository'
  | 'Transcript'
  | 'App'
  | 'Image'
  | 'Audio';

/**
 * Where a source is in ingestion. Nothing can be synthesized from a source that
 * has not been indexed, so this state is load-bearing rather than cosmetic.
 */
export type IngestState = 'Queued' | 'Parsing' | 'Indexed' | 'Failed';

export interface SpecSource {
  id: string;
  name: string;
  type: SourceType;
  /** Second line in the knowledge-sources list, e.g. "184 selected items". */
  detail?: string;
  ingest: IngestState;
  /** Why ingestion failed, or what was extracted. Shown on the row. */
  ingestNote?: string;
}

/**
 * What a card is. Nothing here is picked from a menu except a note — a card is a
 * piece of context the agent read out of a source, and it names that source
 * instead of wearing a label.
 *
 * `Disagreement` exists because two sources saying different things is a decision
 * you have to make, not a piece of context. `Requirement seed` is what the stage
 * produces, promoted from a line of the brief.
 */
export type CardType = 'Context' | 'Disagreement' | 'Note' | 'Requirement seed';

/**
 * The content lifecycle. Every card sits at exactly one state, and the state
 * decides which actions are offered.
 */
export type CardState =
  | 'Captured'
  | 'Interpreted'
  | 'Flagged'
  | 'Confirmed'
  | 'Requirement seed'
  | 'Superseded';

/**
 * Evidence hierarchy. The system must never blur a sourced fact with an AI
 * guess, so every card declares which it is.
 */
export type EvidenceClass =
  | 'Source fact'
  | 'User decision'
  | 'Inferred interpretation'
  | 'AI assumption';

/** Where a card came from, retained in full so a claim can always be traced. */
export interface Provenance {
  system: string;
  /** e.g. "FMB2-142". */
  itemId?: string;
  deepLink?: string;
  indexedAt: string;
  /** The exact supporting excerpt or screen evidence. */
  excerpt: string;
}

export type RelationKind = 'Supports' | 'Contradicts' | 'Depends on' | 'Refines' | 'Supersedes';

export interface CardRelation {
  toCardId: string;
  kind: RelationKind;
}

/** The two claims and observed state behind a conflict card. */
export interface ConflictDetail {
  claimA: string;
  claimASource: string;
  claimB: string;
  claimBSource: string;
  observedState: string;
  resolution?: string;
  resolvedBy?: string;
}

/**
 * An extract, kept so a brief line, a requirement or an understanding section can
 * always be traced back to the quote that justified it. There is no board — these
 * surface against the source they came from, and in whatever cites them.
 */
export interface BoardCard {
  id: string;
  /** The source this came from. Absent on notes you wrote yourself. */
  sourceId?: string;
  type: CardType;
  state: CardState;
  title: string;
  /** Two-line preview until expanded. */
  content: string;
  evidenceClass: EvidenceClass;
  provenance?: Provenance;
  /** 0–1; surfaced alongside evidence coverage on AI propositions. */
  confidence?: number;
  author?: string;
  /** Question cards carry an owner and a due state. */
  owner?: string;
  dueState?: string;
  relations: CardRelation[];
  /** AI-created cards are visually distinct and need explicit confirmation. */
  aiCreated: boolean;
  conflict?: ConflictDetail;
  /** Why this was generated — the transformation chain, for explainability. */
  rationale?: string;
}

export interface Archetype {
  id: string;
  name: string;
  description: string;
}

// ──────────────────── Stage 1: the agent terminal ────────────────────

/**
 * How a tool call ended. `empty` is separated from `error` on purpose — a tool
 * that ran fine and found nothing is a finding, and collapsing it into failure
 * is what makes a reading look more complete than it is.
 */
export type ToolCallStatus = 'running' | 'ok' | 'empty' | 'error';

/**
 * One tool the agent ran, shown as it ran it. The terminal exists because a
 * statement you cannot see the retrieval behind is indistinguishable from a
 * guess: the tool line is the difference between "the agent says" and "the agent
 * read this file and it says".
 */
export interface AgentToolCall {
  id: string;
  /** Code-facing tool name, e.g. read_source. */
  name: string;
  /** The argument, printed after the name. */
  argument: string;
  sourceId?: string;
  status: ToolCallStatus;
  durationMs: number;
  /** What came back — or why nothing did. */
  result: string;
  /** Verbatim supporting text, when the tool returned any. */
  excerpt?: string;
}

export interface AgentTurn {
  id: string;
  from: 'you' | 'agent';
  text: string;
  /** Tool calls run before answering. Agent turns only. */
  toolCalls?: AgentToolCall[];
  /** True while the tools are still resolving. */
  pending?: boolean;
  /** What this turn did to the brief, when it changed it. */
  briefEffect?: { version: number; added: number };
}

// ──────────────────── Stage 0: the intake — what are we solving ────────────────────

/**
 * What kind of thing you pasted in. Detected rather than picked from a menu,
 * because the answer changes what is worth extracting: logs give you error
 * signatures and affected services, an issue gives you expected-versus-actual,
 * prose gives you intent and nothing else.
 */
export type IntakeKind =
  | 'Problem statement'
  | 'System logs'
  | 'Issue description'
  | 'Meeting notes'
  | 'Unclear';

/**
 * What the agent proposes to do next, stated before it does it.
 *
 * The intake's whole job is to turn "here is my problem" into a task with a
 * scope, because every stage after this inherits its direction. Getting it wrong
 * here is cheap to fix and expensive to discover four stages later.
 */
export interface AgentTask {
  /** One line: what this run of the workflow is for. */
  title: string;
  /** The problem, restated in the form the rest of the pipeline reads. */
  statement: string;
  /** What the agent will actually do, in order. */
  steps: string[];
  /** Where this stops — stated so scope creep has something to push against. */
  outOfScope: string;
}

/**
 * The starting point for a project. Written once, then editable: everything
 * downstream is read against it, so it is the one input worth being deliberate
 * about.
 */
export interface SpecIntake {
  /** Exactly what you pasted, kept verbatim. */
  raw: string;
  kind: IntakeKind;
  /** Why it was read as that kind — shown so the classification is auditable. */
  kindReason: string;
  /** A few lines a person can read and know what this project is about. */
  conciseBrief: string;
  /** What the agent extracted, as short labelled facts. */
  signals: { label: string; value: string }[];
  /** The proposed task. Absent when the input was too thin to derive one. */
  task?: AgentTask;
  /**
   * What the agent needs before it can propose a task. Non-empty means it is
   * asking rather than guessing — the same rule the terminal follows.
   */
  needs: string[];
  /** Set once you accept the task and the workflow starts from it. */
  acceptedAt?: string;
}

// ──────────────── Stage 2: Understanding & formal requirements ────────────────

export type UnderstandingKey =
  | 'objective'
  | 'primaryUsers'
  | 'currentState'
  | 'proposedState'
  | 'inScope'
  | 'outOfScope'
  | 'constraints'
  | 'assumptions'
  | 'openQuestions';

// ─────────── Stage 1: the project brief and the question queue ───────────

/**
 * The bands of the brief. Separating them is the point: an overview that blurs
 * what is known with what is guessed is worse than no overview, because it
 * launders assumptions into facts.
 *
 * `decided` holds what you settled by talking to the agent, which is why the
 * brief gets better the more you use it rather than staying a first impression.
 */
export type BriefBandKey = 'understood' | 'decided' | 'inferring' | 'cannotTell';

export interface BriefLine {
  id: string;
  text: string;
  evidenceClass: EvidenceClass;
  /** Sources this line was drawn from. */
  sourceIds: string[];
  /** Human summary of the backing, e.g. "Jira · 184 items · 1 transcript". */
  sourceSummary: string;
}

export interface UnderstandingBrief {
  /** Bumped on every synthesis run; earlier versions are never overwritten silently. */
  version: number;
  /**
   * The narrative opening — a few paragraphs a person could read on its own and
   * come away knowing what this project is. Everything below it is the detail
   * behind these sentences.
   */
  summary: string;
  /** The exact inputs this reading was produced from. */
  generatedFrom: { problemStatement: string; sourceIds: string[] };
  bands: Record<BriefBandKey, BriefLine[]>;
  /** Set when a source arrived or the problem statement changed after generation. */
  stale: boolean;
  staleReason?: string;
}

/**
 * A question the synthesis could not answer from the sources. Product questions
 * belong to the PM; architecture questions belong to the Architect, which is the
 * same split the module's ownership already assumes.
 */
export type QuestionTrack = 'Product' | 'Architecture';

export type QuestionStatus = 'Open' | 'Answered' | 'Assumed' | 'Deferred';

export interface SpecQuestion {
  id: string;
  track: QuestionTrack;
  text: string;
  /** What the sources do and do not say — why this had to be asked. */
  rationale: string;
  owner: string;
  status: QuestionStatus;
  /** Recorded when answered, assumed, or deferred. */
  answer?: string;
  /** Set once the question has been recorded as an extract. */
  cardId?: string;
}

export interface UnderstandingSection {
  key: UnderstandingKey;
  body: string;
  /** Count of stored versions, surfaced by the version-history caret. */
  versions: number;
  /** Extracts supporting this section — the source map. */
  supportingCardIds: string[];
}

export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
}

export type RequirementType = 'Functional' | 'Non-functional' | 'Security' | 'Data';

/** A confirmed requirement, promoted from one or more seeds. */
export interface FormalRequirement {
  id: string;
  title: string;
  type: RequirementType;
  status: 'Draft' | 'Confirmed' | 'Superseded';
  priority: 'P0' | 'P1' | 'P2';
  actor: string;
  need: string;
  businessValue: string;
  preconditions: string;
  mainBehavior: string;
  fallback?: string;
  acceptance: AcceptanceCriterion[];
  evidenceCardIds: string[];
  /** Human summary of the evidence set, e.g. "5 extracts, 2 Jira issues". */
  evidenceSummary: string;
  confidence: number;
  owner: string;
}

// ───────────────────────── Stage 3: Artifact Studio ─────────────────────────

export type ArchMode = 'Greenfield' | 'Brownfield';

export type ArtifactGroup =
  | 'Product'
  | 'Architecture'
  | 'Contracts'
  | 'Decisions'
  | 'Visuals';

export type ArtifactStatus = 'Not generated' | 'Generated' | 'In review' | 'Approved';

/** Brownfield change bands. */
export type ChangeTag = '+ New' | '~ Changed' | '− Deprecated';

/** Node type for React Flow diagram rendering. */
export type FlowNodeType = 'system' | 'container' | 'component' | 'actor' | 'decision' | 'topic' | 'default';

export interface FlowNode {
  id: string;
  label: string;
  type?: FlowNodeType;
  x: number;
  y: number;
  /** Optional subtitle shown below the label. */
  subtitle?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface FlowDiagram {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction?: 'TB' | 'LR';
}

export interface ArchArtifact {
  id: string;
  group: ArtifactGroup;
  label: string;
  body: string;
  versions: number;
  status: ArtifactStatus;
  /** Agent self-reported confidence; low surfaces a review-before-locking chip. */
  confidence: 'high' | 'low';
  /** Marked for review after an upstream decision changed. */
  stale: boolean;
  reviewComments: number;
  changeTag?: ChangeTag;
  /** Who is reviewing it. Approval without an owner tends not to happen. */
  assignee?: string;
  note?: string;
  /** Legacy flat node chain. */
  diagramFlow?: string[];
  /** Rich React Flow diagram (nodes + edges with positions). */
  flowDiagram?: FlowDiagram;
}

// ──────────────────── Stage 4: Modules, features, capabilities ────────────────────

export interface CapabilityNode {
  id: string;
  name: string;
}

export interface FeatureNode {
  id: string;
  name: string;
  capabilities: CapabilityNode[];
  /** Requirements and artifacts this feature realizes. */
  requirementIds: string[];
}

export interface ModuleNode {
  id: string;
  name: string;
  features: FeatureNode[];
  /** Cross-module edges; these drive story priority scoring in Stage 5. */
  dependsOn: string[];
}

// ───────────────────────── Stage 5: Stories & export ─────────────────────────

export type StoryType =
  | 'User story'
  | 'Technical story'
  | 'API story'
  | 'Security story'
  | 'Data story'
  | 'Testing story'
  | 'Migration story';

/**
 * Delivery lifecycle after generation. `exported` stays as a convenience flag
 * kept in sync with `deliveryStatus !== 'Draft'`.
 */
export type StoryDeliveryStatus =
  | 'Draft'
  | 'Exported'
  | 'In progress'
  | 'Done'
  | 'Blocked';

export interface UserStory {
  id: string;
  /** e.g. "FMB2-AUTH-031". */
  key: string;
  title: string;
  storyType: StoryType;
  role: string;
  goal: string;
  benefit: string;
  acceptance: AcceptanceCriterion[];
  priority: 'P0' | 'P1' | 'P2';
  points: number;
  moduleName: string;
  featureName: string;
  linkedRequirementIds: string[];
  /** Artifact references, e.g. "PRD §6.2". */
  linkedArtifactIds: string[];
  sourceEvidence: string;
  /** True when a linked requirement or artifact changed after generation. */
  stale: boolean;
  /** Which upstream artifact moved, so a stale story can be reviewed against it. */
  staleReason?: string;
  /** Where this story sits in delivery — source of truth for completion rollups. */
  deliveryStatus: StoryDeliveryStatus;
  /** True once pushed to the tracker (`deliveryStatus !== 'Draft'`). */
  exported: boolean;
  /** Stable reference to a TeamMember; `owner` is the display name beside it. */
  ownerId?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

/** Field mapping applied before a Jira export. */
export interface JiraMapping {
  epic: string;
  release: string;
  sprint: string;
  /** Story type → Jira issue type. Unmapped types block the export. */
  issueTypes: Partial<Record<StoryType, string>>;
}

// ─────────────────────── Whole-module state, per project ───────────────────────

export type SaveState = 'Saved' | 'Saving' | 'Offline';

export interface SpecAiState {
  projectId: string;
  /** Display identity for the specification, independent of the platform project. */
  specKey: string;
  currentStage: SpecStageKey;
  lockedStages: SpecStageKey[];
  /**
   * Where the project starts. Until this is accepted there is no direction to
   * read anything against, so Knowledge Creation asks for it before anything
   * else.
   */
  intake?: SpecIntake;
  /**
   * The high-level ask, as the rest of the pipeline reads it. Derived from the
   * intake and editable afterwards.
   */
  problemStatement: string;
  sources: SpecSource[];
  /**
   * The provisional reading of everything brought in. Disposable and freely
   * regenerated — Stage 2's Project Understanding is the owned, lockable version,
   * seeded from this on lock.
   */
  brief?: UnderstandingBrief;
  /**
   * The conversation with the agent, tool calls included. This is what the brief
   * is built out of — every line in the brief traces to a turn here, so "where
   * did that come from" is always answerable.
   */
  transcript: AgentTurn[];
  questions: SpecQuestion[];
  /** Evidence records, referenced by brief lines, requirements and understanding. */
  cards: BoardCard[];
  understanding: UnderstandingSection[];
  requirements: FormalRequirement[];
  archMode: ArchMode;
  hasLegacyArchitecture: boolean;
  artifacts: ArchArtifact[];
  modules: ModuleNode[];
  stories: UserStory[];
  jiraMapping: JiraMapping;
  jiraSyncedMinutesAgo?: number;
  /** Both personas on one pipeline; soft locks per section. */
  sectionEditors: Record<string, string>;
  saveState: SaveState;
  /** Set while a background generation job is running. */
  generating?: string;
}

// ───────────────────── Spec AI History ─────────────────────

export type HistoryEntryType = 'generation' | 'decision' | 'version';

export interface SpecHistoryEntry {
  id: string;
  type: HistoryEntryType;
  timestamp: string;
  stage: SpecStageKey;
  sessionId: string;
  projectId: string;
  artifactId?: string;
  artifactName?: string;
  actor?: string;
  actorRole?: string;
  summary: string;
  detail?: string;
  model?: string;
  durationMs?: number;
  action?: 'approved' | 'rejected' | 'commented' | 'reopened';
  diffSummary?: { added: number; removed: number; modified: number };
}
