// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect } from 'vitest';
import {
  chunkOffset,
  chunkAtOffset,
  equatorChunkX,
  equatorChunkFromX,
  isEquatorFace,
} from './FaceTraversal.js';
import type { ChunkKey } from './types.js';

const k = (face: 0|1|2|3|4|5, cx: number, cy: number, lod = 5): ChunkKey =>
  ({ face, lod, cx, cy });

describe('FaceTraversal — equator faces', () => {
  it('classifies POS_X / NEG_Z / NEG_X / POS_Z as equator faces', () => {
    expect(isEquatorFace(0)).toBe(true); // POS_X
    expect(isEquatorFace(5)).toBe(true); // NEG_Z
    expect(isEquatorFace(1)).toBe(true); // NEG_X
    expect(isEquatorFace(4)).toBe(true); // POS_Z
  });
  it('excludes POS_Y / NEG_Y', () => {
    expect(isEquatorFace(2)).toBe(false);
    expect(isEquatorFace(3)).toBe(false);
  });
});

describe('FaceTraversal — equatorChunkX', () => {
  // lod=5 → perEdge=32. Loop length = 128.
  it('orders POS_X (cx=0) at position 0', () => {
    expect(equatorChunkX(k(0, 0, 15))).toBe(0);
  });
  it('orders POS_X (cx=31) just before NEG_Z (cx=0)', () => {
    expect(equatorChunkX(k(0, 31, 15))).toBe(31);
    expect(equatorChunkX(k(5, 0, 15))).toBe(32);
  });
  it('orders NEG_X at position 64 + cx', () => {
    expect(equatorChunkX(k(1, 0, 15))).toBe(64);
    expect(equatorChunkX(k(1, 31, 15))).toBe(95);
  });
  it('orders POS_Z at position 96 + cx', () => {
    expect(equatorChunkX(k(4, 0, 15))).toBe(96);
    expect(equatorChunkX(k(4, 31, 15))).toBe(127);
  });
  it('returns null for POS_Y and NEG_Y', () => {
    expect(equatorChunkX(k(2, 15, 15))).toBeNull();
    expect(equatorChunkX(k(3, 15, 15))).toBeNull();
  });
});

describe('FaceTraversal — equatorChunkFromX', () => {
  it('inverse round-trips for equator chunks', () => {
    for (const face of [0, 5, 1, 4] as const) {
      for (const cx of [0, 1, 15, 30, 31]) {
        const eq = equatorChunkX(k(face, cx, 15))!;
        const back = equatorChunkFromX(eq, 5, 15);
        expect(back).toEqual({ face, lod: 5, cx, cy: 15 });
      }
    }
  });
  it('wraps negative positions', () => {
    // -1 east is 31 west of origin → POS_Z (cx=31)
    expect(equatorChunkFromX(-1, 5, 15)).toEqual(k(4, 31, 15));
  });
  it('wraps past full loop', () => {
    // 128 = 0; one full lap
    expect(equatorChunkFromX(128, 5, 15)).toEqual(k(0, 0, 15));
  });
});

describe('FaceTraversal — chunkOffset', () => {
  it('returns 0,0 for the same key', () => {
    expect(chunkOffset(k(0, 15, 15), k(0, 15, 15))).toEqual({ dx: 0, dz: 0 });
  });
  it('returns same-face cx/cy differences', () => {
    expect(chunkOffset(k(0, 17, 13), k(0, 15, 15))).toEqual({ dx: 2, dz: -2 });
  });
  it('crosses POS_X RIGHT edge → NEG_Z as +1', () => {
    expect(chunkOffset(k(5, 0, 15), k(0, 31, 15))).toEqual({ dx: 1, dz: 0 });
  });
  it('crosses POS_X LEFT edge → POS_Z as -1', () => {
    expect(chunkOffset(k(4, 31, 15), k(0, 0, 15))).toEqual({ dx: -1, dz: 0 });
  });
  it('returns null for cross-face when cy differs', () => {
    expect(chunkOffset(k(5, 0, 10), k(0, 31, 15))).toBeNull();
  });
  it('returns null when off-equator (POS_Y)', () => {
    expect(chunkOffset(k(2, 0, 0), k(0, 31, 15))).toBeNull();
  });
  it('returns null on lod mismatch', () => {
    expect(chunkOffset(k(0, 15, 15, 4), k(0, 15, 15, 5))).toBeNull();
  });
  it('picks the shorter direction across the equator loop', () => {
    // POS_Z (face 4) cx=31 is 1 chunk WEST of POS_X cx=0, not 127 east.
    expect(chunkOffset(k(4, 31, 15), k(0, 0, 15))).toEqual({ dx: -1, dz: 0 });
    // POS_Z cx=0 is 96 east in equator coords, but shorter path is -32.
    expect(chunkOffset(k(4, 0, 15), k(0, 0, 15))).toEqual({ dx: -32, dz: 0 });
  });
});

describe('FaceTraversal — chunkAtOffset', () => {
  it('is the inverse of chunkOffset for same-face', () => {
    const origin = k(0, 15, 15);
    const target = k(0, 17, 13);
    const off = chunkOffset(target, origin)!;
    expect(chunkAtOffset(origin, off.dx, off.dz)).toEqual(target);
  });
  it('is the inverse of chunkOffset for east-face crossing', () => {
    const origin = k(0, 31, 15);
    expect(chunkAtOffset(origin, 1, 0)).toEqual(k(5, 0, 15));
    expect(chunkAtOffset(origin, 2, 0)).toEqual(k(5, 1, 15));
  });
  it('is the inverse for west-face crossing', () => {
    const origin = k(0, 0, 15);
    expect(chunkAtOffset(origin, -1, 0)).toEqual(k(4, 31, 15));
    expect(chunkAtOffset(origin, -2, 0)).toEqual(k(4, 30, 15));
  });
  it('returns null for N/S off-face (Phase 2b territory)', () => {
    // origin at top of face — crossing north would hit POS_Y (rotation≠0).
    const origin = k(0, 15, 31);
    expect(chunkAtOffset(origin, 0, 1)).toBeNull();
  });
  it('returns null for diagonal cross-face moves (rotation-complicated)', () => {
    const origin = k(0, 31, 15);
    // +1 east AND +1 north — would need to handle face rotation in two
    // dimensions simultaneously. Phase 2a says no.
    expect(chunkAtOffset(origin, 1, 1)).toEqual(k(5, 0, 16)); // east only is fine
    expect(chunkAtOffset(origin, 1, -1)).toEqual(k(5, 0, 14)); // east + south same-face on neighbor
    // But N/S off the face combined with east: cy=32 (over the top)
    expect(chunkAtOffset(k(0, 31, 31), 1, 1)).toBeNull();
  });
  it('walks all the way around the equator', () => {
    // Walking 128 chunks east lands back on origin's face.
    expect(chunkAtOffset(k(0, 0, 15), 128, 0)).toEqual(k(0, 0, 15));
  });
});
