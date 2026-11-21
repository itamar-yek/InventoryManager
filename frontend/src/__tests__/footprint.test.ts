import { describe, it, expect } from 'vitest';
import { footprint } from '../components/RoomCanvas';

describe('footprint (area a rotated element occupies)', () => {
  it('is unchanged for 0 and 180 degrees', () => {
    expect(footprint(1, 2, 2, 1, 0)).toEqual({ x: 1, y: 2, w: 2, h: 1 });
    expect(footprint(1, 2, 2, 1, 180)).toEqual({ x: 1, y: 2, w: 2, h: 1 });
  });

  it('swaps width/height around the same centre for 90 and 270 degrees', () => {
    // 2x1 unit at (3,1): centre (4, 1.5). Rotated it is 1x2 around that centre.
    expect(footprint(3, 1, 2, 1, 90)).toEqual({ x: 3.5, y: 0.5, w: 1, h: 2 });
    expect(footprint(3, 1, 2, 1, 270)).toEqual({ x: 3.5, y: 0.5, w: 1, h: 2 });
    expect(footprint(3, 1, 2, 1, -90)).toEqual({ x: 3.5, y: 0.5, w: 1, h: 2 });
  });

  it('treats a missing rotation as 0', () => {
    expect(footprint(0, 0, 2, 1)).toEqual({ x: 0, y: 0, w: 2, h: 1 });
  });
});
