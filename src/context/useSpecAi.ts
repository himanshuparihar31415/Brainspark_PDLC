import { useState } from 'react';
import { Connector, Role } from '../types';
import {
  BoardCard,
  CardState,
  CardType,
  JiraMapping,
  QuestionStatus,
  RelationKind,
  SourceType,
  SpecAiState,
  SpecQuestion,
  SpecStageKey,
  UnderstandingKey,
} from '../types/specai';
/* `synthesize` is loaded on demand — its topic tables and brief prose have no
   business in the initial bundle, since only Spec AI ever runs them. */
import { INITIAL_SPEC_AI, blankSpecAiState } from '../data/specAiData';
import {
  GENERATED_ARTIFACTS,
  GENERATED_MODULES,
  GENERATED_STORIES,
} from '../data/specAiGenerated';
import {
  ARCHETYPES,
  SPEC_STAGES,
  UNDERSTANDING_COPY,
  canLockStage,
  isStageReachable,
  seedUnderstandingFromBrief,
  stageDef,
  stageIndex,
  unmappedStoryTypes,
} from '../data/specai';

type Toast = (message: string, type?: 'success' | 'info' | 'error') => void;
type Audit = (action: string, target: string, input: string, output: string) => void;

interface Deps {
  addToast: Toast;
  addAuditLog: Audit;
  currentRole: Role;
  currentUserName: string;
  connectors: Connector[];
}

/** Counter as well as clock, so ids minted in the same millisecond stay distinct. */
let idSeq = 0;
const nid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++idSeq).toString(36)}`;

/**
 * The Spec AI state slice. Extracted from AppContext so the module's mutations
 * live next to each other rather than swelling the platform-wide provider.
 */
export const useSpecAiSlice = ({
  addToast,
  addAuditLog,
  currentRole,
  currentUserName,
  connectors,
}: Deps) => {
  const [specAi, setSpecAi] = useState<SpecAiState[]>(INITIAL_SPEC_AI);

  const specAiFor = (projectId: string): SpecAiState =>
    specAi.find((s) => s.projectId === projectId) ?? blankSpecAiState(projectId);

  /** Every mutation funnels through here so a missing row is created lazily. */
  const patch = (projectId: string, fn: (prev: SpecAiState) => SpecAiState) => {
    setSpecAi((all) => {
      const base = all.some((s) => s.projectId === projectId)
        ? all
        : [...all, blankSpecAiState(projectId)];
      return base.map((s) => (s.projectId === projectId ? { ...fn(s), saveState: 'Saved' } : s));
    });
  };

  // ── Sources ────────────────────────────────────────────────────────────────

  /**
   * A source arrives unparsed and becomes readable a moment later. The delay is
   * simulated, but the state is not: synthesis only reads `Indexed` sources, so a
   * brief generated mid-ingest genuinely leaves the new material out and says so.
   */
  const addSpecSource = (projectId: string, name: string, type: SourceType, detail?: string) => {
    const id = nid('src');

    patch(projectId, (s) => ({
      ...s,
      sources: [...s.sources, { id, name, type, detail, ingest: 'Parsing' }],
      hasLegacyArchitecture:
        s.hasLegacyArchitecture || /legacy|existing architecture|as-is/i.test(name),
      brief: s.brief
        ? { ...s.brief, stale: true, staleReason: `${name} arrived after this reading.` }
        : s.brief,
    }));

    addAuditLog('Add Spec Source', `Project: ${projectId}`, `${type}: ${name}`, 'Ingestion started');

    window.setTimeout(() => {
      patch(projectId, (s) => ({
        ...s,
        sources: s.sources.map((x) =>
          x.id === id
            ? {
                ...x,
                ingest: 'Indexed',
                ingestNote:
                  type === 'Image'
                    ? 'Text extracted from image'
                    : type === 'Audio'
                    ? 'Transcribed'
                    : undefined,
              }
            : x
        ),
      }));
      addToast(`${name} indexed. Re-run synthesis to include it.`);
    }, 1400);
  };

  const removeSpecSource = (projectId: string, sourceId: string) => {
    patch(projectId, (s) => {
      const gone = s.sources.find((x) => x.id === sourceId);
      return {
        ...s,
        sources: s.sources.filter((x) => x.id !== sourceId),
        brief:
          s.brief && gone && s.brief.generatedFrom.sourceIds.includes(sourceId)
            ? { ...s.brief, stale: true, staleReason: `${gone.name} was removed.` }
            : s.brief,
      };
    });
    addToast('Source removed.', 'info');
  };

  const retrySpecSource = (projectId: string, sourceId: string) => {
    patch(projectId, (s) => ({
      ...s,
      sources: s.sources.map((x) =>
        x.id === sourceId ? { ...x, ingest: 'Parsing', ingestNote: undefined } : x
      ),
    }));

    window.setTimeout(() => {
      patch(projectId, (s) => ({
        ...s,
        sources: s.sources.map((x) => (x.id === sourceId ? { ...x, ingest: 'Indexed' } : x)),
      }));
      addToast('Source indexed on retry.');
    }, 1400);
  };

  // ── Problem statement & synthesis ───────────────────────────────────────────

  const setProblemStatement = (projectId: string, text: string) => {
    patch(projectId, (s) => ({
      ...s,
      problemStatement: text,
      brief:
        s.brief && s.brief.generatedFrom.problemStatement !== text.trim()
          ? { ...s.brief, stale: true, staleReason: 'The problem statement changed.' }
          : s.brief,
    }));
  };

  /**
   * Reads the problem statement plus everything indexed and produces a brief, a
   * question queue, and flag cards. Answers already given survive the re-run —
   * regenerating a reading must not quietly discard a decision someone made.
   */
  const synthesizeUnderstanding = (projectId: string) => {
    const state = specAiFor(projectId);

    if (!state.problemStatement.trim() && state.sources.length === 0) {
      addToast('Describe the problem or add a source first.', 'error');
      return;
    }

    patch(projectId, (s) => ({ ...s, generating: 'Reading everything you have brought in…' }));

    window.setTimeout(async () => {
      const { synthesize } = await import('../data/specAiSynthesis');
      const current = specAiFor(projectId);
      const result = synthesize({
        problemStatement: current.problemStatement,
        sources: current.sources,
        channels: current.channels,
        cards: current.cards,
        version: (current.brief?.version ?? 0) + 1,
        pmName: currentRole === 'Product Manager' ? currentUserName : 'Maya Kapoor',
        architectName: currentRole === 'Architect' ? currentUserName : 'Arjun Mehta',
      });

      /* Ids are minted here, not inside the updater — a state updater has to be
         pure, and React may call it more than once. */
      const newCards = result.boardCards.map((c) => ({ ...c, id: nid('card') }));

      patch(projectId, (s) => {
        /* Carry forward anything already settled, matched on the question text. */
        const settled = new Map(
          s.questions.filter((q) => q.status !== 'Open').map((q) => [q.text, q])
        );
        const merged: SpecQuestion[] = result.questions.map((q) => {
          const prior = settled.get(q.text);
          return prior
            ? {
                ...q,
                id: prior.id,
                status: prior.status,
                answer: prior.answer,
                owner: prior.owner,
                cardId: prior.cardId,
              }
            : q;
        });

        /* Settled questions the new run stopped asking are kept, not dropped. */
        const orphaned = [...settled.values()].filter(
          (q) => !result.questions.some((r) => r.text === q.text)
        );

        /* Re-check titles against current state: a card may have landed while the
           reading was in flight, and the generator only saw a snapshot. */
        const fresh = newCards.filter(
          (c) => !s.cards.some((x) => x.title.toLowerCase() === c.title.toLowerCase())
        );

        return {
          ...s,
          generating: undefined,
          brief: result.brief,
          questions: [...merged, ...orphaned],
          cards: [...s.cards, ...fresh],
        };
      });

      const placed = result.boardCards.length;
      addToast(
        `Read ${current.sources.filter((x) => x.ingest === 'Indexed').length} sources — ${placed} ${
          placed === 1 ? 'piece' : 'pieces'
        } on the board, ${result.questions.length} questions.`
      );
      addAuditLog(
        'Synthesize Understanding',
        `Project: ${projectId}`,
        `${current.sources.filter((s) => s.ingest === 'Indexed').length} indexed sources`,
        `Brief v${result.brief.version}, ${result.questions.length} questions, ${placed} board cards`
      );
    }, 900);
  };

  const answerQuestion = (
    projectId: string,
    questionId: string,
    status: QuestionStatus,
    answer?: string
  ) => {
    patch(projectId, (s) => ({
      ...s,
      questions: s.questions.map((q) =>
        q.id === questionId ? { ...q, status, answer: answer?.trim() || q.answer } : q
      ),
    }));

    const q = specAiFor(projectId).questions.find((x) => x.id === questionId);
    addToast(`Marked ${status.toLowerCase()}.`);
    if (q)
      addAuditLog(
        'Settle Spec Question',
        `${q.track}: ${q.text}`,
        answer ?? '—',
        `Status: ${status}`
      );
  };

  // ── Board: cards, lanes, lifecycle, relations ───────────────────────────────

  const addCard = (projectId: string, card: Omit<BoardCard, 'id' | 'relations'>) => {
    patch(projectId, (s) => ({
      ...s,
      cards: [...s.cards, { ...card, id: nid('card'), relations: [] }],
    }));
    addToast(`${card.type} added to the board.`);
  };

  const updateCard = (projectId: string, cardId: string, patchFields: Partial<BoardCard>) => {
    patch(projectId, (s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === cardId ? { ...c, ...patchFields } : c)),
    }));
  };

  const moveCardToLane = (projectId: string, cardId: string, laneId: string) => {
    patch(projectId, (s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === cardId ? { ...c, laneId } : c)),
    }));
  };

  /**
   * Advances a card's lifecycle state. AI-created cards must be confirmed
   * explicitly before they can ever become a requirement seed.
   */
  const setCardState = (projectId: string, cardId: string, state: CardState) => {
    patch(projectId, (s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === cardId ? { ...c, state } : c)),
    }));
    addToast(`Card marked ${state.toLowerCase()}.`, 'info');
  };

  const removeCards = (projectId: string, cardIds: string[]) => {
    patch(projectId, (s) => ({
      ...s,
      cards: s.cards
        .filter((c) => !cardIds.includes(c.id))
        // Drop dangling relations pointing at removed cards.
        .map((c) => ({ ...c, relations: c.relations.filter((r) => !cardIds.includes(r.toCardId)) })),
    }));
    addToast(`${cardIds.length} card${cardIds.length === 1 ? '' : 's'} removed.`, 'info');
  };

  const linkCards = (
    projectId: string,
    fromId: string,
    toId: string,
    kind: RelationKind
  ) => {
    if (fromId === toId) return;
    patch(projectId, (s) => ({
      ...s,
      cards: s.cards.map((c) =>
        c.id === fromId
          ? { ...c, relations: [...c.relations.filter((r) => r.toCardId !== toId), { toCardId: toId, kind }] }
          : c
      ),
    }));
    addToast(`Linked: ${kind.toLowerCase()}.`);
  };

  const renameLane = (projectId: string, laneId: string, name: string) => {
    patch(projectId, (s) => ({
      ...s,
      lanes: s.lanes.map((l) => (l.id === laneId ? { ...l, name } : l)),
    }));
  };

  const addLane = (projectId: string, name: string) => {
    patch(projectId, (s) => ({ ...s, lanes: [...s.lanes, { id: nid('lane'), name }] }));
    addToast(`Lane “${name}” added.`);
  };

  /**
   * Convert confirmed cards into a requirement seed. The originals are kept —
   * evidence is never destroyed by promotion.
   */
  const createRequirementSeed = (projectId: string, cardIds: string[]) => {
    const state = specAiFor(projectId);
    const sources = state.cards.filter((c) => cardIds.includes(c.id));
    if (sources.length === 0) return;

    const seedId = nid('card');
    patch(projectId, (s) => ({
      ...s,
      cards: [
        ...s.cards,
        {
          id: seedId,
          laneId: 'lane-proposed',
          type: 'Requirement seed' as CardType,
          state: 'Requirement seed' as CardState,
          title: sources[0].title,
          content: `Drafted from ${sources.length} confirmed card${
            sources.length === 1 ? '' : 's'
          }. Add actor, need, value and scope before sending to requirements.`,
          evidenceClass: 'User decision',
          confidence: 0.7,
          relations: cardIds.map((id) => ({ toCardId: id, kind: 'Supports' as RelationKind })),
          aiCreated: false,
        },
      ],
    }));

    addToast(`Requirement seed created from ${sources.length} cards. Originals kept.`);
    addAuditLog(
      'Create Requirement Seed',
      `Project: ${projectId}`,
      `${sources.length} evidence cards`,
      'Seed created; evidence retained'
    );
  };

  /**
   * Selection-scoped AI. Every action reads the current selection plus project
   * context; nothing is invented silently — gaps come back as Question cards and
   * disagreements as Conflict cards.
   */
  const runBoardAction = (projectId: string, actionId: string, cardIds: string[]) => {
    const state = specAiFor(projectId);
    const selected = state.cards.filter((c) => cardIds.includes(c.id));

    switch (actionId) {
      case 'remove':
        removeCards(projectId, cardIds);
        return;

      case 'draft':
        createRequirementSeed(projectId, cardIds);
        return;

      case 'group': {
        const laneId = nid('lane');
        patch(projectId, (s) => ({
          ...s,
          lanes: [...s.lanes, { id: laneId, name: `Cluster (${cardIds.length})` }],
          cards: s.cards.map((c) => (cardIds.includes(c.id) ? { ...c, laneId } : c)),
        }));
        addToast(`Grouped ${cardIds.length} cards into a cluster lane.`);
        return;
      }

      case 'gaps': {
        /* Questions live in the rail, so a gap becomes a question rather than
           another card competing for space on the board. */
        patch(projectId, (s) => ({
          ...s,
          questions: [
            ...s.questions,
            {
              id: nid('q'),
              track: 'Product',
              text: 'What happens where the selected pieces disagree?',
              rationale: `No source among the ${selected.length} selected cards covers this.`,
              owner: currentUserName,
              status: 'Open',
            },
          ],
        }));
        addToast('1 gap raised as a question. Nothing was invented.');
        return;
      }

      case 'conflicts': {
        const a = selected[0];
        const b = selected[1];
        patch(projectId, (s) => ({
          ...s,
          cards: [
            ...s.cards,
            {
              id: nid('card'),
              laneId: 'lane-decisions',
              type: 'Disagreement',
              state: 'Flagged',
              title: `Possible conflict: ${a.title}`,
              content: 'Two selected cards make claims that cannot both hold.',
              evidenceClass: 'Inferred interpretation',
              conflict: {
                claimA: a.content,
                claimASource: a.provenance?.itemId ?? a.title,
                claimB: b.content,
                claimBSource: b.provenance?.itemId ?? b.title,
                observedState: 'Compare against the current-state cards before deciding.',
              },
              relations: [
                { toCardId: a.id, kind: 'Contradicts' as RelationKind },
                { toCardId: b.id, kind: 'Contradicts' as RelationKind },
              ],
              aiCreated: true,
              rationale: `Compared ${a.title} against ${b.title}.`,
            },
          ],
        }));
        addToast('1 conflict raised for resolution.');
        return;
      }

      default: {
        // Summarize: interpret the selection without changing any of it.
        patch(projectId, (s) => ({
          ...s,
          cards: [
            ...s.cards,
            {
              id: nid('card'),
              laneId: selected[0]?.laneId ?? 'lane-inputs',
              type: 'Note',
              state: 'Interpreted',
              title: `Summary of ${selected.length} cards`,
              content: selected.map((c) => c.title).join(' · '),
              evidenceClass: 'Inferred interpretation',
              author: currentUserName,
              confidence: 0.72,
              relations: cardIds.map((id) => ({ toCardId: id, kind: 'Refines' as RelationKind })),
              aiCreated: true,
              rationale: `Summarized the selection. Confirm before it can become a requirement seed.`,
            },
          ],
        }));
        addToast('Summary added as an interpreted card. Confirm it to use it.');
      }
    }
  };

  /** Record a conflict decision. Resolving it is what reopens the stage gate. */
  const resolveConflict = (projectId: string, cardId: string, resolution: string) => {
    patch(projectId, (s) => ({
      ...s,
      cards: s.cards.map((c) =>
        c.id === cardId && c.conflict
          ? {
              ...c,
              state: 'Confirmed' as CardState,
              evidenceClass: 'User decision',
              conflict: { ...c.conflict, resolution, resolvedBy: currentUserName },
            }
          : c
      ),
    }));
    addToast('Conflict resolved and recorded as a decision.');
    addAuditLog('Resolve Conflict', `Card: ${cardId}`, resolution, 'Recorded as user decision');
  };

  const applyArchetype = (projectId: string, archetypeId: string) => {
    const archetype = ARCHETYPES.find((a) => a.id === archetypeId);
    if (!archetype) return;

    patch(projectId, (s) => ({
      ...s,
      sources: [
        ...s.sources,
        {
          id: nid('src'),
          name: `Archetype: ${archetype.name}`,
          type: 'TXT',
          detail: 'Reusable pattern, not a project source',
          // Nothing to parse — an archetype is already structured.
          ingest: 'Indexed',
        },
      ],
      cards: [
        ...s.cards,
        {
          id: nid('card'),
          laneId: 'lane-proposed',
          type: 'Note',
          state: 'Interpreted',
          title: archetype.name,
          content: archetype.description,
          evidenceClass: 'AI assumption',
          relations: [],
          aiCreated: true,
          rationale: 'Seeded from a reusable domain archetype, not from a project source.',
        },
      ],
    }));
    addToast(`Seeded from ${archetype.name}. Confirm the cards before relying on them.`);
  };

  // ── Understanding & requirements ────────────────────────────────────────────

  const updateUnderstanding = (projectId: string, key: UnderstandingKey, body: string) => {
    patch(projectId, (s) => ({
      ...s,
      understanding: s.understanding.map((sec) => (sec.key === key ? { ...sec, body } : sec)),
    }));
  };

  /** Regenerating one section never touches edits elsewhere. */
  const regenerateUnderstanding = (projectId: string, key: UnderstandingKey) => {
    patch(projectId, (s) => ({
      ...s,
      understanding: s.understanding.map((sec) =>
        sec.key === key ? { ...sec, versions: sec.versions + 1 } : sec
      ),
    }));
    addToast(`Regenerated ${UNDERSTANDING_COPY[key].header}. Other sections untouched.`);
  };

  // ── Artifacts ──────────────────────────────────────────────────────────────

  const setArchMode = (projectId: string, mode: 'Greenfield' | 'Brownfield') => {
    patch(projectId, (s) => ({ ...s, archMode: mode }));
    addToast(`Architecture mode set to ${mode}.`, 'info');
  };

  const updateArtifact = (projectId: string, artifactId: string, body: string) => {
    patch(projectId, (s) => ({
      ...s,
      artifacts: s.artifacts.map((a) => (a.id === artifactId ? { ...a, body } : a)),
    }));
  };

  /**
   * Regenerating an artifact bumps its version and marks every story tracing to
   * it for review — the traceability ripple that keeps downstream work honest.
   */
  const regenerateArtifact = (projectId: string, artifactId: string) => {
    const before = specAiFor(projectId);
    const target = before.artifacts.find((a) => a.id === artifactId);
    const rippled = before.stories.filter((st) => st.linkedArtifactIds.includes(artifactId)).length;

    patch(projectId, (s) => ({
      ...s,
      artifacts: s.artifacts.map((a) =>
        a.id === artifactId ? { ...a, versions: a.versions + 1, stale: false } : a
      ),
      stories: s.stories.map((st) =>
        st.linkedArtifactIds.includes(artifactId) ? { ...st, stale: true } : st
      ),
    }));

    addToast(
      rippled > 0
        ? `Regenerated ${target?.label}. ${rippled} downstream ${
            rippled === 1 ? 'story' : 'stories'
          } flagged for review.`
        : `Regenerated ${target?.label}. Edits elsewhere preserved.`
    );
    addAuditLog(
      'Regenerate Artifact',
      `Artifact: ${target?.label ?? artifactId}`,
      'Partial regeneration',
      `Version bumped; ${rippled} stories flagged`
    );
  };

  const reviewArtifact = (projectId: string, artifactId: string) => {
    patch(projectId, (s) => ({
      ...s,
      artifacts: s.artifacts.map((a) =>
        a.id === artifactId
          ? { ...a, confidence: 'high' as const, stale: false, status: 'Approved' as const }
          : a
      ),
    }));
    addToast('Artifact reviewed and approved.');
  };

  // ── Modules ────────────────────────────────────────────────────────────────

  const addSpecModule = (projectId: string, name: string) => {
    patch(projectId, (s) => ({
      ...s,
      modules: [...s.modules, { id: nid('mod'), name, features: [], dependsOn: [] }],
    }));
    addToast(`Module “${name}” added.`);
  };

  const addSpecFeature = (projectId: string, moduleId: string, name: string) => {
    patch(projectId, (s) => ({
      ...s,
      modules: s.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              features: [...m.features, { id: nid('ft'), name, capabilities: [], requirementIds: [] }],
            }
          : m
      ),
    }));
    addToast(`Feature “${name}” added.`);
  };

  const addSpecCapability = (
    projectId: string,
    moduleId: string,
    featureId: string,
    name: string
  ) => {
    patch(projectId, (s) => ({
      ...s,
      modules: s.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              features: m.features.map((f) =>
                f.id === featureId
                  ? { ...f, capabilities: [...f.capabilities, { id: nid('cap'), name }] }
                  : f
              ),
            }
          : m
      ),
    }));
    addToast(`Capability “${name}” added.`);
  };

  const removeSpecNode = (
    projectId: string,
    moduleId: string,
    featureId?: string,
    capabilityId?: string
  ) => {
    patch(projectId, (s) => {
      if (capabilityId && featureId) {
        return {
          ...s,
          modules: s.modules.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  features: m.features.map((f) =>
                    f.id === featureId
                      ? { ...f, capabilities: f.capabilities.filter((c) => c.id !== capabilityId) }
                      : f
                  ),
                }
              : m
          ),
        };
      }
      if (featureId) {
        return {
          ...s,
          modules: s.modules.map((m) =>
            m.id === moduleId ? { ...m, features: m.features.filter((f) => f.id !== featureId) } : m
          ),
        };
      }
      return {
        ...s,
        modules: s.modules
          .filter((m) => m.id !== moduleId)
          .map((m) => ({ ...m, dependsOn: m.dependsOn.filter((d) => d !== moduleId) })),
      };
    });
    addToast('Removed.', 'info');
  };

  const reparentSpecFeature = (projectId: string, featureId: string, toModuleId: string) => {
    patch(projectId, (s) => {
      const from = s.modules.find((m) => m.features.some((f) => f.id === featureId));
      const feature = from?.features.find((f) => f.id === featureId);
      if (!from || !feature || from.id === toModuleId) return s;

      return {
        ...s,
        modules: s.modules.map((m) => {
          if (m.id === from.id) return { ...m, features: m.features.filter((f) => f.id !== featureId) };
          if (m.id === toModuleId) return { ...m, features: [...m.features, feature] };
          return m;
        }),
      };
    });
    addToast('Feature re-parented.');
  };

  const mergeSpecModules = (projectId: string, sourceId: string, targetId: string) => {
    patch(projectId, (s) => {
      const source = s.modules.find((m) => m.id === sourceId);
      if (!source || sourceId === targetId) return s;

      return {
        ...s,
        modules: s.modules
          .filter((m) => m.id !== sourceId)
          .map((m) =>
            m.id === targetId
              ? {
                  ...m,
                  features: [...m.features, ...source.features],
                  dependsOn: [
                    ...new Set([...m.dependsOn, ...source.dependsOn].filter((d) => d !== targetId)),
                  ],
                }
              : { ...m, dependsOn: m.dependsOn.map((d) => (d === sourceId ? targetId : d)) }
          ),
      };
    });
    addToast('Modules merged.');
  };

  const splitSpecModule = (projectId: string, moduleId: string, featureId: string) => {
    patch(projectId, (s) => {
      const module = s.modules.find((m) => m.id === moduleId);
      const feature = module?.features.find((f) => f.id === featureId);
      if (!module || !feature) return s;

      return {
        ...s,
        modules: [
          ...s.modules.map((m) =>
            m.id === moduleId ? { ...m, features: m.features.filter((f) => f.id !== featureId) } : m
          ),
          { id: nid('mod'), name: feature.name, features: [feature], dependsOn: [moduleId] },
        ],
      };
    });
    addToast('Feature split into its own module.');
  };

  // ── Gates & export ─────────────────────────────────────────────────────────

  /**
   * Locking a stage version-locks it and generates the next stage's payload.
   * Nothing downstream exists until its upstream version is locked.
   */
  const lockSpecStage = (projectId: string, stage: SpecStageKey) => {
    const state = specAiFor(projectId);
    const check = canLockStage(stage, state);

    if (!check.ok) {
      addToast(check.reason ?? 'This stage cannot be locked yet.', 'error');
      return;
    }

    const next = SPEC_STAGES.find((s) => s.index === stageIndex(stage) + 1);

    patch(projectId, (s) => ({
      ...s,
      lockedStages: s.lockedStages.includes(stage) ? s.lockedStages : [...s.lockedStages, stage],
      currentStage: next?.key ?? stage,
      // The Stage 1 reading becomes Stage 2's starting draft, filling only blanks.
      understanding: stage === 'knowledge' ? seedUnderstandingFromBrief(s) : s.understanding,
      artifacts:
        stage === 'understanding' && s.artifacts.length === 0 ? GENERATED_ARTIFACTS() : s.artifacts,
      modules: stage === 'artifacts' && s.modules.length === 0 ? GENERATED_MODULES() : s.modules,
      stories: stage === 'modules' && s.stories.length === 0 ? GENERATED_STORIES() : s.stories,
    }));

    const generated =
      stage === 'understanding'
        ? ' Generating the PRD and architecture package.'
        : stage === 'artifacts'
        ? ' Module map generated.'
        : stage === 'modules'
        ? ' Stories generated.'
        : '';

    addToast(`${stageDef(stage).title} locked.${generated}`);
    addAuditLog(
      'Lock Spec AI Stage',
      `${stageDef(stage).title} · Project ${projectId}`,
      `Locked by ${currentRole}`,
      next ? `Version-locked; ${next.railLabel} unlocked` : 'Version-locked'
    );
  };

  const goToSpecStage = (projectId: string, stage: SpecStageKey) => {
    if (!isStageReachable(stage, specAiFor(projectId))) {
      addToast('Finish and lock the previous stage to continue.', 'error');
      return;
    }
    patch(projectId, (s) => ({ ...s, currentStage: stage }));
  };

  const reviewStaleStory = (projectId: string, storyId: string) => {
    patch(projectId, (s) => ({
      ...s,
      stories: s.stories.map((st) => (st.id === storyId ? { ...st, stale: false } : st)),
    }));
    addToast('Story reviewed against its updated source.');
  };

  const setJiraMapping = (projectId: string, mapping: Partial<JiraMapping>) => {
    patch(projectId, (s) => ({
      ...s,
      jiraMapping: { ...s.jiraMapping, ...mapping, issueTypes: { ...s.jiraMapping.issueTypes, ...mapping.issueTypes } },
    }));
  };

  const exportStoriesToJira = (projectId: string) => {
    const state = specAiFor(projectId);
    const jira = connectors.find((c) => c.id === 'conn-jira');

    if (!jira?.activatedProject) {
      addToast('This needs the Jira connector. Ask your admin.', 'error');
      return;
    }

    const unmapped = unmappedStoryTypes(state);
    if (unmapped.length > 0) {
      addToast(
        `Jira is connected, but no issue-type mapping exists for ${unmapped[0]}.`,
        'error'
      );
      return;
    }

    const pending = state.stories.filter((s) => !s.exported).length;

    patch(projectId, (s) => ({
      ...s,
      stories: s.stories.map((st) => ({ ...st, exported: true })),
      jiraSyncedMinutesAgo: 0,
    }));

    addToast(`${pending} ${pending === 1 ? 'story' : 'stories'} exported to Jira.`);
    addAuditLog(
      'Export Stories to Jira',
      `Project: ${projectId}`,
      `${pending} stories · epic ${state.jiraMapping.epic}`,
      'Bidirectional sync established'
    );
  };

  return {
    specAi,
    specAiFor,
    addSpecSource,
    removeSpecSource,
    retrySpecSource,
    setProblemStatement,
    synthesizeUnderstanding,
    answerQuestion,
    addCard,
    updateCard,
    moveCardToLane,
    setCardState,
    removeCards,
    linkCards,
    renameLane,
    addLane,
    createRequirementSeed,
    runBoardAction,
    resolveConflict,
    applyArchetype,
    updateUnderstanding,
    regenerateUnderstanding,
    setArchMode,
    updateArtifact,
    regenerateArtifact,
    reviewArtifact,
    addSpecModule,
    addSpecFeature,
    addSpecCapability,
    removeSpecNode,
    reparentSpecFeature,
    mergeSpecModules,
    splitSpecModule,
    lockSpecStage,
    goToSpecStage,
    reviewStaleStory,
    setJiraMapping,
    exportStoriesToJira,
  };
};

export type SpecAiSlice = ReturnType<typeof useSpecAiSlice>;
