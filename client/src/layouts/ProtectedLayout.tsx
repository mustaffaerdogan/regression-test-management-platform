import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ThemeToggle';

export const ProtectedLayout = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-[12px] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
          >
            <div className="w-[140px] h-[36px] flex items-center justify-center bg-surface border border-border rounded text-text-primary font-bold text-sm tracking-widest relative overflow-hidden">
              <img src="/logo.png" alt="Testrum" className="absolute inset-0 w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="flex items-center gap-2 z-10 pointer-events-none">
                <div className="w-3 h-3 bg-primary rounded-sm" />
                <span>TESTRUM</span>
              </div>
            </div>
          </button>

          {/* Middle: Navigation */}
          <nav className="hidden md:flex flex-1 justify-center items-center gap-8 text-sm font-medium h-full">
            {[
               { to: '/dashboard', label: 'Dashboard' },
               { to: '/regression-sets', label: 'Projects' },
               { to: '/test-runs', label: 'Test Cases' },
               { to: '/ai-cases', label: 'AI Cases', isNew: true },
               { to: '/reports', label: 'Reports' },
               { to: '/settings', label: 'Settings' }
            ].map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative flex items-center h-full border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-text-secondary hover:text-primary dark:text-text-secondary dark:hover:text-text-primary'
                  }`
                }
              >
                {/* Active Underline animation built-in via border bottom and class merging above */}
                <div className="flex items-center gap-1.5 pt-[2px]">
                  {item.label}
                  {item.isNew && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      NEW
                    </span>
                  )}
                </div>
              </NavLink>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            <div className="relative group">
              <button
                type="button"
                className="h-10 w-10 overflow-hidden rounded-full border border-border bg-surface flex items-center justify-center text-text-secondary hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Open profile menu"
              >
                {/* Fallback Avatar inside */}
                <span className="text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
              </button>

              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-soft-dark p-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 focus-within:opacity-100 focus-within:visible focus-within:translate-y-0 transition-all z-50">
                <div className="px-3 pb-3 mb-2 border-b border-border">
                  <p className="text-xs text-text-muted">Signed in as</p>
                  <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-background transition-colors"
                >
                  Settings
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="w-full text-left px-3 py-2 mt-1 rounded-lg text-sm text-error hover:bg-error/10 transition-colors"
                >
                  Logout
                </button>
              </div>
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
