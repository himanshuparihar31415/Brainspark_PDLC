import React from 'react';
import {
  FileSearch,
  GitCommitHorizontal,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Sparkles,
} from 'lucide-react';

/**
 * The surfaces, down the side.
 *
 * Along the top they were a row of five peers, which is not what they are.
 * Review, Dashboard and Spec quality are three readings of one lineage — a
 * reviewer, a lead and a PM asking different questions of the same data. Untracked
 * and Repo policy are not readings at all: one is the change the lineage could
 * not explain, the other is the configuration that decides what it can explain.
 * A flat strip says all five are the same kind of thing.
 *
 * Same rail idiom as Spec AI v2's phases, for the same reason and with the same
 * fold-to-icons behaviour when the work wants the width.
 */

export type Surface = 'review' | 'dashboard' | 'spec' | 'untracked' | 'repos';

const READINGS: { key: Surface; label: string; icon: React.ElementType }[] = [
  { key: 'review', label: 'Review', icon: FileSearch },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'spec', label: 'Spec quality', icon: Sparkles },
];

const SETTINGS: { key: Surface; label: string; icon: React.ElementType }[] = [
  { key: 'untracked', label: 'Untracked', icon: GitCommitHorizontal },
  { key: 'repos', label: 'Repo policy', icon: Settings2 },
];

export const SurfaceRail: React.FC<{
  surface: Surface;
  onPick: (surface: Surface) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Unjoined commits. A count worth carrying because it only ever means work. */
  untrackedCount: number;
  /** Named here rather than in a bar of its own — see CodeIQView. */
  projectName?: string;
}> = ({ surface, onPick, collapsed, onToggleCollapsed, untrackedCount, projectName }) => {
  const item = (
    { key, label, icon: Icon }: { key: Surface; label: string; icon: React.ElementType },
    group: boolean
  ) => (
    <button
      key={key}
      className={`cq-rail-i ${surface === key ? 'on' : ''} ${group ? 'group' : ''}`}
      onClick={() => onPick(key)}
      title={collapsed ? label : undefined}
    >
      <Icon size={14} />
      {!collapsed && <span>{label}</span>}
      {key === 'untracked' && untrackedCount > 0 && <i>{untrackedCount}</i>}
    </button>
  );

  return (
    <nav className={`cq-rail ${collapsed ? 'mini' : ''}`}>
      <button
        className="cq-rail-fold"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Expand' : 'Collapse'}
        aria-label={collapsed ? 'Expand the rail' : 'Collapse the rail'}
      >
        {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
      </button>

      {READINGS.map((r, i) => item(r, i === 0))}
      {SETTINGS.map((s, i) => item(s, i === 0))}

      {/*
       * The project sits at the foot of the rail rather than in a bar across the
       * top, which is where Spec AI v2 puts it too. It is reference, not a
       * heading — and the platform header two rows above already names it, so it
       * is here only because a workspace should be able to say what it is
       * looking at without the reader glancing up.
       */}
      {!collapsed && projectName && (
        <span className="cq-rail-foot">
          <span>Lineage for</span>
          {projectName}
        </span>
      )}
    </nav>
  );
};
