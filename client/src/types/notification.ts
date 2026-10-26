export type NotificationType = 'reminder' | 'workspace_invite' | 'security' | 'document_shared';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
  invitationId?: string;
  role?: string;
  workspaceName?: string;
}
