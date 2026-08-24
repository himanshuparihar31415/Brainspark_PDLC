import React from 'react';
import { CodeIqReading } from '../../types/codeiq';

/**
 * Where this reading came from, and whether it is current.
 *
 * The prototype this is drawn from had a `PDLC: SpecAI → CodeIQ` badge with a
 * green `LIVE` dot beside it, hardcoded. The idea is right and worth keeping —
 * a reader should be able to see that these verdicts are adjudicated against the
 * spec Spec AI actually wrote — but a status light that is always on says nothing
 * about status. So every part of this is read.
 *
 * Three states, and they are genuinely different questions:
 *
 *   live     — a source feed is connected and something has been indexed
 *   degraded — indexed, but a feed is missing, so part of the report is blank
 *   dark     — nothing has been read; the surfaces say so at length
 *
 * It replaces the full-width amber banner that used to sit above the content for
 * the degraded case. That was a row of page height spent on a fact about the
 * plumbing, and the plumbing belongs in the chrome.
 */

type State = 'live' | 'degraded' | 'dark';

export const ProvenanceStrip: React.FC<{
  reading: CodeIqReading;
  collapsed: boolean;
}> = ({ reading, collapsed }) => {
  const { feeds, indexed, indexedAt } = reading;

  const state: State = !feeds.source || !indexed ? 'dark' : feeds.agent ? 'live' : 'degraded';

  /*
   * The newest scan, with every repo named on hover.
   *
   * There is no honest single timestamp — two repos scanned eleven minutes apart
   * give the project none — so the strip shows the most recent and the title
   * carries the rest rather than averaging them into a number nobody can check.
   */
  const newest = indexedAt[0]?.at;
  const allRepos = indexedAt.map((r) => `${r.repo} ${r.at}`).join(' · ');

  const detail =
    state === 'dark'
      ? !feeds.source
        ? 'No source control connected'
        : 'Connected, nothing indexed yet'
      : state === 'degraded'
      ? 'No IDE agent — rework signals blank'
      : `${feeds.live.join(' · ')}`;

  if (collapsed) {
    return (
      <span
        className={`cq-prov mini ${state}`}
        title={`Spec AI → CodeIQ · ${detail}${newest ? ` · indexed ${newest}` : ''}`}
        aria-label={`Lineage feed: ${state}. ${detail}`}
      >
        <i />
      </span>
    );
  }

  return (
    <div className={`cq-prov ${state}`} title={allRepos || undefined}>
      <span className="from">
        Spec AI <b>→</b> CodeIQ
        <i />
      </span>
      <span className="det">{detail}</span>
      {/* Only when there is something to name. An absent scan is not "recently". */}
      {newest && <span className="when">indexed {newest}</span>}
    </div>
  );
};
