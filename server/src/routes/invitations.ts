import { Router } from 'express';
import { InvitationController } from '../controllers/invitationController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  sendInvitationSchema,
  respondInvitationParamsSchema,
  respondInvitationBodySchema,
} from '../validators/invitationValidators.js';

export const invitationsRouter = Router();

// All invitation routes require authentication
invitationsRouter.use(requireAuth);

// GET /api/v1/invitations/mine — pending invitations addressed to me
invitationsRouter.get('/mine', InvitationController.getMyInvitations);

// GET /api/v1/invitations/sent — invitations I sent from my workspace
invitationsRouter.get('/sent', InvitationController.getSentInvitations);

// GET /api/v1/invitations/workspace — current workspace info & members
invitationsRouter.get('/workspace', InvitationController.getWorkspace);

// POST /api/v1/invitations — send a new invitation
invitationsRouter.post(
  '/',
  validateRequest({ body: sendInvitationSchema }),
  InvitationController.sendInvitation
);

// PATCH /api/v1/invitations/:invitationId/respond — accept or decline
invitationsRouter.patch(
  '/:invitationId/respond',
  validateRequest({
    params: respondInvitationParamsSchema,
    body: respondInvitationBodySchema,
  }),
  InvitationController.respondToInvitation
);

// DELETE /api/v1/invitations/workspace/members/:memberId — remove member from workspace
invitationsRouter.delete('/workspace/members/:memberId', InvitationController.removeMember);
invitationsRouter.delete('/members/:memberId', InvitationController.removeMember);

// DELETE /api/v1/invitations/:invitationId — cancel a pending invitation
invitationsRouter.delete('/:invitationId', InvitationController.cancelInvitation);
