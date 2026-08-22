# CodeIQ — bringing the module up to the platform

CodeIQ already exists here: [src/components/codeiq/](src/components/codeiq/),
[src/types/codeiq.ts](src/types/codeiq.ts), [src/data/codeiq.ts](src/data/codeiq.ts).
What it does not yet do is respect tenancy, or take its criteria from Spec AI.

This records the decisions and the order of work. Source of the surfaces being
folded in: the `code-iq-v1` prototype (`rathipallavi-droid/code-iq-v1` @ `6708c18`).

---

## 1. Decisions

### D1 — A Spec AI acceptance criterion carries a stable id · **settled, done**

`AcceptanceCriterion` was `{ given, when, then }` — three strings and no identity.
CodeIQ has to attach mapped files, a drift verdict, test evidence and a named
dismissal to *each* criterion, and IntelliQA has to file test cases against it.
Neither is possible against an anonymous object.

**Decision:** the criterion owns its label. `id: string`, of the form `AC-1`,
minted once and never reused or renumbered.

The rejected alternative was deriving the label positionally at render time. It
needs no schema change and is wrong the first time someone inserts a criterion
above another: every mapping, verdict and dismissal below the insert point
silently re-points to a different criterion, and nothing in the UI reveals it.

Consequence worth knowing: after an insert the labels no longer run in order —
`AC-1, AC-4, AC-2` is a valid set. That is the same trade every issue tracker
makes, and it is the trade that keeps an audit trail true.

Shipped:

- `AcceptanceCriterion.id` in [src/types/specai.ts](src/types/specai.ts)
- `nextCriterionId`, `withCriterionIds`, `criterionRef` in [src/data/specai.ts](src/data/specai.ts)
- 38 fixture criteria labelled across [src/data/deliveryData.ts](src/data/deliveryData.ts)
  and [src/data/specAiData.ts](src/data/specAiData.ts)
- Story criteria render their label; requirement criteria do not, because a
  requirement's `AC-1` and a story's `AC-1` are different things and putting both
  on adjacent screens invites the wrong join

`nextCriterionId` reads the highest number used rather than counting the array,
so deleting `AC-2` does not hand `AC-2` to the next criterion created.

### D2 — The ticket *is* the story, after export · **settled, done**

Today these do not join at all. `ReviewTarget.ticket` is `FMB2-418`; Spec AI's
stories are keyed `FMB2-AUTH-031`. CodeIQ's criteria are typed by hand in
`data/codeiq.ts` and have no relationship to any story. There is no foreign key
between the two modules anywhere in the tree.

**Decision:** a tracker ticket is a story's identity after export, not a separate
record. `UserStory.exported` and `deliveryStatus` already model that transition.

- `ReviewTarget.ticket` becomes `storyKey` — display, and the tracker id
- `ReviewTarget.storyId` is added — the immutable join to `UserStory.id`
- `Criterion` keeps its own `id`, which is now the Spec AI criterion's id
- A criterion is addressed across modules as `criterionRef(storyKey, id)`

Rejected: keeping tickets and stories as separate entities with a link table. It
adds a third thing to keep in sync and gives a gap two places to hide.

Applied in phase 2, with the data. `ReviewTarget.claimed` is now
`StoryDeliveryStatus` minus `'Draft'`, read from the story rather than typed.

### D3 — Mock-first, contract-shaped · **settled**

`code-iq-v1` ships a FastAPI service with PostgreSQL, Redis and an MCP server.
This repo has no backend at all; every module — Spec AI, Observability,
Connectors — is a front end over `src/data/*.ts`.

**Decision:** keep `data/codeiq.ts` as the seam. Take the prototype's four
endpoint *shapes* as typed functions, not its runtime.

| v1 endpoint | Becomes |
|---|---|
| `GET /dashboard/gap-report` | `gapReport(projectId): GapReport` |
| `POST /drift/dismiss` | `dismissDrift(ref, reason, actor)` |
| `POST /lineage/backward-query` | `intentForCodeLocation(repo, path, line)` |
| `POST /specai/emit-signals` | `emitThrashSignals(refs)` |

Rejected for now: porting the service. It would make CodeIQ the only module that
cannot run offline, and the rest of the platform still has nothing to talk to.

If that reverses, three things in the prototype are blockers, not details:
`allow_origins=["*"]`, a committed `SECRET_KEY`, and a `get_current_user` that
returns a hardcoded real-looking identity for any token starting `jwt-mock`.
Its schema also has no `tenant_id`, `department_id` or `project_id` on any
table — it keys on free-text `team` and `sprint`.

---

## 2. What is not being taken from the prototype

| Prototype surface | Why not |
|---|---|
| Its `UserRole` union | `'EM / eng leader'`, `'Tech lead / reviewer'`, `'Tester (IntelliQA)'`, `'Compliance / audit'` — none exist in `Role`. Map onto Tech Lead, Developer, QA Manager and the governance tiers; never add. |
| Its Sidebar, Header, role switcher | Modules render inside the platform shell. `FOCUS_MODULE_BY_ROLE` already does the role-changes-your-landing-screen behaviour. |
| Its Tailwind utilities | `index.css` remaps slate and indigo through `@theme`, so a utility class inherits the platform palette instead of CodeIQ's. That is why `codeiq.css` is scoped under `.cq` with bespoke names. |
| `FastMCPConsoleView` | Observability and the Agent Registry already own this. A per-module tool console duplicates both and splits the audit trail. |
| `TraceabilityGraphView` | Deliberately excluded — see the header comment in `types/codeiq.ts`. Reversing that is a product decision, not a port. |

Worth taking: `structured_criteria_%` and `commits_with_join_key_%` from the gap
report. Both are honest measures of whether the module can be trusted at all,
and neither exists here.

---

## 3. Order of work

**Phase 0 — one declared identity · done**

Five names for the module were in the tree and four were legitimate: `ModuleKey`
`'codeiq'` is the typed key, `apiKey` `'code_iq'` mirrors the PromptOps and
Observability server contract, `name` and `productName` are two display
registers. The fifth, `'Code IQ'`, matched none of them — so the
`DELIVERY_MODULES` entry it keyed produced an empty rollup that rendered
identically to a module with no work.

- `ModuleDef` gains `productName`, `apiKey` and `aliases`
  ([src/types/index.ts](src/types/index.ts))
- `moduleKeyFor`, `isModule`, `moduleProductName` in [src/data/modules.ts](src/data/modules.ts) —
  the only place module names are compared
- `DELIVERY_MODULES` and Observability's `MODULE_LABELS` now derive from
  `MODULE_DEFS`; `INSTRUMENTED_MODULES` became `INSTRUMENTED_MODULE_KEYS`
- Substring matching on `phaseMatch` replaced at both call sites
  (`AwaitingReview`, `ProjectPhaseStrip`)

`moduleKeyFor` returns `null` on a miss rather than defaulting, which surfaced a
pre-existing gap: **`'Architect Hub'` is on the login screen and in the agent
catalogue as `architect_hub`, but it is not a `ModuleKey`.** Tasks tagged with it
have no pipeline phase, no metrics and no rollup — they are invisible to every
module surface. Left as found; adding a sixth module is a product decision.

**Phase 1 — CodeIQ state per project · done**

The module's data was three module-level arrays held in `useState` inside the
view, so every project was shown Mobile Banking V2's tickets under its own name,
and an adjudication recorded against one project mutated what every other
project saw.

- `CodeIqState` in [src/types/codeiq.ts](src/types/codeiq.ts) — targets, rollups,
  thrash, untracked, plus `indexed`
- `useCodeIqSlice` in [src/context/useCodeIq.ts](src/context/useCodeIq.ts),
  mirroring `useSpecAiSlice`: `codeIqFor(projectId)` and a `patch()` that creates
  a missing row lazily. `adjudicate` and `sendThrashUpstream` moved out of the
  view and now take a `projectId`.
- `INITIAL_CODE_IQ` seeds only `p-mobile-v2`, which is where every FMB2 ticket
  in the fixtures already belonged. The other four projects render a blank state.
- `DashboardPanel` takes `rollups` and `untracked` as props; it used to import
  the fixtures directly, which is why one project's rollup rendered under every
  project's name.
- `claimedDone`, `trustSplit` and `ticketsWithGaps` lost their
  `= TICKET_ROLLUPS` default parameters. Defaulting to the fixture is what let
  one project's numbers appear under another.
- `codeIqProjectFor(scope, projects)` names the fallback chain — project in
  scope, else first in the department, else first overall. Lineage is only
  meaningful against one repository set, so there is no department-wide or
  platform-wide CodeIQ view.

`indexed` carries the distinction that matters: a project with no lineage has not
been checked, and a project that was indexed and has nothing open has been.
Rendering a clean dashboard for the first would claim the code was checked and
cleared, which is the one thing CodeIQ must not imply.

This also removed a workaround. `pmMetrics` carried
`CODEIQ_PROJECTS = ['p-mobile-v2']` — a hardcoded allowlist, which was the right
instinct against the wrong data model: the rows were platform-wide, so naming
the one project they belonged to was the only way to stop them leaking. It now
reads `codeIq.indexed`.

**Phase 2 — the Spec AI handoff · done**

CodeIQ held 320 lines of hand-authored Given/When/Then that no PM had ever seen.
The module was adjudicating code against text nobody upstream owned.

- [src/data/codeIqIntake.ts](src/data/codeIqIntake.ts) is the only place the two
  modules touch. One-way: CodeIQ reads stories and never writes them.
- `Criterion` split into `CriterionAnalysis` (CodeIQ's verdict) and `Adjudication`
  (a human's override). The criterion text is no longer stored here at all.
- `CodeIqState` persists **only** adjudications, thrash and untracked. Targets and
  rollups are composed from Spec AI on every read, so a story reworded upstream
  appears with no sync step and there is no copy left to go stale.
- `ANALYSIS` is keyed by `criterionRef(storyKey, criterionId)`; `CHANGE_SETS`
  keyed by story key, and its presence is what makes a story a review target.
- `TicketRollup` counts are derived by `buildRollups`, not typed beside the
  criteria they count.
- Drafts are excluded. A draft has never been exported, so nothing was built
  against it and counting its criteria as gaps would inflate the one number the
  module leads with.
- A criterion with no analysis reads as missing at zero confidence rather than
  being dropped — a gap report whose denominator moves would improve every time
  the analysis failed to run.

*Verified:* all 15 criteria trace to a story text-identically, no orphan analysis
keys, rollups cannot disagree with criteria, and a criterion reworded upstream
flows through while keeping its analysis.

**Phase 3 — instrument delivery · done**

`codeIqPhaseFromTargets` in [src/data/completion.ts](src/data/completion.ts),
wired beside Spec AI's in the provider.

Deliberately a different shape from Spec AI's. Spec AI *owns* stories, so its
numerator is stories finished; CodeIQ owns nothing, so its numerator is criteria
realized out of criteria it could see. A dismissed criterion counts as resolved —
otherwise the number could never reach its denominator no matter what anyone did.

The phase reads `Blocked` while any story the tracker calls Done still has
unrealized criteria. That contradiction is the module's whole point, so it is
surfaced rather than averaged away. Mobile Banking V2 currently reads
**5/15, Blocked**.

The pipeline unit changed from `PRs` to `criteria`: a merged PR that realized
nothing is exactly what this module exists to catch.

**Phase 4 — gate on connectors · done**

`codeIqFeeds` reads the existing connector ladder through `isActivated`, so the
gate respects tenant availability and department enablement rather than just
checking for a row.

Three empty states, because there are three different reasons and each asks for
something different: **no source feed** → connect a repository; **not indexed** →
wait for the first scan; **nothing open** → there is genuinely nothing to
adjudicate. Collapsing them would let a clean dashboard imply the code was checked
and cleared when nothing was ever read.

The IDE agent feed degrades rather than blocks — mapping still works without it,
lineage and rework do not, and the strip says so.

Also folded in the two instrumentation measures the prototype had and this module
lacked: share of stories that arrived as Given/When/Then, and share that could be
joined to a change set. Both are statements about the pipeline rather than the
code, so they sit above the report they qualify. Currently **100% structured, 63%
joined**.

**Phase 5 — spec quality and untracked change · done**

Two surfaces promoted out of the dashboard, and the tab strip went from two to
five.

The thrash signal now **writes into Spec AI** rather than firing a toast.
`raiseSpecQuestion` is the only write Spec AI accepts from outside itself, and it
is deliberately the weakest one available: an open question owned by the spec's
owner. CodeIQ has evidence that a criterion was written badly; it does not have
authority to rewrite it. Duplicate text is ignored — a signal emitted twice is the
same signal.

Untracked change is grouped by repository, because how much of it is acceptable is
a property of the repo. The prototype's bulk-select column is left out: the whole
judgement is *does this change need a story*, and a bulk action offers to skip
exactly the part that cannot be skipped.

**Phase 6 — repo policy · done, and not where the plan said**

The plan said this belonged in project settings. **That premise was wrong.**
`ProjectsView` is visible to Tenant and Department Admins only and has no
per-project drawer — there is no settings screen a Tech Lead or Developer can
reach. So it is a fifth surface in the workspace, `canManageRepoPolicy`-gated:
governance roles plus Tech Lead may edit, everyone else reads.

Read-only rather than hidden, on purpose — the convention governing your own
repository is the thing you most need to see and least need to change.

`joinKey` is the setting everything else depends on, so `none` is coloured as a
risk and its helper says plainly that no criterion can be mapped. Same for
semantic diff off: the copy states the consequence (a formatting commit reads as
delivery) rather than naming the feature.

---

## 4. Restyle and cleanup

Done after phases 0–6, on the recommendations below.

**The two stylesheets already agreed.** `codeiq.css` and `specai-v2.css` declared
**20 identical token values** — same greys, lines, radius, fonts. The whole
semantic palette matched byte for byte; only `--accent` differed. So the restyle
was one value and one structure, not a repaint.

- **R1 · shared tokens.** [src/components/workspace.css](src/components/workspace.css)
  holds them once, scoped `:where(.sx, .cq)` so specificity stays at zero and
  either module can still override from its own sheet. Each keeps its own
  semantic *names* pointing at shared values — a CodeIQ gap is not a Spec AI low
  confidence, even at the same hex.
- **R2 · accent.** CodeIQ adopts the indigo. The green was saying "this is not
  Spec AI", which the module name on screen already said. The four status colours
  are untouched: they are the only colour in the module that means anything.
- **R3 · `TicketRollup` deleted.** Every field was derived. `trustSplit`,
  `claimedDone`, `storiesWithGaps` and `isGenuinelyDone` now read `ReviewTarget`
  directly, and the dashboard takes `targets`. `ReviewTarget` gained `owner` —
  the one field the rollup had that the target lacked, and distinct from
  `author`, which is who committed.
- **The rail.** [SurfaceRail.tsx](src/components/codeiq/SurfaceRail.tsx) replaces
  the tab strip. Five items across the top read as five peers and they are not:
  Review, Dashboard and Spec quality are three readings of one lineage; Untracked
  and Repo policy are the change it could not explain and the configuration
  deciding what it can. Two groups, and it folds to icons.
- **The top bar is gone.** It held the module name, a tagline, the project name
  and the tabs — a row of height whose first two repeated what the rail
  highlights and whose third repeated what the platform header prints two rows
  above. The project moved to the foot of the rail as reference.

Fields cut:

| Field | Why |
|---|---|
| `ThrashRow.text` | A stored copy of criterion text, and the seeded values were *paraphrases* — so a row could disagree with the criterion it named. Now resolved by `resolveThrash` through `criterionRef`; an unresolvable row says so rather than vanishing. |
| `CodeIqState.indexed` | Derived by `isIndexed()` from the repos. `indexed: true` with no timestamp was constructible and drove the empty-state branch. |
| `CodeIqState.lastIndexedAt` | Third timestamp for one fact. `indexedAt()` names each repo instead — two repos scanned eleven minutes apart give a project no single honest time. |
| `RepoPolicy.activeContributors` | Nothing read it. A number on a settings card that changed no decision. |
| `ModuleDef.phaseMatch` | Phase 0 leftover: every value was already a `name`, `productName` or alias, so it was a fifth spelling resolving to the same key. |
| `ClaimedStatus` | Now `Exclude<StoryDeliveryStatus, 'Draft'>`, so a status added upstream cannot fall outside it. |
| `codeIqStateFor`, `hasCodeIqLineage` | Exported, zero consumers. |
| `pmMetrics(…, projectId, …)` | Dead parameter. |

Kept despite looking redundant: `Criterion.tests.refs` (the panel prints the test
names, which is how a reader checks the claim rather than trusting the badge) and
`ChangeSet.author` (who committed and who owns the story are different people, and
the difference is occasionally the finding — the fixture now shows one).

### Two bugs the restyle introduced, and how they were found

Both were reported by eye before any assertion caught them, which is the part
worth recording.

**CodeIQ never imported `workspace.css`.** One replacement in the extraction
silently matched nothing — it was the only edit in that batch written without an
assertion — so `codeiq.css` referenced shared tokens it never loaded. Every
`var(--line-glass)`, `var(--font-body)` and `var(--elev-1)` resolved to nothing:
no fonts, no borders, no surfaces. Opening CodeIQ *without first visiting Spec AI
v2* rendered a bare serif page.

The token probe had passed 38/38 and proved nothing. It imported **both**
stylesheets, so Spec AI's `@import` pulled the shared file in and CodeIQ's tokens
resolved on its neighbour's back. A shared-token check is only worth running
against each module **in isolation** — there are now two solo probes, 19/19 for
`.cq` and 8/8 for `.sx`, each importing exactly one stylesheet. Both `@import`
statements are hoisted to line 1.

**The rail splice deleted three rules.** Replacing the old top-bar block with the
rail took `.cq-blank`, `.cq-degraded` and `.cq-instr` with it — they had been
added inside that region in phases 4 and 5. Found by an audit that diffs the class
names the TSX uses against the ones the stylesheet defines; it now reports zero
orphans for both modules and is worth re-running after any CSS splice.

### Depth

The surfaces *were* bordered and still looked flat: `--line` on `--bg` is about
two percent of contrast, and the module had one box-shadow against Spec AI's
eighteen. So the border was never the whole of what separates a card from its
ground — elevation is.

`workspace.css` gained a depth layer tracking `index.css`'s acrylic scale, so a
workspace surface and the platform header above it belong to one material system:
`--elev-1`, `--elev-2`, `--inset-hi`, `--glass`, `--glass-strong`, `--glass-blur`,
`--line-glass`. CodeIQ's cards, rail, blank states and buttons now use them, and
the `.cq` root paints a soft three-point mesh — blur over a flat fill is a no-op,
which is why the material read as plain white cards on grey.

*Verified:* 33 assertions over the cuts and the phase 0–6 invariants; two solo
computed-style probes; a class-orphan audit on both modules; and Spec AI's own
seven tokens confirmed byte-identical after the extraction.

---

## 5. Found along the way

**`@types/react` is not installed.** There is no `@types/react` or
`@types/react-dom` in `package.json`, so `React.FC<Props>` resolves to `any` and
**every component's props are unchecked**. `npm run lint` (`tsc --noEmit`)
validates `src/data`, `src/context` and `src/types` and silently validates nothing
in the component layer.

This was found the hard way: renaming `ReviewTarget.ticket` to `storyKey` produced
a clean typecheck while four call sites in `ReviewPanel` still read `.ticket`. A
probe confirmed it — `target.absolutelyNotAProperty` compiles, while a
string-to-number assignment in the same file does not.

Not fixed here. Adding the types is a dependency change that will surface a large
number of pre-existing errors across 130 files, and that is a decision rather than
a side effect of this work. Until it is made, treat a green `lint` as covering the
data layer only, and grep call sites by hand after any rename that crosses into
components.

**`'Architect Hub'` is not a `ModuleKey`.** See phase 0 — it is on the login
screen and in the agent catalogue as `architect_hub`, but tasks tagged with it are
invisible to every module rollup.

---

## 6. Rules to keep

- **The headline is criteria with no code, never a completion score.**
  `gapHeadline()` enforces it. A new dashboard tile must not undo it.
- **Confidence stays visible.** Gap detection is ~90% accurate, drift detection
  60–75%. `Criterion.confidence` and `ACCURACY_NOTE` exist for that reason; the
  prototype has no equivalent and states drift as fact.
- **Dismissals are records, not deletes.** Every override writes a `Dismissal`
  with actor, timestamp and reason, and calls `addAuditLog`.
- **`module` means two things.** `UserStory.moduleName` is a product module
  (`'Authentication'`); `ModuleKey` is a platform capability (`'codeiq'`).
  Grouping by the wrong one produces a plausible, wrong rollup.
