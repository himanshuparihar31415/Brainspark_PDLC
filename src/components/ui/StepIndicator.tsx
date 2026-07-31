import React from 'react';
import { Check, Circle, Lock } from 'lucide-react';

export interface Step {
  id: string;
  label: string;
  description?: string;
  status: 'completed' | 'active' | 'pending' | 'locked';
}

interface StepIndicatorProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  onStepClick?: (step: Step) => void;
  className?: string;
}

const STATUS_RING: Record<Step['status'], string> = {
  completed: 'bg-emerald-500 text-white ring-emerald-200',
  active: 'bg-indigo-600 text-white ring-indigo-200 animate-pulse',
  pending: 'bg-white text-slate-400 ring-slate-200 border border-slate-200',
  locked: 'bg-slate-100 text-slate-300 ring-slate-100',
};

const STATUS_ICON: Record<Step['status'], React.ElementType> = {
  completed: Check,
  active: Circle,
  pending: Circle,
  locked: Lock,
};

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  orientation = 'horizontal',
  size = 'md',
  onStepClick,
  className = '',
}) => {
  const isH = orientation === 'horizontal';
  const dotSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div className={`flex ${isH ? 'flex-row items-start' : 'flex-col items-start'} gap-0 ${className}`}>
      {steps.map((step, i) => {
        const Icon = STATUS_ICON[step.status];
        const isLast = i === steps.length - 1;
        const clickable = onStepClick && step.status !== 'locked';

        return (
          <div
            key={step.id}
            className={`flex ${isH ? 'flex-col items-center' : 'flex-row items-start'} ${!isLast ? (isH ? 'flex-1' : '') : ''}`}
          >
            <div className={`flex ${isH ? 'flex-col items-center' : 'flex-row items-center gap-3'}`}>
              {/* Dot */}
              <button
                onClick={clickable ? () => onStepClick(step) : undefined}
                className={`flex items-center justify-center rounded-full ring-2 ${dotSize} ${STATUS_RING[step.status]} ${
                  clickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <Icon className={iconSize} />
              </button>

              {/* Label */}
              <div className={isH ? 'mt-2 text-center max-w-[100px]' : ''}>
                <div className={`type-caption font-bold ${step.status === 'active' ? 'text-indigo-700' : step.status === 'completed' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {step.label}
                </div>
                {step.description && (
                  <div className="type-caption text-slate-400 mt-0.5">{step.description}</div>
                )}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              isH ? (
                <div className="mt-3 h-0.5 w-full min-w-[24px] flex-1 self-start ml-0" style={{ marginTop: size === 'sm' ? '12px' : '16px' }}>
                  <div className={`h-full rounded-full ${step.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                </div>
              ) : (
                <div className="ml-[15px] h-6 w-0.5">
                  <div className={`h-full w-full rounded-full ${step.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
};
