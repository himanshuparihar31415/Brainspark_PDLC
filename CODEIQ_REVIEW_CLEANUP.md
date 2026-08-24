# CodeIQ Review — declutter and rewrite

The Review page currently renders **2,486 characters** of text. Most of it is
correct and a lot of it is not about the code — the page keeps explaining its own
accuracy, its own provenance and its own limits, in the same visual weight as the
findings. This plan cuts that, replaces the jargon, and rewrites the fixture so
the screen reads at a glance.

Plan only. Nothing below is built yet.

---

## 1. What is confusing, specifically

### A. The page talks about itself, above and around the findings

| On screen now | Problem |
|---|---|
| `100% of stories arrived as Given/When/Then · 63% could be joined to a change set · 3 exported stories have no code CodeIQ can see` | Three pipeline facts sitting above the report in the same weight as it. And the last two are the **same fact twice** — 63% joined *is* 3 unjoined. |
| `Gap mapping · 85–95% accurate` on every criterion row | Printed on every row and **identical for 3 of the 4 statuses**, so it carries no information per row. |
| `Assist only — 60–75% accurate` on the drift tile | Reads as a defect in the product rather than a property of one signal. |
| `static evidence only · no execution` beside the filters | Jargon, and nobody asked. |
| `What this is. CodeIQ adjudicates whether the intent that entered the system was realized in code. It does not generate code, run tests, gate the merge, or claim the behaviour is correct.` | Four negations in a closing disclaimer. |
| `FMB2-AUTH-031 from Spec AI` **and** `Structured criteria from Spec AI · Given/When/Then · 3 criteria` | Provenance stated twice, six lines apart. |
| `CodeIQ does not change it — it only says what is true` under `Tracker says Done` | Editorialising. |

**Cut all seven.** The one caveat worth keeping is that drift is less reliable
than a missing-code finding — that goes *inside* the drift row's explanation,
where somebody is actually looking at a drift, not on a tile and not on every row.

Net effect: roughly 700 characters of chrome-about-chrome leaves the page.

### B. Vocabulary

The page speaks in the module's internal words. Proposed replacements, used
everywhere including the rail, the tiles and the task chips:

| Now | Plain |
|---|---|
| Adjudicate / adjudication | **Review** |
| Covered | **Built** |
| Missing | **No code** |
| Drifted | **Built differently** |
| Partial | **Partly built** |
| Stands up | **Fully built** |
| Overstated | **Not fully built** |
| In flight | **In progress** |
| Dispute mapping | **Wrong match** |
| Send back to SpecAI | **Ask the author** |
| Rework / thrash | **Rewrites** |
| Instrumentation | *(removed entirely)* |

`No code` is already the phrase on the Project Tasks chip and the dashboard band,
so this makes three surfaces agree on one word for the module's main finding.

### C. Two real copy defects

1. **A garbled sentence.** `GAP_FILTER_COPY.overstated.subtitle` reads *"The
   tracker says done. Something is missing, drifted or only partly realized —
   whichever the tracker says."* The trailing clause repeats the opening and does
   not parse.
2. **Confidence shown on a no-code finding.** A criterion with nothing mapped
   prints `90% confidence`. Confident of *what* — that the absence is real? It is
   meaningless on this status and it undercuts the one number the page most wants
   believed. Show confidence only where something *was* matched.

### D. Layout

1. **The criterion is one wrapped paragraph.** `Given the device has no biometric
   enrolled at the operating-system level When the app starts Then PIN entry is
   shown…` — bold labels inline, three clauses running together across two lines.
   → Three lines, labels in a narrow left gutter, so the eye can find *Then*
   without reading the whole thing.
2. **The evidence line has no separators.** `no files mapped no unit test 90%
   confidence` renders as one grey run. → Label each fact, drop the ones that do
   not apply.
3. **Zero-count filters render.** `Drifted 0` is a button that does nothing.
   → Hide statuses with no rows.
4. **The trust bar duplicates a tile.** `0 stand up / 3 overstated` with a solid
   red bar says exactly what the `Marked done, gaps open — 3 of 3` tile says, one
   column to the left. → Drop the bar and the two numbers; keep the tile.
5. **A tile number reads wrong.** Big `3`, unit `of 3 done`. → put `3 of 3` in
   the number slot and `marked done` in the unit.
6. **The rail count is unlabelled.** `Review 6` — six of what, without hovering.
   → `6 gaps`.

---

## 2. The fixture

You said the data does not have to come from Spec AI and can be hardcoded. Taking
that, with one caveat I want to state rather than quietly work around.

### The caveat

Three other screens read these same numbers today: the Command Centre door
(*"5/15 realized in code"*), the dashboard CodeIQ band (*"2 criteria with no
code"*), and the Project Tasks chips. They agree right now because all of them
derive from one place.

So: **hardcode the text freely, but keep the story keys.** Rewrite every
criterion, add stories, change every status — all fine. What I would avoid is
giving CodeIQ its own private story list, because then the Command Centre says
one number and Review shows another in the same demo, and that is more damaging
on screen than thin data. If a story needs adding, it gets added to the Spec AI
fixture too, and everything moves together. Same cost to me, no contradiction.

### What I would change

**The demo never shows a good outcome.** Trust reads `0 stand up / 3 overstated` —
every single story marked done is broken. A reviewer clicking through sees no
example of the clean state, which makes the module look like it only ever reports
failure. Proposed spread across 6 stories:

| Story | State | Why it is in the set |
|---|---|---|
| 1 | Fully built, clean | so the good state exists on screen |
| 2 | One criterion with no code | the headline finding, simplest case |
| 3 | Two with no code, marked Done | the overstated case — the point of the module |
| 4 | Built differently | the drift case, with a real before/after |
| 5 | Partly built | the ambiguous case |
| 6 | In progress, mixed | not everything is a verdict yet |

**Criterion text is too long.** Current criteria run to ~200 characters each and
wrap to three lines. Target **~90**, one clear behaviour each. Same Given/When/Then
shape, less of it.

**Names and paths should look real and stay short** — `LoginScreen.tsx`,
`biometricAuth.ts`, `session.ts` — because file paths are read as evidence and a
long path is skipped.

---

## 3. What the page becomes

```
┌ Spec AI → CodeIQ ·  live ─┐  Search stories, criteria, commits   ⌘K   Export audit
│ indexed 4 mins ago        │
│                           │  ┌──────────┬──────────┬──────────┬──────────┐
│ ▸ Review          6 gaps  │  │ 6        │ 3 of 3   │ 2        │ 8        │
│   Spec quality  5 rewrites│  │ no code  │ not fully│ built    │ commits, │
│                           │  │          │ built    │different │ no story │
│   Commits with no story  8│  └──────────┴──────────┴──────────┴──────────┘
│   Repo settings           │
│                           │  ┌ Stories ─────────┐ ┌ FMB2-AUTH-031 ─────────────┐
│                           │  │ AUTH-034  no code│ │ Sign in with device biometrics
│                           │  │ AUTH-031  ▸      │ │ mobile-banking · PR #2841
│                           │  │ AUTH-032         │ │ Tracker says Done
│                           │  │ DEV-018          │ │
│                           │  │ Showing 5 of 5   │ │ 1 criterion has no code
│ LINEAGE FOR               │  └──────────────────┘ │
│ Mobile Banking V2         │                       │ [No code] AC-3
└───────────────────────────┘                       │   Given  no biometric enrolled
                                                    │   When   the app starts
                                                    │   Then   PIN entry is shown
                                                    │   No matching code · no test
                                                    │   [Ask the author] [Not applicable]
                                                    └────────────────────────────┘
```

Same information, minus the seven pieces of self-description, in words a person
reads once.

---

## 4. Order of work

1. **Copy and vocabulary** — `STATUS_COPY`, `STATUS_ACTION`, `GAP_FILTER_COPY`,
   `gapTiles`, the rail labels and counts. One pass, one file mostly.
2. **Delete the self-description** — instrumentation strip, `ACCURACY_NOTE` as a
   per-row footer, the closing disclaimer, duplicate provenance, the two editorial
   lines. Drift keeps its caveat, inside the drift row.
3. **Criterion row layout** — Given/When/Then on three lines, labelled evidence,
   confidence only where something matched.
4. **Master column** — drop the trust bar, hide zero-count filters.
5. **Fixture rewrite** — 6 stories on the spread above, shorter criteria, shorter
   paths, added to the Spec AI fixture so the other three screens move with it.

Steps 1–4 are independent of 5, so if you want the read-through fixed before the
data, that works.

---

## 5. Deliberately not changing

- **The four statuses.** Renaming them is in scope; collapsing them is not. *No
  code* and *built differently* are genuinely different findings and the actions
  differ.
- **The master/detail split.** Just merged, and it works.
- **Dismissals staying on the record.** A finding that vanishes when overridden is
  indistinguishable from one never found. Renaming the buttons is fine; making
  them silent is not.
- **The blank state for projects with no lineage.** Correct as it stands — it is
  the fixture that is thin there, not the screen.
