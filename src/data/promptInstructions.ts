import { PromptInstruction, PromptTemplate } from '../types';

/**
 * Prompt instruction fixtures, shaped like the PromptOps
 * `GET /prompt-instructions` response. Versions are append-only per
 * (module, workflow, template_name, project_id) key: the highest version_number is
 * not necessarily the active one, because a rollback reactivates an earlier row.
 *
 * `playwright_author.j2` is deliberately left rolled back to v1 with a v2 present,
 * so the rollback and delete guards both have something real to act on.
 */

/** Jinja skeletons on disk — the valid (module, workflow, template_name) triples. */
export const INITIAL_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    module: 'spec_ai',
    workflow: 'requirement_analysis',
    template_name: 'system_instructions.j2',
    path: 'prompts/spec_ai/requirement_analysis/system_instructions.j2',
  },
  {
    module: 'spec_ai',
    workflow: 'story_generation',
    template_name: 'story_writer.j2',
    path: 'prompts/spec_ai/story_generation/story_writer.j2',
  },
  {
    module: 'code_iq',
    workflow: 'code_review',
    template_name: 'reviewer_system.j2',
    path: 'prompts/code_iq/code_review/reviewer_system.j2',
  },
  {
    module: 'intelli_qa_ui_testing',
    workflow: 'test_authoring',
    template_name: 'playwright_author.j2',
    path: 'prompts/intelli_qa_ui_testing/test_authoring/playwright_author.j2',
  },
  {
    module: 'intelli_qa_story_enhancer',
    workflow: 'enhancement',
    template_name: 'enhancer_system.j2',
    path: 'prompts/intelli_qa_story_enhancer/enhancement/enhancer_system.j2',
  },
  {
    module: 'platform',
    workflow: 'model_routing',
    template_name: 'router_policy.j2',
    path: 'prompts/platform/model_routing/router_policy.j2',
  },
];

export const INITIAL_PROMPT_INSTRUCTIONS: PromptInstruction[] = [
  // ── spec_ai / requirement_analysis — global, three versions, v3 live
  {
    id: 'pi-spec-req-1',
    module: 'spec_ai',
    workflow: 'requirement_analysis',
    template_name: 'system_instructions.j2',
    user_id: 'sarah.jenkins@incedolabs.com',
    version_number: 1,
    instructions_text:
      'You are the requirement analyst for BrainSpark PDLC.\n' +
      'Read the intake sources and produce a structured requirement set.\n' +
      'Never invent business rules that no source states.',
    is_active: false,
    created_at: '2026-05-04T10:22:00Z',
  },
  {
    id: 'pi-spec-req-2',
    module: 'spec_ai',
    workflow: 'requirement_analysis',
    template_name: 'system_instructions.j2',
    user_id: 'sarah.jenkins@incedolabs.com',
    version_number: 2,
    instructions_text:
      'You are the requirement analyst for BrainSpark PDLC.\n' +
      'Read the intake sources and produce a structured requirement set.\n' +
      'Never invent business rules that no source states.\n' +
      'Every requirement must cite the source span it came from. Unsourced statements are dropped, not guessed at.',
    is_active: false,
    created_at: '2026-06-11T14:05:00Z',
  },
  {
    id: 'pi-spec-req-3',
    module: 'spec_ai',
    workflow: 'requirement_analysis',
    template_name: 'system_instructions.j2',
    user_id: 'david.chen@incedolabs.com',
    version_number: 3,
    instructions_text:
      'You are the requirement analyst for BrainSpark PDLC.\n' +
      'Read the intake sources and produce a structured requirement set.\n' +
      'Never invent business rules that no source states.\n' +
      'Every requirement must cite the source span it came from. Unsourced statements are dropped, not guessed at.\n' +
      'Where two sources conflict, raise a conflict for a human rather than choosing between them.\n' +
      'Tag any requirement touching customer data with its classification (PII, PHI, Restricted).',
    is_active: true,
    created_at: '2026-07-22T09:47:00Z',
  },

  // ── spec_ai / requirement_analysis — project override on Mobile Banking V2
  {
    id: 'pi-spec-req-mb-1',
    module: 'spec_ai',
    workflow: 'requirement_analysis',
    template_name: 'system_instructions.j2',
    user_id: 'elena.rostova@incedolabs.com',
    version_number: 1,
    instructions_text:
      'Inherit the global requirement analyst instructions.\n' +
      'Additionally: attach FINRA SEC Rule 17a-4 retention tags to every audit-trail requirement.',
    is_active: false,
    created_at: '2026-06-28T11:30:00Z',
    project_id: 'p-mobile-v2',
  },
  {
    id: 'pi-spec-req-mb-2',
    module: 'spec_ai',
    workflow: 'requirement_analysis',
    template_name: 'system_instructions.j2',
    user_id: 'elena.rostova@incedolabs.com',
    version_number: 2,
    instructions_text:
      'Inherit the global requirement analyst instructions.\n' +
      'Additionally: attach FINRA SEC Rule 17a-4 retention tags to every audit-trail requirement.\n' +
      'Biometric and step-up authentication flows must state their fallback path explicitly.',
    is_active: true,
    created_at: '2026-07-30T16:12:00Z',
    project_id: 'p-mobile-v2',
  },

  // ── spec_ai / story_generation — global, two versions
  {
    id: 'pi-spec-story-1',
    module: 'spec_ai',
    workflow: 'story_generation',
    template_name: 'story_writer.j2',
    user_id: 'sarah.jenkins@incedolabs.com',
    version_number: 1,
    instructions_text:
      'Write stories in the form "As a <role>, I want <capability>, so that <outcome>".\n' +
      'Each story carries Given-When-Then acceptance criteria.',
    is_active: false,
    created_at: '2026-05-19T08:40:00Z',
  },
  {
    id: 'pi-spec-story-2',
    module: 'spec_ai',
    workflow: 'story_generation',
    template_name: 'story_writer.j2',
    user_id: 'priya.sharma@incedolabs.com',
    version_number: 2,
    instructions_text:
      'Write stories in the form "As a <role>, I want <capability>, so that <outcome>".\n' +
      'Each story carries Given-When-Then acceptance criteria.\n' +
      'Split any story whose criteria exceed six clauses — a story that large is two stories.\n' +
      'Output must be Jira-importable without hand editing.',
    is_active: true,
    created_at: '2026-07-16T13:58:00Z',
  },

  // ── code_iq / code_review — global, two versions
  {
    id: 'pi-code-review-1',
    module: 'code_iq',
    workflow: 'code_review',
    template_name: 'reviewer_system.j2',
    user_id: 'michael.chang@incedolabs.com',
    version_number: 1,
    instructions_text:
      'Review the diff for correctness first, style second.\n' +
      'Cite file and line for every finding. No finding without a concrete failure path.',
    is_active: false,
    created_at: '2026-04-27T15:11:00Z',
  },
  {
    id: 'pi-code-review-2',
    module: 'code_iq',
    workflow: 'code_review',
    template_name: 'reviewer_system.j2',
    user_id: 'michael.chang@incedolabs.com',
    version_number: 2,
    instructions_text:
      'Review the diff for correctness first, style second.\n' +
      'Cite file and line for every finding. No finding without a concrete failure path.\n' +
      'Match the conventions of the surrounding code rather than importing your own.\n' +
      'Flag any new dependency separately — those need a human decision.',
    is_active: true,
    created_at: '2026-07-09T10:26:00Z',
  },

  // ── intelli_qa_ui_testing / test_authoring — rolled back: v1 live with v2 present
  {
    id: 'pi-qa-author-1',
    module: 'intelli_qa_ui_testing',
    workflow: 'test_authoring',
    template_name: 'playwright_author.j2',
    user_id: 'jordan.vance@incedolabs.com',
    version_number: 1,
    instructions_text:
      'Author Playwright specs from accepted stories only.\n' +
      'Prefer role-based locators. Never assert on generated class names.',
    is_active: true,
    created_at: '2026-06-02T09:05:00Z',
  },
  {
    id: 'pi-qa-author-2',
    module: 'intelli_qa_ui_testing',
    workflow: 'test_authoring',
    template_name: 'playwright_author.j2',
    user_id: 'rachel.torres@incedolabs.com',
    version_number: 2,
    instructions_text:
      'Author Playwright specs from accepted stories only.\n' +
      'Prefer role-based locators. Never assert on generated class names.\n' +
      'Generate a data fixture per spec and tear it down in afterEach.\n' +
      'Retry flaky network waits up to twice before failing the spec.',
    // Rolled back on 2026-07-31 after the fixture teardown left orphaned records.
    is_active: false,
    created_at: '2026-07-25T17:39:00Z',
  },

  // ── intelli_qa_ui_testing / test_authoring — project override on AI Wealth Advisor
  {
    id: 'pi-qa-author-wa-1',
    module: 'intelli_qa_ui_testing',
    workflow: 'test_authoring',
    template_name: 'playwright_author.j2',
    user_id: 'rachel.torres@incedolabs.com',
    version_number: 1,
    instructions_text:
      'Inherit the global Playwright author instructions.\n' +
      'Additionally: never use live market data in assertions — pin the recorded fixture feed.',
    is_active: true,
    created_at: '2026-07-12T12:20:00Z',
    project_id: 'p-wealth-ai',
  },

  // ── intelli_qa_story_enhancer / enhancement — global, single version
  {
    id: 'pi-qa-enhance-1',
    module: 'intelli_qa_story_enhancer',
    workflow: 'enhancement',
    template_name: 'enhancer_system.j2',
    user_id: 'jordan.vance@incedolabs.com',
    version_number: 1,
    instructions_text:
      'Enrich each story with negative paths, boundary values and test data hints.\n' +
      'Do not change the story’s intent or add scope — annotate only.',
    is_active: true,
    created_at: '2026-06-20T11:14:00Z',
  },

  // ── platform / model_routing — global, two versions
  {
    id: 'pi-platform-route-1',
    module: 'platform',
    workflow: 'model_routing',
    template_name: 'router_policy.j2',
    user_id: 'priyanka.deshmukh@incedolabs.com',
    version_number: 1,
    instructions_text:
      'Route to the cheapest deployment that clears the task quality floor.\n' +
      'Fail over to the configured fallback on provider error or timeout.',
    is_active: false,
    created_at: '2026-03-08T07:50:00Z',
  },
  {
    id: 'pi-platform-route-2',
    module: 'platform',
    workflow: 'model_routing',
    template_name: 'router_policy.j2',
    user_id: 'priyanka.deshmukh@incedolabs.com',
    version_number: 2,
    instructions_text:
      'Route to the cheapest deployment that clears the task quality floor.\n' +
      'Fail over to the configured fallback on provider error or timeout.\n' +
      'Never fail over across providers for requests carrying Restricted data.\n' +
      'Record the routing decision and its reason on every invocation.',
    is_active: true,
    created_at: '2026-07-28T18:02:00Z',
  },
];
