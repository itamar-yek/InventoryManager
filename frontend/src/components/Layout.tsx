/**
 * Layout Component
 *
 * Main application layout with navigation sidebar and header.
 * Renders child routes via Outlet.
 */
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { authApi } from '../services/api';

/**
 * Navigation items configuration
 */
const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/rooms', label: 'Rooms', icon: '🏠' },
  { path: '/search', label: 'Search', icon: '🔍' },
];

/**
 * Main layout with sidebar navigation
 */
function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, token } = useAuthStore();

  // Send heartbeat every 2 minutes to update online status
  useEffect(() => {
    if (!token) return;

    const sendHeartbeat = async () => {
      try {
        await authApi.heartbeat();
      } catch {
        // Ignore heartbeat errors
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-primary-600">
            Inventory Manager
          </h1>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
            {/* Admin Dashboard link - only for admins */}
            {isAdmin() && (
              <li>
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    location.pathname === '/admin'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>⚙️</span>
                  <span>Admin Panel</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* User info at bottom */}
        <div className="p-4 border-t bg-white">
          {user ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{user.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Viewing as guest</p>
              <button
                onClick={() => navigate('/login', { state: { from: location } })}
                className="btn-primary text-sm w-full"
              >
                Sign in to edit
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
