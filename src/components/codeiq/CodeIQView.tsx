import React, { useEffect, useState } from 'react';
import './codeiq.css';
import { Plug } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Criterion, ThrashReading } from '../../types/codeiq';
import { codeIqProjectFor } from '../../data/codeiq';
import { canManageRepoPolicy } from '../../data/rbac';
import { Surface, SurfaceRail } from './SurfaceRail';
import { ReviewPanel } from './ReviewPanel';
import { DashboardPanel } from './DashboardPanel';
import { SpecQualityPanel } from './SpecQualityPanel';
import { UntrackedPanel } from './UntrackedPanel';
import { RepoPolicyPanel } from './RepoPolicyPanel';

/**
 * CodeIQ — intent-to-code lineage and adjudication.
 *
 * Five surfaces down a rail rather than across a strip. The strip presented them
 * as peers and they are not: three are readings of one lineage — a reviewer, a
 * lead and a PM asking different questions of the same data — and two are the
 * change that lineage could not explain and the configuration deciding what it
 * can explain. See SurfaceRail.
 *
 * There is no top bar. It held the module name, a tagline, the project name and
 * the tabs: a full row of height whose first two repeated what the rail
 * highlights and whose third repeated what the platform header prints two rows
 * above it.
 *
 * In the product these surfaces are not all a portal. The review panel belongs
 * inline in the IDE and on the PR comment — a developer should almost never "go
 * to CodeIQ" — and the copy says so rather than quietly implying otherwise.
 *
 * Everything rendered belongs to one project, read from `currentScope`.
 */
export const CodeIQView: React.FC = () => {
  const {
    currentScope,
    currentRole,
    projects,
    codeIqFor,
    adjudicate,
    sendThrashUpstream,
    setUntrackedPolicy,
    setRepoPolicy,
    navigateTo,
  } = useApp();

  const [surface, setSurface] = useState<Surface>('review');
  const [activeStory, setActiveStory] = useState<string | null>(null);
  const [railMini, setRailMini] = useState(false);

  /* One project at a time — see codeIqProjectFor for why there is no rollup. */
  const project = codeIqProjectFor(currentScope, projects);
  const projectId = project?.id ?? '';
  const { state, indexed, indexedAt, feeds, targets, thrash, instrumentation } =
    codeIqFor(projectId);

  /* A story selected in one project must not survive into the next. */
  useEffect(() => {
    setActiveStory(null);
  }, [projectId]);

  const target = targets.find((t) => t.storyKey === activeStory) ?? targets[0] ?? null;

  const openStory = (storyKey: string) => {
    if (targets.some((t) => t.storyKey === storyKey)) {
      setActiveStory(storyKey);
      setSurface('review');
    }
  };

  const rail = (
    <SurfaceRail
      surface={surface}
      onPick={setSurface}
      collapsed={railMini}
      onToggleCollapsed={() => setRailMini((v) => !v)}
      untrackedCount={state.untracked.length}
      projectName={project?.name}
    />
  );

  /*
   * Three kinds of nothing, and each one asks for something different.
   *
   *   no source feed → connect a repository
   *   not indexed    → wait for the first scan
   *   nothing open   → there is genuinely nothing to adjudicate
   *
   * Collapsing them would be the module's worst failure mode: a clean dashboard
   * where no code was ever read claims the code was checked and cleared, which
   * is the one thing CodeIQ must never imply.
   */
  const blank = !feeds.source ? (
    <div className="cq-blank">
      <Plug size={18} />
      <b>No source control connected for {project?.name ?? 'this project'}.</b>
      <p>
        CodeIQ maps acceptance criteria onto commits, so it needs a repository feed before it can
        say anything. Nothing has been read here — which is not the same as finding no gaps.
      </p>
      <button className="cq-btn primary" onClick={() => navigateTo('Connectors')}>
        Open Connectors
      </button>
    </div>
  ) : !indexed ? (
    <div className="cq-blank">
      <b>{feeds.live.join(' and ')} connected. Nothing indexed yet.</b>
      <p>
        The first scan builds the criterion-to-code map for this project. Until it runs there is
        nothing to adjudicate, and no verdict either way on what has been built.
      </p>
    </div>
  ) : null;

  if (blank) {
    return (
      <div className="cq">
        {rail}
        <div className="cq-body">
          <div className="cq-wrap">{blank}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cq">
      {rail}

      <div className="cq-body">
        {!feeds.agent && (
          <div className="cq-wrap" style={{ paddingBottom: 0 }}>
            <div className="cq-degraded">
              No IDE agent connected. Criterion-to-code mapping still works; the generation
              attempts behind each criterion do not, so lineage and rework signals are blank.
            </div>
          </div>
        )}

        {surface === 'review' ? (
          target ? (
            <ReviewPanel
              target={target}
              targets={targets}
              onPickTarget={setActiveStory}
              onAct={(criterion: Criterion, action: string, secondary: boolean) =>
                adjudicate(projectId, target.storyKey, criterion, action, secondary)
              }
            />
          ) : (
            <div className="cq-wrap">
              <div className="cq-blank">
                <b>Nothing open to adjudicate.</b>
                <p>
                  {/*
                   * Named per repo, because there is no honest single answer: two
                   * repos scanned eleven minutes apart give the project no one time.
                   */}
                  Indexed {indexedAt.map((r) => `${r.repo} ${r.at}`).join(', ') || 'recently'}. No
                  story in this project has code landed against it yet, so there is nothing to map
                  criteria to.
                </p>
              </div>
            </div>
          )
        ) : surface === 'dashboard' ? (
          <DashboardPanel
            instrumentation={instrumentation}
            targets={targets}
            untracked={state.untracked}
            thrash={thrash}
            onSendUpstream={(row: ThrashReading) => sendThrashUpstream(projectId, row)}
            onOpenStory={openStory}
          />
        ) : surface === 'spec' ? (
          <SpecQualityPanel
            thrash={thrash}
            onSendUpstream={(row: ThrashReading) => sendThrashUpstream(projectId, row)}
          />
        ) : surface === 'untracked' ? (
          <UntrackedPanel
            untracked={state.untracked}
            onSetPolicy={(commit, policy) => setUntrackedPolicy(projectId, commit, policy)}
          />
        ) : (
          <RepoPolicyPanel
            repos={state.repos}
            editable={canManageRepoPolicy(currentRole)}
            onChange={(repo, next) => setRepoPolicy(projectId, repo, next)}
          />
        )}
      </div>
    </div>
  );
};
