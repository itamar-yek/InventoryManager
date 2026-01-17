/**
 * Inventory Store - Zustand state management
 *
 * Manages inventory data: rooms, storage units, compartments, and items.
 * Handles API calls and caching.
 */
import { create } from 'zustand';
import { AxiosError } from 'axios';
import type {
  Room,
  RoomWithUnits,
  RoomCreate,
  StorageUnit,
  StorageUnitCreate,
  StorageUnitUpdate,
  Block,
  BlockCreate,
  BlockUpdate,
  Compartment,
  Item,
  ItemCreate,
  ItemUpdate,
  ItemMove,
  ItemSearchResult,
} from '../types';
import { roomsApi, storageUnitsApi, blocksApi, compartmentsApi, itemsApi } from '../services/api';

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof AxiosError && error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

interface InventoryState {
  // Data
  /** List of all rooms */
  rooms: Room[];
  /** Currently selected room with units */
  currentRoom: RoomWithUnits | null;
  /** Currently selected storage unit */
  currentUnit: StorageUnit | null;
  /** Items in current unit/compartment */
  items: Item[];
  /** Search results */
  searchResults: ItemSearchResult[];
  /** Search total count */
  searchTotal: number;

  // UI State
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Selected unit ID on canvas */
  selectedUnitId: string | null;

  // Room Actions
  /** Fetch all rooms */
  fetchRooms: () => Promise<void>;
  /** Fetch a room with its units */
  fetchRoom: (id: string) => Promise<void>;
  /** Create a new room */
  createRoom: (data: RoomCreate) => Promise<Room | null>;
  /** Delete a room */
  deleteRoom: (id: string) => Promise<boolean>;

  // Storage Unit Actions
  /** Create a storage unit */
  createUnit: (data: StorageUnitCreate) => Promise<StorageUnit | null>;
  /** Update a storage unit */
  updateUnit: (id: string, data: StorageUnitUpdate) => Promise<StorageUnit | null>;
  /** Delete a storage unit */
  deleteUnit: (id: string) => Promise<boolean>;
  /** Select a unit on canvas */
  selectUnit: (id: string | null) => void;

  // Block Actions (visual obstacles)
  /** Create a block */
  createBlock: (data: BlockCreate) => Promise<Block | null>;
  /** Update a block */
  updateBlock: (id: string, data: BlockUpdate) => Promise<Block | null>;
  /** Delete a block */
  deleteBlock: (id: string) => Promise<boolean>;

  // Item Actions
  /** Fetch items for a storage unit */
  fetchItems: (storageUnitId: string) => Promise<void>;
  /** Create an item */
  createItem: (data: ItemCreate) => Promise<Item | null>;
  /** Update an item */
  updateItem: (id: string, data: ItemUpdate) => Promise<Item | null>;
  /** Move an item */
  moveItem: (id: string, data: ItemMove) => Promise<Item | null>;
  /** Delete an item */
  deleteItem: (id: string) => Promise<boolean>;

  // Search
  /** Search items */
  searchItems: (query: string, filters?: { room_id?: string }) => Promise<void>;
  /** Clear search results */
  clearSearch: () => void;

  // Utility
  /** Clear error */
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  // Initial state
  rooms: [],
  currentRoom: null,
  currentUnit: null,
  items: [],
  searchResults: [],
  searchTotal: 0,
  isLoading: false,
  error: null,
  selectedUnitId: null,

  // Room Actions
  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await roomsApi.list();
      set({ rooms, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch rooms';
      set({ error: message, isLoading: false });
    }
  },

  fetchRoom: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const room = await roomsApi.get(id);
      set({ currentRoom: room, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch room';
      set({ error: message, isLoading: false });
    }
  },

  createRoom: async (data: RoomCreate) => {
    set({ isLoading: true, error: null });
    try {
      const room = await roomsApi.create(data);
      set((state) => ({
        rooms: [...state.rooms, room],
        isLoading: false,
      }));
      return room;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create room';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  deleteRoom: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await roomsApi.delete(id);
      set((state) => ({
        rooms: state.rooms.filter((r) => r.id !== id),
        currentRoom: state.currentRoom?.id === id ? null : state.currentRoom,
        isLoading: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to delete room');
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Storage Unit Actions
  createUnit: async (data: StorageUnitCreate) => {
    set({ isLoading: true, error: null });
    try {
      const unit = await storageUnitsApi.create(data);
      // Refresh current room to get updated units
      const { currentRoom } = get();
      if (currentRoom && currentRoom.id === data.room_id) {
        await get().fetchRoom(currentRoom.id);
      }
      set({ isLoading: false });
      return unit;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to create unit');
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateUnit: async (id: string, data: StorageUnitUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const unit = await storageUnitsApi.update(id, data);
      // Refresh current room
      const { currentRoom } = get();
      if (currentRoom) {
        await get().fetchRoom(currentRoom.id);
      }
      set({ isLoading: false });
      return unit;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to update unit');
      set({ error: message, isLoading: false });
      return null;
    }
  },

  deleteUnit: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await storageUnitsApi.delete(id);
      // Refresh current room
      const { currentRoom } = get();
      if (currentRoom) {
        await get().fetchRoom(currentRoom.id);
      }
      set({ selectedUnitId: null, items: [], isLoading: false });
      return true;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to delete unit');
      set({ error: message, isLoading: false });
      return false;
    }
  },

  selectUnit: (id: string | null) => {
    set({ selectedUnitId: id });
  },

  // Block Actions (visual obstacles)
  createBlock: async (data: BlockCreate) => {
    set({ isLoading: true, error: null });
    try {
      const block = await blocksApi.create(data);
      // Refresh current room to get updated blocks
      const { currentRoom } = get();
      if (currentRoom && currentRoom.id === data.room_id) {
        await get().fetchRoom(currentRoom.id);
      }
      set({ isLoading: false });
      return block;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to create block');
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateBlock: async (id: string, data: BlockUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const block = await blocksApi.update(id, data);
      // Refresh current room
      const { currentRoom } = get();
      if (currentRoom) {
        await get().fetchRoom(currentRoom.id);
      }
      set({ isLoading: false });
      return block;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to update block');
      set({ error: message, isLoading: false });
      return null;
    }
  },

  deleteBlock: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await blocksApi.delete(id);
      // Refresh current room
      const { currentRoom } = get();
      if (currentRoom) {
        await get().fetchRoom(currentRoom.id);
      }
      set({ isLoading: false });
      return true;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to delete block');
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Item Actions
  fetchItems: async (storageUnitId: string) => {
    set({ isLoading: true, error: null });
    try {
      const items = await itemsApi.list({ storage_unit_id: storageUnitId });
      set({ items, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch items';
      set({ error: message, isLoading: false });
    }
  },

  createItem: async (data: ItemCreate) => {
    set({ isLoading: true, error: null });
    try {
      const item = await itemsApi.create(data);
      set((state) => ({
        items: [...state.items, item],
        isLoading: false,
      }));
      return item;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to create item');
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateItem: async (id: string, data: ItemUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const item = await itemsApi.update(id, data);
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? item : i)),
        isLoading: false,
      }));
      return item;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to update item');
      set({ error: message, isLoading: false });
      return null;
    }
  },

  moveItem: async (id: string, data: ItemMove) => {
    set({ isLoading: true, error: null });
    try {
      const item = await itemsApi.move(id, data);
      // Remove from current items list (moved elsewhere)
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        isLoading: false,
      }));
      return item;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to move item');
      set({ error: message, isLoading: false });
      return null;
    }
  },

  deleteItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await itemsApi.delete(id);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to delete item');
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Search
  searchItems: async (query: string, filters?: { room_id?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const results = await itemsApi.search({
        query,
        ...filters,
        limit: 50,
      });
      set({
        searchResults: results.items,
        searchTotal: results.total,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Search failed';
      set({ error: message, isLoading: false });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], searchTotal: 0 });
  },

  // Utility
  clearError: () => set({ error: null }),
}));
