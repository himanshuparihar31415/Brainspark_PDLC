# Spec AI — Specification, as implemented

> **Front-end prototype.** Everything is mock data held in React state — there is no
> persistence and nothing leaves the browser. What follows describes UI behaviour and
> the state that drives it.
>
> Derived from the code in `src/`, not from a design intent. Where behaviour here
> differs from [PRD.md](PRD.md) §4.3, this document describes what actually runs.
> File references are links; formulas are transcribed from source.

Spec AI converts fragmented product knowledge into an approved, traceable
specification package and a delivery backlog. It is the Product Manager and
Architect's shared pipeline, and the only full-screen module workspace in the
platform — entering it collapses the platform nav.

The organising idea is **progressive structure**: rough thinking first, formal
documentation later. Five stages, each ending in an approve-and-lock gate.

---

## 1. Where it lives

| Concern | File |
|---|---|
| Type contract | [src/types/specai.ts](src/types/specai.ts) |
| Rules, gates, derivations, copy | [src/data/specai.ts](src/data/specai.ts) |
| State machine and mutations | [src/context/useSpecAi.ts](src/context/useSpecAi.ts) |
| Module shell | [src/components/views/SpecAiView.tsx](src/components/views/SpecAiView.tsx) |
| Stage surfaces | [src/components/specai/](src/components/specai/) |
| Seed state | [src/data/specAiData.ts](src/data/specAiData.ts) |
| Intake classifier | [src/data/specAiIntake.ts](src/data/specAiIntake.ts) |
| Agent engine | [src/data/specAiAgent.ts](src/data/specAiAgent.ts) |
| Stage 3–5 generated payloads | [src/data/specAiGenerated.ts](src/data/specAiGenerated.ts) |
| Completion rollups | [src/data/completion.ts](src/data/completion.ts) |
| History feed | [src/data/specAiHistory.ts](src/data/specAiHistory.ts) |

The agent engine and intake classifier are **dynamically imported** inside
`startFromProblem` and `askAgent` — their retrieval tables and prose stay out of
the initial bundle, since only Spec AI runs them.

---

## 2. The stage model

Five stages, defined in `SPEC_STAGES`:

| # | Key | Rail label | Title |
|---|---|---|---|
| 1 | `knowledge` | Knowledge | Knowledge Creation & Contextualization |
| 2 | `understanding` | Understanding | Project Understanding |
| 3 | `artifacts` | Artifacts | Artifact Studio |
| 4 | `modules` | Modules & Features | Modules & Features |
| 5 | `stories` | User Stories | User Stories |

### Stage state

Each stage is `Locked`, `Current`, or `Ahead`:

```
Locked  — the stage is in lockedStages
Current — every earlier stage is locked
Ahead   — something upstream is still open
```

**Locking gates generation, not navigation.** Every stage is reachable at any
time; `Ahead` means what you see is provisional, not forbidden. Reading ahead is
how you discover what the earlier stages owe you.

### Locking

`lockSpecStage` does four things:

1. Locks the target stage **and every unlocked stage before it** — jumping ahead
   can never leave a hole in the pipeline.
2. Advances `currentStage` to the next stage.
3. Generates the next stage's payload, but **only if that payload is empty**:
   - lock `knowledge` → seeds Project Understanding from the brief
   - lock `understanding` → `GENERATED_ARTIFACTS()`
   - lock `artifacts` → `GENERATED_MODULES()`
   - lock `modules` → `GENERATED_STORIES()`
4. Writes an audit entry recording **what was still unresolved at the moment of
   locking**, so anything generated from this version traces back to it.

### Unlocking

`unlockSpecStage` cascades **forward** — the mirror of locking cascading back.
Every stage after the reopened one was generated from the version about to be
edited, so leaving them locked would let the premise change while its conclusions
stayed sealed.

**Nothing generated is deleted.** Artifacts, stories and the brief are marked
`stale` instead. The stated reasoning: the work in them is real even when its
input has moved, and quietly discarding an afternoon of edits to enforce tidiness
is the worse of the two failures.

### Gate warnings

`stageGateWarnings` is **advisory, never blocking**. The system's job is to say
what is being carried forward; the decision to proceed is the user's.

| Stage | Warns when |
|---|---|
| `knowledge` | No task accepted (short-circuits, returns immediately); unresolved disagreements, listed individually; open Architecture questions ("they will propagate into every artifact generated from here"); open Product questions; no requirement seed yet; agent has not read the sources; brief is stale |
| `understanding` | Any understanding section empty, named individually; no confirmed formal requirement |
| `artifacts` | Brownfield mode with no legacy architecture brought in; any artifact with `confidence: 'low'` or `stale` |
| `modules` | No modules mapped; any module with no features |
| `stories` | *(none — export has its own guards)* |

---

## 3. State model

One `SpecAiState` per project, keyed by `projectId`. `specAiFor()` returns a
blank state for an unknown project rather than `undefined`, and every mutation
funnels through `patch()`, which lazily creates the row and stamps
`saveState: 'Saved'`.

```
SpecAiState
├─ projectId, specKey, currentStage, lockedStages[]
├─ intake?              ← Stage 0
├─ problemStatement     ← the ask, as the pipeline reads it
├─ sources[]            ← Stage 1 inputs
├─ brief?               ← Stage 1 provisional reading (disposable)
├─ transcript[]         ← the agent conversation, tool calls included
├─ questions[]          ← what synthesis could not answer
├─ cards[]              ← evidence records
├─ understanding[]      ← Stage 2 owned sections (lockable)
├─ requirements[]       ← Stage 2 formal requirements
├─ archMode, hasLegacyArchitecture, artifacts[]   ← Stage 3
├─ modules[]            ← Stage 4
├─ stories[], jiraMapping, jiraSyncedMinutesAgo   ← Stage 5
└─ sectionEditors, saveState, generating?
```

Ids are minted by `nid()`, a timestamp **plus a counter** so ids created in the
same millisecond stay distinct. Ids are always minted outside state updaters,
because React may call an updater more than once and an updater must be pure.

---

## 4. Stage 0 — Intake

Before there is a direction to read anything against, Knowledge Creation asks
what the project is. This is deliberately **one action, not a ceremony**: the
statement is recorded, the brief is seeded, and the agent starts reading. A
screen that reads your input, shows a plan, then asks you to approve the plan was
judged to be three screens doing the work of one.

### Classification

`classify()` identifies input **by shape, without understanding it**, first match
wins:

| Kind | Detected by |
|---|---|
| `System logs` | `ERROR\|WARN\|FATAL\|SEVERE\|Exception\|Traceback\|stack trace`, or an ISO timestamp, or a `at pkg.Class(File.java:42)` stack frame |
| `Issue description` | "steps to reproduce" / "expected:" / "actual:" / "acceptance criteria", or a tracker key like `FMB2-142` |
| `Meeting notes` | bulleted lines **and** one of `agreed\|action item\|discussed\|decided\|attendees\|AI:` |
| `Problem statement` | fallback, when ≥ 8 words |
| `Unclear` | fewer than 8 words — "too short to read" |

The kind changes what is worth extracting: logs give error signatures and
affected services, an issue gives expected-versus-actual, prose gives intent and
nothing else. `kindReason` is stored so the classification is auditable.

### What the agent does with it

`readIntake()` returns a `SpecIntake` plus the tool calls that produced it. The
statement you typed is preserved verbatim — the agent reads it for signals but
**does not get to rewrite the one thing you were asked for**.

Anything the agent needs and cannot find becomes an **open Product question**
rather than a gate blocking the workspace. Questions are deduplicated
case-insensitively against those already asked.

If any source is already `Indexed`, the opening read fires immediately.

---

## 5. Stage 1 — Knowledge Creation & Contextualization

The only stage that fills the viewport rather than scrolling.

### Sources

`SpecSource` moves through `Queued → Parsing → Indexed`, or `Failed`.

**Ingest state is load-bearing, not cosmetic:** synthesis only reads `Indexed`
sources, so a brief generated mid-ingest genuinely omits the new material and
says so. Adding a source marks any existing brief stale with the reason
`"<name> arrived after this reading."`; removing one does the same only if the
brief was generated from it.

Adding a source whose name matches `/legacy|existing architecture|as-is/i` sets
`hasLegacyArchitecture`, which feeds the Stage 3 Brownfield gate warning.

File extensions map to types via `SOURCE_TYPE_FOR_FILE` — images, audio, `.vtt`/`.srt`
transcripts, PDF, DOCX, everything else TXT. Image sources record "Text extracted
from image", audio records "Transcribed".

### The agent terminal

`askAgent` runs one turn. An empty message means the opening read across every
source; anything else is a question or a decision.

Tool calls resolve **on screen one at a time** (staggered `120 + i * 170` ms),
and the reply lands only after them — "a reply that arrives before its evidence
is just an assertion". Tools available: `list_sources`, `read_source`,
`search_sources`, `check_coverage`, `compare_sources`.

`ToolCallStatus` separates `empty` from `error` deliberately: a tool that ran
fine and found nothing is a finding, and collapsing it into failure is what makes
a reading look more complete than it is.

### The brief

`UnderstandingBrief` is the **by-product of the conversation**, not a separate
document kept in step. Every turn that learns something folds in and bumps
`version`.

Four bands, and separating them is the point — an overview blurring what is known
with what is guessed launders assumptions into facts:

| Band | Header | Meaning |
|---|---|---|
| `understood` | What we know | Straight from sources; each line names its origin |
| `decided` | What's been decided | Settled by the user, so it carries weight downstream |
| `inferring` | What I'm assuming | Reasoned, not stated |
| `cannotTell` | What's still missing | No source covers it; became a question |

Three deduplication passes run on every turn, all case-insensitive: questions
against existing question text, evidence against existing card titles, and brief
additions against lines already in the brief. The third exists because the intake
seeds the brief moments before the first read fires — without it, the opening
read restates the problem statement just written down.

**Anything already settled survives a re-read.** A regeneration must never
quietly discard a decision someone made.

### Evidence and provenance

Every `BoardCard` declares an `EvidenceClass` — the system must never blur a
sourced fact with an AI guess:

`Source fact` · `User decision` · `Inferred interpretation` · `AI assumption`

Card lifecycle, each state deciding which actions are offered:

```
Captured → Interpreted → Confirmed → Requirement seed
              ↓
           Flagged  (disagreements)
                                    Superseded (retained for audit)
```

AI-created cards are visually distinct and **must be confirmed explicitly**
before they can become a requirement seed.

`promoteBriefLine` is the one action moving something from "the agent understands
this" to "we are going to build this". The brief line **stays** — promotion never
destroys the evidence it came from. A seed with no sourced backing says so
explicitly in its content.

### Questions

Split by track, matching the module's ownership: `Product` → Product Manager,
`Architecture` → Architect. Status is `Open`, `Answered`, `Assumed`, or
`Deferred`. Settling one marks the brief stale — "Refresh to fold it in."

### Readiness

```
coverage  = indexedSources / totalSources
seedScore = min(1, confirmedSeeds / 8)
penalty   = openConflicts × 0.08  +  openQuestions × 0.03

percent   = clamp(0, 100, round((coverage × 0.4 + seedScore × 0.6 − penalty) × 100))
```

Confirmed seeds are weighted more heavily than source coverage (0.6 vs 0.4):
indexing documents is not progress until something has been committed to.

---

## 6. Stage 2 — Project Understanding

Nine sections: `objective`, `primaryUsers`, `currentState`, `proposedState`,
`inScope`, `outOfScope`, `constraints`, `assumptions`, `openQuestions`.

### Seeding

`seedUnderstandingFromBrief` runs on locking Stage 1 and **fills only empty
sections** — the brief seeds understanding, it never overwrites what a person
wrote. This is the entire relationship between the two surfaces:

- Stage 1's brief is **disposable and freely regenerated**
- Stage 2's understanding is **edited, owned, and locked**
- Seeding on lock is the one moment they touch

Mapping: `objective` ← problem statement · `currentState` ← *understood* band ·
`assumptions` ← *inferring* band · `openQuestions` ← *cannotTell* band plus every
unsettled question.

`regenerateUnderstanding` bumps one section's version and never touches edits
elsewhere.

### Formal requirements

`FormalRequirement` is promoted from one or more seeds and carries actor, need,
business value, preconditions, main behaviour, optional fallback, Given/When/Then
acceptance criteria, `evidenceCardIds` with a human-readable `evidenceSummary`,
confidence and owner. Types: `Functional`, `Non-functional`, `Security`, `Data`.

---

## 7. Stage 3 — Artifact Studio

`ArchMode` is `Greenfield` or `Brownfield`. Brownfield artifacts carry a
`ChangeTag` of `+ New`, `~ Changed`, or `− Deprecated`.

Artifacts are grouped `Product` → `Architecture` → `Contracts` → `Decisions` →
`Visuals`, with status `Not generated` → `Generated` → `In review` → `Approved`.

Diagrams render through React Flow (`FlowDiagram`: positioned nodes and edges);
`diagramFlow` remains as a legacy flat node chain.

**`regenerateArtifact` is the traceability ripple.** It bumps the version, clears
`stale` on the artifact, and marks **every story linking to that artifact**
`stale` — then reports the count in the toast. This is what keeps downstream work
honest when an upstream document moves.

`reviewArtifact` sets confidence `high`, clears `stale`, and marks it `Approved`.

---

## 8. Stage 4 — Modules & Features

A three-level tree: **Module → Feature → Capability**, with `dependsOn` edges
between modules that drive story priority scoring in Stage 5.

Supported operations: add at any level, remove at any level, `reparentSpecFeature`,
`mergeSpecModules`, `splitSpecModule`.

Both merge and remove keep the dependency graph consistent — merging rewrites
every `dependsOn` pointing at the absorbed module and drops self-references;
removing strips the dead id from every other module's `dependsOn`. Splitting a
feature into its own module makes the new module depend on its former parent.

---

## 9. Stage 5 — User Stories & export

### Tracks

Seven story types collapse into two tracks. The split drives grouping, not
permissions — both export to the same backlog.

| Track | Types | Meaning |
|---|---|---|
| Non-technical | `User story` | Customer-facing behaviour a stakeholder can accept without reading the design |
| Technical | `Technical`, `API`, `Security`, `Data`, `Testing`, `Migration` | Work that exists because of how the system is built |

### Delivery status

`Draft → Exported → In progress → Done`, plus `Blocked`. The legacy `exported`
boolean is kept in sync by `withDeliveryStatus` (`exported = status !== 'Draft'`)
— always mutate through that helper, never set the flag directly.

### Export guards

`exportStoriesToJira` refuses in two cases, both with a specific message:

1. The Jira connector is not activated for the project → "This needs the Jira
   connector. Ask your admin."
2. Any story type in use has no issue-type mapping → names the first unmapped type.

On success, only `Draft` stories advance to `Exported`, and `jiraSyncedMinutesAgo`
resets to 0.

### Staleness

A story is `stale` when a linked requirement or artifact changed after generation;
`staleReason` records which upstream artifact moved. `reviewStaleStory` clears it.

---

## 10. Cross-cutting behaviour

### Staleness propagation

Every path that can invalidate a reading sets `stale` with a **specific reason
string**, never a bare flag:

| Trigger | Marks stale | Reason |
|---|---|---|
| Source added | brief | "`<name>` arrived after this reading." |
| Source removed (if brief used it) | brief | "`<name>` was removed." |
| Problem statement edited | brief | "The problem statement changed." |
| Question settled | brief | "You settled '…'. Refresh to fold it in." |
| Conflict resolved | brief | "You resolved a disagreement…" |
| Stage 1 reopened | brief | "Knowledge was reopened for editing." |
| Artifact regenerated | linked stories | *(count reported in toast)* |
| Stage reopened | artifacts, stories | flagged for review, never deleted |

### Progress

```
workspaceProgress = round(min(1, locked + inFlight) × 100)

  perStage = 1 / 5
  locked   = lockedStages.length × perStage
  settled  = questions.length ? nonOpen / total : (brief ? 1 : 0)
  inFlight = allStagesLocked ? 0 : settled × perStage
```

The stage in hand counts for the share of the agent's questions that have been
settled — which is what decides whether the work is safe to build on.

### Permissions

```ts
SPEC_OWNER_ROLES = ['Product Manager', 'Architect']
canEditSpecAi(role) => SPEC_OWNER_ROLES.includes(role)
```

Everyone else may look but not edit, matching the read-only rule for workspaces
outside your own module. Nav visibility is broader than edit rights — Project
Admin and all PDLC roles can reach Spec AI; only two can change it.

Both personas work one pipeline, with soft per-section locks in `sectionEditors`.

### Audit

Every consequential mutation calls `addAuditLog(action, target, input, output)`:
`Add Spec Source`, `Start Spec AI From Problem`, `Agent Read Sources`, `Agent Turn`,
`Settle Spec Question`, `Promote Brief Line`, `Resolve Conflict`,
`Regenerate Artifact`, `Lock Spec AI Stage`, `Unlock Spec AI Stage`,
`Export Stories to Jira`.

The lock entry is the important one: it records what was outstanding at the
moment of locking, so a carried-forward gap stays traceable instead of becoming
a silence.

### History

`SpecHistoryEntry` records `generation`, `decision`, and `version` events with
stage, session, actor, model, duration and a `diffSummary` of
added/removed/modified. Surfaced by [HistoryPanel.tsx](src/components/specai/HistoryPanel.tsx).

---

## 11. Platform integration

Spec AI stories are the **source of truth** for the Spec AI pipeline phase and,
once present, for the project's overall completion. Two effects in
[AppContext.tsx](src/context/AppContext.tsx) watch `specAi`:

1. `specAiPhaseFromStories` derives the phase's done/total and status — `Blocked`
   if any story is blocked, `Complete` when all are done, else `In progress`.
   Returns `null` for an empty story list, and callers then keep their seeded
   values.
2. `projectCompletionFromPhases` recomputes project completion as the unweighted
   average of phase `done/total`, but only for projects that actually have
   stories.

Both effects compare before writing and return the previous array unchanged when
nothing moved, so they cannot loop.

---

## 12. Where the mock data lives

Everything is mock data held in React state. There is no persistence — a reload
starts over, and `saveState` is always `'Saved'`.

| Behaviour | How the mock produces it | Fixture / logic |
|---|---|---|
| Ingestion | `setTimeout(1400ms)`, then `Indexed`. Always succeeds; a `Failed` state exists in the data but nothing sets it | `addSpecSource`, `retrySpecSource` |
| Agent replies | Message matched against deterministic topic and finding tables | `TOPICS`, `FINDINGS`, `runAgent` |
| Tool calls | Pre-planned per topic, staggered on screen to read as work happening | `PlannedCall` in `specAiAgent.ts` |
| Intake reading | Regex shape-matching on the pasted text | `classify`, `readIntake` |
| Stage 3–5 content | Fixed fixtures, emitted on lock | `GENERATED_ARTIFACTS/MODULES/STORIES` |
| Jira export | Flips story status and resets the sync counter | `exportStoriesToJira` |
| Seed state | Two projects pre-populated; unknown projects get a blank state | `INITIAL_SPEC_AI`, `blankSpecAiState` |

Worth knowing when demoing: the agent only responds convincingly to messages that hit
a topic in the table, and ingestion never fails, so the `Failed` chip and the Retry
path can't be reached from the UI without editing the fixtures.
