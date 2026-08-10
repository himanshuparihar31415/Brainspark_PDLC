import React from 'react';
import {
  Activity,
  BookOpen,
  FileText,
  HelpCircle,
  ListTree,
  Lock,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Target,
} from 'lucide-react';

/**
 * The phases, down the side.
 *
 * Along the top they were a row of peers, which is not what they are. Everything
 * that reads the problem — impact, the map, the questions, the artifacts, the
 * brief — sits *inside* Problem Definition. The PRD is what that produces, and
 * the specs are what the PRD decomposes into. A horizontal bar has nowhere to
 * put that, so it flattened the hierarchy and pushed the readings into a second
 * tab strip on the opposite edge of the screen.
 *
 * One rail, one hierarchy, and it collapses to icons when the work needs width.
 */

export type Phase = 'brief' | 'prd' | 'delivery';
export type WsKey = 'impact' | 'system' | 'questions' | 'artifacts' | 'understanding';

/*
 * The order is the order you work in: what does this touch, where does it sit,
 * what is still open, what did that produce, and what do we now believe. The
 * last one is deliberately last — the brief is the thing you sign off, so it
 * comes after the material it was built from.
 */
export const WS_ITEMS: { key: WsKey; label: string; icon: React.ElementType }[] = [
  { key: 'impact', label: 'Change Impact', icon: Activity },
  { key: 'system', label: 'System Map', icon: Network },
  { key: 'questions', label: 'Open Questions', icon: HelpCircle },
  { key: 'artifacts', label: 'Artifacts', icon: FileText },
  { key: 'understanding', label: 'Understanding', icon: BookOpen },
];

export const PhaseRail: React.FC<{
  collapsed: boolean;
  onToggleCollapsed: () => void;
  phase: Phase;
  onPick: (phase: Phase) => void;
  prdOpen: boolean;
  prdHint?: string;
  deliveryOpen: boolean;
  deliveryHint?: string;
  counts: { stories: number };
}> = ({
  collapsed,
  onToggleCollapsed,
  phase,
  onPick,
  prdOpen,
  prdHint,
  deliveryOpen,
  deliveryHint,
  counts,
}) => {
  return (
    <nav className={`rail ${collapsed ? 'mini' : ''}`}>
      <button
        className="rail-fold"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
      </button>

      {/* ── 1 · Problem Definition ──
          Its five readings used to hang under it here as well as being listed in
          the panel. They are stacked in the panel now, so the rail carries the
          three phases and nothing else. */}
      <button
        className={`rail-i group ${phase === 'brief' ? 'on' : ''}`}
        title="Problem Definition"
        onClick={() => onPick('brief')}
      >
        <i className="rail-n">1</i>
        {!collapsed && (
          <>
            <Target size={13} />
            <span>Problem Definition</span>
          </>
        )}
      </button>

      {/* ── 2 · The PRD, once the artifacts behind it are signed off ── */}
      <button
        className={`rail-i group ${phase === 'prd' ? 'on' : ''}`}
        disabled={!prdOpen}
        title={prdOpen ? 'PRD' : prdHint}
        onClick={() => onPick('prd')}
      >
        <i className="rail-n">{prdOpen ? '2' : <Lock size={8} />}</i>
        {!collapsed && (
          <>
            <ScrollText size={13} />
            <span>PRD</span>
          </>
        )}
      </button>

      {/* ── 3 · What the PRD decomposes into ── */}
      <button
        className={`rail-i group ${phase === 'delivery' ? 'on' : ''}`}
        disabled={!deliveryOpen}
        title={deliveryOpen ? 'Specs — modules and stories' : deliveryHint}
        onClick={() => onPick('delivery')}
      >
        <i className="rail-n">{deliveryOpen ? '3' : <Lock size={8} />}</i>
        {!collapsed && (
          <>
            <ListTree size={13} />
            <span>Specs</span>
            {counts.stories > 0 && <i>{counts.stories}</i>}
          </>
        )}
      </button>
      {!collapsed && <span className="rail-sub-note">Modules and Stories</span>}
    </nav>
  );
};
