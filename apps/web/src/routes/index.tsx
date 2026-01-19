/**
 * Route Definitions for MES Application
 *
 * Defines all application routes with authentication guards.
 *
 * @see specs/feature-production.md
 */

import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Placeholder components - will be implemented in later phases
 */
function LoginPage(): JSX.Element {
  return <div data-testid="login-page">Login Page (Phase 13)</div>;
}

function StationSelectPage(): JSX.Element {
  return <div data-testid="station-select-page">Station Select Page (Phase 13)</div>;
}

function WorkOrderListPage(): JSX.Element {
  return <div data-testid="work-order-list-page">Work Order List Page (Phase 14)</div>;
}

function WorkOrderDetailPage(): JSX.Element {
  return <div data-testid="work-order-detail-page">Work Order Detail Page (Phase 15)</div>;
}

function TeamPage(): JSX.Element {
  return <div data-testid="team-page">Team Page (Phase 17)</div>;
}

function CalendarPage(): JSX.Element {
  return <div data-testid="calendar-page">Calendar Page (Phase 18)</div>;
}

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

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
