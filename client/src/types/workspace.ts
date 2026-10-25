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
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  documentCount: number;
  createdAt: string;
}
