import { describe, it, expect } from 'vitest';
import { findFreeSpot } from '../components/RoomCanvas';

describe('findFreeSpot (where new units/blocks are placed)', () => {
  it('places the first element near the top-left of a rectangular room', () => {
    expect(findFreeSpot(1, 1, { width: 10, height: 8, shape: 'rectangle' }, [])).toEqual({ x: 0.5, y: 0.5 });
  });

  it('does not stack a new element on top of an existing one', () => {
    const spot = findFreeSpot(1, 1, { width: 10, height: 8 }, [{ x: 0.5, y: 0.5, width: 1, height: 1 }]);
    expect(spot).not.toEqual({ x: 0.5, y: 0.5 });
    // and it does not overlap the existing element
    const overlaps = spot.x < 1.5 && spot.x + 1 > 0.5 && spot.y < 1.5 && spot.y + 1 > 0.5;
    expect(overlaps).toBe(false);
  });

  it('never places an element in the cut-out of an L-shaped room', () => {
    const room = { width: 12, height: 8, shape: 'l_shape' as const, shape_cutout_width: 4, shape_cutout_height: 3, shape_cutout_corner: 'top_left' as const };
    const spot = findFreeSpot(1, 1, room, []);
    const inCutout = spot.x < 4 && spot.y < 3;
    expect(inCutout).toBe(false);
  });

  it('respects rotated neighbours', () => {
    // 2x1 unit rotated 90deg at (0.5,0.5) really occupies x 1..2, y 0..2
    const spot = findFreeSpot(1, 1, { width: 10, height: 8 }, [{ x: 0.5, y: 0.5, width: 2, height: 1, rotation: 90 }]);
    const overlaps = spot.x < 2 && spot.x + 1 > 1 && spot.y < 2 && spot.y + 1 > 0;
    expect(overlaps).toBe(false);
  });
});
