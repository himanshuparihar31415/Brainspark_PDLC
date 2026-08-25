import React, { useEffect, useMemo, useState } from 'react';
import './codeiq.css';
import { FileCode2, FileSearch, GitCommitHorizontal, Plug, ScrollText, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Criterion, ThrashReading } from '../../types/codeiq';
import { codeIqProjectFor, countBy } from '../../data/codeiq';
import { criterionRef } from '../../data/specai';
import { CommandPalette, PaletteItem } from '../ui';
import { ProvenanceStrip } from './ProvenanceStrip';
import { canManageRepoPolicy } from '../../data/rbac';
import { Surface, SurfaceRail } from './SurfaceRail';
import { ReviewSurface } from './ReviewSurface';
import { SpecQualityPanel } from './SpecQualityPanel';
import { UntrackedPanel } from './UntrackedPanel';
import { RepoPolicyPanel } from './RepoPolicyPanel';

/**
 * CodeIQ — intent-to-code lineage and adjudication.
 *
 * Four surfaces down a rail. Two are readings of one lineage — Review, which is
 * the stories and the criteria behind whichever one is picked, and Spec quality,
 * which asks whether those criteria could be built at all. Two are not readings:
 * the change the lineage could not explain, and the configuration deciding what
 * it can explain. See SurfaceRail.
 *
 * Review and Dashboard used to be separate, which made the story list a place you
 * left in order to use it. See ReviewSurface.
 *
 * The top bar is one row and holds two things: a search affordance and a way
 * into the audit trail. The bar this replaced held the module name, a tagline,
 * the project name and the tabs — a full row whose first two repeated what the
 * rail highlights and whose third repeated what the platform header prints two
 * rows above it. It came back only because a search field needs somewhere to
 * live, and nothing else was let back in with it.
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
    tolerateUntracked,
    setRepoPolicy,
    navigateTo,
  } = useApp();

  const [surface, setSurface] = useState<Surface>('review');
  const [activeStory, setActiveStory] = useState<string | null>(null);
  const [railMini, setRailMini] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* One project at a time — see codeIqProjectFor for why there is no rollup. */
  const project = codeIqProjectFor(currentScope, projects);
  const projectId = project?.id ?? '';
  const reading = codeIqFor(projectId);
  const { state, indexed, indexedAt, feeds, targets, thrash, instrumentation } = reading;

  /* A story selected in one project must not survive into the next. */
  useEffect(() => {
    setActiveStory(null);
  }, [projectId]);

  /*
   * The keyboard shortcut.
   *
   * Bound inside this workspace rather than app-wide, which is a deliberate
   * half-measure: the palette component has sat in components/ui since it was
   * written and is mounted nowhere, so this is its first use. Owning the shortcut
   * in one module is honest about that. Promoting it to the shell is a separate
   * change, because it has to decide what every other view contributes.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const target = targets.find((t) => t.storyKey === activeStory) ?? targets[0] ?? null;

  const openStory = (storyKey: string) => {
    if (targets.some((t) => t.storyKey === storyKey)) {
      setActiveStory(storyKey);
      setSurface('review');
    }
  };

  /*
   * What the palette can find: every story, every criterion, every unjoined
   * commit. Built from the reading rather than the fixtures, so it holds exactly
   * what this project's surfaces would show and nothing from another project.
   */
  const paletteItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [];

    for (const t of targets) {
      items.push({
        id: t.storyId,
        label: t.storyKey + ' \u2014 ' + t.title,
        description: t.owner + ' \u00b7 ' + t.repo + ' \u00b7 ' + t.pr,
        category: 'Stories',
        icon: <FileSearch size={14} />,
        action: () => openStory(t.storyKey),
      });

      for (const c of t.criteria) {
        items.push({
          id: criterionRef(t.storyKey, c.id),
          label: t.storyKey + ' \u00b7 ' + c.id,
          description: c.then,
          category: 'Criteria',
          icon: <FileCode2 size={14} />,
          action: () => openStory(t.storyKey),
        });
      }
    }

    for (const u of state.untracked) {
      items.push({
        id: u.commit,
        label: u.commit + ' \u2014 ' + u.message,
        description: u.author + ' \u00b7 ' + u.repo,
        category: 'Untracked commits',
        icon: <GitCommitHorizontal size={14} />,
        action: () => setSurface('untracked'),
      });
    }

    return items;
  }, [targets, state.untracked]);

  /*
   * Counts only where the number is outstanding work.
   *
   * Review carries criteria with no code, the module's highest-accuracy output.
   * Spec quality carries rework not yet raised, because a signal already sent
   * upstream is no longer anybody's to act on here. Repo policy carries none: it
   * holds settings, not a backlog.
   */
  const railCounts = {
    review: targets.reduce((n, t) => n + countBy(t.criteria).missing, 0),
    spec: thrash.filter((r) => !r.sentUpstream).length,
    untracked: state.untracked.length,
  };

  const rail = (
    <SurfaceRail
      surface={surface}
      onPick={setSurface}
      collapsed={railMini}
      onToggleCollapsed={() => setRailMini((v) => !v)}
      counts={railCounts}
      projectName={project?.name}
      provenance={<ProvenanceStrip reading={reading} collapsed={railMini} />}
    />
  );

  /*
   * A slim bar, back for one reason: a search field needs somewhere to live.
   *
   * The bar that was removed held the module name, a tagline, the project name
   * and the tabs \u2014 a full row repeating what the rail highlights and what the
   * platform header prints two rows above it. This holds a search affordance and
   * a way into the audit trail, and nothing already on screen elsewhere.
   */
  const topBar = (
    <div className="cq-top">
      <button className="cq-search" onClick={() => setPaletteOpen(true)}>
        <Search size={13} />
        <span>Search stories, criteria, commits</span>
        <kbd>{'\u2318'}K</kbd>
      </button>

      <button
        className="cq-btn"
        onClick={() => navigateTo('Security')}
        title="Every adjudication and policy change on this project is recorded in the platform audit trail"
      >
        <ScrollText size={12} />
        Export audit
      </button>
    </div>
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

  const palette = (
    <CommandPalette
      items={paletteItems}
      isOpen={paletteOpen}
      onClose={() => setPaletteOpen(false)}
      placeholder="Search stories, criteria, commits"
    />
  );

  if (blank) {
    return (
      <div className="cq">
        {rail}
        <div className="cq-body">
          {/*
           * The bar stays.
           *
           * Dropping it here was a mistake: an empty project lost the search
           * field and the audit link along with its data, so a project with
           * nothing indexed looked like a module that had failed to load rather
           * than one with nothing to say yet. The chrome is not part of the
           * report.
           */}
          {topBar}
          <div className="cq-wrap">{blank}</div>
        </div>
        {palette}
      </div>
    );
  }

  return (
    <div className="cq">
      {rail}

      <div className="cq-body">
        {/*
         * The degraded-feed banner used to sit here, full width, above every
         * surface. It is a state on the provenance strip in the rail now: the
         * fact belongs in the chrome rather than costing a row of page height on
         * every screen it was not about.
         */}
        {topBar}

        {surface === 'review' ? (
          targets.length > 0 ? (
            <ReviewSurface
              targets={targets}
              activeStoryKey={activeStory}
              onPickStory={setActiveStory}
              onAct={(criterion: Criterion, action: string, secondary: boolean) =>
                target &&
                adjudicate(projectId, target.storyKey, criterion, action, secondary)
              }
              untracked={state.untracked}
              onOpenSurface={setSurface}
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
        ) : surface === 'spec' ? (
          <SpecQualityPanel
            thrash={thrash}
            onSendUpstream={(row: ThrashReading) => sendThrashUpstream(projectId, row)}
          />
        ) : surface === 'untracked' ? (
          <UntrackedPanel
            untracked={state.untracked}
            repos={state.repos}
            onSetPolicy={(commit, policy) => setUntrackedPolicy(projectId, commit, policy)}
            onTolerateMany={(commits) => tolerateUntracked(projectId, commits)}
          />
        ) : (
          <RepoPolicyPanel
            repos={state.repos}
            editable={canManageRepoPolicy(currentRole)}
            onChange={(repo, next) => setRepoPolicy(projectId, repo, next)}
          />
        )}
      </div>

      {palette}
    </div>
  );
};
