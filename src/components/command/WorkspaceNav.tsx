import React, { useState } from 'react';
import { ModuleKey, ModuleDef } from '../../types';
import { MODULE_DEFS } from '../../data/modules';
import { ModuleIcon } from '../common/ModuleIcons';
import { BarChart3, ArrowRight, Lock } from 'lucide-react';

interface ModuleCardProps {
  def: ModuleDef;
  isEnabled: boolean;
  readOnly: boolean;
  onOpen: (module: ModuleKey) => void;
}

const MOCK_STATS: Record<string, { kpis: { label: string; value: string }[] }> = {
  specai: { kpis: [
    { label: 'Stories generated', value: '47' },
    { label: 'Pushed to Jira', value: '39' },
    { label: 'Avg quality score', value: '8.4/10' },
    { label: 'Active epics', value: '5' },
  ]},
  design: { kpis: [
    { label: 'Designs created', value: '28' },
    { label: 'Accepted', value: '22' },
    { label: 'Design consistency', value: '91%' },
    { label: 'Figma syncs', value: '14' },
  ]},
  codeiq: { kpis: [
    { label: 'PRs scaffolded', value: '63' },
    { label: 'Tests generated', value: '184' },
    { label: 'Code scan pass', value: '96%' },
    { label: 'Avg review time', value: '2.1h' },
  ]},
  intelliqa: { kpis: [
    { label: 'Test cases', value: '312' },
    { label: 'Runs completed', value: '89' },
    { label: 'Defect detection', value: '94%' },
    { label: 'Flaky rate', value: '2.3%' },
  ]},
  release: { kpis: [
    { label: 'Deploys', value: '12' },
    { label: 'Success rate', value: '100%' },
    { label: 'Avg lead time', value: '3.2d' },
    { label: 'Rollbacks', value: '0' },
  ]},
};

const MODULE_SUBTITLES: Record<string, string> = {
  specai: 'Requirements Intelligence Studio',
  design: 'Design & Prototyping Hub',
  codeiq: 'Intelligent Code Generation',
  intelliqa: 'Autonomous Testing Studio',
  release: 'Release Command Center',
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  specai: 'Transforms business objectives into structured epics & user stories.',
  design: 'Generates interactive flows to validate before a single line of code is written.',
  codeiq: 'Produces production-ready, reusable code from validated designs.',
  intelliqa: 'Enables Shift-Left quality engineering through AI-generated test scenarios, script creation…',
  release: 'Orchestrates release readiness, deployment intelligence, environment validation, early risk…',
};

const ModuleCard: React.FC<ModuleCardProps> = ({ def, isEnabled, readOnly, onOpen }) => {
  const [flipped, setFlipped] = useState(false);
  const stats = MOCK_STATS[def.key];

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 ${
        isEnabled
          ? 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5'
          : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
      }`}
      style={{ minHeight: '220px', perspective: '1000px' }}
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        {/* Front face */}
        <div className="absolute inset-0 flex flex-col p-5 backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
            <ModuleIcon module={def.key} size="md" />
          </div>

          {/* Name */}
          <h3 className="text-sm font-bold text-slate-900">{def.name === 'Design' ? 'ProtoAI' : def.name}</h3>
          <p className="text-[10px] font-medium italic text-indigo-600 mt-0.5">
            {MODULE_SUBTITLES[def.key]}
          </p>

          {/* Description */}
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500 flex-1">
            {MODULE_DESCRIPTIONS[def.key]}
          </p>

          {/* Bottom actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            {isEnabled ? (
              <button
                onClick={() => onOpen(def.key)}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                {readOnly ? 'View' : 'Open'} <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <Lock className="w-3 h-3" /> Not enabled
              </span>
            )}

            {isEnabled && stats && (
              <button
                onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
                className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
              >
                <BarChart3 className="w-3 h-3" /> Stats
              </button>
            )}
          </div>

          {readOnly && isEnabled && (
            <span className="absolute top-3 right-3 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
              Read-only
            </span>
          )}
        </div>

        {/* Back face — Stats */}
        <div
          className="absolute inset-0 flex flex-col p-5 backface-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ModuleIcon module={def.key} size="sm" />
              <span className="text-xs font-bold text-slate-900">{def.name} KPIs</span>
            </div>
            <button
              onClick={() => setFlipped(false)}
              className="rounded-md bg-white border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              ← Back
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {stats?.kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                <div className="text-lg font-black text-slate-900 tracking-tight">{kpi.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onOpen(def.key)}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-700 cursor-pointer transition-colors"
          >
            Open workspace <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const WorkspaceNav: React.FC<{
  enabled: ModuleKey[];
  ownedModules: ModuleKey[];
  onOpen: (module: ModuleKey) => void;
}> = ({ enabled, ownedModules, onOpen }) => (
  <section className="space-y-4">
    <h2 className="text-base font-extrabold tracking-tight text-slate-900">Workspaces</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {MODULE_DEFS.map((def) => {
        const isEnabled = enabled.includes(def.key);
        const readOnly = isEnabled && !ownedModules.includes(def.key);
        return (
          <ModuleCard key={def.key} def={def} isEnabled={isEnabled} readOnly={readOnly} onOpen={onOpen} />
        );
      })}
    </div>
  </section>
);
