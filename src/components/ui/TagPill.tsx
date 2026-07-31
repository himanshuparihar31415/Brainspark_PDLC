import React from 'react';
import { X } from 'lucide-react';

export type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const VARIANT_STYLES: Record<TagVariant, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
};

interface TagPillProps {
  label: string;
  variant?: TagVariant;
  icon?: React.ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const TagPill: React.FC<TagPillProps> = ({
  label,
  variant = 'default',
  icon,
  onRemove,
  onClick,
  size = 'sm',
  className = '',
}) => {
  const Tag = onClick ? 'button' : 'span';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';

  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border font-bold ${sizeClasses} ${VARIANT_STYLES[variant]} ${
        onClick ? 'cursor-pointer transition-all hover:opacity-80' : ''
      } ${className}`}
    >
      {icon}
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </Tag>
  );
};
