import React from 'react';
import {
  FileSearch,
  GitCommitHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Sparkles,
} from 'lucide-react';

/**
 * The surfaces, down the side.
 *
 * Four items in two groups. Review and Spec quality are readings of one history
 * — a reviewer or lead asking whether it was built, a PM asking whether it was
 * specifiable. Untracked and Repo policy are not readings at all: one is the
 * change the lineage could not explain, the other is the configuration that
 * decides what it can explain.
 *
 * Review absorbed the Dashboard surface. They were a list of stories and the
 * panel that received one, so keeping them apart meant the list vanished the
 * moment it was used — see ReviewSurface.
 *
 * Same rail idiom as Spec AI v2's phases, for the same reason and with the same
 * fold-to-icons behaviour when the work wants the width.
 */

export type Surface = 'review' | 'spec' | 'untracked' | 'repos';

interface Item {
  key: Surface;
  label: string;
  icon: React.ElementType;
}

const READINGS: Item[] = [
  { key: 'review', label: 'Review', icon: FileSearch },
  { key: 'spec', label: 'Spec quality', icon: Sparkles },
];

const SETTINGS: Item[] = [
  { key: 'untracked', label: 'Unlinked commits', icon: GitCommitHorizontal },
  { key: 'repos', label: 'Repo settings', icon: Settings2 },
];

/**
 * What each count means, spelled out for the screen reader and the tooltip.
 *
 * A bare number beside a word is not a label — "Review 6" could as easily be six
 * stories as six gaps, and the two would be acted on differently.
 */
const COUNT_NOTE: Partial<Record<Surface, (n: number) => string>> = {
  review: (n) => `${n} ${n === 1 ? 'criterion' : 'criteria'} with no code behind it`,
  spec: (n) => `${n} ${n === 1 ? 'criterion' : 'criteria'} rewritten repeatedly, not yet raised`,
  untracked: (n) => `${n} ${n === 1 ? 'commit' : 'commits'} not linked to any story`,
};

/*
 * The unit beside the count, where there is room for one.
 *
 * A bare `6` next to the word Review could as easily be six stories as six gaps,
 * and the two are acted on differently. Only Review gets one: `5 rewrites` beside
 * the longer "Spec quality" pushed the label onto a second line, and a rail item
 * that wraps costs more clarity than the unit buys. The full sentence is on the
 * tooltip either way.
 */
const COUNT_UNIT: Partial<Record<Surface, string>> = {
  review: 'gaps',
};

export const SurfaceRail: React.FC<{
  surface: Surface;
  onPick: (surface: Surface) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /**
   * Outstanding work per surface. Only where the number means work — Repo policy
   * has settings, not a backlog, so it never carries one, and a zero renders
   * nothing rather than a reassuring badge.
   */
  counts: Partial<Record<Surface, number>>;
  /** Named here rather than in a bar of its own — see CodeIQView. */
  projectName?: string;
  /** The provenance strip. Passed in so the rail owns placement, not state. */
  provenance?: React.ReactNode;
}> = ({ surface, onPick, collapsed, onToggleCollapsed, counts, projectName, provenance }) => {
  const item = ({ key, label, icon: Icon }: Item, group: boolean) => {
    const n = counts[key] ?? 0;
    const note = n > 0 ? COUNT_NOTE[key]?.(n) : undefined;
    return (
      <button
        key={key}
        className={`cq-rail-i ${surface === key ? 'on' : ''} ${group ? 'group' : ''}`}
        onClick={() => onPick(key)}
        title={collapsed ? [label, note].filter(Boolean).join(' — ') : note}
      >
        <Icon size={14} />
        {!collapsed && <span>{label}</span>}
        {n > 0 && (
          <i aria-label={note}>
            {n}
            {!collapsed && COUNT_UNIT[key] && <em>{COUNT_UNIT[key]}</em>}
          </i>
        )}
      </button>
    );
  };

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

      {/* Where this reading came from, before any of the readings. */}
      {provenance}

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
