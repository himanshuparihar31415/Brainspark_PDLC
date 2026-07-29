import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PromptVersion } from '../../types';
import {
  Terminal,
  FileCode,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  X,
  Check,
  ChevronRight,
  GitCompare,
  Sparkles,
} from 'lucide-react';

export const PromptControlsView: React.FC = () => {
  const {
    prompts,
    submitPromptCandidate,
    approvePromptCandidate,
    rejectPromptCandidate,
    rollbackPrompt,
    addToast,
    currentRole,
  } = useApp();

  const [activePrompt, setActivePrompt] = useState<PromptVersion>(prompts[0]);
  const [testMode, setTestMode] = useState<'sample' | 'golden'>('sample');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [diffViewOpen, setDiffViewOpen] = useState(false);

  const handleRunTest = (mode: 'sample' | 'golden') => {
    setIsTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTesting(false);
      if (mode === 'sample') {
        setTestResult(
          '✓ Execution finished in 420ms. Input: "Draft Biometric Auth Story". Output matched expected format (Given-When-Then criteria attached with SEC 17a-4 tags).'
        );
      } else {
        setTestResult(
          '✓ Golden dataset evaluation: Precision 98.2% (+1.8%), Format compliance 100%, Hallucination rate 0.4% (-0.4%). All thresholds passed!'
        );
      }
    }, 1200);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Prompt Controls</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Each agent's system prompt is a version-controlled asset. Changes require review before going live.
        </p>
      </div>

      {/* Prompts Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="py-3 px-4">Agent Service</th>
                <th className="py-3 px-4">Active Version</th>
                <th className="py-3 px-4">Last Changed</th>
                <th className="py-3 px-4">Pending Review</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prompts.map((p) => {
                const isSelected = activePrompt.id === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setActivePrompt(p)}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{p.capability}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{p.activeVersion}</td>
                    <td className="py-3.5 px-4 text-slate-500">{p.lastChanged}</td>
                    <td className="py-3.5 px-4">
                      {p.candidateVersion ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                          {p.candidateVersion} ({p.reviewStatus})
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePrompt(p);
                            setDiffViewOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold"
                        >
                          Compare Diff
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePrompt(p);
                            setRollbackModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold"
                        >
                          Rollback…
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Workflow Banner */}
      {activePrompt.candidateVersion && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-950">
                This change needs sign-off before it can go live.
              </h3>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Candidate <span className="font-mono font-bold">{activePrompt.candidateVersion}</span> submitted by{' '}
                {activePrompt.author}. Note: {activePrompt.changeNote}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => rejectPromptCandidate(activePrompt.id)}
              className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl"
            >
              Reject
            </button>
            <button
              onClick={() => approvePromptCandidate(activePrompt.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Approve & Promote
            </button>
          </div>
        </div>
      )}

      {/* Workspace: Side-by-Side Prompt Editor / Diff & Testing Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active System Prompt View */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active System Prompt ({activePrompt.activeVersion})</h3>
              <p className="text-[11px] text-slate-400">Author: {activePrompt.author}</p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              Live in Production
            </span>
          </div>

          <textarea
            readOnly
            value={activePrompt.activePromptText}
            rows={10}
            className="w-full bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl p-4 outline-none leading-relaxed"
          />
        </div>

        {/* Right: Candidate Prompt Testing Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Test Candidate Prompt</h3>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
              <button
                onClick={() => setTestMode('sample')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  testMode === 'sample' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Sample Inputs
              </button>
              <button
                onClick={() => setTestMode('golden')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  testMode === 'golden' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Golden Dataset
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Execute candidate prompt instructions against standard intake test fixtures or the full 200-sample golden set.
          </p>

          <button
            onClick={() => handleRunTest(testMode)}
            disabled={isTesting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isTesting ? 'Running evaluation model...' : `Run against ${testMode} inputs`}</span>
          </button>

          {testResult && (
            <div className="p-4 bg-slate-900 text-emerald-300 rounded-xl font-mono text-xs border border-slate-800 leading-relaxed animate-in fade-in">
              {testResult}
            </div>
          )}
        </div>
      </div>

      {/* Diff View Modal */}
      {diffViewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-indigo-600" />
                <span>Comparing {activePrompt.activeVersion} → {activePrompt.candidateVersion || 'Candidate'}</span>
              </h2>
              <button onClick={() => setDiffViewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-900 text-slate-300 rounded-xl space-y-1">
                <div className="text-slate-500">// Line 1 - Active System Prompt</div>
                <div>{activePrompt.activePromptText}</div>
                {activePrompt.candidatePromptText && (
                  <div className="text-emerald-400 bg-emerald-950/50 p-2 rounded-lg border border-emerald-800/40 mt-2">
                    + [ADDED] Automatically extract security data classification tags (PII, PHI, Restricted) and inject them into story header metadata blocks.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDiffViewOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Dialog */}
      {rollbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-slate-900">
              <RotateCcw className="w-6 h-6 text-indigo-600 shrink-0" />
              <h2 className="text-base font-extrabold text-slate-900">
                Roll back to v2.4.0?
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              The current active version will be replaced. This is logged.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setRollbackModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  rollbackPrompt(activePrompt.id, 'v2.4.0');
                  setRollbackModalOpen(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
              >
                Roll back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
