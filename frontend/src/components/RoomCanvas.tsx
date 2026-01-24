/**
 * Room Canvas Component
 *
 * SVG-based visual representation of a room with storage units.
 * Supports selection, drag (when editing), doors, and custom room shapes.
 */
import { useState, useRef } from 'react';
import type { StorageUnitBrief, StorageUnitType, BlockBrief, RoomShape, DoorWall, CutoutCorner } from '../types';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAuthStore } from '../stores/authStore';

interface RoomCanvasProps {
  /** Room width in meters (or grid units) */
  width: number;
  /** Room height in meters (or grid units) */
  height: number;
  /** Storage units to render */
  units: StorageUnitBrief[];
  /** Blocks (visual obstacles) to render */
  blocks?: BlockBrief[];
  /** Currently selected block ID */
  selectedBlockId?: string | null;
  /** Callback when block is selected */
  onBlockSelect?: (blockId: string | null) => void;
  /** Room shape */
  shape?: RoomShape;
  /** L-shape cutout width */
  shapeCutoutWidth?: number | null;
  /** L-shape cutout height */
  shapeCutoutHeight?: number | null;
  /** L-shape cutout corner */
  shapeCutoutCorner?: CutoutCorner | null;
  /** Door wall position */
  doorWall?: DoorWall | null;
  /** Door position along wall (0.0 to 1.0) */
  doorPosition?: number | null;
  /** Door width in meters */
  doorWidth?: number | null;
  /** Callback when unit position changes (during drag - for local preview) */
  onUnitMove?: (unitId: string, x: number, y: number) => void;
  /** Callback when unit drag ends (for persisting to server) */
  onUnitMoveEnd?: (unitId: string, x: number, y: number) => void;
  /** Callback when unit size changes (resize) */
  onUnitResize?: (unitId: string, width: number, height: number) => void;
  /** Callback when block position changes (during drag - for local preview) */
  onBlockMove?: (blockId: string, x: number, y: number) => void;
  /** Callback when block drag ends (for persisting to server) */
  onBlockMoveEnd?: (blockId: string, x: number, y: number) => void;
  /** Callback when block size changes (resize) */
  onBlockResize?: (blockId: string, width: number, height: number) => void;
  /** Callback when door position changes (during drag - for local preview) */
  onDoorMove?: (wall: DoorWall, position: number) => void;
  /** Callback when door drag ends (for persisting to server) */
  onDoorMoveEnd?: (wall: DoorWall, position: number) => void;
}

/** Resize handle positions - only SE (bottom-right) is functional */
type ResizeHandle = 'se';

/**
 * Resize handle component - only bottom-right corner
 */
interface ResizeHandleProps {
  width: number;
  height: number;
  scale: number;
  onHandleMouseDown: (handle: ResizeHandle, e: React.MouseEvent) => void;
}

function ResizeHandle({ width, height, scale, onHandleMouseDown }: ResizeHandleProps) {
  const handleSize = 10;
  const w = width * scale;
  const h = height * scale;

  return (
    <rect
      x={w - handleSize / 2}
      y={h - handleSize / 2}
      width={handleSize}
      height={handleSize}
      fill="#ffffff"
      stroke="#1d4ed8"
      strokeWidth={2}
      rx={2}
      style={{ cursor: 'nwse-resize' }}
      onMouseDown={(e) => onHandleMouseDown('se', e)}
    />
  );
}

/**
 * Colors for different storage unit types
 */
const unitColors: Record<StorageUnitType, string> = {
  cabinet: '#3b82f6',   // Blue
  desk: '#10b981',      // Green
  shelf: '#f59e0b',     // Amber
  drawer: '#8b5cf6',    // Purple
  box: '#ef4444',       // Red
  other: '#6b7280',     // Gray
};

/**
 * Check if two rectangles overlap
 */
function rectanglesOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  // Allow a small tolerance for touching edges
  const tolerance = 0.01;
  return (
    x1 < x2 + w2 - tolerance &&
    x1 + w1 > x2 + tolerance &&
    y1 < y2 + h2 - tolerance &&
    y1 + h1 > y2 + tolerance
  );
}

/**
 * Check if a rectangle is fully inside the room shape
 * Returns true if the rectangle is inside the valid room area
 */
function isInsideRoom(
  x: number,
  y: number,
  width: number,
  height: number,
  roomWidth: number,
  roomHeight: number,
  shape: RoomShape = 'rectangle',
  cutoutWidth?: number | null,
  cutoutHeight?: number | null,
  cutoutCorner?: CutoutCorner | null
): boolean {
  // First check basic room boundaries
  if (x < 0 || y < 0 || x + width > roomWidth || y + height > roomHeight) {
    return false;
  }

  // For rectangle rooms, we're done
  if (shape === 'rectangle' || !cutoutWidth || !cutoutHeight || !cutoutCorner) {
    return true;
  }

  // For L-shaped rooms, check if rectangle overlaps with the cutout
  const cw = cutoutWidth;
  const ch = cutoutHeight;
  let cutoutX1 = 0, cutoutY1 = 0, cutoutX2 = 0, cutoutY2 = 0;

  switch (cutoutCorner) {
    case 'top_right':
      cutoutX1 = roomWidth - cw;
      cutoutY1 = 0;
      cutoutX2 = roomWidth;
      cutoutY2 = ch;
      break;
    case 'top_left':
      cutoutX1 = 0;
      cutoutY1 = 0;
      cutoutX2 = cw;
      cutoutY2 = ch;
      break;
    case 'bottom_right':
      cutoutX1 = roomWidth - cw;
      cutoutY1 = roomHeight - ch;
      cutoutX2 = roomWidth;
      cutoutY2 = roomHeight;
      break;
    case 'bottom_left':
      cutoutX1 = 0;
      cutoutY1 = roomHeight - ch;
      cutoutX2 = cw;
      cutoutY2 = roomHeight;
      break;
  }

  // Check if rectangle overlaps with cutout area
  const overlapsWithCutout =
    x < cutoutX2 && x + width > cutoutX1 &&
    y < cutoutY2 && y + height > cutoutY1;

  return !overlapsWithCutout;
}

/**
 * Generate room path based on shape
 */
function getRoomPath(
  width: number,
  height: number,
  scale: number,
  shape: RoomShape = 'rectangle',
  cutoutWidth?: number | null,
  cutoutHeight?: number | null,
  cutoutCorner?: CutoutCorner | null
): string {
  const w = width * scale;
  const h = height * scale;

  if (shape === 'rectangle' || !cutoutWidth || !cutoutHeight) {
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }

  const cw = cutoutWidth * scale;
  const ch = cutoutHeight * scale;

  // L-shape paths based on cutout corner
  switch (cutoutCorner) {
    case 'top_right':
      return `M 0 0 L ${w - cw} 0 L ${w - cw} ${ch} L ${w} ${ch} L ${w} ${h} L 0 ${h} Z`;
    case 'top_left':
      return `M ${cw} 0 L ${w} 0 L ${w} ${h} L 0 ${h} L 0 ${ch} L ${cw} ${ch} Z`;
    case 'bottom_right':
      return `M 0 0 L ${w} 0 L ${w} ${h - ch} L ${w - cw} ${h - ch} L ${w - cw} ${h} L 0 ${h} Z`;
    case 'bottom_left':
      return `M 0 0 L ${w} 0 L ${w} ${h} L ${cw} ${h} L ${cw} ${h - ch} L 0 ${h - ch} Z`;
    default:
      return `M 0 0 L ${w - cw} 0 L ${w - cw} ${ch} L ${w} ${ch} L ${w} ${h} L 0 ${h} Z`;
  }
}

/**
 * Door component - Architectural floor plan style
 * Shows door as: wall opening + door leaf line + swing arc + hinge point
 */
interface DoorProps {
  wall: DoorWall;
  position: number;
  doorWidth: number;
  roomWidth: number;
  roomHeight: number;
  scale: number;
  canMove: boolean;
  isDragging: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
  shape?: RoomShape;
  cutoutWidth?: number | null;
  cutoutHeight?: number | null;
  cutoutCorner?: CutoutCorner | null;
}

function Door({ wall, position, doorWidth, roomWidth, roomHeight, scale, canMove, isDragging, onDragStart, shape, cutoutWidth, cutoutHeight, cutoutCorner }: DoorProps) {
  const [isHovered, setIsHovered] = useState(false);

  const dw = doorWidth * scale;
  const rw = roomWidth * scale;
  const rh = roomHeight * scale;
  const wallThickness = 4;

  // Calculate cutout dimensions in scaled units
  const cw = (cutoutWidth || 0) * scale;
  const ch = (cutoutHeight || 0) * scale;
  const isLShape = shape === 'l_shape' && cutoutWidth && cutoutHeight && cutoutCorner;

  // Colors - highlight on hover/drag
  const strokeColor = (isHovered || isDragging) ? '#3b82f6' : '#374151';
  const arcColor = (isHovered || isDragging) ? '#60a5fa' : '#6b7280';

  // Calculate door geometry based on wall
  // hingeX, hingeY: position of the hinge (pivot point)
  // leafEndX, leafEndY: end of the door leaf (perpendicular to wall)
  // arcPath: quarter circle showing swing
  let hingeX = 0, hingeY = 0;
  let leafEndX = 0, leafEndY = 0;
  let arcPath = '';
  let openingX = 0, openingY = 0, openingW = 0, openingH = 0;

  // Calculate effective wall length and offset for L-shaped rooms
  // The door position (0-1) is relative to the actual wall segment, not the full room dimension
  let wallLength = 0;
  let wallOffset = 0;

  switch (wall) {
    case 'north': {
      // North wall: check if cutout affects it (top_left or top_right)
      if (isLShape && (cutoutCorner === 'top_left' || cutoutCorner === 'top_right')) {
        wallLength = rw - cw;
        wallOffset = cutoutCorner === 'top_left' ? cw : 0;
      } else {
        wallLength = rw;
        wallOffset = 0;
      }
      // Door on top wall, hinge on left side of opening, swings inward (down-right)
      hingeX = wallOffset + position * wallLength - dw / 2;
      hingeY = 0;
      leafEndX = hingeX;
      leafEndY = dw;
      // Arc from wall (right side of opening) to leaf end (clockwise, showing swing to right)
      arcPath = `M ${hingeX + dw} 0 A ${dw} ${dw} 0 0 1 ${hingeX} ${dw}`;
      openingX = hingeX;
      openingY = -wallThickness;
      openingW = dw;
      openingH = wallThickness * 2;
      break;
    }
    case 'south': {
      // South wall: check if cutout affects it (bottom_left or bottom_right)
      if (isLShape && (cutoutCorner === 'bottom_left' || cutoutCorner === 'bottom_right')) {
        wallLength = rw - cw;
        wallOffset = cutoutCorner === 'bottom_left' ? cw : 0;
      } else {
        wallLength = rw;
        wallOffset = 0;
      }
      // Door on bottom wall, hinge on left side of opening, swings inward (up-right)
      hingeX = wallOffset + position * wallLength - dw / 2;
      hingeY = rh;
      leafEndX = hingeX;
      leafEndY = rh - dw;
      // Arc from wall (right side of opening) to leaf end (counter-clockwise, showing swing to right)
      arcPath = `M ${hingeX + dw} ${rh} A ${dw} ${dw} 0 0 0 ${hingeX} ${rh - dw}`;
      openingX = hingeX;
      openingY = rh - wallThickness;
      openingW = dw;
      openingH = wallThickness * 2;
      break;
    }
    case 'east': {
      // East wall: check if cutout affects it (top_right or bottom_right)
      if (isLShape && (cutoutCorner === 'top_right' || cutoutCorner === 'bottom_right')) {
        wallLength = rh - ch;
        wallOffset = cutoutCorner === 'top_right' ? ch : 0;
      } else {
        wallLength = rh;
        wallOffset = 0;
      }
      // Door on right wall, swings inward (left)
      hingeX = rw;
      hingeY = wallOffset + position * wallLength - dw / 2;
      leafEndX = rw - dw;
      leafEndY = hingeY;
      // Arc from leaf end to wall (counter-clockwise)
      arcPath = `M ${leafEndX} ${leafEndY} A ${dw} ${dw} 0 0 0 ${rw} ${hingeY + dw}`;
      openingX = rw - wallThickness;
      openingY = hingeY;
      openingW = wallThickness * 2;
      openingH = dw;
      break;
    }
    case 'west': {
      // West wall: check if cutout affects it (top_left or bottom_left)
      if (isLShape && (cutoutCorner === 'top_left' || cutoutCorner === 'bottom_left')) {
        wallLength = rh - ch;
        wallOffset = cutoutCorner === 'top_left' ? ch : 0;
      } else {
        wallLength = rh;
        wallOffset = 0;
      }
      // Door on left wall, swings inward (right)
      hingeX = 0;
      hingeY = wallOffset + position * wallLength - dw / 2;
      leafEndX = dw;
      leafEndY = hingeY;
      // Arc from leaf end to wall (clockwise)
      arcPath = `M ${leafEndX} ${leafEndY} A ${dw} ${dw} 0 0 1 0 ${hingeY + dw}`;
      openingX = -wallThickness;
      openingY = hingeY;
      openingW = wallThickness * 2;
      openingH = dw;
      break;
    }
    case 'cutout_horizontal': {
      // Horizontal internal wall of L-shape (runs along X axis)
      if (!isLShape) break;
      wallLength = cw;
      // Position of internal horizontal wall depends on cutout corner
      const wallY = (cutoutCorner === 'top_left' || cutoutCorner === 'top_right') ? ch : rh - ch;
      const wallStartX = (cutoutCorner === 'top_left' || cutoutCorner === 'bottom_left') ? 0 : rw - cw;
      // Door swings into the room (away from cutout)
      const swingDown = (cutoutCorner === 'top_left' || cutoutCorner === 'top_right');
      hingeX = wallStartX + position * wallLength - dw / 2;
      hingeY = wallY;
      leafEndX = hingeX;
      leafEndY = swingDown ? wallY + dw : wallY - dw;
      arcPath = swingDown
        ? `M ${hingeX + dw} ${wallY} A ${dw} ${dw} 0 0 1 ${hingeX} ${wallY + dw}`
        : `M ${hingeX + dw} ${wallY} A ${dw} ${dw} 0 0 0 ${hingeX} ${wallY - dw}`;
      openingX = hingeX;
      openingY = wallY - wallThickness;
      openingW = dw;
      openingH = wallThickness * 2;
      break;
    }
    case 'cutout_vertical': {
      // Vertical internal wall of L-shape (runs along Y axis)
      if (!isLShape) break;
      wallLength = ch;
      // Position of internal vertical wall depends on cutout corner
      const wallX = (cutoutCorner === 'top_left' || cutoutCorner === 'bottom_left') ? cw : rw - cw;
      const wallStartY = (cutoutCorner === 'top_left' || cutoutCorner === 'top_right') ? 0 : rh - ch;
      // Door swings into the room (away from cutout)
      const swingRight = (cutoutCorner === 'top_left' || cutoutCorner === 'bottom_left');
      hingeX = wallX;
      hingeY = wallStartY + position * wallLength - dw / 2;
      leafEndX = swingRight ? wallX + dw : wallX - dw;
      leafEndY = hingeY;
      arcPath = swingRight
        ? `M ${wallX} ${hingeY + dw} A ${dw} ${dw} 0 0 0 ${wallX + dw} ${hingeY}`
        : `M ${wallX} ${hingeY + dw} A ${dw} ${dw} 0 0 1 ${wallX - dw} ${hingeY}`;
      openingX = wallX - wallThickness;
      openingY = hingeY;
      openingW = wallThickness * 2;
      openingH = dw;
      break;
    }
  }

  return (
    <g
      className="door"
      style={{ cursor: canMove ? 'ew-resize' : 'default' }}
      onMouseDown={canMove ? onDragStart : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible hit area for easier dragging */}
      <rect
        x={openingX - 8}
        y={openingY - 8}
        width={openingW + 16}
        height={openingH + 16}
        fill="transparent"
      />

      {/* Door opening (white gap in wall) */}
      <rect
        x={openingX}
        y={openingY}
        width={openingW}
        height={openingH}
        fill="#ffffff"
        stroke="none"
      />

      {/* Door swing arc (quarter circle) */}
      <path
        d={arcPath}
        fill="none"
        stroke={arcColor}
        strokeWidth="1"
      />

      {/* Door leaf (line from hinge, perpendicular to wall) */}
      <line
        x1={hingeX}
        y1={hingeY}
        x2={leafEndX}
        y2={leafEndY}
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Hinge point (small circle at pivot) */}
      <circle
        cx={hingeX}
        cy={hingeY}
        r="3"
        fill={strokeColor}
      />
    </g>
  );
}

/**
 * SVG Room Layout Canvas
 */
function RoomCanvas({
  width,
  height,
  units,
  blocks = [],
  selectedBlockId,
  onBlockSelect,
  shape = 'rectangle',
  shapeCutoutWidth,
  shapeCutoutHeight,
  shapeCutoutCorner,
  doorWall,
  doorPosition,
  doorWidth = 1,
  onUnitMove,
  onUnitMoveEnd,
  onUnitResize,
  onBlockMove,
  onBlockMoveEnd,
  onBlockResize,
  onDoorMove,
  onDoorMoveEnd
}: RoomCanvasProps) {
  const { selectedUnitId, selectUnit } = useInventoryStore();
  const { canEdit } = useAuthStore();
  const svgRef = useRef<SVGSVGElement>(null);

  // Dragging state - stores type and id (for units/blocks) or just type (for door)
  const [dragging, setDragging] = useState<{
    type: 'unit' | 'block' | 'door' | 'resize-unit' | 'resize-block';
    id?: string;
    handle?: ResizeHandle;
    startX?: number;
    startY?: number;
    startWidth?: number;
    startHeight?: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // Local door state for smooth dragging (updated during drag, persisted on end)
  const [localDoorWall, setLocalDoorWall] = useState<DoorWall | null>(null);
  const [localDoorPosition, setLocalDoorPosition] = useState<number | null>(null);
  // Local size for smooth resizing
  const [localSize, setLocalSize] = useState<{ id: string; width: number; height: number } | null>(null);
  // Local position for smooth dragging (updated during drag, persisted on end)
  const [localPosition, setLocalPosition] = useState<{ id: string; x: number; y: number } | null>(null);
  // Flag to prevent click deselection after drag/resize
  const [wasDragging, setWasDragging] = useState(false);

  // Canvas settings
  const canvasWidth = 800;
  const canvasHeight = 600;
  const roomWidth = width || 10;
  const roomHeight = height || 10;
  const scaleX = canvasWidth / roomWidth;
  const scaleY = canvasHeight / roomHeight;
  const scale = Math.min(scaleX, scaleY) * 0.85; // Leave margin for door swing

  // Offset to center the room
  const offsetX = (canvasWidth - roomWidth * scale) / 2;
  const offsetY = (canvasHeight - roomHeight * scale) / 2;

  /**
   * Handle unit click/selection
   */
  const handleUnitClick = (unitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    selectUnit(unitId === selectedUnitId ? null : unitId);
    // Deselect block when selecting unit
    if (onBlockSelect) onBlockSelect(null);
  };

  /**
   * Handle block click/selection
   */
  const handleBlockClick = (blockId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBlockSelect) {
      onBlockSelect(blockId === selectedBlockId ? null : blockId);
    }
    // Deselect unit when selecting block
    selectUnit(null);
  };

  /**
   * Handle mouse down on unit (start drag)
   */
  const handleUnitMouseDown = (unit: StorageUnitBrief, e: React.MouseEvent) => {
    if (!canEdit() || (!onUnitMove && !onUnitMoveEnd)) return;

    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    setDragging({ type: 'unit', id: unit.id });
    setDragOffset({
      x: svgP.x - offsetX - unit.x * scale,
      y: svgP.y - offsetY - unit.y * scale,
    });
    // Initialize local position for smooth dragging
    setLocalPosition({ id: unit.id, x: unit.x, y: unit.y });
  };

  /**
   * Handle mouse down on block (start drag)
   */
  const handleBlockMouseDown = (block: BlockBrief, e: React.MouseEvent) => {
    if (!canEdit() || (!onBlockMove && !onBlockMoveEnd)) return;

    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    setDragging({ type: 'block', id: block.id });
    setDragOffset({
      x: svgP.x - offsetX - block.x * scale,
      y: svgP.y - offsetY - block.y * scale,
    });
    // Initialize local position for smooth dragging
    setLocalPosition({ id: block.id, x: block.x, y: block.y });
  };

  /**
   * Handle mouse down on door (start drag)
   */
  const handleDoorMouseDown = (e: React.MouseEvent) => {
    if (!canEdit() || !onDoorMoveEnd) return;
    e.stopPropagation();
    setDragging({ type: 'door' });
  };

  /**
   * Handle mouse down on unit resize handle
   */
  const handleUnitResizeMouseDown = (unit: StorageUnitBrief, handle: ResizeHandle, e: React.MouseEvent) => {
    if (!canEdit() || !onUnitResize) return;
    e.stopPropagation();

    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    setDragging({
      type: 'resize-unit',
      id: unit.id,
      handle,
      startX: svgP.x,
      startY: svgP.y,
      startWidth: unit.width,
      startHeight: unit.height
    });
    setLocalSize({ id: unit.id, width: unit.width, height: unit.height });
  };

  /**
   * Handle mouse down on block resize handle
   */
  const handleBlockResizeMouseDown = (block: BlockBrief, handle: ResizeHandle, e: React.MouseEvent) => {
    if (!canEdit() || !onBlockResize) return;
    e.stopPropagation();

    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    setDragging({
      type: 'resize-block',
      id: block.id,
      handle,
      startX: svgP.x,
      startY: svgP.y,
      startWidth: block.width,
      startHeight: block.height
    });
    setLocalSize({ id: block.id, width: block.width, height: block.height });
  };

  /**
   * Handle mouse move (dragging)
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    if (dragging.type === 'door') {
      // Door dragging - calculate which wall and position
      const localX = svgP.x - offsetX;
      const localY = svgP.y - offsetY;
      const rw = roomWidth * scale;
      const rh = roomHeight * scale;
      const cw = (shapeCutoutWidth || 0) * scale;
      const ch = (shapeCutoutHeight || 0) * scale;
      const isLShape = shape === 'l_shape' && shapeCutoutWidth && shapeCutoutHeight && shapeCutoutCorner;

      // Calculate distances to all walls (including internal L-shape walls)
      const distToNorth = localY;
      const distToSouth = rh - localY;
      const distToWest = localX;
      const distToEast = rw - localX;

      // For L-shaped rooms, also calculate distance to internal walls
      let distToCutoutH = Infinity; // horizontal internal wall
      let distToCutoutV = Infinity; // vertical internal wall

      if (isLShape) {
        // Internal horizontal wall (runs along X)
        const cutoutHY = (shapeCutoutCorner === 'top_left' || shapeCutoutCorner === 'top_right') ? ch : rh - ch;
        const cutoutHStartX = (shapeCutoutCorner === 'top_left' || shapeCutoutCorner === 'bottom_left') ? 0 : rw - cw;
        const cutoutHEndX = cutoutHStartX + cw;

        // Calculate distance to the wall segment (perpendicular + distance to segment bounds)
        const clampedHX = Math.max(cutoutHStartX, Math.min(cutoutHEndX, localX));
        const dxH = localX - clampedHX;
        const dyH = localY - cutoutHY;
        distToCutoutH = Math.sqrt(dxH * dxH + dyH * dyH);

        // Internal vertical wall (runs along Y)
        const cutoutVX = (shapeCutoutCorner === 'top_left' || shapeCutoutCorner === 'bottom_left') ? cw : rw - cw;
        const cutoutVStartY = (shapeCutoutCorner === 'top_left' || shapeCutoutCorner === 'top_right') ? 0 : rh - ch;
        const cutoutVEndY = cutoutVStartY + ch;

        // Calculate distance to the wall segment (perpendicular + distance to segment bounds)
        const clampedVY = Math.max(cutoutVStartY, Math.min(cutoutVEndY, localY));
        const dxV = localX - cutoutVX;
        const dyV = localY - clampedVY;
        distToCutoutV = Math.sqrt(dxV * dxV + dyV * dyV);
      }

      // Find the closest wall
      const allDistances = [
        { wall: 'north' as DoorWall, dist: distToNorth },
        { wall: 'south' as DoorWall, dist: distToSouth },
        { wall: 'west' as DoorWall, dist: distToWest },
        { wall: 'east' as DoorWall, dist: distToEast },
        { wall: 'cutout_horizontal' as DoorWall, dist: distToCutoutH },
        { wall: 'cutout_vertical' as DoorWall, dist: distToCutoutV },
      ];

      const closest = allDistances.reduce((min, curr) => curr.dist < min.dist ? curr : min);
      let newWall: DoorWall = closest.wall;
      let newPos = 0;
      let wallLengthScaled = 0;
      let wallOffsetScaled = 0;

      switch (newWall) {
        case 'north':
          if (isLShape && (shapeCutoutCorner === 'top_left' || shapeCutoutCorner === 'top_right')) {
            wallLengthScaled = rw - cw;
            wallOffsetScaled = shapeCutoutCorner === 'top_left' ? cw : 0;
          } else {
            wallLengthScaled = rw;
            wallOffsetScaled = 0;
          }
          newPos = (localX - wallOffsetScaled) / wallLengthScaled;
          break;
        case 'south':
          if (isLShape && (shapeCutoutCorner === 'bottom_left' || shapeCutoutCorner === 'bottom_right')) {
            wallLengthScaled = rw - cw;
            wallOffsetScaled = shapeCutoutCorner === 'bottom_left' ? cw : 0;
          } else {
            wallLengthScaled = rw;
            wallOffsetScaled = 0;
          }
          newPos = (localX - wallOffsetScaled) / wallLengthScaled;
          break;
        case 'west':
          if (isLShape && (shapeCutoutCorner === 'top_left' || shapeCutoutCorner === 'bottom_left')) {
            wallLengthScaled = rh - ch;
            wallOffsetScaled = shapeCutoutCorner === 'top_left' ? ch : 0;
          } else {
            wallLengthScaled = rh;
            wallOffsetScaled = 0;
          }
          newPos = (localY - wallOffsetScaled) / wallLengthScaled;
          break;
        case 'east':
          if (isLShape && (shapeCutoutCorner === 'top_right' || shapeCutoutCorner === 'bottom_right')) {
            wallLengthScaled = rh - ch;
            wallOffsetScaled = shapeCutoutCorner === 'top_right' ? ch : 0;
          } else {
            wallLengthScaled = rh;
            wallOffsetScaled = 0;
          }
          newPos = (localY - wallOffsetScaled) / wallLengthScaled;
          break;
        case 'cutout_horizontal':
          wallLengthScaled = cw;
          wallOffsetScaled = (shapeCutoutCorner === 'top_left' || shapeCutoutCorner === 'bottom_left') ? 0 : rw - cw;
          newPos = (localX - wallOffsetScaled) / wallLengthScaled;
          break;
        case 'cutout_vertical':
          wallLengthScaled = ch;
          wallOffsetScaled = (shapeCutoutCorner === 'top_left' || shapeCutoutCorner === 'top_right') ? 0 : rh - ch;
          newPos = (localY - wallOffsetScaled) / wallLengthScaled;
          break;
      }

      // Clamp to valid range (keep door fully within wall)
      const effectiveWallLength = wallLengthScaled / scale;
      const doorW = (doorWidth || 1) / effectiveWallLength;
      newPos = Math.max(doorW / 2 + 0.02, Math.min(1 - doorW / 2 - 0.02, newPos));

      // Update local state for smooth preview
      setLocalDoorWall(newWall);
      setLocalDoorPosition(newPos);

      // Call onDoorMove if provided (for real-time updates)
      if (onDoorMove) {
        onDoorMove(newWall, newPos);
      }
    } else if (dragging.type === 'unit' && dragging.id) {
      const unit = units.find(u => u.id === dragging.id);
      if (unit) {
        const currentX = localPosition?.x ?? unit.x;
        const currentY = localPosition?.y ?? unit.y;
        const newX = (svgP.x - offsetX - dragOffset.x) / scale;
        const newY = (svgP.y - offsetY - dragOffset.y) / scale;

        // Constrain to room boundaries
        const clampedX = Math.max(0, Math.min(roomWidth - unit.width, newX));
        const clampedY = Math.max(0, Math.min(roomHeight - unit.height, newY));

        // Helper to check if position is valid
        const isValidPosition = (x: number, y: number) => {
          if (!isInsideRoom(x, y, unit.width, unit.height, roomWidth, roomHeight, shape, shapeCutoutWidth, shapeCutoutHeight, shapeCutoutCorner)) {
            return false;
          }
          const collidesWithUnit = units.some(other =>
            other.id !== unit.id &&
            rectanglesOverlap(x, y, unit.width, unit.height, other.x, other.y, other.width, other.height)
          );
          const collidesWithBlock = blocks.some(block =>
            rectanglesOverlap(x, y, unit.width, unit.height, block.x, block.y, block.width, block.height)
          );
          return !collidesWithUnit && !collidesWithBlock;
        };

        // Try full movement first
        let finalX = currentX;
        let finalY = currentY;

        if (isValidPosition(clampedX, clampedY)) {
          // Full movement is valid
          finalX = clampedX;
          finalY = clampedY;
        } else {
          // Try moving only on X axis (keep current Y)
          if (isValidPosition(clampedX, currentY)) {
            finalX = clampedX;
          }
          // Try moving only on Y axis (keep current X)
          if (isValidPosition(currentX, clampedY)) {
            finalY = clampedY;
          }
        }

        // Update if position changed
        if (finalX !== currentX || finalY !== currentY) {
          setLocalPosition({ id: dragging.id, x: finalX, y: finalY });
          if (onUnitMove) {
            onUnitMove(dragging.id, finalX, finalY);
          }
        }
      }
    } else if (dragging.type === 'block' && dragging.id) {
      const block = blocks.find(b => b.id === dragging.id);
      if (block) {
        const currentX = localPosition?.x ?? block.x;
        const currentY = localPosition?.y ?? block.y;
        const newX = (svgP.x - offsetX - dragOffset.x) / scale;
        const newY = (svgP.y - offsetY - dragOffset.y) / scale;

        // Constrain to room boundaries
        const clampedX = Math.max(0, Math.min(roomWidth - block.width, newX));
        const clampedY = Math.max(0, Math.min(roomHeight - block.height, newY));

        // Helper to check if position is valid
        const isValidPosition = (x: number, y: number) => {
          if (!isInsideRoom(x, y, block.width, block.height, roomWidth, roomHeight, shape, shapeCutoutWidth, shapeCutoutHeight, shapeCutoutCorner)) {
            return false;
          }
          const collidesWithBlock = blocks.some(other =>
            other.id !== block.id &&
            rectanglesOverlap(x, y, block.width, block.height, other.x, other.y, other.width, other.height)
          );
          const collidesWithUnit = units.some(u =>
            rectanglesOverlap(x, y, block.width, block.height, u.x, u.y, u.width, u.height)
          );
          return !collidesWithBlock && !collidesWithUnit;
        };

        // Try full movement first
        let finalX = currentX;
        let finalY = currentY;

        if (isValidPosition(clampedX, clampedY)) {
          // Full movement is valid
          finalX = clampedX;
          finalY = clampedY;
        } else {
          // Try moving only on X axis (keep current Y)
          if (isValidPosition(clampedX, currentY)) {
            finalX = clampedX;
          }
          // Try moving only on Y axis (keep current X)
          if (isValidPosition(currentX, clampedY)) {
            finalY = clampedY;
          }
        }

        // Update if position changed
        if (finalX !== currentX || finalY !== currentY) {
          setLocalPosition({ id: dragging.id, x: finalX, y: finalY });
          if (onBlockMove) {
            onBlockMove(dragging.id, finalX, finalY);
          }
        }
      }
    } else if ((dragging.type === 'resize-unit' || dragging.type === 'resize-block') && dragging.id && dragging.handle) {
      // Calculate delta in meters - SE handle only (bottom-right)
      const deltaX = (svgP.x - (dragging.startX || 0)) / scale;
      const deltaY = (svgP.y - (dragging.startY || 0)) / scale;
      const startWidth = dragging.startWidth || 1;
      const startHeight = dragging.startHeight || 1;

      // SE handle - increase width/height with positive delta
      let newWidth = Math.max(0.5, startWidth + deltaX);
      let newHeight = Math.max(0.5, startHeight + deltaY);

      // Round to 0.1 precision
      newWidth = Math.round(newWidth * 10) / 10;
      newHeight = Math.round(newHeight * 10) / 10;

      // Constrain to room boundaries - find the element being resized
      const element = dragging.type === 'resize-unit'
        ? units.find(u => u.id === dragging.id)
        : blocks.find(b => b.id === dragging.id);
      if (element) {
        // Limit so element stays in room
        const maxWidth = roomWidth - element.x;
        const maxHeight = roomHeight - element.y;
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);

        // For L-shaped rooms, also check if new size overlaps with cutout
        if (!isInsideRoom(element.x, element.y, newWidth, newHeight, roomWidth, roomHeight, shape, shapeCutoutWidth, shapeCutoutHeight, shapeCutoutCorner)) {
          // Keep current size if new size would overlap cutout
          newWidth = localSize?.width || element.width;
          newHeight = localSize?.height || element.height;
        }

        // Check for collisions with other elements
        if (dragging.type === 'resize-unit') {
          const collidesWithUnit = units.some(other =>
            other.id !== element.id &&
            rectanglesOverlap(element.x, element.y, newWidth, newHeight, other.x, other.y, other.width, other.height)
          );
          const collidesWithBlock = blocks.some(block =>
            rectanglesOverlap(element.x, element.y, newWidth, newHeight, block.x, block.y, block.width, block.height)
          );
          if (collidesWithUnit || collidesWithBlock) {
            newWidth = localSize?.width || element.width;
            newHeight = localSize?.height || element.height;
          }
        } else {
          const collidesWithBlock = blocks.some(other =>
            other.id !== element.id &&
            rectanglesOverlap(element.x, element.y, newWidth, newHeight, other.x, other.y, other.width, other.height)
          );
          const collidesWithUnit = units.some(unit =>
            rectanglesOverlap(element.x, element.y, newWidth, newHeight, unit.x, unit.y, unit.width, unit.height)
          );
          if (collidesWithBlock || collidesWithUnit) {
            newWidth = localSize?.width || element.width;
            newHeight = localSize?.height || element.height;
          }
        }
      }

      setLocalSize({ id: dragging.id, width: newWidth, height: newHeight });
    }
  };

  /**
   * Handle mouse up (end drag)
   */
  const handleMouseUp = () => {
    // Mark that we were dragging to prevent click from deselecting
    if (dragging) {
      setWasDragging(true);
      // Reset the flag after a short delay (to catch the click event)
      setTimeout(() => setWasDragging(false), 50);
    }

    // Persist door position if we were dragging the door
    if (dragging?.type === 'door' && localDoorPosition !== null && onDoorMoveEnd) {
      const wallToUse = localDoorWall || doorWall;
      if (wallToUse) {
        onDoorMoveEnd(wallToUse, localDoorPosition);
      }
    }
    // Persist unit position if we were dragging a unit
    if (dragging?.type === 'unit' && dragging.id && localPosition && onUnitMoveEnd) {
      onUnitMoveEnd(dragging.id, localPosition.x, localPosition.y);
    }
    // Persist block position if we were dragging a block
    if (dragging?.type === 'block' && dragging.id && localPosition && onBlockMoveEnd) {
      onBlockMoveEnd(dragging.id, localPosition.x, localPosition.y);
    }
    // Persist resize if we were resizing
    if (dragging?.type === 'resize-unit' && dragging.id && localSize && onUnitResize) {
      onUnitResize(dragging.id, localSize.width, localSize.height);
    }
    if (dragging?.type === 'resize-block' && dragging.id && localSize && onBlockResize) {
      onBlockResize(dragging.id, localSize.width, localSize.height);
    }
    setDragging(null);
    setLocalDoorWall(null);
    setLocalDoorPosition(null);
    setLocalSize(null);
    setLocalPosition(null);
  };

  /**
   * Handle canvas click (deselect)
   */
  const handleCanvasClick = () => {
    // Don't deselect if we just finished dragging
    if (wasDragging) return;
    selectUnit(null);
    if (onBlockSelect) onBlockSelect(null);
  };

  const roomPath = getRoomPath(
    roomWidth,
    roomHeight,
    scale,
    shape,
    shapeCutoutWidth,
    shapeCutoutHeight,
    shapeCutoutCorner
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      className="room-canvas w-full h-auto"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background grid */}
      <defs>
        <pattern
          id="grid"
          width={scale}
          height={scale}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${scale} 0 L 0 0 0 ${scale}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        </pattern>
        {/* Clip path for L-shaped rooms */}
        <clipPath id="roomClip">
          <path d={roomPath} />
        </clipPath>
      </defs>

      {/* Grid background (clipped to room shape) */}
      <g transform={`translate(${offsetX}, ${offsetY})`}>
        <rect
          width={roomWidth * scale}
          height={roomHeight * scale}
          fill="url(#grid)"
          clipPath="url(#roomClip)"
        />

        {/* Room boundary */}
        <path
          d={roomPath}
          fill="none"
          stroke="#374151"
          strokeWidth="3"
        />

        {/* Door */}
        {(doorWall || localDoorWall) && (doorPosition !== null || localDoorPosition !== null) && (
          <Door
            wall={localDoorWall || doorWall!}
            position={localDoorPosition ?? doorPosition!}
            doorWidth={doorWidth || 1}
            roomWidth={roomWidth}
            roomHeight={roomHeight}
            scale={scale}
            canMove={canEdit() && !!(onDoorMove || onDoorMoveEnd)}
            isDragging={dragging?.type === 'door'}
            onDragStart={handleDoorMouseDown}
            shape={shape}
            cutoutWidth={shapeCutoutWidth}
            cutoutHeight={shapeCutoutHeight}
            cutoutCorner={shapeCutoutCorner}
          />
        )}

        {/* Blocks (visual obstacles - rendered first so units appear on top) */}
        {blocks.map((block) => {
          const isDraggingBlock = dragging?.type === 'block' && dragging.id === block.id;
          const isSelected = block.id === selectedBlockId;
          const isResizing = dragging?.type === 'resize-block' && dragging.id === block.id;
          // Use local size during resize for smooth preview
          const displayWidth = (isResizing && localSize?.id === block.id) ? localSize.width : block.width;
          const displayHeight = (isResizing && localSize?.id === block.id) ? localSize.height : block.height;
          // Use local position during drag for smooth preview
          const displayX = (isDraggingBlock && localPosition?.id === block.id) ? localPosition.x : block.x;
          const displayY = (isDraggingBlock && localPosition?.id === block.id) ? localPosition.y : block.y;

          return (
            <g
              key={`block-${block.id}`}
              transform={`translate(${displayX * scale}, ${displayY * scale}) rotate(${block.rotation}, ${(displayWidth * scale) / 2}, ${(displayHeight * scale) / 2})`}
              className={`block ${isSelected ? 'selected' : ''}`}
              onClick={(e) => handleBlockClick(block.id, e)}
              onMouseDown={(e) => handleBlockMouseDown(block, e)}
              style={{ cursor: canEdit() && (onBlockMove || onBlockMoveEnd) ? 'move' : 'pointer' }}
            >
              {/* Block rectangle - gray/dark */}
              <rect
                width={displayWidth * scale}
                height={displayHeight * scale}
                fill="#4b5563"
                fillOpacity={isDraggingBlock || isResizing ? 0.5 : 0.7}
                stroke={isSelected ? '#ef4444' : '#374151'}
                strokeWidth={isSelected ? 3 : 1}
                rx={2}
              />

              {/* Block label */}
              <text
                x={(displayWidth * scale) / 2}
                y={(displayHeight * scale) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#e5e7eb"
                fontSize={Math.min(12, (displayWidth * scale) / 6)}
                fontWeight="normal"
                pointerEvents="none"
              >
                {block.label}
              </text>

              {/* Resize handle (only when selected and can edit) - bottom-right corner only */}
              {isSelected && canEdit() && onBlockResize && (
                <ResizeHandle
                  width={displayWidth}
                  height={displayHeight}
                  scale={scale}
                  onHandleMouseDown={(handle, e) => handleBlockResizeMouseDown(block, handle, e)}
                />
              )}
            </g>
          );
        })}

        {/* Storage units */}
        {units.map((unit) => {
          const isSelected = unit.id === selectedUnitId;
          const isDraggingUnit = dragging?.type === 'unit' && dragging.id === unit.id;
          const isResizing = dragging?.type === 'resize-unit' && dragging.id === unit.id;
          // Use local size during resize for smooth preview
          const displayWidth = (isResizing && localSize?.id === unit.id) ? localSize.width : unit.width;
          const displayHeight = (isResizing && localSize?.id === unit.id) ? localSize.height : unit.height;
          // Use local position during drag for smooth preview
          const displayX = (isDraggingUnit && localPosition?.id === unit.id) ? localPosition.x : unit.x;
          const displayY = (isDraggingUnit && localPosition?.id === unit.id) ? localPosition.y : unit.y;

          return (
            <g
              key={unit.id}
              transform={`translate(${displayX * scale}, ${displayY * scale}) rotate(${unit.rotation}, ${(displayWidth * scale) / 2}, ${(displayHeight * scale) / 2})`}
              className={`storage-unit ${isSelected ? 'selected' : ''}`}
              onClick={(e) => handleUnitClick(unit.id, e)}
              onMouseDown={(e) => handleUnitMouseDown(unit, e)}
              style={{ cursor: canEdit() && (onUnitMove || onUnitMoveEnd) ? 'move' : 'pointer' }}
            >
              {/* Unit rectangle */}
              <rect
                width={displayWidth * scale}
                height={displayHeight * scale}
                fill={unitColors[unit.type]}
                fillOpacity={isDraggingUnit || isResizing ? 0.5 : 0.8}
                stroke={isSelected ? '#1d4ed8' : '#fff'}
                strokeWidth={isSelected ? 3 : 1}
                rx={4}
              />

              {/* Unit label */}
              <text
                x={(displayWidth * scale) / 2}
                y={(displayHeight * scale) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={Math.min(14, (displayWidth * scale) / 5)}
                fontWeight="bold"
                pointerEvents="none"
              >
                {unit.label}
              </text>

              {/* Resize handle (only when selected and can edit) - bottom-right corner only */}
              {isSelected && canEdit() && onUnitResize && (
                <ResizeHandle
                  width={displayWidth}
                  height={displayHeight}
                  scale={scale}
                  onHandleMouseDown={(handle, e) => handleUnitResizeMouseDown(unit, handle, e)}
                />
              )}
            </g>
          );
        })}
      </g>

      {/* Legend */}
      <g transform={`translate(${canvasWidth - 120}, 10)`}>
        <rect x={-5} y={-5} width={115} height={180} fill="white" fillOpacity="0.9" rx={4} />
        <text x={0} y={10} fontSize={12} fontWeight="bold" fill="#374151">Legend</text>
        {Object.entries(unitColors).map(([type, color], index) => (
          <g key={type} transform={`translate(0, ${20 + index * 18})`}>
            <rect width={12} height={12} fill={color} rx={2} />
            <text x={18} y={10} fontSize={11} fill="#374151" className="capitalize">
              {type}
            </text>
          </g>
        ))}
        {/* Block legend */}
        <g transform={`translate(0, ${20 + 6 * 18})`}>
          <rect width={12} height={12} fill="#4b5563" rx={2} />
          <text x={18} y={10} fontSize={11} fill="#374151">
            block
          </text>
        </g>
        {/* Door legend - architectural style */}
        <g transform={`translate(0, ${20 + 7 * 18})`}>
          <line x1={0} y1={6} x2={0} y2={12} stroke="#374151" strokeWidth={2} strokeLinecap="round" />
          <path d="M 0 12 A 6 6 0 0 1 6 6" fill="none" stroke="#6b7280" strokeWidth={1} />
          <circle cx={0} cy={6} r={2} fill="#374151" />
          <text x={18} y={10} fontSize={11} fill="#374151">
            door
          </text>
        </g>
      </g>
    </svg>
  );
}

export default RoomCanvas;
