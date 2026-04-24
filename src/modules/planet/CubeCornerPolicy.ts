// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * Cube-corner tile handling (Story 6.7).
 *
 * Each of the 8 cube corners is covered by exactly 3 tiles — one from each
 * adjacent face, in the face-local corner position. These 24 tiles render via
 * the TileMesh layer only; the TerrainEntity layer is suppressed because the
 * underlying rectangular heightmap grid cannot express the 120° stretched
 * corner topology.
 *
 * At LOD L, tilesPerEdge = 2^L. The 4 per-face corner positions are
 * (0,0), (max,0), (0,max), (max,max) where max = tilesPerEdge - 1.
 */

import type { ChunkKey } from './types.js';

/** Returns true when the chunk sits on one of the 4 face-local corner cells. */
export function isCubeCornerTile(key: ChunkKey): boolean {
  if (key.lod < 1) return false;
  const max = (1 << key.lod) - 1;
  const atX = key.cx === 0 || key.cx === max;
  const atY = key.cy === 0 || key.cy === max;
  return atX && atY;
}

/** Layer selection given the close-range decision. */
export function shouldUseTerrainEntity(key: ChunkKey, isWebGL: boolean): boolean {
  if (isWebGL) return false;
  if (isCubeCornerTile(key)) return false;
  return true;
}
