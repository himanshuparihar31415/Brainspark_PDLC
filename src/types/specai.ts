/**
 * Spec AI — the front of the pipeline: raw knowledge to Jira-ready stories, with
 * a version-locked architecture package in between.
 *
 * The five stages form a linear gated pipeline. A stage unlocks only once the
 * one before it is locked, which is what makes this one continuous tool rather
 * than five stapled screens.
 */
export type SpecStageKey =
  | 'knowledge'
  | 'understanding'
  | 'architecture'
  | 'modules'
  | 'stories';

/** Where a stage sits relative to the user's progress. */
export type SpecStageState = 'Locked' | 'Current' | 'Locked out';

// ── Stage 1: Knowledge Creation & Contextualization

export type SourceType = 'PDF' | 'DOCX' | 'TXT' | 'URL' | 'Confluence';

export interface SpecSource {
  id: string;
  name: string;
  type: SourceType;
}

/**
 * An ambiguity surfaced by multi-document fusion. Open flags block the stage
 * gate — the contextualization work is the point of the stage, not a nicety.
 */
export interface FlaggedQuestion {
  id: string;
  question: string;
  /** Which sources disagree, for context on the row. */
  fromSources: string;
  status: 'Open' | 'Resolved';
  resolution?: string;
}

/** The Chalk Board validates a requirement layer by layer before accepting it. */
export type ChalkLayer = 'Scope' | 'Dependencies' | 'Acceptance criteria';

export type ChalkLayerState = 'Validating' | 'Locked' | 'Not yet';

export interface ChalkMessage {
  id: string;
  from: 'bot' | 'user';
  text: string;
}

export interface ChalkBoardState {
  started: boolean;
  activeLayer: ChalkLayer;
  layers: Record<ChalkLayer, ChalkLayerState>;
  messages: ChalkMessage[];
  acceptedRequirements: number;
}

export interface Archetype {
  id: string;
  name: string;
  description: string;
}

/**
 * A knowledge channel in the source strip. Distinct from an individual uploaded
 * file: a channel is a connected system being drawn on, with its own index
 * health.
 */
export interface KnowledgeChannel {
  id: string;
  label: string;
  /** e.g. "184 items", "16 pages". */
  detail: string;
  status: 'Ready' | 'Indexing' | 'Not connected';
  /** Connector this channel depends on, if any. */
  connectorId?: string;
  itemsIndexed: number;
  lastSync: string;
}

/**
 * The chalk board is a spatial discovery surface — rough knowledge placed and
 * moved freely before any structure is imposed on it.
 */
export type NoteKind =
  | 'Feature idea'
  | 'Observed flow'
  | 'Conflict'
  | 'Technical context'
  | 'Open question'
  | 'Requirement';

export interface BoardNote {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  /** Provenance line, e.g. "Source: Live application". */
  source: string;
  x: number;
  y: number;
}

// ── Stage 2: Project Understanding

export type UnderstandingKey =
  | 'objective'
  | 'stakeholders'
  | 'scope'
  | 'assumptions'
  | 'questions';

export interface OpenQuestion {
  id: string;
  text: string;
  status: 'Open' | 'Resolved' | 'Deferred';
}

export interface UnderstandingSection {
  key: UnderstandingKey;
  body: string;
  /** Count of stored versions, surfaced by the version-history caret. */
  versions: number;
}

// ── Stage 3: Architecture & Design

export type ArchMode = 'Greenfield' | 'Brownfield';

export type ArtifactGroup = 'Design docs' | 'Diagrams' | 'Contracts' | 'Decisions';

/** Brownfield change bands. */
export type ChangeTag = '+ New' | '~ Changed' | '− Deprecated';

export interface ArchArtifact {
  id: string;
  group: ArtifactGroup;
  label: string;
  body: string;
  versions: number;
  /** Agent self-reported confidence; low surfaces a review-before-locking chip. */
  confidence: 'high' | 'low';
  /** Set in Brownfield mode, driving the diff view bands. */
  changeTag?: ChangeTag;
  /** Tooltip note shown beside the artifact label. */
  note?: string;
}

// ── Stage 4: Module & Feature Mapping

export interface FeatureNode {
  id: string;
  name: string;
}

export interface ModuleNode {
  id: string;
  name: string;
  features: FeatureNode[];
  /** Cross-module edges; these drive story priority scoring in Stage 5. */
  dependsOn: string[];
}

// ── Stage 5: User Stories & Jira Export

export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
}

/** Stories are generated across several lenses, not just end-user behaviour. */
export type StoryType = 'User story' | 'Technical story' | 'Security story' | 'Testing story';

export interface UserStory {
  id: string;
  /** Story title, shown above the As-a sentence. */
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
  /** Upstream architecture artifacts this story traces to. */
  linkedArtifactIds: string[];
  /** True when a linked artifact was regenerated after the story was created. */
  stale: boolean;
  exported: boolean;
}

// ── Whole-module state, per project

export interface SpecAiState {
  projectId: string;
  currentStage: SpecStageKey;
  lockedStages: SpecStageKey[];
  sources: SpecSource[];
  channels: KnowledgeChannel[];
  boardNotes: BoardNote[];
  flaggedQuestions: FlaggedQuestion[];
  chalkBoard: ChalkBoardState;
  understanding: UnderstandingSection[];
  openQuestions: OpenQuestion[];
  archMode: ArchMode;
  /** Brownfield requires a legacy architecture added during Stage 1. */
  hasLegacyArchitecture: boolean;
  artifacts: ArchArtifact[];
  modules: ModuleNode[];
  stories: UserStory[];
  jiraSyncedMinutesAgo?: number;
  /** Both personas on one pipeline; soft locks per section. */
  sectionEditors: Record<string, string>;
}
