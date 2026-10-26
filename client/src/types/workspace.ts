export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  email?: string;
  role: WorkspaceRole;
  invitedBy?: string | { id?: string; name?: string; email?: string };
  workspace?: { id?: string; name?: string } | string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  createdAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  currentUserRole?: string;
  memberCount: number;
  documentCount?: number;
  createdAt?: string;
}
