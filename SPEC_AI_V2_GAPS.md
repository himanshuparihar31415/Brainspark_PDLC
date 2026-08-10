# Spec AI v2 — what's broken, thin, or missing

Found by reading the code, not by guessing. Ordered by whether it *fails*, *reads
as unfinished*, or *is absent*. Each item says what to do about it.

Two things in here are already fixed and are recorded because they were real:
the collapsed problem-statement header (§1.1) and dead Open Questions
(§1.2).

---

## 1. Breaks

### 1.1 ~~Problem statement never collapsed~~ ✔ fixed

The collapse markup silently failed to apply, so `headerOpen` was computed and
never used and the full card rendered on Artifacts, Modules and Stories — the
exact thing it was asked not to do. Only visible because `--noUnusedLocals`
flagged the orphaned variable.

**Lesson worth keeping:** run `tsc --noEmit --noUnusedLocals` after scripted
edits. An unused local is often a patch that didn't land, not just untidiness.

### 1.2 ~~Answering a question went nowhere~~ ✔ fixed

`orch.answerLeaf` had no caller after the Checklist tab was removed, so
**incremental re-retrieval — a headline behaviour — was dead code.** Open
Questions now answers objectively and routes through it.

### 1.3 A map click during generation silently does nothing

`askAgent` opens with `if (before.generating) return;`. Click a gap while the
agent is mid-turn and there is no message, no queue, no disabled state — the
click is swallowed.

**Fix:** disable gap actions while `state.generating` is set, or queue the
question and post it when the turn ends. Queueing is better; a user who clicks
twice should get both answered.

### 1.4 The System Map is the same for every project

`specSystemModel`, `specDelta` and `specImpact` contain **zero references to
`projectId`**. Open Spec AI v2 on *Acme B2B Partner Portal* and you get the
biometric-login system for a mobile bank.

**Fix:** key the graph by project, even if only two projects have one. A
`SYSTEM_BY_PROJECT: Record<string, {nodes, edges, facts}>` with a small second
model, and an empty state for projects with neither — "no system model
connected for this project" is honest; showing someone else's is not.

**This is the most damaging item in the list** for a demo, because it silently
produces confident nonsense.

### 1.5 Coverage can read 39% before anything has been analysed

Coverage derives from the taxonomy rollup, which scores against the reading. A
project with a seeded brief shows a real number before *Analyse problem* is
pressed, implying work that has not happened.

**Fix:** show `—` until `orch.phase !== 'idle'`.

---

## 2. Reads as unfinished

### 2.1 React Flow diagrams are generated and never shown

Nine artifacts in `specAiGenerated.ts` carry a full `flowDiagram` — positioned
nodes, labelled edges, animation flags — and `DiagramRenderer.tsx` exists and
works. **The v2 artifact viewer renders `a.body` in a textarea and nothing
else.** The diagrams are only visible in the old Spec AI.

**Fix:** render `DiagramRenderer` above the body when `artifact.flowDiagram`
exists. Roughly ten lines, and it is the single highest visual return in this
document — nine C4-style diagrams currently invisible.

### 2.2 Mock data is one example, thinly spread

| Thing | Now | Should be |
|---|---|---|
| Projects with spec state | 2 of 5 | at least 3, others explicitly empty |
| System models | 1, hardcoded | 2, keyed by project |
| Agent findings | canned for biometric login | keyed to the model in scope |
| Conflicts | 3, all authentication | derived from facts, per model |
| Team assignees | roster of the seeded project only | fall back to a named default set |

The orchestrator narrates *"There is an existing PIN fallback flow in the mobile
repository"* regardless of the problem statement. Fine for one demo, wrong the
moment anyone types something else.

### 2.3 Two dead modules in the tree

`KnowledgeMap.tsx` (Checklist tab) and `DeltaPanel.tsx` (Spec tab) are committed
and imported by nothing; `specAiConfidence.ts` likewise. Committed deliberately
rather than deleted — none of it was in history — but it is dead code now.

**Fix:** delete, or restore one tab that uses them. Not both.

### 2.4 Approving eleven artifacts to open one gate

`CRITICAL_GROUPS = ['Product', 'Architecture']` is 11 of 22 artifacts. *Approve
all critical* exists, but the honest fix is fewer critical artifacts — three or
four that genuinely gate decomposition.

---

## 3. Missing handoffs

### 3.1 Nothing leaves Spec AI except My Tasks

The only `navigateTo` in the whole view goes to My Tasks. After stories are
generated and exported there is no route to Design, CodeIQ, IntelliQA or back to
the Command Centre pipeline the specification is supposed to feed.

**Fix:** a completion state on the Stories tab — *"14 stories exported. Next:
Design AI for the enrolment screens, IntelliQA for the test scenarios"* — with
buttons that call `navigateTo`. The pipeline already models these as phases;
Spec AI just never points at the next one.

### 3.2 The delta never reaches the platform

`specDelta` knows the change touches `mobile-app`, `authentication-service` and
`device-registry`. Nothing writes that anywhere the rest of the platform can
see it: no tasks created, no pipeline phase updated, no artifacts registered
against the project.

**Fix:** on approval, create platform `Task` records from the Jira projection so
the work appears in My Tasks and the Command Centre queues. This is the
difference between a specification tool and a specification *step*.

### 3.3 Approval writes no audit entry

`lockSpecStage` audits. Approving the compiled specification — the most
consequential act in the module — does not add anything beyond that.

**Fix:** audit the approval with its carried-forward warnings, delta size and
impact counts.

---

## 4. Plan

Ordered by damage prevented per hour.

| # | Work | Size | Why now |
|---|---|---|---|
| 1 | Render `flowDiagram` in the artifact viewer (§2.1) | S | Nine finished diagrams currently invisible |
| 2 | Project-key the system model, empty state otherwise (§1.4) | M | Stops confident nonsense on other projects |
| 3 | Queue map clicks during generation (§1.3) | S | Removes a dead-feeling click |
| 4 | Coverage `—` before analysis (§1.5) | XS | One condition |
| 5 | Next-module handoff on Stories (§3.1) | S | Makes it a pipeline step, not a cul-de-sac |
| 6 | Second system model + per-model findings (§2.2) | M | Demo survives a second problem statement |
| 7 | Create platform tasks on approval (§3.2) | M | The delta becomes visible outside Spec AI |
| 8 | Trim critical artifacts to 3–4 (§2.4) | XS | Eleven approvals is a chore, not a gate |
| 9 | Audit the approval (§3.3) | XS | Traceability parity with every other action |
| 10 | Delete or re-wire the three dead modules (§2.3) | XS | Nothing should be in the tree unreferenced |

**1–4 are half a day and remove every actual failure.** 5–7 are what turn the
module from a well-built demo into something that hands work onward. 8–10 are
tidying.

### Not in scope, deliberately

- Real retrieval. Everything here is mock data by design.
- Compiling the full 18-section specification. The document renders ten
  sections from the delta; the rest would be prose with nothing behind it,
  which is precisely the failure mode the model was built to avoid.
