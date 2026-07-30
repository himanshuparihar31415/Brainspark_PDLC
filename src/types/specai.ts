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

/** Where a stage sits relative to the user's progress. */
export type SpecStageState = 'Locked' | 'Current' | 'Locked out';

// ─────────────────────── Stage 1: Knowledge & Chalk Board ───────────────────────

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
 * A knowledge domain in the context strip. Distinct from an individual file: a
 * channel is a connected system being drawn on, with its own index health.
 */
export interface KnowledgeChannel {
  id: string;
  label: string;
  /** e.g. "184 issues", "27 endpoints". */
  detail: string;
  status: 'Ready' | 'Partial' | 'Indexing' | 'Not connected';
  /** Connector this channel depends on, if any. */
  connectorId?: string;
  itemsIndexed: number;
  lastSync: string;
  /** What the channel is scoped to, shown in the inspector. */
  scope: string;
}

/**
 * What a card is. Nothing here is picked from a menu except a note — a card is a
 * piece of context that came from a source, and it names that source instead of
 * wearing a label.
 *
 * `Disagreement` exists because two sources saying different things is a decision
 * you have to make, not a piece of context. `Requirement seed` is what the stage
 * produces.
 */
export type CardType = 'Context' | 'Disagreement' | 'Note' | 'Requirement seed';

/**
 * The visible content lifecycle. Every card sits at exactly one state, and the
 * state decides which actions are offered.
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

export interface BoardLane {
  id: string;
  name: string;
}

export interface BoardCard {
  id: string;
  /** The source this came from. Absent on notes you wrote yourself. */
  sourceId?: string;
  /** Retained as the grouping key even though the board positions freely. */
  laneId: string;
  /**
   * Position on the chalk board, in canvas pixels. Absent on cards the AI just
   * created — the board lays those out in the first free slot.
   */
  x?: number;
  y?: number;
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

// ─────────── Stage 1: synthesis — the brief and the question queue ───────────

/**
 * The three bands of a synthesized reading. Separating them is the point: a
 * comprehensive overview that blurs what is known with what is guessed is worse
 * than no overview, because it launders assumptions into facts.
 */
export type BriefBandKey = 'understood' | 'inferring' | 'cannotTell';

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
  /** The exact inputs this reading was produced from. */
  generatedFrom: { problemStatement: string; sourceIds: string[]; channelIds: string[] };
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
  /** Set once the question has been pushed onto the board as a card. */
  cardId?: string;
}

export interface UnderstandingSection {
  key: UnderstandingKey;
  body: string;
  /** Count of stored versions, surfaced by the version-history caret. */
  versions: number;
  /** Board cards supporting this section — the source map. */
  supportingCardIds: string[];
}

export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
}

export type RequirementType = 'Functional' | 'Non-functional' | 'Security' | 'Data';

/** A confirmed requirement, promoted from one or more board seeds. */
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
  /** Human summary of the evidence set, e.g. "5 board cards, 2 Jira issues". */
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
  note?: string;
  /** Node chain rendered for diagram artifacts. */
  diagramFlow?: string[];
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
  exported: boolean;
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
  /** The high-level ask. What synthesis is aimed at, so a reading is targeted. */
  problemStatement: string;
  sources: SpecSource[];
  channels: KnowledgeChannel[];
  /**
   * The provisional reading of everything brought in. Disposable and freely
   * regenerated — Stage 2's Project Understanding is the owned, lockable version,
   * seeded from this on lock.
   */
  brief?: UnderstandingBrief;
  questions: SpecQuestion[];
  lanes: BoardLane[];
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
