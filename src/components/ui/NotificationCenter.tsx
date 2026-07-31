import React, { useState } from 'react';
import { Bell, X, Check, AlertTriangle, Info, CheckCircle2, Clock } from 'lucide-react';

export type NotifCategory = 'approval' | 'alert' | 'info' | 'success';

export interface Notification {
  id: string;
  category: NotifCategory;
  title: string;
  body?: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  className?: string;
}

const CATEGORY_ICON: Record<NotifCategory, { icon: React.ElementType; color: string }> = {
  approval: { icon: Clock, color: 'text-amber-500' },
  alert: { icon: AlertTriangle, color: 'text-rose-500' },
  info: { icon: Info, color: 'text-indigo-500' },
  success: { icon: CheckCircle2, color: 'text-emerald-500' },
};

const CATEGORY_LABELS: Record<NotifCategory, string> = {
  approval: 'Approvals',
  alert: 'Alerts',
  info: 'Information',
  success: 'Completed',
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  className = '',
}) => {
  const [filter, setFilter] = useState<NotifCategory | 'all'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.category === filter);

  const categories: (NotifCategory | 'all')[] = ['all', 'approval', 'alert', 'info', 'success'];

  return (
    <div className={`material-acrylic-strong elevation-floating rounded-2xl border border-white/60 overflow-hidden w-96 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-600" />
          <span className="type-subtitle text-slate-900">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 type-caption font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="type-caption font-bold text-indigo-600 hover:underline cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-md px-2.5 py-1 type-caption font-bold transition-colors cursor-pointer ${
              filter === cat
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
        {filtered.length === 0 ? (
          <div className="p-8 text-center type-body text-slate-400">No notifications.</div>
        ) : (
          filtered.map((notif) => {
            const { icon: Icon, color } = CATEGORY_ICON[notif.category];
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  !notif.read ? 'bg-indigo-50/30' : ''
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`type-body truncate ${!notif.read ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {notif.title}
                    </span>
                    <span className="shrink-0 type-caption text-slate-400">{notif.timestamp}</span>
                  </div>
                  {notif.body && (
                    <div className="mt-0.5 type-caption text-slate-500 line-clamp-2">{notif.body}</div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    {notif.actionLabel && notif.onAction && (
                      <button
                        onClick={notif.onAction}
                        className="type-caption font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {notif.actionLabel}
                      </button>
                    )}
                    {!notif.read && (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        className="type-caption text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDismiss(notif.id)}
                  className="icon-btn shrink-0 text-slate-300 hover:text-slate-500 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
