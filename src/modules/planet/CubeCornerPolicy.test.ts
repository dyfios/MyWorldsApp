// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect } from 'vitest';
import { isCubeCornerTile, shouldUseTerrainEntity } from './CubeCornerPolicy.js';
import type { ChunkKey } from './types.js';

const k = (face: 0 | 1 | 2 | 3 | 4 | 5, lod: number, cx: number, cy: number): ChunkKey => ({
  face,
  lod,
  cx,
  cy,
});

describe('isCubeCornerTile', () => {
  it('returns false at LOD 0 (single tile per face — concept of "corner" undefined)', () => {
    // At lod=0, tilesPerEdge=1 so the only tile (0,0) is technically every corner; the policy
    // explicitly excludes lod<1 since the corner-stretch problem only arises with subdivided faces.
    expect(isCubeCornerTile(k(0, 0, 0, 0))).toBe(false);
  });

  it('detects all 4 corners at LOD 1 (max = 1)', () => {
    expect(isCubeCornerTile(k(0, 1, 0, 0))).toBe(true);
    expect(isCubeCornerTile(k(0, 1, 1, 0))).toBe(true);
    expect(isCubeCornerTile(k(0, 1, 0, 1))).toBe(true);
    expect(isCubeCornerTile(k(0, 1, 1, 1))).toBe(true);
  });

  it('detects all 4 corners at higher LODs', () => {
    // At LOD=5, tilesPerEdge=32 so max=31.
    expect(isCubeCornerTile(k(2, 5, 0, 0))).toBe(true);
    expect(isCubeCornerTile(k(2, 5, 31, 0))).toBe(true);
    expect(isCubeCornerTile(k(2, 5, 0, 31))).toBe(true);
    expect(isCubeCornerTile(k(2, 5, 31, 31))).toBe(true);
  });

  it('rejects edge-but-not-corner tiles', () => {
    // Edge tiles share one face-local coord with a corner but the other is interior.
    expect(isCubeCornerTile(k(0, 5, 0, 15))).toBe(false);
    expect(isCubeCornerTile(k(0, 5, 31, 15))).toBe(false);
    expect(isCubeCornerTile(k(0, 5, 15, 0))).toBe(false);
    expect(isCubeCornerTile(k(0, 5, 15, 31))).toBe(false);
  });

  it('rejects fully interior tiles', () => {
    expect(isCubeCornerTile(k(0, 5, 15, 15))).toBe(false);
    expect(isCubeCornerTile(k(3, 4, 7, 8))).toBe(false);
  });

  it('is face-agnostic — same logic on every face', () => {
    for (const face of [0, 1, 2, 3, 4, 5] as const) {
      expect(isCubeCornerTile(k(face, 3, 0, 0))).toBe(true);
      expect(isCubeCornerTile(k(face, 3, 7, 7))).toBe(true);
      expect(isCubeCornerTile(k(face, 3, 4, 4))).toBe(false);
    }
  });
});

describe('shouldUseTerrainEntity', () => {
  it('returns false on WebGL regardless of tile position', () => {
    // WebGL skips the close-range TerrainEntity layer per platform note in release notes.
    expect(shouldUseTerrainEntity(k(0, 5, 15, 15), true)).toBe(false);
    expect(shouldUseTerrainEntity(k(0, 5, 0, 0), true)).toBe(false);
  });

  it('returns false at cube corners on non-WebGL (TileMesh-only per Story 6.7)', () => {
    expect(shouldUseTerrainEntity(k(0, 5, 0, 0), false)).toBe(false);
    expect(shouldUseTerrainEntity(k(0, 5, 31, 31), false)).toBe(false);
  });

  it('returns true for non-corner tiles on non-WebGL platforms', () => {
    expect(shouldUseTerrainEntity(k(0, 5, 15, 15), false)).toBe(true);
    expect(shouldUseTerrainEntity(k(0, 5, 0, 15), false)).toBe(true);
    expect(shouldUseTerrainEntity(k(0, 5, 15, 0), false)).toBe(true);
  });
});
