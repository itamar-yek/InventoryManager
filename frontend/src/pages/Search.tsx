/**
 * Search Page
 *
 * Global search for items by name and catalog numbers.
 * Requires Editor or Admin role to access.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAuthStore } from '../stores/authStore';

/**
 * Search page with results
 */
function Search() {
  const { searchResults, searchTotal, searchItems, clearSearch, batchDeleteItems, batchMoveItems, isLoading, error, rooms, fetchRooms } = useInventoryStore();
  const { canEdit, isAuthenticated } = useAuthStore();
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Multi-select state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchMoveTargetRoom, setBatchMoveTargetRoom] = useState<string>('');
  const [batchMoveTargetUnit, setBatchMoveTargetUnit] = useState<string>('');
  const [batchTargetRoomUnits, setBatchTargetRoomUnits] = useState<{ id: string; label: string }[]>([]);

  // Fetch rooms for move modal
  useEffect(() => {
    fetchRooms();
  }, []);

  // Update target room units when room selection changes
  useEffect(() => {
    if (batchMoveTargetRoom) {
      fetch(`/api/rooms/${batchMoveTargetRoom}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
        .then(res => res.json())
        .then(data => {
          setBatchTargetRoomUnits(data.storage_units?.map((u: { id: string; label: string }) => ({ id: u.id, label: u.label })) || []);
        })
        .catch(() => setBatchTargetRoomUnits([]));
    } else {
      setBatchTargetRoomUnits([]);
    }
    setBatchMoveTargetUnit('');
  }, [batchMoveTargetRoom]);

  // Selection helper functions
  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllItems = () => {
    setSelectedItemIds(new Set(searchResults.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedItemIds(new Set());
  };

  const isAllSelected = searchResults.length > 0 && selectedItemIds.size === searchResults.length;

  // Check if user has permission to search items
  if (isAuthenticated() && !canEdit()) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            You need Editor or Admin permissions to search for items.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            As a Viewer, you can only see the list of rooms. Contact an administrator to request elevated access.
          </p>
          <Link to="/rooms" className="btn-primary">
            Back to Rooms
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Handle search form submission
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSelectedItemIds(new Set()); // Clear selection on new search
    await searchItems(query);
    setHasSearched(true);
  };

  /**
   * Clear search and reset
   */
  const handleClear = () => {
    setQuery('');
    setHasSearched(false);
    setSelectedItemIds(new Set());
    clearSearch();
  };

  /**
   * Handle batch delete of selected items
   */
  const handleBatchDelete = async () => {
    if (selectedItemIds.size === 0) return;
    if (confirm(`Delete ${selectedItemIds.size} selected item(s)? This cannot be undone.`)) {
      const result = await batchDeleteItems(Array.from(selectedItemIds));
      if (result) {
        clearSelection();
      }
    }
  };

  /**
   * Handle batch move of selected items
   */
  const handleBatchMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.size === 0 || !batchMoveTargetUnit) return;

    const result = await batchMoveItems(Array.from(selectedItemIds), batchMoveTargetUnit, 'Batch move via search');
    if (result) {
      setShowBatchMoveModal(false);
      clearSelection();
      setBatchMoveTargetRoom('');
      setBatchMoveTargetUnit('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Items</h1>
        <p className="text-gray-600">
          Find items by name, catalog number, description, owner, project, or storage unit
        </p>
      </div>

      {/* Search form */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, catalog #, owner, project, unit..."
            className="input flex-1"
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          {hasSearched && (
            <button type="button" onClick={handleClear} className="btn-secondary">
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Search results */}
      {hasSearched && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Results {searchTotal > 0 && `(${searchTotal})`}
            </h2>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No items found matching "{query}"</p>
            </div>
          ) : (
            <>
              {/* Selection action bar */}
              {canEdit() && selectedItemIds.size > 0 && (
                <div className="mb-4 p-3 bg-primary-50 rounded-lg flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-primary-700">
                    {selectedItemIds.size} item(s) selected
                  </span>
                  <button
                    onClick={() => setShowBatchMoveModal(true)}
                    className="btn-secondary text-sm"
                  >
                    Move Selected
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="btn-secondary text-sm text-red-600"
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700 ml-auto"
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      {canEdit() && (
                        <th className="pb-2 w-8">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => e.target.checked ? selectAllItems() : clearSelection()}
                            className="w-4 h-4 rounded"
                          />
                        </th>
                      )}
                      <th className="pb-2 font-semibold">Name</th>
                      <th className="pb-2 font-semibold">Details</th>
                      <th className="pb-2 font-semibold">Location</th>
                      <th className="pb-2 font-semibold text-center">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((item) => (
                      <tr key={item.id} className={`border-b ${selectedItemIds.has(item.id) ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                        {canEdit() && (
                          <td className="py-3">
                            <input
                              type="checkbox"
                              checked={selectedItemIds.has(item.id)}
                              onChange={() => toggleItemSelection(item.id)}
                              className="w-4 h-4 rounded"
                            />
                          </td>
                        )}
                        <td className="py-3">
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-sm">
                        {item.unit_catalog_number && (
                          <p className="text-gray-600">
                            <span className="text-gray-400">Unit#:</span> {item.unit_catalog_number}
                          </p>
                        )}
                        {item.catalog_number && (
                          <p className="text-gray-600">
                            <span className="text-gray-400">Cat#:</span> {item.catalog_number}
                          </p>
                        )}
                        {item.serial_number && (
                          <p className="text-gray-600">
                            <span className="text-gray-400">S/N:</span> {item.serial_number}
                          </p>
                        )}
                        {item.owned_by && (
                          <p className="text-gray-600">
                            <span className="text-gray-400">Owner:</span> {item.owned_by}
                          </p>
                        )}
                        {item.projects && item.projects.length > 0 && (
                          <p className="text-gray-600">
                            <span className="text-gray-400">Projects:</span> {item.projects.join(', ')}
                          </p>
                        )}
                        {!item.unit_catalog_number && !item.catalog_number && !item.serial_number && !item.owned_by && (!item.projects || item.projects.length === 0) && (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        {item.room_id ? (
                          <Link
                            to={`/rooms/${item.room_id}?highlight=${item.storage_unit_id || ''}`}
                            className="block text-sm hover:bg-primary-50 rounded p-1 -m-1 transition-colors"
                          >
                            {item.location_path ? (
                              <p className="text-primary-600 hover:text-primary-700 font-medium">
                                {item.location_path}
                              </p>
                            ) : (
                              <>
                                {item.room_name && (
                                  <p className="text-primary-600 hover:text-primary-700 font-medium">{item.room_name}</p>
                                )}
                                {item.storage_unit_label && (
                                  <p className="text-gray-600">{item.storage_unit_label}</p>
                                )}
                                {item.compartment_name && (
                                  <p className="text-gray-500">{item.compartment_name}</p>
                                )}
                              </>
                            )}
                            {item.storage_unit_type && (
                              <p className="text-xs text-gray-400 capitalize">{item.storage_unit_type}</p>
                            )}
                          </Link>
                        ) : (
                          <div className="text-sm text-gray-400">No location</div>
                        )}
                      </td>
                        <td className="py-3 text-center">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {searchTotal > searchResults.length && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Showing {searchResults.length} of {searchTotal} results
            </p>
          )}
        </div>
      )}

      {/* Search tips */}
      {!hasSearched && (
        <div className="card bg-gray-50">
          <h3 className="font-semibold mb-2">Search Tips</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Search by item name (e.g., "screwdriver")</li>
            <li>• Search by catalog number (e.g., "ABC-123")</li>
            <li>• Search by owner name</li>
            <li>• Search by project name</li>
            <li>• Search by storage unit label</li>
            <li>• Search by description</li>
            <li>• Partial matches are supported</li>
            <li>• Search is case-insensitive</li>
            <li>• Hebrew and other languages are supported</li>
          </ul>
        </div>
      )}

      {/* Batch Move Modal */}
      {showBatchMoveModal && selectedItemIds.size > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Move {selectedItemIds.size} Items</h2>
            <p className="text-gray-600 mb-4">
              Move selected items to a new storage unit.
            </p>

            <form onSubmit={handleBatchMove} className="space-y-4">
              <div>
                <label htmlFor="searchBatchTargetRoom" className="label">Target Room *</label>
                <select
                  id="searchBatchTargetRoom"
                  value={batchMoveTargetRoom}
                  onChange={(e) => setBatchMoveTargetRoom(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select a room...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} {room.building ? `(${room.building})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="searchBatchTargetUnit" className="label">Target Storage Unit *</label>
                <select
                  id="searchBatchTargetUnit"
                  value={batchMoveTargetUnit}
                  onChange={(e) => setBatchMoveTargetUnit(e.target.value)}
                  className="input"
                  required
                  disabled={!batchMoveTargetRoom || batchTargetRoomUnits.length === 0}
                >
                  <option value="">
                    {!batchMoveTargetRoom
                      ? 'Select a room first...'
                      : batchTargetRoomUnits.length === 0
                        ? 'No storage units in this room'
                        : 'Select a storage unit...'}
                  </option>
                  {batchTargetRoomUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchMoveModal(false);
                    setBatchMoveTargetRoom('');
                    setBatchMoveTargetUnit('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!batchMoveTargetUnit}
                >
                  Move Items
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Search;
