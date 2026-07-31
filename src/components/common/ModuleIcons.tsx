import React from 'react';
import { ModuleKey } from '../../types';

interface ModuleIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { container: 'h-8 w-8', svg: 20 },
  md: { container: 'h-12 w-12', svg: 28 },
  lg: { container: 'h-16 w-16', svg: 38 },
};

const IconWrapper: React.FC<{ size: 'sm' | 'md' | 'lg'; className?: string; children: React.ReactNode }> = ({
  size,
  className = '',
  children,
}) => (
  <div
    className={`flex items-center justify-center rounded-full bg-gradient-to-br from-slate-50 to-slate-100 shadow-[0_2px_8px_rgba(100,116,139,0.12),inset_0_1px_2px_rgba(255,255,255,0.8)] ${SIZES[size].container} ${className}`}
  >
    {children}
  </div>
);

const SpecAiIcon: React.FC<ModuleIconProps> = ({ size = 'md', className }) => {
  const s = SIZES[size].svg;
  return (
    <IconWrapper size={size} className={className}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="6" width="22" height="28" rx="3" stroke="#64748b" strokeWidth="1.8" fill="#f1f5f9" />
        <path d="M14 13h12M14 17h10M14 21h8" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 26h5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="28" cy="28" r="6" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
        <path d="M26.5 28l1.2 1.2 2.8-2.8" stroke="#6366f1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrapper>
  );
};

const DesignIcon: React.FC<ModuleIconProps> = ({ size = 'md', className }) => {
  const s = SIZES[size].svg;
  return (
    <IconWrapper size={size} className={className}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="8" width="26" height="24" rx="3" stroke="#64748b" strokeWidth="1.8" fill="#f1f5f9" />
        <rect x="11" y="12" width="8" height="6" rx="1.5" stroke="#94a3b8" strokeWidth="1.3" fill="#e2e8f0" />
        <rect x="21" y="12" width="8" height="6" rx="1.5" stroke="#94a3b8" strokeWidth="1.3" fill="#e2e8f0" />
        <rect x="11" y="21" width="18" height="7" rx="1.5" stroke="#6366f1" strokeWidth="1.3" fill="#e0e7ff" />
        <circle cx="15" cy="24.5" r="1.5" fill="#6366f1" />
        <path d="M19 23.5h7" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M19 25.5h5" stroke="#818cf8" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
};

const CodeIqIcon: React.FC<ModuleIconProps> = ({ size = 'md', className }) => {
  const s = SIZES[size].svg;
  return (
    <IconWrapper size={size} className={className}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="8" width="26" height="24" rx="3" stroke="#64748b" strokeWidth="1.8" fill="#f1f5f9" />
        <path d="M7 14h26" stroke="#cbd5e1" strokeWidth="1.3" />
        <circle cx="11" cy="11" r="1.2" fill="#f87171" />
        <circle cx="14.5" cy="11" r="1.2" fill="#fbbf24" />
        <circle cx="18" cy="11" r="1.2" fill="#34d399" />
        <path d="M14 22l-3 3 3 3" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 22l3 3-3 3" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 19l-4 10" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
};

const IntelliQaIcon: React.FC<ModuleIconProps> = ({ size = 'md', className }) => {
  const s = SIZES[size].svg;
  return (
    <IconWrapper size={size} className={className}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="6" width="22" height="28" rx="3" stroke="#64748b" strokeWidth="1.8" fill="#f1f5f9" />
        <path d="M14 12h3" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
        <rect x="13" y="15.5" width="3" height="3" rx="0.8" stroke="#34d399" strokeWidth="1.3" fill="#d1fae5" />
        <path d="M14 17.2l0.8 0.8 1.5-1.5" stroke="#059669" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 17h7" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
        <rect x="13" y="21.5" width="3" height="3" rx="0.8" stroke="#34d399" strokeWidth="1.3" fill="#d1fae5" />
        <path d="M14 23.2l0.8 0.8 1.5-1.5" stroke="#059669" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 23h5" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
        <rect x="13" y="27.5" width="3" height="3" rx="0.8" stroke="#6366f1" strokeWidth="1.3" fill="#e0e7ff" />
        <path d="M18.5 29h6" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
};

const ReleasePulseIcon: React.FC<ModuleIconProps> = ({ size = 'md', className }) => {
  const s = SIZES[size].svg;
  return (
    <IconWrapper size={size} className={className}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="8" width="22" height="24" rx="3" stroke="#64748b" strokeWidth="1.8" fill="#f1f5f9" />
        <path d="M14 14h12" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M14 18h8" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M14 22h5" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M24 20v8l3-2 3 2v-8z" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="27" cy="14" r="4.5" fill="#dbeafe" stroke="#6366f1" strokeWidth="1.4" />
        <path d="M25.5 14l1 1 2.5-2.5" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrapper>
  );
};

export const ModuleIcon: React.FC<{ module: ModuleKey } & ModuleIconProps> = ({ module, ...props }) => {
  switch (module) {
    case 'specai':
      return <SpecAiIcon {...props} />;
    case 'design':
      return <DesignIcon {...props} />;
    case 'codeiq':
      return <CodeIqIcon {...props} />;
    case 'intelliqa':
      return <IntelliQaIcon {...props} />;
    case 'release':
      return <ReleasePulseIcon {...props} />;
  }
};

export const MODULE_LABELS: Record<ModuleKey, { title: string; subtitle: string; description: string }> = {
  specai: {
    title: 'SpecAI',
    subtitle: 'Requirements Intelligence Studio',
    description: 'Transforms business objectives into structured epics & user stories.',
  },
  design: {
    title: 'ProtoAI',
    subtitle: 'Design & Prototyping Hub',
    description: 'Generates interactive flows to validate before a single line of code is written.',
  },
  codeiq: {
    title: 'CodeIQ',
    subtitle: 'Intelligent Code Generation',
    description: 'Produces production-ready, reusable code from validated designs.',
  },
  intelliqa: {
    title: 'IntelliQA',
    subtitle: 'Autonomous Testing Studio',
    description: 'Enables Shift-Left quality engineering through AI-generated test scenarios.',
  },
  release: {
    title: 'Release Pulse',
    subtitle: 'Release Command Center',
    description: 'Orchestrates release readiness, deployment intelligence, environment validation.',
  },
};
