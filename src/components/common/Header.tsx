import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { isGovernanceRole, isModuleWorkspace } from '../../data/rbac';
import {
  Search,
  Activity,
  ChevronDown,
  User,
  ShieldAlert,
  Check,
  Layers,
  Building2,
  FolderGit2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight as Chevron,
} from 'lucide-react';

import incedoLogoSrc from '../../assets/incedo-logo.png';

const BrainSparkLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="16" cy="16" r="15" fill="#EEF2FF" stroke="#6366f1" strokeWidth="1.2" />
    <path d="M11 12c0-2.2 2.2-4 5-4s5 1.8 5 4c0 1.5-1 2.8-2.5 3.5.3.8.5 1.7.5 2.5 0 2.8-1.3 5-3 5s-3-2.2-3-5c0-.8.2-1.7.5-2.5C12 14.8 11 13.5 11 12z" fill="#c7d2fe" stroke="#6366f1" strokeWidth="1" strokeLinejoin="round" />
    <circle cx="14" cy="12" r="1" fill="#6366f1" />
    <circle cx="18" cy="12" r="1" fill="#6366f1" />
    <circle cx="16" cy="15" r="0.8" fill="#6366f1" />
    <path d="M14 12l2 3m2-3l-2 3" stroke="#6366f1" strokeWidth="0.7" strokeLinecap="round" />
    <path d="M13 10.5c-1.2.3-2 1-2 1.8" stroke="#818cf8" strokeWidth="0.6" strokeLinecap="round" />
    <path d="M19 10.5c1.2.3 2 1 2 1.8" stroke="#818cf8" strokeWidth="0.6" strokeLinecap="round" />
    <circle cx="16" cy="18.5" r="0.6" fill="#818cf8" />
    <path d="M15 17l1 1.5 1-1.5" stroke="#818cf8" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Header: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    currentScope,
    setCurrentScope,
    searchQuery,
    setSearchQuery,
    tasks,
    departments,
    projects,
    setActiveNav,
    logout,
    currentUser,
    activeNav,
    navCollapsed,
    setNavCollapsed,
  } = useApp();

  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  /*
   * Mine, everywhere. Filtered on the display name because that is what a task
   * carries; `assigneeId` is the stable reference and is preferred where it is
   * set. Completed work is excluded — activity is what is still true.
   */
  const myItems = tasks.filter(
    (t) =>
      (t.assigneeId ? t.assigneeId === currentUser?.memberId : t.assignee === currentUser?.name) &&
      t.status !== 'Completed'
  );

  /* Grouped by project, with the one you are in first — you are most likely to
     act on where you already are. */
  const activityProjects = [...new Set(myItems.map((t) => t.projectId))].sort((a, b) =>
    a === currentScope.projectId ? -1 : b === currentScope.projectId ? 1 : 0
  );

  /*
   * Selecting an item moves the global scope to that project. Deliberately not
   * gated on `canSwitchScope`: that rule stops people browsing projects they
   * have no business in, and this only ever offers projects where they already
   * hold assigned work.
   */
  const openActivity = (projectId: string) => {
    const proj = projects.find((x) => x.id === projectId);
    if (proj) {
      setCurrentScope({
        type: 'project',
        departmentId: proj.departmentId,
        departmentName: proj.departmentName,
        projectId: proj.id,
        projectName: proj.name,
      });
    }
    setNotifOpen(false);
    setActiveNav('My Tasks');
  };

  // Only the roles the signed-in identity is entitled to act as.
  const rolesList: { role: Role; category: string }[] = (currentUser?.roles ?? []).map((role) => ({
    role,
    category: isGovernanceRole(role) ? 'Platform Governance' : 'PDLC Personas',
  }));

  // Scope entitlement: Tenant Admin roams the platform, Department Admin stays inside
  // its own department, everyone else is pinned to their assigned project.
  const canSwitchScope = currentRole === 'Tenant Admin' || currentRole === 'Department Admin';
  const visibleDepartments =
    currentRole === 'Tenant Admin'
      ? departments
      : departments.filter((t) => t.id === currentUser?.scope.departmentId);
  const visibleProjects =
    currentRole === 'Tenant Admin'
      ? projects
      : projects.filter((p) => p.departmentId === currentUser?.scope.departmentId);

  const handleScopeSelect = (type: 'tenant' | 'department' | 'project', id?: string, name?: string) => {
    if (type === 'tenant') {
      setCurrentScope({ type: 'tenant', departmentName: 'All Departments' });
    } else if (type === 'department') {
      const t = departments.find((x) => x.id === id);
      setCurrentScope({
        type: 'department',
        departmentId: id,
        departmentName: t ? t.name : name || 'Department',
      });
    } else if (type === 'project') {
      const p = projects.find((x) => x.id === id);
      setCurrentScope({
        type: 'project',
        departmentId: p?.departmentId,
        projectId: id,
        departmentName: p?.departmentName,
        projectName: p ? p.name : name || 'Project',
      });
    }
    setScopeDropdownOpen(false);
  };

  return (
    <header className="z-30 flex h-12 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-5">
      {/* Left — Logo + Scope */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setNavCollapsed(!navCollapsed)}
          title={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          {navCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-2.5">
          <img src={incedoLogoSrc} alt="Incedo" className="h-5 w-auto object-contain" />
          <span className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <BrainSparkLogo className="h-6 w-6" />
            <span className="text-sm font-bold tracking-tight text-slate-900">
              br<span className="text-orange-500">AI</span>nspark
            </span>
          </div>
        </div>

        <span className="h-4 w-px bg-slate-200" />

        {isModuleWorkspace(activeNav) ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              onClick={() => setActiveNav('Command Centre')}
              className="font-medium text-indigo-600 hover:underline cursor-pointer"
            >
              Command Centre
            </button>
            <Chevron className="w-3 h-3 text-slate-300" />
            <span className="font-semibold text-slate-800">{activeNav}</span>
            <span className="text-slate-300 mx-1">·</span>
            <select
              value={currentScope.projectId ?? ''}
              onChange={(e) => {
                const p = projects.find((x) => x.id === e.target.value);
                if (p)
                  setCurrentScope({
                    type: 'project',
                    departmentId: p.departmentId,
                    departmentName: p.departmentName,
                    projectId: p.id,
                    projectName: p.name,
                  });
              }}
              className="max-w-[12rem] cursor-pointer rounded-md border-none bg-transparent text-xs font-semibold text-slate-700 outline-none"
            >
              {visibleProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="relative">
            {!canSwitchScope ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500" title={`Scoped to this project`}>
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">{currentScope.projectName}</span>
              </div>
            ) : (
              <button
                onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                {currentScope.type === 'tenant' && <Layers className="w-3.5 h-3.5 text-slate-400" />}
                {currentScope.type === 'department' && <Building2 className="w-3.5 h-3.5 text-indigo-500" />}
                {currentScope.type === 'project' && <FolderGit2 className="w-3.5 h-3.5 text-emerald-500" />}
                <span>
                  {currentScope.type === 'tenant' && 'All Departments'}
                  {currentScope.type === 'department' && currentScope.departmentName}
                  {currentScope.type === 'project' && currentScope.projectName}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}

            {scopeDropdownOpen && (
              <div className="absolute top-full left-0 z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/8 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Scope</div>
                {currentRole === 'Tenant Admin' && (
                  <button
                    onClick={() => handleScopeSelect('tenant')}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
                      currentScope.type === 'tenant' ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>All Departments</span>
                    </div>
                    {currentScope.type === 'tenant' && <Check className="w-3.5 h-3.5" />}
                  </button>
                )}
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Departments</div>
                {visibleDepartments.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleScopeSelect('department', t.id, t.name)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-slate-50 ${
                      currentScope.departmentId === t.id && currentScope.type === 'department' ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </div>
                    {currentScope.departmentId === t.id && currentScope.type === 'department' && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Projects</div>
                {visibleProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleScopeSelect('project', p.id, p.name)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-slate-50 ${
                      currentScope.projectId === p.id && currentScope.type === 'project' ? 'text-emerald-600 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderGit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </div>
                    {currentScope.projectId === p.id && currentScope.type === 'project' && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center — Search */}
      <div className="hidden md:flex items-center relative max-w-sm w-full">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          placeholder="Search…"
          className="w-full rounded-lg border border-slate-200/70 bg-slate-50/50 py-1.5 pr-7 pl-8 text-xs text-slate-700 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400/20"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2 text-slate-400 hover:text-slate-600 text-[10px] font-semibold cursor-pointer">
            ✕
          </button>
        )}

        {searchFocused && searchQuery.length > 0 && (
          <div className="absolute top-full right-0 left-0 z-50 mt-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/8 text-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 pb-1.5">Results</div>
            <div className="space-y-0.5">
              <div onClick={() => setActiveNav('Projects')} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                <span className="font-medium text-slate-800">Mobile Banking V2</span>
                <span className="text-[10px] text-slate-400">Project</span>
              </div>
              <div onClick={() => setActiveNav('Agent Registry')} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                <span className="font-medium text-slate-800">CodeIQ Generation & Review</span>
                <span className="text-[10px] text-slate-400">Agent</span>
              </div>
              <div onClick={() => setActiveNav('Connectors')} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                <span className="font-medium text-slate-800">Jira Integration</span>
                <span className="text-[10px] text-slate-400">Connector</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right — Role, Notifications, Profile */}
      <div className="flex items-center gap-1.5">
        {/* Role switcher */}
        <div className="relative">
          {rolesList.length > 1 ? (
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
              title="Switch role"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline text-slate-800 font-semibold">{currentRole}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-500">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">{currentRole}</span>
            </div>
          )}

          {roleMenuOpen && rolesList.length > 1 && (
            <div className="absolute top-full right-0 z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/8 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="font-semibold text-slate-900">Switch Role</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {currentUser?.primaryRole === 'Tenant Admin'
                    ? 'Impersonate any persona'
                    : `Assigned to ${currentUser?.name}`}
                </div>
              </div>
              <div className="py-1">
                {rolesList.map((r, idx) => {
                  const isFirstOfCat = idx === 0 || rolesList[idx - 1].category !== r.category;
                  return (
                    <React.Fragment key={r.role}>
                      {isFirstOfCat && (
                        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{r.category}</div>
                      )}
                      <button
                        onClick={() => { setCurrentRole(r.role); setRoleMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-slate-50 ${
                          currentRole === r.role ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className={`w-3.5 h-3.5 ${currentRole === r.role ? 'text-indigo-500' : 'text-slate-400'}`} />
                          <span>{r.role}</span>
                        </div>
                        {currentRole === r.role && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/*
          My Activity — everything of mine, across every project.

          It replaced the notification bell, which listed things that had
          happened. This lists things that are still true and still mine, which
          is the only version worth opening. Selecting one moves the global
          project scope to wherever that work lives, so the whole app follows the
          thing you clicked rather than making you find the switcher yourself.
        */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span className="text-[11px] font-semibold">My Activity</span>
            {myItems.length > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-px text-[9px] font-bold text-white">
                {myItems.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-full right-0 z-50 mt-1.5 w-80 rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/8 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="font-semibold text-slate-900">My Activity</span>
                <span className="text-[10px] text-slate-400">
                  {activityProjects.length} project{activityProjects.length === 1 ? '' : 's'}
                </span>
              </div>

              {myItems.length === 0 ? (
                <div className="p-5 text-center text-slate-400">Nothing assigned to you.</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {activityProjects.map((pid) => {
                    const proj = projects.find((x) => x.id === pid);
                    const rows = myItems.filter((t) => t.projectId === pid);
                    const here = currentScope.projectId === pid;
                    return (
                      <div key={pid}>
                        <div className="flex items-center gap-1.5 bg-slate-50/70 px-3 py-1.5">
                          <FolderGit2 className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {proj?.name ?? pid}
                          </span>
                          {here && (
                            <span className="ml-auto text-[9px] font-semibold text-indigo-600">
                              current
                            </span>
                          )}
                        </div>
                        {rows.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => openActivity(t.projectId)}
                            className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-indigo-50/40 cursor-pointer"
                          >
                            <span
                              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                                t.status === 'Blocked'
                                  ? 'bg-rose-500'
                                  : t.status === 'Needs Approval'
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-400'
                              }`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium leading-tight text-slate-800">
                                {t.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {t.status}
                                {t.reviewHoursOpen ? ` · waiting ${t.reviewHoursOpen}h` : ''}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <span className="h-4 w-px bg-slate-200 mx-1" />

        {/* Profile */}
        <div className="flex items-center gap-2">
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-[10px] font-bold text-white">
              {(currentUser?.name || currentRole).split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="hidden lg:block leading-none">
            <div className="text-[11px] font-semibold text-slate-800">{currentUser?.name}</div>
          </div>
          <button onClick={logout} title="Sign out" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
