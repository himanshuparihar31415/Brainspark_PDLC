# BrainSpark PDLC — Product Requirements Document v2.0

**AI-Native Product Development Lifecycle Governance Platform**

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Status | In Development |
| Last Updated | July 2026 |
| Repository | `Brainspark_PDLC` |
| Branch | `feat/observability-ops-cockpit` (current) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision and Strategic Goals](#2-vision-and-strategic-goals)
3. [Platform Architecture](#3-platform-architecture)
4. [User Surfaces](#4-user-surfaces)
5. [PDLC Modules](#5-pdlc-modules)
6. [Observability System](#6-observability-system)
7. [Role-Based Access Control](#7-role-based-access-control)
8. [Feature and Story Completion Tracking](#8-feature-and-story-completion-tracking)
9. [Spec AI Artifact Package](#9-spec-ai-artifact-package)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [UI/UX Design System](#11-uiux-design-system)
12. [Implementation Status](#12-implementation-status)
13. [Roadmap](#13-roadmap)

---

## 1. Executive Summary

### What Is BrainSpark?

BrainSpark is an enterprise-grade, multi-tenant platform that governs AI-assisted software delivery across the entire product development lifecycle. It orchestrates autonomous AI agents across five PDLC phases — **Spec AI**, **Design (Proto AI)**, **Code IQ**, **IntelliQA**, and **Release Pulse** — providing centralized observability, cost management, quality evaluation, and governance controls for organizations adopting AI in their engineering workflows.

### Problem Statement

Organizations adopting AI coding assistants and generation tools face:

- **No visibility** into what AI agents are doing, how much they cost, or whether their output is correct
- **No governance** — agents operate without guardrails, creating compliance and security risk
- **No coordination** — different teams use different AI tools with no unified delivery view
- **No quality assurance** — generated artifacts (stories, tests, code) have no evaluation pipeline
- **No cost control** — LLM spend is invisible until the bill arrives

BrainSpark solves all five by providing a **single governed surface** where AI-assisted delivery is planned, executed, observed, and evaluated — from PRD to production release.

### Target Users

| Persona | Pain Point | BrainSpark Solution |
|---------|-----------|-------------------|
| **Platform Teams** (Super Admin) | Can't see AI spend or reliability across tenants | Observability dashboard, cost attribution, SLO tracking |
| **Delivery Leadership** (PM, Architect, Tech Lead) | Can't govern AI-generated specs or track completion | Spec AI workspace, stage gating, completion rollup |
| **Individual Contributors** (Dev, QA) | AI tools are disconnected from delivery workflow | Command Centre, My Tasks, integrated agent services |
| **Governance / Security** | Can't prove compliant AI operation | Audit trail, sensitive data detection, RBAC, payload access control |

---

## 2. Vision and Strategic Goals

### Vision Statement

> Make AI-assisted delivery trustworthy, measurable, and governable at enterprise scale — so organizations can adopt AI agents with confidence that quality, cost, and compliance are never traded for speed.

### Strategic Goals

| Goal | Metric | Target |
|------|--------|--------|
| Reduce spec-to-story cycle time | Time from PRD upload to exportable stories | < 4 hours (from days) |
| AI cost governance | Cost per accepted artifact | <= $0.40 per artifact |
| Platform reliability | End-to-end agent success rate | >= 97% |
| Multi-tenant adoption | Active tenants using 3+ modules | >= 80% of onboarded tenants |
| Quality assurance | Agent evaluation pass rate | >= 95% on all quality metrics |
| Observability coverage | Runs with full tracing | 100% of production runs |
| Delivery velocity | Stories reaching "Done" per sprint | 40% improvement over baseline |

---

## 3. Platform Architecture

### 3.1 Multi-Tenancy Model

BrainSpark operates a strict hierarchical scope model:

```
Platform (BrainSpark instance)
├── Tenant A (Organization / BU) ─── schema isolation
│   ├── Project 1 ─── within tenant
│   │   ├── Module: Spec AI
│   │   ├── Module: Code IQ
│   │   └── Module: IntelliQA
│   └── Project 2
├── Tenant B
│   └── Project 3
└── Tenant C
    └── Project 4
```

| Scope Level | Entity | Isolation | Governed By | Responsibility |
|-------------|--------|-----------|-------------|----------------|
| Platform | BrainSpark instance | Single deployment | Super Admin | Platform health, global policies, infrastructure |
| Tenant | Organization / BU | Schema-per-tenant | Tenant Admin | Org config, budgets, users, connectors, governance |
| Project | Product initiative | Within tenant | Project Admin | Workspace setup, team, modules, delivery config |
| Module | PDLC phase | Within project | Functional roles | Delivery activity (PM, Architect, Tech Lead, QA, etc.) |

### 3.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript 5.8 + Vite 6 |
| **Styling** | Tailwind CSS 4 (iOS glassmorphism light theme) |
| **Diagrams** | @xyflow/react (React Flow) |
| **Icons** | Lucide React |
| **Animations** | Motion (Framer Motion) |
| **State** | React Context (AppProvider) |
| **Backend (planned)** | Python FastAPI + PostgreSQL + Redis + Kafka + Celery |
| **AI/ML** | Multi-provider LLM (Azure OpenAI, OpenAI, Anthropic) |

### 3.3 Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                          │
│  Login │ Portal (10 views) │ Command Centre (3) │ Spec AI (5) │
├──────────────────────────────────────────────────────────────┤
│                     STATE & CONTEXT                            │
│  AppContext (auth, scope, nav) │ useSpecAi (generation state) │
├──────────────────────────────────────────────────────────────┤
│                      DATA LAYER                               │
│  Mock services (observabilityApi, mockData, specAiGenerated)  │
│  ↕ Future: REST API calls to FastAPI backend                  │
├──────────────────────────────────────────────────────────────┤
│                   OBSERVABILITY SUBSTRATE                      │
│  Runs │ Executions │ Events │ Spans │ Cost │ Audit            │
├──────────────────────────────────────────────────────────────┤
│                    AI EXECUTION ENGINE                         │
│  Agent Graph │ LLM Router │ Fallback │ Evaluation │ Cache     │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 File Structure

```
src/
├── App.tsx                      # Shell: lazy-loaded views, auth gate
├── main.tsx                     # Entry point
├── index.css                    # Tailwind + iOS theme tokens
├── types/
│   ├── index.ts                 # Core types (Role, Tenant, Project, etc.)
│   ├── observability.ts         # Observability + API response types
│   └── specai.ts                # Spec AI types (artifacts, modules, stories)
├── context/
│   ├── AppContext.tsx            # Global state provider
│   └── useSpecAi.ts             # Spec AI state machine
├── data/
│   ├── mockData.ts              # Tenants, projects, team, agents, etc.
│   ├── observabilityApi.ts      # Mock API functions (matches endpoint spec)
│   ├── observabilityData.ts     # Mock runs/executions/events
│   ├── observability.ts         # Helpers: rollup, KPIs, formatters
│   ├── specAiGenerated.ts       # Generated artifacts, modules, stories
│   ├── specAiData.ts            # Initial Spec AI state
│   ├── specAiSynthesis.ts       # Understanding stage data
│   ├── specai.ts                # Stage definitions, gate configs
│   ├── completion.ts            # Story→feature→project rollup helpers
│   ├── modules.ts               # PDLC module definitions
│   ├── pipelineData.ts          # Pipeline phase data
│   └── rbac.ts                  # Permission matrix
└── components/
    ├── common/                  # Header, Sidebar, Toast, ScopeFilterBar
    ├── dashboard/               # KPI tiles, project strip, breakdowns
    ├── command/                  # Pipeline, blockers, tasks, workspace
    ├── observability/           # ObsDashboard + 6 panels + drill views
    ├── specai/                  # 5 stages + DiagramRenderer + helpers
    └── views/                   # 14 lazy-loaded view components
```

---

## 4. User Surfaces

### 4.1 Portal (Administration & Governance)

The Portal is where platform and tenant admins govern the AI estate, manage costs, evaluate quality, and enforce compliance.

| View | Purpose | Primary Roles |
|------|---------|---------------|
| **Dashboard** | KPI tiles, project phase strip, cost/token breakdowns, completion rollup | All authenticated |
| **Tenants** | Tenant CRUD, budget allocation, status management | Super Admin (platform scope) |
| **Projects** | Project lifecycle, phase tracking, spend monitoring | Tenant Admin (creates), Project Admin (configures) |
| **Team** | Role assignments, shared resource pool, allocation tracking | Tenant Admin (org members), Project Admin (project roles) |
| **Connectors** | Integration management (Jira, Git, Design, CI/CD, Docs, AI Tools) | Tenant Admin (registers/approves), Project Admin (attaches) |
| **Agent Registry** | Agent catalog, versioning, drift detection, rate limits, action scope | Super Admin (global standards), Tenant Admin (org approval) |
| **Observability** | 6-tab operational dashboard + 5-level drill-down to event evidence | Scoped per viewer (platform → tenant → project) |
| **Evaluation** | Agent quality metrics (precision, recall, hallucination, format compliance) | AI Engineering |
| **Prompt Controls** | Prompt versioning, candidate/active comparison, review workflow | AI Engineering |
| **Security** | RBAC matrix, session config, sensitive data logs, full audit trail | Super Admin, Governance |

### 4.2 Command Centre (Delivery Orchestration)

Day-to-day delivery tracking across PDLC phases.

| View | Purpose | Primary Roles |
|------|---------|---------------|
| **Command Centre** | Pipeline phases per module, blockers rail, awaiting-review queue | Tech Lead, PM |
| **My Tasks** | Personal task queue with priority, due dates, module attribution, cost | All contributors |
| **My Services** | Agent services a user owns or operates | Developers, AI Eng |

### 4.3 Spec AI (Generation Engine)

A 5-stage AI-assisted specification generation workspace with progressive disclosure and stage gating.

| Stage | Name | What It Generates | Key Features |
|-------|------|-------------------|--------------|
| **1** | Knowledge | Source cards from uploads | 4 source types (Jira, Zoom, Docs, Live App), ChalkBoard lanes, SourceDrawer |
| **2** | Understanding | Synthesized requirements + questions | AI QuestionQueue, CopilotPanel, ConflictResolver, BriefPanel |
| **3** | Artifacts | 22 architecture artifacts | React Flow diagrams, HLD/LLD/C4, Greenfield/Brownfield mode, inline edit |
| **4** | Modules | Module tree + dependency graph | Feature decomposition, capability mapping, requirement linking |
| **5** | Stories | User stories with acceptance criteria | 7 story types, delivery status tracking, Jira export, completion rollup |

**Stage Gating:** Lock Stage N to generate Stage N+2. Each gate validates prerequisites (no low-confidence artifacts, no stale items, no unresolved conflicts).

---

## 5. PDLC Modules

Five AI-powered modules cover the complete product development lifecycle:

| Module | Key Agents | Primary Metric | Quality Metric | Artifact Unit |
|--------|-----------|----------------|----------------|---------------|
| **Spec AI** | PRD Understanding, Story Generation, Module Decomposition | Stories generated | Completeness score | story |
| **Proto AI (Design)** | Prototype Scaffold, Component Generation | Screens generated | Design fidelity | screen |
| **Code IQ** | Code Review, Refactoring, Documentation | PRs reviewed | Bug detection rate | PR |
| **IntelliQA** | Test Case Generation, Test Refinement | Test cases generated | Coverage achieved | test_case |
| **Release Pulse** | Release Notes, Risk Assessment | Releases gated | Gate pass rate | release |

### Module Definitions (from `src/data/modules.ts`)

Each module defines:
- **Primary metric** — the quantitative output (stories, tests, PRs, etc.)
- **Secondary metric** — a supporting measure (coverage, complexity, etc.)
- **Quality metric** — the headline quality signal
- **Pooled roles** — which team roles share capacity for this module
- **Pipeline copy** — units, completion phrases for the Command Centre

### Agent Services

Each agent has a governed profile in the Agent Registry:

| Field | Purpose |
|-------|---------|
| `capability` | What the agent does |
| `module` | Which PDLC phase it belongs to |
| `version` | Current deployed version |
| `status` | Active / Deprecated / Held |
| `underlyingModel` | LLM model (e.g., GPT-4o, Claude 3.5 Sonnet) |
| `permittedTools` | Tools the agent may invoke |
| `actionScope` | Read+generate / Read+generate+modify / Full Autonomous |
| `tokenBudgetPerInvocation` | Max tokens per single call |
| `costCeilingPerInvocation` | Max spend per call |
| `rateLimit` | Calls per minute throttle |
| `drift` | Whether behavior has diverged from baseline |

---

## 6. Observability System

### 6.1 Data Model

Three capture levels in a strict parent-child chain:

```
ObservabilityRun (Level 1)
├── AgentExecution (Level 2) — one per agent attempt
│   └── ObservabilityEvent (Level 3) — LLM calls, tool calls, errors, etc.
└── Reference Catalogs
    ├── AgentCatalogEntry — makes agent IDs resolvable
    └── ModelCatalogEntry — pricing as managed data
```

**Nine event types:** `llm_call`, `tool_call`, `state_transition`, `error`, `hitl_pause`, `cache_hit`, `policy_decision`, `evaluation`, `artifact`

### 6.2 API-Aligned Dashboard (6 Tabs)

Aligned to `API_ENDPOINTS_1346.md`:

| Tab | Endpoints | Key Widgets |
|-----|-----------|-------------|
| **Overview** | `GET /observability/app` | Platform KPI strip, module cost bars, error rate summary, auth events |
| **Cost** | `GET /cost/by-module`, `/by-agent`, `/cache-savings` | Module cost breakdown, agent cost table, cache savings card |
| **Performance** | `GET /performance/by-agent`, `/runs/{id}/bottleneck` | Agent latency table (p50/p95/avg/max), bottleneck highlights |
| **Reliability** | `GET /reliability/error-rate`, `/provider-health`, `/fallback-rate` | Error rate gauges, provider health grid, fallback breakdown |
| **Agents** | `GET /agents/{slug}/token-trend`, `/tool-usage`, `/retry-rate` | Token trend chart, tool usage breakdown, retry rate card |
| **Tenants** | `GET /tenants/top-consumers` | Top consumers leaderboard, per-tenant detail cards |

### 6.3 Five-Level Drill-Down

| Level | Name | Content | Audience |
|-------|------|---------|----------|
| **L1** | Enterprise | Adoption, run volume, success, quality, cost, SLOs | CTO, platform leadership |
| **L2** | Module | Per-module trends across all 5 PDLC modules | Product owners, eng leaders |
| **L3** | Tenant / Project | Consumption, cost, data policy, failures | Account and platform ops |
| **L4** | Run Timeline | Agent path, retries, tools, model calls, prompts, errors | Engineering, AI ops |
| **L5** | Event Evidence | Sanitized input/output, token accounting, tool I/O | Authorized investigators only |

**Payload Access Control:** Reaching L5 does not grant the right to read content. Only holders of the explicit `payload.read` permission (Sensitive Data Investigator grant) may view sanitized payloads — this requires business justification, time-limited access, and full audit logging. Being an administrator does not automatically confer content access.

### 6.4 API Endpoint Groups

1. **Platform Metrics** — `GET /observability/app`, per-tenant, per-project
2. **Agent Registry** — `POST /observability/agents/reload`
3. **Debugging** — Run timeline, run summary, span detail
4. **Cost** — By module, by agent, cache savings
5. **Performance** — By agent (percentiles), per-run bottleneck
6. **Reliability** — Error rate, provider health, fallback rate
7. **Tenant (Super-Admin)** — Top consumers ranked by cost
8. **Agent Behavior** — Token trend, tool usage, retry rate

---

## 7. Role-Based Access Control

### 7.1 Design Principle

Roles are distinguished by **scope, responsibility, and blast radius** — not progressively fewer menu options.

| Role | Governs | Primary Responsibility | Should Not Control |
|------|---------|----------------------|-------------------|
| **Super Admin** | Entire BrainSpark platform | Platform health, tenant lifecycle, global policies, shared infrastructure | Individual project delivery decisions |
| **Tenant Admin** | One organization or business unit | Organization-level configuration, budgets, users, connectors, governance | Other tenants or platform-wide settings |
| **Project Admin** | One project or product initiative | Project setup, team assignments, module access, delivery configuration | Tenant-level budgets, identity policies, global connectors |

**Mental model:**

> Super Admin runs BrainSpark. Tenant Admin runs the organization's BrainSpark environment. Project Admin runs the project's BrainSpark workspace.

---

### 7.2 Administrative Roles (Scope-Based)

#### Super Admin — Platform Operator

The team running BrainSpark itself, analogous to a SaaS platform administrator.

**Responsibilities:**

- Create, suspend, and manage tenants
- Configure global authentication and security policies
- Manage global model providers (Azure OpenAI, Anthropic, etc.)
- Manage platform-wide agent registry standards
- Configure global rate limits and quotas
- Monitor platform availability and performance
- View aggregated cost across all tenants
- Manage shared infrastructure (Kafka, observability ingestion, storage)
- Investigate cross-tenant incidents (via audited support access)
- Configure global retention and compliance policies
- Manage feature flags and platform versions

**Example scenarios:**

- Azure OpenAI is unavailable across multiple tenants
- A model version must be blocked globally due to a vulnerability
- A new tenant needs to be provisioned
- One tenant is exceeding platform resource limits
- Kafka or the observability ingestion service is unhealthy

**Boundaries — Super Admin should not:**

- Approve a tenant's user story
- Assign developers to a project
- Decide whether a project release should proceed
- Modify project prompts during normal operations
- Act as the default owner of tenant data
- Routinely read project content or payloads without audited justification

> Super Admin manages the platform, not the customer's delivery work. Technical access to tenant data exists for authorized support/investigation but is controlled through audited access grants, not routine visibility.

---

#### Tenant Admin — Organization Administrator

Governs how one organization uses BrainSpark. A tenant may represent a company, business unit, geography, legal entity, or large department (e.g., Incedo, US Bank, AssetMark, Genentech, Incedo Digital Engineering BU).

**Responsibilities:**

- Create and archive projects within the tenant
- Manage users within the tenant (invite, deactivate, role assignment)
- Assign project admins
- Configure organization-level roles and policies
- Manage tenant budgets and quotas (allocate across projects)
- Configure organization-approved LLM providers
- Manage shared connectors (Jira, GitHub, Figma, Confluence, CI/CD)
- Set data residency and retention policies
- Define approved agent and model usage for the organization
- Monitor cost and adoption across projects
- Review tenant-level security and audit events
- Configure organizational approval policies
- Define which projects may access which connectors

**Example scenarios:**

- The organization has a monthly AI budget of $100,000 to allocate
- Only Azure OpenAI may be used for regulated projects
- Project A can use GitHub but Project B can only use Bitbucket
- A user joins the organization and needs access to three projects
- All projects must retain audit records for seven years
- One project is consuming 60% of the tenant's LLM budget

**Boundaries — Tenant Admin should not:**

- Manage another organization's data
- Change BrainSpark's global platform infrastructure
- Approve individual project stories or releases (unless assigned that project role)
- Modify project-specific work unless assigned to that project
- Automatically read every prompt, code snippet, requirement, or customer record inside projects

> Tenant Admin governs how the organization uses BrainSpark. Being able to manage a project's existence does not automatically mean being able to read every artifact inside it.

**Access separation:**

| Access Type | Automatically Granted | Requires Explicit Grant |
|-------------|:--------------------:|:----------------------:|
| Tenant administration (config, users, budgets) | Yes | — |
| Project metadata (existence, cost, health) | Yes | — |
| Project content (artifacts, stories, prompts) | — | Yes (project role required) |
| Sensitive payloads (L5 event evidence) | — | Yes (`payload.read` + justification) |

---

#### Project Admin — Workspace Configuration Owner

Configures and administers one delivery workspace. This is an **administrative assignment**, not a functional delivery role — it is separate from PM, Architect, or Tech Lead.

**Responsibilities:**

- Configure the project (name, description, lifecycle stage)
- Add and remove project members from the tenant user pool
- Assign project roles (PM, Architect, Tech Lead, Developer, QA, etc.)
- Enable and configure PDLC modules (Spec AI, Code IQ, IntelliQA, etc.)
- Configure project-level connectors from tenant-approved connections
- Set project budgets within tenant-allocated limits
- Configure workflow stages and approval requirements
- Manage artifact templates
- Set project-specific agent limits and cost ceilings
- Configure release gates
- Manage project-level notifications
- View project observability (runs, performance, cost within scope)
- Resolve administrative blockers
- Archive the project

**Example scenarios:**

- Enable Spec AI, Code IQ, and IntelliQA for a project
- Assign one person as Architect and another as QA Manager
- Connect the project to a specific Jira board and Git repository
- Set a $5,000 monthly project limit within the tenant's allocation
- Require architecture approval before story generation
- Configure which branch Code IQ may access
- Decide which project members can view event payloads

**Boundaries — Project Admin should not:**

- Create tenant-wide policies
- Change the organization's approved LLM providers
- Increase spending beyond the tenant's allocated budget
- Access other projects
- Change global agent definitions
- Override tenant security rules
- Automatically approve functional artifacts (that's a delivery role responsibility)

> Project Admin configures the workspace in which delivery happens. Completion tracking is derived from delivery activity and owned by functional roles — Project Admin can view/configure tracking but does not own it.

---

### 7.3 Functional Roles (Delivery)

| Role | Scope | Primary Responsibility |
|------|-------|----------------------|
| **Product Manager** | Project | Spec AI ownership, story approval, delivery prioritization, command centre |
| **Architect** | Project | Artifact review/approval, architecture decisions, agent registry, prompt quality |
| **Designer** | Project | Design module, prototype review, story-to-design linking |
| **Tech Lead** | Project | Code IQ, pipeline management, blocker resolution, technical story ownership |
| **Developer** | Project | Code IQ tasks, personal task queue, story delivery status updates |
| **QA Manager** | Project | IntelliQA configuration, test strategy, evaluation review |
| **QA Engineer** | Project | IntelliQA execution, test case review, story testing status |
| **Release Manager** | Project | Release Pulse, gate approval, release notes review |

---

### 7.4 Cross-Cutting Permission: Sensitive Data Investigator

Payload access is **not** derived from administrative scope. It is a separate, auditable permission grant.

| Requirement | Enforcement |
|-------------|-------------|
| Explicit `payload.read` permission | Must be granted per-user, not inherited from admin role |
| Business justification | Required at time of access, logged with the event |
| Time-limited access | Access window expires; must be renewed |
| Complete audit logging | Every payload view recorded with actor, timestamp, justification |
| Masked data by default | Content is masked/redacted unless investigator actively reveals |
| Approval workflow | Optional approval from project owner or security lead |

> An administrator should be able to manage a container without automatically reading everything stored inside it.

---

### 7.5 Permission Model (Resource + Action)

Permissions are defined by **resource and action**, not by progressively wider screen access.

```
# Tenant lifecycle
tenant.create
tenant.suspend
tenant.configure
tenant.view_health

# Project lifecycle
project.create
project.archive
project.configure
project.view_metadata

# Membership
member.invite
member.assign_project
member.assign_role
member.deactivate

# Connectors
connector.register          (Tenant Admin: create org-level connection)
connector.approve           (Tenant Admin: approve for use)
connector.attach_to_project (Project Admin: bind to project)

# Budget
budget.set_tenant_limit     (Super Admin: overall tenant cap)
budget.allocate_to_project  (Tenant Admin: distribute to projects)
budget.view_project_usage   (Project Admin + functional roles)

# Agents
agent.publish_global        (Super Admin: platform-wide standards)
agent.approve_for_tenant    (Tenant Admin: org-approved agents)
agent.enable_for_project    (Project Admin: activate for project)

# Observability
observability.view_platform (Super Admin: cross-tenant health)
observability.view_tenant   (Tenant Admin: own tenant metrics)
observability.view_project  (Project Admin + functional roles)

# Sensitive data
payload.read                (Sensitive Data Investigator grant only)
audit.export                (Super Admin, Tenant Admin with justification)
policy.override             (Super Admin only, logged)
```

---

### 7.6 Same Action at Three Levels

| Domain | Super Admin | Tenant Admin | Project Admin |
|--------|-------------|--------------|---------------|
| **Budget** | Controls platform billing plans and total tenant limits | Allocates the tenant budget across projects | Monitors and manages spending within the allocated project budget |
| **Connectors** | Enables a connector type (GitHub, Jira) for the platform | Creates and approves the organization's connection instance | Selects the specific repo or board used by their project |
| **Agents** | Defines global agent standards and platform-wide restrictions | Approves which agents and models the organization may use | Enables approved agents for the project and configures project limits |
| **Users** | Manages tenant administrators | Manages organization members and project access | Assigns existing tenant members to project roles |
| **Observability** | Platform-wide infrastructure and cross-tenant operational health | Cost, compliance, adoption, and reliability across their tenant | Workflow, agent runs, failures, cost, and performance within one project |

---

### 7.7 Scope Enforcement

- Observability **automatically scopes** data at the API and data-query level based on the authenticated user's scope — not merely by hiding navigation items
- A **Super Admin** sees platform-wide infrastructure health; tenant data access requires audited support access
- A **Tenant Admin** sees their tenant's cost, adoption, and compliance; project content requires explicit project role
- A **Project-scoped user** sees only their assigned project's data
- **Navigation items** are hidden when the role lacks the relevant permission, but security is enforced at the API layer regardless of UI state

---

## 8. Feature and Story Completion Tracking

### 8.1 Story Delivery Status Lifecycle

```
Draft → Exported → In Progress → Done
                                    ↑
                              Blocked ─┘ (can unblock back to In Progress)
```

| Status | Meaning |
|--------|---------|
| **Draft** | Generated by Spec AI, not yet sent to tracker |
| **Exported** | Pushed to external tracker (e.g., Jira) |
| **In Progress** | Active development work |
| **Done** | Delivered and accepted |
| **Blocked** | Cannot proceed (dependency, decision needed) |

### 8.2 Rollup Mechanics

| Level | Formula | Display |
|-------|---------|---------|
| **Feature** | `done_stories / total_stories` per feature | Chip: "3/5 done - 60%" in Stage 4 |
| **Module** | Sum of feature completions within module | Progress bar in StatusBar |
| **Pipeline Phase** | `done / total` derived from story delivery statuses | Pipeline card in Command Centre |
| **Project** | Weighted average across all pipeline phases | `Project.completion` field |
| **Tenant** | Average of project completions | Tenant overview |

### 8.3 Implementation

- `StoryDeliveryStatus` type in `src/types/specai.ts`
- `src/data/completion.ts` — pure functions: `isStoryDone`, `featureCompletions`, `specAiPhaseFromStories`, `projectCompletionFromPhases`
- `src/context/AppContext.tsx` — reactive `useEffect` hooks updating pipeline and project completion when stories change
- `src/context/useSpecAi.ts` — `setStoryDeliveryStatus()` for manual updates, `withDeliveryStatus()` helper

---

## 9. Spec AI Artifact Package

### 9.1 Overview

Stage 3 generates a comprehensive architecture package with **22 artifacts** across **5 groups**. Eight artifacts include interactive React Flow diagrams for architecture visualization.

### 9.2 Artifact Groups

#### Product (5 artifacts)

| Artifact | Content |
|----------|---------|
| **PRD** | Vision, problem statement, success metrics, scope, biometric login flow |
| **Functional Requirements** | 14 FRs across auth, device management, security, observability |
| **Non-functional Requirements** | Performance (p50/p95), availability (99.95%), security, accessibility, scalability |
| **Business Rules** | 10 rules: auth rules (BR-01–04), enrollment rules (BR-05–07), session rules (BR-08–10) |
| **User Journeys** | 4 journeys: one-tap login, new device register, locked-out fallback, remote revoke |

#### Architecture (6 artifacts, 5 with diagrams)

| Artifact | Content | React Flow Diagram |
|----------|---------|-------------------|
| **Architecture Overview** | Design philosophy, key components, cross-cutting concerns | — |
| **HLD** | Service topology, boundaries table, login flow (8 steps), failure handling, deployment | Yes (9 nodes) |
| **LLD** | Component-level: capability check, challenge issuer, assertion verifier, failure counter, token issuance | Yes (8 nodes) |
| **C4** | 4 levels: system context, container, component, code (class names) | Yes (7 nodes) |
| **Sequence Diagrams** | 3 flows: successful auth, third failure fallback, device registration | Yes (6 nodes) |
| **Integration Map** | Sync/async tables, external dependencies, failure modes | Yes (6 nodes) |

#### Contracts (4 artifacts)

| Artifact | Content |
|----------|---------|
| **OpenAPI** | 4 endpoints: challenge, verify, register, revoke with full request/response schemas |
| **Event Contracts** | CloudEvents envelope, 4 domain events with JSON schemas |
| **ER Model** | 3 entities (CustomerDevice, AuthAttempt, BiometricEnrollment) with full column specs |
| **Schema Notes** | Zero biometric storage principle, indexing strategy, migration strategy, multi-tenant isolation |

#### Decisions (3 artifacts)

| Artifact | Content |
|----------|---------|
| **Technology Recommendation** | Client (React Native), backend (Java, Go, Python), data stores, infrastructure |
| **ADRs** | 5 decisions: gateway reuse, device-bound enrollment, centralized audit, platform biometrics, Redis counters |
| **Risks and Trade-offs** | 3 risks (OS variance, Redis SPOF, replay attack), 3 trade-offs (device-bound vs server, async audit, per-device counter) |

#### Visuals (4 artifacts, all with diagrams)

| Artifact | Content | React Flow Diagram |
|----------|---------|-------------------|
| **Mind Map** | Authentication branches: biometric, PIN, OTP, session management | Yes (13 nodes) |
| **App Flow** | Primary flow with decision points and fallback paths | Yes (7 nodes) |
| **Dependency Graph** | Module dependencies with coupling analysis table | Yes (5 nodes) |
| **System Context** | Actors, systems, boundary definition, data flows | Yes (8 nodes) |

### 9.3 Diagram Node Types

| Type | Color | Use Case |
|------|-------|----------|
| `actor` | Blue (#eff6ff) | External users, persons |
| `system` | Green (#f0fdf4) | Infrastructure systems, event buses |
| `container` | Purple (#faf5ff) | Deployable units, apps |
| `component` | Yellow (#fefce8) | Internal services, modules |
| `decision` | Orange (#fff7ed) | Branch points, conditions |
| `topic` | Sky blue (#f0f9ff) | Mind map topics, categories |
| `default` | Slate (#f8fafc) | Generic nodes |

### 9.4 Stage Gating Logic

```
Lock Stage 1 (Knowledge) → Generates Stage 2 (Understanding synthesis)
Lock Stage 2 (Understanding) → Generates Stage 3 (22 Artifacts)
Lock Stage 3 (Artifacts) → Generates Stage 4 (5 Modules with features)
Lock Stage 4 (Modules) → Generates Stage 5 (7 Stories with acceptance criteria)
```

**Gate blocking conditions:**
- Low-confidence artifacts (`confidence: 'low'`)
- Stale artifacts (upstream decision changed)
- Brownfield mode without legacy architecture uploaded

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Metric | Target |
|--------|--------|
| View load time (lazy chunks) | < 2 seconds |
| Agent execution p95 | < 45 seconds end-to-end |
| Dashboard data refresh | < 500ms |
| React Flow diagram rendering | 60fps pan/zoom |
| Challenge generation (server) | < 50ms |
| Token issuance (server) | < 100ms |

### 10.2 Scalability

| Dimension | Target |
|-----------|--------|
| Tenants per instance | 100+ |
| Concurrent users per tenant | 1,000+ |
| Parallel agent runs | 50+ |
| Observability retention (hot) | 90 days |
| Audit retention (cold) | 7 years |
| Concurrent auth sessions | 50,000 |

### 10.3 Security

- **Data isolation:** Schema-per-tenant in PostgreSQL
- **Payload access:** L5 evidence restricted to explicit `payload.read` grant (Sensitive Data Investigator) — requires justification, time-limited, fully audited. Administrative roles do not inherit content access.
- **Sensitive data:** PII/PHI detection with block/mask/flag actions
- **Encryption:** TLS 1.3 in transit, AES-256-GCM at rest
- **Audit:** Full trail with actor, action, target, timestamp — 7-year retention
- **Authentication:** SSO support, MFA optional, session timeout configurable
- **API security:** Bearer token auth, IP allowlisting, rate limiting
- **Agent governance:** Per-agent token budgets, cost ceilings, action scope limits
- **Scope enforcement:** Permissions enforced at API/data-query layer, not solely via UI visibility

### 10.4 Reliability

| Mechanism | Behavior |
|-----------|----------|
| Agent success rate SLO | >= 97% |
| Provider fallback | 3-tier automatic failover (primary → fallback_1 → fallback_2) |
| Circuit breakers | On all external service calls (Risk Engine, Device Registry) |
| Graceful degradation | PIN auth works during Auth Service outage; auth proceeds without scoring if Risk Engine is down |
| Event durability | Kafka with local buffer on unavailability; replay on recovery |

---

## 11. UI/UX Design System

### 11.1 Theme: iOS Glassmorphism Light

The platform uses an Apple-inspired light theme with frosted glass surfaces.

### 11.2 Typography

| Property | Value |
|----------|-------|
| Font stack | SF Pro Text, SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica Neue, system-ui |
| Base size | 15px |
| Line height | 1.47059 |
| Letter spacing | -0.022em |
| Heading weight | 700 |
| Heading tracking | -0.025em |

### 11.3 Surface Treatment

| Class | Usage |
|-------|-------|
| `glass` | Light translucent panels with backdrop-blur |
| `glass-panel` | Stronger frost for cards and sections |
| `glass-strong` | Modal-level frost |
| `ios-mesh` | Gradient mesh background for the app shell |
| `ios-hairline` | 0.5px borders for subtle separation |

### 11.4 Color System

| Token | Usage | Source |
|-------|-------|--------|
| **Indigo** | Primary actions, active states, tab selection | Apple system blue |
| **Slate** | Text hierarchy, borders, backgrounds | Apple gray |
| **Emerald** | Success, healthy, meeting SLO | Apple green |
| **Amber** | Warning, at-risk, needs attention | Apple orange |
| **Rose** | Error, breached, critical | Apple red |
| **Sky** | Information, links, secondary accent | Apple teal |

### 11.5 Semantic Text Colors

| Class | Hex | Usage |
|-------|-----|-------|
| `.text-label` | #1c1c1e | Primary text (label) |
| `.text-secondary-label` | #3c3c43/60% | Secondary text |
| `.text-tertiary-label` | #3c3c43/30% | Tertiary/disabled text |

### 11.6 Design Principles

- Frosted translucent backgrounds with `backdrop-blur`
- Rounded corners (`rounded-2xl` for cards, `rounded-full` for pills)
- Monospaced numbers in KPI cards for columnar alignment
- CSS-only bar charts (no charting library dependency in the main app)
- Color-coded health indicators: emerald (good), amber (at-risk), rose (breached)
- Compact density — information-rich without excessive scrolling

---

## 12. Implementation Status

### 12.1 Codebase Metrics

| Metric | Value |
|--------|-------|
| Source files | 93 |
| Lines of TypeScript/TSX | ~15,000+ |
| Navigation views | 14 |
| Spec AI artifacts | 22 (with enriched content) |
| React Flow diagrams | 8 interactive |
| Observability panels | 6 |
| RBAC roles | 11 |
| Mock data entities | Tenants, projects, team members, connectors, agents, evaluations, prompts, runs, events |

### 12.2 Branch Status

| Branch | Status | Key Feature |
|--------|--------|-------------|
| `main` | Stable | Core platform, all 14 views, Spec AI 5-stage workspace |
| `feat/module-completion-tracking` | Merged (PR #1) | Story delivery status + rollup to features/projects |
| `feat/ios-glass-light-theme` | Merged (PR #2–#4) | Apple HIG theme, glassmorphism, login page exception |
| `feat/observability-ops-cockpit` | Pushed (current) | Observability 6-tab dashboard + Spec AI enrichment |

### 12.3 Commit History (Recent)

| Hash | Message |
|------|---------|
| `7880dad` | feat: enrich Spec AI artifacts with React Flow diagrams and detailed content |
| `e0e0511` | feat: redesign Observability dashboard with API-aligned widget panels |
| `5f7b9c8` | feat: override Observability cockpit with ops question lenses |
| `0a195bf` | fix: reconcile the observability dataset so no count is a bare assertion |
| `b917fa9` | feat: PDLC Observability — execution data model and five-level cockpit |
| `64cd31d` | feat: align theme colors and type with Apple HIG |
| `f27ae82` | fix: restore previous login sign-in page styling |
| `44067e0` | feat: apply iOS glassmorphism light theme |
| `6c920e6` | feat: derive Spec AI completion from story delivery status |

### 12.4 Feature Completeness

| Feature | Status | Notes |
|---------|--------|-------|
| App shell (header, sidebar, routing) | Complete | Lazy-loaded views, auth gate |
| Login / authentication (mock) | Complete | Role-based login with scope selection |
| Dashboard with KPIs | Complete | Tiles, phase strip, breakdowns |
| Tenant management | Complete | CRUD, budget, status |
| Project management | Complete | Lifecycle, phase tracking, spend |
| Team management | Complete | Roster, shared pool, allocation |
| Connector integrations | Complete | 6 categories, sync types, health |
| Agent Registry | Complete | Catalog, versioning, drift, limits |
| Evaluation framework | Complete | 5 metrics, pass/fail, history |
| Prompt Controls | Complete | Versioning, A/B, review workflow |
| Security & Governance | Complete | RBAC, sessions, sensitive data, audit |
| Command Centre | Complete | Pipeline, blockers, review queue |
| My Tasks | Complete | Personal queue with priority |
| Spec AI (5 stages) | Complete | Knowledge through Stories |
| Spec AI React Flow diagrams | Complete | 8 interactive diagrams |
| Story completion tracking | Complete | Draft→Done lifecycle, rollup |
| Observability (6-tab dashboard) | Complete | API-aligned, visual widgets |
| Observability (5-level drill) | Complete | Run timeline, event evidence |
| Backend API service | Planned | FastAPI, PostgreSQL, Redis |
| Real LLM agent execution | Planned | Multi-provider, graph orchestration |
| Production deployment | Planned | K8s, GitOps, HA |

---

## 13. Roadmap

| Phase | Scope | Timeline | Status |
|-------|-------|----------|--------|
| **Phase 1** | Frontend prototype — full UI with all 14 views, mock data, Spec AI generation pipeline, observability dashboard, iOS theme | Complete | Done |
| **Phase 2** | Backend API service layer (FastAPI), real multi-tenant data persistence, JWT authentication, connector webhooks | Q3 2026 | Planned |
| **Phase 3** | Live LLM agent orchestration, real-time observability ingestion, prompt A/B testing with live traffic | Q4 2026 | Planned |
| **Phase 4** | Production hardening — HA deployment (K8s/EKS), compliance certification, enterprise SSO (SAML/OIDC), pen testing | Q1 2027 | Planned |
| **Phase 5** | Advanced AI capabilities — behavioral drift detection ML, self-healing prompts, cost optimization algorithms, predictive quality scoring | Q2 2027 | Planned |

---

## Appendix A: Connector Categories

| Category | Examples | Sync Type |
|----------|----------|-----------|
| Issue Tracking | Jira, Linear, Azure DevOps | Bidirectional |
| Source Control | GitHub, GitLab, Bitbucket | Read + Push |
| Design | Figma, Sketch | Read |
| CI/CD | Jenkins, GitHub Actions, ArgoCD | Trigger + Status |
| Documentation | Confluence, Notion | Read |
| AI Tools | OpenAI, Anthropic, Azure AI | Bidirectional |

## Appendix B: Observability Event Types

| Type | Evidence Captured |
|------|------------------|
| `llm_call` | Model, prompt version, parameters, tokens, cost, latency, cache, retries, fallback tier |
| `tool_call` | Tool slug, input/output, latency, status, dependency error |
| `state_transition` | From/to step, decision label, condition |
| `error` | Type, source, message, stack reference, retryability |
| `hitl_pause` | Reason, requested action, approver role, duration, resolution |
| `cache_hit` | Cache type/key, avoided call, latency, estimated savings |
| `policy_decision` | Policy, version, decision, reason, enforcement point |
| `evaluation` | Evaluator, dimension, score, threshold, outcome |
| `artifact` | Type, version, source run, acceptance, storage reference |

## Appendix C: Mock Data Summary

| Entity | Count | Source File |
|--------|-------|-------------|
| Tenants | 4 | `mockData.ts` |
| Projects | 5 | `mockData.ts` |
| Team Members | 12 | `mockData.ts` |
| Connectors | 8 | `mockData.ts` |
| Agent Services | 8 | `mockData.ts` |
| Evaluations | 3 | `mockData.ts` |
| Prompt Versions | 4 | `mockData.ts` |
| User Accounts | 6 | `mockData.ts` |
| Observability Runs | 6 | `observabilityData.ts` |
| Agent Executions | 14 | `observabilityData.ts` |
| Observability Events | 32 | `observabilityData.ts` |
| Spec AI Artifacts | 22 | `specAiGenerated.ts` |
| Spec AI Modules | 5 | `specAiGenerated.ts` |
| Spec AI Stories | 7 | `specAiGenerated.ts` |

---

*Document generated from repository implementation at commit `7880dad` on branch `feat/observability-ops-cockpit`.*
