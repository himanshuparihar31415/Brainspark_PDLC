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
    // shrink-0 rather than sticky: the shell has a definite height now, so the
    // header is genuinely fixed at the top instead of pretending to be.
    <header className="glass z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/50 px-4 md:px-6">
      {/* Left branding & Scope Selector */}
      <div className="flex items-center gap-4 lg:gap-6">
        {/* Nav collapse — pinned open or closed by the user, auto-set on entry */}
        <button
          onClick={() => setNavCollapsed(!navCollapsed)}
          title={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900"
        >
          {navCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-600/30">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                br<span className="text-orange-500">A</span>Inspark
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                PDLC OS
              </span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {isModuleWorkspace(activeNav) ? (
          /* Module context lives in the upper bar, not inside the workspace */
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setActiveNav('Command Centre')}
              className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer shrink-0"
            >
              Command Centre
            </button>
            <Chevron className="w-3 h-3 text-slate-300 shrink-0" />
            <span className="text-xs font-extrabold text-slate-900 shrink-0">{activeNav}</span>
            <span className="text-slate-300 shrink-0">·</span>
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
              className="min-w-0 max-w-[14rem] cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
            >
              {visibleProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
        /* Scope Selector */
        <div className="relative">
          {!canSwitchScope ? (
            <div
              className="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-not-allowed"
              title={`Your ${currentRole} role is scoped to this project.`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Project: {currentScope.projectName}</span>
            </div>
          ) : (
            <button
              onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              {currentScope.type === 'platform' && <Layers className="w-3.5 h-3.5 text-slate-600" />}
              {currentScope.type === 'tenant' && <Building2 className="w-3.5 h-3.5 text-indigo-600" />}
              {currentScope.type === 'project' && <FolderGit2 className="w-3.5 h-3.5 text-emerald-600" />}
              <span>
                {currentScope.type === 'platform' && 'Platform ▾'}
                {currentScope.type === 'tenant' && `Tenant: ${currentScope.tenantName} ▾`}
                {currentScope.type === 'project' && `Project: ${currentScope.projectName} ▾`}
              </span>
            </button>
          )}

          {/* Scope Dropdown */}
          {scopeDropdownOpen && (
            <div className="glass-strong absolute top-full left-0 z-50 mt-2 w-64 animate-in fade-in slide-in-from-top-1 rounded-2xl border border-white/60 py-2 text-xs text-slate-700 shadow-xl">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Scope Level
              </div>
              {currentRole === 'Super Admin' && (
                <button
                  onClick={() => handleScopeSelect('platform')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 ${
                    currentScope.type === 'platform' ? 'font-bold text-indigo-600 bg-indigo-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Platform (All Tenants)</span>
                  </div>
                  {currentScope.type === 'platform' && <Check className="w-3.5 h-3.5" />}
                </button>
              )}

              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tenants
              </div>
              {visibleTenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleScopeSelect('tenant', t.id, t.name)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 ${
                    currentScope.tenantId === t.id && currentScope.type === 'tenant'
                      ? 'font-bold text-indigo-600 bg-indigo-50/50'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </div>
                  {currentScope.tenantId === t.id && currentScope.type === 'tenant' && (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              ))}

              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Projects
              </div>
              {visibleProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleScopeSelect('project', p.id, p.name)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 ${
                    currentScope.projectId === p.id && currentScope.type === 'project'
                      ? 'font-bold text-emerald-600 bg-emerald-50/50'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderGit2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {currentScope.projectId === p.id && currentScope.type === 'project' && (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center relative max-w-md w-full mx-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          placeholder="Search projects, agents, connectors, artifacts…"
          className="w-full rounded-xl border border-white/60 bg-white/50 py-2 pr-8 pl-9 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-white/70 focus:border-indigo-500 focus:bg-white/90 focus:ring-2 focus:ring-indigo-500/15"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs font-semibold px-1"
          >
            Clear
          </button>
        )}

        {/* Live Search Quick Popover */}
        {searchFocused && searchQuery.length > 0 && (
          <div className="glass-strong absolute top-full right-0 left-0 z-50 mt-2 animate-in fade-in slide-in-from-top-1 rounded-2xl border border-white/60 p-3 text-xs shadow-xl">
            <div className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider mb-2">
              Instant Search Matches for "{searchQuery}"
            </div>
            <div className="space-y-1">
              <div
                onClick={() => setActiveNav('Projects')}
                className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between"
              >
                <span className="font-medium text-slate-800">Mobile Banking V2 (Project)</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Go to Projects</span>
              </div>
              <div
                onClick={() => setActiveNav('Agent Registry')}
                className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between"
              >
                <span className="font-medium text-slate-800">CodeIQ Generation & Review (Agent)</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Agent Registry</span>
              </div>
              <div
                onClick={() => setActiveNav('Connectors')}
                className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between"
              >
                <span className="font-medium text-slate-800">Jira Integration (Connector)</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Connectors</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Active role — switchable only across the user's entitled roles */}
        <div className="relative">
          {rolesList.length > 1 ? (
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Switch between the roles assigned to you"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Role:</span>
              <span className="font-bold text-indigo-900">{currentRole}</span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-default"
              title="You are assigned a single role"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Role:</span>
              <span className="font-bold text-slate-800">{currentRole}</span>
            </div>
          )}

          {/* Role Picker Menu */}
          {roleMenuOpen && rolesList.length > 1 && (
            <div className="glass-strong absolute top-full right-0 z-50 mt-2 w-72 animate-in fade-in slide-in-from-top-1 rounded-2xl border border-white/60 py-2 text-xs shadow-2xl">
              <div className="ios-hairline border-b bg-white/40 px-3 py-1.5">
                <div className="font-bold text-slate-900">Switch Role</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  {currentUser?.primaryRole === 'Super Admin'
                    ? 'Platform operator — impersonate any persona to verify access limits.'
                    : `Roles assigned to ${currentUser?.name} on this project.`}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto py-1">
                {rolesList.map((r, idx) => {
                  const isFirstOfCat = idx === 0 || rolesList[idx - 1].category !== r.category;
                  return (
                    <React.Fragment key={r.role}>
                      {isFirstOfCat && (
                        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {r.category}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setCurrentRole(r.role);
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                          currentRole === r.role ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className={`w-3.5 h-3.5 ${currentRole === r.role ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span>{r.role}</span>
                        </div>
                        {currentRole === r.role && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
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
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="glass-strong absolute top-full right-0 z-50 mt-2 w-80 animate-in fade-in slide-in-from-top-1 rounded-2xl border border-white/60 py-2 text-xs shadow-2xl">
              <div className="ios-hairline flex items-center justify-between border-b bg-white/40 px-3 py-2">
                <span className="font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-medium text-slate-600">
                  {unreadNotifs.length} unread
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500">You're all caught up.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !n.read ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`font-medium ${!n.read ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                      </div>
                      {n.link && (
                        <div className="mt-1 text-[10px] text-indigo-600 font-semibold hover:underline">
                          View in {n.link} →
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Signed-in identity */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm shadow-indigo-600/30">
              {(currentUser?.name || currentRole)
                .split(' ')
                .map((w) => w[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div className="hidden lg:block leading-tight">
            <div className="text-xs font-bold text-slate-900">{currentUser?.name}</div>
            <div className="text-[10px] text-slate-500">{currentUser?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
