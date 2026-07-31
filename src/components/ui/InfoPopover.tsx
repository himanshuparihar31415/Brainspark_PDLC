import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoPopoverProps {
  content: React.ReactNode;
  title?: string;
  trigger?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const POSITION_CLASSES: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export const InfoPopover: React.FC<InfoPopoverProps> = ({
  content,
  title,
  trigger,
  position = 'top',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="icon-btn cursor-pointer text-slate-400 hover:text-slate-600"
        aria-label="More info"
      >
        {trigger ?? <Info className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div
          className={`absolute z-50 w-64 material-acrylic-strong elevation-floating rounded-xl border border-white/60 p-3 animate-in fade-in zoom-in-95 ${POSITION_CLASSES[position]}`}
        >
          {title && (
            <div className="mb-1.5 type-body-strong text-slate-900">{title}</div>
          )}
          <div className="type-caption text-slate-600 leading-relaxed">{content}</div>
        </div>
      )}
    </div>
  );
};
