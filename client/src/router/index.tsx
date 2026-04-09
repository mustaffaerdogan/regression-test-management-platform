import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { ProtectedLayout } from '../layouts/ProtectedLayout';
import { Landing } from '../pages/Landing';
import { RegressionSetListPage } from '../pages/RegressionSets/RegressionSetListPage';
import { RegressionSetDetailPage } from '../pages/RegressionSets/RegressionSetDetailPage';
import { TestRunHistoryPage } from '../pages/TestRuns/TestRunHistoryPage';
import { TestRunDetailPage } from '../pages/TestRuns/TestRunDetailPage';
import { TestRunExecutePage } from '../pages/TestRuns/TestRunExecutePage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { TeamListPage } from '../pages/Teams/TeamListPage';
import { TeamDetailPage } from '../pages/Teams/TeamDetailPage';
import { AICasesPage } from '../pages/AICases/AICasesPage';
import { ProfileSettingsPage } from '../pages/Settings/ProfileSettingsPage';

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: <Landing />,
      },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/regression-sets',
        element: <RegressionSetListPage />,
      },
      {
        path: '/regression-sets/:id',
        element: <RegressionSetDetailPage />,
      },
      {
        path: '/test-runs',
        element: <TestRunHistoryPage />,
      },
      {
        path: '/test-runs/:runId',
        element: <TestRunDetailPage />,
      },
      {
        path: '/test-runs/:runId/execute',
        element: <TestRunExecutePage />,
      },
      {
        path: '/teams',
        element: <TeamListPage />,
      },
      {
        path: '/teams/:id',
        element: <TeamDetailPage />,
      },
      {
        path: '/ai-cases',
        element: <AICasesPage />,
      },
      {
        path: '/settings',
        element: <ProfileSettingsPage />,
      },
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
