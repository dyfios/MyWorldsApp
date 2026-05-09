// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * TerrainEntityLayer (planet-v2) — close-range Unity Terrain renderer.
 *
 * Per the architecture, only the chunk the player is *standing on* uses
 * TerrainEntity. Neighbors at mid-range go through TileMeshLayer. v2 first
 * pass: layer renders ANY chunk it accepts; promote/demote logic across
 * boundaries is the GlobeRenderer's responsibility (and is not yet wired
 * for v2's first pass — single-chunk only).
 *
 * Calls `TerrainEntity.CreateHeightmap` directly with verified C# field
 * names + Color constructor + position+rotation. Heights are shifted by a
 * fixed `SEA_LEVEL_OFFSET_METERS` so adjacent chunks share a baseline (no
 * per-chunk vertical fitting → no boundary cliffs from rendering choice).
 */

import {
  callbackPrefix,
  registerCallback,
  unregisterCallbacks,
  logError,
  logInfo,
} from './jint-runtime.js';
import { webverse } from './webverse-types.js';
import type {
  TerrainEntityInstance,
  TerrainEntityLayerStub,
} from './webverse-types.js';
import {
  chunkKeyString,
  type ChunkData,
  type ChunkKey,
  type ILayer,
  type PlanetSceneConfig,
} from './types.js';
import { shouldUseTerrainEntity } from './CubeCornerPolicy.js';

/**
 * Planet-wide sea-level offset. Heights from V1's noise stack range roughly
 * [-300, +700] meters; shifting by +300 keeps everything ≥0 (Unity's
 * TerrainData.SetHeights clamps negatives to 0). Using a fixed offset on
 * every chunk means adjacent chunks share their baseline → no Y seams.
 *
 * Per-planet config eventually; V1 single value.
 */
const SEA_LEVEL_OFFSET_METERS = 300;

interface LoadedTile {
  key: ChunkKey;
  /** Entity returned to the onLoaded callback; null until callback fires. */
  entity: TerrainEntityInstance | null;
  /** Callback name registered for this tile's onLoaded. */
  onLoadedCallbackName: string;
}

export class TerrainEntityLayer implements ILayer {
  private readonly isWebGL: boolean;
  private readonly tiles = new Map<string, LoadedTile>();
  private readonly cbPrefix: string;
  /**
   * Lazy-pinned origin chunk. If `cfg.originChunk` is set we pin from it;
   * otherwise we pin from the first chunk loaded. All other chunks render
   * relative to this origin so the player's nominal landing spot is at
   * world (0, *, 0).
   */
  private originCx: number | null = null;
  private originCy: number | null = null;

  constructor(cfg: PlanetSceneConfig, isWebGL: boolean) {
    this.isWebGL = isWebGL;
    this.cbPrefix = callbackPrefix(`terrain_${cfg.planetId}`);
    if (cfg.originChunk) {
      this.originCx = cfg.originChunk.cx;
      this.originCy = cfg.originChunk.cy;
    }
  }

  canHandle(key: ChunkKey): boolean {
    return shouldUseTerrainEntity(key, this.isWebGL);
  }

  load(key: ChunkKey, chunk: ChunkData): boolean {
    if (!this.canHandle(key)) return false;
    const id = chunkKeyString(key);
    if (this.tiles.has(id)) return true; // idempotent

    const w = webverse();
    if (!w.TerrainEntity || !w.Color || !w.Vector3 || !w.Quaternion || !w.UUID) {
      // Runtime missing (test env). Slot is NOT tracked — caller's streamer
      // will retry, but in tests there's no retry loop, just no render.
      return false;
    }

    // Shift heights in-place by SEA_LEVEL_OFFSET so all values are ≥0.
    // Mutates the matrix; caller does not retain it.
    for (let r = 0; r < chunk.heights.length; r++) {
      const row = chunk.heights[r]!;
      for (let i = 0; i < row.length; i++) {
        row[i]! += SEA_LEVEL_OFFSET_METERS;
      }
    }
    const envelope = chunk.height;

    const stubLayer: TerrainEntityLayerStub = {
      diffuseTexture: '',
      normalTexture: '',
      maskTexture: '',
      // Color MUST be a real instance — Jint won't auto-construct from {r,g,b,a}.
      specular: new w.Color(0.5, 0.5, 0.5, 1) as TerrainEntityLayerStub['specular'],
      metallic: 0,
      smoothness: 0,
      sizeFactor: 1,
    };

    if (this.originCx === null || this.originCy === null) {
      this.originCx = chunk.cx;
      this.originCy = chunk.cy;
    }
    const worldX = (chunk.cx - this.originCx) * chunk.length;
    const worldZ = (chunk.cy - this.originCy) * chunk.width;

    const entityId = w.UUID.NewUUID().ToString();
    const cbSuffix = `loaded_${id.replace(/:/g, '_')}_${entityId.replace(/-/g, '')}`;
    const tile: LoadedTile = {
      key,
      entity: null,
      onLoadedCallbackName: `${this.cbPrefix}${cbSuffix}`,
    };

    registerCallback(this.cbPrefix, cbSuffix, ((entity: TerrainEntityInstance | null): void => {
      // One-shot: remove the global ASAP.
      unregisterCallbacks(this.cbPrefix, [cbSuffix]);
      // The slot may have been unloaded between request and callback.
      if (!this.tiles.has(id)) {
        try {
          entity?.Delete?.();
        } catch (_e) {
          /* best-effort */
        }
        return;
      }
      if (!entity) return;
      tile.entity = entity;
      try {
        // Physical (=2): renderer enabled AND collider enabled. Static (=1)
        // disables the collider, so the player would fall through.
        entity.SetInteractionState?.(2);
        entity.SetVisibility?.(true);
        logInfo(`planet-v2 terrain ${id}: ready (visible + collidable)`);
      } catch (e) {
        logError(
          `planet-v2 terrain ${id}: enable failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }) as (...a: never[]) => void);

    this.tiles.set(id, tile);

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
        `planet-v2-tile-${id}`,
        tile.onLoadedCallbackName,
        false,
      );
      logInfo(
        `planet-v2 terrain ${id}: CreateHeightmap dispatched ` +
          `length=${chunk.length} envelope=${envelope} pos=(${worldX}, ${-SEA_LEVEL_OFFSET_METERS}, ${worldZ})`,
      );
      return true;
    } catch (e) {
      // Roll back: remove slot + free the global so we don't leak.
      unregisterCallbacks(this.cbPrefix, [cbSuffix]);
      this.tiles.delete(id);
      logError(
        `planet-v2 terrain ${id}: CreateHeightmap threw: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }

  unload(key: ChunkKey): void {
    const id = chunkKeyString(key);
    const tile = this.tiles.get(id);
    if (!tile) return;
    this.tiles.delete(id);
    // Clean up the pending onLoaded callback in case it hasn't fired yet.
    const suffix = tile.onLoadedCallbackName.slice(this.cbPrefix.length);
    unregisterCallbacks(this.cbPrefix, [suffix]);
    try {
      tile.entity?.Delete?.();
    } catch (_e) {
      /* best-effort */
    }
  }

  dispose(): void {
    for (const tile of this.tiles.values()) {
      const suffix = tile.onLoadedCallbackName.slice(this.cbPrefix.length);
      unregisterCallbacks(this.cbPrefix, [suffix]);
      try {
        tile.entity?.Delete?.();
      } catch (_e) {
        /* best-effort */
      }
    }
    this.tiles.clear();
  }

  /** Test/debug helper. */
  size(): number {
    return this.tiles.size;
  }
}
