import { CatalogueAgent } from '../types';

/**
 * Agent catalogue fixtures, shaped exactly like the PromptOps `GET /agents`
 * response so the view can be pointed at the real endpoint without touching the
 * components.
 *
 * Ids are the surrogate keys other views already join on (agent usage rollups,
 * module definitions), so cost breakdowns keep resolving their labels. `slug` is
 * the key PromptOps itself invokes an agent by.
 */

/** Registration guard: snake_case, starts with a letter, 2–64 chars. */
export const AGENT_SLUG_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export const AGENT_SLUG_HINT =
  'Lowercase letters, digits and underscores; must start with a letter (2–64 chars).';

/** Modules the catalogue is partitioned by. */
export const AGENT_MODULES = [
  'spec_ai',
  'code_iq',
  'architect_hub',
  'design_ai',
  'intelli_qa_ui_testing',
  'intelli_qa_story_enhancer',
  'release_pulse',
  'platform',
];

/** Orchestration runtime an agent is built on. */
export const AGENT_TYPES = ['langgraph', 'deepagents'];

export const AGENT_PROVIDERS = ['azure_openai', 'anthropic', 'google_vertex', 'openai'];

export const INITIAL_CATALOGUE_AGENTS: CatalogueAgent[] = [
  {
    id: 'agent-specai',
    slug: 'spec_ai_requirement_engine',
    name: 'Requirement Engine',
    module_name: 'spec_ai',
    agent_type: 'langgraph',
    description:
      'Turns raw intake notes and transcripts into structured user stories with Given-When-Then acceptance criteria.',
    is_active: true,
    created_at: '2026-03-14T09:12:44Z',
    provider: 'azure_openai',
    deployment: 'gpt-5-2-prod',
    model: 'gpt-5.2',
    api_version: '2026-05-01-preview',
    fallback_deployment: 'gpt-5-1-prod',
    fallback_model: 'gpt-5.1',
  },
  {
    id: 'agent-spec-story',
    slug: 'spec_ai_story_writer',
    name: 'Story Writer',
    module_name: 'spec_ai',
    agent_type: 'deepagents',
    description:
      'Fans out per module to draft story sets, then reconciles overlaps against the domain model.',
    is_active: true,
    created_at: '2026-03-21T15:40:02Z',
    provider: 'anthropic',
    deployment: 'claude-4-sonnet-prod',
    model: 'claude-4-sonnet',
    api_version: null,
    fallback_deployment: 'gpt-5-2-prod',
    fallback_model: 'gpt-5.2',
  },
  {
    id: 'agent-codeiq',
    slug: 'code_iq_review_engine',
    name: 'Review Engine',
    module_name: 'code_iq',
    agent_type: 'deepagents',
    description:
      'Reviews pull requests against the repository conventions, then proposes patches with unit tests attached.',
    is_active: true,
    created_at: '2026-02-08T11:03:19Z',
    provider: 'anthropic',
    deployment: 'claude-4-sonnet-prod',
    model: 'claude-4-sonnet',
    api_version: null,
    fallback_deployment: null,
    fallback_model: null,
  },
  {
    id: 'agent-arch',
    slug: 'architect_hub_diagrammer',
    name: 'Diagrammer',
    module_name: 'architect_hub',
    agent_type: 'langgraph',
    description:
      'Synthesizes domain entities and API contracts into Mermaid sequence diagrams and OpenAPI 3.1 specs.',
    is_active: true,
    created_at: '2026-01-30T08:55:00Z',
    provider: 'google_vertex',
    deployment: 'gemini-2-5-pro',
    model: 'gemini-2.5-pro',
    api_version: 'v1',
    fallback_deployment: 'gpt-5-2-prod',
    fallback_model: 'gpt-5.2',
  },
  {
    id: 'agent-design',
    slug: 'design_ai_token_synth',
    name: 'Token Synthesizer',
    module_name: 'design_ai',
    agent_type: 'langgraph',
    // Superseded by the UI synthesizer; kept listed so historical runs resolve.
    description: 'Extracts design tokens from Figma libraries and checks WCAG 2.1 AA contrast ratios.',
    is_active: false,
    created_at: '2025-11-19T13:22:41Z',
    provider: 'azure_openai',
    deployment: 'gpt-5-1-prod',
    model: 'gpt-5.1',
    api_version: '2026-01-01-preview',
    fallback_deployment: null,
    fallback_model: null,
  },
  {
    id: 'agent-intelliqa',
    slug: 'intelli_qa_ui_test_author',
    name: 'UI Test Author',
    module_name: 'intelli_qa_ui_testing',
    agent_type: 'deepagents',
    description:
      'Authors Playwright end-to-end specs straight from accepted stories, with selectors resolved against the live DOM.',
    is_active: true,
    created_at: '2026-04-02T10:17:56Z',
    provider: 'azure_openai',
    deployment: 'gpt-5-2-prod',
    model: 'gpt-5.2',
    api_version: '2026-05-01-preview',
    fallback_deployment: 'claude-4-sonnet-prod',
    fallback_model: 'claude-4-sonnet',
  },
  {
    id: 'agent-qa-self-heal',
    slug: 'intelli_qa_ui_self_healer',
    name: 'UI Self Healer',
    module_name: 'intelli_qa_ui_testing',
    agent_type: 'langgraph',
    // Held back after selector-repair regressions on the golden suite.
    description: 'Repairs broken selectors on failing suites and reruns the affected specs.',
    is_active: false,
    created_at: '2026-04-11T07:44:10Z',
    provider: 'azure_openai',
    deployment: 'gpt-5-2-mini',
    model: 'gpt-5.2-mini',
    api_version: '2026-05-01-preview',
    fallback_deployment: null,
    fallback_model: null,
  },
  {
    id: 'agent-qa-story',
    slug: 'intelli_qa_story_enhancer',
    name: 'Story Enhancer',
    module_name: 'intelli_qa_story_enhancer',
    agent_type: 'deepagents',
    description:
      'Enriches stories with edge cases, negative paths and test data hints before they reach the test author.',
    is_active: true,
    created_at: '2026-04-18T16:31:27Z',
    provider: 'anthropic',
    deployment: 'claude-4-haiku-prod',
    model: 'claude-4-haiku',
    api_version: null,
    fallback_deployment: 'gpt-5-2-mini',
    fallback_model: 'gpt-5.2-mini',
  },
  {
    id: 'agent-release',
    slug: 'release_pulse_auditor',
    name: 'Release Auditor',
    module_name: 'release_pulse',
    agent_type: 'langgraph',
    description:
      'Compiles release notes, delta reports and SOC2 sign-off evidence from the deployment ledger.',
    is_active: true,
    created_at: '2026-02-25T12:08:33Z',
    provider: 'google_vertex',
    deployment: 'gemini-2-5-flash',
    model: 'gemini-2.5-flash',
    api_version: 'v1',
    fallback_deployment: null,
    fallback_model: null,
  },
  {
    id: 'agent-platform-router',
    slug: 'platform_model_router',
    name: 'Model Router',
    module_name: 'platform',
    agent_type: 'langgraph',
    description:
      'Routes each invocation to the cheapest deployment that clears the task’s quality floor, and fails over on provider errors.',
    is_active: true,
    created_at: '2026-01-12T09:00:00Z',
    provider: 'azure_openai',
    deployment: 'gpt-5-2-mini',
    model: 'gpt-5.2-mini',
    api_version: '2026-05-01-preview',
    fallback_deployment: 'gpt-5-1-prod',
    fallback_model: 'gpt-5.1',
  },
];
