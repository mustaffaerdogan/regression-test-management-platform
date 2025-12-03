import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export const RegisterForm = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <input
        type="text"
        placeholder="Full Name"
        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <input
        type="email"
        placeholder="Email"
        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="
          w-full bg-indigo-600 text-white py-2 rounded-lg 
          hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
};


