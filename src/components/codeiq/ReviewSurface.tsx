import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Criterion, ReviewTarget, UntrackedChange } from '../../types/codeiq';
import {
  GAP_FILTER_COPY,
  GapFilter,
  GapTile,
  STATUS_MINI,
  countBy,
  filterTargets,
  gapTiles,
  isGenuinelyDone,
} from '../../data/codeiq';
import { ReviewPanel } from './ReviewPanel';
import { Surface } from './SurfaceRail';

/**
 * Review — the stories, and the one being adjudicated, on one surface.
 *
 * These were two surfaces and that was a mistake. The dashboard's whole job was
 * to list stories and hand you one; the review panel's whole job was to receive
 * one and show its criteria. Splitting them meant the list disappeared the moment
 * you used it, and getting back to it cost a trip through the rail — so the
 * rollup read as a report you visited rather than the index it actually is.
 *
 * Master and detail now. Clicking a story is the whole interaction, which is why
 * the Open button is gone: the row is the affordance, and the criteria appear
 * beside it rather than instead of it.
 *
 * Two things were dropped in the merge rather than carried over:
 *
 *   · The project-level gap banner. The tiles above say the same numbers, and a
 *     banner repeating them directly under them was one sentence of the same
 *     fact twice. The per-story headline stays, in the detail column, where it
 *     names the story it is about.
 *   · The rework preview. It was a capped copy of the Spec quality surface, and
 *     the merge needed the column. The rail carries its count.
 */

/*
 * The verdict on a story, in words rather than in the module's vocabulary.
 *
 * "Stands up" / "Overstated" / "In flight" were three pieces of jargon doing the
 * work of three plain phrases.
 */
const verdict = (t: ReviewTarget) => {
  if (t.claimed !== 'Done') return { cls: 'open', label: 'In progress' };
  return isGenuinelyDone(t)
    ? { cls: 'clean', label: 'Fully built' }
    : { cls: 'overstated', label: 'Not fully built' };
};

/**
 * A number, what it counts, and the way into the rows behind it.
 *
 * `aria-pressed` carries the selected state; the ring is decoration. A filter
 * whose only indication is a colour is invisible to anyone not looking at it.
 */
const Tile: React.FC<{ tile: GapTile; active: boolean; onToggle: () => void }> = ({
  tile,
  active,
  onToggle,
}) => (
  <button
    className={`cq-tile ${tile.tone} ${active ? 'on' : ''}`}
    onClick={onToggle}
    aria-pressed={active}
    aria-label={`${tile.label}: ${tile.value} ${tile.unit}. ${
      active ? 'Filtering the story list. Activate to clear.' : 'Activate to filter the story list.'
    }`}
  >
    <span className="lbl">{tile.label}</span>
    <span className="n">
      <b>{tile.value}</b>
      <i>{tile.unit}</i>
    </span>
    <span className="foot">
      <em>{tile.note}</em>
      <span className="act">{active ? 'Active filter' : 'Filter stories'}</span>
    </span>
  </button>
);

export const ReviewSurface: React.FC<{
  targets: ReviewTarget[];
  /** The story open in the detail column. Owned by the view, not here. */
  activeStoryKey: string | null;
  onPickStory: (storyKey: string) => void;
  onAct: (criterion: Criterion, action: string, secondary: boolean) => void;
  untracked: UntrackedChange[];
  onOpenSurface: (surface: Surface) => void;
}> = ({ targets, activeStoryKey, onPickStory, onAct, untracked, onOpenSurface }) => {
  const [filter, setFilter] = useState<GapFilter | null>(null);

  const tiles = gapTiles(targets);
  const rows = filterTargets(targets, filter);

  /*
   * The open story must be one the filter still shows.
   *
   * Otherwise narrowing the tiles leaves the detail column displaying a story
   * absent from the list beside it, which reads as a bug in the filter. Falling
   * back to the first visible row keeps the two halves describing one thing.
   */
  const target = rows.find((t) => t.storyKey === activeStoryKey) ?? rows[0] ?? null;

  const flagged = untracked.filter((u) => u.policy === 'flag').length;

  /*
   * The instrumentation strip used to open this page: two percentages about how
   * well the pipeline is wired, plus a count of stories with no code, above the
   * report and in the same weight as it. The second and third said the same thing
   * — "63% could be joined" is the same fact as "3 stories have no code CodeIQ
   * can see" — and none of the three was about the code. The provenance strip in
   * the rail says whether the feed is live, which is the part worth knowing.
   */
  return (
    <div className="cq-wrap wide">
      {/* ── The tiles, three of which filter the list below ── */}
      <div className="cq-tiles">
        {tiles.map((t) => (
          <Tile
            key={t.filter}
            tile={t}
            active={filter === t.filter}
            onToggle={() => setFilter(filter === t.filter ? null : t.filter)}
          />
        ))}

        {/*
         * The fourth tile is deliberately not a filter. Untracked change has no
         * story to filter a story list by — that is what makes it untracked — so
         * it is a door to its own surface rather than a fourth predicate.
         */}
        <button className="cq-tile note" onClick={() => onOpenSurface('untracked')}>
          <span className="lbl">Commits with no story</span>
          <span className="n">
            <b>{untracked.length}</b>
            <i>{untracked.length === 1 ? 'commit' : 'commits'}</i>
          </span>
          <span className="foot">
            <em>{flagged} still to decide</em>
            <span className="act">
              Open page <ArrowRight size={10} />
            </span>
          </span>
        </button>
      </div>

      <div className="cq-review">
        {/* ── Master: which stories, and how much of it stands up ── */}
        <aside className="cq-master">
          <div className="cq-mhead">
            <div>
              <h2 className="cq-h2">
                {filter ? GAP_FILTER_COPY[filter].title : 'Stories with code'}
              </h2>
              <p className="cq-hsub">
                {filter
                  ? GAP_FILTER_COPY[filter].subtitle
                  : 'Worst first. Pick one to see what was built.'}
              </p>
            </div>
            {filter && (
              <button className="cq-chip" onClick={() => setFilter(null)}>
                {rows.length}
                <X size={11} />
              </button>
            )}
          </div>

          {/*
           * The trust bar is gone from here. It read "0 stand up / 3 overstated"
           * over a solid red bar, one column to the left of a tile already
           * reading "3 of 3 marked done" — the same fact, twice, in two
           * vocabularies.
           */}
          <div className="cq-mlist">
            {rows.map((t) => {
              const n = countBy(t.criteria);
              const v = verdict(t);
              return (
                <button
                  key={t.storyKey}
                  className={`cq-mrow ${target?.storyKey === t.storyKey ? 'on' : ''}`}
                  onClick={() => onPickStory(t.storyKey)}
                  aria-current={target?.storyKey === t.storyKey}
                >
                  <span className="top">
                    <span className="k">{t.storyKey}</span>
                    <span className={`cq-verdict ${v.cls}`}>{v.label}</span>
                  </span>
                  <span className="t">{t.title}</span>
                  <span className="bot">
                    {/*
                     * Nothing rather than a grey "none".
                     *
                     * On a clean story that chip sat beside a verdict already
                     * reading "Fully built", so it either repeated it or — read
                     * quickly — looked like data that had failed to load.
                     */}
                    <span className="cq-mini">
                      {n.missing > 0 && (
                        <span className="m">
                          {n.missing} {STATUS_MINI.missing}
                        </span>
                      )}
                      {n.drifted > 0 && (
                        <span className="d">
                          {n.drifted} {STATUS_MINI.drifted}
                        </span>
                      )}
                      {n.partial > 0 && (
                        <span className="p">
                          {n.partial} {STATUS_MINI.partial}
                        </span>
                      )}
                    </span>
                    <span className="o">{t.owner}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Always, not only under a filter — m is the number people assume. */}
          <div className="cq-count">
            <span>
              Showing {rows.length} of {targets.length}{' '}
              {targets.length === 1 ? 'story' : 'stories'}
            </span>
            {filter && (
              <button className="cq-link" onClick={() => setFilter(null)}>
                Show all
              </button>
            )}
          </div>
        </aside>

        {/* ── Detail: the story picked on the left ── */}
        <div className="cq-detail">
          {target ? (
            <ReviewPanel target={target} onAct={onAct} />
          ) : (
            <div className="cq-blank">
              <b>No story matches this filter.</b>
              <p>Clear the filter above to see the rest of the stories with code.</p>
              <button className="cq-btn" onClick={() => setFilter(null)}>
                Show all stories
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
