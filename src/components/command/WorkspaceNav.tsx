import React, { useState } from 'react';
import { ModuleKey } from '../../types';
import { MODULE_DEFS } from '../../data/modules';
import { ChevronDown } from 'lucide-react';
import { ModuleIcon } from '../common/ModuleIcons';

/**
 * Secondary navigation for direct jumps. The pipeline cards are the primary
 * doors — this exists for when you already know where you are going.
 */
export const WorkspaceNav: React.FC<{
  /** Modules the project has enabled; others render disabled. */
  enabled: ModuleKey[];
  /** Modules the persona owns work in; others open read-only. */
  ownedModules: ModuleKey[];
  onOpen: (module: ModuleKey) => void;
}> = ({ enabled, ownedModules, onOpen }) => {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-2.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 text-left"
      >
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">
          Open a workspace
        </h2>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MODULE_DEFS.map((def) => {
            const isEnabled = enabled.includes(def.key);
            const readOnly = isEnabled && !ownedModules.includes(def.key);

            return (
              <button
                key={def.key}
                disabled={!isEnabled}
                onClick={() => onOpen(def.key)}
                title={
                  !isEnabled
                    ? "This module isn't enabled for this project."
                    : readOnly
                    ? 'You have read-only access to this workspace.'
                    : undefined
                }
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  isEnabled
                    ? 'cursor-pointer border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md'
                    : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ModuleIcon module={def.key} size="sm" />
                  <span className="text-xs font-extrabold text-slate-900">{def.name}</span>
                </div>
                <p className="mt-2 text-[10px] leading-snug text-slate-500">
                  {def.pipeline.workspaceSubLabel}
                </p>
                {readOnly && (
                  <span className="mt-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                    Read-only
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
