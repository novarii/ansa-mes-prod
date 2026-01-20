/**
 * Route Definitions for MES Application
 *
 * Defines all application routes with authentication guards.
 *
 * @see specs/feature-production.md
 */

import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ComponentShowcase } from '../features/dev/ComponentShowcase';
import { LoginPage, StationSelectPage } from '../features/auth';
import { WorkOrderListPage, WorkOrderDetailPage } from '../features/work-orders';
import { TeamPage } from '../features/team';
import { CalendarPage } from '../features/calendar';

/**
 * Protected route wrapper that requires authentication
 */
function RequireAuth(): JSX.Element {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Protected route wrapper that requires station selection
 */
function RequireStation(): JSX.Element {
  const { isAuthenticated, isStationSelected } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isStationSelected) {
    return <Navigate to="/select-station" replace />;
  }

  return <Outlet />;
}

/**
 * Guest route wrapper - redirects authenticated users
 */
function GuestOnly(): JSX.Element {
  const { isAuthenticated, isStationSelected } = useAuth();

  if (isAuthenticated && isStationSelected) {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated && !isStationSelected) {
    return <Navigate to="/select-station" replace />;
  }

  return <Outlet />;
}

/**
 * Application routes
 */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      {/* Guest-only routes (login) */}
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Requires authentication but not station */}
      <Route element={<RequireAuth />}>
        <Route path="/select-station" element={<StationSelectPage />} />
      </Route>

      {/* Protected routes (require auth + station) */}
      <Route element={<RequireStation />}>
        <Route path="/" element={<WorkOrderListPage />} />
        <Route path="/work-orders/:docEntry" element={<WorkOrderDetailPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Route>

      {/* Dev routes (no auth required) */}
      <Route path="/dev/components" element={<ComponentShowcase />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
