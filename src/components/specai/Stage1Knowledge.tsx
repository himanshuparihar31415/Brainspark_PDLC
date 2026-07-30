import React, { useState } from 'react';
import { SpecAiState, SpecSource } from '../../types/specai';
import { AgentTerminal } from './AgentTerminal';
import { BriefPanel } from './BriefPanel';
import { ConflictResolver } from './ConflictResolver';
import { ContextBar } from './ContextBar';
import { SourceDrawer } from './SourceDrawer';

/**
 * Stage 1 — Knowledge Creation & Contextualization.
 *
 * Two columns: the conversation where the work happens, and the brief it
 * produces. The problem statement and the sources sit collapsed on one line above
 * both — setup you touch occasionally should not hold a banner for the rest of
 * the session.
 */
export const Stage1Knowledge: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [source, setSource] = useState<SpecSource | null>(null);

  const disabled = readOnly || locked;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ContextBar state={state} disabled={disabled} onOpenSource={setSource} />

      {/*
        Each panel owns its height and its own scroll, so reading the brief never
        moves the conversation and a long transcript never pushes the brief off
        screen. Below lg they stack and this column scrolls instead.
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto lg:flex-row lg:overflow-hidden">
        <AgentTerminal state={state} disabled={disabled} />
        <BriefPanel state={state} disabled={disabled} onResolve={setConflictId} />
      </div>

      <ConflictResolver
        state={state}
        cardId={conflictId}
        readOnly={disabled}
        onClose={() => setConflictId(null)}
      />

      <SourceDrawer source={source} onClose={() => setSource(null)} />
    </div>
  );
};
