// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * FaceTraversal — Story 6.7 Phase 2a (equator traversal).
 *
 * The cube has 12 edges; 4 of them form a continuous equatorial loop
 * along which adjacent faces meet with rotation=0 (local axes aligned):
 *
 *   POS_X (RIGHT) → NEG_Z → NEG_X → POS_Z → POS_X (LEFT)
 *
 * The other 8 edges connect the equator faces to POS_Y / NEG_Y with
 * rotation∈{1,2,3}, which requires a heights-matrix and mesh re-orient
 * that's out of scope for Phase 2a. This module supports walking around
 * the equator loop only — N/S off the equator returns null, callers
 * clamp.
 *
 * Layout sanity check:
 *   - perEdge = 2^lod  (e.g., lod=5 → 32 chunks per face edge)
 *   - one full equator lap = 4 * perEdge chunks
 *   - chunkOffset chooses the shorter direction (≤ 2 * perEdge), so
 *     the streamer never sees a chunk it has loaded as both "+2 east"
 *     and "−126 west" simultaneously.
 */

import type { ChunkKey, CubeFace } from './types.js';

/**
 * Equator-face order, walking east from POS_X.
 *   index 0 = POS_X    (face 0)
 *   index 1 = NEG_Z    (face 5) — east neighbor of POS_X
 *   index 2 = NEG_X    (face 1) — east neighbor of NEG_Z
 *   index 3 = POS_Z    (face 4) — east neighbor of NEG_X, west of POS_X
 *
 * Verified against PlanetShared's `getFaceAdjacency` table (rotation=0
 * transitions form this exact cycle).
 */
const EQUATOR_FACES_EAST: readonly CubeFace[] = [0, 5, 1, 4];

/** Per-face ordinal within the equator loop. null for POS_Y / NEG_Y. */
const EQUATOR_ORDINAL: Record<number, number | null> = {
  0: 0, // POS_X
  5: 1, // NEG_Z
  1: 2, // NEG_X
  4: 3, // POS_Z
  2: null, // POS_Y — off equator
  3: null, // NEG_Y — off equator
};

/** Is this face on the equator loop? */
export function isEquatorFace(face: CubeFace): boolean {
  return EQUATOR_ORDINAL[face as number] !== null;
}

/**
 * Linear east-position along the equator loop, measured in chunks.
 * Returns null when the face is off-equator. The returned value is in
 * [0, 4 * perEdge); callers wishing to compute differences should let
 * `chunkOffset` handle wrap-around.
 */
export function equatorChunkX(key: ChunkKey): number | null {
  const ord = EQUATOR_ORDINAL[key.face as number];
  if (ord === null || ord === undefined) return null;
  const perEdge = 1 << key.lod;
  return ord * perEdge + key.cx;
}

/**
 * Inverse: equator-east position (chunks) → ChunkKey. Wraps modulo the
 * full equator length (4 * perEdge). `cy` is preserved verbatim — this
 * function never crosses north/south.
 */
export function equatorChunkFromX(equatorX: number, lod: number, cy: number): ChunkKey {
  const perEdge = 1 << lod;
  const loop = 4 * perEdge;
  let x = equatorX % loop;
  if (x < 0) x += loop;
  const ord = Math.floor(x / perEdge);
  const cx = x - ord * perEdge;
  return { face: EQUATOR_FACES_EAST[ord]!, lod, cx, cy };
}

/**
 * Signed (dx, dz) chunk-grid offset from `origin` to `key`, in chunks.
 *
 * Same-face: trivial difference. Cross-equator-face: walk the equator
 * loop and take the shorter direction. Returns null when the offset
 * isn't representable in flat XZ:
 *   - lod mismatch
 *   - off-equator face involved (POS_Y / NEG_Y)
 *   - cross-face N/S (key.cy !== origin.cy)
 *
 * The shorter-direction choice means |dx| ≤ 2 * perEdge — at lod=5,
 * the player can be ≤64 chunks east or west of origin before the wrap
 * folds it the other way. The streamer evicts long before that, so the
 * fold is purely defensive.
 */
export function chunkOffset(
  key: ChunkKey,
  origin: ChunkKey,
): { dx: number; dz: number } | null {
  if (key.lod !== origin.lod) return null;
  if (key.face === origin.face) {
    return { dx: key.cx - origin.cx, dz: key.cy - origin.cy };
  }
  if (key.cy !== origin.cy) return null;
  const eqK = equatorChunkX(key);
  const eqO = equatorChunkX(origin);
  if (eqK === null || eqO === null) return null;
  const perEdge = 1 << key.lod;
  const loop = 4 * perEdge;
  let dx = eqK - eqO;
  if (dx > loop / 2) dx -= loop;
  else if (dx < -loop / 2) dx += loop;
  return { dx, dz: 0 };
}

/**
 * Apply a chunk-grid offset to `origin`. Returns the resulting key, or
 * null when traversal can't stay flat in Phase 2a:
 *   - newCy out of [0, perEdge) — N/S off the face requires a rotated
 *     edge crossing (POS_Y / NEG_Y), Phase 2b territory.
 *   - newCx out of bounds + origin off-equator — same rotation issue.
 *
 * The vertical component is always evaluated AFTER the horizontal
 * equator hop, so "east by 1 from the east-edge + north by 1" lands on
 * NEG_Z.0.cy+1 (still on the equator face). A pure-vertical move that
 * leaves the face does fail, since the equator faces' top/bottom edges
 * connect to POS_Y / NEG_Y with rotation ≠ 0.
 */
export function chunkAtOffset(
  origin: ChunkKey,
  dx: number,
  dz: number,
): ChunkKey | null {
  const perEdge = 1 << origin.lod;
  const newCy = origin.cy + dz;
  if (newCy < 0 || newCy >= perEdge) return null; // N/S off-face — Phase 2b
  const newCx = origin.cx + dx;
  if (newCx >= 0 && newCx < perEdge) {
    return { face: origin.face, lod: origin.lod, cx: newCx, cy: newCy };
  }
  // Cross-face east/west: origin must be on the equator. cy travels
  // unchanged because rotation=0 transitions preserve the v-axis.
  if (!isEquatorFace(origin.face)) return null;
  const eq = equatorChunkX(origin);
  if (eq === null) return null;
  return equatorChunkFromX(eq + dx, origin.lod, newCy);
}
