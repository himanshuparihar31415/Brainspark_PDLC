# Spec AI v2 — user journey

The redesigned flow, as a person experiences it. Decisions and gap fills are in
[SPEC_AI_V2_PLAN.md](SPEC_AI_V2_PLAN.md); current behaviour is in
[SPEC_AI.md](SPEC_AI.md).

Internal stage keys appear in `code font` where a step corresponds to a lock, so
this can be read against the state machine. The user never sees them.

---

## Cast

| Who | Can | Journey |
|---|---|---|
| **Product Manager** | Edit everything | The full journey below. Owns `Product` questions. |
| **Architect** | Edit everything | Same pipeline, same thread. Owns `Architecture` questions. |
| Tech Lead, Developer, QA, Release Manager | **Read only** | Can open, read, trace evidence. Cannot answer, resolve, promote, finalize or approve. |
| Department / Tenant Admin | No access | Spec AI is not in their nav. |

Both owners work **one pipeline, one thread** — not parallel workspaces. Soft
per-section locks (`sectionEditors`) stop them overwriting each other.

---

## The map

```
  Command Centre
        │ opens the Spec AI door
        ▼
  ┌───────────────────────────────────────────────────────────┐
  │ ACT 1 · FRAME      paste the problem → first reading      │  knowledge
  │ ACT 2 · INTERROGATE  answer · resolve · attach · promote  │  knowledge
  │        └─ /finalize ──▶ ① PROJECT DEFINITION locked       │
  │ ACT 3 · CONFIRM     nine sections + requirements          │  understanding
  │        └─ confirm ──▶ ② PROJECT BRIEF locked              │
  │ ACT 4 · PRODUCE     artifacts arrive · approve in My Tasks│  artifacts
  │ ACT 5 · DECOMPOSE   module map bar → approve              │  modules
  │ ACT 6 · HAND OFF    stories bar → map → export to Jira    │  stories
  └───────────────────────────────────────────────────────────┘
        │
        ▼
  Command Centre pipeline + Dashboard completion
```

---

## Act 1 — Framing

**The question being answered: "what are we actually solving?"**

### 1. Arrival

The user opens Spec AI from a Command Centre door. The workspace takes the full
viewport; the platform sidebar collapses into a **compact icon strip in the top
bar**, carrying its badge counts so nothing that needed attention becomes invisible.

They see an empty thread and one prompt: describe the problem.

### 2. The seed

They paste whatever they have — a paragraph, a stack trace, a ticket, meeting notes.
**One action, no confirmation ceremony.** The statement is taken verbatim and pinned
to the top bar, where it stays visible for the rest of the journey.

The agent's first turn says how it read the input:

> `AGENT · read as System logs — timestamped lines with severity markers`

That line matters more than its size suggests: it is the user's first chance to
notice the agent has misread them, at the only point where correcting it is free.

### 3. The first reading

Without a button press, the agent produces its opening reading: objective, rough
scope, what it is assuming. The rail fills — and **almost everything is Low**,
because nothing is sourced yet.

This is deliberate. The user's first impression is not "the AI understood me", it is
**"the AI has told me it doesn't know much yet"**. Every step after this is the score
going up, which is what makes the rail feel earned rather than decorative.

---

## Act 2 — Interrogation

**The question: "what does it not know, and can I close that?"**

This is the loop the whole redesign exists to support, and where the user spends
most of their time.

### 4. The agent reads the sources

Tool calls land in the thread **one at a time** — `list_sources`, `read_source`,
`search_sources`, `check_coverage`, `compare_sources` — and the reply arrives only
after them. The user watches retrieval happen rather than being handed a conclusion.

A tool that ran and found nothing says so. That is a finding, not a failure, and
seeing it is how the user learns the material is thin.

### 5. Four to five grounded questions

Not a form. Each question names the specific gap that produced it and the file it
came from:

> `Jira-CHK-142` lists a "loyalty-only payment step" with no owner. Who owns that?
> `[Payments team]` `[Growth team]` `[Assume for now]` `[Defer]`

Each carries a track chip — **Product** or **Architecture** — so the user knows
whether it is theirs or their counterpart's. Architecture questions sort first,
because the gate already warns that they "propagate into every artifact generated
from here".

Answering is a click. The answer posts as their own message, the agent acknowledges,
and **the affected facet's confidence visibly moves**. If it never moved, the rail
would be wallpaper.

### 6. Flags are a different act

Contradictions do not appear in the thread queue. They sit in the rail and **stay
there while the conversation scrolls**, because a contradiction does not get answered
— it gets *decided*:

> `PRD-checkout-v3.pdf` says guest checkout is being removed. The problem statement
> assumes it stays.
> `[Guest checkout stays]` `[Guest checkout is removed]` `[Something else…]`

Picking a side records a **User decision** — evidence of the strongest kind, because
a human committed to it. The thread notes it, and the facet it was blocking is
released.

### 7. Filling material gaps

When the agent needs something that does not exist yet it asks directly — "no image
is attached for the checkout redesign mock" — and the ask carries its own attach
button. The user does not have to work out where to go.

Attaching from the composer offers **a file** or **an archetype**, and the difference
is stated: an archetype is a pattern, not a source, and still has to be read.

A source that fails to parse appears in the **Sources rail card** with a Retry, which
is the only place in the journey where a failure is recoverable in one click.

### 8. Committing to intent

At some point a line in the reading stops being an observation and becomes a
decision to build. The user hovers it and **promotes it to a requirement seed**. The
line stays where it is — promotion never destroys the evidence that justified it.

This is the act that makes the finalize gate clean; without it the gate will say
"no requirement seed yet — promote a line so something downstream has an anchor".

### 9. Tracing a claim

At any point the user can click a filename pill and see the actual excerpt the claim
rests on — system, item id, when it was indexed, deep link, verbatim text. Every
line also wears its evidence class: **Fact · Decision · Inferred · Assumption**.

Nobody has to take the agent's word for anything. This is the capability the module
is ultimately for.

---

## Act 3 — Commitment

**The question: "am I willing to build on this?"**

### 10. `/finalize`

The user types `/finalize` or presses the button beside the composer — both exist,
because a slash command alone is a discoverability problem.

The gate does not pass silently. It lists exactly what is being carried forward:

> 2 flags and 1 open question are still unresolved.
> `[Keep editing]` `[Finalize anyway]`

**Advisory, never blocking.** The user may override — and the override is recorded in
the audit trail, so the gap becomes traceable instead of becoming a silence. The
confirm button renames itself to "Finalize anyway" so the choice is legible.

On confirm, the problem statement locks and **① Project Definition** exists.
`knowledge`

### 11. Confirming the Project Brief

The nine sections arrive **pre-filled from the conversation** — objective from the
problem statement, current state from what was known, assumptions from what was
inferred, open questions from what nobody could answer. Only blanks are filled;
nothing the user wrote is overwritten.

Here they also do the things that belong to a specification rather than a
conversation: write **formal requirements** (actor, need, value, Given/When/Then
acceptance, evidence links), and set **Greenfield or Brownfield**, which decides how
the artifacts get generated.

Confirming locks **② Project Brief**. `understanding`

---

## Act 4 — Production

**The question: "is what it produced right?"**

### 12. Artifacts arrive a few at a time

Generation starts on confirm — no separate button. Artifacts land in the thread as
they finish rather than appearing as one block:

> `High-Level Design generated`
> `Context & Flow Diagram generated`

The user can start reading the first while the rest are still coming, and the thread
becomes the record of when each appeared.

### 13. Reviewing them

The top-bar icon strip shows a pending badge. The user clicks through to **My Tasks**
— the platform view, not a tab hidden inside the workspace — and approves each
artifact, opening any of them to read the body first.

When the last one is approved, the banner confirms what it bought:

> All artifacts approved — Module & Feature decomposition is unlocked.

`artifacts`

---

## Act 5 — Decomposition

### 14. The module map

A review bar appears: **Approve module map**. It opens the full decomposition
surface, unchanged — Module → Feature → Capability, with merge, split, re-parent and
cross-module dependency editing. A queue row is the door, not the room.

Approving unlocks stories. `modules`

---

## Act 6 — Hand-off

### 15. Stories

A second bar opens the story surface. Stories are split into **Non-technical** —
what a stakeholder can accept without reading the design — and **Technical**:
services, contracts, data, tests, migration.

The user maps story types to Jira issue types, then exports. Two guards stand in the
way, each with a specific message rather than a generic failure:

- Jira is not activated for this project → "This needs the Jira connector. Ask your
  admin."
- A story type in use has no mapping → names the type.

On export, only `Draft` stories flip to **Exported** and the sync counter resets to
"just now". `stories`

### 16. It leaves the workspace

Exported stories become the source of truth for the Spec AI phase in the **Command
Centre pipeline** and, once present, for the project's **completion percentage** on
the Dashboard. The specification stops being a document and starts being the
delivery plan.

---

## The journeys that are not the happy path

These are where the design earns its keep.

### A source arrives late

The user attaches something after the agent has already read everything. The reading
is marked out of date **with the reason spelled out** — "`auth-notes.docx` arrived
after this reading." — and a **Re-read sources** action appears. Nothing silently
describes a source set that has moved on.

### A new source contradicts what was agreed

The agent reads it, raises a flag, **and the affected facet's confidence drops**.
This is the single most important behaviour in the rail, and the reason confidence is
derived from evidence rather than stored and nudged upward: a score that can only
rise is a score that cannot warn you.

### The user was wrong about the problem

They click the pinned problem statement and edit it. Everything downstream is marked
for review, because the premise everything was read against just changed.

### They need to reopen after finalizing

They click the **Locked** tag. A modal explains that later stages reopen too, and
that **nothing generated is deleted** — artifacts and stories are kept and flagged
for review. Then they edit, and re-finalize when ready. There is no dead end.

### An artifact gets regenerated

Every story tracing to it is flagged, and the count is reported: "3 downstream
stories flagged for review." The user reviews each against its updated source. The
ripple is visible rather than something they discover in a sprint.

### A read-only colleague opens it

A developer can open the workspace, read the thread, click any citation and see the
excerpt behind any claim. They cannot answer, resolve, promote or approve. Full
transparency, no edit rights — the spec is legible to the people who have to build
it.

---

## Moments of truth

Where the journey is won or lost.

| Moment | Risk | What carries it |
|---|---|---|
| First reading appears | "It doesn't understand me" | Low confidence is honest and visibly improvable, not a failure |
| First question | "This is a form" | Named file, named gap, one-click answer |
| First answer | "The rail is decoration" | The bar has to move, immediately and visibly |
| Finalize gate | "It's blocking me" | Advisory, overridable, and the override is recorded |
| Artifacts arrive | "Nothing is happening" | Progressive arrival, each announced in the thread |
| Export | "It failed and I don't know why" | Both guards name the specific missing thing |

---

## What the user never has to do

The measure of v2 against today:

- Move between five tabs to see the brief, the sources and the questions together
- Hunt for the problem statement inside a stage
- Wonder whether the brief is trustworthy — the rail says, per item
- Discover a stage gate by walking into it
- Leave a conversation to answer a question raised inside it
- Take a single claim on trust
