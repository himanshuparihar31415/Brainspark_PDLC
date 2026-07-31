import React, { useState } from 'react';
import { SpecAiState, SpecSource } from '../../types/specai';
import { AgentTerminal } from './AgentTerminal';
import { BriefPanel } from './BriefPanel';
import { ConflictResolver } from './ConflictResolver';
import { IntakeGate } from './IntakeGate';
import { SourceDrawer } from './SourceDrawer';

/**
 * Stage 1 — Knowledge Creation & Contextualization.
 *
 * One question, then two panels: the conversation, and the brief it produces.
 * Nothing else. The problem statement lives at the top of the brief because that
 * is what it is — the first thing the brief says — and sources hang off the
 * composer, where a chat already has a place for "here, look at this". Both used
 * to hold bars of their own above the work, which is a permanent cost for
 * something you touch a few times a session.
 */
export const Stage1Knowledge: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
}> = ({ state, readOnly, locked }) => {
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [source, setSource] = useState<SpecSource | null>(null);

  const disabled = readOnly || locked;

  if (!state.intake?.acceptedAt) return <IntakeGate state={state} readOnly={readOnly} />;

  return (
    <>
      {/*
        Each panel owns its height and its own scroll, so reading the brief never
        moves the conversation and a long transcript never pushes the brief off
        screen. Below lg they stack and this column scrolls instead.
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto lg:flex-row lg:overflow-hidden">
        <AgentTerminal state={state} disabled={disabled} onOpenSource={setSource} />
        <BriefPanel state={state} disabled={disabled} onResolve={setConflictId} />
      </div>

      <ConflictResolver
        state={state}
        cardId={conflictId}
        readOnly={disabled}
        onClose={() => setConflictId(null)}
      />

      <SourceDrawer source={source} onClose={() => setSource(null)} />
    </>
  );
};
