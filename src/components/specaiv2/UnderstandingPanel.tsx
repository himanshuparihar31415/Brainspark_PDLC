import React from 'react';
import { AlertTriangle, FileStack, Lock, RefreshCw, Sparkles } from 'lucide-react';
import { BriefLine, EvidenceClass, SpecAiState } from '../../types/specai';
import { BRIEF_BAND_COPY, BRIEF_BANDS } from '../../data/specai';

/**
 * Understanding — the brief, as its own phase.
 *
 * It used to be a collapsed card inside the conversation titled "What I
 * understand so far", which put the one artefact the whole run produces into a
 * disclosure widget between two chat bubbles. It is the thing you sign off
 * before anything is generated, so it gets a surface.
 *
 * Same lines, same evidence classes, same promote action — read at a width where
 * a claim and its citation fit on one line.
 */

const EV: Record<EvidenceClass, { cls: string; label: string }> = {
  'Source fact': { cls: 'fact', label: 'From a source' },
  'User decision': { cls: 'decision', label: 'You decided this' },
  'Inferred interpretation': { cls: 'inferred', label: 'Inferred — not stated anywhere' },
  'AI assumption': { cls: 'assumption', label: 'Assumed until confirmed' },
};

export const UnderstandingPanel: React.FC<{
  state: SpecAiState;
  readOnly: boolean;
  locked: boolean;
  building: boolean;
  hasArtifacts: boolean;
  onPromote: (lineId: string) => void;
  onCite: (line: BriefLine) => void;
  onReread: () => void;
  onGenerate: () => void;
  onOpenSpec: () => void;
}> = ({
  state,
  readOnly,
  locked,
  building,
  hasArtifacts,
  onPromote,
  onCite,
  onReread,
  onGenerate,
  onOpenSpec,
}) => {
  const bands = state.brief
    ? BRIEF_BANDS.map((band) => ({ band, lines: state.brief!.bands[band] })).filter(
        (g) => g.lines.length > 0
      )
    : [];

  const total = bands.reduce((n, g) => n + g.lines.length, 0);
  /* An inference or an assumption is a claim nothing has confirmed. Counting
     them separately is the point of the evidence class. */
  const soft = bands.reduce(
    (n, g) =>
      n +
      g.lines.filter(
        (l) => l.evidenceClass !== 'Source fact' && l.evidenceClass !== 'User decision'
      ).length,
    0
  );

  if (total === 0) {
    return (
      <div className="und">
        <div className="und-empty">
          <Sparkles size={22} />
          <p>Nothing to sign off yet.</p>
          <p className="sub">
            Analyse the problem and answer what the agent asks. What it reads and what you
            decide accumulate here as the brief.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="und">
      <header className="und-head">
        <div>
          <span className="und-eyebrow">Understanding</span>
          <h2>
            {total} claim{total === 1 ? '' : 's'}
            {state.brief?.version ? <em>v{state.brief.version}</em> : null}
          </h2>
        </div>

        <div className="und-acts">
          {soft > 0 && (
            <span className="und-soft" title="Inferences and assumptions — nothing has confirmed these">
              <AlertTriangle size={12} /> {soft} unconfirmed
            </span>
          )}
          <button className="btn btn-ghost" onClick={onOpenSpec}>
            <FileStack size={13} /> Read as a document
          </button>
          {locked ? (
            <span className="und-locked">
              <Lock size={11} /> Signed off
            </span>
          ) : (
            <button
              className="btn btn-primary"
              disabled={readOnly || building}
              onClick={onGenerate}
              title="Lock the brief and write the artifacts from it"
            >
              {hasArtifacts ? 'Regenerate artifacts' : 'Sign off and generate artifacts'}
            </button>
          )}
        </div>
      </header>

      {state.brief?.stale && state.brief.staleReason && (
        <div className="und-stale">
          <AlertTriangle size={13} />
          <span>{state.brief.staleReason}</span>
          <button className="chip soft" onClick={onReread} disabled={readOnly}>
            <RefreshCw size={11} /> Re-read
          </button>
        </div>
      )}

      <div className="und-body">
        {/* The narrative first. Someone signing this off should be able to read
            one paragraph and know what they are agreeing to. */}
        {state.brief?.summary && <p className="und-summary">{state.brief.summary}</p>}

        {bands.map(({ band, lines }) => (
          <section className="und-band" key={band}>
            <div className="und-bh">
              <b>{BRIEF_BAND_COPY[band].header}</b>
              <span>{BRIEF_BAND_COPY[band].helper}</span>
              <i>{lines.length}</i>
            </div>

            {lines.map((line) => (
              <div className="und-line" key={line.id}>
                <span
                  className={`und-ev ${EV[line.evidenceClass].cls}`}
                  title={EV[line.evidenceClass].label}
                />
                <span className="und-tx">
                  {line.text}
                  {line.sourceSummary && (
                    <button className="cite" onClick={() => onCite(line)}>
                      {line.sourceSummary}
                    </button>
                  )}
                </span>
                {!readOnly && !locked && (
                  <button className="promote" onClick={() => onPromote(line.id)}>
                    + Requirement
                  </button>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};
