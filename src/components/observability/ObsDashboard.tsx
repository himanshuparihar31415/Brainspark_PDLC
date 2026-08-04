import React, { useState } from 'react';
import { OverviewPanel } from './panels/OverviewPanel';
import { CostPanel } from './panels/CostPanel';
import { PerformancePanel } from './panels/PerformancePanel';
import { ReliabilityPanel } from './panels/ReliabilityPanel';
import { AgentBehaviorPanel } from './panels/AgentBehaviorPanel';
import { DepartmentPanel } from './panels/DepartmentPanel';
import { Drill } from '../views/ObservabilityView';

export type DashboardTab = 'overview' | 'cost' | 'performance' | 'reliability' | 'agents' | 'departments';

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'cost', label: 'Cost' },
  { id: 'performance', label: 'Performance' },
  { id: 'reliability', label: 'Reliability' },
  { id: 'agents', label: 'Agents' },
  { id: 'departments', label: 'Departments' },
];

export const ObsDashboard: React.FC<{
  onDrill: (d: Drill) => void;
}> = ({ onDrill }) => {
  const [tab, setTab] = useState<DashboardTab>('overview');

  return (
    <div className="density-compact space-y-5">
      <nav className="flex flex-wrap gap-1" aria-label="Observability dashboard tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 type-body-strong tracking-wide transition-all ${
              tab === t.id
                ? 'border-indigo-600 bg-indigo-600 text-white elevation-rest'
                : 'border-slate-200/60 bg-white/60 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50'
            }`}
            style={{ transition: `all var(--duration-fast) var(--ease-standard)` }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <OverviewPanel onDrill={onDrill} />}
      {tab === 'cost' && <CostPanel />}
      {tab === 'performance' && <PerformancePanel onDrill={onDrill} />}
      {tab === 'reliability' && <ReliabilityPanel />}
      {tab === 'agents' && <AgentBehaviorPanel />}
      {tab === 'departments' && <DepartmentPanel onDrill={onDrill} />}
    </div>
  );
};
