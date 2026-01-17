/**
 * Protected Route Component
 *
 * Wraps routes that require authentication or admin access.
 * Redirects to login if user is not authenticated.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  /** Child components to render if authenticated */
  children: ReactNode;
  /** Require admin role */
  requireAdmin?: boolean;
  /** Custom redirect path for unauthenticated users (default: /login) */
  redirectTo?: string;
}

/**
 * Route guard for authenticated routes
 */
function ProtectedRoute({ children, requireAdmin = false, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, token, isLoading, isAdmin } = useAuthStore();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login/register if not authenticated
  if (!token || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
