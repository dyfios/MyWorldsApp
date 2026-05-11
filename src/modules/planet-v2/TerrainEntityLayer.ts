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
import type { TerrainEntityInstance } from './webverse-types.js';
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

/**
 * Note: compensation for the WebVerse SetHeights ×1.5 resample bug
 * (StraightFour/Entity/Terrain/Scripts/TerrainEntity.cs:333) is now
 * applied SERVER-SIDE in chunkHandler when it builds the heights_json
 * field. Client-side mutation of the heights matrix has been removed
 * because the matrix is no longer materialized in JS — heights ship as
 * a raw JSON string and feed straight into TerrainEntity.Create's
 * background-thread parser. See `reference_webverse_setheights_15x_bug`
 * memo for the bug detail and `chunkHandler.ts` for the server-side
 * compensation transform.
 */

interface LoadedTile {
  key: ChunkKey;
  /** Entity returned to the onLoaded callback; null until callback fires. */
  entity: TerrainEntityInstance | null;
  /** Callback name registered for this tile's onLoaded. */
  onLoadedCallbackName: string;
  /**
   * Story 6.6 (option 2): when true, this tile was pre-loaded for an
   * approach-zone neighbor and should remain hidden + non-collidable
   * until `setActive` is called. The onLoaded callback respects this:
   *   - inactive → SetVisibility(false), SetInteractionState(1) (Static)
   *   - active   → SetVisibility(true), SetInteractionState(2) (Physical)
   * Active flag flipped by `setActive(key)`; if the entity is already
   * loaded the flip is applied immediately, otherwise queued for the
   * onLoaded callback.
   */
  active: boolean;
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

  load(key: ChunkKey, chunk: ChunkData, options: { startActive?: boolean } = {}): boolean {
    if (!this.canHandle(key)) return false;
    const id = chunkKeyString(key);
    const startActive = options.startActive !== false; // default: active
    if (this.tiles.has(id)) return true; // idempotent

    const w = webverse();
    if (!w.TerrainEntity || !w.UUID) {
      // Runtime missing (test env). Slot is NOT tracked — caller's streamer
      // will retry, but in tests there's no retry loop, just no render.
      return false;
    }

    if (!chunk.heights_json) {
      // Server didn't provide pre-formatted heights JSON. v2 requires
      // it for the async TerrainEntity.Create path; without it we can't
      // render this chunk through the freeze-free codepath. Caller's
      // chunkSource should be returning heights_json from chunkHandler.
      logError(
        `planet-v2 terrain ${chunkKeyString(key)}: chunk has no heights_json; cannot render via TerrainEntity.Create`,
      );
      return false;
    }

    if (this.originCx === null || this.originCy === null) {
      this.originCx = chunk.cx;
      this.originCy = chunk.cy;
    }
    const worldX = (chunk.cx - this.originCx) * chunk.length;
    const worldZ = (chunk.cy - this.originCy) * chunk.width;
    const envelope = chunk.height;
    const entityId = w.UUID.NewUUID().ToString();
    const cbSuffix = `loaded_${id.replace(/:/g, '_')}_${entityId.replace(/-/g, '')}`;
    const tile: LoadedTile = {
      key,
      entity: null,
      onLoadedCallbackName: `${this.cbPrefix}${cbSuffix}`,
      active: startActive,
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
      const dx = this.originCx !== null ? key.cx - this.originCx : 0;
      const dz = this.originCy !== null ? key.cy - this.originCy : 0;
      const dirTag = formatTerrainDir(dx, dz);
      try {
        if (tile.active) {
          // Physical (=2): renderer enabled AND collider enabled.
          entity.SetInteractionState?.(2);
          entity.SetVisibility?.(true);
          logInfo(`planet-v2 terrain ${id} [dir=${dirTag}]: ready (visible + collidable)`);
        } else {
          // Pre-loaded for approach: stay hidden + non-collidable until
          // the orchestrator's setActive flips us. Static (=1) disables
          // the collider; SetVisibility(false) hides the heightmap so
          // the player chunk's active TerrainEntity is the only visible
          // one until the swap.
          entity.SetInteractionState?.(1);
          entity.SetVisibility?.(false);
          logInfo(`planet-v2 terrain ${id} [dir=${dirTag}]: pre-loaded (hidden, non-collidable)`);
        }
      } catch (e) {
        logError(
          `planet-v2 terrain ${id} [dir=${dirTag}]: enable failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }) as (...a: never[]) => void);

    this.tiles.set(id, tile);

    try {
      // JSON-async path: build the canonical JSONTerrainEntity shape
      // (verified against JSONEntityHandler.cs:221) and hand the string
      // to TerrainEntity.Create. The handler parses + normalizes on a
      // background thread, so the heaviest cost (deserializing the
      // 1025² heights) doesn't freeze the JS render loop. We embed the
      // server-supplied `heights_json` directly via string concat — no
      // JS-side parse or stringify of the heights matrix.
      //
      // Compensation for the WebVerse SetHeights bug ((raw+300)/1.5)
      // is applied by the SERVER when it builds heights_json — see
      // wos-plugin-planet/src/handlers/chunkHandler.ts. Constants here
      // remain only for the position/envelope math.
      const jsonBody = buildTerrainEntityJSON({
        id: entityId,
        tag: `planet-v2-tile-${id}`,
        position: { x: worldX, y: -SEA_LEVEL_OFFSET_METERS, z: worldZ },
        length: chunk.length,
        width: chunk.width,
        height: envelope,
        heightsJson: chunk.heights_json,
      });
      w.TerrainEntity.Create(jsonBody, null, tile.onLoadedCallbackName);
      const dxFromOrigin = this.originCx !== null ? key.cx - this.originCx : 0;
      const dzFromOrigin = this.originCy !== null ? key.cy - this.originCy : 0;
      logInfo(
        `planet-v2 terrain ${id} [dir=${formatTerrainDir(dxFromOrigin, dzFromOrigin)}]: ` +
          `TerrainEntity.Create (json-async) dispatched ` +
          `length=${chunk.length} envelope=${envelope} ` +
          `pos=(${worldX}, ${-SEA_LEVEL_OFFSET_METERS}, ${worldZ})`,
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

  /** True iff a tile exists for this key (loaded or still creating). */
  hasTile(key: ChunkKey): boolean {
    return this.tiles.has(chunkKeyString(key));
  }

  /** Diagnostic dump: every tile's key + active/hidden + entity-ready.
   *  Returns an array (JINT doesn't support generators). */
  snapshot(): Array<{ key: ChunkKey; active: boolean; ready: boolean }> {
    const out: Array<{ key: ChunkKey; active: boolean; ready: boolean }> = [];
    for (const tile of this.tiles.values()) {
      out.push({ key: tile.key, active: tile.active, ready: tile.entity !== null });
    }
    return out;
  }

  /**
   * Story 6.6 (option 2): flip a pre-loaded hidden tile to visible +
   * collidable. If the tile's onLoaded hasn't fired yet, queue the
   * activation by setting the `active` flag — the callback will read
   * it. Idempotent — calling on an already-active tile is a no-op.
   */
  setActive(key: ChunkKey): void {
    const tile = this.tiles.get(chunkKeyString(key));
    if (!tile || tile.active) return;
    tile.active = true;
    if (tile.entity) {
      try {
        tile.entity.SetInteractionState?.(2);
        tile.entity.SetVisibility?.(true);
        logInfo(`planet-v2 terrain ${chunkKeyString(key)}: activated (was hidden)`);
      } catch (_e) {
        /* best-effort */
      }
    }
    // If !tile.entity, the onLoaded callback will read tile.active and
    // do the right thing when the entity arrives.
  }
}

/* ──────────────────── helpers ────────────────────────────────────────── */

/** Compact "+1,-2"-style direction tag relative to the layer's origin
 *  chunk. Same encoding as TileMeshLayer's formatDir — keeping the two
 *  log streams visually congruent makes cross-layer correlation easier. */
function formatTerrainDir(dx: number, dz: number): string {
  const fx = dx === 0 ? '0' : dx > 0 ? `+${dx}` : `${dx}`;
  const fz = dz === 0 ? '0' : dz > 0 ? `+${dz}` : `${dz}`;
  return `${fx},${fz}`;
}

/* ──────────────────── JSON builder ───────────────────────────────────── */

interface TerrainEntityJSONInput {
  id: string;
  tag: string;
  position: { x: number; y: number; z: number };
  length: number;
  width: number;
  height: number;
  /** Pre-formatted JSON string for the heights matrix — embedded
   *  directly without re-parsing. Server is responsible for any
   *  bug-compensation transform on the values. */
  heightsJson: string;
}

/**
 * Build the JSON envelope `TerrainEntity.Create` expects. Layers carry
 * a single neutral grey stub (a layer is REQUIRED — empty array makes
 * the C# side log "must be initialized with at least one layer" and the
 * heightmap never applies). Specular is a literal in the JSON; the
 * JSONEntityHandler constructs the C# UnityEngine.Color on the main
 * thread once normalization completes.
 *
 * String concatenation is intentional — embedding `heightsJson` as a
 * raw JSON segment means the JS thread never parses or stringifies the
 * 1M-element heights matrix. That deserialization happens on the C#
 * background thread inside JSONEntityHandler.
 */
function buildTerrainEntityJSON(i: TerrainEntityJSONInput): string {
  return (
    '{' +
      `"id":${JSON.stringify(i.id)},` +
      `"tag":${JSON.stringify(i.tag)},` +
      `"position":{"x":${i.position.x},"y":${i.position.y},"z":${i.position.z}},` +
      `"rotation":{"x":0,"y":0,"z":0,"w":1},` +
      '"terrainType":"heightmap",' +
      `"length":${i.length},` +
      `"width":${i.width},` +
      `"height":${i.height},` +
      `"heights":${i.heightsJson},` +
      '"layers":[{' +
        '"diffuseTexture":"",' +
        '"normalTexture":"",' +
        '"maskTexture":"",' +
        '"specular":{"r":0.5,"g":0.5,"b":0.5,"a":1},' +
        '"metallic":0,' +
        '"smoothness":0,' +
        '"sizeFactor":1' +
      '}],' +
      '"layerMasks":[],' +
      '"stitchTerrains":false' +
    '}'
  );
}
