import { DELTA, DeltaLine } from './specDelta';
import { nodeById } from './specSystemModel';

/**
 * What the delta lands on, expressed the way each system organises itself.
 *
 * A change is not a flat list of affected things — it has the shape of whatever
 * you are looking at it through. In Jira it is an epic with stories and tasks
 * beneath it; in the codebase it is repositories with modules, schema and tests.
 * Both are projections of the same delta, so they cannot drift apart.
 */

/* ─────────────────────────── Jira ─────────────────────────── */

export interface JiraTask {
  key: string;
  title: string;
  /** The delta line this came from. */
  from: string;
  blocked?: string;
}

export interface JiraStory {
  key: string;
  title: string;
  points: number;
  tasks: JiraTask[];
}

export interface JiraEpic {
  key: string;
  title: string;
  status: string;
  stories: JiraStory[];
}

/** Delta areas grouped into the stories they would be written as. */
const STORY_OF: Record<DeltaLine['area'], { key: string; title: string }> = {
  Frontend: { key: 'AUTH-61', title: 'Biometric enrolment journey' },
  Backend: { key: 'AUTH-62', title: 'Biometric authentication service' },
  API: { key: 'AUTH-63', title: 'Biometric challenge contract' },
  Data: { key: 'AUTH-64', title: 'Profile and device model' },
  Security: { key: 'AUTH-65', title: 'Device binding and revocation' },
  Observability: { key: 'AUTH-66', title: 'Authentication telemetry' },
  Test: { key: 'AUTH-67', title: 'Biometric test coverage' },
};

const POINTS: Record<DeltaLine['area'], number> = {
  Frontend: 8,
  Backend: 8,
  API: 5,
  Data: 5,
  Security: 5,
  Observability: 3,
  Test: 5,
};

export const jiraImpact = (): JiraEpic => {
  const byStory = new Map<string, JiraStory>();

  DELTA.forEach((d, i) => {
    const meta = STORY_OF[d.area];
    const story =
      byStory.get(meta.key) ??
      ({ key: meta.key, title: meta.title, points: POINTS[d.area], tasks: [] } as JiraStory);

    story.tasks.push({
      key: `${meta.key}-${story.tasks.length + 1}`,
      title: d.text,
      from: d.id,
      blocked: d.blockedBy,
    });

    byStory.set(meta.key, story);
    void i;
  });

  return {
    key: 'AUTH-40',
    title: 'Authentication',
    status: 'In refinement',
    stories: [...byStory.values()],
  };
};

/* ─────────────────────────── Code ─────────────────────────── */

export type ModuleKind = 'code' | 'schema' | 'config' | 'test';

export interface ImpactedModule {
  path: string;
  kind: ModuleKind;
  change: string;
  from: string;
}

export interface ImpactedRepo {
  repo: string;
  branchHint: string;
  modules: ImpactedModule[];
}

/** Which repository a system node lives in. */
const REPO_OF = (nodeId: string): string | undefined => {
  if (nodeId.startsWith('scr-') || nodeId === 'app-mobile' || nodeId.startsWith('flow-'))
    return 'mobile-app';
  if (nodeId === 'svc-auth' || nodeId.startsWith('api-') || nodeId.startsWith('ent-'))
    return 'authentication-service';
  if (nodeId === 'svc-device' || nodeId === 'svc-profile') return 'device-registry';
  if (nodeId.startsWith('tst-')) return 'authentication-service';
  return undefined;
};

/** A plausible path for the thing being changed, and what kind of file it is. */
const PATH_OF = (nodeId: string): { path: string; kind: ModuleKind } => {
  const n = nodeById(nodeId);
  const label = n?.label ?? nodeId;
  if (nodeId.startsWith('ent-'))
    return { path: `db/migrations/__add_${label.toLowerCase()}_fields.sql`, kind: 'schema' };
  if (nodeId.startsWith('api-'))
    return { path: `openapi/auth.yaml → ${label}`, kind: 'config' };
  if (nodeId.startsWith('tst-')) return { path: `src/test/${label.replace(/\s+/g, '')}.java`, kind: 'test' };
  if (nodeId.startsWith('scr-'))
    return { path: `src/screens/${label.replace(/\s+/g, '')}.tsx`, kind: 'code' };
  if (nodeId.startsWith('flow-'))
    return { path: `src/navigation/${label.replace(/\s+/g, '')}.ts`, kind: 'code' };
  return { path: `src/main/${label.replace(/\s+/g, '')}.java`, kind: 'code' };
};

export const codeImpact = (): ImpactedRepo[] => {
  const repos = new Map<string, ImpactedRepo>();

  for (const d of DELTA) {
    for (const nodeId of d.touches) {
      const repo = REPO_OF(nodeId);
      if (!repo) continue;
      const { path, kind } = PATH_OF(nodeId);

      const entry =
        repos.get(repo) ??
        ({
          repo,
          branchHint: `feature/${repo === 'mobile-app' ? 'biometric-enrolment' : 'biometric-auth'}`,
          modules: [],
        } as ImpactedRepo);

      if (!entry.modules.some((m) => m.path === path)) {
        entry.modules.push({ path, kind, change: d.text, from: d.id });
      }
      repos.set(repo, entry);
    }
  }

  /* Schema first — a migration gates everything that reads it. */
  const order: ModuleKind[] = ['schema', 'config', 'code', 'test'];
  for (const r of repos.values()) {
    r.modules.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  }

  return [...repos.values()];
};
