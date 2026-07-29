import React from 'react';
import { useApp, NavView } from '../../context/AppContext';
import { canAccessNav } from '../../data/rbac';
import {
  LayoutDashboard,
  Building2,
  FolderGit2,
  Users,
  Plug,
  Cpu,
  Award,
  Terminal,
  ShieldCheck,
  Sparkles,
  GitMerge,
  CheckSquare,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface NavItemDef {
  label: NavView;
  icon: React.ElementType;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { currentRole, activeNav, setActiveNav, tasks, agents } = useApp();

  const pendingTasksCount = tasks.filter((t) => t.status === 'Needs Approval').length;
  const heldAgentsCount = agents.filter((a) => a.status === 'Held').length;

  const navItems: NavItemDef[] = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Tenants', icon: Building2 },
    { label: 'Projects', icon: FolderGit2 },
    { label: 'Team', icon: Users },
    { label: 'Connectors', icon: Plug },
    {
      label: 'Agent Registry',
      icon: Cpu,
      badge: heldAgentsCount > 0 ? `${heldAgentsCount} Held` : undefined,
    },
    { label: 'Evaluation', icon: Award },
    { label: 'Prompt Controls', icon: Terminal },
    { label: 'Security', icon: ShieldCheck },
    { label: 'My Services', icon: Sparkles },
    { label: 'Command Centre', icon: GitMerge },
    {
      label: 'My Tasks',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? `${pendingTasksCount}` : undefined,
    },
  ];

  // Subtractive visibility filter — driven by the shared RBAC map
  const visibleNavs = navItems.filter((item) => canAccessNav(currentRole, item.label));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0 select-none">
      <div className="py-4">
        <div className="px-5 mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Navigation ({currentRole})
          </span>
        </div>

        <nav className="space-y-1 px-3">
          {visibleNavs.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;

            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-indigo-500 text-white'
                        : item.label === 'Agent Registry'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <button className="flex items-center gap-1.5 hover:text-white transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help & docs</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-white transition-colors">
            <FileText className="w-3.5 h-3.5" />
            <span>What's new</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
