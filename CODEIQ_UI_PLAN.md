# CodeIQ prototype — build plan

Decisions are locked from your answers. This is a UI prototype, so everything
here is about what is on screen and where you click. No test harnesses, no audit
plumbing, no writes back into the platform.

Superseded the earlier version of this file, which was written for a production
build and was mostly the wrong document.

---

## 0. Review absorbed the dashboard

Built as two surfaces first, then merged on request into one named **Review**.

The split was wrong and the merge shows why: the dashboard's only job was to list
stories and hand you one, and the review panel's only job was to receive one. Kept
apart, the list disappeared the moment you used it and getting back cost a trip
through the rail — so the rollup read as a report you visited rather than the index
it is.

Now master and detail. Tiles across the top still filter; the story list is the
left column; the criteria for whichever story is picked fill the right. Clicking a
row is the whole interaction, so the `Open` button is gone — the row is the
affordance.

Three things went out in the merge rather than moving:

- **The story `<select>`** in the review panel. It existed only because the list
  lived elsewhere. Two controls for one choice, able to disagree.
- **The project-level gap banner.** The tiles directly above state the same
  numbers. The per-story headline stays, in the detail column, where it names the
  story it is about.
- **The rework preview.** A capped copy of the Spec quality surface, and the merge
  needed the column. The rail carries its count.

The rail is four items now: Review · Spec quality — Untracked · Repo policy.

One invariant worth stating because it is easy to get wrong: the story open in the
detail column must be one the filter still shows. Narrowing the tiles otherwise
leaves the right half describing a story absent from the left half, which reads as
a broken filter. `ReviewSurface` falls back to the first visible row.

---

## 1. The tiles and the story list

```
┌───────────────────────────────────────────────────────────────────────┐
│  47 criteria    23 of 84       9 flagged      12 commits              │
│  no code        done, gaps     drift (assist) untracked               │
│  [Filter]       [Filter]       [Filter]       [Open page →]           │
└───────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────┐  ┌──────────────────────────┐
│ Stories with gaps    Filtered: 2 ×      │  │ Rework by criterion      │
│ ─────────────────────────────────────── │  │              Details →   │
│ FMB2-AUTH-031  Enrol…  D.Okafor         │  │ ──────────────────────── │
│                3 missing        [Open]  │  │ AUTH-031 · AC-2      9×  │
│ FMB2-DEV-019   Device…  P.Nair          │  │ AUTH-031 · AC-5      7×  │
│                1 drifted        [Open]  │  │ DEV-019  · AC-1      6×  │
│ ─────────────────────────────────────── │  │ PAY-004  · AC-3      5×  │
│ Showing 2 of 5 · Show all stories       │  │                 (4 max)  │
└─────────────────────────────────────────┘  └──────────────────────────┘
```

- **Four tiles.** No-code criteria · done-but-gaps · drift · untracked. Drift
  keeps the word *assist* and its 60–75% caveat on the tile, so it does not read
  as solid as the other three.
- **Clicking a tile filters the story table.** Ring on the active tile, its
  button flips to `Active filter`, the table's title and subtitle change to name
  the filter, and there are two ways out — the `×` on the chip and
  `Show all stories`.
- **Untracked tile does not filter** — it navigates to the untracked surface,
  matching the one different tile in your screenshot.
- **Two columns.** Stories left, rework right, capped at 4 rows with
  `Details →` to the spec surface. Collapses to one column under ~1100px.
- **`Open` button per row.** The story key stays clickable too, but the button
  is the affordance.
- **Owner as plain text.** No avatar.
- `Showing n of m` under the table, always.

The trust bar (`stand up` / `overstated`) stays where it is, above the table.

---

## 2. Untracked changes — one table

| ☐ | SHA | Commit | What changed | Author | Type | Policy |
|---|---|---|---|---|---|---|
| ☑ | `4f2ac91` | `fix(auth): null guard on enrolment` | Hotfix on the enrolment response · mobile-banking · 22:14 | Daniel Okafor | `behavioral` | flag ▾ |
| ☐ | `19cc7f0` | `chore(deps): bump lockfile` | Dependency bump, no behaviour change · identity-service · 08:47 | renovate[bot] | `cosmetic` | tolerate ▾ |

- Repository and policy dropdowns at the top. Repo grouping drops — the filter
  replaces it.
- **Commit and What changed are two columns**, because they are two facts: the
  developer's own subject line, and what the diff observed. Ours currently
  keeps only the second.
- **`behavioral` / `cosmetic` pill.** `ChangeClass` already exists in our types.
  When the row's repo has `semanticDiff: false` the pill reads *not classified*
  — never `cosmetic`, or the setting invents a verdict.
- **Checkboxes + `Tolerate selected (n)`**, enabled only on `cosmetic` rows.
  `auto-ticket` stays per-row.

---

## 3. Chrome

- **Provenance strip** in the rail head: `Spec AI → CodeIQ`, the connected feeds
  by name, and the newest index time. Three states read from `feeds` +
  `indexed` — live / degraded / dark — never a static badge. Absorbs today's
  full-width `cq-degraded` banner.
- **Counts on rail items** — gaps on Review, un-raised rework on Spec quality,
  untracked as now. Zero renders nothing.
- **⌘K search** over story keys, titles, criterion refs and SHAs, using the
  existing `components/ui/CommandPalette.tsx` — which is currently mounted
  nowhere in the app. Module-local for now.
- **A slim top bar comes back**, only because ⌘K needs somewhere to live: search
  field left, `Export audit` right. Nothing else — no project name, no module
  name, no tagline. That is why the old bar was removed.

`Export audit` navigates to Security → Audit. No file download.

---

## 4. Project Tasks — what lands in which tab

Today's tabs are `All · Needs Approval · In Progress · Completed`, filtering on
`Task.status`. Two statuses have no tab at all — `Pending` and `Blocked` — so a
blocked task is invisible unless you happen to pick `All`.

Proposed tabs and the logic behind each:

| Tab | Shows | CodeIQ's part |
|---|---|---|
| **All** | every task in project scope | the `n criteria not built` chip wherever it applies |
| **Needs Approval** | `status = Needs Approval` | a caveat line above `Approve & Sign-Off` naming unbuilt criteria — advisory, never a block |
| **In Progress** | `status = In Progress` | chip, informational only |
| **Blocked** | `status = Blocked` *(new tab)* | nothing — blocked is self-reported and needs no verification |
| **Completed** | `status = Completed` | **this is where the finding matters.** A task marked done whose story has criteria with no code |
| **Not built (n)** | any status, story has ≥1 missing criterion | the tab itself, worst-first |

Reasoning: the first five tabs answer *where is this task in its lifecycle*.
`Not built` answers a different question — *was it actually built* — which is why
it sits at the end, visually separated, rather than pretending to be a sixth
status.

The chip wording is the whole value: **"3 criteria with no code"**, never
"incomplete". CodeIQ observed an absence of mapped code, which is a narrower
claim.

Detail pane gains a lineage block: repo · branch · PR, the criteria breakdown,
and `Open in CodeIQ`. Every field is already on `ReviewTarget`.

`Pending` still has no tab under this proposal — it shows only under `All`. Add a
`Not started` tab if you want full coverage; I left it out to keep the row short.

**Not going in:** rework counts. They are counted per criterion and deliberately
never per person, and a rework number on a row assigned to a named human turns a
spec signal into a developer metric.

---

## 5. Project Dashboard

Your answer needs one structural change first, and it is smaller than it sounds.

The two dashboards are **not** persona branches of one screen — they are separate
nav entries that never appear together:

| Nav key | Roles | Component | Sidebar label |
|---|---|---|---|
| `Dashboard` | governance | `DashboardView` | Dashboard |
| `My Services` | PDLC personas | `ProjectDashboardView` | **Dashboard** |

Both read "Dashboard" in the sidebar via `NAV_LABELS`, which is why they look
like one screen behaving differently.

**So "common as project admin" is one line in `App.tsx`:** point
`case 'My Services'` at `DashboardView`. It already derives `persona` from the
role and falls back to `'project'` for every PDLC role, so it renders correctly
for them with no changes. `ProjectDashboardView` becomes unused.

**Then, beneath the phase strip, a CodeIQ band** — gated on
`persona === 'project'`, because `codeIqProjectFor` resolves one project or none,
so a Tenant Admin's cross-department dashboard gets no band automatically.

The band, kept small:

```
CodeIQ · intent-to-code                                   Open CodeIQ →
───────────────────────────────────────────────────────────────────────
  5            2              12            FMB2-AUTH-031  3 criteria
  criteria     stories        untracked     FMB2-PAY-004   2 criteria
  no code      overstated     commits
```

Three numbers and the named stories behind them. Everything else — the trust
bar, rework, instrumentation percentages — stays inside the module. Renders `—`
rather than `0` when the project has no lineage indexed, since no data and no
problems look identical at zero.

Two notes, both your call:

- This reverses the argument in `ProjectDashboardView`'s header comment, which
  explicitly says workers should not get PM-style rollups. You have now asked for
  it twice, so I am doing it — flagging it once and not again.
- The `Waiting` list goes away with that view, and it is the only block on either
  dashboard you can act on directly. I would port it into `DashboardView` beneath
  the CodeIQ band. Say if you would rather let it go.

---

## 6. Fixture additions

- `UntrackedChange` gains `message` (raw subject) and `change: ChangeClass`.
- Two bot-authored `cosmetic` rows added, so bulk tolerate has something real to
  act on.
- One `unbuiltStories(targets)` helper in `data/codeiq.ts`, used by the CodeIQ
  dashboard, the tasks chip and the dashboard band. Three call sites must not
  each define "claimed done with missing criteria" separately.
- `ProjectDashboardView.tsx:58` reads
  `project.id === 'p-mobile-v2' ? DELIVERY_STORIES : []`. Irrelevant once that
  view is unused — noting it so it is not mistaken for a live bug later.

---

## 7. Build order

1. ~~CodeIQ dashboard — tiles, filtering, two columns *(§1)*~~ **done**
2. ~~Untracked table *(§2)*~~ **done**
3. ~~Project Dashboard — reroute + CodeIQ band *(§5)*~~ **done**
4. ~~Project Tasks — tabs + chip + lineage block *(§4)*~~ **done**
5. ~~Chrome — provenance strip, rail counts, slim bar, ⌘K *(§3)*~~ **done**

All five built. Decisions taken while building, none of them reversals:

- **`Waiting` and the PM band were ported, not dropped.** Retiring
  `ProjectDashboardView` would have taken the only directly actionable block on
  either dashboard with it. Both now live in `dashboard/ProjectSignals.tsx`, in
  the platform's own styling — so the third visual language is gone rather than
  relocated, and 420 lines of orphaned `dsh-*` CSS came out of `specai-v2.css`.
- **`Waiting` sorts Blocked → Not built → Approval → Decision.** The list renders
  eight rows; in source order the unbuilt rows landed last and were sliced off
  every time — counted but never visible. Unbuilt outranks approvals precisely
  because nobody has noticed it yet.
- **The `Not built` tab hides itself** when the project has no lineage indexed. A
  tab reading `Not built (0)` would claim everything was checked and clean.
- **⌘K is bound inside the workspace, not app-wide.** `CommandPalette` had never
  been mounted anywhere; owning the shortcut in one module is honest about that.
  Promoting it to the shell has to decide what every other view contributes.
- **The sign-off caveat counts `missing` only.** Drift is a 60–75% assist and has
  no business beside an approval control. Verified against `FMB2-DEV-018`, which
  is drift-only and correctly contributes nothing.

Notes from what is built:

- The untracked fixture grew to 8 commits across 3 repositories. The third,
  `notification-service`, runs `joinKey: 'none'` and `semanticDiff: false` so the
  *not classified* state and the bulk-tolerate gate are both reachable on screen
  rather than only in the types.
- `UntrackedChange.change` is optional, not defaulted. A repository with the diff
  off records no classification, and `changeClassOf` also suppresses a stored one
  if the setting is turned off after indexing — so a stale verdict cannot survive
  a settings change.
- Bulk tolerate acts on selected ∩ visible ∩ cosmetic, never the raw selection.
  Ticking boxes and then narrowing the filter leaves the button reading `(0)`.

Chrome last: it touches every surface, so it is cheapest once the surfaces have
stopped moving.

---

## 8. Decided for you

You skipped four. My calls, all reversible:

- **Bulk tolerate:** yes, `cosmetic` rows only. Tolerating four `renovate[bot]`
  lockfile bumps one at a time is ceremony rather than judgement.
- **Pill and commit column:** both. They are what makes the table worth reading.
- **Rail counts:** yes. Consistent with the untracked count already there.
- **Top bar:** comes back, slim, search plus `Export audit` only — the direct
  consequence of building ⌘K, since a search field has nowhere else to live.

Dropped from the previous plan as production concerns: assertion scripts and
computed-style probes, audit-entry design, auto-ticket minting real tasks, the
`criticalReason` refactor, app-wide palette mounting.
