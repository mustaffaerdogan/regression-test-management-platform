import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRegressionSets, deleteRegressionSet } from '../../api/regressionSets';
import type { RegressionSet } from '../../types/regression';
import { RegressionSetCard } from '../../components/RegressionSetCard';
import { RegressionSetFormModal } from '../../components/RegressionSetFormModal';
import { Button } from '../../components/Button';

export const RegressionSetListPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RegressionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<RegressionSet | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRegressionSets({ search, platform });
      setItems(response.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load regression sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlatform(e.target.value);
  };

  const handleApplyFilters = () => {
    void fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this regression set?')) return;
    try {
      await deleteRegressionSet(id);
      void fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setEditingSet(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (regressionSet: RegressionSet) => {
    setEditingSet(regressionSet);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Regression Sets</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your regression suites across platforms.
          </p>
        </div>
        <Button type="button" onClick={openCreateModal} className="rounded-full px-4 py-2">
          New Regression Set
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by name or description"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={platform}
          onChange={handleFilterChange}
          className="w-full md:w-48 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Platforms</option>
          <option value="Web">Web</option>
          <option value="iOS">iOS</option>
          <option value="Android">Android</option>
          <option value="TV">TV</option>
        </select>
        <Button type="button" variant="secondary" onClick={handleApplyFilters} className="px-4 py-2">
          Apply
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              void fetchData();
            }}
            className="underline ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">No regression sets found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((set) => (
          <RegressionSetCard
            key={set._id}
            regressionSet={set}
            onView={() => navigate(`/regression-sets/${set._id}`)}
            onEdit={() => openEditModal(set)}
            onDelete={() => handleDelete(set._id)}
          />
        ))}
      </div>

      <RegressionSetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          void fetchData();
        }}
        initialValues={editingSet}
      />
    </div>
  );
};


