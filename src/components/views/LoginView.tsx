import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DEMO_PASSWORD } from '../../data/mockData';
import { isGovernanceRole } from '../../data/rbac';
import {
  Brain,
  FileText,
  SquareCode,
  Menu,
  CheckCircle2,
  Pencil,
  Send,
  ShieldCheck,
  Gauge,
  Cloud,
  UserCheck,
  LayoutGrid,
  Mail,
  Info,
  Lock,
  AlertCircle,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Capability {
  name: string;
  description: string;
  icon: React.ElementType;
  side: 'left' | 'right';
}

const CAPABILITIES: Capability[] = [
  { name: 'SpecAI', description: 'Turns intake into clear requirements & user stories.', icon: FileText, side: 'left' },
  { name: 'CodeIQ', description: 'Generates and reviews production code at scale.', icon: SquareCode, side: 'right' },
  { name: 'Architect Hub', description: 'System & API design with decisions captured.', icon: Menu, side: 'left' },
  { name: 'IntelliQA', description: 'AI quality engineering and test coverage.', icon: CheckCircle2, side: 'right' },
  { name: 'DesignAI', description: 'On-brand UX and interface design, fast.', icon: Pencil, side: 'left' },
  { name: 'Release Pulse', description: 'Regression and release confidence on demand.', icon: Send, side: 'right' },
];

const TRUST_MARKERS = [
  { label: 'FINRA-Ready Governance', icon: ShieldCheck },
  { label: 'Cost · Speed · Quality', icon: Gauge },
  { label: 'Data stays in Incedo AWS', icon: Cloud },
  { label: 'Human-in-the-loop approvals', icon: UserCheck },
];

const Wordmark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-extrabold tracking-tight ${className}`}>
    br<span className="text-orange-500">AI</span>nspark
  </span>
);

const CapabilityCard: React.FC<{ capability: Capability }> = ({ capability }) => {
  const { name, description, icon: Icon, side } = capability;
  const isLeft = side === 'left';

  return (
    <div
      className={`relative flex items-center gap-3 rounded-2xl border border-white/50 bg-white/15 px-3.5 py-3 backdrop-blur-md ${
        isLeft ? 'flex-row text-right' : 'flex-row-reverse text-left'
      }`}
    >
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-900">{name}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-slate-600">{description}</div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-indigo-600">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
};

/** Dotted spokes from the central hub out to each capability card. */
const HubSpokes: React.FC = () => (
  <svg
    className="pointer-events-none absolute inset-0 h-full w-full"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    {[
      [34, 18],
      [66, 18],
      [34, 50],
      [66, 50],
      [34, 82],
      [66, 82],
    ].map(([x, y]) => (
      <line
        key={`${x}-${y}`}
        x1="50"
        y1="50"
        x2={x}
        y2={y}
        stroke="rgba(0,122,255,0.28)"
        strokeWidth="0.4"
        strokeDasharray="1.2 1.6"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </svg>
);

const EMAIL_KEY = 'brainspark.rememberedEmail';

/**
 * Deliberately alarming key name. "Remember me" persists the password as well as
 * the email for demo convenience, which means a plaintext credential sits in
 * localStorage where any script on this origin can read it and where it survives
 * on a shared machine until cleared.
 *
 * This is acceptable only because every account here is a mock identity sharing
 * one throwaway password (see DEMO_PASSWORD). Do not carry this into a build
 * that talks to a real directory — remember the email and a server-issued
 * session token instead.
 */
const INSECURE_PASSWORD_KEY = 'brainspark.INSECURE_rememberedPassword';

interface Remembered {
  email: string;
  password: string;
}

const readRemembered = (): Remembered => {
  try {
    return {
      email: window.localStorage.getItem(EMAIL_KEY) ?? '',
      password: window.localStorage.getItem(INSECURE_PASSWORD_KEY) ?? '',
    };
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return { email: '', password: '' };
  }
};

const writeRemembered = (creds: Remembered | null) => {
  try {
    if (creds) {
      window.localStorage.setItem(EMAIL_KEY, creds.email);
      window.localStorage.setItem(INSECURE_PASSWORD_KEY, creds.password);
    } else {
      window.localStorage.removeItem(EMAIL_KEY);
      window.localStorage.removeItem(INSECURE_PASSWORD_KEY);
    }
  } catch {
    /* non-fatal — remembering is a convenience, not a requirement */
  }
};

export const LoginView: React.FC = () => {
  const { login, requestAccess, users } = useApp();

  const remembered = readRemembered();

  const [email, setEmail] = useState(remembered.email);
  const [password, setPassword] = useState(remembered.password);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(remembered.email !== '');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [accountsOpen, setAccountsOpen] = useState(false);

  const leftCards = CAPABILITIES.filter((c) => c.side === 'left');
  const rightCards = CAPABILITIES.filter((c) => c.side === 'right');

  const submit = (method: 'password' | 'sso') => {
    if (mode === 'signup') {
      const result = requestAccess(email);
      setError(result.ok ? null : result.error ?? null);
      if (result.ok) {
        setEmail('');
        setMode('signin');
      }
      return;
    }

    const result = login(email, password, method);
    setError(result.ok ? null : result.error ?? null);

    if (result.ok) {
      writeRemembered(rememberMe ? { email: email.trim(), password } : null);
    }
  };

  /** Prefill a demo identity so every role is reachable without memorising emails. */
  const useAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
    setAccountsOpen(false);
    setMode('signin');
  };

  return (
    <div className="min-h-screen font-sans antialiased lg:flex">
      {/* ---------- Left: brand & platform story ---------- */}
      <div className="relative flex flex-col overflow-hidden px-8 py-10 lg:w-[58%] lg:px-14 lg:py-12">
        {/* Soft iOS mesh — complements global body gradient */}
        <div className="pointer-events-none absolute -top-24 -left-16 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-sky-300/25 blur-3xl" />

        <div className="relative flex flex-1 flex-col">
          <Wordmark className="text-3xl text-slate-900" />

          <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-1.5 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
              Brainspark · AI-Native PDLC Platform
            </span>
          </div>

          <h1 className="mt-7 max-w-xl text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 lg:text-5xl">
            One governed lifecycle,{' '}
            <span className="text-indigo-600">from intake to production.</span>
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600">
            Brainspark carries every artifact through the right stage — with the right context and the right human
            approval — from requirements to release.
          </p>

          {/* Hub & spoke capability map */}
          <div className="relative mt-10 max-w-2xl">
            <HubSpokes />

            <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-x-6 gap-y-5">
              {/* Left column */}
              <div className="flex flex-col gap-5">
                {leftCards.map((c) => (
                  <CapabilityCard key={c.name} capability={c} />
                ))}
              </div>

              {/* Center hub */}
              <div className="glass-strong flex h-20 w-20 items-center justify-center rounded-full shadow-xl shadow-indigo-600/15 lg:h-24 lg:w-24">
                <Brain className="h-9 w-9 text-indigo-600 lg:h-11 lg:w-11" />
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-5">
                {rightCards.map((c) => (
                  <CapabilityCard key={c.name} capability={c} />
                ))}
              </div>
            </div>
          </div>

          {/* Trust markers */}
          <div className="ios-hairline mt-12 max-w-2xl border-t pt-5">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {TRUST_MARKERS.map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-[11px] font-medium text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
            <span>© Copyright 2026 Brainspark · Incedo Labs</span>
            <a href="#" className="hover:text-indigo-600">
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>

      {/* ---------- Right: sign-in card ---------- */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-14">
        <div className="glass-strong w-full max-w-sm rounded-3xl p-8 shadow-2xl shadow-indigo-600/10">
          <div className="text-center">
            <Wordmark className="text-2xl text-slate-900" />
            <div className="mt-1 text-[10px] font-medium tracking-wide text-slate-400">
              AI-Native PDLC Operating System
            </div>
          </div>

          <h2 className="mt-7 text-center text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'signup' ? 'Request access' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500">
            {mode === 'signup'
              ? 'Your tenant admin approves new workspaces'
              : 'Sign in to your workspace'}
          </p>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit('password');
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Corporate email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@incedolabs.com"
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-[#0b3a72] focus:bg-white focus:ring-2 focus:ring-[#0b3a72]/10"
                />
              </div>
            </label>

            {mode === 'signin' && (
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-[#0b3a72] focus:bg-white focus:ring-2 focus:ring-[#0b3a72]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            )}

            {mode === 'signin' && (
              <div className="pt-0.5">
                <label className="flex w-fit cursor-pointer items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => {
                      setRememberMe(e.target.checked);
                      // Unticking forgets immediately rather than waiting for the
                      // next successful sign-in.
                      if (!e.target.checked) writeRemembered(null);
                    }}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-[#0b3a72] focus:ring-1 focus:ring-[#0b3a72]/30"
                  />
                  <span className="text-[11px] font-semibold text-slate-600">
                    Remember me on this device
                  </span>
                </label>
                {rememberMe && (
                  <p className="mt-1 pl-5.5 text-[10px] leading-snug text-slate-400">
                    Saves your email and password in this browser. Use only on a device you
                    control.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-[#0b3a72] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0a3163] focus:outline-none focus:ring-2 focus:ring-[#0b3a72]/30 focus:ring-offset-2"
            >
              {mode === 'signup' ? 'Request Access' : 'Sign In'}
            </button>
          </form>

          {mode === 'signin' && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                onClick={() => submit('sso')}
                className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-[#0b3a72] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0a3163] focus:outline-none focus:ring-2 focus:ring-[#0b3a72]/30 focus:ring-offset-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Sign in with Incedo SSO
              </button>
            </>
          )}

          <div className="mt-7 border-t border-slate-200 pt-5">
            <p className="text-center text-xs font-bold text-slate-900">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null);
              }}
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Mail className="h-4 w-4 text-orange-500" />
              {mode === 'signup' ? 'Back to sign in' : 'Sign up with Corporate Email'}
            </button>
          </div>

          {/* Demo directory — prototype affordance for reaching every role */}
          <div className="mt-5 border-t border-slate-200 pt-4">
            <button
              onClick={() => setAccountsOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-700"
            >
              <span>Demo accounts ({users.length} roles)</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${accountsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {accountsOpen && (
              <div className="mt-2.5 max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => useAccount(u.email)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-slate-800">
                        {u.name}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500">{u.title}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        isGovernanceRole(u.primaryRole)
                          ? 'bg-[#0b3a72]/10 text-[#0b3a72]'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {isGovernanceRole(u.primaryRole) ? 'Governance' : 'PDLC'}
                    </span>
                  </button>
                ))}
                <div className="flex items-center gap-1.5 px-2 pt-2 text-[10px] text-slate-500">
                  <Check className="h-3 w-3 text-emerald-600" />
                  Password prefilled · <code className="font-mono">{DEMO_PASSWORD}</code>
                </div>
              </div>
            )}
          </div>

          <button className="mx-auto mt-5 flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700">
            <Info className="h-3.5 w-3.5" />
            Need help?
          </button>
        </div>
      </div>
    </div>
  );
};
