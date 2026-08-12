# Connectors — card grid and scoped controls

Taken from `generalized_connectors_card_grid_prototype.html`. This records what
shipped and why, and what was deliberately left out.

Code: [src/data/connectors.ts](src/data/connectors.ts) (derivations),
[src/components/connectors/ConnectorCard.tsx](src/components/connectors/ConnectorCard.tsx),
[src/components/views/ConnectorsView.tsx](src/components/views/ConnectorsView.tsx).
Ladder: [src/data/rbac.ts](src/data/rbac.ts).

---

## 1. The idea

One card per connector, and the card reads differently depending on which rung
of the ladder you stand on:

| Rung | Badge | Meta | Actions |
|---|---|---|---|
| Tenant | Available / Withdrawn | `2 of 3 departments · 4 of 5 projects · 1 failing` | Withdraw |
| Department | Enabled / Disabled / Not available | `3 of 3 projects connected · 1 failing` | Disable |
| Project | Connected / Not set up / Sync failed / Unavailable | `PROJ-MBV2 · synced 2m ago` | Configure · Test connection |

Each rung shows **its own state as a badge, the rung below it as a count, and
one verb**. A tenant asks who is using this; a department asks how much of my
estate has it; a project asks whether mine is working.

---

## 2. The blocking finding, and what it actually cost

`Connector` carried `enabledDepartment: boolean` and `activatedProject: boolean`
against a fixture with three departments and five projects. Every per-scope
figure the prototype draws was therefore uncomputable, and the scope filter and
the toggles already disagreed.

It was worse than a rendering problem. **Four call sites outside Connectors
asked a project-scoped question of a global flag** — `exportStoriesToJira`,
`Stage5Stories`, `SourceAttach`, `SourceDrawer` — so one project connecting Jira
answered yes for every other project on the platform. The export guard was the
live bug.

That reframed the work: not a cost the redesign imposed, but a correctness fix
it forced.

### What shipped

Deliberately minimal — only what actually varies by scope becomes keyed:

```ts
interface Connector {
  tenantAvailable: boolean;                          // genuinely platform-wide
  enabledDepartments: string[];                      // which departments
  activations: Record<string, ConnectorActivation>;  // keyed by projectId
}
```

`health`, `syncType`, `lastSyncTime`, `endpointUrl` and `workspaceRepo` moved
onto the activation, where they always belonged — they describe a binding, never
the integration.

Every figure on every card is a `.length` taken in `data/connectors.ts`. Seed a
fourth department and all three readings stay true.

---

## 3. Decisions, as settled

### D1 — The lens is derived, never chosen ✔

`lensFor(role, scope)` returns the **narrower** of what the role permits and
what scope is selected. A Tenant Admin at tenant scope gets reach; filtered to
one project they get that project's connection, because that is the question
they just asked. A Project Admin only ever gets the project reading.

The prototype's three role buttons do not ship. The header states the resolved
rung instead — `Department · Engineering`.

This is what makes `ScopeFilterBar` load-bearing here rather than decorative.

### D2 — Instances: cut entirely ✔

An earlier draft said model it now, defer the form. That was a hedge. A
`ConnectorInstance` table plus a foreign key on every enablement and activation,
for no visible benefit until a form exists, is cost carried for a maybe.
`endpointUrl` on the activation already distinguishes two Jira sites.

### D3 — Access requests: cut ✔

`Request access` and `2 requests waiting` are a workflow — raise, notify, grant,
decline. Until it exists the dead end renders honestly: `Unavailable ·
Engineering has not enabled this`, with no action.

### D4 — Cards replace the table ✔

The table's per-tier columns existed to show three rungs at once, which is
exactly what the lens says you never want.

### D5 — "Choose projects" cut; the count drills instead ✔

The prototype's `9 of 12 projects` reads as a department gate over projects — a
fourth rung the ladder does not have. The same number is already available as
**activation coverage**, which is truer to the three-rung design and needs no new
state.

What replaced it is better: **the count expands into the things counted.** A
card that says `2 of 3 departments` and offers no way to reach the third is a
dead end wearing a number.

- Tenant card → department rows, each with Enable / Disable.
- Department card → its own project rows, each with Connect / Configure / Retry.
- Project card has no drill; it is the leaf.

Rows act on their own target rather than on the selected scope, and carry the
permission for the rung *below* the one being read (`canEditBelow`). A Department
Admin can Connect a project because the ladder grants them `project-activation` —
using that project's credentials, in the same form, never a borrowed token.

---

## 4. Behaviour worth keeping

- **Destructive actions count first.** Withdraw and Disable confirm with real
  numbers — "clears 2 departments and disconnects 4 projects. SpecAI, Command
  Centre, My Tasks lose Jira on every project." The count is taken before the
  state changes, so the audit records what was destroyed rather than the empty
  maps left behind.
- **Dead ends name who closed them**, and render `No action available` rather
  than a greyed-out button. A disabled control invites a click and explains
  nothing.
- **`Enabled — no projects in this department yet`**, never `0 of 0`. Digital
  Practice has no projects, which is the honest zero-denominator case.
- **Test connection is honest rather than realistic.** A failing binding stays
  failing; inventing a recovery would be a lie the user cannot check.

---

## 5. Not built

| | Why |
|---|---|
| Instances + Add instance | D2 |
| Access requests | D3 |
| View logs | No log store. Invented lines are worse than the error string already on the card |

None of them blocks anything. Each is additive.

---

## 6. Risks carried forward

**The cascade is now expensive.** Withdrawing walks every department and every
project rather than flipping two booleans. The confirmation copy is load-bearing,
not polish.

**Three readings of one object is a testing surface.** Seven connectors × three
lenses × six states, most unreachable. Badge and actions live in a lookup
(`cardState`) rather than JSX branches, which is what keeps that tractable.

**`ScopeFilterBar` now decides what the page means**, not just what it lists.
Anywhere else it is used should be checked for the same assumption.
