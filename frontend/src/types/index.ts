/**
 * TypeScript type definitions for Inventory Manager
 *
 * These types mirror the backend Pydantic schemas for type safety
 * across the entire application.
 */

// =============================================================================
// User Types
// =============================================================================

/** User roles with hierarchical permissions */
export type UserRole = 'viewer' | 'editor' | 'admin';

/** User data returned from API */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Data required to create a new user */
export interface UserCreate {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

/** Login credentials */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** JWT token response */
export interface AuthToken {
  access_token: string;
  token_type: string;
}

// =============================================================================
// Room Types
// =============================================================================

/** Supported room shapes */
export type RoomShape = 'rectangle' | 'l_shape';

/** Wall positions for door placement
 * For L-shaped rooms, 'cutout_horizontal' and 'cutout_vertical' refer to the internal walls
 */
export type DoorWall = 'north' | 'south' | 'east' | 'west' | 'cutout_horizontal' | 'cutout_vertical';

/** Corner positions for L-shape cutout */
export type CutoutCorner = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';

/** Room data from API */
export interface Room {
  id: string;
  name: string;
  building: string | null;
  width: number | null;
  height: number | null;
  notes: string | null;
  // Shape configuration
  shape: RoomShape;
  shape_cutout_width: number | null;
  shape_cutout_height: number | null;
  shape_cutout_corner: CutoutCorner | null;
  // Door configuration
  door_wall: DoorWall | null;
  door_position: number | null;
  door_width: number | null;
  created_at: string;
  updated_at: string;
}

/** Brief block info (for room layout) */
export interface BlockBrief {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/** Room with storage units and blocks (for layout view) */
export interface RoomWithUnits extends Room {
  storage_units: StorageUnitBrief[];
  blocks: BlockBrief[];
}

/** Data required to create a room */
export interface RoomCreate {
  name: string;
  building?: string;
  width?: number;
  height?: number;
  notes?: string;
  // Shape configuration
  shape?: RoomShape;
  shape_cutout_width?: number;
  shape_cutout_height?: number;
  shape_cutout_corner?: CutoutCorner;
  // Door configuration
  door_wall?: DoorWall;
  door_position?: number;
  door_width?: number;
}

/** Data for updating a room */
export interface RoomUpdate {
  name?: string;
  building?: string | null;
  width?: number | null;
  height?: number | null;
  notes?: string | null;
  // Shape configuration
  shape?: RoomShape;
  shape_cutout_width?: number | null;
  shape_cutout_height?: number | null;
  shape_cutout_corner?: CutoutCorner | null;
  // Door configuration
  door_wall?: DoorWall | null;
  door_position?: number | null;
  door_width?: number | null;
}

// =============================================================================
// Storage Unit Types
// =============================================================================

/** Types of storage units */
export type StorageUnitType = 'cabinet' | 'desk' | 'shelf' | 'drawer' | 'box' | 'other';

/** Brief storage unit info (for room layout) */
export interface StorageUnitBrief {
  id: string;
  label: string;
  type: StorageUnitType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/** Full storage unit data */
export interface StorageUnit extends StorageUnitBrief {
  room_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Data to create a storage unit */
export interface StorageUnitCreate {
  room_id: string;
  label: string;
  type?: StorageUnitType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  notes?: string;
}

/** Data to update a storage unit */
export interface StorageUnitUpdate {
  label?: string;
  type?: StorageUnitType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  notes?: string | null;
}

// =============================================================================
// Block Types (visual obstacles, not storage)
// =============================================================================

/** Full block data */
export interface Block extends BlockBrief {
  room_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Data to create a block */
export interface BlockCreate {
  room_id: string;
  label: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  notes?: string;
}

/** Data to update a block */
export interface BlockUpdate {
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  notes?: string | null;
}

// =============================================================================
// Compartment Types
// =============================================================================

/** Compartment (subdivision of storage unit) */
export interface Compartment {
  id: string;
  storage_unit_id: string;
  name: string;
  index_order: number;
  created_at: string;
  updated_at: string;
}

/** Data to create a compartment */
export interface CompartmentCreate {
  storage_unit_id: string;
  name: string;
  index_order?: number;
}

/** Data to update a compartment */
export interface CompartmentUpdate {
  name?: string;
  index_order?: number;
}

// =============================================================================
// Item Types
// =============================================================================

/** Item status */
export type ItemStatus = 'active' | 'deleted';

/** Item data from API */
export interface Item {
  id: string;
  storage_unit_id: string | null;
  compartment_id: string | null;
  name: string;
  unit_catalog_number: string | null;
  catalog_number: string | null;
  serial_number: string | null;
  owned_by: string | null;
  description: string | null;
  quantity: number;
  projects: string[];
  status: ItemStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Item with location info (from search) */
export interface ItemSearchResult extends Item {
  room_id: string | null;
  room_name: string | null;
  storage_unit_label: string | null;
  compartment_name: string | null;
}

/** Search results response */
export interface SearchResults {
  items: ItemSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

/** Data to create an item */
export interface ItemCreate {
  name: string;
  storage_unit_id?: string;
  compartment_id?: string;
  unit_catalog_number?: string;
  catalog_number?: string;
  serial_number?: string;
  owned_by?: string;
  description?: string;
  quantity?: number;
  projects?: string[];
}

/** Data to update an item */
export interface ItemUpdate {
  name?: string;
  unit_catalog_number?: string | null;
  catalog_number?: string | null;
  serial_number?: string | null;
  owned_by?: string | null;
  description?: string | null;
  quantity?: number;
  projects?: string[];
}

/** Data to move an item */
export interface ItemMove {
  to_storage_unit_id?: string;
  to_compartment_id?: string;
  reason?: string;
}

// =============================================================================
// Item Movement (Audit Trail)
// =============================================================================

/** Item movement record */
export interface ItemMovement {
  id: string;
  item_id: string;
  user_id: string | null;
  from_storage_unit_id: string | null;
  from_compartment_id: string | null;
  to_storage_unit_id: string | null;
  to_compartment_id: string | null;
  reason: string | null;
  created_at: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/** Generic API error response */
export interface ApiError {
  detail: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
