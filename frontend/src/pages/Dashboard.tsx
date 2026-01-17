/**
 * Dashboard Page
 *
 * Overview of inventory with quick stats and recent activity.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAuthStore } from '../stores/authStore';
import LoginPrompt from '../components/LoginPrompt';

/**
 * Dashboard with inventory overview
 */
function Dashboard() {
  const { rooms, fetchRooms, isLoading } = useInventoryStore();
  const { user, canEdit, isAuthenticated } = useAuthStore();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isViewer = user && !canEdit();

  /**
   * Handle room click - redirect to login if not authenticated
   */
  const handleRoomClick = (roomId: string) => {
    if (!isAuthenticated()) {
      setShowLoginPrompt(true);
    } else if (canEdit()) {
      navigate(`/rooms/${roomId}`);
    }
    // Viewers can see but not interact
  };

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.username}
        </h1>
        <p className="text-gray-600">
          Here's an overview of your inventory
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Rooms</p>
              <p className="text-2xl font-bold">{rooms.length}</p>
            </div>
            <span className="text-4xl">🏠</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Your Role</p>
              <p className="text-2xl font-bold capitalize">{user?.role}</p>
            </div>
            <span className="text-4xl">👤</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Quick Actions</p>
              {canEdit() ? (
                <Link to="/search" className="text-primary-600 hover:underline">
                  Search Items →
                </Link>
              ) : (
                <Link to="/rooms" className="text-primary-600 hover:underline">
                  View Rooms →
                </Link>
              )}
            </div>
            <span className="text-4xl">{canEdit() ? '🔍' : '🏠'}</span>
          </div>
        </div>
      </div>

      {/* Viewer notice */}
      {isViewer && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Limited Access</h3>
          <p className="text-yellow-700 text-sm mt-1">
            As a Viewer, you can only see the list of rooms. Contact an administrator to request Editor access to view items, storage units, and use search.
          </p>
        </div>
      )}

      {/* Recent rooms */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Rooms</h2>

        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No rooms yet</p>
            <Link to="/rooms" className="btn-primary">
              Create your first room
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.slice(0, 6).map((room) => (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  canEdit()
                    ? 'hover:border-primary-500 cursor-pointer'
                    : isAuthenticated()
                      ? 'bg-gray-50 cursor-not-allowed'
                      : 'hover:border-primary-500 cursor-pointer'
                }`}
              >
                <h3 className="font-medium">{room.name}</h3>
                {room.building && (
                  <p className="text-sm text-gray-500">{room.building}</p>
                )}
              </button>
            ))}
          </div>
        )}

        {rooms.length > 6 && (
          <div className="mt-4 text-center">
            <Link to="/rooms" className="text-primary-600 hover:underline">
              View all {rooms.length} rooms →
            </Link>
          </div>
        )}
      </div>

      {/* Login Prompt */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="You need to sign in to view room details."
      />
    </div>
  );
}

export default Dashboard;
