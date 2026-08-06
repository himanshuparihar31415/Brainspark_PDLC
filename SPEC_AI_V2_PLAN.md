# Spec AI v2 — redesign plan

Companion to `Spec_AI_v2_Unified_Flow.md` (intent) and `spec_ai_mockup.html` (target
UI). Current behaviour is documented in [SPEC_AI.md](SPEC_AI.md).

The v2 premise is correct and worth stating plainly: **this is a presentation-layer
change**. The state machine — staged gates, staleness propagation, the traceability
ripple, the audit trail — is already right and is presentation-independent. It should
not be touched.

Decisions D1–D4 are resolved (§2). One naming decision (N1) remains open.

---

## 1. What stays untouched

Do not rebuild any of this. It exists, it works, and it does not care what the UI
looks like.

| Machinery | Where |
|---|---|
| 5-stage model, lock/unlock cascades | `lockSpecStage` / `unlockSpecStage` |
| Advisory gate warnings | `stageGateWarnings` |
| Staleness propagation with reasons | throughout `useSpecAi.ts` |
| Traceability ripple (artifact → stories) | `regenerateArtifact` |
| Evidence classes and provenance | `BoardCard`, `Provenance` |
| Brief banding and versioning | `foldIntoBands`, `UnderstandingBrief` |
| Five-tool retrieval loop | `runAgent` in `specAiAgent.ts` |
| Intake shape classification | `classify` in `specAiIntake.ts` |
| Audit logging | every mutation |
| Completion rollups into the platform | `completion.ts` + two effects in `AppContext` |

**The five stages remain as internal state.** `lockedStages` stays the gate
mechanism; it simply stops being rendered as a tab strip.

---

## 2. Decisions

### D1 — Confidence attaches to every item ✔ resolved

Not the mockup's three rows. The facet vocabulary is the existing
**`UnderstandingKey`** — all nine: `objective`, `primaryUsers`, `currentState`,
`proposedState`, `inScope`, `outOfScope`, `constraints`, `assumptions`,
`openQuestions`.

This is the strongest version of the answer, because it means **one vocabulary
spans both halves of the pipeline**: a brief line carries the same key that a
Project Brief section does, so seeding is already aligned (`seedUnderstandingFromBrief`
maps bands onto exactly these keys today) and confidence survives the gate instead
of being recomputed against a different model.

```ts
// types/specai.ts
facet?: UnderstandingKey   // added to BriefLine
```

**Consequence — the rail cannot show nine equal rows.** At 320px that is a wall of
bars, and it buries the signal. Ordering is the fix, and it falls out of v2 §3.4,
which already wants the lowest-confidence items to drive the next questions:

- Sort ascending by confidence — worst first.
- Show the lowest 3–4 expanded, collapse the rest behind "6 more · all Medium+".
- Any facet with an open conflict pins to the top regardless of score.

That way the rail answers "what is weakest right now" rather than reciting nine
numbers, and it stays the same component if the vocabulary later grows.

### D2 — Stages 4 and 5 keep their surfaces, entered from bars ✔ resolved

`Stage4Modules` and `Stage5Stories` are kept **as-is**. Every capability they have
survives: merge, split, re-parent, dependency editing, story tracks, Jira field
mapping, export guards.

They gain review bars in the queue alongside artifacts. A bar is the entry point;
the surface behind it is unchanged. This is the cheapest correct answer — approving
and authoring stay separate, and no working editor gets rebuilt as a table row.

### D3 — My Tasks stays outside; the top bar gets an icon nav ✔ resolved

Rejects the mockup's in-workspace My Tasks tab. Review lives in the **platform**
`MyTasksView`; Spec AI's top bar carries a compact icon strip with a pending badge
so it is one click away and visibly there.

Two consequences, both real work:

1. **Artifacts must appear in platform My Tasks**, which today renders `Task[]` —
   assignee, due date, `Needs Approval`, with a detail pane and sign-off. Spec AI
   artifacts are `ArchArtifact[]`. This needs a bridge (§4, Phase 4). Prefer
   deriving review items from `state.artifacts` inside `MyTasksView` over widening
   the `Task` type, so delivery tasks and spec artifacts stay separate models.
2. **The nav no longer fully collapses.** Spec AI sets `navCollapsed` on entry via
   `MODULE_WORKSPACES`. The icon strip is the replacement for the thing that
   collapse removed, so it must carry the same badge counts the sidebar would have.

### D4 — Two named gates; Project Understanding survives ✔ resolved

Understanding is **not** cut. The flow is:

```
  thread (knowledge)
        │  /finalize
        ▼
  ① PROJECT DEFINITION        ← locked record, output of finalize
        │
        ▼
  ② PROJECT BRIEF             ← was "Project Understanding"
        │  confirm             nine sections + formal requirements
        ▼
  artifacts generate progressively  ← arriving a few at a time
        │
        ▼
  queue bars: artifacts → module map → stories
```

Both gates map onto locks that already exist — ① is the `knowledge` lock, ② is the
`understanding` lock. Nothing new in the state machine; two stages get named,
user-facing identities instead of tab labels.

Formal requirements (actor, need, business value, Given/When/Then acceptance,
evidence links) keep their home in ②. That was the largest silent gap in the
mockup, and it is now closed.

**Consequence — artifacts arrive progressively.** Today `lockSpecStage` emits all
of `GENERATED_ARTIFACTS()` in a single synchronous patch. "A few artifacts can come
in between" needs staged emission. The pattern already exists in `askAgent`, which
lands tool calls one at a time on a stagger — reuse that shape rather than
inventing one.

### N1 — Naming collision ✔ resolved

D4 names gate ② **Project Brief**. The code already used `brief` for something
else: `SpecAiState.brief` is the *Stage 1 provisional reading* — the disposable,
freely-regenerated thing the thread produces — while `understanding` is the owned,
lockable record now called the Project Brief. Left alone, the two names point at
each other's meaning.

**Decision: rename the Stage 1 field** `brief` → `reading`, and `UnderstandingBrief`
→ `SourceReading`. Mechanical, ~40 references, no behaviour change, and it frees
"brief" for the thing users will actually call the brief. `state.understanding`
keeps its field name; only its user-facing title becomes **Project Brief**.

Read as: the agent's *reading* of the sources is what the conversation produces; the
*brief* is what you confirm.

---

## 3. Gap analysis

### Already exists — reuse, do not rebuild

| v2 asks for | Already is |
|---|---|
| Agentic retrieval loop, 5 tools | `runAgent` |
| Draft from partial index, flag what's missing | ingest gating + `stale` reasons |
| Questions grounded in specific gaps, citing filenames | `FINDINGS` carry source refs |
| Flags distinct from questions | `Disagreement` cards vs `SpecQuestion` |
| Picking a side converts to a decision | `resolveConflict` → `User decision` |
| Advisory finalize gate showing what's overridden | `stageGateWarnings` |
| Lock kicks off artifact generation | `lockSpecStage` |
| Reopen flags downstream, never discards | `unlockSpecStage` |
| Editing the problem statement triggers re-synthesis | `setProblemStatement` marks brief stale |
| Gate ② content: nine sections + requirements | `understanding`, `requirements` |
| Brief facets already map to the nine keys | `seedUnderstandingFromBrief` |

### Partly exists — needs rework

| v2 asks for | Today | Work |
|---|---|---|
| One continuous thread | `AgentTerminal`, but only inside Stage 1 | Promote to the shell; render brief lines + questions as turns |
| Inline answer chips | `QuestionQueue` is a separate panel | Move into thread turns |
| Pinned editable problem statement | Inside Stage 1 via `IntakeGate` | Extract to a top bar |
| Flags always visible while scrolling | `ConflictResolver` scrolls with Stage 1 | Move to the rail |
| `/finalize` | `StageFooter` "Lock & continue" | Slash command + button + modal |
| Artifact approval | `reviewArtifact` in `Stage3Artifacts` | Same mutation, surfaced in platform My Tasks |
| All artifacts at once | one synchronous patch | Staged emission |

### Genuinely new — build from scratch

1. **Per-facet confidence scoring** across all nine keys (D1). Nothing scores a
   section today: `knowledgeReadiness` is one number for the whole stage, card
   confidence is per-record, artifact confidence is a `'high' | 'low'` self-report.
2. **The right rail** — live confidence + flags, worst-first, persistent across scroll.
3. **Top-bar icon nav** with badges, replacing what nav-collapse removes (D3).
4. **Artifact → review-item bridge** into `MyTasksView` (D3).
5. **Progressive artifact emission** (D4).
6. **Section-scoped re-scoring** — v2 §3.6 wants an answer to re-score only the
   affected facet; today every turn rebuilds the whole brief.
7. **Proactive retrieval on reference** — "check the March deck" should trigger a
   search. `runAgent` matches topics, not references to unindexed material.
8. **Confidence-ranked question generation** — v2 §3.4. Today questions come from
   `FINDINGS` keyed by topic.

---

## 4. Phases

Sizes are relative (S/M/L), not durations.

### Phase 0 — Settle N1 **(S)**

Rename per N1(a) if accepted: `state.brief` → `state.reading`. Pure rename, done
before new code references either field.

### Phase 1 — Confidence as a derived value **(M)**

**Do this first.** It is the one genuinely new model, everything visible depends on
it, and it can be built and checked before any UI moves.

- `types/specai.ts`: `facet?: UnderstandingKey` on `BriefLine`; add
  `ConfidenceLevel = 'low' | 'medium' | 'high'` and a `FacetConfidence` result type.
- `data/specai.ts`: `facetConfidence(state, key)` implementing v2 §3.3 against
  fields that already exist:

```
claims     = brief lines carrying this facet
supported  = claims whose evidenceClass is 'Source fact' or 'User decision'
conflicted = any Flagged Disagreement card sharing a source with those claims

no claims                            → Low   ("nothing here yet")
conflicted                           → Low   (+ flagged, pins to rail top)
supported / claims < 0.5             → Low
supported / claims < 1.0             → Medium
all supported, 1 distinct source     → Medium
all supported, 2+ distinct sources   → High
```

- `data/specai.ts`: `facetsByWeakest(state)` for rail ordering and for Phase 6's
  question ranking — one function, both callers.
- `specAiAgent.ts`: assign a `facet` to each `BriefAddition`.

**Derive it, never store it.** The mockup's JS refuses to downgrade a level
(`if(order[level] <= order[state.confidence[key]]) return`) and fakes a dip with
`dipAndRecover`. That suppresses the most important signal in the system: a new
conflicting source *should* lower confidence. A derived value gets this free and
cannot drift out of step with the evidence.

### Phase 2 — Shell restructure **(L)**

- New `SpecAiShell` replacing the body of `SpecAiView`: top bar, `ProblemBar`,
  thread, rail.
- New `SpecTopBar.tsx` — wordmark, breadcrumb, and the D3 icon strip with badge
  counts. No My Tasks tab.
- New `ProblemBar.tsx` — pinned, inline-editable, lock indicator, wired to
  `setProblemStatement` (which already handles staleness) and to the unlock route.
- New `ConfidenceRail.tsx` + `FlagRail.tsx` — reads `facetsByWeakest`; resolve wires
  to the existing `resolveConflict`.
- Promote `AgentTerminal` to the shell; teach it to render brief lines and question
  chips as turns.
- Retire `StageStrip` / `StageFooter` from the view. Keep a slim progress meter from
  `workspaceProgress` — with the strip gone there is otherwise no signal of where
  you are in a five-stage pipeline.
- `StatusBar` unchanged.

### Phase 3 — Finalize gate → Project Definition **(S)**

- `/` command menu plus a visible **Finalize** button. v2 is right that a slash
  command alone is a discoverability problem.
- `FinalizeGate` modal rendering `stageGateWarnings('knowledge', state)` verbatim —
  copy already written, already advisory. Confirm label flips to "Finalize anyway"
  when anything is outstanding.
- Confirm calls `lockSpecStage('knowledge')`. No new mutation.
- Name the resulting locked record **Project Definition** in UI copy and audit text.

### Phase 4 — Project Brief confirmation **(M)**

- Gate ② surface: the nine sections plus formal requirements. `Stage2Understanding`
  is the starting point — retitle to **Project Brief**, reached from the thread on
  finalize rather than from a strip.
- Confirm calls `lockSpecStage('understanding')`, which already triggers artifact
  generation.
- Per-section confidence from Phase 1 renders here too — same `facetConfidence`,
  same keys, no second model.

### Phase 5 — Progressive artifacts + review queue **(M)**

- Change `lockSpecStage`'s artifact emission from one patch to a stagger, reusing
  the `askAgent` tool-call pattern. Each arrival is a thread system message.
- Artifact → review-item bridge in `MyTasksView` (D3). Approve calls the existing
  `reviewArtifact`. Badge counts flow to the Phase 2 icon strip.
- Unlock banner when all artifacts are approved.
- `Stage3Artifacts` stays reachable as the artifact reader/editor — a queue row is
  not a document view.

### Phase 6 — Module map and story bars **(S)**

- Review bars for "Approve module map" and "Approve stories", opening the existing
  `Stage4Modules` / `Stage5Stories` full-screen, unchanged (D2).

### Phase 7 — Agent loop **(L)**

Deepest change, safe to defer: the UI works against the current engine.

- Facet-scoped re-scoring on answer, rather than a whole-brief rebuild.
- Confidence-ranked question generation via `facetsByWeakest`, replacing
  topic-keyed `FINDINGS`.
- Reference detection → proactive `search_sources`.

---

## 5. Filling the design gaps

The mockup is a faithful design for the *thread*. Measured against what the module
already does, twelve shipped capabilities have no surface in it. Left unfilled, v2
would ship as a regression dressed as a redesign.

Each gap below is filled using a pattern **the mockup already contains**, so this
extends its language rather than running a second one alongside it.

### 5.1 Sources — needs a rail card

The mockup handles attaching (`.tray-chip` in the composer, an `Indexed: …` system
message) but never shows the source *set*. So a `Failed` source has nowhere to
appear, and `retrySpecSource` has no trigger at all.

**Fill:** a third rail card, **Sources**, above Confidence. One row per source using
the existing `SOURCE_BADGE` tint plus `sourceGlyph` (first letter of the source's own
name), the `detail` line, and an ingest chip styled like `.status-pill` using
`INGEST_COPY`. `Failed` rows carry a Retry; every row carries a remove. Tray chips
stay as the transient "just attached" affordance.

### 5.2 Evidence class and provenance — the `.cite` chip already implies it

`.cite` is the mockup's filename pill and is the natural handle, but it does nothing.
Meanwhile every claim in the system declares whether it is a `Source fact`,
`User decision`, `Inferred interpretation`, or `AI assumption` — and that
distinction is the module's entire reason for being trustworthy.

**Fill:** two things on brief lines rendered in the thread.

1. An evidence chip using the existing short labels — **Fact · Decision · Inferred ·
   Assumption** — with `EVIDENCE_CLASSES` colours. Assumption is amber and should
   read as a warning, because it is one.
2. Clicking a `.cite` opens provenance: system, `itemId`, `indexedAt`, `deepLink`,
   and the verbatim `excerpt`. `SourceDrawer` already exists for this — reuse it.

### 5.3 Requirement seeds — no affordance at all

`promoteBriefLine` is the single action that moves something from "the agent
understands this" to "we are going to build this", and the knowledge gate warns when
no seed exists. The mockup cannot perform it.

**Fill:** a hover action on each brief line — **Promote to requirement** — styled as
a `.chip`. Seed count goes in the Confidence card footer, since the gate warning
depends on it and the rail is where gate-blocking facts belong.

### 5.4 Question tracks and the two missing statuses

The mockup gives every question exactly two answer chips. The implementation has
`Product` vs `Architecture` tracks with different default owners, and four statuses —
`Open`, `Answered`, `Assumed`, `Deferred`.

**Fill:** each question turn gets a track chip using `QUESTION_TRACK_COPY` (Product
indigo, Architecture dark), plus two further `.chip`s: **Assume for now** and
**Defer**. Architecture questions sort first, because the gate already says they
"will propagate into every artifact generated from here" — the ordering should
reflect the warning that already exists.

### 5.5 Reopening — the lock tag becomes the way back

The mockup locks the problem statement, disables the edit button and toasts "Brief is
locked". There is no route back, yet `unlockSpecStage` exists and cascades correctly.

**Fill:** make `#lockTag` the affordance. Clicking it opens **Reopen Project
Definition?**, explaining that later stages reopen too and that nothing generated is
deleted — only flagged for review. The copy already exists verbatim in
`unlockSpecStage`'s toast. This is the one place the forward cascade gets explained,
so it earns a modal rather than a toast.

### 5.6 Greenfield / Brownfield — belongs on gate ②

`setArchMode` decides how artifacts are generated, and the artifacts gate warns on
"Brownfield, but no existing architecture was brought in". The mockup has no toggle.

**Fill:** a two-option control on the **Project Brief** surface, since that is what
locks immediately before artifacts generate. Putting it in the thread would date it —
it is a property of the build, not a moment in the conversation.

### 5.7 Archetypes — an input path, so it belongs on Attach

`applyArchetype` seeds a reusable pattern. It is an input, like a file.

**Fill:** the attach button opens a small menu: **Attach a file** / **Start from an
archetype**. The existing toast already makes the distinction that matters —
"it is a pattern, not a source — ask the agent to read it".

### 5.8 Intake classification — one mono line

`classify` stores `kind` and `kindReason` explicitly "so the classification is
auditable", and the mockup shows neither.

**Fill:** the first agent turn's `.meta` row carries it —
`AGENT · read as System logs — timestamped lines with severity markers`. The meta row
already exists and already holds `· first pass`. Near-free auditability.

### 5.9 Brief version and staleness — the meta row again

`reading.version` bumps on every synthesis, `stale` + `staleReason` carry specific
sentences, and `AgentTurn.briefEffect` records `{version, added}`. The mockup shows
a static `· first pass`.

**Fill:** meta row becomes `AGENT · 4 lines into the brief · v3`. Staleness posts a
system message carrying the existing `staleReason` verbatim plus a **Re-read
sources** action — the reasons are already written as sentences aimed at a person
("`auth-notes.docx` arrived after this reading."), so print them.

### 5.10 Confidence rail — nine facets, not three

Per D1. Worst-first, lowest 3–4 expanded, remainder collapsed behind
`6 more · all Medium+`, open conflicts pinned to the top. See §2 D1.

### 5.11 Sense of place — a thin progress line

With `StageStrip` gone there is no signal of position in a five-stage pipeline.

**Fill:** a 2px `workspaceProgress` bar directly under the problem bar. No labels,
no pips — it answers "how far in am I" without reintroducing the strip.

### 5.12 Status bar — keep it

The mockup drops it. `StatusBar` carries autosave, indexing counts, failures and the
delivery rollup, none of which have another home. Keep it as-is; it was already
trimmed once for precisely this reason (see its own comment).

### Summary

| Capability | Home in v2 |
|---|---|
| Source set, ingest state, retry, remove | Rail card (new, §5.1) |
| Evidence class | Chip on brief lines (§5.2) |
| Provenance + excerpt | `.cite` click → `SourceDrawer` (§5.2) |
| Promote to requirement seed | Brief-line hover action (§5.3) |
| Question track | Chip on question turns (§5.4) |
| Assumed / Deferred | Two further chips (§5.4) |
| Reopen after lock | `#lockTag` → modal (§5.5) |
| Greenfield / Brownfield | Project Brief surface (§5.6) |
| Archetypes | Attach menu (§5.7) |
| Intake kind + reason | First turn meta row (§5.8) |
| Version, staleness, brief effect | Meta row + system message (§5.9) |
| Nine-facet confidence | Rail, worst-first (§5.10) |
| Pipeline position | 2px progress line (§5.11) |
| Autosave, indexing, rollup | `StatusBar`, unchanged (§5.12) |
| Formal requirements | Project Brief surface (D4) |
| Module map, stories, Jira mapping | Existing surfaces via bars (D2) |

These land in **Phase 2** (§5.1, 5.2, 5.4, 5.8, 5.9, 5.10, 5.11), **Phase 3** (§5.5),
**Phase 4** (§5.6), and **Phase 1** (§5.3's seed count, which needs the rail).

---

## 6. Risks

**Rail overload.** Nine facets is the right model and the wrong number of bars.
Worst-first ordering with collapse is load-bearing, not polish — without it the rail
becomes wallpaper and the confidence signal is lost, which is the exact failure v2
set out to fix.

**Scope creep from §5.** Twelve gap fills is most of a phase on its own. They are
not optional — each one is a capability that exists today — but Phase 2 is now
large, and §5.1/5.2/5.4 are the three that carry the most weight. If Phase 2 has to
be cut, cut §5.7 (archetypes) and §5.8 (intake line) first; they are the cheapest to
add later and the least load-bearing.

**Evidence chips competing with confidence.** After §5.2 and §5.10, a brief line
carries an evidence chip while the rail carries a facet score derived from exactly
those chips. Two readings of the same fact at different altitudes. That is
intentional — line-level provenance, facet-level trust — but the copy has to make
the relationship obvious or it will read as duplication.

**Thread length.** The transcript grows unbounded and now carries the brief and
every question. Virtualisation or collapsing of resolved turns will be needed sooner
than the mockup's fixture data suggests.

---

## 7. Sequencing

```
Phase 0 (N1 rename)
   │
   ▼
Phase 1 (confidence)  ──▶ Phase 2 (shell)  ──▶ Phase 3 (finalize → Definition)
                                                        │
                                                        ▼
                                              Phase 4 (Project Brief)
                                                        │
                                                        ▼
                                    Phase 5 (progressive artifacts + queue)
                                                        │
                                                        ▼
                                              Phase 6 (module/story bars)

Phase 7 (agent loop) — anytime after Phase 1
```

All decisions are settled. Phase 0 is a mechanical rename; Phase 1 can start
immediately after it.
