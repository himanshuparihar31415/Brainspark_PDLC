import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
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
  } = useApp();

  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read);

  const rolesList: { role: Role; category: string }[] = [
    { role: 'Super Admin', category: 'Platform Governance' },
    { role: 'Tenant Admin', category: 'Platform Governance' },
    { role: 'Project Admin', category: 'Platform Governance' },
    { role: 'Product Manager', category: 'PDLC Personas' },
    { role: 'Architect', category: 'PDLC Personas' },
    { role: 'Designer', category: 'PDLC Personas' },
    { role: 'Tech Lead', category: 'PDLC Personas' },
    { role: 'Developer', category: 'PDLC Personas' },
    { role: 'QA Manager', category: 'PDLC Personas' },
    { role: 'QA Engineer', category: 'PDLC Personas' },
    { role: 'Release Manager', category: 'PDLC Personas' },
  ];

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
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left branding & Scope Selector */}
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center text-white shadow-md shadow-indigo-950/20">
            <Brain className="w-5 h-5 text-indigo-400" />
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

        {/* Scope Selector */}
        <div className="relative">
          {currentRole === 'Project Admin' ? (
            <div
              className="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-not-allowed"
              title="You have access to one project."
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Project: Mobile Banking V2</span>
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
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs text-slate-700 animate-in fade-in slide-in-from-top-1">
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
              {tenants.map((t) => (
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
              {projects.map((p) => (
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
          className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-xl pl-9 pr-8 py-2 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
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
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
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
        {/* Role Demo Persona Quick Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Switch Persona to test subtracted navigation"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Persona:</span>
            <span className="font-bold text-indigo-900">{currentRole}</span>
            <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
          </button>

          {/* Role Picker Menu */}
          {roleMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/50">
                <div className="font-bold text-slate-900">Switch Role Persona</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Test subtractive nav & role-based view limits instantly.
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
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
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

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
            {currentRole.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
