import mongoose, { Schema, Document, Types } from 'mongoose';
import { randomUUID } from 'crypto';


export type TeamRole = 'owner' | 'member';

export interface ITeamMember {
  user: Types.ObjectId;
  role: TeamRole;
  joinedAt: Date;
}

export interface ITeam extends Document {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: ITeamMember[];
  inviteCode: string;
  createdAt: Date;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [teamMemberSchema],
    inviteCode: {
      type: String,
      unique: true,
      default: () => randomUUID(),
    },
  },
  {
    timestamps: true,
  },
);

const Team = mongoose.model<ITeam>('Team', teamSchema);

export default Team;
