import React, { useState, useMemo } from 'react';
import { SpecHistoryEntry } from '../../types/specai';
import { SPEC_AI_HISTORY, getSessionIds, getArtifactNames } from '../../data/specAiHistory';
import {
  Clock,
  X,
  Sparkles,
  CheckCircle2,
  GitBranch,
  Play,
  Eye,
} from 'lucide-react';

type HistoryTab = 'session' | 'project' | 'task';

const TAB_LABELS: Record<HistoryTab, string> = {
  session: 'Session',
  project: 'Project',
  task: 'Task',
};

const TYPE_STYLES: Record<string, { icon: React.ElementType; dot: string; badge: string }> = {
  generation: { icon: Sparkles, dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
  decision: { icon: CheckCircle2, dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  version: { icon: GitBranch, dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatSessionDate(sessionId: string, entries: SpecHistoryEntry[]): string {
  const sessionEntries = entries.filter((e) => e.sessionId === sessionId);
  if (sessionEntries.length === 0) return sessionId;
  const earliest = sessionEntries[sessionEntries.length - 1];
  const d = new Date(earliest.timestamp);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const RunEntry: React.FC<{ entry: SpecHistoryEntry; index: number }> = ({ entry, index }) => {
  const style = TYPE_STYLES[entry.type];

  return (
    <div className="border-b border-slate-100 last:border-b-0 px-3 py-3 hover:bg-slate-50/60 transition-colors cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Run #{1000 + index}</span>
            <span className="text-[10px] text-slate-400">{entry.stage}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-600 leading-snug truncate">{entry.summary}</p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${style.badge}`}>
              {entry.type === 'generation' ? 'Completed' : entry.type === 'decision' ? entry.action : 'Version'}
            </span>
            {entry.artifactName && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-600">
                {entry.artifactName}
              </span>
            )}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">{formatTime(entry.timestamp)}</div>
        </div>
        <button className="shrink-0 flex items-center gap-1 rounded-md text-[10px] font-semibold text-indigo-600 hover:underline mt-0.5">
          <Eye className="h-3 w-3" /> View
        </button>
      </div>
    </div>
  );
};

export const HistoryPanel: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryTab>('session');
  const [artifactFilter, setArtifactFilter] = useState<string>('all');

  const entries = useMemo(
    () => SPEC_AI_HISTORY.filter((e) => e.projectId === projectId || projectId === 'proj-alpha'),
    [projectId]
  );

  const sessionIds = useMemo(() => getSessionIds(entries), [entries]);
  const artifactNames = useMemo(() => getArtifactNames(entries), [entries]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    if (activeTab === 'task' && artifactFilter !== 'all') {
      return sorted.filter((e) => e.artifactName === artifactFilter);
    }
    return sorted;
  }, [sorted, activeTab, artifactFilter]);

  return (
    <>
      {/* Vertical "HISTORY" toggle button — fixed to left edge */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 rounded-r-lg border border-l-0 border-slate-200 bg-white/95 px-1.5 py-3 shadow-md cursor-pointer hover:bg-indigo-50 transition-colors"
        title="Toggle History"
      >
        <Clock className="h-4 w-4 text-indigo-600" />
        <span className="text-[9px] font-bold text-indigo-700 tracking-wide" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          HISTORY
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700">
          {entries.length}
        </span>
      </button>

      {/* Left column drawer */}
      <div
        className={`fixed left-0 top-0 z-50 h-full flex transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel */}
        <div className="w-80 h-full bg-white border-r border-slate-200 shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-800">Run History</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                {entries.length}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 pt-2 pb-1">
            {(Object.keys(TAB_LABELS) as HistoryTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Artifact filter for Task tab */}
          {activeTab === 'task' && (
            <div className="px-3 pb-2">
              <select
                value={artifactFilter}
                onChange={(e) => setArtifactFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-300"
              >
                <option value="all">All Artifacts</option>
                {artifactNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Entries list */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'session' ? (
              sessionIds.map((sid, sidx) => {
                const sessionEntries = sorted.filter((e) => e.sessionId === sid);
                if (sessionEntries.length === 0) return null;
                return (
                  <div key={sid}>
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-50/95 px-3 py-2 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {formatSessionDate(sid, entries)}
                      </span>
                      {sidx === 0 && (
                        <span className="flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
                          <Play className="h-2.5 w-2.5" /> Resume
                        </span>
                      )}
                    </div>
                    {sessionEntries.map((entry, i) => (
                      <RunEntry key={entry.id} entry={entry} index={entries.length - entries.indexOf(entry)} />
                    ))}
                  </div>
                );
              })
            ) : (
              filteredEntries.map((entry, i) => (
                <RunEntry key={entry.id} entry={entry} index={entries.length - entries.indexOf(entry)} />
              ))
            )}

            {filteredEntries.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400">No history entries.</div>
            )}
          </div>
        </div>

        {/* Backdrop overlay to close */}
        <div
          className="flex-1 h-full bg-slate-900/20"
          onClick={() => setOpen(false)}
        />
      </div>
    </>
  );
};
