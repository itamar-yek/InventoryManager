/**
 * Tests for inventory store
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useInventoryStore } from '../stores/inventoryStore';

// Mock the API
vi.mock('../services/api', () => ({
  roomsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  storageUnitsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  compartmentsApi: {
    list: vi.fn(),
  },
  itemsApi: {
    search: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(),
  },
}));

describe('InventoryStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useInventoryStore.setState({
      rooms: [],
      currentRoom: null,
      currentUnit: null,
      items: [],
      searchResults: [],
      searchTotal: 0,
      isLoading: false,
      error: null,
      selectedUnitId: null,
    });
  });

  describe('Initial state', () => {
    it('should start with empty collections', () => {
      const state = useInventoryStore.getState();
      expect(state.rooms).toEqual([]);
      expect(state.currentRoom).toBeNull();
      expect(state.items).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.selectedUnitId).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      useInventoryStore.setState({ error: 'Some error' });

      const { clearError } = useInventoryStore.getState();
      clearError();

      const state = useInventoryStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('selectUnit', () => {
    it('should select a storage unit by ID', () => {
      const { selectUnit } = useInventoryStore.getState();
      selectUnit('unit-123');

      const state = useInventoryStore.getState();
      expect(state.selectedUnitId).toBe('unit-123');
    });

    it('should clear selected unit when null is passed', () => {
      useInventoryStore.setState({ selectedUnitId: 'unit-123' });

      const { selectUnit } = useInventoryStore.getState();
      selectUnit(null);

      const state = useInventoryStore.getState();
      expect(state.selectedUnitId).toBeNull();
    });
  });

  describe('clearSearch', () => {
    it('should clear search results', () => {
      useInventoryStore.setState({
        searchResults: [{ id: '1', name: 'Test' }] as any,
        searchTotal: 1,
      });

      const { clearSearch } = useInventoryStore.getState();
      clearSearch();

      const state = useInventoryStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(state.searchTotal).toBe(0);
    });
  });
});
