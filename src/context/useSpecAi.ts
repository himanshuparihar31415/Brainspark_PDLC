import { useState } from 'react';
import { Connector, Role } from '../types';
import {
  AgentTurn,
  BoardCard,
  CardState,
  CardType,
  JiraMapping,
  QuestionStatus,
  SourceType,
  SpecAiState,
  SpecStageKey,
  StoryDeliveryStatus,
  UnderstandingKey,
} from '../types/specai';
/* The agent engine is loaded on demand — its retrieval tables and prose have no
   business in the initial bundle, since only Spec AI ever runs them. */
import { INITIAL_SPEC_AI, blankSpecAiState } from '../data/specAiData';
import {
  GENERATED_ARTIFACTS,
  GENERATED_MODULES,
  GENERATED_STORIES,
} from '../data/specAiGenerated';
import { withDeliveryStatus } from '../data/completion';
import {
  ARCHETYPES,
  SPEC_STAGES,
  UNDERSTANDING_COPY,
  stageGateWarnings,
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

  // ── The intake: where a project starts ──────────────────────────

  /**
   * Start the project from a problem statement.
   *
   * One action, not a ceremony. The statement is recorded, the brief is seeded
   * from it, and the agent starts reading — because a screen that reads your
   * input, shows you a plan, and then asks you to approve the plan is three
   * screens doing the work of one.
   *
   * Whatever you paste is still read: logs get their error signatures grouped,
   * a ticket gets its expected-versus-actual, notes get what was decided. Those
   * become the first lines of the brief. Anything the agent needs and cannot
   * find becomes an open question in the queue rather than a gate you have to
   * clear before the workspace will open.
   */
  const startFromProblem = (projectId: string, raw: string) => {
    const statement = raw.trim();
    if (!statement) {
      addToast('A problem statement is required — everything after this is read against it.', 'error');
      return;
    }

    const turnId = nid('turn');

    patch(projectId, (s) => ({
      ...s,
      generating: 'Reading what you brought…',
      problemStatement: statement,
      transcript: [
        ...s.transcript,
        { id: nid('turn'), from: 'you' as const, text: statement },
        { id: turnId, from: 'agent' as const, text: '', toolCalls: [], pending: true },
      ],
    }));

    void (async () => {
      const { readIntake, seedBriefFromIntake } = await import('../data/specAiIntake');
      const before = specAiFor(projectId);
      const reading = readIntake(statement);

      /* The statement is what you typed. The agent reads it for signals, but it
         does not get to rewrite the one thing you were asked for. */
      const intake = {
        ...reading.intake,
        task: reading.intake.task ? { ...reading.intake.task, statement } : undefined,
        acceptedAt: new Date().toISOString(),
      };

      const calls = reading.toolCalls.map((c, i) => ({ ...c, id: `${turnId}-t${i}` }));
      const seeded = seedBriefFromIntake(intake, statement, before.sources);
      /* What it could not work out becomes a question, not a blocked screen. */
      const gaps = intake.needs.map((text) => ({
        id: nid('q'),
        track: 'Product' as const,
        text,
        rationale: `Raised while reading the ${intake.kind.toLowerCase()} you started from.`,
        owner: currentRole === 'Product Manager' ? currentUserName : 'Maya Kapoor',
        status: 'Open' as const,
      }));

      window.setTimeout(() => {
        patch(projectId, (s) => {
          const asked = new Set(s.questions.map((q) => q.text.toLowerCase()));
          return {
            ...s,
            generating: undefined,
            intake,
            problemStatement: statement,
            brief: s.brief ?? seeded,
            questions: [
              ...s.questions,
              ...gaps.filter((q) => !asked.has(q.text.toLowerCase())),
            ],
            transcript: s.transcript.map((t) =>
              t.id === turnId ? { ...t, text: reading.reply, pending: false, toolCalls: calls } : t
            ),
          };
        });

        addAuditLog(
          'Start Spec AI From Problem',
          `Project: ${projectId}`,
          `${intake.kind}: ${statement.slice(0, 120)}`,
          `Brief seeded, ${gaps.length} questions raised`
        );

        /* Read the sources against it straight away, if there are any. */
        if (before.sources.some((x) => x.ingest === 'Indexed')) askAgent(projectId, '');
      }, 140 + calls.length * 190);
    })();
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

  // ── The agent terminal ──────────────────────────────────────────────────────

  /**
   * One turn with the agent, tool calls included.
   *
   * An empty message means the opening read across every source; anything else is
   * a question or a decision. Either way the shape is the same: the tools resolve
   * on screen one at a time, and only then does the reply land — because a reply
   * that arrives before its evidence is just an assertion.
   *
   * The brief is the by-product. Every turn that learns something folds it in and
   * bumps the version, so the brief is literally the accumulation of this
   * conversation rather than a separate document that has to be kept in step.
   */
  const askAgent = (projectId: string, message: string) => {
    const before = specAiFor(projectId);
    const opening = message.trim() === '';

    if (before.generating) return;
    if (opening && !before.problemStatement.trim() && before.sources.length === 0) {
      addToast('Describe the problem or add a source first.', 'error');
      return;
    }

    const turnId = nid('turn');

    patch(projectId, (s) => ({
      ...s,
      generating: opening ? 'Reading everything you have brought in…' : 'Working…',
      transcript: [
        ...s.transcript,
        ...(opening
          ? []
          : [{ id: nid('turn'), from: 'you' as const, text: message.trim().replace(/\s+/g, ' ') }]),
        { id: turnId, from: 'agent' as const, text: '', toolCalls: [], pending: true },
      ],
    }));

    void (async () => {
      const { runAgent, foldIntoBands, briefNarrative, EMPTY_BANDS } = await import(
        '../data/specAiAgent'
      );

      const run = runAgent({
        message,
        problemStatement: before.problemStatement,
        sources: before.sources,
        existingBriefText: before.brief
          ? Object.values(before.brief.bands).flatMap((lines) => lines.map((l) => l.text))
          : [],
        existingQuestionText: before.questions.map((q) => q.text),
        existingEvidenceText: before.cards.map((c) => c.title),
        settled: before.questions.filter((q) => q.status !== 'Open'),
        pmName: currentRole === 'Product Manager' ? currentUserName : 'Maya Kapoor',
        architectName: currentRole === 'Architect' ? currentUserName : 'Arjun Mehta',
      });

      /* Ids are minted out here. A state updater has to be pure, and React is
         free to call it more than once. */
      const calls = run.toolCalls.map((c, i) => ({ ...c, id: `${turnId}-t${i}` }));
      const newCards = run.evidence.map((c) => ({ ...c, id: nid('card') }));
      const newQuestions = run.questions.map((q) => ({ ...q, id: nid('q') }));

      const setTurn = (fn: (turn: AgentTurn) => AgentTurn) =>
        patch(projectId, (s) => ({
          ...s,
          transcript: s.transcript.map((t) => (t.id === turnId ? fn(t) : t)),
        }));

      /* Each call lands on its own, so the terminal reads as work happening
         rather than a block of text appearing at once. */
      calls.forEach((call, i) => {
        window.setTimeout(() => {
          setTurn((turn) => ({
            ...turn,
            toolCalls: [...(turn.toolCalls ?? []), { ...call, status: 'running' as const }],
          }));
        }, 120 + i * 170);

        window.setTimeout(() => {
          setTurn((turn) => ({
            ...turn,
            toolCalls: (turn.toolCalls ?? []).map((c) => (c.id === call.id ? call : c)),
          }));
        }, 120 + i * 170 + Math.min(call.durationMs, 520));
      });

      window.setTimeout(() => {
        patch(projectId, (s) => {
          /* Anything already settled survives — a re-read must never quietly
             discard a decision someone made. */
          const asked = new Set(s.questions.map((q) => q.text.toLowerCase()));
          const freshQuestions = newQuestions.filter((q) => !asked.has(q.text.toLowerCase()));

          const titles = new Set(s.cards.map((c) => c.title.toLowerCase()));
          const freshCards = newCards.filter((c) => !titles.has(c.title.toLowerCase()));

          /*
           * Dedupe here rather than in the engine. The engine only ever saw the
           * brief as it was when the turn started, and the intake seeds the brief
           * a moment before the first read fires — so without this, the opening
           * read restates the problem statement that was just written down.
           */
          const known = new Set(
            Object.values(s.brief?.bands ?? {})
              .flat()
              .map((l) => l.text.toLowerCase())
          );
          const additions = run.briefAdditions.filter((a) => !known.has(a.text.toLowerCase()));

          const version = (s.brief?.version ?? 0) + (additions.length > 0 ? 1 : 0);
          const bands = foldIntoBands(s.brief?.bands ?? EMPTY_BANDS(), additions, version);
          const questions = [...s.questions, ...freshQuestions];
          const exchanges = s.transcript.filter((t) => t.from === 'you').length + (opening ? 1 : 0);

          return {
            ...s,
            generating: undefined,
            questions,
            cards: [...s.cards, ...freshCards],
            brief: {
              version: Math.max(1, version),
              summary: briefNarrative(
                s.problemStatement,
                bands,
                s.sources,
                Math.max(1, exchanges),
                questions.filter((q) => q.status === 'Open').length
              ),
              generatedFrom: {
                problemStatement: s.problemStatement.trim(),
                sourceIds: s.sources.filter((x) => x.ingest === 'Indexed').map((x) => x.id),
              },
              bands,
              /* Fresh by construction: it was just rebuilt from current state. */
              stale: false,
            },
            transcript: s.transcript.map((t) =>
              t.id === turnId
                ? {
                    ...t,
                    text: run.reply,
                    pending: false,
                    toolCalls: calls,
                    briefEffect:
                      additions.length > 0
                        ? { version: Math.max(1, version), added: additions.length }
                        : undefined,
                  }
                : t
            ),
          };
        });

        if (opening)
          addToast(
            `Read ${before.sources.filter((x) => x.ingest === 'Indexed').length} sources — ${
              run.briefAdditions.length
            } lines into the brief, ${run.questions.length} questions raised.`
          );

        addAuditLog(
          opening ? 'Agent Read Sources' : 'Agent Turn',
          `Project: ${projectId}`,
          opening ? `${calls.length} tool calls` : message.trim().slice(0, 120),
          `${run.briefAdditions.length} brief lines, ${run.questions.length} questions, ${run.evidence.length} extracts`
        );
      }, 120 + calls.length * 170 + 420);
    })();
  };

  const answerQuestion = (
    projectId: string,
    questionId: string,
    status: QuestionStatus,
    answer?: string
  ) => {
    patch(projectId, (s) => {
      const target = s.questions.find((q) => q.id === questionId);
      return {
        ...s,
        questions: s.questions.map((q) =>
          q.id === questionId ? { ...q, status, answer: answer?.trim() || q.answer } : q
        ),
        brief:
          s.brief && target && status !== 'Open'
            ? {
                ...s.brief,
                stale: true,
                staleReason: `You settled “${target.text}”. Refresh to fold it in.`,
              }
            : s.brief,
      };
    });

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

  // ── Evidence records ────────────────────────────────────────────────────────

  const updateCard = (projectId: string, cardId: string, patchFields: Partial<BoardCard>) => {
    patch(projectId, (s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === cardId ? { ...c, ...patchFields } : c)),
    }));
  };

  /**
   * Advances an evidence record's lifecycle state. AI-created records must be
   * confirmed explicitly before they can ever become a requirement seed.
   */
  const setCardState = (projectId: string, cardId: string, state: CardState) => {
    patch(projectId, (s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === cardId ? { ...c, state } : c)),
    }));
    addToast(`Marked ${state.toLowerCase()}.`, 'info');
  };

  /**
   * The brief describes a moment. Anything that changes what there is to read
   * makes it out of date, and saying so is better than letting it quietly
   * describe sources that have moved on.
   */
  const markBriefStale = (projectId: string, reason: string) => {
    patch(projectId, (s) =>
      s.brief ? { ...s, brief: { ...s.brief, stale: true, staleReason: reason } } : s
    );
  };

  /**
   * Turn a line of the brief into a requirement seed — the one action that moves
   * something from "the agent understands this" to "we are going to build this".
   *
   * The line stays in the brief. Promotion never destroys the evidence it came
   * from, so the seed can always be traced back to the source that justified it.
   */
  const promoteBriefLine = (projectId: string, lineId: string) => {
    const state = specAiFor(projectId);
    const line = state.brief
      ? Object.values(state.brief.bands)
          .flat()
          .find((l) => l.id === lineId)
      : undefined;
    if (!line) return;

    if (state.cards.some((c) => c.type === 'Requirement seed' && c.title === line.text)) {
      addToast('That is already a requirement seed.', 'info');
      return;
    }

    const backing = state.sources.filter((s) => line.sourceIds.includes(s.id));

    patch(projectId, (s) => ({
      ...s,
      cards: [
        ...s.cards,
        {
          id: nid('card'),
          sourceId: line.sourceIds[0],
          type: 'Requirement seed' as CardType,
          state: 'Requirement seed' as CardState,
          title: line.text,
          content:
            backing.length > 0
              ? `Promoted from the brief, resting on ${backing.map((x) => x.name).join(' · ')}.`
              : 'Promoted from the brief. Nothing sourced backs it, so confirm the intent before it carries weight.',
          evidenceClass: line.evidenceClass,
          confidence: line.evidenceClass === 'Source fact' ? 0.9 : 0.6,
          relations: [],
          aiCreated: false,
          rationale: `Promoted from brief line: ${line.sourceSummary}`,
        },
      ],
    }));

    addToast('Requirement seed created. The brief line is unchanged.');
    addAuditLog(
      'Promote Brief Line',
      `Project: ${projectId}`,
      `${line.evidenceClass} · ${line.sourceSummary}`,
      'Requirement seed created; evidence retained'
    );
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
    addToast('Disagreement resolved and recorded as a decision.');
    markBriefStale(projectId, 'You resolved a disagreement. Refresh to fold the decision in.');
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
    addToast(`Seeded from ${archetype.name}. It is a pattern, not a source — ask the agent to read it.`);
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
    const carried = stageGateWarnings(stage, state);
    const next = SPEC_STAGES.find((s) => s.index === stageIndex(stage) + 1);

    /* Locking a stage locks anything still open before it, so jumping ahead can
       never leave a hole in the pipeline. */
    const through = SPEC_STAGES.filter((s) => s.index <= stageIndex(stage)).map((s) => s.key);

    patch(projectId, (s) => ({
      ...s,
      lockedStages: [...new Set([...s.lockedStages, ...through])],
      currentStage: next?.key ?? stage,
      // The Stage 1 reading becomes Stage 2's starting draft, filling only blanks.
      understanding: through.includes('knowledge')
        ? seedUnderstandingFromBrief(s)
        : s.understanding,
      artifacts:
        through.includes('understanding') && s.artifacts.length === 0
          ? GENERATED_ARTIFACTS()
          : s.artifacts,
      modules:
        through.includes('artifacts') && s.modules.length === 0 ? GENERATED_MODULES() : s.modules,
      stories: through.includes('modules') && s.stories.length === 0 ? GENERATED_STORIES() : s.stories,
    }));

    const generated =
      stage === 'understanding'
        ? ' Generating the PRD and architecture package.'
        : stage === 'artifacts'
        ? ' Module map generated.'
        : stage === 'modules'
        ? ' Stories generated.'
        : '';

    addToast(
      `${stageDef(stage).title} locked.${generated}${
        carried.length > 0
          ? ` ${carried.length} unresolved ${
              carried.length === 1 ? 'item' : 'items'
            } carried forward.`
          : ''
      }`
    );

    /* What was still open at the moment of locking is recorded, so anything
       generated from this version can be traced back to it. */
    addAuditLog(
      'Lock Spec AI Stage',
      `${stageDef(stage).title} · Project ${projectId}`,
      carried.length > 0 ? `Carried forward: ${carried.join('; ')}` : 'Nothing outstanding',
      next ? `Version-locked; ${next.railLabel} reached` : 'Version-locked'
    );
  };

  const goToSpecStage = (projectId: string, stage: SpecStageKey) => {
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
      stories: s.stories.map((st) =>
        st.deliveryStatus === 'Draft' ? withDeliveryStatus(st, 'Exported') : st
      ),
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

  const setStoryDeliveryStatus = (
    projectId: string,
    storyId: string,
    status: StoryDeliveryStatus
  ) => {
    patch(projectId, (s) => ({
      ...s,
      stories: s.stories.map((st) =>
        st.id === storyId ? withDeliveryStatus(st, status) : st
      ),
    }));
    addToast(`Story marked ${status}.`);
  };

  return {
    specAi,
    specAiFor,
    addSpecSource,
    removeSpecSource,
    retrySpecSource,
    startFromProblem,
    setProblemStatement,
    askAgent,
    answerQuestion,
    updateCard,
    setCardState,
    promoteBriefLine,
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
    setStoryDeliveryStatus,
  };
};

export type SpecAiSlice = ReturnType<typeof useSpecAiSlice>;
