/**
 * Admin Dashboard Page
 *
 * Shows system statistics and user management for admins.
 */
import { useEffect, useState } from 'react';
import { authApi } from '../services/api';

interface UserWithStats {
  id: string;
  username: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  is_active: boolean;
  created_at: string;
  last_active: string | null;
  edit_count: number;
  is_online: boolean;
}

interface Stats {
  online_users: number;
  total_users: number;
  total_rooms: number;
  total_storage_units: number;
  total_items: number;
  top_editors: { username: string; edit_count: number }[];
}

function AdminDashboard() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, statsData] = await Promise.all([
          authApi.listUsers() as Promise<UserWithStats[]>,
          authApi.getStats(),
        ]);
        setUsers(usersData);
        setStats(statsData);
      } catch (err) {
        setError('Failed to load admin data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update user role
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await authApi.updateUser(userId, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as 'viewer' | 'editor' | 'admin' } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await authApi.updateUser(userId, { is_active: !isActive });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !isActive } : u));
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{stats.online_users}</p>
            <p className="text-sm text-gray-500">Online Now</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600">{stats.total_users}</p>
            <p className="text-sm text-gray-500">Total Users</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.total_rooms}</p>
            <p className="text-sm text-gray-500">Rooms</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.total_storage_units}</p>
            <p className="text-sm text-gray-500">Storage Units</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-orange-600">{stats.total_items}</p>
            <p className="text-sm text-gray-500">Items</p>
          </div>
        </div>
      )}

      {/* Top Editors */}
      {stats && stats.top_editors.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Top Contributors</h2>
          <div className="flex flex-wrap gap-3">
            {stats.top_editors.map((editor, index) => (
              <div
                key={editor.username}
                className={`px-4 py-2 rounded-full ${
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  index === 2 ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                <span className="font-medium">{editor.username}</span>
                <span className="ml-2 text-sm opacity-75">{editor.edit_count} edits</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">User Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Edits</th>
                <th className="pb-3 font-semibold">Last Active</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        user.is_online ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      title={user.is_online ? 'Online' : 'Offline'}
                    />
                  </td>
                  <td className="py-3">
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="input py-1 px-2 text-sm w-24"
                      disabled={user.role === 'admin'}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <span className="text-sm">{user.edit_count}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-gray-500">
                      {user.last_active
                        ? new Date(user.last_active).toLocaleString()
                        : 'Never'}
                    </span>
                  </td>
                  <td className="py-3">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`text-sm ${
                          user.is_active
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
