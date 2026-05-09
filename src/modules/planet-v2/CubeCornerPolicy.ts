// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * CubeCornerPolicy — Story 6.7.
 *
 * The 8 cube corners (intersections of 3 face edges) are topological
 * singularities of the cube-sphere. The 24 chunks adjacent to those corners
 * (4 per corner × 8 corners ÷ 2 sharing = 24) cannot be rendered as
 * rectangular Unity Terrains because their grid doesn't tile cleanly.
 *
 * `isCubeCornerChunk` returns true for those 24. `shouldUseTerrainEntity`
 * gates per-platform: false on WebGL (no TerrainEntity at all per FR17),
 * false at corners.
 */

import type { ChunkKey } from './types.js';
import { cellsPerEdgeAtLod } from './types.js';

/**
 * True if this chunk is one of the 24 corner-adjacent chunks at any LOD.
 * A corner-adjacent chunk is one whose (cx, cy) is at a corner of the
 * face's grid: cx ∈ {0, lastIndex} AND cy ∈ {0, lastIndex}.
 */
export function isCubeCornerChunk(key: ChunkKey): boolean {
  const last = cellsPerEdgeAtLod(key.lod) - 1;
  const xCorner = key.cx === 0 || key.cx === last;
  const yCorner = key.cy === 0 || key.cy === last;
  return xCorner && yCorner;
}

/**
 * Whether the close-range layer (TerrainEntity) should handle this chunk.
 * Returns false on WebGL (platform limit — no TerrainEntity at all per FR17)
 * or at corners (use TileMesh only — Story 6.7).
 */
export function shouldUseTerrainEntity(key: ChunkKey, isWebGL: boolean): boolean {
  if (isWebGL) return false;
  if (isCubeCornerChunk(key)) return false;
  return true;
}
