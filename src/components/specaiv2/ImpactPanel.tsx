import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, FileCode, FileCog, FlaskConical } from 'lucide-react';
import { ModuleKind, codeImpact, jiraImpact } from '../../data/specImpact';

/**
 * The same delta, seen through the two systems people actually work in.
 *
 * Jira reads epic → story → task; the codebase reads repository → schema →
 * contract → code → test. Neither is a summary of the other: they are two
 * projections of one delta, which is why they cannot fall out of step.
 */

const KIND_ICON: Record<ModuleKind, React.ReactNode> = {
  schema: <Database size={11} />,
  config: <FileCog size={11} />,
  code: <FileCode size={11} />,
  test: <FlaskConical size={11} />,
};

export const ImpactPanel: React.FC<{
  onDiscuss: (question: string) => void;
  /** Which lens this persona reasons in. */
  lens: 'jira' | 'code';
  onLens: (lens: 'jira' | 'code') => void;
}> = ({ onDiscuss, lens, onLens }) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['AUTH-61', 'mobile-app']));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const epic = jiraImpact();
  const repos = codeImpact();
  const taskCount = epic.stories.reduce((n, s) => n + s.tasks.length, 0);
  const moduleCount = repos.reduce((n, r) => n + r.modules.length, 0);

  return (
    <div className="wpanel">
      <div className="lens">
        <button className={lens === 'jira' ? 'on' : ''} onClick={() => onLens('jira')}>
          Jira <i>{taskCount}</i>
        </button>
        <button className={lens === 'code' ? 'on' : ''} onClick={() => onLens('code')}>
          Code <i>{moduleCount}</i>
        </button>
      </div>

      {lens === 'jira' ? (
        <>
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
        </>
      ) : (
        <>
          <div className="wsec">
            Repositories <span>{repos.length} touched</span>
          </div>

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
        </>
      )}
    </div>
  );
};
