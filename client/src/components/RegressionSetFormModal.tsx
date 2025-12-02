import { useEffect, useState } from 'react';
import type { RegressionPlatform, RegressionSet, CreateRegressionSetPayload } from '../types/regression';
import { createRegressionSet, updateRegressionSet } from '../api/regressionSets';
import { Button } from './Button';

interface RegressionSetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: RegressionSet;
}

const PLATFORMS: RegressionPlatform[] = ['Web', 'iOS', 'Android', 'TV'];

export const RegressionSetFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialValues,
}: RegressionSetFormModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<RegressionPlatform>('Web');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name ?? '');
      setDescription(initialValues.description ?? '');
      setPlatform(initialValues.platform);
    } else {
      setName('');
      setDescription('');
      setPlatform('Web');
    }
    setError(null);
  }, [initialValues, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const payload: CreateRegressionSetPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      platform,
    };

    setLoading(true);

    try {
      if (initialValues) {
        await updateRegressionSet(initialValues._id, payload);
      } else {
        await createRegressionSet(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save regression set');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-soft dark:shadow-soft-dark p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {initialValues ? 'Edit Regression Set' : 'New Regression Set'}
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as RegressionPlatform)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              className="px-4"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="px-4" loading={loading}>
              {initialValues ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};


