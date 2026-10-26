import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Shield,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { apiClient } from '../services/apiClient.js';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  notifyNotificationsChanged,
} from '../services/notificationApi.js';
import type { WorkspaceInvitation } from '../types/workspace.js';
import type { NotificationItem } from '../types/notification.js';

export const NotificationsPage: React.FC = () => {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [invRes, notifRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data: { invitations: WorkspaceInvitation[] } }>(
          '/invitations/mine'
        ),
        getNotifications(),
      ]);

      if (invRes.status === 'fulfilled' && invRes.value?.data?.invitations) {
        setInvitations(invRes.value.data.invitations);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value?.notifications) {
        setNotifications(notifRes.value.notifications);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespond = async (invitationId: string, action: 'accept' | 'decline') => {
    setProcessingId(invitationId);
    setActionNotice(null);
    setActionError(null);
    try {
      await apiClient.patch(`/invitations/${invitationId}/respond`, { action });
      setActionNotice(
        action === 'accept'
          ? 'Invitation accepted! You have joined the family workspace.'
          : 'Invitation declined.'
      );
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      notifyNotificationsChanged();
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || `Failed to ${action} invitation`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setActionNotice('All notifications marked as read.');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      notifyNotificationsChanged();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to mark all as read');
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      notifyNotificationsChanged();
    } catch {
      // Ignore
    }
  };

  // Filter items
  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;
  const filteredInvitations = invitations;

  const totalUnread =
    invitations.length + notifications.filter((n) => !n.isRead).length;

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

        {(notifications.some((n) => !n.isRead) || invitations.length > 0) && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            onClick={handleMarkAllRead}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-700 hover:text-red-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

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
          All {invitations.length + notifications.length > 0 && `(${invitations.length + notifications.length})`}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread {totalUnread > 0 && `(${totalUnread})`}
        </button>
      </div>

      {/* Notifications List or Empty State */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading notifications...</div>
      ) : filteredInvitations.length === 0 && filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8 text-slate-400" />}
          title="No notifications yet"
          description="You're all caught up! When documents near expiration or when changes occur in your workspace, notifications will be displayed here."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
          {/* Pending Invitations Section */}
          {filteredInvitations.map((inv) => {
            const inviterName =
              typeof inv.invitedBy === 'object' && inv.invitedBy !== null
                ? inv.invitedBy.name || inv.invitedBy.email || 'Family Admin'
                : 'Family Admin';
            const inviterEmail =
              typeof inv.invitedBy === 'object' && inv.invitedBy !== null
                ? inv.invitedBy.email
                : '';
            const workspaceName =
              typeof inv.workspace === 'object' && inv.workspace !== null
                ? inv.workspace.name || 'Family Workspace'
                : 'Family Workspace';

            const isProcessing = processingId === inv.id;

            return (
              <div
                key={inv.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-900">
                        Family Workspace Invitation
                      </h4>
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 capitalize">
                        {inv.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-medium text-slate-800">{inviterName}</span>
                      {inviterEmail && <span className="text-slate-400 text-[11px]"> ({inviterEmail})</span>}
                      {' '}invited you to join{' '}
                      <span className="font-semibold text-slate-900">"{workspaceName}"</span>.
                    </p>
                    {inv.expiresAt && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                    isLoading={isProcessing}
                    disabled={isProcessing}
                    onClick={() => handleRespond(inv.id, 'accept')}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<X className="w-3.5 h-3.5" />}
                    disabled={isProcessing}
                    onClick={() => handleRespond(inv.id, 'decline')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}

          {/* General Notifications Section (reminders, alerts) */}
          {filteredNotifications
            .filter((n) => n.type !== 'workspace_invite')
            .map((notif) => (
              <div
                key={notif.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  notif.isRead ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      notif.type === 'reminder'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : notif.type === 'security'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {notif.type === 'reminder' ? (
                      <Calendar className="w-4 h-4" />
                    ) : notif.type === 'security' ? (
                      <Shield className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-900">{notif.title}</h4>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                      {notif.linkUrl && (
                        <Link
                          to={notif.linkUrl}
                          className="text-emerald-700 hover:underline font-medium"
                        >
                          View Document
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!notif.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkOneRead(notif.id)}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-700 whitespace-nowrap p-1"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
