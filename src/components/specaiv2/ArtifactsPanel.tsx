import React from 'react';
import { Check, CheckCircle2, Circle, Loader2, Unlock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ArchArtifact, ArtifactGroup, SpecAiState } from '../../types/specai';
import { ARTIFACT_GROUP_ORDER } from '../../data/specai';

/**
 * Artifacts, in the panel beside the conversation.
 *
 * It was a five-column table across the full width, which does not survive being
 * moved into forty per cent of it. A row here is the two things you need in a
 * list — is it done, and is it mine — with everything else behind the artifact
 * itself. Assignment moved into the viewer for the same reason.
 */

export const ArtifactsPanel: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  criticalGroups: ArtifactGroup[];
  building: boolean;
  builtIds: string[];
  currentBuild: { id: string; reading: string } | null;
  onOpen: (id: string) => void;
}> = ({ state, readOnly, criticalGroups, building, builtIds, currentBuild, onOpen }) => {
  const { reviewArtifact, unlockArtifact } = useApp();

  const critical = state.artifacts.filter((a) => criticalGroups.includes(a.group));
  const approved = critical.filter((a) => a.status === 'Approved');
  const gateOpen = critical.length > 0 && approved.length === critical.length;

  if (state.artifacts.length === 0) {
    return (
      <div className="wpanel">
        <div className="wempty">
          <Circle size={20} />
          <p>No artifacts yet.</p>
          <p className="sub">
            Finalize the problem definition and they are written from the locked brief.
          </p>
        </div>
      </div>
    );
  }

  const byGroup = ARTIFACT_GROUP_ORDER.map((g) => ({
    group: g,
    items: state.artifacts.filter((a) => a.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="wpanel">
      {gateOpen ? (
        <div className="unlock-banner">
          <CheckCircle2 size={14} /> Critical artifacts approved — Delivery is open.
        </div>
      ) : (
        <div className="gate-note">
          <Circle size={9} />
          {approved.length} of {critical.length} critical approved
          {!readOnly && (
            <button
              className="chip soft"
              style={{ marginLeft: 'auto' }}
              onClick={() =>
                critical
                  .filter((a) => a.status !== 'Approved')
                  .forEach((a) => reviewArtifact(state.projectId, a.id))
              }
            >
              Approve all critical
            </button>
          )}
        </div>
      )}

      {byGroup.map(({ group, items }) => (
        <React.Fragment key={group}>
          <div className="wsec">
            {group}{' '}
            <span>
              {items.filter((a) => a.status === 'Approved').length}/{items.length}
            </span>
          </div>

          {items.map((a: ArchArtifact) => {
            const isBuilding = currentBuild?.id === a.id;
            const built = builtIds.includes(a.id) || !building;
            const isCritical = criticalGroups.includes(a.group);
            const done = a.status === 'Approved';

            return (
              <div className={`afx ${done ? 'ok' : ''} ${a.stale ? 'stale' : ''}`} key={a.id}>
                <button className="afx-open" onClick={() => onOpen(a.id)}>
                  <span className="afx-dot">
                    {isBuilding ? (
                      <Loader2 size={11} className="spinning" />
                    ) : done ? (
                      <Check size={11} />
                    ) : (
                      <Circle size={8} />
                    )}
                  </span>
                  <span className="afx-body">
                    <span className="afx-l">
                      {a.label}
                      {isCritical && <i>critical</i>}
                    </span>
                    {isBuilding && currentBuild ? (
                      <span className="afx-m">reading {currentBuild.reading}…</span>
                    ) : (
                      <span className="afx-m">
                        v{a.versions}
                        {a.assignee ? ` · ${a.assignee}` : ' · unassigned'}
                        {a.stale && ' · needs review'}
                        {a.confidence === 'low' && ' · low confidence'}
                      </span>
                    )}
                  </span>
                </button>

                {done ? (
                  <button
                    className="afx-act undo"
                    disabled={readOnly}
                    title="Reopen for changes"
                    onClick={() => unlockArtifact(state.projectId, a.id)}
                  >
                    <Unlock size={10} />
                  </button>
                ) : (
                  <button
                    className="afx-act"
                    disabled={readOnly || !built}
                    onClick={() => reviewArtifact(state.projectId, a.id)}
                  >
                    Approve
                  </button>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};
