import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2 } from 'lucide-react';
import { SpecAiState } from '../../types/specai';
import {
  Coverage,
  KNode,
  KNOWLEDGE_ROOT,
  LeafState,
  leafState,
  rollup,
} from '../../data/specKnowledgeTree';
import { KnowledgeSource, LeafAnswer } from './orchestrator';

/**
 * The specification as a tree that fills itself in.
 *
 * Three things make it workable at ~590 nodes: only expanded branches are laid
 * out, every node reports the coverage beneath it so a collapsed branch still
 * shows where the holes are, and a branch whose systems have not come back yet
 * says so rather than looking the same as an empty one.
 */

const DENSITY = {
  panel: { row: 27, col: 168 },
  full: { row: 34, col: 250 },
};

/** Suggested answers, so a gap is a choice rather than a blank field. */
const OPTIONS: Record<string, string[]> = {
  'user-roles': [
    'All returning mobile users',
    'Users with a registered device',
    'Users who explicitly opt in',
  ],
  'included-problem-areas': [
    'Login journey only',
    'Login and enrolment',
    'Login, enrolment and recovery',
  ],
  'excluded-problem-areas': [
    'Password reset stays as it is',
    'Desktop login is out of scope',
    'The OAuth gateway is unchanged',
  ],
  'mvp-deadline': ['End of this quarter', 'End of next quarter', 'No fixed date yet'],
  'response-time-target': ['Under 500ms', 'Under 1 second', 'Under 2 seconds'],
  'regulatory-requirements': ['PSD2 strong authentication applies', 'GDPR only', 'No specific regime'],
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
  'desired-user-outcome': [
    'Sign in without typing a password',
    'Recover access without support',
    'Both',
  ],
};

const optionsFor = (node: KNode): string[] => {
  const tail = node.id.split('/').pop() ?? '';
  return OPTIONS[tail] ?? ['Yes', 'No', 'Not decided yet'];
};

type Payload = {
  node: KNode;
  path: string[];
  open: boolean;
  leaf?: LeafState;
  answered?: LeafAnswer;
  roll: ReturnType<typeof rollup>;
  waiting?: string;
};

const DOT: Record<Coverage, string> = {
  answered: '#16794f',
  inferred: '#3538cd',
  open: '#d0d5dd',
};

const MapNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as unknown as Payload;
  const isLeaf = d.node.children.length === 0;
  const pct = d.roll.total
    ? Math.round(((d.roll.answered + d.roll.inferred) / d.roll.total) * 100)
    : 0;
  const confirmed = Boolean(d.answered);
  const gap = d.node.critical && d.leaf?.status === 'open' && !confirmed;

  return (
    <div
      className={`kn ${isLeaf ? 'leaf' : 'branch'} ${gap ? 'gap' : ''} ${confirmed ? 'ok' : ''}`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span
        className="kdot"
        style={{
          background: isLeaf
            ? confirmed
              ? '#0f766e'
              : DOT[d.leaf?.status ?? 'open']
            : 'transparent',
        }}
      />
      <span className="klabel">{d.node.label}</span>

      {isLeaf ? (
        gap && <span className="kcrit">answer</span>
      ) : (
        <span className="kmeta">
          {/* A branch still waiting on a system is not the same as an empty one. */}
          {d.waiting ? (
            <em className="kwait">{d.waiting}</em>
          ) : (
            <>
              {d.roll.criticalOpen > 0 && <b className="kred">{d.roll.criticalOpen}!</b>}
              {d.roll.answered + d.roll.inferred}/{d.roll.total}
              <i className="kbar">
                <i style={{ width: `${pct}%` }} />
              </i>
            </>
          )}
          {d.open ? '−' : '+'}
        </span>
      )}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = { kn: MapNode };

export const KnowledgeMap: React.FC<{
  state: SpecAiState;
  answers: Record<string, LeafAnswer>;
  pendingFor: (branchLabel: string) => KnowledgeSource[];
  onDiscuss: (question: string, path: string[]) => void;
  onAnswer: (nodeId: string, value: string, branchLabel: string) => void;
  onSelect?: (path: string[], leaf?: LeafState) => void;
  compact?: boolean;
  onExpand?: () => void;
}> = ({
  state,
  answers,
  pendingFor,
  onDiscuss,
  onAnswer,
  onSelect,
  compact = false,
  onExpand,
}) => {
  const { row: ROW, col: COL } = compact ? DENSITY.panel : DENSITY.full;

  const [open, setOpen] = useState<Set<string>>(
    () => new Set(['problem', KNOWLEDGE_ROOT.children[0].id])
  );
  const [picked, setPicked] = useState<{ node: KNode; path: string[]; leaf?: LeafState } | null>(
    null
  );
  const [choice, setChoice] = useState('');

  const toggle = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    let row = 0;

    const walk = (n: KNode, path: string[], parentId?: string): number => {
      const here = [...path, n.label];
      const isOpen = open.has(n.id);
      const isLeaf = n.children.length === 0;
      let centre = row;

      if (!isLeaf && isOpen) {
        const kids = n.children.map((c) => walk(c, here, n.id));
        centre = (kids[0] + kids[kids.length - 1]) / 2;
      } else {
        row += 1;
      }

      /* Branch status comes from the systems that feed it. */
      const pending = !isLeaf && n.depth === 1 ? pendingFor(n.label) : [];
      const waiting =
        pending.length === 1
          ? `waiting for ${pending[0].label.toLowerCase()}`
          : pending.length > 1
          ? `waiting for ${pending.length} systems`
          : undefined;

      ns.push({
        id: n.id,
        type: 'kn',
        position: { x: n.depth * COL, y: centre * ROW },
        data: {
          node: n,
          path: here,
          open: isOpen,
          leaf: isLeaf ? leafState(n, state, here) : undefined,
          answered: answers[n.id],
          roll: rollup(n, state, path),
          waiting,
        } as unknown as Record<string, unknown>,
        draggable: false,
      });

      if (parentId) {
        es.push({
          id: `${parentId}->${n.id}`,
          source: parentId,
          target: n.id,
          type: 'smoothstep',
          style: { stroke: '#e4e7ec', strokeWidth: 1.5 },
        });
      }
      return centre;
    };

    walk(KNOWLEDGE_ROOT, []);
    return { nodes: ns, edges: es };
  }, [open, state, answers, pendingFor, ROW, COL]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, rf: Node) => {
      const d = rf.data as unknown as Payload;
      if (d.node.children.length > 0) {
        toggle(d.node.id);
        return;
      }
      setPicked({ node: d.node, path: d.path, leaf: d.leaf });
      setChoice('');
      /* Selecting a node moves the conversation to it. */
      onSelect?.(d.path, d.leaf);
    },
    [toggle, onSelect]
  );

  const total = rollup(KNOWLEDGE_ROOT, state);
  const confirmedCount = Object.keys(answers).length;

  return (
    <div className={`kmap ${compact ? 'compact' : ''}`}>
      {compact ? (
        <div className="kmap-head compact">
          <span className="kmini-t">Knowledge map</span>
          <span className="kmini-s">
            {total.answered + total.inferred + confirmedCount}/{total.total}
            {total.criticalOpen > 0 && <b className="kred"> · {total.criticalOpen} to answer</b>}
          </span>
          {onExpand && (
            <button className="kexpand" title="Open full screen" onClick={onExpand}>
              <Maximize2 size={12} />
            </button>
          )}
        </div>
      ) : (
        <div className="kmap-head">
          <div>
            <h1>Knowledge map</h1>
            <p>Built from your connected systems. Click a branch to open it, a gap to answer it.</p>
          </div>
          <div className="kmap-stats">
            <span>
              <b>{total.answered}</b> from systems
            </span>
            <span>
              <b>{total.inferred}</b> inferred
            </span>
            <span>
              <b>{confirmedCount}</b> you confirmed
            </span>
            <span>
              <b>{total.open}</b> open
            </span>
          </div>
        </div>
      )}

      <div className="kmap-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: compact ? 0.08 : 0.15, maxZoom: 1 }}
          minZoom={0.25}
          maxZoom={1.4}
          proOptions={{ hideAttribution: true }}
          onNodeClick={onNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
        >
          <Background color="#e4e7ec" gap={22} size={1} />
          {!compact && <Controls showInteractive={false} />}
        </ReactFlow>
      </div>

      {/* A leaf: what the systems found, or a choice to make. */}
      {picked && (
        <div className="kdrawer">
          <div className="kdrawer-head">
            <span className="kpath">{picked.path.slice(1).join(' › ')}</span>
            <button onClick={() => setPicked(null)}>×</button>
          </div>
          <h4>{picked.node.label}</h4>

          {answers[picked.node.id] ? (
            <>
              <span className="kstate confirmed">You confirmed</span>
              <p className="kans">{answers[picked.node.id].value}</p>
              <p className="kfrom">
                Re-read {answers[picked.node.id].affected.length} connected systems
              </p>
            </>
          ) : picked.leaf?.status === 'open' ? (
            <>
              <p className="kq">{picked.leaf.question}</p>
              <p className="knone">No confirmed answer across your systems.</p>
              <div className="kopts">
                {optionsFor(picked.node).map((o) => (
                  <label key={o} className={choice === o ? 'on' : ''}>
                    <input
                      type="radio"
                      name="kopt"
                      checked={choice === o}
                      onChange={() => setChoice(o)}
                    />
                    {o}
                  </label>
                ))}
              </div>
              <div className="kacts">
                <button
                  className="chip selected"
                  disabled={!choice}
                  onClick={() => {
                    onAnswer(picked.node.id, choice, picked.path[1]);
                    setPicked(null);
                  }}
                >
                  Save answer
                </button>
                <button
                  className="chip soft"
                  onClick={() => {
                    onDiscuss(picked.leaf!.question, picked.path);
                    setPicked(null);
                  }}
                >
                  Discuss in chat
                </button>
              </div>
            </>
          ) : (
            <>
              <span className={`kstate ${picked.leaf?.status}`}>
                {picked.leaf?.status === 'answered' ? 'From your systems' : 'Inferred, not stated'}
              </span>
              <p className="kans">{picked.leaf?.answer}</p>
              {picked.leaf?.from && <p className="kfrom">{picked.leaf.from}</p>}
              <div className="kacts">
                <button
                  className="chip soft"
                  onClick={() => {
                    onDiscuss(picked.leaf!.question, picked.path);
                    setPicked(null);
                  }}
                >
                  Discuss in chat
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
