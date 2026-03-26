import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TeamProvider } from './context/TeamContext';
import { AppRouter } from './router';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TeamProvider>
          <AppRouter />
        </TeamProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

