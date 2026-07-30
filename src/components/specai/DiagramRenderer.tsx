import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FlowDiagram, FlowNodeType } from '../../types/specai';

const NODE_COLORS: Record<FlowNodeType, { bg: string; border: string; text: string }> = {
  actor: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  system: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  container: { bg: '#faf5ff', border: '#c4b5fd', text: '#5b21b6' },
  component: { bg: '#fefce8', border: '#fde047', text: '#854d0e' },
  decision: { bg: '#fff7ed', border: '#fdba74', text: '#9a3412' },
  topic: { bg: '#f0f9ff', border: '#7dd3fc', text: '#075985' },
  default: { bg: '#f8fafc', border: '#cbd5e1', text: '#334155' },
};

const buildNodes = (diagram: FlowDiagram): Node[] =>
  diagram.nodes.map((n) => {
    const type = n.type ?? 'default';
    const colors = NODE_COLORS[type];
    return {
      id: n.id,
      position: { x: n.x, y: n.y },
      data: { label: n.subtitle ? `${n.label}\n${n.subtitle}` : n.label },
      sourcePosition: diagram.direction === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: diagram.direction === 'LR' ? Position.Left : Position.Top,
      style: {
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '10px 16px',
        fontSize: '11px',
        fontWeight: 600,
        color: colors.text,
        minWidth: '100px',
        textAlign: 'center' as const,
        whiteSpace: 'pre-line' as const,
      },
    };
  });

const buildEdges = (diagram: FlowDiagram): Edge[] =>
  diagram.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.animated ?? false,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { strokeWidth: 1.5, stroke: '#94a3b8' },
    labelStyle: { fontSize: 9, fontWeight: 600, fill: '#64748b' },
  }));

export const DiagramRenderer: React.FC<{ diagram: FlowDiagram }> = ({ diagram }) => {
  const nodes = useMemo(() => buildNodes(diagram), [diagram]);
  const edges = useMemo(() => buildEdges(diagram), [diagram]);

  return (
    <div className="mt-3 h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.4}
        maxZoom={2}
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls
          showInteractive={false}
          position="bottom-right"
          style={{ borderRadius: '8px', overflow: 'hidden' }}
        />
        <MiniMap
          nodeColor="#c7d2fe"
          maskColor="rgba(255,255,255,0.8)"
          style={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
        />
      </ReactFlow>
    </div>
  );
};
