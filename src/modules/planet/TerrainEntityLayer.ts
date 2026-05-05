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

  constructor(cfg: PlanetSceneConfig, isWebGL: boolean) {
    this.cfg = cfg;
    this.isWebGL = isWebGL;
  }

  /** Returns false when this tile must fall back to TileMesh (corners / WebGL). */
  canHandle(key: ChunkKey): boolean {
    return shouldUseTerrainEntity(key, this.isWebGL);
  }

  async load(key: ChunkKey, chunk: ChunkData): Promise<void> {
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

    // Shift heights so chunk minimum sits at 0 (Unity clamps negatives), and
    // place the terrain at world Y = original min so absolute elevation is
    // preserved. Mutates `chunk.heights` in place — caller (GlobeRenderer's
    // chunkSource fetch) does not retain the matrix beyond this call.
    let hMin = Infinity;
    let hMax = -Infinity;
    for (let r = 0; r < chunk.heights.length; r++) {
      const row = chunk.heights[r]!;
      for (let i = 0; i < row.length; i++) {
        const v = row[i]!;
        if (v < hMin) hMin = v;
        if (v > hMax) hMax = v;
      }
    }
    const yOffset = hMin < 0 ? hMin : 0;
    if (yOffset < 0) {
      const shift = -yOffset;
      for (let r = 0; r < chunk.heights.length; r++) {
        const row = chunk.heights[r]!;
        for (let i = 0; i < row.length; i++) {
          row[i]! += shift;
        }
      }
    }
    // Tight envelope so Unity uses full [0..1] heightmap precision for the
    // relief that's actually present (instead of squeezing 50m into 1/1500).
    const tightHeight = Math.max(1, hMax - yOffset + 1);

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

    try {
      w.TerrainEntity.CreateHeightmap(
        null,
        chunk.length,
        chunk.width,
        tightHeight,
        chunk.heights,
        [stubLayer],
        {},
        new w.Vector3(0, yOffset, 0),
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
