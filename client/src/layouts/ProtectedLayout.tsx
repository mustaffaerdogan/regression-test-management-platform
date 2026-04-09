
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
    return <Navigate to="/" replace />;
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

            <NavLink
              to="/teams"
              className={({ isActive }) =>
                `hover:text-indigo-600 ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-gray-700 dark:text-gray-300'
                }`
              }
            >
              Teams
            </NavLink>

            <NavLink
              to="/ai-cases"
              className={({ isActive }) =>
                `hover:text-indigo-600 ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-gray-700 dark:text-gray-300'
                }`
              }
            >
              AI Cases
            </NavLink>

          </nav>

          {/* Right: Profile menu */}
          <div className="relative group">
            <button
              type="button"
              className="h-10 w-10 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Open profile menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 14a4 4 0 10-8 0m8 0a4 4 0 00-8 0m8 0v1a2 2 0 01-2 2H10a2 2 0 01-2-2v-1m8 0a6 6 0 10-8 0"
                />
              </svg>
            </button>

            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-soft dark:shadow-soft-dark p-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all z-50">
              <div className="px-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigate('/settings');
                }}
                className="w-full text-left px-2 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Settings
              </button>

              <div className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-200">Theme</span>
                <ThemeToggle />
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full text-left px-2 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Logout
              </button>
            </div>
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
