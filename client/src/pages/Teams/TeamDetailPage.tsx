import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Team } from '../../types/team';
import {
  getTeamById,
  updateTeam,
  deleteTeam,
  inviteMember,
  removeMember,
  leaveTeam,
  regenerateInviteCode,
} from '../../api/teams';
import { useAuth } from '../../hooks/useAuth';
import { useTeams } from '../../context/TeamContext';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';

export const TeamDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetchTeams } = useTeams();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Copied state
  const [codeCopied, setCodeCopied] = useState(false);

  const isOwner = user && team && team.owner._id === user.id;

  const fetchTeam = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getTeamById(id);
      setTeam(res.data);
      setEditName(res.data.name);
      setEditDesc(res.data.description ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editName.trim()) return;
    setEditLoading(true);
    setEditError('');
    try {
      const res = await updateTeam(id, { name: editName.trim(), description: editDesc.trim() || undefined });
      setTeam(res.data);
      await refetchTeams();
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update team');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteTeam(id);
      await refetchTeams();
      navigate('/teams');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await inviteMember(id, inviteEmail.trim());
      setTeam(res.data);
      setInviteSuccess(`${inviteEmail} has been added to the team`);
      setInviteEmail('');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    try {
      const res = await removeMember(id, userId);
      setTeam(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    try {
      await leaveTeam(id);
      await refetchTeams();
      navigate('/teams');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave team');
    }
  };

  const handleRegenerateCode = async () => {
    if (!id) return;
    try {
      const res = await regenerateInviteCode(id);
      if (team) {
        setTeam({ ...team, inviteCode: res.data.inviteCode });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate code');
    }
  };

  const handleCopyCode = () => {
    if (team) {
      navigator.clipboard.writeText(team.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error || 'Team not found'}</p>
        <Button variant="secondary" onClick={() => navigate('/teams')}>Back to Teams</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teams')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            ← 
          </button>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl">
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
            {team.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{team.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <Button variant="secondary" onClick={() => setShowEditModal(true)}>Edit</Button>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete
              </Button>
            </>
          )}
          {!isOwner && (
            <Button
              variant="secondary"
              onClick={handleLeave}
              className="text-red-600 dark:text-red-400"
            >
              Leave Team
            </Button>
          )}
        </div>
      </div>

      {/* Invite Code Card */}
      <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Invite Code
          </span>
          {isOwner && (
            <button
              onClick={handleRegenerateCode}
              className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline"
            >
              Regenerate
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 break-all">
            {team.inviteCode}
          </code>
          <button
            onClick={handleCopyCode}
            className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors whitespace-nowrap"
          >
            {codeCopied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Members section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Members <span className="text-gray-400 font-normal">({team.members.length})</span>
          </h2>
          {isOwner && (
            <Button onClick={() => { setShowInviteModal(true); setInviteError(''); setInviteSuccess(''); }}>
              + Invite Member
            </Button>
          )}
        </div>

        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {team.members.map((member, idx) => {
            const isCurrentUser = member.user._id === user?.id;
            return (
              <li key={idx} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.user.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      member.role === 'owner'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {member.role}
                  </span>
                  {isOwner && !isCurrentUser && (
                    <button
                      onClick={() => handleRemoveMember(member.user._id)}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Edit Team Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditError(''); }}
        title="Edit Team"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {editError}
            </div>
          )}
          <FormInput
            label="Team Name"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={editLoading || !editName.trim()}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Member"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {inviteError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
              ✓ {inviteSuccess}
            </div>
          )}
          <FormInput
            label="User Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The user must already have an account on the platform.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowInviteModal(false)}>
              Close
            </Button>
            <Button type="submit" disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Team"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Are you sure you want to delete <strong>{team.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              Delete Team
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
