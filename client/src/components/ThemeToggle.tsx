import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-full text-text-muted hover:text-primary hover:bg-primary/10 dark:text-text-secondary dark:hover:text-primary dark:hover:bg-primary/10 transition-colors focus:outline-none"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Moon className={`absolute inset-0 w-5 h-5 transition-all duration-300 transform ${theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`} />
        <Sun className={`absolute inset-0 w-5 h-5 transition-all duration-300 transform ${theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
      </div>
    </button>
  );
};
