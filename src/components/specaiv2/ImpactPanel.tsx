import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileCode,
  FileCog,
  FlaskConical,
  GitBranch,
  Ticket,
} from 'lucide-react';
import { ModuleKind, codeImpact, jiraImpact } from '../../data/specImpact';

/**
 * The same delta, seen through the two systems people actually work in.
 *
 * Jira reads epic → story → task; the codebase reads repository → schema →
 * contract → code → test. Neither is a summary of the other: they are two
 * projections of one delta, which is why they cannot fall out of step.
 *
 * They used to be behind a toggle, which meant reading one cost you sight of the
 * other and answering "what does this change touch" took two clicks and a memory
 * of what the first tab said. Both are stacked now — the question is what the
 * change touches, and the answer is all of it.
 *
 * The persona decides which tile leads, not which tile exists.
 */

const KIND_ICON: Record<ModuleKind, React.ReactNode> = {
  schema: <Database size={11} />,
  config: <FileCog size={11} />,
  code: <FileCode size={11} />,
  test: <FlaskConical size={11} />,
};

export const ImpactPanel: React.FC<{
  onDiscuss: (question: string) => void;
  /** Which projection this persona leads with. */
  lens: 'jira' | 'code';
}> = ({ onDiscuss, lens }) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['AUTH-61', 'mobile-app']));
  /* Both tiles start open. A collapsed tile is a tile you have to remember to
     look in, and there are only two. */
  const [tiles, setTiles] = useState<Set<string>>(() => new Set(['jira', 'code']));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTile = (id: string) =>
    setTiles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const epic = jiraImpact();
  const repos = codeImpact();
  const taskCount = epic.stories.reduce((n, s) => n + s.tasks.length, 0);
  const moduleCount = repos.reduce((n, r) => n + r.modules.length, 0);

  const jiraTile = (
    <section className="tile" key="jira">
      <button className="tile-h" onClick={() => toggleTile('jira')}>
        {tiles.has('jira') ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Ticket size={13} />
        <b>Jira</b>
        <span>
          {epic.stories.length} stor{epic.stories.length === 1 ? 'y' : 'ies'} · {taskCount} tasks
        </span>
      </button>

      {tiles.has('jira') && (
        <div className="tile-b">
          <div className="wsec">
            {epic.key} {epic.title} <span>{epic.status}</span>
          </div>

          {epic.stories.map((story) => {
            const isOpen = open.has(story.key);
            return (
              <div className="tree" key={story.key}>
                <button className="tree-h" onClick={() => toggle(story.key)}>
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="tree-k">{story.key}</span>
                  <span className="tree-t">{story.title}</span>
                  <span className="tree-m">{story.points} pts</span>
                </button>

                {isOpen &&
                  story.tasks.map((task) => (
                    <div className={`tree-c ${task.blocked ? 'blocked' : ''}`} key={task.key}>
                      <span className="tree-k">{task.key}</span>
                      <span className="tree-t">{task.title}</span>
                      {task.blocked && (
                        <button className="chip soft" onClick={() => onDiscuss(task.blocked!)}>
                          Blocked
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const codeTile = (
    <section className="tile" key="code">
      <button className="tile-h" onClick={() => toggleTile('code')}>
        {tiles.has('code') ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <GitBranch size={13} />
        <b>Code</b>
        <span>
          {repos.length} repos · {moduleCount} files
        </span>
      </button>

      {tiles.has('code') && (
        <div className="tile-b">
          {repos.map((repo) => {
            const isOpen = open.has(repo.repo);
            return (
              <div className="tree" key={repo.repo}>
                <button className="tree-h" onClick={() => toggle(repo.repo)}>
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="tree-t">{repo.repo}</span>
                  <span className="tree-m">{repo.modules.length} files</span>
                </button>

                {isOpen && (
                  <>
                    <div className="tree-b">{repo.branchHint}</div>
                    {repo.modules.map((m) => (
                      <div className="tree-c" key={m.path}>
                        <span className={`tree-i ${m.kind}`}>{KIND_ICON[m.kind]}</span>
                        <span className="tree-t mono">{m.path}</span>
                        <span className="tree-m">{m.kind}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}

          <div className="wnote">
            Schema first: a migration gates everything that reads it, so the order above is the
            order it would be built in.
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="wpanel tiles">
      {lens === 'code' ? [codeTile, jiraTile] : [jiraTile, codeTile]}
    </div>
  );
};
