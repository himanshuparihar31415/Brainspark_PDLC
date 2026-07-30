import React, { useState } from 'react';
import { KnowledgeChannel, SpecAiState } from '../../types/specai';
import { knowledgeReadiness } from '../../data/specai';
import { ChalkBoard } from './ChalkBoard';
import { CardInspector } from './CardInspector';
import { ConflictResolver } from './ConflictResolver';
import { KnowledgeSources } from './KnowledgeSources';
import { ProblemStatement } from './ProblemStatement';
import { RightRail } from './RightRail';
import { SourceDrawer } from './SourceDrawer';
import { AlertTriangle } from 'lucide-react';

const DOT: Record<KnowledgeChannel['status'], string> = {
  Ready: 'bg-emerald-500',
  Partial: 'bg-amber-500',
  Indexing: 'bg-amber-500',
  'Not connected': 'bg-slate-300',
};

/**
 * Stage 1 — Knowledge Creation & Contextualization.
 *
 * Three columns, because the work is three things at once: what you have brought
 * in, the rough space you are thinking in, and something that can read across a
 * selection. The connected domains sit above all three, since they feed every one.
 */
export const Stage1Knowledge: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
  /** Owned by the shell, because the stage header acts on the same selection. */
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}> = ({ state, readOnly, locked, selectedIds, onSelectionChange }) => {
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [channel, setChannel] = useState<KnowledgeChannel | null>(null);

  const disabled = readOnly || locked;
  const r = knowledgeReadiness(state);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {/* What everything below is read against */}
      <ProblemStatement state={state} disabled={disabled} />

      {/* Connected domains, and how ready they leave the board */}
      <div className="flex flex-wrap items-center gap-1.5">
        {state.channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setChannel(ch)}
            title={`${ch.label} · ${ch.status} · ${ch.itemsIndexed} indexed · ${ch.scope} · synced ${ch.lastSync}`}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[ch.status]}`} />
            <span className="font-bold text-slate-800">{ch.label}</span>
            <span className="text-slate-400">· {ch.detail}</span>
          </button>
        ))}

        <div
          title={r.explanation}
          className="ml-auto flex shrink-0 cursor-help items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5"
        >
          <span className="text-[10px] font-bold text-slate-700">Readiness {r.percent}%</span>
          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
            <span
              className={`block h-full rounded-full ${
                r.percent >= 85 ? 'bg-emerald-500' : r.percent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${r.percent}%` }}
            />
          </span>
          {r.conflictsOpen > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-rose-600">
              <AlertTriangle className="h-2.5 w-2.5" />
              {r.conflictsOpen}
            </span>
          )}
        </div>
      </div>

      {/* Below lg the three panels stack and this column scrolls, rather than
          squeezing all three into a single viewport height. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto lg:flex-row lg:overflow-visible">
        <KnowledgeSources state={state} disabled={disabled} />

        <ChalkBoard
          state={state}
          disabled={disabled}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          onInspect={setInspectId}
          onOpenConflict={(id) => {
            setInspectId(null);
            setConflictId(id);
          }}
        />

        <RightRail
          state={state}
          disabled={disabled}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      </div>

      {/* Right-drawer modes — only one open at a time */}
      {conflictId ? (
        <ConflictResolver
          state={state}
          cardId={conflictId}
          readOnly={disabled}
          onClose={() => setConflictId(null)}
        />
      ) : (
        <CardInspector
          state={state}
          cardId={inspectId}
          readOnly={disabled}
          onClose={() => setInspectId(null)}
          onOpenConflict={(id) => {
            setInspectId(null);
            setConflictId(id);
          }}
        />
      )}

      <SourceDrawer channel={channel} onClose={() => setChannel(null)} />
    </div>
  );
};
