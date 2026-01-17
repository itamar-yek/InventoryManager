/**
 * Rooms Page
 *
 * Lists all rooms with ability to create new ones.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAuthStore } from '../stores/authStore';
import LoginPrompt from '../components/LoginPrompt';
import LShapeEditor from '../components/LShapeEditor';
import type { RoomCreate, DoorWall } from '../types';

/**
 * Rooms list and creation
 */
function Rooms() {
  const { rooms, fetchRooms, createRoom, deleteRoom, isLoading, error } = useInventoryStore();
  const { canEdit, isAdmin, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newRoom, setNewRoom] = useState<RoomCreate>({
    name: '',
    building: '',
    width: 10,
    height: 10,
    notes: '',
    shape: 'rectangle',
    door_wall: 'north',
    door_position: 0.5,
    door_width: 1,
  });

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  /**
   * Handle room creation
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = await createRoom(newRoom);
    if (room) {
      setShowCreateModal(false);
      setShowAdvanced(false);
      setNewRoom({
        name: '',
        building: '',
        width: 10,
        height: 10,
        notes: '',
        shape: 'rectangle',
        door_wall: 'north',
        door_position: 0.5,
        door_width: 1,
      });
    }
  };

  /**
   * Handle room deletion
   */
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will delete all storage units and items in this room.`)) {
      await deleteRoom(id);
    }
  };

  /**
   * Handle room click - redirect to login if not authenticated
   */
  const handleRoomClick = (roomId: string) => {
    if (!isAuthenticated()) {
      setLoginMessage('You need to sign in to view room details.');
      setShowLoginPrompt(true);
    } else if (canEdit()) {
      navigate(`/rooms/${roomId}`);
    }
    // Viewers can see but not interact
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
          <p className="text-gray-600">Manage your physical locations</p>
        </div>

        {canEdit() && (
          <button
            onClick={() => {
              if (!isAuthenticated()) {
                setLoginMessage('You need to sign in to create rooms.');
                setShowLoginPrompt(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="btn-primary"
          >
            + Create Room
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Rooms list */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading rooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No rooms yet</p>
          {canEdit() && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create your first room
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Group rooms by building */}
          {(() => {
            // Group rooms by building
            const groupedRooms = rooms.reduce((acc, room) => {
              const building = room.building || 'No Building';
              if (!acc[building]) {
                acc[building] = [];
              }
              acc[building].push(room);
              return acc;
            }, {} as Record<string, typeof rooms>);

            // Sort buildings alphabetically, but put "No Building" at the end
            const buildings = Object.keys(groupedRooms).sort((a, b) => {
              if (a === 'No Building') return 1;
              if (b === 'No Building') return -1;
              return a.localeCompare(b);
            });

            return buildings.map((building) => (
              <div key={building}>
                <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
                  {building}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({groupedRooms[building].length} room{groupedRooms[building].length !== 1 ? 's' : ''})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedRooms[building].map((room) => (
                    <div
                      key={room.id}
                      className={`card transition-shadow ${
                        canEdit() || !isAuthenticated()
                          ? 'hover:shadow-md cursor-pointer'
                          : ''
                      }`}
                      onClick={() => handleRoomClick(room.id)}
                    >
                      <h3 className="font-semibold text-lg">{room.name}</h3>
                      {room.width && room.height && (
                        <p className="text-sm text-gray-400 mt-1">
                          {room.width}m × {room.height}m
                        </p>
                      )}

                      {isAdmin() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(room.id, room.name);
                          }}
                          className="mt-4 text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Room</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="name" className="label">Name *</label>
                <input
                  id="name"
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="building" className="label">Building</label>
                <input
                  id="building"
                  type="text"
                  value={newRoom.building}
                  onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="width" className="label">Width (m)</label>
                  <input
                    id="width"
                    type="number"
                    value={newRoom.width}
                    onChange={(e) => setNewRoom({ ...newRoom, width: Number(e.target.value) })}
                    className="input"
                    min="1"
                  />
                </div>
                <div>
                  <label htmlFor="height" className="label">Height (m)</label>
                  <input
                    id="height"
                    type="number"
                    value={newRoom.height}
                    onChange={(e) => setNewRoom({ ...newRoom, height: Number(e.target.value) })}
                    className="input"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="label">Notes</label>
                <textarea
                  id="notes"
                  value={newRoom.notes}
                  onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              {/* Advanced Options Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
              >
                {showAdvanced ? '▼' : '▶'} Advanced Options (Shape & Door)
              </button>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
                  {/* Room Shape Selector */}
                  <div>
                    <label className="label mb-2">Room Shape</label>
                    <div className="flex gap-3">
                      {/* Rectangle Option */}
                      <button
                        type="button"
                        onClick={() => setNewRoom({
                          ...newRoom,
                          shape: 'rectangle',
                          shape_cutout_width: undefined,
                          shape_cutout_height: undefined,
                          shape_cutout_corner: undefined,
                        })}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                          newRoom.shape !== 'l_shape'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <svg width="50" height="50" className="mb-1">
                          <rect
                            x="5" y="5" width="40" height="40"
                            fill={newRoom.shape !== 'l_shape' ? '#3b82f6' : '#9ca3af'}
                            stroke={newRoom.shape !== 'l_shape' ? '#1d4ed8' : '#6b7280'}
                            strokeWidth="1"
                          />
                        </svg>
                        <span className={`text-xs ${newRoom.shape !== 'l_shape' ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>
                          Rectangle
                        </span>
                      </button>

                      {/* L-Shape Option */}
                      <button
                        type="button"
                        onClick={() => setNewRoom({
                          ...newRoom,
                          shape: 'l_shape',
                          shape_cutout_corner: newRoom.shape_cutout_corner || 'bottom_right',
                          shape_cutout_width: newRoom.shape_cutout_width || Math.floor((newRoom.width || 10) * 0.4),
                          shape_cutout_height: newRoom.shape_cutout_height || Math.floor((newRoom.height || 10) * 0.4),
                        })}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                          newRoom.shape === 'l_shape'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <svg width="50" height="50" className="mb-1">
                          <path
                            d="M 5 5 L 30 5 L 30 25 L 45 25 L 45 45 L 5 45 Z"
                            fill={newRoom.shape === 'l_shape' ? '#3b82f6' : '#9ca3af'}
                            stroke={newRoom.shape === 'l_shape' ? '#1d4ed8' : '#6b7280'}
                            strokeWidth="1"
                          />
                        </svg>
                        <span className={`text-xs ${newRoom.shape === 'l_shape' ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>
                          L-Shape
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* L-Shape Visual Editor */}
                  {newRoom.shape === 'l_shape' && (
                    <LShapeEditor
                      totalWidth={newRoom.width || 10}
                      totalHeight={newRoom.height || 10}
                      cutoutCorner={newRoom.shape_cutout_corner || null}
                      cutoutWidth={newRoom.shape_cutout_width || null}
                      cutoutHeight={newRoom.shape_cutout_height || null}
                      onChange={(data) => setNewRoom({
                        ...newRoom,
                        width: data.width,
                        height: data.height,
                        shape_cutout_corner: data.shape_cutout_corner,
                        shape_cutout_width: data.shape_cutout_width,
                        shape_cutout_height: data.shape_cutout_height,
                      })}
                    />
                  )}

                  {/* Door Configuration - Door is always required */}
                  <div className="pt-2 border-t border-gray-200 space-y-3">
                    <label className="label">Door Configuration</label>
                    <p className="text-xs text-gray-500">Every room has a door. You can drag it along walls after creation.</p>

                    <div>
                      <label htmlFor="doorWall" className="text-xs text-gray-600">Wall</label>
                      <select
                        id="doorWall"
                        value={newRoom.door_wall || 'north'}
                        onChange={(e) => setNewRoom({
                          ...newRoom,
                          door_wall: e.target.value as DoorWall
                        })}
                        className="input mt-1"
                      >
                        <option value="north">North Wall (Top)</option>
                        <option value="south">South Wall (Bottom)</option>
                        <option value="east">East Wall (Right)</option>
                        <option value="west">West Wall (Left)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="doorPosition" className="text-xs text-gray-600">Position along wall</label>
                        <input
                          id="doorPosition"
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={newRoom.door_position || 0.5}
                          onChange={(e) => setNewRoom({ ...newRoom, door_position: Number(e.target.value) })}
                          className="w-full mt-1"
                        />
                        <p className="text-xs text-gray-500 text-center">
                          {Math.round((newRoom.door_position || 0.5) * 100)}%
                        </p>
                      </div>
                      <div>
                        <label htmlFor="doorWidth" className="text-xs text-gray-600">Door Width (m)</label>
                        <input
                          id="doorWidth"
                          type="number"
                          value={newRoom.door_width || 1}
                          onChange={(e) => setNewRoom({ ...newRoom, door_width: Number(e.target.value) })}
                          className="input mt-1"
                          min="0.5"
                          max="3"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowAdvanced(false);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Prompt */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message={loginMessage || "You need to sign in to create rooms."}
      />
    </div>
  );
}

export default Rooms;
