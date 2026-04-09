import { Types } from 'mongoose';
import Team from '../models/Team.model';
import { IRegressionSet } from '../models/RegressionSet.model';

export async function isTeamMember(teamId: Types.ObjectId | string, userId: string): Promise<boolean> {
  const teamObjectId = typeof teamId === 'string' ? new Types.ObjectId(teamId) : teamId;
  const team = await Team.findOne({ _id: teamObjectId, 'members.user': userId }).select('_id');
  return Boolean(team);
}

export async function getTeamRole(teamId: Types.ObjectId | string, userId: string): Promise<string | null> {
  const teamObjectId = typeof teamId === 'string' ? new Types.ObjectId(teamId) : teamId;
  const team = await Team.findOne({ _id: teamObjectId, 'members.user': userId }, { 'members.$': 1 });
  if (!team || !team.members || team.members.length === 0) return null;
  return team.members[0]?.role ?? null;
}

export async function canAccessRegressionSet(regressionSet: IRegressionSet, userId: string): Promise<boolean> {
  if (regressionSet.createdBy.toString() === userId) return true;
  if (!regressionSet.team) return false;
  return await isTeamMember(regressionSet.team, userId);
}

export async function canEditRegressionSet(regressionSet: IRegressionSet, userId: string): Promise<boolean> {
  if (regressionSet.createdBy.toString() === userId) return true;
  if (!regressionSet.team) return false;
  const role = await getTeamRole(regressionSet.team, userId);
  return role === 'admin' || role === 'qa_lead';
}

export async function canExecuteRegressionSet(regressionSet: IRegressionSet, userId: string): Promise<boolean> {
  if (regressionSet.createdBy.toString() === userId) return true;
  if (!regressionSet.team) return false;
  const role = await getTeamRole(regressionSet.team, userId);
  return role === 'admin' || role === 'qa_lead' || role === 'tester';
}

export async function getMyTeamIds(userId: string): Promise<Types.ObjectId[]> {
  const teams = await Team.find({ 'members.user': userId }).select('_id').lean();
  return teams.map((t) => t._id as Types.ObjectId);
}

