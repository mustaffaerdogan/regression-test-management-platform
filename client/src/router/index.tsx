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
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};

