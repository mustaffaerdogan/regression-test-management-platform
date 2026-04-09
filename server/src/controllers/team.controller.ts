import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import Team, { ITeamMember } from '../models/Team.model';
import User from '../models/User.model';
import { ApiError } from '../middleware/error.middleware';

// POST /api/teams
export const createTeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { name, description } = req.body;

    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      res.status(400).json({ success: false, message: 'Bu takım mevcut' });
      return;
    }

    const team = new Team({
      name,
      description,
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'admin', joinedAt: new Date() }],
      inviteCode: randomUUID(),
    });
    await team.save();

    await team.populate('members.user', 'name email');
    await team.populate('owner', 'name email');

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teams
export const getMyTeams = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const teams = await Team.find({ 'members.user': req.user.id })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Teams fetched successfully',
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teams/:id
export const getTeamById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const team = await Team.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!team) {
      const error: ApiError = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isMember = team.members.some(
      (m: any) => m.user._id.toString() === req.user!.id,
    );
    if (!isMember) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Team fetched successfully',
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teams/:id
export const updateTeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      const error: ApiError = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = team.owner.toString() === req.user!.id || team.members.some(m => m.user.toString() === req.user!.id && m.role === 'admin');
    if (!isAdmin) {
      res.status(403).json({ success: false, message: 'Only the team admin can update the team' });
      return;
    }

    const { name, description } = req.body;
    if (typeof name === 'string') team.name = name;
    if (description !== undefined) {
      team.description = description === null ? undefined : description;
    }

    await team.save();
    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teams/:id
export const deleteTeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      const error: ApiError = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = team.owner.toString() === req.user!.id || team.members.some(m => m.user.toString() === req.user!.id && m.role === 'admin');
    if (!isAdmin) {
      res.status(403).json({ success: false, message: 'Only the team admin can delete the team' });
      return;
    }

    await team.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/teams/:id/invite  (email ile üye ekle)
export const inviteMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      const error: ApiError = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = team.owner.toString() === req.user!.id || team.members.some(m => m.user.toString() === req.user!.id && m.role === 'admin');
    if (!isAdmin) {
      res.status(403).json({ success: false, message: 'Only the team admin can invite members' });
      return;
    }

    const { email, role } = req.body;
    const invitedUser = await User.findOne({ email: (email as string).toLowerCase().trim() });

    if (!invitedUser) {
      const error: ApiError = new Error('No user found with this email address');
      error.statusCode = 404;
      throw error;
    }

    const alreadyMember = team.members.some(
      (m: ITeamMember) => m.user.toString() === invitedUser._id.toString(),
    );

    if (alreadyMember) {
      res.status(409).json({ success: false, message: 'User is already a team member' });
      return;
    }

    const validRoles = ['admin', 'qa_lead', 'tester', 'viewer'];
    const assignedRole = validRoles.includes(role) ? role : 'viewer';

    team.members.push({
      user: invitedUser._id as ITeamMember['user'],
      role: assignedRole as 'admin' | 'qa_lead' | 'tester' | 'viewer',
      joinedAt: new Date(),
    });

    await team.save();
    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: `${invitedUser.name} has been added to the team`,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/teams/join  (invite code ile katıl)
export const joinTeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const { inviteCode } = req.body;
    const team = await Team.findOne({ inviteCode });

    if (!team) {
      const error: ApiError = new Error('Invalid invite code');
      error.statusCode = 404;
      throw error;
    }

    const alreadyMember = team.members.some(
      (m: ITeamMember) => m.user.toString() === req.user!.id,
    );

    if (alreadyMember) {
      res.status(409).json({ success: false, message: 'You are already a member of this team' });
      return;
    }

    team.members.push({
      user: req.user.id as unknown as ITeamMember['user'],
      role: 'viewer', // default to viewer
      joinedAt: new Date(),
    });

    await team.save();
    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: `You have joined ${team.name}`,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teams/:id/members/:userId  (üyeyi çıkar)
export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      const error: ApiError = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = team.owner.toString() === req.user!.id || team.members.some(m => m.user.toString() === req.user!.id && m.role === 'admin');
    if (!isAdmin) {
      res.status(403).json({ success: false, message: 'Only the team admin can remove members' });
      return;
    }

    const { userId } = req.params;

    if (userId === team.owner.toString()) {
      res.status(400).json({ success: false, message: 'Cannot remove the team owner' });
      return;
    }

    const memberIndex = team.members.findIndex(
      (m: ITeamMember) => m.user.toString() === userId,
    );
    if (memberIndex === -1) {
      const error: ApiError = new Error('Member not found in team');
      error.statusCode = 404;
      throw error;
    }

    team.members.splice(memberIndex, 1);
    await team.save();
    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member removed from team',
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teams/:id/leave  (takımdan ayrıl)
export const leaveTeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      const error: ApiError = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = team.owner.toString() === req.user.id;
    if (isOwner) {
      res.status(400).json({
        success: false,
        message: 'Team owner cannot leave. Transfer ownership or delete the team.',
      });
      return;
    }

    const memberIndex = team.members.findIndex(
      (m: ITeamMember) => m.user.toString() === req.user!.id,
    );
    if (memberIndex === -1) {
      const error: ApiError = new Error('You are not a member of this team');
      error.statusCode = 404;
      throw error;
    }

    team.members.splice(memberIndex, 1);
    await team.save();

    res.status(200).json({
      success: true,
      message: `You have left ${team.name}`,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teams/:id/members/:userId/role
export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      const error: ApiError = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = team.owner.toString() === req.user!.id || team.members.some(m => m.user.toString() === req.user!.id && m.role === 'admin');
    if (!isAdmin) {
      res.status(403).json({ success: false, message: 'Only the team admin can update member roles' });
      return;
    }

    const { userId } = req.params;
    const { role } = req.body;

    if (userId === team.owner.toString()) {
      res.status(400).json({ success: false, message: 'Cannot change the team owner role' });
      return;
    }

    const memberIndex = team.members.findIndex(
      (m: ITeamMember) => m.user.toString() === userId,
    );
    if (memberIndex === -1) {
      const error: ApiError = new Error('Member not found in team');
      error.statusCode = 404;
      throw error;
    }

    const member = team.members[memberIndex];
    if (member) {
      member.role = role as any;
    }
    await team.save();

    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/teams/:id/regenerate-invite  (davet kodunu yenile)
export const regenerateInviteCode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      throw error;
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      const error: ApiError = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = team.owner.toString() === req.user!.id || team.members.some(m => m.user.toString() === req.user!.id && m.role === 'admin');
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only the team admin can regenerate the invite code',
      });
      return;
    }

    team.inviteCode = randomUUID();
    await team.save();

    res.status(200).json({
      success: true,
      message: 'Invite code regenerated',
      data: { inviteCode: team.inviteCode },
    });
  } catch (error) {
    next(error);
  }
};
