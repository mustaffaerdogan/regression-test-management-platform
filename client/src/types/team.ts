export interface TeamMember {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  members: TeamMember[];
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
}

export interface TeamResponse {
  success: boolean;
  message: string;
  data: Team;
}

export interface TeamsListResponse {
  success: boolean;
  message: string;
  data: Team[];
}
