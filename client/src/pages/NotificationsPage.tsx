import React, { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { EmptyState } from '../components/common/EmptyState.js';
import type { NotificationItem } from '../types/notification.js';

export const NotificationsPage: React.FC = () => {
  const [notifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Security alerts, renewal reminders, and family workspace updates
          </p>
        </div>

        {notifications.length > 0 && (
          <Button variant="outline" size="sm" leftIcon={<CheckCheck className="w-4 h-4" />}>
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread
        </button>
      </div>

      {/* Notifications List or Empty State */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8 text-slate-400" />}
          title="No notifications yet"
          description="You're all caught up! When documents near expiration or when changes occur in your workspace, notifications will be displayed here."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
          {notifications.map((item) => (
            <div key={item.id} className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5">{item.message}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">{item.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
