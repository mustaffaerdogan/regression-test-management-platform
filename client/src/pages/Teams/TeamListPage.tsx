import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeams } from '../../context/TeamContext';
import { createTeam, joinTeam as joinTeamApi } from '../../api/teams';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';

export const TeamListPage = () => {
  const { teams, loading, error, refetchTeams } = useTeams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create team form state
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join team form state
  const [inviteCode, setInviteCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      await createTeam({ name: createName.trim(), description: createDesc.trim() || undefined });
      await refetchTeams();
      setShowCreateModal(false);
      setCreateName('');
      setCreateDesc('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      await joinTeamApi(inviteCode.trim());
      await refetchTeams();
      setShowJoinModal(false);
      setInviteCode('');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join team');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Collaborate with your team on regression tests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
            Join with Code
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>+ New Team</Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}

      {/* Empty state */}
      {!loading && teams.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No teams yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Create a team to collaborate with others, or join one with an invite code.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
              Join with Code
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>Create Team</Button>
          </div>
        </div>
      )}

      {/* Teams grid */}
      {!loading && teams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Link
              key={team._id}
              to={`/teams/${team._id}`}
              className="block p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-150"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{team.name}</h3>
              {team.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {team.description}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1">
                {team.members.slice(0, 4).map((m, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center text-white text-xs font-medium"
                    title={m.user.name}
                  >
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {team.members.length > 4 && (
                  <span className="text-xs text-gray-400 ml-1">+{team.members.length - 4}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateError(''); }}
        title="Create New Team"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {createError}
            </div>
          )}
          <FormInput
            label="Team Name"
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. QA Team Alpha"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="What does this team work on?"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowCreateModal(false); setCreateError(''); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLoading || !createName.trim()}>
              {createLoading ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Team Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => { setShowJoinModal(false); setJoinError(''); }}
        title="Join a Team"
      >
        <form onSubmit={handleJoin} className="space-y-4">
          {joinError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {joinError}
            </div>
          )}
          <FormInput
            label="Invite Code"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Paste the invite code here"
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowJoinModal(false); setJoinError(''); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={joinLoading || !inviteCode.trim()}>
              {joinLoading ? 'Joining...' : 'Join Team'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
