/**
 * Room Detail Page
 *
 * Shows room layout with storage units and allows editing.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAuthStore } from '../stores/authStore';
import { roomsApi } from '../services/api';
import RoomCanvas from '../components/RoomCanvas';
import LoginPrompt from '../components/LoginPrompt';
import type { StorageUnitCreate, StorageUnitType, StorageUnitUpdate, BlockCreate, ItemCreate, ItemUpdate, Item, DoorWall } from '../types';

/**
 * Room detail with canvas and unit management
 */
function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    currentRoom,
    fetchRoom,
    fetchRooms,
    rooms,
    selectedUnitId,
    selectUnit,
    createUnit,
    updateUnit,
    deleteUnit,
    items,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    moveItem,
    createBlock,
    updateBlock,
    deleteBlock,
    isLoading,
    error,
  } = useInventoryStore();
  const { canEdit, isAuthenticated, user } = useAuthStore();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  /**
   * Check if user can edit, show login prompt if not authenticated
   */
  const _requireEdit = (): boolean => {
    if (!isAuthenticated()) {
      setShowLoginPrompt(true);
      return false;
    }
    return canEdit();
  };
  // Suppress unused variable warning - kept for potential future use
  void _requireEdit;

  // Check if user has permission to view room details (requires editor role)
  useEffect(() => {
    if (isAuthenticated() && !canEdit()) {
      setAccessDenied(true);
    }
  }, [user]);

  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showEditUnit, setShowEditUnit] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [showViewItem, setShowViewItem] = useState(false);
  const [itemToView, setItemToView] = useState<Item | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [editItemData, setEditItemData] = useState<Partial<ItemUpdate>>({});
  const [editItemProjectsInput, setEditItemProjectsInput] = useState('');
  const [showMoveItem, setShowMoveItem] = useState(false);
  const [itemToMove, setItemToMove] = useState<Item | null>(null);
    const [newUnit, setNewUnit] = useState<Partial<StorageUnitCreate>>({
    label: '',
    type: 'cabinet',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const [newBlock, setNewBlock] = useState<Partial<BlockCreate>>({
    label: '',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const [editUnit, setEditUnit] = useState<Partial<StorageUnitUpdate>>({
    label: '',
    width: 1,
    height: 1,
  });
  const [newItem, setNewItem] = useState<Partial<ItemCreate>>({
    name: '',
    unit_catalog_number: '',
    catalog_number: '',
    serial_number: '',
    owned_by: '',
    description: '',
    quantity: 1,
    projects: [],
  });
  const [newItemProjectsInput, setNewItemProjectsInput] = useState('');
  const [moveTargetRoom, setMoveTargetRoom] = useState<string>('');
  const [moveTargetUnit, setMoveTargetUnit] = useState<string>('');
  const [targetRoomUnits, setTargetRoomUnits] = useState<{ id: string; label: string }[]>([]);

  // Fetch room on mount
  useEffect(() => {
    if (id) {
      fetchRoom(id);
    }
    return () => {
      selectUnit(null);
    };
  }, [id]);

  // Handle highlight parameter from search - auto-select storage unit
  useEffect(() => {
    const highlightUnitId = searchParams.get('highlight');
    if (highlightUnitId && currentRoom) {
      // Check if the unit exists in this room
      const unitExists = currentRoom.storage_units.some(u => u.id === highlightUnitId);
      if (unitExists) {
        selectUnit(highlightUnitId);
        // Clear the highlight param after selecting
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, currentRoom, selectUnit, setSearchParams]);

  // Fetch all rooms for move dialog
  useEffect(() => {
    fetchRooms();
  }, []);

  // Fetch items when unit is selected
  useEffect(() => {
    if (selectedUnitId) {
      fetchItems(selectedUnitId);
    }
  }, [selectedUnitId]);

  // Handle keyboard events for delete
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle Backspace/Delete when not in an input field
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return; // Don't intercept when typing in form fields
      }

      if (!canEdit()) return;

      // Delete selected storage unit
      if (selectedUnitId && currentRoom) {
        const unit = currentRoom.storage_units.find(u => u.id === selectedUnitId);
        if (unit && confirm(`Delete storage unit "${unit.label}"? Items in it will be orphaned.`)) {
          e.preventDefault();
          deleteUnit(selectedUnitId);
        }
      }
      // Delete selected block
      else if (selectedBlockId && currentRoom) {
        const block = currentRoom.blocks?.find(b => b.id === selectedBlockId);
        if (block && confirm(`Delete block "${block.label}"?`)) {
          e.preventDefault();
          deleteBlock(selectedBlockId);
          setSelectedBlockId(null);
        }
      }
    }
  }, [selectedUnitId, selectedBlockId, currentRoom, canEdit, deleteUnit, deleteBlock]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Update target room units when room selection changes
  useEffect(() => {
    if (moveTargetRoom && rooms.length > 0) {
      // Find the room and get its units
      const targetRoom = rooms.find(r => r.id === moveTargetRoom);
      if (targetRoom && moveTargetRoom === currentRoom?.id) {
        // Same room - use current room's units
        setTargetRoomUnits(currentRoom?.storage_units.map(u => ({ id: u.id, label: u.label })) || []);
      } else {
        // Different room - need to fetch it
        // For now, we'll rely on the full room data
        // If the room is the current room, use its units
        if (currentRoom && moveTargetRoom === currentRoom.id) {
          setTargetRoomUnits(currentRoom.storage_units.map(u => ({ id: u.id, label: u.label })));
        } else {
          // Fetch the target room to get its units
          fetch(`/api/rooms/${moveTargetRoom}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          })
            .then(res => res.json())
            .then(data => {
              setTargetRoomUnits(data.storage_units?.map((u: { id: string; label: string }) => ({ id: u.id, label: u.label })) || []);
            })
            .catch(() => setTargetRoomUnits([]));
        }
      }
    } else {
      setTargetRoomUnits([]);
    }
    setMoveTargetUnit('');
  }, [moveTargetRoom, rooms, currentRoom]);

  /**
   * Handle unit position change (drag)
   */
  const handleUnitMove = async (unitId: string, x: number, y: number) => {
    await updateUnit(unitId, { x, y });
  };

  /**
   * Handle door position change end (persist to server)
   */
  const handleDoorMoveEnd = async (wall: DoorWall, position: number) => {
    if (!currentRoom) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/rooms/${currentRoom.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          door_wall: wall,
          door_position: position
        })
      });
      // Refresh room data after drag ends
      fetchRoom(currentRoom.id);
    } catch (err) {
      console.error('Failed to update door position:', err);
    }
  };

  /**
   * Add a door to the room
   */
  const handleAddDoor = async (wall: DoorWall) => {
    if (!currentRoom) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/rooms/${currentRoom.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          door_wall: wall,
          door_position: 0.5, // Center of wall
          door_width: 1
        })
      });
      fetchRoom(currentRoom.id);
    } catch (err) {
      console.error('Failed to add door:', err);
    }
  };

  /**
   * Remove the door from the room
   */
  const handleRemoveDoor = async () => {
    if (!currentRoom) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/rooms/${currentRoom.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          door_wall: null,
          door_position: null,
          door_width: null
        })
      });
      fetchRoom(currentRoom.id);
    } catch (err) {
      console.error('Failed to remove door:', err);
    }
  };

  /**
   * Handle block position change (drag)
   */
  const handleBlockMove = async (blockId: string, x: number, y: number) => {
    await updateBlock(blockId, { x, y });
  };

  /**
   * Handle unit resize
   */
  const handleUnitResize = async (unitId: string, width: number, height: number) => {
    await updateUnit(unitId, { width, height });
  };

  /**
   * Handle block resize
   */
  const handleBlockResize = async (blockId: string, width: number, height: number) => {
    await updateBlock(blockId, { width, height });
  };

  /**
   * Handle adding new block
   */
  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    await createBlock({
      ...newBlock,
      room_id: id,
    } as BlockCreate);

    setShowAddBlock(false);
    setNewBlock({ label: '', x: 0, y: 0, width: 1, height: 1 });
  };

  /**
   * Handle deleting a block
   */
  const handleDeleteBlock = async (blockId: string, blockLabel: string) => {
    if (confirm(`Are you sure you want to delete block "${blockLabel}"?`)) {
      await deleteBlock(blockId);
    }
  };

  /**
   * Calculate a valid initial position for a new unit inside the room
   */
  const getValidInitialPosition = (unitWidth: number, unitHeight: number): { x: number; y: number } => {
    if (!currentRoom) return { x: 0, y: 0 };

    const roomW = currentRoom.width || 10;
    const roomH = currentRoom.height || 10;
    const isLShape = currentRoom.shape === 'l_shape';
    const cutoutW = currentRoom.shape_cutout_width || 0;
    const cutoutH = currentRoom.shape_cutout_height || 0;
    const corner = currentRoom.shape_cutout_corner;

    // For L-shaped rooms, find a valid corner that's not in the cutout
    if (isLShape && cutoutW && cutoutH && corner) {
      // Try corners in order of preference, avoiding the cutout corner
      const margin = 0.5; // Small margin from walls
      const corners = [
        { x: margin, y: margin, blocked: corner === 'top_left' },
        { x: roomW - unitWidth - margin, y: margin, blocked: corner === 'top_right' },
        { x: margin, y: roomH - unitHeight - margin, blocked: corner === 'bottom_left' },
        { x: roomW - unitWidth - margin, y: roomH - unitHeight - margin, blocked: corner === 'bottom_right' },
      ];

      // Find first valid corner
      for (const c of corners) {
        if (!c.blocked && c.x >= 0 && c.y >= 0) {
          return { x: c.x, y: c.y };
        }
      }
    }

    // Default: top-left corner with margin
    return { x: 0.5, y: 0.5 };
  };

  /**
   * Handle adding new storage unit
   */
  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    // Calculate valid position based on room shape
    const unitWidth = newUnit.width || 1;
    const unitHeight = newUnit.height || 1;
    const validPos = getValidInitialPosition(unitWidth, unitHeight);

    await createUnit({
      ...newUnit,
      x: validPos.x,
      y: validPos.y,
      room_id: id,
    } as StorageUnitCreate);

    setShowAddUnit(false);
    setNewUnit({ label: '', type: 'cabinet', x: 0, y: 0, width: 1, height: 1 });
  };

  /**
   * Handle editing storage unit
   */
  const handleEditUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return;

    await updateUnit(selectedUnitId, editUnit as StorageUnitUpdate);
    setShowEditUnit(false);
  };

  /**
   * Handle deleting storage unit
   */
  const handleDeleteUnit = async () => {
    if (!selectedUnitId || !selectedUnit) return;
    if (confirm(`Are you sure you want to delete "${selectedUnit.label}"? All items in it will need to be moved first or they will be orphaned.`)) {
      await deleteUnit(selectedUnitId);
    }
  };

  /**
   * Open edit modal for selected unit
   */
  const openEditUnit = () => {
    if (selectedUnit) {
      setEditUnit({
        label: selectedUnit.label,
        width: selectedUnit.width,
        height: selectedUnit.height,
      });
      setShowEditUnit(true);
    }
  };

  /**
   * Handle adding new item to selected storage unit
   */
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return;

    // Parse projects from comma-separated input
    const projects = newItemProjectsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    await createItem({
      ...newItem,
      projects,
      storage_unit_id: selectedUnitId,
    } as ItemCreate);

    setShowAddItem(false);
    setNewItem({ name: '', unit_catalog_number: '', catalog_number: '', serial_number: '', owned_by: '', description: '', quantity: 1, projects: [] });
    setNewItemProjectsInput('');
  };

  /**
   * Handle deleting an item
   */
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
      await deleteItem(itemId);
    }
  };

  /**
   * Handle deleting all items in the selected unit
   */
  const handleDeleteAllItems = async () => {
    if (items.length === 0) return;
    if (confirm(`Are you sure you want to delete all ${items.length} item(s) in this unit? This cannot be undone.`)) {
      for (const item of items) {
        await deleteItem(item.id);
      }
    }
  };

  /**
   * Quick quantity adjustment without opening edit modal
   */
  const handleQuickQuantityChange = async (itemId: string, currentQty: number, delta: number) => {
    const newQty = Math.max(1, currentQty + delta);
    if (newQty !== currentQty) {
      await updateItem(itemId, { quantity: newQty });
    }
  };

  /**
   * Open edit item modal
   */
  const openEditItem = (item: Item) => {
    setItemToEdit(item);
    setEditItemData({
      name: item.name,
      unit_catalog_number: item.unit_catalog_number || '',
      catalog_number: item.catalog_number || '',
      serial_number: item.serial_number || '',
      owned_by: item.owned_by || '',
      description: item.description || '',
      quantity: item.quantity,
    });
    setEditItemProjectsInput(item.projects?.join(', ') || '');
    setShowEditItem(true);
  };

  /**
   * Handle editing an item
   */
  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;

    // Parse projects from comma-separated input
    const projects = editItemProjectsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    await updateItem(itemToEdit.id, {
      ...editItemData,
      projects,
    } as ItemUpdate);

    setShowEditItem(false);
    setItemToEdit(null);
    setEditItemData({});
    setEditItemProjectsInput('');
  };

  /**
   * Open move item modal
   */
  const openMoveItem = (item: Item) => {
    setItemToMove(item);
    setMoveTargetRoom(currentRoom?.id || '');
    setMoveTargetUnit('');
    setShowMoveItem(true);
  };

  /**
   * Handle moving an item
   */
  const handleMoveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToMove || !moveTargetUnit) return;

    await moveItem(itemToMove.id, {
      to_storage_unit_id: moveTargetUnit,
      reason: 'Moved via UI'
    });

    setShowMoveItem(false);
    setItemToMove(null);
    setMoveTargetRoom('');
    setMoveTargetUnit('');
  };

  // Get selected unit details
  const selectedUnit = currentRoom?.storage_units.find(u => u.id === selectedUnitId);

  // Access denied for viewers
  if (accessDenied) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            You need Editor or Admin permissions to view room details, storage units, and items.
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

  if (isLoading && !currentRoom) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading room...</p>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Room not found</p>
        <Link to="/rooms" className="text-primary-600 hover:underline mt-2 block">
          Back to rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/rooms" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to rooms
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {currentRoom.name}
          </h1>
          {currentRoom.building && (
            <p className="text-gray-600">{currentRoom.building}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const blob = await roomsApi.exportCsv(currentRoom.id);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentRoom.name.replace(/\s+/g, '_')}_inventory.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (err) {
                console.error('Export failed:', err);
                alert('Failed to export CSV. Please try again.');
              }
            }}
            className="btn-secondary"
          >
            Export CSV
          </button>
          {canEdit() && (
            <>
              <button
                onClick={() => setShowAddBlock(true)}
                className="btn-secondary"
              >
                + Add Block
              </button>
              <button
                onClick={() => setShowAddUnit(true)}
                className="btn-primary"
              >
                + Add Storage Unit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Main content: Canvas + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Room Layout</h2>
            <RoomCanvas
              width={currentRoom.width || 10}
              height={currentRoom.height || 10}
              units={currentRoom.storage_units}
              blocks={currentRoom.blocks || []}
              selectedBlockId={selectedBlockId}
              onBlockSelect={setSelectedBlockId}
              shape={currentRoom.shape}
              shapeCutoutWidth={currentRoom.shape_cutout_width}
              shapeCutoutHeight={currentRoom.shape_cutout_height}
              shapeCutoutCorner={currentRoom.shape_cutout_corner}
              doorWall={currentRoom.door_wall}
              doorPosition={currentRoom.door_position}
              doorWidth={currentRoom.door_width}
              onUnitMoveEnd={canEdit() ? handleUnitMove : undefined}
              onUnitResize={canEdit() ? handleUnitResize : undefined}
              onBlockMoveEnd={canEdit() ? handleBlockMove : undefined}
              onBlockResize={canEdit() ? handleBlockResize : undefined}
              onDoorMoveEnd={canEdit() ? handleDoorMoveEnd : undefined}
            />
            <p className="text-sm text-gray-500 mt-2">
              Click a storage unit to view its items.
              {canEdit() && ' Drag to reposition. Press Backspace to delete selected.'}
            </p>

            {/* Door Management */}
            {canEdit() && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!currentRoom.door_wall}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleAddDoor('north');
                      } else {
                        handleRemoveDoor();
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Show door</span>
                </label>
                {currentRoom.door_wall && (
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Drag the door on the canvas to reposition
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Selected unit details */}
        <div>
          {selectedUnit ? (
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedUnit.label}</h2>
                  <p className="text-sm text-gray-500 capitalize">
                    Type: {selectedUnit.type}
                  </p>
                  <p className="text-sm text-gray-400">
                    Size: {selectedUnit.width}m x {selectedUnit.height}m
                  </p>
                </div>
                {canEdit() && (
                  <div className="flex gap-2">
                    <button
                      onClick={openEditUnit}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteUnit}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {canEdit() && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="btn-primary text-sm flex-1"
                  >
                    + Add Item
                  </button>
                  {items.length > 0 && (
                    <button
                      onClick={handleDeleteAllItems}
                      className="btn-secondary text-sm text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      Delete All
                    </button>
                  )}
                </div>
              )}

              <h3 className="font-medium mb-2">Items ({items.length})</h3>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No items in this unit</p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-auto">
                  {items.map((item) => (
                    <li key={item.id} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          {item.unit_catalog_number && (
                            <p className="text-gray-500 text-xs">
                              Unit Cat #: {item.unit_catalog_number}
                            </p>
                          )}
                          {item.catalog_number && (
                            <p className="text-gray-500 text-xs">
                              Cat #: {item.catalog_number}
                            </p>
                          )}
                          {item.serial_number && (
                            <p className="text-gray-500 text-xs">
                              S/N: {item.serial_number}
                            </p>
                          )}
                          {item.owned_by && (
                            <p className="text-gray-500 text-xs">
                              Owner: {item.owned_by}
                            </p>
                          )}
                          {item.projects && item.projects.length > 0 && (
                            <p className="text-gray-500 text-xs">
                              Projects: {item.projects.join(', ')}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-gray-400 text-xs">Qty:</span>
                            {canEdit() ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuickQuantityChange(item.id, item.quantity, -1)}
                                  className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 text-xs font-bold flex items-center justify-center"
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </button>
                                <span className="text-gray-600 text-xs w-6 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => handleQuickQuantityChange(item.id, item.quantity, 1)}
                                  className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 text-xs font-bold flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">{item.quantity}</span>
                            )}
                          </div>
                        </div>
                        {canEdit() && (
                          <div className="flex flex-col gap-1 ml-2">
                            <button
                              onClick={() => openEditItem(item)}
                              className="text-green-500 hover:text-green-700 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openMoveItem(item)}
                              className="text-blue-500 hover:text-blue-700 text-xs"
                            >
                              Move
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="card">
              <p className="text-gray-500 text-center py-8">
                Select a storage unit to view items
              </p>
            </div>
          )}

          {/* Unit list */}
          <div className="card mt-4">
            <h2 className="text-lg font-semibold mb-4">
              Storage Units ({currentRoom.storage_units.length})
            </h2>
            {currentRoom.storage_units.length === 0 ? (
              <p className="text-sm text-gray-500">No storage units yet</p>
            ) : (
              <ul className="space-y-2">
                {currentRoom.storage_units.map((unit) => (
                  <li
                    key={unit.id}
                    onClick={() => selectUnit(unit.id)}
                    className={`p-2 rounded cursor-pointer ${
                      unit.id === selectedUnitId
                        ? 'bg-primary-50 border border-primary-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-medium">{unit.label}</p>
                    <p className="text-xs text-gray-500 capitalize">{unit.type}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Blocks list */}
          {(currentRoom.blocks && currentRoom.blocks.length > 0) && (
            <div className="card mt-4">
              <h2 className="text-lg font-semibold mb-4">
                Blocks ({currentRoom.blocks.length})
              </h2>
              <ul className="space-y-2">
                {currentRoom.blocks.map((block) => (
                  <li
                    key={block.id}
                    className="p-2 bg-gray-100 rounded flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-700">{block.label}</p>
                      <p className="text-xs text-gray-500">
                        {block.width}m x {block.height}m
                      </p>
                    </div>
                    {canEdit() && (
                      <button
                        onClick={() => handleDeleteBlock(block.id, block.label)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Add Unit Modal */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Storage Unit</h2>

            <form onSubmit={handleAddUnit} className="space-y-4">
              <div>
                <label htmlFor="label" className="label">Label *</label>
                <input
                  id="label"
                  type="text"
                  value={newUnit.label}
                  onChange={(e) => setNewUnit({ ...newUnit, label: e.target.value })}
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="type" className="label">Type</label>
                <select
                  id="type"
                  value={newUnit.type}
                  onChange={(e) => setNewUnit({ ...newUnit, type: e.target.value as StorageUnitType })}
                  className="input"
                >
                  <option value="cabinet">Cabinet</option>
                  <option value="desk">Desk</option>
                  <option value="shelf">Shelf</option>
                  <option value="drawer">Drawer</option>
                  <option value="box">Box</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="width" className="label">Width (m)</label>
                  <input
                    id="width"
                    type="number"
                    value={newUnit.width}
                    onChange={(e) => setNewUnit({ ...newUnit, width: Number(e.target.value) })}
                    className="input"
                    min="0.1"
                    step="0.1"
                  />
                </div>
                <div>
                  <label htmlFor="height" className="label">Height (m)</label>
                  <input
                    id="height"
                    type="number"
                    value={newUnit.height}
                    onChange={(e) => setNewUnit({ ...newUnit, height: Number(e.target.value) })}
                    className="input"
                    min="0.1"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnit(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {showAddBlock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Block</h2>
            <p className="text-sm text-gray-500 mb-4">
              Blocks are visual obstacles (like furniture or pillars) that cannot hold items.
            </p>

            <form onSubmit={handleAddBlock} className="space-y-4">
              <div>
                <label htmlFor="blockLabel" className="label">Label *</label>
                <input
                  id="blockLabel"
                  type="text"
                  value={newBlock.label}
                  onChange={(e) => setNewBlock({ ...newBlock, label: e.target.value })}
                  className="input"
                  required
                  autoFocus
                  placeholder="e.g., Pillar, Table, Window"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="blockWidth" className="label">Width (m)</label>
                  <input
                    id="blockWidth"
                    type="number"
                    value={newBlock.width}
                    onChange={(e) => setNewBlock({ ...newBlock, width: Number(e.target.value) })}
                    className="input"
                    min="0.1"
                    step="0.1"
                  />
                </div>
                <div>
                  <label htmlFor="blockHeight" className="label">Height (m)</label>
                  <input
                    id="blockHeight"
                    type="number"
                    value={newBlock.height}
                    onChange={(e) => setNewBlock({ ...newBlock, height: Number(e.target.value) })}
                    className="input"
                    min="0.1"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBlock(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Unit Modal */}
      {showEditUnit && selectedUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Storage Unit</h2>

            <form onSubmit={handleEditUnit} className="space-y-4">
              <div>
                <label htmlFor="editLabel" className="label">Label *</label>
                <input
                  id="editLabel"
                  type="text"
                  value={editUnit.label}
                  onChange={(e) => setEditUnit({ ...editUnit, label: e.target.value })}
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editWidth" className="label">Width (m)</label>
                  <input
                    id="editWidth"
                    type="number"
                    value={editUnit.width}
                    onChange={(e) => setEditUnit({ ...editUnit, width: Number(e.target.value) })}
                    className="input"
                    min="0.1"
                    step="0.1"
                  />
                </div>
                <div>
                  <label htmlFor="editHeight" className="label">Height (m)</label>
                  <input
                    id="editHeight"
                    type="number"
                    value={editUnit.height}
                    onChange={(e) => setEditUnit({ ...editUnit, height: Number(e.target.value) })}
                    className="input"
                    min="0.1"
                    step="0.1"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Note: Items in this unit will not be affected.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditUnit(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && selectedUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Item to {selectedUnit.label}</h2>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label htmlFor="itemName" className="label">Name *</label>
                <input
                  id="itemName"
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="unitCatalogNumber" className="label">Unit Catalog Number</label>
                  <input
                    id="unitCatalogNumber"
                    type="text"
                    value={newItem.unit_catalog_number}
                    onChange={(e) => setNewItem({ ...newItem, unit_catalog_number: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="catalogNumber" className="label">Catalog Number</label>
                  <input
                    id="catalogNumber"
                    type="text"
                    value={newItem.catalog_number}
                    onChange={(e) => setNewItem({ ...newItem, catalog_number: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="serialNumber" className="label">Serial Number</label>
                <input
                  id="serialNumber"
                  type="text"
                  value={newItem.serial_number}
                  onChange={(e) => setNewItem({ ...newItem, serial_number: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="ownedBy" className="label">Owned By</label>
                <input
                  id="ownedBy"
                  type="text"
                  value={newItem.owned_by}
                  onChange={(e) => setNewItem({ ...newItem, owned_by: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="quantity" className="label">Quantity</label>
                <input
                  id="quantity"
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                  className="input"
                  min="1"
                />
              </div>

              <div>
                <label htmlFor="projects" className="label">Projects</label>
                <input
                  id="projects"
                  type="text"
                  value={newItemProjectsInput}
                  onChange={(e) => setNewItemProjectsInput(e.target.value)}
                  className="input"
                  placeholder="e.g., Project A, Project B"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated list of projects</p>
              </div>

              <div>
                <label htmlFor="description" className="label">Description</label>
                <textarea
                  id="description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Item Modal */}
      {showMoveItem && itemToMove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Move Item</h2>
            <p className="text-gray-600 mb-4">
              Moving: <span className="font-medium">{itemToMove.name}</span>
            </p>

            <form onSubmit={handleMoveItem} className="space-y-4">
              <div>
                <label htmlFor="targetRoom" className="label">Target Room *</label>
                <select
                  id="targetRoom"
                  value={moveTargetRoom}
                  onChange={(e) => setMoveTargetRoom(e.target.value)}
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
                <label htmlFor="targetUnit" className="label">Target Storage Unit *</label>
                <select
                  id="targetUnit"
                  value={moveTargetUnit}
                  onChange={(e) => setMoveTargetUnit(e.target.value)}
                  className="input"
                  required
                  disabled={!moveTargetRoom || targetRoomUnits.length === 0}
                >
                  <option value="">
                    {!moveTargetRoom
                      ? 'Select a room first...'
                      : targetRoomUnits.length === 0
                        ? 'No storage units in this room'
                        : 'Select a storage unit...'}
                  </option>
                  {targetRoomUnits
                    .filter(u => u.id !== selectedUnitId) // Exclude current unit
                    .map((unit) => (
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
                    setShowMoveItem(false);
                    setItemToMove(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!moveTargetUnit}
                >
                  Move Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItem && itemToEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Item</h2>

            <form onSubmit={handleEditItem} className="space-y-4">
              <div>
                <label htmlFor="editItemName" className="label">Name *</label>
                <input
                  id="editItemName"
                  type="text"
                  value={editItemData.name || ''}
                  onChange={(e) => setEditItemData({ ...editItemData, name: e.target.value })}
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editUnitCatalogNumber" className="label">Unit Catalog Number</label>
                  <input
                    id="editUnitCatalogNumber"
                    type="text"
                    value={editItemData.unit_catalog_number || ''}
                    onChange={(e) => setEditItemData({ ...editItemData, unit_catalog_number: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="editCatalogNumber" className="label">Catalog Number</label>
                  <input
                    id="editCatalogNumber"
                    type="text"
                    value={editItemData.catalog_number || ''}
                    onChange={(e) => setEditItemData({ ...editItemData, catalog_number: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="editSerialNumber" className="label">Serial Number</label>
                <input
                  id="editSerialNumber"
                  type="text"
                  value={editItemData.serial_number || ''}
                  onChange={(e) => setEditItemData({ ...editItemData, serial_number: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="editOwnedBy" className="label">Owned By</label>
                <input
                  id="editOwnedBy"
                  type="text"
                  value={editItemData.owned_by || ''}
                  onChange={(e) => setEditItemData({ ...editItemData, owned_by: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="editQuantity" className="label">Quantity</label>
                <input
                  id="editQuantity"
                  type="number"
                  value={editItemData.quantity || 1}
                  onChange={(e) => setEditItemData({ ...editItemData, quantity: Number(e.target.value) })}
                  className="input"
                  min="1"
                />
              </div>

              <div>
                <label htmlFor="editProjects" className="label">Projects</label>
                <input
                  id="editProjects"
                  type="text"
                  value={editItemProjectsInput}
                  onChange={(e) => setEditItemProjectsInput(e.target.value)}
                  className="input"
                  placeholder="e.g., Project A, Project B"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated list of projects</p>
              </div>

              <div>
                <label htmlFor="editDescription" className="label">Description</label>
                <textarea
                  id="editDescription"
                  value={editItemData.description || ''}
                  onChange={(e) => setEditItemData({ ...editItemData, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditItem(false);
                    setItemToEdit(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Item Modal */}
      {showViewItem && itemToView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{itemToView.name}</h2>
              <button
                onClick={() => { setShowViewItem(false); setItemToView(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Quantity</span>
                <span className="font-medium">{itemToView.quantity}</span>
              </div>

              {itemToView.unit_catalog_number && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Unit Catalog #</span>
                  <span className="font-medium">{itemToView.unit_catalog_number}</span>
                </div>
              )}

              {itemToView.catalog_number && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Catalog #</span>
                  <span className="font-medium">{itemToView.catalog_number}</span>
                </div>
              )}

              {itemToView.serial_number && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Serial #</span>
                  <span className="font-medium">{itemToView.serial_number}</span>
                </div>
              )}

              {itemToView.owned_by && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Owned By</span>
                  <span className="font-medium">{itemToView.owned_by}</span>
                </div>
              )}

              {itemToView.projects && itemToView.projects.length > 0 && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Projects</span>
                  <span className="font-medium">{itemToView.projects.join(', ')}</span>
                </div>
              )}

              {itemToView.description && (
                <div className="border-b pb-2">
                  <span className="text-gray-500 block mb-1">Description</span>
                  <p className="text-sm">{itemToView.description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              {canEdit() && (
                <>
                  <button
                    onClick={() => {
                      setShowViewItem(false);
                      openMoveItem(itemToView);
                    }}
                    className="btn-secondary text-blue-600"
                  >
                    Move
                  </button>
                  <button
                    onClick={() => {
                      setShowViewItem(false);
                      openEditItem(itemToView);
                    }}
                    className="btn-primary"
                  >
                    Edit
                  </button>
                </>
              )}
              {!canEdit() && (
                <button
                  onClick={() => { setShowViewItem(false); setItemToView(null); }}
                  className="btn-secondary"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt Modal */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="You need to sign in to make changes to the inventory."
      />
    </div>
  );
}

export default RoomDetail;
