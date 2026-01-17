/**
 * API Service - Axios client configuration
 *
 * Centralized API client with authentication token handling,
 * error interceptors, and typed request methods.
 */
import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  AuthToken,
  LoginCredentials,
  User,
  UserCreate,
  Room,
  RoomCreate,
  RoomUpdate,
  RoomWithUnits,
  StorageUnit,
  StorageUnitCreate,
  StorageUnitUpdate,
  Block,
  BlockCreate,
  BlockUpdate,
  Compartment,
  CompartmentCreate,
  CompartmentUpdate,
  Item,
  ItemCreate,
  ItemUpdate,
  ItemMove,
  ItemMovement,
  SearchResults,
  ApiError,
} from '../types';

// =============================================================================
// API Client Setup
// =============================================================================

const API_BASE_URL = '/api';

/**
 * Create configured Axios instance
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - adds auth token to requests
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor - handles auth errors
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Only redirect to login if not already on login page
      // and if this is not the initial token validation
      const isLoginPage = window.location.pathname === '/login';
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      if (!isLoginPage && !isAuthEndpoint) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =============================================================================
// Authentication API
// =============================================================================

export const authApi = {
  /**
   * Login and get JWT token
   */
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<AuthToken>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  /**
   * Register a new user
   */
  async register(data: UserCreate): Promise<User> {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  /**
   * List all users (admin only)
   */
  async listUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/auth/users');
    return response.data;
  },

  /**
   * Get admin dashboard stats (admin only)
   */
  async getStats(): Promise<{
    online_users: number;
    total_users: number;
    total_rooms: number;
    total_storage_units: number;
    total_items: number;
    top_editors: { username: string; edit_count: number }[];
  }> {
    const response = await api.get('/auth/stats');
    return response.data;
  },

  /**
   * Update a user (admin only)
   */
  async updateUser(id: string, data: { role?: string; is_active?: boolean }): Promise<User> {
    const response = await api.put<User>(`/auth/users/${id}`, data);
    return response.data;
  },

  /**
   * Send heartbeat to update online status
   */
  async heartbeat(): Promise<void> {
    await api.post('/auth/heartbeat');
  },
};

// =============================================================================
// Rooms API
// =============================================================================

export const roomsApi = {
  /**
   * List all rooms
   */
  async list(): Promise<Room[]> {
    const response = await api.get<Room[]>('/rooms/');
    return response.data;
  },

  /**
   * Get a room with its storage units
   */
  async get(id: string): Promise<RoomWithUnits> {
    const response = await api.get<RoomWithUnits>(`/rooms/${id}`);
    return response.data;
  },

  /**
   * Create a new room
   */
  async create(data: RoomCreate): Promise<Room> {
    const response = await api.post<Room>('/rooms/', data);
    return response.data;
  },

  /**
   * Update a room
   */
  async update(id: string, data: RoomUpdate): Promise<Room> {
    const response = await api.put<Room>(`/rooms/${id}`, data);
    return response.data;
  },

  /**
   * Delete a room
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/rooms/${id}`);
  },
};

// =============================================================================
// Storage Units API
// =============================================================================

export const storageUnitsApi = {
  /**
   * List storage units, optionally filtered by room
   */
  async list(roomId?: string): Promise<StorageUnit[]> {
    const params = roomId ? { room_id: roomId } : {};
    const response = await api.get<StorageUnit[]>('/storage-units/', { params });
    return response.data;
  },

  /**
   * Get a storage unit
   */
  async get(id: string): Promise<StorageUnit> {
    const response = await api.get<StorageUnit>(`/storage-units/${id}`);
    return response.data;
  },

  /**
   * Create a storage unit
   */
  async create(data: StorageUnitCreate): Promise<StorageUnit> {
    const response = await api.post<StorageUnit>('/storage-units/', data);
    return response.data;
  },

  /**
   * Update a storage unit
   */
  async update(id: string, data: StorageUnitUpdate): Promise<StorageUnit> {
    const response = await api.put<StorageUnit>(`/storage-units/${id}`, data);
    return response.data;
  },

  /**
   * Delete a storage unit
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/storage-units/${id}`);
  },
};

// =============================================================================
// Blocks API (visual obstacles, not storage)
// =============================================================================

export const blocksApi = {
  /**
   * List blocks, optionally filtered by room
   */
  async list(roomId?: string): Promise<Block[]> {
    const params = roomId ? { room_id: roomId } : {};
    const response = await api.get<Block[]>('/blocks/', { params });
    return response.data;
  },

  /**
   * Get a block
   */
  async get(id: string): Promise<Block> {
    const response = await api.get<Block>(`/blocks/${id}`);
    return response.data;
  },

  /**
   * Create a block
   */
  async create(data: BlockCreate): Promise<Block> {
    const response = await api.post<Block>('/blocks/', data);
    return response.data;
  },

  /**
   * Update a block
   */
  async update(id: string, data: BlockUpdate): Promise<Block> {
    const response = await api.put<Block>(`/blocks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a block
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/blocks/${id}`);
  },
};

// =============================================================================
// Compartments API
// =============================================================================

export const compartmentsApi = {
  /**
   * List compartments, optionally filtered by storage unit
   */
  async list(storageUnitId?: string): Promise<Compartment[]> {
    const params = storageUnitId ? { storage_unit_id: storageUnitId } : {};
    const response = await api.get<Compartment[]>('/compartments/', { params });
    return response.data;
  },

  /**
   * Get a compartment
   */
  async get(id: string): Promise<Compartment> {
    const response = await api.get<Compartment>(`/compartments/${id}`);
    return response.data;
  },

  /**
   * Create a compartment
   */
  async create(data: CompartmentCreate): Promise<Compartment> {
    const response = await api.post<Compartment>('/compartments/', data);
    return response.data;
  },

  /**
   * Update a compartment
   */
  async update(id: string, data: CompartmentUpdate): Promise<Compartment> {
    const response = await api.put<Compartment>(`/compartments/${id}`, data);
    return response.data;
  },

  /**
   * Delete a compartment
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/compartments/${id}`);
  },
};

// =============================================================================
// Items API
// =============================================================================

export const itemsApi = {
  /**
   * Search items by name, catalog numbers
   */
  async search(params: {
    query?: string;
    room_id?: string;
    storage_unit_id?: string;
    status?: 'active' | 'deleted';
    limit?: number;
    offset?: number;
  }): Promise<SearchResults> {
    const response = await api.get<SearchResults>('/items/search/', { params });
    return response.data;
  },

  /**
   * List items, optionally filtered by location
   */
  async list(params?: {
    storage_unit_id?: string;
    compartment_id?: string;
    status?: 'active' | 'deleted';
  }): Promise<Item[]> {
    const response = await api.get<Item[]>('/items/', { params });
    return response.data;
  },

  /**
   * Get an item
   */
  async get(id: string): Promise<Item> {
    const response = await api.get<Item>(`/items/${id}`);
    return response.data;
  },

  /**
   * Create an item
   */
  async create(data: ItemCreate): Promise<Item> {
    const response = await api.post<Item>('/items/', data);
    return response.data;
  },

  /**
   * Update an item
   */
  async update(id: string, data: ItemUpdate): Promise<Item> {
    const response = await api.put<Item>(`/items/${id}`, data);
    return response.data;
  },

  /**
   * Move an item to a new location
   */
  async move(id: string, data: ItemMove): Promise<Item> {
    const response = await api.post<Item>(`/items/${id}/move`, data);
    return response.data;
  },

  /**
   * Delete (soft) an item
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  },

  /**
   * Get movement history for an item
   */
  async getHistory(id: string): Promise<ItemMovement[]> {
    const response = await api.get<ItemMovement[]>(`/items/${id}/history`);
    return response.data;
  },
};

export default api;
