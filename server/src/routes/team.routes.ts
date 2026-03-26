import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createTeam,
  getMyTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  inviteMember,
  joinTeam,
  removeMember,
  leaveTeam,
  regenerateInviteCode,
} from '../controllers/team.controller';
import {
  createTeamValidations,
  updateTeamValidations,
  inviteMemberValidations,
  joinTeamValidations,
  removeMemberValidations,
} from '../validation/team.validation';

const router = Router();

// All team routes require authentication
router.use(authMiddleware);

// Note: /join must be before /:id to avoid route conflict
router.post('/join', validate(joinTeamValidations), joinTeam);

router.post('/', validate(createTeamValidations), createTeam);
router.get('/', getMyTeams);
router.get('/:id', getTeamById);
router.put('/:id', validate(updateTeamValidations), updateTeam);
router.delete('/:id', deleteTeam);

router.post('/:id/invite', validate(inviteMemberValidations), inviteMember);
router.post('/:id/regenerate-invite', regenerateInviteCode);
router.delete('/:id/members/:userId', validate(removeMemberValidations), removeMember);
router.delete('/:id/leave', leaveTeam);

export default router;
