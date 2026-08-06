import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2 } from 'lucide-react';
import {
  AUTHORITY_COPY,
  EDGES,
  Fact,
  Reading,
  SysKind,
  SysNode,
  factsFor,
  reconcile,
} from '../../data/specSystemModel';
import { scopeNodes } from '../../data/specDelta';

/**
 * The system as it actually is, narrowed to the problem.
 *
 * Laid out in columns by kind, because that is how someone reasons about a change:
 * which journey, which screen, which endpoint, which service, which data, and
 * what covers it. Nodes the problem statement is asking for but that do not exist
 * yet are drawn as outlines, so the gap between the system and the request is
 * visible rather than described.
 */

const COLUMNS: SysKind[] = ['ticket', 'flow', 'screen', 'endpoint', 'service', 'entity', 'test'];

const COL_LABEL: Record<SysKind, string> = {
  ticket: 'Tickets',
  flow: 'Journeys',
  screen: 'Screens',
  endpoint: 'APIs',
  service: 'Services',
  entity: 'Data',
  test: 'Tests',
  app: 'Apps',
  repo: 'Repos',
};

const KIND_TINT: Record<SysKind, string> = {
  ticket: '#0f766e',
  flow: '#6941c6',
  screen: '#3538cd',
  endpoint: '#0e7490',
  service: '#16794f',
  entity: '#92670b',
  test: '#b42318',
  app: '#667085',
  repo: '#667085',
};

type Payload = {
  dim?: boolean;
  node: SysNode;
  readings: Reading[];
  facts: Fact[];
};

const SysNodeBox: React.FC<NodeProps> = ({ data }) => {
  const d = data as unknown as Payload;
  const drift = d.readings.some((r) => r.drift);
  return (
    <div
      className={`sn ${d.node.proposed ? 'proposed' : ''} ${drift ? 'drift' : ''} ${
        d.dim ? 'dim' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span className="sn-k" style={{ background: KIND_TINT[d.node.kind] }} />
      <span className="sn-body">
        <span className="sn-l">{d.node.label}</span>
        {d.node.detail && <span className="sn-d">{d.node.detail}</span>}
      </span>
      {drift && <span className="sn-flag">drift</span>}
      {d.facts.length > 0 && !drift && <span className="sn-n">{d.facts.length}</span>}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = { sn: SysNodeBox };

export const SystemMap: React.FC<{
  onDiscuss: (question: string, path: string[]) => void;
  onSelect?: (path: string[], evidence?: string) => void;
  compact?: boolean;
  onExpand?: () => void;
  /** Kinds this persona reasons in; the rest recede rather than disappear. */
  focus?: SysKind[];
}> = ({ onDiscuss, onSelect, compact = false, onExpand, focus }) => {
  const [picked, setPicked] = useState<SysNode | null>(null);
  /* The system as it is, or the system the delta would leave behind. */
  const [view, setView] = useState<'current' | 'proposed'>('current');
  /* Click a legend swatch to isolate a layer. */
  const [only, setOnly] = useState<SysKind | null>(null);
  const readings = useMemo(() => reconcile(), []);
  const all = useMemo(() => scopeNodes(), []);
  /* Current focus hides what does not exist yet; proposed shows the whole
     target picture, with the additions marked. */
  const inScope = useMemo(
    () => (view === 'current' ? all.filter((n) => !n.proposed) : all),
    [all, view]
  );

  const { nodes, edges } = useMemo(() => {
    const ids = new Set(inScope.map((n) => n.id));
    const ns: Node[] = [];
    const colX = compact ? 156 : 216;
    const rowY = compact ? 42 : 52;

    COLUMNS.forEach((kind, col) => {
      const members = inScope.filter((n) => n.kind === kind);
      members.forEach((n, i) => {
        ns.push({
          id: n.id,
          type: 'sn',
          position: { x: col * colX, y: i * rowY },
          data: {
            dim: Boolean(
              (only && n.kind !== only) || (!only && focus && !focus.includes(n.kind))
            ),
            node: n,
            readings: readings.filter((r) => r.nodeId === n.id),
            facts: factsFor(n.id),
          } as unknown as Record<string, unknown>,
          draggable: false,
        });
      });
    });

    const es: Edge[] = EDGES.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => ({
      id: `${e.from}->${e.to}`,
      source: e.from,
      target: e.to,
      type: 'smoothstep',
      style: { stroke: '#e4e7ec', strokeWidth: 1.4 },
    }));

    return { nodes: ns, edges: es };
  }, [inScope, readings, compact, focus, only]);

  const proposedCount = all.filter((n) => n.proposed).length;

  const onNodeClick = useCallback(
    (_: React.MouseEvent, rf: Node) => {
      const d = rf.data as unknown as Payload;
      setPicked(d.node);
      onSelect?.([d.node.kind, d.node.label], d.readings[0]?.summary);
    },
    [onSelect]
  );

  const pickedReadings = picked ? readings.filter((r) => r.nodeId === picked.id) : [];
  const driftCount = readings.filter((r) => r.drift).length;

  return (
    <div className={`kmap ${compact ? 'compact' : ''}`}>
      {compact ? (
        <div className="kmap-head compact">
          <span className="kmini-t">System map</span>
          <span className="kmini-s">
            {inScope.length} in scope
            {driftCount > 0 && <b className="kred"> · {driftCount} drift</b>}
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
            <h1>System map</h1>
            <p>
              The part of your system this problem touches. Outlined nodes do not exist yet — the
              problem statement is asking for them.
            </p>
          </div>
          <div className="kmap-stats">
            <span>
              <b>{inScope.length}</b> in scope
            </span>
            <span>
              <b>{inScope.filter((n) => n.proposed).length}</b> proposed
            </span>
            {driftCount > 0 && (
              <span className="kred">
                <b>{driftCount}</b> drift
              </span>
            )}
          </div>
        </div>
      )}

      {!compact && (
        <div className="sn-legend">
          {COLUMNS.map((k) => (
            <button
              key={k}
              className={only === k ? 'on' : ''}
              onClick={() => setOnly(only === k ? null : k)}
            >
              <i style={{ background: KIND_TINT[k] }} />
              {COL_LABEL[k]}
            </button>
          ))}
          {only && (
            <button className="sn-clear" onClick={() => setOnly(null)}>
              show all
            </button>
          )}
        </div>
      )}

      {/* Two readings of the same map. */}
      <div className="mapview">
        <button className={view === 'current' ? 'on' : ''} onClick={() => setView('current')}>
          Current focus
        </button>
        <button className={view === 'proposed' ? 'on' : ''} onClick={() => setView('proposed')}>
          Proposed solution
          {proposedCount > 0 && <i>+{proposedCount}</i>}
        </button>
      </div>

      <div className="kmap-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: compact ? 0.06 : 0.12, maxZoom: 1 }}
          minZoom={0.2}
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

      {/* What every source says about this node, and who was entitled to say it. */}
      {picked && (
        <div className="kdrawer wide">
          <div className="kdrawer-head">
            <span className="kpath">{COL_LABEL[picked.kind]}</span>
            <button onClick={() => setPicked(null)}>×</button>
          </div>
          <h4>{picked.label}</h4>

          {pickedReadings.length === 0 ? (
            <p className="knone">
              {picked.proposed
                ? 'Does not exist yet. The problem statement is asking for it.'
                : 'Nothing asserted about this node.'}
            </p>
          ) : (
            pickedReadings.map((r) => (
              <div className="rd" key={r.property}>
                <div className="rd-h">
                  {r.property}
                  <span className={`rd-c ${r.verifiable ? '' : 'soft'}`}>
                    {Math.round(r.confidence * 100)}%
                  </span>
                </div>

                {(['verified', 'observed', 'intended', 'permitted'] as const).map((a) => {
                  const f = r.by[a];
                  if (!f) return null;
                  return (
                    <div className="rd-row" key={a}>
                      <span className={`auth ${a}`}>{AUTHORITY_COPY[a].label}</span>
                      <span className="rd-v">{f.value}</span>
                      <span className="rd-s">{f.system}</span>
                    </div>
                  );
                })}

                <div className="rd-sum">{r.summary}</div>
                {!r.verifiable && (
                  <div className="rd-warn">Nothing can falsify this — no test or contract.</div>
                )}

                {r.drift && r.decision && (
                  <>
                    <div className="rd-drift">Implementation and intent disagree</div>
                    <p className="rd-q">{r.decision}</p>
                    <button
                      className="chip soft"
                      onClick={() => {
                        onDiscuss(r.decision!, [picked.label, r.property]);
                        setPicked(null);
                      }}
                    >
                      Decide in chat
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
