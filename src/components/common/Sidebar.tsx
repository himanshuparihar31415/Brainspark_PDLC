import React from 'react';
import { useApp, NavView } from '../../context/AppContext';
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
  visibleTo: string[]; // Role matching or 'ALL_GOVERNANCE', 'ALL_PDLC', 'ALL'
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { currentRole, activeNav, setActiveNav, tasks, agents, notifications } = useApp();

  const isGovernanceRole = ['Super Admin', 'Tenant Admin', 'Project Admin'].includes(currentRole);
  const isPdlcRole = [
    'Product Manager',
    'Architect',
    'Designer',
    'Tech Lead',
    'Developer',
    'QA Manager',
    'QA Engineer',
    'Release Manager',
  ].includes(currentRole);

  const pendingTasksCount = tasks.filter((t) => t.status === 'Needs Approval').length;
  const heldAgentsCount = agents.filter((a) => a.status === 'Held').length;

  const navItems: NavItemDef[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      visibleTo: ['Super Admin', 'Tenant Admin', 'Project Admin'],
    },
    {
      label: 'Tenants',
      icon: Building2,
      visibleTo: ['Super Admin'],
    },
    {
      label: 'Projects',
      icon: FolderGit2,
      visibleTo: ['Super Admin', 'Tenant Admin'],
    },
    {
      label: 'Team',
      icon: Users,
      visibleTo: ['Super Admin', 'Tenant Admin', 'Project Admin'],
    },
    {
      label: 'Connectors',
      icon: Plug,
      visibleTo: ['Super Admin', 'Tenant Admin', 'Project Admin'],
    },
    {
      label: 'Agent Registry',
      icon: Cpu,
      visibleTo: ['Super Admin', 'Tenant Admin', 'Project Admin'],
      badge: heldAgentsCount > 0 ? `${heldAgentsCount} Held` : undefined,
    },
    {
      label: 'Evaluation',
      icon: Award,
      visibleTo: ['Super Admin', 'Tenant Admin', 'Project Admin'],
    },
    {
      label: 'Prompt Controls',
      icon: Terminal,
      visibleTo: ['Super Admin', 'Tenant Admin', 'Project Admin'],
    },
    {
      label: 'Security',
      icon: ShieldCheck,
      visibleTo: ['Super Admin', 'Tenant Admin', 'Project Admin'],
    },
    {
      label: 'My Services',
      icon: Sparkles,
      visibleTo: ['Product Manager', 'Architect', 'Designer', 'Tech Lead', 'Developer', 'QA Manager', 'QA Engineer', 'Release Manager'],
    },
    {
      label: 'Orchestration',
      icon: GitMerge,
      visibleTo: [
        'Project Admin',
        'Product Manager',
        'Architect',
        'Designer',
        'Tech Lead',
        'Developer',
        'QA Manager',
        'QA Engineer',
        'Release Manager',
      ],
    },
    {
      label: 'My Tasks',
      icon: CheckSquare,
      visibleTo: [
        'Project Admin',
        'Product Manager',
        'Architect',
        'Designer',
        'Tech Lead',
        'Developer',
        'QA Manager',
        'QA Engineer',
        'Release Manager',
      ],
      badge: pendingTasksCount > 0 ? `${pendingTasksCount}` : undefined,
    },
  ];

  // Subtractive visibility filter
  const visibleNavs = navItems.filter((item) => item.visibleTo.includes(currentRole));

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
