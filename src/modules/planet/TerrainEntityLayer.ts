// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * TerrainEntityLayer (Story 6.6).
 *
 * Close-range renderer: passes a 2D `float[][]` heightmap to WebVerse's
 * `TerrainEntity.CreateHeightmap` — the JSONEntityHandler fast path. Digger
 * Pro activates on tiles rendered by this layer (except cube-corners, where
 * shouldUseTerrainEntity() returns false — see CubeCornerPolicy).
 *
 * Disabled on WebGL (AC 6.6 — platform limit).
 *
 * The actual `TerrainEntity.CreateHeightmap` call is runtime-gated: it only
 * fires when the WebVerse globals (`TerrainEntity`, `Color`, `Vector3`,
 * `Quaternion`, `UUID`) are present. In Node test environments those are
 * undefined, so the layer tracks slot lifecycle without making API calls.
 */

import { ChunkKey, chunkKeyString, PlanetSceneConfig, ChunkData } from './types.js';
import { shouldUseTerrainEntity } from './CubeCornerPolicy.js';

/**
 * Fixed planet-wide sea-level offset (meters below world Y=0). Heights from
 * the plugin range roughly [-300, +700] for V1 25km planets — shifting by
 * +300 keeps everything positive so Unity TerrainData (which clamps [0..1])
 * doesn't lose the ocean depth, and using the same offset on every chunk
 * means adjacent chunks render at the same baseline.
 *
 * V1 single value; later this becomes per-planet config from the world
 * manifest so deeper-ocean planets can scale appropriately.
 */
const SEA_LEVEL_OFFSET_METERS = 300;

interface RuntimeEntity {
  SetVisibility?: (v: boolean) => void;
  SetInteractionState?: (s: number) => void;
  Delete?: () => void;
}

interface LoadedTerrainTile {
  key: ChunkKey;
  terrainEntityId: string | null;
  entity: RuntimeEntity | null;
}

interface WebVerseGlobals {
  TerrainEntity?: {
    CreateHeightmap: (
      parent: unknown | null,
      length: number,
      width: number,
      height: number,
      heights: number[][],
      layers: unknown[],
      layerMasks: unknown,
      position: unknown,
      rotation: unknown,
      id?: string,
      tag?: string,
      onLoaded?: string,
      stitchTerrains?: boolean,
    ) => unknown;
  };
  Color?: new (r: number, g: number, b: number, a: number) => unknown;
  Vector3?: new (x: number, y: number, z: number) => unknown;
  Quaternion?: { identity: unknown };
  UUID?: { NewUUID: () => { ToString: () => string } };
}

export class TerrainEntityLayer {
  private readonly cfg: PlanetSceneConfig;
  private readonly tiles = new Map<string, LoadedTerrainTile>();
  private readonly isWebGL: boolean;
  /**
   * World-space origin in chunk coordinates. Pinned from `cfg.originChunk`
   * if provided, otherwise lazy-pinned to the first chunk loaded. Subsequent
   * chunks render at their (cx - originCx, cy - originCy) offset.
   */
  private originCx: number | null = null;
  private originCy: number | null = null;

  constructor(cfg: PlanetSceneConfig, isWebGL: boolean) {
    this.cfg = cfg;
    this.isWebGL = isWebGL;
    if (cfg.originChunk) {
      this.originCx = cfg.originChunk.cx;
      this.originCy = cfg.originChunk.cy;
    }
  }

  /** Returns false when this tile must fall back to TileMesh (corners / WebGL). */
  canHandle(key: ChunkKey): boolean {
    return shouldUseTerrainEntity(key, this.isWebGL);
  }

  load(key: ChunkKey, chunk: ChunkData): void {
    if (!this.canHandle(key)) return;
    const id = chunkKeyString(key);
    if (this.tiles.has(id)) return;

    const tile: LoadedTerrainTile = { key, terrainEntityId: null, entity: null };
    this.tiles.set(id, tile);

    const w = globalThis as unknown as WebVerseGlobals;
    if (!w.TerrainEntity || !w.Color || !w.Vector3 || !w.Quaternion || !w.UUID) {
      // No runtime — slot is tracked but no terrain rendered (tests, headless).
      void this.cfg;
      return;
    }

    // Shift every height by the planet-wide sea-level offset so all values
    // are ≥0 (Unity TerrainData.SetHeights clamps negatives to 0). Using a
    // FIXED offset across all chunks — instead of per-chunk min — means
    // adjacent tiles align cleanly at their shared boundary.
    // Mutates `chunk.heights` in place; the matrix isn't retained by caller.
    let rawMin = Infinity;
    let rawMax = -Infinity;
    for (let r = 0; r < chunk.heights.length; r++) {
      const row = chunk.heights[r]!;
      for (let i = 0; i < row.length; i++) {
        const v = row[i]!;
        if (v < rawMin) rawMin = v;
        if (v > rawMax) rawMax = v;
        row[i] = v + SEA_LEVEL_OFFSET_METERS;
      }
    }
    // Diagnostic: print raw plugin-side min/max so we can tell at a glance
    // whether neighboring chunks share value ranges (visible boundary cliffs
    // are bugs) or differ wildly (cliffs are real geography).
    try {
      const w2 = globalThis as unknown as { Logging?: { Log?: (m: string) => void } };
      w2.Logging?.Log?.(`tile ${id} raw min=${rawMin.toFixed(1)} max=${rawMax.toFixed(1)} range=${(rawMax - rawMin).toFixed(1)}`);
    } catch (_e) { /* runtime may be absent in tests */ }
    // Use the plugin-declared height envelope so all chunks share the same
    // vertical scale. Unity stores heightmap in [0..1] = value / envelope;
    // rendered relief is still in real meters via terrainData.size.y.
    const envelope = chunk.height;

    // `specular` must be a real Color instance — Jint won't auto-construct
    // from a {r,g,b,a} object literal.
    const stubLayer = {
      diffuseTexture: '',
      normalTexture: '',
      maskTexture: '',
      specular: new w.Color(0.5, 0.5, 0.5, 1),
      metallic: 0,
      smoothness: 0,
      sizeFactor: 1,
    };

    const entityId = w.UUID.NewUUID().ToString();
    tile.terrainEntityId = entityId;

    // Per-chunk callback name so concurrent loads don't clobber each other's
    // onLoaded handlers. Cleaned up by the callback once invoked.
    const cbId = w.UUID.NewUUID().ToString().replace(/-/g, '');
    const cbName = `__mwapp_terrainLoaded_${id.replace(/:/g, '_')}_${cbId}`;
    const g = globalThis as Record<string, unknown>;
    g[cbName] = (entity: RuntimeEntity | null): void => {
      delete g[cbName];
      if (!entity) return;
      // Tile may already be unloaded by the time this fires — drop in that case.
      if (!this.tiles.has(id)) {
        try { entity.Delete?.(); } catch (_e) { /* best-effort */ }
        return;
      }
      tile.entity = entity;
      try {
        entity.SetInteractionState?.(2); // Physical: visible + collidable.
        entity.SetVisibility?.(true);
      } catch (_e) { /* best-effort */ }
    };

    // Tile placement: lay chunks out as a flat XZ grid keyed by (cx, cy)
    // RELATIVE to the layer's origin chunk. The origin is the URL-supplied
    // base chunk (or the first chunk loaded if not configured) — this puts
    // the player's nominal landing spot at world (0, *, 0) instead of way
    // off in absolute (cx*length, _, cy*width) space.
    // Position.y = -SEA_LEVEL_OFFSET_METERS so the heightmap [0..envelope]
    // renders at world Y in [-SEA_LEVEL_OFFSET, envelope - SEA_LEVEL_OFFSET].
    // V1 simplification — proper cube-sphere tile placement (with rotations
    // onto the actual sphere surface) is a future increment.
    if (this.originCx === null || this.originCy === null) {
      this.originCx = chunk.cx;
      this.originCy = chunk.cy;
    }
    const worldX = (chunk.cx - this.originCx) * chunk.length;
    const worldZ = (chunk.cy - this.originCy) * chunk.width;

    try {
      w.TerrainEntity.CreateHeightmap(
        null,
        chunk.length,
        chunk.width,
        envelope,
        chunk.heights,
        [stubLayer],
        {},
        new w.Vector3(worldX, -SEA_LEVEL_OFFSET_METERS, worldZ),
        w.Quaternion.identity,
        entityId,
        `planet-tile-${id}`,
        cbName,
        false,
      );
    } catch (e) {
      // Roll back: drop slot, free callback, surface error to caller.
      delete g[cbName];
      this.tiles.delete(id);
      throw e;
    }
  }

  unload(key: ChunkKey): void {
    const id = chunkKeyString(key);
    const tile = this.tiles.get(id);
    if (!tile) return;
    this.tiles.delete(id);
    if (tile.entity?.Delete) {
      try { tile.entity.Delete(); } catch (_e) { /* best-effort */ }
    }
  }

  size(): number {
    return this.tiles.size;
  }

  dispose(): void {
    for (const tile of this.tiles.values()) {
      if (tile.entity?.Delete) {
        try { tile.entity.Delete(); } catch (_e) { /* best-effort */ }
      }
    }
    this.tiles.clear();
  }
}
