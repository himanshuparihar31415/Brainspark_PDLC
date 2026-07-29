import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecAiState } from '../../types/specai';
import { Eye, X } from 'lucide-react';

/**
 * Conflict resolution. Both claims are shown with their sources and the observed
 * current state, because a conflict is only actionable once you can see what is
 * actually true today.
 */
export const ConflictResolver: React.FC<{
  state: SpecAiState;
  cardId: string | null;
  readOnly: boolean;
  onClose: () => void;
}> = ({ state, cardId, readOnly, onClose }) => {
  const { resolveConflict, setCardState, updateCard, addToast } = useApp();
  const [custom, setCustom] = useState('');

  const card = state.cards.find((c) => c.id === cardId);
  if (!card?.conflict) return null;

  const c = card.conflict;
  const seedsInfluenced = state.cards.filter(
    (x) => x.type === 'Requirement seed' && x.state !== 'Superseded'
  ).length;

  const apply = (resolution: string) => {
    resolveConflict(state.projectId, card.id, resolution);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/20 animate-in fade-in" />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-extrabold leading-tight text-slate-900">
            Resolve conflict: {card.title}
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {card.state === 'Flagged' && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">
              This conflict is still influencing {seedsInfluenced} requirement seed
              {seedsInfluenced === 1 ? '' : 's'}.
            </p>
          )}

          {[
            { tag: 'Claim A', body: c.claimA, source: c.claimASource, tone: 'border-slate-200' },
            { tag: 'Claim B', body: c.claimB, source: c.claimBSource, tone: 'border-slate-200' },
          ].map((claim) => (
            <div key={claim.tag} className={`rounded-xl border bg-white p-3 ${claim.tone}`}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {claim.tag}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-800">{claim.body}</p>
              <p className="mt-1.5 text-[10px] text-slate-400">{claim.source}</p>
            </div>
          ))}

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-700">
              <Eye className="h-2.5 w-2.5" /> Observed current state
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-900">{c.observedState}</p>
          </div>

          {c.resolution ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                Resolved
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-900">{c.resolution}</p>
              {c.resolvedBy && (
                <p className="mt-1 text-[10px] text-emerald-700">Decided by {c.resolvedBy}</p>
              )}
            </div>
          ) : (
            !readOnly && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-800">
                  What should the specification use?
                </div>

                <button
                  onClick={() => apply(`Use Claim A — ${c.claimA} (${c.claimASource})`)}
                  className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Use Claim A
                </button>
                <button
                  onClick={() => apply(`Use Claim B — ${c.claimB} (${c.claimBSource})`)}
                  className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Use Claim B
                </button>

                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="text-[10px] font-bold text-slate-700">Write a new decision</div>
                  <textarea
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    rows={3}
                    placeholder="e.g. Biometric login is P0 for supported iOS and Android devices in Q4 2026. PIN remains the fallback."
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-indigo-600"
                  />
                  <button
                    onClick={() => apply(custom.trim())}
                    disabled={!custom.trim()}
                    className="mt-1.5 w-full cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                  >
                    Record decision
                  </button>
                </div>

                <button
                  onClick={() => {
                    updateCard(state.projectId, card.id, {
                      owner: 'Awaiting stakeholder',
                      dueState: 'Asked, response pending',
                    });
                    addToast('Stakeholder asked. The conflict stays open until they answer.', 'info');
                    onClose();
                  }}
                  className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ask stakeholder
                </button>
                <button
                  onClick={() => {
                    setCardState(state.projectId, card.id, 'Flagged');
                    onClose();
                  }}
                  className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Keep unresolved
                </button>
              </div>
            )
          )}
        </div>
      </aside>
    </>
  );
};
