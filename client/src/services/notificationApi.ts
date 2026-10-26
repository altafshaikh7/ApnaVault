import { apiClient } from './apiClient.js';
import type { ApiResponse } from '../types/api.js';
import type { NotificationItem } from '../types/notification.js';

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

interface UnreadCountResponse {
  unreadCount: number;
}

export function notifyNotificationsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apnavault:notifications-changed'));
  }
}

export async function getNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  const response = await apiClient.get<ApiResponse<NotificationsResponse>>('/notifications');
  return response.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<ApiResponse<UnreadCountResponse>>(
    '/notifications/unread-count'
  );
  return response.data.unreadCount;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiClient.patch<ApiResponse<unknown>>(`/notifications/${encodeURIComponent(id)}/read`);
  notifyNotificationsChanged();
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.post<ApiResponse<unknown>>('/notifications/read-all');
  notifyNotificationsChanged();
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<unknown>>(`/notifications/${encodeURIComponent(id)}`);
  notifyNotificationsChanged();
}
