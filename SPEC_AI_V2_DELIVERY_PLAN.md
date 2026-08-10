# Plan — one Delivery tab, and a Stories screen that isn't cluttered

Two requests, one job. Simplifying Stories on its own would be reworked a day
later when it merges with Modules, so this plan does both in one pass.

---

## 1. Why they merge

They are the same tree at two zoom levels:

```
Module ─── Feature ─── Capability          ← Modules & Features tab
Module ─── Feature ─── Story               ← User Stories tab (moduleName + featureName)
```

`UserStory` already carries `moduleName` and `featureName`, and
`featureCompletions()` in `completion.ts` already joins them on exactly that
pair. Two tabs currently render two views of one hierarchy, which is why the
Stories screen needs a **Module filter** at all — it is re-deriving, with chips,
the tree that the other tab already draws.

Merged, stories become the leaves under the feature that produces them. The
module filter disappears because the tree *is* the filter.

---

## 2. What's actually cluttering Stories

Counted from the code, not impression:

| Region | Contents |
|---|---|
| Left rail (14rem, sticky) | **5 filter groups**: Track segmented control, Story type (up to 7 chips), Priority (3), Module (N), Delivery status |
| Left rail, below | **Jira mapping**: epic, release, sprint fields plus **7 issue-type selects** |
| Main column | Stories grouped by track, each card carrying ~12 fields — key, title, type chip, priority chip, delivery chip, points, module · feature, linked requirements, linked artifacts, source evidence, stale flag, owner |
| Bottom | Jira export section |

Three specific problems:

1. **Five filter dimensions for a list of ~14 stories.** More filter than data.
2. **Jira field mapping is permanently on screen.** It is configured once and
   never touched again — setup masquerading as daily work.
3. **Every card shows everything.** Twelve fields at equal weight means no
   field reads first.

---

## 3. Target shape

One tab, **Delivery**, master–detail:

```
┌─ Delivery ──────────────────────────────────────────────────────────┐
│ [Non-tech 6 · Technical 8]        14 stories · 9 draft   [Export ⚙] │
├──────────────────────┬──────────────────────────────────────────────┤
│ ▾ Authentication  8  │  AUTH-031  Enrol a device for biometric      │
│   ▾ Enrolment     5  │  ● P0 · 5pts · Sarah J · Draft               │
│     · 5 stories      │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│   ▹ Challenge     3  │  AUTH-032  Fall back to PIN when biometric…  │
│ ▾ Device Registry 4  │  ● P1 · 3pts · unassigned · Draft            │
│   ▹ Binding       4  │                                              │
│ ▹ Customer Profile 2 │  [+ Generate stories for Enrolment]          │
└──────────────────────┴──────────────────────────────────────────────┘
```

- **Left**: the module tree, with a story count per node. Selecting a node
  filters the right. Capabilities stay as a third level; editing (add, remove,
  merge, split, re-parent) moves into a per-node menu rather than a toolbar.
- **Right**: stories for the selection, one line each.
- **Header**: track toggle, totals, and Export.

### Filters: five groups down to two

| Filter | Fate |
|---|---|
| Module | **Removed** — the tree is the filter |
| Story type | **Removed as a filter**, kept as a coloured dot with the type on hover. Seven chips to filter fourteen stories is not a filter, it is a legend |
| Priority | Becomes a **sort**, not a filter. You want P0 first, not P1 hidden |
| Track | **Kept**, as the header toggle |
| Delivery status | **Kept**, as a single compact select |

### Story line: twelve fields down to five

Visible: `key · title · priority · points · owner · status`.

Expanded on click: acceptance criteria, linked requirements, linked artifacts,
source evidence, stale reason. All of it stays reachable — the traceability is
the point — it just stops competing with the title.

### Jira mapping moves behind Export

The gear beside Export opens the mapping in a modal: epic, release, sprint, and
the issue-type table. Same guards as today — unmapped story types still block
the export, and the modal is where you go to fix it. Nothing is lost; it stops
occupying a third of the rail permanently.

---

## 4. Decision needed first

**D1 — Do we change the shared components, or build a v2-native surface?**

`Stage4Modules` and `Stage5Stories` are the *original* Spec AI's stage
components. v2 reuses them wholesale, which is why they still look like the old
app inside it. Three options:

- **(a) New `DeliveryPanel` in `specaiv2/`, old stages untouched.** v2 gets the
  merged surface in its own design language; original Spec AI keeps its two
  stages. Costs a rebuild of the tree and list, roughly 400 lines, but reuses
  every mutation and derivation unchanged. **Recommended** — it also closes the
  visible seam where the old Poppins/Tailwind styling shows through v2.
- **(b) Rewrite the shared components in place.** Less code overall, but changes
  the original Spec AI's Stage 4 and Stage 5 at the same time, and those still
  render inside a stage strip that assumes two separate stages.
- **(c) Merge in v2 only by composing the existing two components in one tab.**
  Cheapest, and does not fix the clutter — you would have both rails side by
  side, which is worse than today.

Everything below assumes **(a)**.

---

## 5. Phases

| # | Work | Size |
|---|---|---|
| 1 | `deliveryTree()` in `completion.ts` — module → feature → stories with counts, reusing `featureCompletions` | S |
| 2 | `DeliveryPanel.tsx` — tree left, story list right, header with track toggle and totals | M |
| 3 | Story line + expansion; five fields visible, the rest on click | S |
| 4 | Per-node menu for add / remove / merge / split / re-parent, wired to the existing mutations | M |
| 5 | `JiraMappingModal` behind the Export gear, keeping both export guards | S |
| 6 | Replace the two v2 tabs with one **Delivery** tab; single gate on critical artifacts | S |
| 7 | Generate-in-place: *Generate stories for Enrolment* on an empty feature, rather than a stage-wide lock | M |

**Phases 1–3 deliver the de-cluttering on their own** — if you want the Stories
simplification sooner, stop after 3 and the tab merge follows later without
rework.

---

## 6. Risks

**The old Spec AI keeps its two stages.** Under (a) the two surfaces diverge:
v2 has Delivery, the original has Stage 4 and Stage 5. That is fine while v2 is
the surface under development, and becomes technical debt if both live
indefinitely. Worth deciding when the original gets retired.

**Phase 7 changes the gate model.** Today stories exist because `modules` was
locked. Generating per feature means stories can exist while the module map is
still being edited, so `stale` propagation needs to cover feature renames — a
story pointing at a `featureName` that no longer exists currently just
disappears from its group. Worth fixing regardless; it is a live bug in the
join.

**Capabilities have no stories.** The third tree level holds capabilities, which
produce nothing on the right. Either they render as leaves with no list, or the
tree stops at feature and capabilities move into the feature's expansion. I lean
toward the latter — three levels of tree plus a list is a lot of hierarchy.
