// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect } from 'vitest';
import { isCubeCornerChunk, shouldUseTerrainEntity } from './CubeCornerPolicy.js';
import type { ChunkKey } from './types.js';

const k = (face: 0 | 1 | 2 | 3 | 4 | 5, lod: number, cx: number, cy: number): ChunkKey => ({
  face, lod, cx, cy,
});

describe('isCubeCornerChunk', () => {
  it('flags corner cells at lod=5 (32 per edge → corners at 0 and 31)', () => {
    expect(isCubeCornerChunk(k(0, 5, 0, 0))).toBe(true);
    expect(isCubeCornerChunk(k(0, 5, 31, 0))).toBe(true);
    expect(isCubeCornerChunk(k(0, 5, 0, 31))).toBe(true);
    expect(isCubeCornerChunk(k(0, 5, 31, 31))).toBe(true);
  });

  it('does not flag edge or interior cells', () => {
    expect(isCubeCornerChunk(k(0, 5, 15, 0))).toBe(false); // top edge but not corner
    expect(isCubeCornerChunk(k(0, 5, 0, 15))).toBe(false); // left edge but not corner
    expect(isCubeCornerChunk(k(0, 5, 15, 15))).toBe(false); // dead center
  });

  it('handles smaller LODs correctly (lod=2 → 4 per edge → corners at 0 and 3)', () => {
    expect(isCubeCornerChunk(k(0, 2, 0, 0))).toBe(true);
    expect(isCubeCornerChunk(k(0, 2, 3, 3))).toBe(true);
    expect(isCubeCornerChunk(k(0, 2, 1, 1))).toBe(false);
  });
});

describe('shouldUseTerrainEntity', () => {
  it('always false on WebGL (FR17)', () => {
    expect(shouldUseTerrainEntity(k(0, 5, 15, 15), true)).toBe(false);
  });
  it('false at corners on non-WebGL', () => {
    expect(shouldUseTerrainEntity(k(0, 5, 0, 0), false)).toBe(false);
  });
  it('true for non-corner non-WebGL', () => {
    expect(shouldUseTerrainEntity(k(0, 5, 15, 15), false)).toBe(true);
  });
});
