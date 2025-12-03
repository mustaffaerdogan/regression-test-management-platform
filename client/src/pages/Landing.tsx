import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';
import { Modal } from '../components/Modal';
import { LoginForm } from './Auth/components/LoginForm';
import { RegisterForm } from './Auth/components/RegisterForm';
import { useQuery } from '../hooks/useQuery';

export const Landing = () => {
  const navigate = useNavigate();
  const query = useQuery();

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // URL -> modal
  useEffect(() => {
    const auth = query.get('auth');
    setShowLogin(auth === 'login');
    setShowRegister(auth === 'register');
  }, [query]);

  const openLogin = () => navigate('/?auth=login');
  const openRegister = () => navigate('/?auth=register');

  // modal close -> clear url
  const closeModal = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 dark:from-[#0f0f0f] dark:via-indigo-950/20 dark:to-purple-950/20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Regression Test Suite
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openLogin}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Login
              </button>
              <button
                type="button"
                onClick={openRegister}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
              >
                Sign Up
              </button>
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              Next-Gen Regression Test Suite for{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                QA Teams
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
              Manage multi-platform regression tests, execute test cases step-by-step, and analyze results with powerful dashboards.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={openRegister}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full shadow-soft dark:shadow-soft-dark transition-all hover:scale-105"
              >
                Get Started
              </button>
              <button
                type="button"
                onClick={openLogin}
                className="px-8 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-full border border-gray-200 dark:border-gray-700 shadow-soft dark:shadow-soft-dark transition-all hover:scale-105"
              >
                Try Demo
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="glass rounded-2xl p-8 shadow-soft dark:shadow-soft-dark border border-gray-200/50 dark:border-gray-800/50">
              <div className="space-y-4">
                <div className="h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2"></div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="h-20 bg-green-500/20 dark:bg-green-500/10 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div className="h-20 bg-red-500/20 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">✗</span>
                  </div>
                  <div className="h-20 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">⏱</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass rounded-2xl p-8 shadow-soft dark:shadow-soft-dark border border-gray-200/50 dark:border-gray-800/50 hover:scale-105 transition-transform">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Smart Regression Sets</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create, organize, and duplicate regression sets for Web, iOS, Android, and Smart TV.
            </p>
          </div>

          <div className="glass rounded-2xl p-8 shadow-soft dark:shadow-soft-dark border border-gray-200/50 dark:border-gray-800/50 hover:scale-105 transition-transform">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Fast Manual Test Runs</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Execute step-by-step manual tests with Pass/Fail logic and attachments.
            </p>
          </div>

          <div className="glass rounded-2xl p-8 shadow-soft dark:shadow-soft-dark border border-gray-200/50 dark:border-gray-800/50 hover:scale-105 transition-transform">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Analytics Dashboard</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Track pass rate trends, heatmaps, and compare regression outputs.
            </p>
          </div>
        </div>
      </section>

      {/* Platform Showcase */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Multi-Platform Support
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {['Web', 'iOS', 'Android', 'TV'].map((platform) => (
            <div
              key={platform}
              className="glass rounded-xl p-6 shadow-soft dark:shadow-soft-dark border border-gray-200/50 dark:border-gray-800/50 text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-white font-bold">{platform[0]}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{platform}</h3>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full w-3/4"></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">75% Pass</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 dark:border-gray-800/50 mt-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Home
              </Link>
              <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Features
              </Link>
              <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Pricing
              </Link>
              <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Contact
              </Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              © {new Date().getFullYear()} Regression Test Suite. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      <Modal isOpen={showLogin} onClose={closeModal} title="Login">
        <LoginForm />
      </Modal>

      {/* REGISTER MODAL */}
      <Modal isOpen={showRegister} onClose={closeModal} title="Register">
        <RegisterForm />
      </Modal>
    </div>
  );
};



