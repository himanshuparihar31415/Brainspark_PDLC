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
  Activity,
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
  const { currentRole, activeNav, setActiveNav, tasks, agents, navCollapsed } = useApp();

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
    { label: 'Observability', icon: Activity },
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
    <aside
      className={`glass z-20 flex shrink-0 select-none flex-col justify-between border-r border-white/50 text-slate-700 transition-all duration-200 ${
        navCollapsed ? 'w-14' : 'w-64'
      }`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {!navCollapsed && (
          <div className="mb-3 flex items-center justify-between px-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Navigation ({currentRole})
            </span>
          </div>
        )}

        <nav className={`space-y-1 ${navCollapsed ? 'px-2' : 'px-3'}`}>
          {visibleNavs.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;

            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                title={navCollapsed ? item.label : undefined}
                className={`flex w-full cursor-pointer items-center rounded-xl py-2.5 text-xs font-semibold transition-all duration-150 ${
                  navCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                  />
                  {!navCollapsed && <span>{item.label}</span>}
                </div>
                {item.badge && !navCollapsed && (
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.label === 'Agent Registry'
                        ? 'border border-amber-300/60 bg-amber-50 text-amber-700'
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
      <div
        className={`ios-hairline shrink-0 border-t bg-white/30 ${
          navCollapsed ? 'p-2' : 'p-4'
        }`}
      >
        {navCollapsed ? null : (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <button className="flex items-center gap-1.5 transition-colors hover:text-indigo-600">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Help & docs</span>
            </button>
            <button className="flex items-center gap-1.5 transition-colors hover:text-indigo-600">
              <FileText className="h-3.5 w-3.5" />
              <span>What's new</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
