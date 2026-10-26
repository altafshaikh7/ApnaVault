import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Mail,
  Crown,
  Clock,
  Info,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  Trash2,
  UserMinus,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { Modal } from '../components/common/Modal.js';
import { Input } from '../components/common/Input.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { AuthContext } from '../context/authContextValue.js';
import { apiClient } from '../services/apiClient.js';
import { notifyNotificationsChanged } from '../services/notificationApi.js';
import type { WorkspaceRole, WorkspaceMember, WorkspaceInvitation, Workspace } from '../types/workspace.js';

export const FamilyPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const currentUser = auth?.user;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [sentInvitations, setSentInvitations] = useState<WorkspaceInvitation[]>([]);
  const [myInvitations, setMyInvitations] = useState<WorkspaceInvitation[]>([]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setActionError(null);
    try {
      const [workspaceRes, sentRes, myRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data: { workspace: Workspace; members: WorkspaceMember[] } }>(
          '/invitations/workspace'
        ),
        apiClient.get<{ success: boolean; data: { invitations: WorkspaceInvitation[] } }>(
          '/invitations/sent'
        ),
        apiClient.get<{ success: boolean; data: { invitations: WorkspaceInvitation[] } }>(
          '/invitations/mine'
        ),
      ]);

      if (workspaceRes.status === 'fulfilled' && workspaceRes.value?.data) {
        setWorkspace(workspaceRes.value.data.workspace);
        setMembers(workspaceRes.value.data.members || []);
      }

      if (sentRes.status === 'fulfilled' && sentRes.value?.data?.invitations) {
        setSentInvitations(sentRes.value.data.invitations);
      }

      if (myRes.status === 'fulfilled' && myRes.value?.data?.invitations) {
        setMyInvitations(myRes.value.data.invitations);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to load workspace data');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      await apiClient.post('/invitations', {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setActionNotice(`Invitation sent successfully to ${inviteEmail} as ${inviteRole}.`);
      setInviteEmail('');
      setIsInviteModalOpen(false);

      // Refresh sent invitations
      const sentRes = await apiClient.get<{ success: boolean; data: { invitations: WorkspaceInvitation[] } }>(
        '/invitations/sent'
      );
      if (sentRes?.data?.invitations) {
        setSentInvitations(sentRes.data.invitations);
      }
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

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
      notifyNotificationsChanged();
      // Reload entire workspace data
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || `Failed to ${action} invitation`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setProcessingId(invitationId);
    setActionNotice(null);
    setActionError(null);

    try {
      await apiClient.delete(`/invitations/${invitationId}`);
      setActionNotice('Invitation cancelled.');
      notifyNotificationsChanged();
      setSentInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err: any) {
      setActionError(err?.message || 'Failed to cancel invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (!member.userId) return;
    const confirmMessage = `Are you sure you want to remove ${member.name} from the workspace? They will lose access to shared family documents.`;
    if (!window.confirm(confirmMessage)) return;

    setProcessingId(member.userId);
    setActionNotice(null);
    setActionError(null);

    try {
      await apiClient.delete(`/invitations/workspace/members/${encodeURIComponent(member.userId)}`);
      setActionNotice(`Successfully removed ${member.name} from the workspace.`);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to remove member from workspace');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingSentInvitations = sentInvitations.filter(
    (inv) => inv.status === 'pending'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Family Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Collaborate safely with family members while keeping personal files private
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setInviteError(null);
            setIsInviteModalOpen(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Invite Family Member
        </Button>
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

      {/* Received Invitations Section */}
      {myInvitations.length > 0 && (
        <Card className="p-6 border-emerald-200 bg-emerald-50/20">
          <CardTitle>Invitations for You</CardTitle>
          <CardDescription>
            You have received the following invitations to join family workspaces
          </CardDescription>

          <div className="mt-4 space-y-3">
            {myInvitations.map((inv) => {
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
                  className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {workspaceName}
                      </h4>
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 capitalize">
                        {inv.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Invited by <span className="font-medium text-slate-800">{inviterName}</span>
                      {inviterEmail && <span className="text-slate-400 text-[11px]"> ({inviterEmail})</span>}
                    </p>
                    {inv.expiresAt && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    )}
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
          </div>
        </Card>
      )}

      {/* Family Workspace Overview Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Active Household
              </span>
              {workspace?.currentUserRole && (
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full capitalize">
                  Your Role: {workspace.currentUserRole}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {workspace?.name || 'Sharma Family Vault'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Primary workspace for shared household records
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-900">
              {members.length || 1}
            </span>
            <p className="text-[11px] text-slate-400">Total Member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </Card>

      {/* Members List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Workspace Members</h3>
            <p className="text-xs text-slate-500">People with access to shared family documents</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {members.length > 0 ? (
            members.map((member) => {
              const isMe =
                currentUser &&
                (member.userId === currentUser.id || member.email === currentUser.email);
              const initials = member.name
                ? member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'ME';

              return (
                <div
                  key={member.userId || member.email}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {member.name} {isMe && '(You)'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 capitalize">
                          {member.role === 'owner' && <Crown className="w-3 h-3 text-amber-600" />}
                          {member.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600 capitalize">
                      {member.role === 'owner' ? 'Full Permissions' : `${member.role} Access`}
                    </span>
                    {(workspace?.currentUserRole === 'owner' || workspace?.currentUserRole === 'admin') &&
                      member.role !== 'owner' &&
                      !isMe && (
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={`Remove ${member.name} from workspace`}
                          aria-label={`Remove ${member.name} from workspace`}
                          disabled={processingId === member.userId}
                          onClick={() => handleRemoveMember(member)}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  YOU
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">You</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      <Crown className="w-3 h-3 text-amber-600" /> Owner
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">Primary account holder</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sent / Pending Invitations */}
      <Card className="p-6">
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>Family members who have been invited to join</CardDescription>

        <div className="mt-4">
          {pendingSentInvitations.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6 text-slate-400" />}
              title="No pending invitations"
              description="When you invite family members via email, their invitation status will show here."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInviteError(null);
                    setIsInviteModalOpen(true);
                  }}
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Send an Invite
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {pendingSentInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{inv.email}</span>
                        <span className="text-[10px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 capitalize">
                        Role: {inv.role}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => handleCancelInvitation(inv.id)}
                    isLoading={processingId === inv.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Roles & Permissions Reference */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Understanding Family Roles</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-1">Owner</h4>
            <p className="text-slate-500 leading-relaxed">
              Full control over the workspace, billing, memberships, and data retention.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-1">Admin</h4>
            <p className="text-slate-500 leading-relaxed">
              Can invite members, manage shared documents, and configure reminder settings.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-1">Member</h4>
            <p className="text-slate-500 leading-relaxed">
              Can upload documents to the workspace and view files shared with the family.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-1">Viewer</h4>
            <p className="text-slate-500 leading-relaxed">
              Read-only access to view and download shared files. Ideal for elder parents.
            </p>
          </div>
        </div>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Family Member"
        description="Send an email invitation to join your family workspace"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={isInviting}
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isInviting}
              disabled={isInviting || !inviteEmail}
              onClick={handleInviteSubmit}
            >
              Send Invitation
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {inviteError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="e.g. spouse@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Role in Family Workspace
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="member">Member — Can upload and view shared files</option>
              <option value="admin">Admin — Can invite members and manage shared files</option>
              <option value="viewer">Viewer — Read-only access (Recommended for parents/children)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2 text-xs text-slate-600">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Your personal documents remain strictly private unless you explicitly choose to share them with the workspace.
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
};
