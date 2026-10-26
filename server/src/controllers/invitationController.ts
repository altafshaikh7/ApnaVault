import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Invitation } from '../models/Invitation.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { TokenService } from '../services/tokenService.js';

/** How many days until an invitation expires. */
const INVITATION_EXPIRES_DAYS = 7;

/**
 * POST /api/v1/invitations
 * Authenticated admin/owner sends an invitation to a recipient email.
 * Requires the caller to own or admin at least one workspace.
 */
export class InvitationController {
  public static async sendInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const invitedBy = req.user!._id as Types.ObjectId;
      const { email, role } = req.body as { email: string; role: 'admin' | 'member' | 'viewer' };

      // Self-invitation guard
      if (req.user!.email === email) {
        return next(new AppError('You cannot invite yourself to a workspace', 400, undefined, true));
      }

      // Find the caller's primary workspace (owned by them, not archived)
      let workspace = await Workspace.findOne({ ownerId: invitedBy, isArchived: false });

      // Auto-provision a personal workspace if none exists
      if (!workspace) {
        workspace = await Workspace.create({
          name: `${req.user!.name}'s Family Vault`,
          ownerId: invitedBy,
          isArchived: false,
        });
        // Add the owner as a member with role 'owner'
        await WorkspaceMember.create({
          workspaceId: workspace._id,
          userId: invitedBy,
          role: 'owner',
          invitedBy: invitedBy,
        });
      }

      const workspaceId = workspace._id as Types.ObjectId;

      // Check for existing pending invitation to this email in this workspace
      const existing = await Invitation.findOne({
        workspaceId,
        email,
        status: 'pending',
      });
      if (existing) {
        return next(
          new AppError(
            'A pending invitation already exists for this email address',
            409,
            undefined,
            true
          )
        );
      }

      // Check if recipient is already a member
      const recipientUser = await User.findOne({ email, isDeleted: false });
      if (recipientUser) {
        const isMember = await WorkspaceMember.findOne({
          workspaceId,
          userId: recipientUser._id,
        });
        if (isMember) {
          return next(
            new AppError('This user is already a member of the workspace', 409, undefined, true)
          );
        }
      }

      const rawToken = TokenService.generateRandomToken(32);
      const expiresAt = new Date(Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

      const invitation = await Invitation.create({
        workspaceId,
        email,
        role,
        token: rawToken,
        invitedBy,
        status: 'pending',
        expiresAt,
      });

      // If the recipient user already exists, create the notification immediately
      if (recipientUser) {
        await Notification.create({
          userId: recipientUser._id,
          type: 'workspace_invite',
          title: 'Family Workspace Invitation',
          message: `${req.user!.name} invited you to join "${workspace.name}" as ${role}.`,
          isRead: false,
          linkUrl: '/family',
          metadata: {
            invitationId: invitation._id.toString(),
            workspaceId: workspaceId.toString(),
            role,
          },
        });
      }

      // Return without the token for security
      const safeInvitation = {
        id: invitation._id,
        workspaceId: invitation.workspaceId,
        email: invitation.email,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      };

      sendSuccess(res, { invitation: safeInvitation }, 'Invitation sent successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/invitations/mine
   * Returns all pending invitations addressed to the authenticated user's email.
   */
  public static async getMyInvitations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const email = req.user!.email.toLowerCase().trim();

      const invitations = await Invitation.find({
        email,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
        .populate('workspaceId', 'name ownerId')
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      const result = invitations.map((inv: any) => ({
        id: inv._id?.toString() || inv._id,
        workspace: inv.workspaceId ? {
          id: inv.workspaceId._id?.toString() || inv.workspaceId.toString(),
          name: inv.workspaceId.name || 'Family Vault',
        } : null,
        role: inv.role,
        invitedBy: inv.invitedBy ? {
          id: inv.invitedBy._id?.toString() || inv.invitedBy.toString(),
          name: inv.invitedBy.name || 'Family Member',
          email: inv.invitedBy.email || '',
        } : null,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }));

      sendSuccess(res, { invitations: result }, 'Pending invitations retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/invitations/sent
   * Returns invitations sent from the caller's workspace (for admin view).
   */
  public static async getSentInvitations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const invitedBy = req.user!._id as Types.ObjectId;

      let workspace = await Workspace.findOne({ ownerId: invitedBy, isArchived: false });
      if (!workspace) {
        const memberRec = await WorkspaceMember.findOne({
          userId: invitedBy,
          role: { $in: ['owner', 'admin'] },
        });
        if (memberRec) {
          workspace = await Workspace.findById(memberRec.workspaceId);
        }
      }

      if (!workspace) {
        sendSuccess(res, { invitations: [] }, 'No workspace found', 200);
        return;
      }

      const invitations = await Invitation.find({ workspaceId: workspace._id })
        .sort({ createdAt: -1 })
        .lean();

      const result = invitations.map((inv) => ({
        id: inv._id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }));

      sendSuccess(res, { invitations: result }, 'Sent invitations retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/invitations/workspace
   * Returns current user's workspace info and members.
   */
  public static async getWorkspace(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;

      let workspace = await Workspace.findOne({ ownerId: userId, isArchived: false });
      let userRole: string = 'owner';

      if (!workspace) {
        const membership = await WorkspaceMember.findOne({ userId }).populate('workspaceId');
        if (membership && membership.workspaceId) {
          workspace = membership.workspaceId as any;
          userRole = membership.role;
        }
      }

      // Auto-provision if user has no workspace at all
      if (!workspace) {
        workspace = await Workspace.create({
          name: `${req.user!.name}'s Family Vault`,
          ownerId: userId,
          isArchived: false,
        });
        await WorkspaceMember.create({
          workspaceId: workspace._id,
          userId,
          role: 'owner',
          invitedBy: userId,
        });
      }

      const members = await WorkspaceMember.find({ workspaceId: workspace._id })
        .populate('userId', 'name email')
        .sort({ joinedAt: 1 })
        .lean();

      const formattedMembers = members.map((m: any) => ({
        userId: m.userId?._id?.toString() || m.userId?.toString(),
        name: m.userId?.name || 'Family Member',
        email: m.userId?.email || '',
        role: m.role,
        joinedAt: m.joinedAt,
      }));

      sendSuccess(
        res,
        {
          workspace: {
            id: workspace._id.toString(),
            name: workspace.name,
            ownerId: workspace.ownerId.toString(),
            currentUserRole: userRole,
            memberCount: formattedMembers.length,
          },
          members: formattedMembers,
        },
        'Workspace details retrieved',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/invitations/:invitationId/respond
   * Authenticated recipient accepts or declines an invitation.
   */
  public static async respondToInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const invitationId = req.params.invitationId as string;
      const { action } = req.body as { action: 'accept' | 'decline' };
      const userEmail = req.user!.email;
      const userId = req.user!._id as Types.ObjectId;

      if (!Types.ObjectId.isValid(invitationId)) {
        return next(new AppError('Invalid invitation ID', 400, undefined, true));
      }

      const invitation = await Invitation.findById(invitationId);

      if (!invitation) {
        return next(new AppError('Invitation not found', 404, undefined, true));
      }

      // Only the recipient may respond
      if (invitation.email !== userEmail) {
        return next(new AppError('You are not the recipient of this invitation', 403, undefined, true));
      }

      // Guard against already-processed invitations
      if (invitation.status !== 'pending') {
        return next(
          new AppError(
            `Invitation has already been ${invitation.status}`,
            409,
            undefined,
            true
          )
        );
      }

      // Check expiry
      if (invitation.expiresAt < new Date()) {
        invitation.status = 'expired';
        await invitation.save();
        return next(new AppError('This invitation has expired', 410, undefined, true));
      }

      if (action === 'accept') {
        // Check if already a member (idempotency guard)
        const alreadyMember = await WorkspaceMember.findOne({
          workspaceId: invitation.workspaceId,
          userId,
        });
        if (!alreadyMember) {
          await WorkspaceMember.create({
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
            invitedBy: invitation.invitedBy,
          });
        }

        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        await invitation.save();

        await Notification.updateMany(
          { 'metadata.invitationId': invitation._id.toString() },
          { $set: { isRead: true, readAt: new Date() } }
        );

        sendSuccess(res, { invitation }, 'Invitation accepted. You have joined the workspace.', 200);
      } else {
        invitation.status = 'declined';
        await invitation.save();

        await Notification.updateMany(
          { 'metadata.invitationId': invitation._id.toString() },
          { $set: { isRead: true, readAt: new Date() } }
        );

        sendSuccess(res, { invitation }, 'Invitation declined.', 200);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/invitations/:invitationId
   * Cancels a pending invitation. Only the workspace owner/admin who sent it may cancel.
   */
  public static async cancelInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const invitationId = req.params.invitationId as string;
      const userId = req.user!._id as Types.ObjectId;

      if (!Types.ObjectId.isValid(invitationId)) {
        return next(new AppError('Invalid invitation ID', 400, undefined, true));
      }

      const invitation = await Invitation.findById(invitationId);
      if (!invitation) {
        return next(new AppError('Invitation not found', 404, undefined, true));
      }

      // Only the sender or workspace owner may cancel
      const isInviter = invitation.invitedBy.toString() === userId.toString();
      const workspace = await Workspace.findById(invitation.workspaceId);
      const isOwner = workspace?.ownerId.toString() === userId.toString();

      if (!isInviter && !isOwner) {
        return next(new AppError('You are not authorized to cancel this invitation', 403, undefined, true));
      }

      if (invitation.status !== 'pending') {
        return next(
          new AppError(`Cannot cancel an invitation that is already ${invitation.status}`, 409, undefined, true)
        );
      }

      invitation.status = 'cancelled';
      await invitation.save();

      await Notification.updateMany(
        { 'metadata.invitationId': invitation._id.toString() },
        { $set: { isRead: true, readAt: new Date() } }
      );

      sendSuccess(res, { invitation }, 'Invitation cancelled', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/invitations/workspace/members/:memberId
   * Removes a member from the workspace. Only owner or admin may perform this.
   */
  public static async removeMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const callerId = req.user!._id as Types.ObjectId;
      const memberId = req.params.memberId as string;

      if (!Types.ObjectId.isValid(memberId)) {
        return next(new AppError('Invalid member ID', 400, undefined, true));
      }

      // Find the caller's workspace
      let workspace = await Workspace.findOne({ ownerId: callerId, isArchived: false });
      let callerRole: string = 'owner';

      if (!workspace) {
        const callerMembership = await WorkspaceMember.findOne({ userId: callerId });
        if (callerMembership) {
          workspace = await Workspace.findById(callerMembership.workspaceId);
          callerRole = callerMembership.role;
        }
      }

      if (!workspace) {
        return next(new AppError('Workspace not found', 404, undefined, true));
      }

      if (callerRole !== 'owner' && callerRole !== 'admin') {
        return next(
          new AppError('Only workspace owners and admins can remove members', 403, undefined, true)
        );
      }

      // Find target member either by WorkspaceMember _id or by userId
      const targetMember = await WorkspaceMember.findOne({
        workspaceId: workspace._id,
        $or: [{ _id: memberId }, { userId: memberId }],
      });

      if (!targetMember) {
        return next(new AppError('Workspace member not found', 404, undefined, true));
      }

      // Prevent removing the workspace owner
      if (
        targetMember.role === 'owner' ||
        targetMember.userId.toString() === workspace.ownerId.toString()
      ) {
        return next(new AppError('The workspace owner cannot be removed', 400, undefined, true));
      }

      // Admins cannot remove other admins
      if (callerRole === 'admin' && targetMember.role === 'admin') {
        return next(new AppError('Admins cannot remove other admins', 403, undefined, true));
      }

      // Caller cannot remove themselves with this endpoint
      if (targetMember.userId.toString() === callerId.toString()) {
        return next(new AppError('You cannot remove yourself using this action', 400, undefined, true));
      }

      const removedUserId = targetMember.userId;

      // Delete the membership record
      await WorkspaceMember.deleteOne({ _id: targetMember._id });

      // Clean up any DocumentPermission granted to this removed user
      try {
        const { DocumentPermission } = await import('../models/DocumentPermission.js');
        await DocumentPermission.deleteMany({ grantedToUserId: removedUserId });
      } catch {
        // Non-blocking cleanup
      }

      sendSuccess(res, { removedMemberId: memberId }, 'Member removed successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
