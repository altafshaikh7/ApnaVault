import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Mail,
  Crown,
  Clock,
  Info,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { Modal } from '../components/common/Modal.js';
import { Input } from '../components/common/Input.js';
import { EmptyState } from '../components/common/EmptyState.js';
import type { WorkspaceRole } from '../types/workspace.js';

export const FamilyPage: React.FC = () => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviteSentNotice, setInviteSentNotice] = useState<string | null>(null);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    // In Phase 2: UI workflow verification
    // Phase 7 will wire actual email invitation delivery
    setInviteSentNotice(`Invitation ready for ${inviteEmail} as ${inviteRole}.`);
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

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
          onClick={() => setIsInviteModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Invite Family Member
        </Button>
      </div>

      {inviteSentNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{inviteSentNotice}</span>
          <button
            onClick={() => setInviteSentNotice(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Family Workspace Overview Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Active Household
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Sharma Family Vault</h2>
            <p className="text-xs text-slate-500 mt-0.5">Primary workspace for shared household records</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-900">1</span>
            <p className="text-[11px] text-slate-400">Total Member</p>
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
          <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                ME
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
            <div className="text-right">
              <span className="text-xs font-medium text-slate-600">Full Permissions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      <Card className="p-6">
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>Family members who have been invited to join</CardDescription>

        <div className="mt-4">
          <EmptyState
            icon={<Clock className="w-6 h-6 text-slate-400" />}
            title="No pending invitations"
            description="When you invite family members via email, their invitation status will show here."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Send an Invite
              </Button>
            }
          />
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
            <Button variant="ghost" size="sm" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleInviteSubmit}>
              Send Invitation
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
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
