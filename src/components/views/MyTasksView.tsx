import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { isGovernanceRole } from '../../data/rbac';
import { CheckSquare, Check, X, Calendar, User, FileText, Sparkles, CheckCircle2 } from 'lucide-react';

export const MyTasksView: React.FC = () => {
  const { tasks, completeTask, approveTaskArtifact, currentUser, currentRole, currentScope } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Project Admins oversee the whole project queue; PDLC personas see only what
  // is assigned to them.
  const isOversight = isGovernanceRole(currentRole);
  const myTasks = tasks.filter((t) =>
    isOversight ? t.project === currentScope.projectName : t.assignee === currentUser?.name
  );

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask: Task | null =
    myTasks.find((t) => t.id === selectedTaskId) || myTasks[0] || null;

  const filteredTasks = myTasks.filter((t) => {
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">My Tasks</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Personal task queue and human-in-the-loop approval sign-offs for AI generated artifacts
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {['All', 'Needs Approval', 'In Progress', 'Completed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              filterStatus === st
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-1 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
              No tasks found for status "{filterStatus}".
            </div>
          ) : (
            filteredTasks.map((t) => {
              const isSelected = selectedTask?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        t.priority === 'High'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.priority} Priority
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        t.status === 'Needs Approval'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : t.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">{t.title}</h3>
                  <div className="text-[11px] text-slate-500 mt-1">Project: {t.project}</div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Due {t.dueDate}</span>
                    <span>{t.module}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Task Detail & Human-in-the-Loop Sign-Off Card */}
        {selectedTask ? (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {selectedTask.module} • {selectedTask.project}
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{selectedTask.title}</h2>
              </div>

              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  selectedTask.status === 'Needs Approval'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {selectedTask.status}
              </span>
            </div>

            {selectedTask.artifactTitle && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>AI Generated Artifact Review</span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-900">{selectedTask.artifactTitle}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedTask.artifactSummary}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">Assigned to: <strong className="text-slate-800">{selectedTask.assignee}</strong></span>

              {selectedTask.status === 'Needs Approval' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => completeTask(selectedTask.id)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl"
                  >
                    Reject Artifact
                  </button>
                  <button
                    onClick={() => approveTaskArtifact(selectedTask.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Sign-Off</span>
                  </button>
                </div>
              ) : selectedTask.status !== 'Completed' ? (
                <button
                  onClick={() => completeTask(selectedTask.id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Mark Completed
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Signed off & completed
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            Select a task on the left to inspect artifact details.
          </div>
        )}
      </div>
    </div>
  );
};
