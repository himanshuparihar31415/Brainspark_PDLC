import { SpecAiState } from '../types/specai';

/**
 * The shape of a complete specification, as a tree.
 *
 * Every leaf is something a specification either says or does not. That is the
 * whole idea: instead of asking "is the brief good yet", the map asks ~350
 * concrete questions and shows which ones the sources already answer.
 *
 * A dozen leaves are marked critical. They are the ones nothing downstream can
 * proceed without, and they are the only ones allowed to interrupt the user in
 * the chat — three hundred and fifty questions is a form, twelve is a
 * conversation.
 */

export interface KNode {
  id: string;
  label: string;
  depth: number;
  /** Blocks progress if unanswered, so it is offered in the thread. */
  critical: boolean;
  children: KNode[];
}

/** Terse source form: a label, or a label with children. `*` marks critical. */
type Raw = string | [string, Raw[]];

const TREE: Raw[] = [
  ['Context', [
    ['Current System', [
      'System purpose',
      'Existing capabilities',
      ['Technology stack', [
        'Frontend technologies',
        'Backend technologies',
        'Data technologies',
        'Infrastructure technologies',
      ]],
      ['Current architecture', [
        'Application components',
        'Service boundaries',
        'Data flow',
        'External integrations',
      ]],
      ['Known limitations', [
        'Functional limitations',
        'Technical limitations',
        'Operational limitations',
      ]],
    ]],
    ['Users', [
      ['Primary users', ['*User roles', 'User goals', 'Usage frequency']],
      ['Secondary users', ['Administrators', 'Support teams', 'Reviewers']],
      ['Internal stakeholders', ['Product team', 'Engineering team', 'Operations team']],
      ['External stakeholders', ['Customers', 'Partners', 'Regulators']],
    ]],
    ['Existing Workflow', [
      'Workflow trigger',
      ['Current steps', ['User activities', 'System activities', 'Manual activities']],
      'Decision points',
      ['Handoffs', ['Team handoffs', 'System handoffs', 'Approval handoffs']],
      'Exceptions',
      'Workflow completion',
    ]],
    ['Business Background', [
      '*Business objective',
      'Business process',
      'Customer need',
      'Market or operational context',
      'Strategic priority',
      ['Expected business impact', [
        'Revenue impact',
        'Cost impact',
        'Efficiency impact',
        'Customer experience impact',
      ]],
    ]],
  ]],

  ['Problem Definition', [
    ['Current Behaviour', [
      '*What currently happens',
      'When it happens',
      'Where it happens',
      'Who experiences it',
      'Frequency',
      'Reproduction conditions',
    ]],
    ['Expected Behaviour', [
      '*Desired user outcome',
      'Desired system response',
      'Expected workflow',
      'Expected data state',
      'Expected completion criteria',
    ]],
    ['Pain Points', [
      ['User pain points', ['Time consumed', 'Confusing interactions', 'Repeated effort']],
      ['Business pain points', ['Revenue loss', 'Operational cost', 'Compliance exposure']],
      ['Technical pain points', ['Instability', 'Technical debt', 'Poor maintainability']],
      ['Operational pain points', ['Manual intervention', 'Support burden', 'Monitoring gaps']],
    ]],
    ['Root Causes', [
      'Process causes',
      'Product causes',
      'Technology causes',
      'Data causes',
      'Integration causes',
      'Human or operational causes',
    ]],
    ['Problem Impact', [
      'Affected users',
      'Affected systems',
      'Affected workflows',
      'Business severity',
      'Technical severity',
    ]],
    ['Problem Boundaries', [
      '*Included problem areas',
      '*Excluded problem areas',
      'Related problems',
      'Symptoms not addressed',
    ]],
  ]],

  ['Inputs', [
    ['User Inputs', [
      'Text inputs',
      'Form inputs',
      'Selection inputs',
      'Voice or media inputs',
      'File uploads',
      'Validation requirements',
    ]],
    ['Data Sources', [
      ['Internal databases', [
        'Transactional databases',
        'Analytical databases',
        'Search or vector stores',
      ]],
      'External databases',
      'Data warehouses',
      'Data lakes',
      'Cached data',
      'Reference data',
    ]],
    ['APIs', [
      ['Internal APIs', ['REST APIs', 'GraphQL APIs', 'RPC services']],
      'External APIs',
      'Authentication APIs',
      'Webhooks',
      ['API constraints', ['Rate limits', 'Payload limits', 'Availability limits']],
    ]],
    ['Files', [
      'Supported file types',
      'File size limits',
      'File validation',
      'Parsing rules',
      'Storage requirements',
      'Retention requirements',
    ]],
    ['Events', [
      'User-triggered events',
      'System-triggered events',
      'Scheduled events',
      'Integration events',
      'Queue messages',
      'Event payloads',
    ]],
    ['Input Quality', [
      '*Required fields',
      'Optional fields',
      'Validation rules',
      'Missing data handling',
      'Duplicate data handling',
      'Invalid input handling',
    ]],
  ]],

  ['Functional Requirements', [
    ['Core Capabilities', [
      '*Capability definition',
      'User action',
      'System response',
      'Required inputs',
      'Generated outputs',
      'Completion conditions',
    ]],
    ['Business Rules', [
      'Eligibility rules',
      'Calculation rules',
      'Approval rules',
      'Routing rules',
      'Access rules',
      'Rule priority',
    ]],
    ['Validations', [
      'Field validations',
      'Data validations',
      'Cross-field validations',
      'Business validations',
      'Integration validations',
      'State validations',
    ]],
    ['Exceptions', [
      'User errors',
      'System errors',
      'Integration failures',
      'Data failures',
      'Timeout scenarios',
      'Recovery behaviour',
    ]],
    ['Edge Cases', [
      'Empty state',
      'Partial data',
      'Duplicate request',
      'Concurrent action',
      'Invalid state transition',
      'Maximum limits',
      'Minimum limits',
    ]],
    ['Permissions', [
      'Role-based access',
      'Attribute-based access',
      'Read permissions',
      'Write permissions',
      'Administrative permissions',
      'Restricted actions',
    ]],
    ['Functional Outputs', [
      'User-facing output',
      'Data output',
      'Notification output',
      'Audit output',
      'API response',
      'Downloadable output',
    ]],
  ]],

  ['Experience', [
    ['User Journeys', [
      'Journey entry point',
      'Primary flow',
      'Alternate flow',
      'Failure flow',
      'Recovery flow',
      'Journey exit point',
    ]],
    ['Screens', [
      'Landing screen',
      'Input screen',
      'Processing state',
      'Result screen',
      'Error screen',
      'Empty state',
      'Administrative screen',
    ]],
    ['Interactions', [
      'Click actions',
      'Form actions',
      'Drag and drop',
      'Search and filtering',
      'Navigation',
      'Confirmation actions',
      'Undo or retry actions',
    ]],
    ['Content', [
      'Labels',
      'Instructions',
      'Help text',
      'Error messages',
      'Success messages',
      'Empty-state messages',
    ]],
    ['Notifications', [
      'In-app notifications',
      'Email notifications',
      'Push notifications',
      'SMS notifications',
      'Trigger conditions',
      'Notification preferences',
    ]],
    ['Accessibility', [
      'Keyboard navigation',
      'Screen-reader support',
      'Colour contrast',
      'Text scaling',
      'Focus management',
      'Accessible labels',
    ]],
    ['Responsive Behaviour', [
      'Desktop',
      'Tablet',
      'Mobile',
      'Small screen behaviour',
      'Cross-browser behaviour',
    ]],
  ]],

  ['System Design', [
    ['Frontend', [
      'Application structure',
      'Page components',
      'Shared components',
      'State management',
      'Client-side validation',
      'API communication',
      'Error handling',
    ]],
    ['Backend', [
      'Service responsibilities',
      'API endpoints',
      'Business logic',
      'Authentication',
      'Authorization',
      'Background processing',
      'Error handling',
    ]],
    ['Database', [
      'Data entities',
      'Relationships',
      'Schema design',
      'Indexes',
      'Queries',
      'Transactions',
      'Data migration',
      'Data retention',
    ]],
    ['Integrations', [
      'Integration purpose',
      'Source system',
      'Target system',
      'Request and response mapping',
      'Authentication mechanism',
      'Retry strategy',
      'Failure handling',
    ]],
    ['Services', [
      'Application services',
      'Domain services',
      'Shared services',
      'Third-party services',
      'Scheduled services',
      'Event-processing services',
    ]],
    ['Infrastructure', [
      'Hosting environment',
      'Compute resources',
      'Storage resources',
      'Network configuration',
      'Load balancing',
      'Secrets management',
      'Environment separation',
    ]],
    ['Architecture Patterns', [
      'Monolith',
      'Modular monolith',
      'Microservices',
      'Event-driven architecture',
      'Serverless architecture',
      'Layered architecture',
    ]],
    ['Data Flow', [
      'Input flow',
      'Processing flow',
      'Storage flow',
      'Integration flow',
      'Output flow',
      'Failure flow',
    ]],
  ]],

  ['Quality Attributes', [
    ['Performance', [
      '*Response-time target',
      'Processing-time target',
      'Throughput target',
      'Concurrent-user target',
      'Query-performance target',
      'Page-load target',
    ]],
    ['Security', [
      'Authentication',
      'Authorization',
      ['Data encryption', ['Encryption in transit', 'Encryption at rest']],
      'Secrets management',
      'Input sanitization',
      'Vulnerability protection',
      'Security logging',
    ]],
    ['Scalability', [
      'Horizontal scaling',
      'Vertical scaling',
      'Database scaling',
      'Queue scaling',
      'Storage scaling',
      'Traffic growth assumptions',
    ]],
    ['Reliability', [
      'Failure tolerance',
      'Retry behaviour',
      'Data consistency',
      'Transaction integrity',
      'Recovery behaviour',
      'Disaster recovery',
    ]],
    ['Availability', [
      'Uptime target',
      'Planned downtime',
      'Recovery time objective',
      'Recovery point objective',
      'Failover strategy',
      'Redundancy',
    ]],
    ['Maintainability', [
      'Code modularity',
      'Coding standards',
      'Documentation',
      'Test coverage',
      'Dependency management',
      'Upgrade strategy',
    ]],
    ['Observability', ['Logging', 'Metrics', 'Tracing', 'Alerts', 'Dashboards', 'Audit trail']],
    ['Usability', [
      'Learnability',
      'Task completion time',
      'Error prevention',
      'User feedback',
      'User satisfaction',
    ]],
  ]],

  ['Constraints', [
    ['Technology', [
      'Mandatory technologies',
      'Prohibited technologies',
      'Supported versions',
      'Approved libraries',
      'Cloud restrictions',
      'Browser or device support',
    ]],
    ['Budget', [
      'Development budget',
      'Infrastructure budget',
      'Licensing budget',
      'Support budget',
      'Cost-per-transaction target',
    ]],
    ['Timeline', [
      'Target start date',
      '*MVP deadline',
      'Release deadline',
      'Dependency deadlines',
      'Milestone dates',
    ]],
    ['Compliance', [
      '*Regulatory requirements',
      'Data privacy requirements',
      'Data residency requirements',
      'Audit requirements',
      'Accessibility requirements',
      'Industry standards',
    ]],
    ['Existing Architecture', [
      'Shared services',
      'Existing APIs',
      'Legacy systems',
      'Authentication platform',
      'Data platform',
      'Deployment platform',
    ]],
    ['Organisational Constraints', [
      'Team capacity',
      'Skill availability',
      'Ownership boundaries',
      'Approval process',
      'Support availability',
    ]],
    ['Operational Constraints', [
      'Release windows',
      'Maintenance windows',
      'Support hours',
      'Environment availability',
      'Vendor dependency',
    ]],
  ]],

  ['Risks and Unknowns', [
    ['Open Questions', [
      'Business questions',
      'User questions',
      'Functional questions',
      'Technical questions',
      'Data questions',
      'Operational questions',
    ]],
    ['Assumptions', [
      'Business assumptions',
      'User assumptions',
      'Technology assumptions',
      'Data assumptions',
      'Integration assumptions',
      'Capacity assumptions',
    ]],
    ['Dependencies', [
      'Team dependencies',
      'System dependencies',
      'API dependencies',
      'Data dependencies',
      'Vendor dependencies',
      'Approval dependencies',
    ]],
    ['Conflicts', [
      'Source conflicts',
      'Requirement conflicts',
      'Scope conflicts',
      'Technology conflicts',
      'Timeline conflicts',
      'Stakeholder conflicts',
    ]],
    ['Decisions Required', [
      '*Product decisions',
      'Design decisions',
      'Architecture decisions',
      'Technology decisions',
      'Data decisions',
      'Release decisions',
    ]],
    ['Risks', [
      'Product risks',
      'Delivery risks',
      'Technical risks',
      'Security risks',
      'Data risks',
      'Compliance risks',
      'Operational risks',
    ]],
    ['Mitigation', [
      'Preventive actions',
      'Detection mechanisms',
      'Contingency plans',
      'Fallback approach',
      'Risk owner',
    ]],
  ]],

  ['Validation', [
    ['Acceptance Criteria', [
      '*Positive scenarios',
      'Negative scenarios',
      'Business-rule scenarios',
      'Permission scenarios',
      'Error scenarios',
      'Edge-case scenarios',
    ]],
    ['Test Scenarios', [
      'Unit testing',
      'Component testing',
      'API testing',
      'Integration testing',
      'UI testing',
      'Data testing',
      'Performance testing',
      'Security testing',
      'User acceptance testing',
    ]],
    ['Success Metrics', [
      '*Adoption metrics',
      'Completion metrics',
      'Performance metrics',
      'Quality metrics',
      'Business metrics',
      'Customer satisfaction metrics',
    ]],
    ['Monitoring', [
      'Application monitoring',
      'Infrastructure monitoring',
      'API monitoring',
      'Database monitoring',
      'Error monitoring',
      'User-journey monitoring',
      'Business monitoring',
    ]],
    ['Release Criteria', [
      'Functional readiness',
      'Test completion',
      'Defect threshold',
      'Performance readiness',
      'Security approval',
      'Documentation readiness',
      'Operational readiness',
    ]],
    ['Post-release Validation', [
      'Smoke testing',
      'Production verification',
      'Metric comparison',
      'User feedback',
      'Incident tracking',
      'Rollback decision',
    ]],
  ]],

  ['Connected Outputs', [
    ['HTML Prototype', [
      'Static HTML',
      'Interactive HTML',
      'Clickable user flow',
      'Mock data',
      'Preview link',
    ]],
    ['Application Preview', [
      'Local preview',
      'Development environment',
      'Staging environment',
      'Feature preview',
      'Embedded preview',
    ]],
    ['Figma Design', [
      'Wireframes',
      'High-fidelity screens',
      'Components',
      'User-flow frames',
      'Design tokens',
      'Prototype link',
    ]],
    ['API Specification', [
      'Endpoint definitions',
      'Request schema',
      'Response schema',
      'Authentication',
      'Error codes',
      'OpenAPI document',
    ]],
    ['Architecture Diagram', [
      'Context diagram',
      'Container diagram',
      'Component diagram',
      'Sequence diagram',
      'Data-flow diagram',
      'Deployment diagram',
      'Integration diagram',
    ]],
    ['Code Repository', [
      'Repository link',
      'Branch',
      'Pull request',
      'Commit',
      'Code module',
      'Configuration files',
    ]],
    ['Test Suite', [
      'Test cases',
      'Automated scripts',
      'Test data',
      'Execution results',
      'Defect links',
      'Coverage report',
    ]],
    ['Documentation', [
      'Product requirements',
      'Technical specifications',
      'User stories',
      'Runbooks',
      'User guides',
      'Release notes',
    ]],
    ['Deployment', [
      'Build pipeline',
      'Deployment pipeline',
      'Environment',
      'Release version',
      'Deployment status',
      'Production URL',
      'Rollback version',
    ]],
  ]],
];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const build = (raw: Raw, depth: number, parentId: string): KNode => {
  const [rawLabel, kids] = typeof raw === 'string' ? [raw, [] as Raw[]] : raw;
  const critical = rawLabel.startsWith('*');
  const label = critical ? rawLabel.slice(1) : rawLabel;
  const id = `${parentId}/${slug(label)}`;
  return {
    id,
    label,
    depth,
    critical,
    children: kids.map((k) => build(k, depth + 1, id)),
  };
};

export const KNOWLEDGE_ROOT: KNode = {
  id: 'problem',
  label: 'Problem',
  depth: 0,
  critical: false,
  children: TREE.map((r) => build(r, 1, 'problem')),
};

/* ─────────────────────────── coverage ─────────────────────────── */

export type Coverage = 'answered' | 'inferred' | 'open';

export interface LeafState {
  status: Coverage;
  /** What the sources say, when they say anything. */
  answer?: string;
  /** Which source it came from. */
  from?: string;
  /** What to ask when they do not. */
  question: string;
}

/** Turns a leaf label into something a person can answer. */
export const questionFor = (node: KNode, path: string[]): string => {
  const parent = path[path.length - 2] ?? '';
  const l = node.label.toLowerCase();
  if (/target|limit|threshold|budget|deadline|date/.test(l))
    return `What is the ${l}${parent ? ` for ${parent.toLowerCase()}` : ''}?`;
  if (/^(who|user roles|customers|partners|regulators)/.test(l))
    return `Who are the ${l}?`;
  if (/risks?$|causes?$|questions?$|assumptions?$/.test(l))
    return `What are the ${l}${parent ? ` under ${parent.toLowerCase()}` : ''}?`;
  return `What is the ${l}${parent ? ` for ${parent.toLowerCase()}` : ''}?`;
};

/**
 * Whether the material already covers a leaf.
 *
 * Mock resolution, deliberately shallow: the leaf's words are matched against
 * what the agent has actually written into the reading and the understanding.
 * A hit backed by a source reads as answered; a hit backed by the agent's own
 * reasoning reads as inferred; no hit is an open gap.
 */
export const leafState = (node: KNode, state: SpecAiState, path: string[]): LeafState => {
  const question = questionFor(node, path);
  const words = node.label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  if (words.length === 0) return { status: 'open', question };

  const lines = state.brief ? Object.values(state.brief.bands).flat() : [];
  const hit = lines.find((l) => {
    const t = l.text.toLowerCase();
    return words.some((w) => t.includes(w));
  });

  if (hit) {
    const sourced = hit.evidenceClass === 'Source fact' || hit.evidenceClass === 'User decision';
    return {
      status: sourced ? 'answered' : 'inferred',
      answer: hit.text,
      from: hit.sourceSummary || undefined,
      question,
    };
  }

  const section = state.understanding.find(
    (u) => u.body.trim() !== '' && words.some((w) => u.body.toLowerCase().includes(w))
  );
  if (section) return { status: 'inferred', answer: section.body, question };

  return { status: 'open', question };
};

export interface Rollup {
  answered: number;
  inferred: number;
  open: number;
  total: number;
  /** Critical leaves still open beneath this node. */
  criticalOpen: number;
}

/** Coverage for a node's whole subtree, so a collapsed branch still reports. */
export const rollup = (node: KNode, state: SpecAiState, path: string[] = []): Rollup => {
  const here = [...path, node.label];
  if (node.children.length === 0) {
    const s = leafState(node, state, here);
    return {
      answered: s.status === 'answered' ? 1 : 0,
      inferred: s.status === 'inferred' ? 1 : 0,
      open: s.status === 'open' ? 1 : 0,
      total: 1,
      criticalOpen: node.critical && s.status === 'open' ? 1 : 0,
    };
  }
  return node.children
    .map((c) => rollup(c, state, here))
    .reduce(
      (a, b) => ({
        answered: a.answered + b.answered,
        inferred: a.inferred + b.inferred,
        open: a.open + b.open,
        total: a.total + b.total,
        criticalOpen: a.criticalOpen + b.criticalOpen,
      }),
      { answered: 0, inferred: 0, open: 0, total: 0, criticalOpen: 0 }
    );
};

/**
 * Concrete answers for the leaves worth asking about.
 *
 * A question with options is objective: it can be settled with a click and the
 * answer means the same thing to everyone. An open text box is where a
 * specification goes to become vague.
 */
const OPTIONS: Record<string, string[]> = {
  'user-roles': [
    'All returning mobile users',
    'Users with a registered device',
    'Users who explicitly opt in',
  ],
  'included-problem-areas': ['Login only', 'Login and enrolment', 'Login, enrolment and recovery'],
  'excluded-problem-areas': [
    'Password reset unchanged',
    'Desktop login out of scope',
    'OAuth gateway unchanged',
  ],
  'mvp-deadline': ['End of this quarter', 'End of next quarter', 'No fixed date'],
  'response-time-target': ['Under 500ms', 'Under 1 second', 'Under 2 seconds'],
  'regulatory-requirements': ['PSD2 strong authentication', 'GDPR only', 'No specific regime'],
  'business-objective': [
    'Reduce login abandonment',
    'Reduce support cost',
    'Improve security posture',
  ],
  'what-currently-happens': [
    'Users abandon at password recovery',
    'Users retry and lock the account',
    'Users switch to desktop',
  ],
  'desired-user-outcome': ['Sign in without a password', 'Recover access unaided', 'Both'],
  'capability-definition': ['Biometric sign-in', 'Biometric enrolment', 'Both'],
  'required-fields': ['Device id and consent', 'Device id only', 'Consent only'],
  'positive-scenarios': ['Enrol then sign in', 'Sign in on a known device', 'Both'],
  'adoption-metrics': ['Enrolment rate', 'Sign-in success rate', 'Support ticket volume'],
  'product-decisions': ['Optional enrolment', 'Mandatory for eligible users', 'Pilot group first'],
};

export const optionsFor = (node: KNode): string[] =>
  OPTIONS[node.id.split('/').pop() ?? ''] ?? ['Yes', 'No', 'Not decided yet'];

/** Every critical leaf still unanswered — the only ones allowed into the chat. */
export const criticalGaps = (
  state: SpecAiState
): { node: KNode; path: string[]; question: string }[] => {
  const out: { node: KNode; path: string[]; question: string }[] = [];
  const walk = (n: KNode, path: string[]) => {
    const here = [...path, n.label];
    if (n.children.length === 0) {
      if (n.critical && leafState(n, state, here).status === 'open') {
        out.push({ node: n, path: here, question: questionFor(n, here) });
      }
      return;
    }
    n.children.forEach((c) => walk(c, here));
  };
  KNOWLEDGE_ROOT.children.forEach((c) => walk(c, ['Problem']));
  return out;
};
