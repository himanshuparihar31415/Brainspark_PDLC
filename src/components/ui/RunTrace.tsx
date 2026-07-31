import React, { useState } from 'react';
import { ChevronRight, Clock, Cpu, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { StatusDot, AgentState } from './StatusDot';

export interface TraceStep {
  id: string;
  label: string;
  state: AgentState;
  durationMs?: number;
  tokens?: number;
  cost?: number;
  detail?: string;
  children?: TraceStep[];
}

interface RunTraceProps {
  steps: TraceStep[];
  title?: string;
  className?: string;
}

const StepNode: React.FC<{ step: TraceStep; depth: number }> = ({ step, depth }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = step.children && step.children.length > 0;

  return (
    <div style={{ marginLeft: `${depth * 20}px` }}>
      <button
        onClick={hasChildren ? () => setExpanded(!expanded) : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
          hasChildren ? 'cursor-pointer hover:bg-slate-50' : ''
        }`}
      >
        {hasChildren && (
          <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
        {!hasChildren && <span className="w-3" />}

        <StatusDot state={step.state} size="sm" />

        <span className="type-body-strong flex-1 truncate text-slate-800">{step.label}</span>

        <div className="flex items-center gap-3 shrink-0">
          {step.durationMs !== undefined && (
            <span className="flex items-center gap-1 type-caption text-slate-400">
              <Clock className="h-3 w-3" />
              {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
            </span>
          )}
          {step.tokens !== undefined && (
            <span className="flex items-center gap-1 type-caption text-slate-400">
              <Cpu className="h-3 w-3" />
              {step.tokens.toLocaleString()}
            </span>
          )}
          {step.cost !== undefined && (
            <span className="type-caption font-mono font-bold text-slate-500">
              ${step.cost.toFixed(4)}
            </span>
          )}
        </div>
      </button>

      {step.detail && (
        <div className="ml-[38px] mb-1 type-caption text-slate-400">{step.detail}</div>
      )}

      {expanded && hasChildren && (
        <div className="border-l border-slate-200 ml-[18px]">
          {step.children!.map((child) => (
            <StepNode key={child.id} step={child} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
};

export const RunTrace: React.FC<RunTraceProps> = ({ steps, title, className = '' }) => {
  const totalDuration = steps.reduce((s, step) => s + (step.durationMs ?? 0), 0);
  const totalTokens = steps.reduce((s, step) => s + (step.tokens ?? 0), 0);
  const totalCost = steps.reduce((s, step) => s + (step.cost ?? 0), 0);
  const hasError = steps.some((s) => s.state === 'error');
  const allDone = steps.every((s) => s.state === 'success');

  return (
    <div className={`material-acrylic elevation-rest rounded-2xl border border-white/60 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {hasError ? (
            <AlertCircle className="h-4 w-4 text-rose-500" />
          ) : allDone ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Zap className="h-4 w-4 text-indigo-500" />
          )}
          <span className="type-subtitle text-slate-900">{title ?? 'Execution Trace'}</span>
        </div>
        <div className="flex items-center gap-4 type-caption text-slate-400">
          <span>{totalDuration < 1000 ? `${totalDuration}ms` : `${(totalDuration / 1000).toFixed(1)}s`}</span>
          <span>{totalTokens.toLocaleString()} tokens</span>
          <span className="font-mono font-bold">${totalCost.toFixed(4)}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="p-2 space-y-0.5">
        {steps.map((step) => (
          <StepNode key={step.id} step={step} depth={0} />
        ))}
      </div>
    </div>
  );
};
