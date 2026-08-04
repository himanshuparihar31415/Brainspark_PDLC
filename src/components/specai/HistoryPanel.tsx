import React, { useState, useMemo } from 'react';
import { SpecHistoryEntry } from '../../types/specai';
import { SPEC_AI_HISTORY, getSessionIds, getArtifactNames } from '../../data/specAiHistory';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  GitBranch,
  Play,
} from 'lucide-react';

type HistoryTab = 'session' | 'project' | 'task';

const TAB_LABELS: Record<HistoryTab, string> = {
  session: 'Session',
  project: 'Project',
  task: 'Task / Artifact',
};

const TYPE_STYLES: Record<string, { icon: React.ElementType; dot: string; label: string }> = {
  generation: { icon: Sparkles, dot: 'bg-indigo-500', label: 'Generation' },
  decision: { icon: CheckCircle2, dot: 'bg-amber-500', label: 'Decision' },
  version: { icon: GitBranch, dot: 'bg-emerald-500', label: 'Version' },
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatSessionLabel(sessionId: string, entries: SpecHistoryEntry[]): string {
  const sessionEntries = entries.filter((e) => e.sessionId === sessionId);
  if (sessionEntries.length === 0) return sessionId;
  const earliest = sessionEntries[sessionEntries.length - 1];
  const d = new Date(earliest.timestamp);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' — ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const EntryCard: React.FC<{ entry: SpecHistoryEntry }> = ({ entry }) => {
  const style = TYPE_STYLES[entry.type];
  const Icon = style.icon;

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50/80 transition-colors group">
      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.dot}/10`}>
        <Icon className={`h-3.5 w-3.5 ${style.dot.replace('bg-', 'text-')}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-800 truncate">{entry.summary}</span>
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${style.dot}/10 ${style.dot.replace('bg-', 'text-')}`}>
            {style.label}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
          <span>{formatTime(entry.timestamp)}</span>
          {entry.actor && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-slate-600">{entry.actor}</span>
              {entry.actorRole && <span className="text-slate-400">({entry.actorRole})</span>}
            </>
          )}
          {entry.artifactName && (
            <>
              <span className="text-slate-300">·</span>
              <span className="italic">{entry.artifactName}</span>
            </>
          )}
        </div>
        {entry.model && (
          <div className="mt-0.5 text-[10px] text-slate-400">
            Model: {entry.model} {entry.durationMs ? `· ${(entry.durationMs / 1000).toFixed(1)}s` : ''}
          </div>
        )}
        {entry.diffSummary && (
          <div className="mt-0.5 text-[10px]">
            <span className="text-emerald-600">+{entry.diffSummary.added}</span>
            {' '}
            <span className="text-rose-500">-{entry.diffSummary.removed}</span>
            {' '}
            <span className="text-amber-600">~{entry.diffSummary.modified}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const HistoryPanel: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryTab>('session');
  const [artifactFilter, setArtifactFilter] = useState<string>('all');

  const entries = useMemo(
    () => SPEC_AI_HISTORY.filter((e) => e.projectId === projectId || projectId === 'proj-alpha'),
    [projectId]
  );

  const sessionIds = useMemo(() => getSessionIds(entries), [entries]);
  const artifactNames = useMemo(() => getArtifactNames(entries), [entries]);

  const filteredEntries = useMemo(() => {
    let result = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (activeTab === 'task' && artifactFilter !== 'all') {
      result = result.filter((e) => e.artifactName === artifactFilter);
    }
    return result;
  }, [entries, activeTab, artifactFilter]);

  return (
    <div className="platform-card overflow-hidden transition-all duration-300">
      {/* Collapsed toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">History</span>
          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
            {entries.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && entries.length > 0 && (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Last: {formatTime(entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.timestamp)}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100" style={{ maxHeight: '40vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-2">
            {(Object.keys(TAB_LABELS) as HistoryTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}

            {activeTab === 'task' && (
              <select
                value={artifactFilter}
                onChange={(e) => setArtifactFilter(e.target.value)}
                className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Artifacts</option>
                {artifactNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Timeline content */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {activeTab === 'session' ? (
              <div className="space-y-3">
                {sessionIds.map((sid, idx) => {
                  const sessionEntries = filteredEntries.filter((e) => e.sessionId === sid);
                  if (sessionEntries.length === 0) return null;
                  return (
                    <div key={sid}>
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {formatSessionLabel(sid, entries)}
                        </span>
                        {idx === 0 && (
                          <span className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">
                            <Play className="h-2.5 w-2.5" /> Resume
                          </span>
                        )}
                      </div>
                      <div className="divide-y divide-slate-50">
                        {sessionEntries.map((entry) => (
                          <EntryCard key={entry.id} entry={entry} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}

            {filteredEntries.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No history entries found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
