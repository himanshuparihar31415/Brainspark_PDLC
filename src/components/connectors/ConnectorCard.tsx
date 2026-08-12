import React, { useState } from 'react';
import { Connector } from '../../types';
import {
  ACTION_LABEL,
  CardState,
  CardTone,
  ConnectorAction,
  Drill,
} from '../../data/connectors';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Figma,
  GitBranch,
  Github,
  Plug,
  Rocket,
  Sparkles,
  Ticket,
} from 'lucide-react';

/**
 * One connector, at one rung.
 *
 * The card knows nothing about the ladder. It is handed a badge, a sentence and
 * a list of actions, and it renders them — every decision about which of those
 * to show lives in `cardState`, where the three readings sit next to each other
 * and can be compared. Adding a state is a return there, not a branch here.
 */

const TONE: Record<CardTone, string> = {
  accent: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  muted: 'border-slate-200 bg-slate-100 text-slate-500',
};

/** Recognisable at a glance beats a generic plug on every card. */
const ICON: Record<string, React.ElementType> = {
  'conn-jira': Ticket,
  'conn-github': Github,
  'conn-gitlab': GitBranch,
  'conn-figma': Figma,
  'conn-cicd': Rocket,
  'conn-confluence': BookOpen,
  'conn-cursor': Sparkles,
};

/** Destructive actions read as destructive; the rest are quiet. */
const isDanger = (a: ConnectorAction) => a === 'withdraw' || a === 'disable';
const isPrimary = (a: ConnectorAction) =>
  a === 'connect' || a === 'enable' || a === 'make-available' || a === 'retry';

export const ConnectorCard: React.FC<{
  connector: Connector;
  state: CardState;
  drill?: Drill | null;
  /** `targetId` is the department or project the row stands for. */
  onAction: (action: ConnectorAction, targetId?: string) => void;
}> = ({ connector, state, drill, onAction }) => {
  const [open, setOpen] = useState(false);
  const Icon = ICON[connector.id] ?? Plug;
  /* A withdrawn or unavailable connector is still listed — you need to know it
     exists and who closed it — but it should not compete with the live ones. */
  const dimmed = state.tone === 'muted';

  return (
    <section
      className={`flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-opacity ${
        dimmed ? 'opacity-70' : ''
      }`}
      aria-label={connector.name}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{connector.name}</p>
          <p className="text-[11px] text-slate-400">{connector.category}</p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${TONE[state.tone]}`}
        >
          {state.badge}
        </span>
      </div>

      {/* The counts, or the reason there is nothing to do. Never omitted — a
          badge with no sentence under it is the old table with rounded corners.

          Where there is a rung beneath, the sentence is the way into it: the
          count and the things counted are the same object, so clicking the
          number should show them. */}
      {drill && drill.rows.length > 0 ? (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-start gap-1.5 text-left text-[11px] leading-relaxed text-slate-600 hover:text-slate-900"
        >
          <span className="mt-px shrink-0 text-slate-400">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
          <span className="flex-1">{state.meta}</span>
        </button>
      ) : (
        <p className="text-[11px] leading-relaxed text-slate-600">{state.meta}</p>
      )}

      {open && drill && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/70">
          <p className="border-b border-slate-100 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {drill.title}
          </p>
          {drill.rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-1.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold text-slate-800">
                  {r.label}
                </span>
                <span
                  className={`block truncate text-[10px] ${
                    r.tone === 'danger'
                      ? 'text-rose-600'
                      : r.tone === 'warning'
                      ? 'text-amber-700'
                      : r.tone === 'success'
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  {r.status}
                </span>
              </span>

              {r.action && (
                <button
                  onClick={() => onAction(r.action!, r.id)}
                  className={`shrink-0 cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                    r.action === 'disable'
                      ? 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                      : r.action === 'configure'
                      ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {ACTION_LABEL[r.action]}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {connector.usedByModules.map((m) => (
          <span
            key={m}
            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
          >
            {m}
          </span>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
        {state.actions.length === 0 ? (
          /* Not a greyed-out button: a disabled control invites a click and
             explains nothing. The reason is in the meta line above. */
          <span className="text-[11px] text-slate-400">No action available</span>
        ) : (
          state.actions.map((a) => (
            <button
              key={a}
              onClick={() => onAction(a)}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                isDanger(a)
                  ? 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                  : isPrimary(a)
                  ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {ACTION_LABEL[a]}
            </button>
          ))
        )}
      </div>
    </section>
  );
};
