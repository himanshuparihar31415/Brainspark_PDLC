import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { isGovernanceRole, isModuleWorkspace } from '../../data/rbac';
import {
  Brain,
  Search,
  Bell,
  ChevronDown,
  User,
  ShieldAlert,
  SlidersHorizontal,
  Check,
  ExternalLink,
  Layers,
  Building2,
  FolderGit2,
  Sparkles,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight as Chevron,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    currentScope,
    setCurrentScope,
    searchQuery,
    setSearchQuery,
    notifications,
    markNotificationRead,
    tenants,
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

  const unreadNotifs = notifications.filter((n) => !n.read);

  // Only the roles the signed-in identity is entitled to act as.
  const rolesList: { role: Role; category: string }[] = (currentUser?.roles ?? []).map((role) => ({
    role,
    category: isGovernanceRole(role) ? 'Platform Governance' : 'PDLC Personas',
  }));

  // Scope entitlement: Super Admin roams the platform, Tenant Admin stays inside
  // its own tenant, everyone else is pinned to their assigned project.
  const canSwitchScope = currentRole === 'Super Admin' || currentRole === 'Tenant Admin';
  const visibleTenants =
    currentRole === 'Super Admin'
      ? tenants
      : tenants.filter((t) => t.id === currentUser?.scope.tenantId);
  const visibleProjects =
    currentRole === 'Super Admin'
      ? projects
      : projects.filter((p) => p.tenantId === currentUser?.scope.tenantId);

  const handleScopeSelect = (type: 'platform' | 'tenant' | 'project', id?: string, name?: string) => {
    if (type === 'platform') {
      setCurrentScope({ type: 'platform', tenantName: 'All Tenants' });
    } else if (type === 'tenant') {
      const t = tenants.find((x) => x.id === id);
      setCurrentScope({
        type: 'tenant',
        tenantId: id,
        tenantName: t ? t.name : name || 'Tenant',
      });
    } else if (type === 'project') {
      const p = projects.find((x) => x.id === id);
      setCurrentScope({
        type: 'project',
        tenantId: p?.tenantId,
        projectId: id,
        tenantName: p?.tenantName,
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

        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-bold tracking-tight text-slate-900">
            br<span className="text-indigo-600">AI</span>nspark
          </span>
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
                    tenantId: p.tenantId,
                    tenantName: p.tenantName,
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
                {currentScope.type === 'platform' && <Layers className="w-3.5 h-3.5 text-slate-400" />}
                {currentScope.type === 'tenant' && <Building2 className="w-3.5 h-3.5 text-indigo-500" />}
                {currentScope.type === 'project' && <FolderGit2 className="w-3.5 h-3.5 text-emerald-500" />}
                <span>
                  {currentScope.type === 'platform' && 'All Tenants'}
                  {currentScope.type === 'tenant' && currentScope.tenantName}
                  {currentScope.type === 'project' && currentScope.projectName}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}

            {scopeDropdownOpen && (
              <div className="absolute top-full left-0 z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/8 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Scope</div>
                {currentRole === 'Super Admin' && (
                  <button
                    onClick={() => handleScopeSelect('platform')}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
                      currentScope.type === 'platform' ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Platform</span>
                    </div>
                    {currentScope.type === 'platform' && <Check className="w-3.5 h-3.5" />}
                  </button>
                )}
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tenants</div>
                {visibleTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleScopeSelect('tenant', t.id, t.name)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-slate-50 ${
                      currentScope.tenantId === t.id && currentScope.type === 'tenant' ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </div>
                    {currentScope.tenantId === t.id && currentScope.type === 'tenant' && <Check className="w-3.5 h-3.5 shrink-0" />}
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
                  {currentUser?.primaryRole === 'Super Admin'
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

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-full right-0 z-50 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/8 text-xs">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-900">Notifications</span>
                {unreadNotifs.length > 0 && (
                  <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">{unreadNotifs.length}</span>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="p-5 text-center text-slate-400">All clear</div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`px-3 py-2.5 transition-colors cursor-pointer hover:bg-slate-50 ${!n.read ? 'bg-indigo-50/20' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`leading-tight ${!n.read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{n.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                      </div>
                      {n.link && <div className="mt-1 text-[10px] text-indigo-600 font-medium">{n.link} →</div>}
                    </div>
                  ))}
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
