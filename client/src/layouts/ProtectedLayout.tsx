
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';

export const ProtectedLayout = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
          >
            <div className="w-3 h-3 rounded-full bg-indigo-600" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Regression Test Suite
            </span>
          </button>

          {/* Middle: Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `hover:text-indigo-600 ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-gray-700 dark:text-gray-300'
                }`
              }
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/regression-sets"
              className={({ isActive }) =>
                `hover:text-indigo-600 ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-gray-700 dark:text-gray-300'
                }`
              }
            >
              Regression Sets
            </NavLink>

            <NavLink
              to="/test-runs"
              className={({ isActive }) =>
                `hover:text-indigo-600 ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-gray-700 dark:text-gray-300'
                }`
              }
            >
              Test Runs
            </NavLink>
          </nav>

          {/* Right: Theme toggle + Logout */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="secondary"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="px-3 py-1"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Nested Pages */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};
