// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * TileMeshLayer (planet-v2) — mid-range chunk renderer.
 *
 * Story 6.5. Renders chunks as `MeshEntity` instances loaded from
 * server-baked glTF 2.0 + Draco buffers (Stories 5.6 + 5.7). Used for
 * neighbors of the player chunk and for cube-corner tiles where
 * TerrainEntity isn't viable. Visual-only — no collider; the player
 * walks on the close-range TerrainEntity, not on these.
 *
 * Layer slot lifecycle mirrors `TerrainEntityLayer`'s lazy-pinned origin
 * pattern so the two layers' chunks align at shared boundaries.
 *
 * Async chunk-mesh fetch is callback-driven (no Promise across the IO
 * boundary — JINT microtask scheduler caveats). The layer kicks off the
 * fetch on `load`, stores a placeholder slot, and on the success callback
 * calls `MeshEntity.Create` with the data: URL the server returned.
 */

import {
  callbackPrefix,
  registerCallback,
  unregisterCallbacks,
  logError,
  logInfo,
  logWarn,
} from './jint-runtime.js';
import { webverse } from './webverse-types.js';
import type { MeshEntityInstance } from './webverse-types.js';
import {
  chunkKeyString,
  type ChunkData,
  type ChunkKey,
  type ChunkMeshData,
  type IChunkSource,
  type ILayer,
  type MeshQuality,
  type PlanetSceneConfig,
} from './types.js';

/**
 * Vertical placement note (planet-v2 boundary alignment, fixed 2026-05-09):
 *
 * MeshEntity tiles and TerrainEntity tiles share the same final world Y for
 * a given (face, lod, cx, cy, u, v) sample, but reach it differently:
 *
 *   TerrainEntity:  heights += 300  (Unity Terrain clamps Y < 0 to 0),
 *                   placed at world Y = -300. Net vertex Y = raw_height.
 *
 *   MeshEntity:     glb bakes raw heights as Y (no clamping needed for a
 *                   mesh), placed at world Y = 0. Net vertex Y = raw_height.
 *
 * So the tile is anchored at Y=0 and we DO NOT subtract a sea-level offset
 * here. Earlier code did, which floated the player chunk's TerrainEntity
 * 300m above the mesh tiles at the boundary.
 */

interface LoadedTile {
  key: ChunkKey;
  /** Set after MeshEntity.Create's onLoaded callback fires. */
  entity: MeshEntityInstance | null;
  /** Suffix for the per-tile global onLoaded callback name. */
  onLoadedSuffix: string | null;
  /**
   * Lifecycle stage:
   *   - 'fetching'      — chunkSource request in flight
   *   - 'creating'      — fetch returned, MeshEntity.Create dispatched, awaiting onLoaded
   *   - 'ready'         — entity received, visible+static
   *   - 'unloaded'      — disposed (slot stays in map briefly until callback fires)
   */
  stage: 'fetching' | 'creating' | 'ready' | 'unloaded';
}

export interface TileMeshLayerDeps {
  /** Source of baked chunk meshes. Layer requests via `requestChunkMesh`. */
  chunkSource: IChunkSource;
  /** Quality hint passed to the server. Defaults to 'mid-range'. */
  quality?: MeshQuality;
}

export class TileMeshLayer implements ILayer {
  private readonly tiles = new Map<string, LoadedTile>();
  private readonly cbPrefix: string;
  private readonly deps: TileMeshLayerDeps;
  private originCx: number | null = null;
  private originCy: number | null = null;

  constructor(cfg: PlanetSceneConfig, deps: TileMeshLayerDeps) {
    this.deps = deps;
    this.cbPrefix = callbackPrefix(`tilemesh_${cfg.planetId}`);
    if (cfg.originChunk) {
      this.originCx = cfg.originChunk.cx;
      this.originCy = cfg.originChunk.cy;
    }
  }

  /**
   * TileMesh accepts any chunk — including cube-corners (Story 6.7) where
   * TerrainEntity can't render. Per the architecture, the layer is also the
   * fallback for WebGL since TerrainEntity is unavailable there. The
   * dispatcher decides which layer takes a key based on phase and player
   * position; this method just declares "yes, I can render this."
   */
  canHandle(_key: ChunkKey): boolean {
    return true;
  }

  load(key: ChunkKey, chunk: ChunkData): boolean {
    const id = chunkKeyString(key);
    if (this.tiles.has(id)) return true; // idempotent

    if (!this.deps.chunkSource.isConnected()) {
      // Streamer retries next tick once the source is ready.
      return false;
    }

    const w = webverse();
    if (!w.MeshEntity || !w.Vector3 || !w.Quaternion || !w.UUID) {
      // Runtime missing (test env). Slot is NOT tracked — caller handles.
      return false;
    }

    if (this.originCx === null || this.originCy === null) {
      this.originCx = chunk.cx;
      this.originCy = chunk.cy;
    }
    const worldX = (chunk.cx - this.originCx) * chunk.length;
    const worldZ = (chunk.cy - this.originCy) * chunk.width;

    const tile: LoadedTile = {
      key,
      entity: null,
      onLoadedSuffix: null,
      stage: 'fetching',
    };
    this.tiles.set(id, tile);

    // Fire the chunk-mesh fetch. On success → MeshEntity.Create.
    this.deps.chunkSource.requestChunkMesh(
      key.face,
      key.lod,
      key.cx,
      key.cy,
      {
        onSuccess: (mesh) => this.onMeshReceived(id, tile, mesh, worldX, worldZ),
        onError: (err) => this.onFetchError(id, err),
      },
      this.deps.quality,
    );

    return true;
  }

  unload(key: ChunkKey): void {
    const id = chunkKeyString(key);
    const tile = this.tiles.get(id);
    if (!tile) return;
    this.tiles.delete(id);
    tile.stage = 'unloaded';
    if (tile.onLoadedSuffix !== null) {
      unregisterCallbacks(this.cbPrefix, [tile.onLoadedSuffix]);
    }
    try {
      tile.entity?.Delete?.();
    } catch (_e) {
      /* best-effort */
    }
  }

  dispose(): void {
    for (const tile of this.tiles.values()) {
      tile.stage = 'unloaded';
      if (tile.onLoadedSuffix !== null) {
        unregisterCallbacks(this.cbPrefix, [tile.onLoadedSuffix]);
      }
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

  /* ──────────────────── Internal callbacks ───────────────────────────── */

  private onMeshReceived(
    id: string,
    tile: LoadedTile,
    mesh: ChunkMeshData,
    worldX: number,
    worldZ: number,
  ): void {
    // The slot may have been unloaded between request and response.
    if (tile.stage === 'unloaded' || !this.tiles.has(id)) return;

    const w = webverse();
    if (!w.MeshEntity || !w.Vector3 || !w.Quaternion || !w.UUID) {
      // Runtime missing — drop the slot.
      this.tiles.delete(id);
      return;
    }

    const entityId = w.UUID.NewUUID().ToString();
    const cbSuffix = `loaded_${id.replace(/:/g, '_')}_${entityId.replace(/-/g, '')}`;
    tile.onLoadedSuffix = cbSuffix;
    tile.stage = 'creating';

    registerCallback(this.cbPrefix, cbSuffix, ((entity: MeshEntityInstance | null): void => {
      // One-shot: drop the global ASAP.
      unregisterCallbacks(this.cbPrefix, [cbSuffix]);
      tile.onLoadedSuffix = null;

      if (tile.stage === 'unloaded' || !this.tiles.has(id)) {
        // Entity arrived after the slot was unloaded; clean up immediately.
        try {
          entity?.Delete?.();
        } catch (_e) { /* best-effort */ }
        return;
      }
      if (!entity) {
        logWarn(`planet-v2 mesh ${id}: onLoaded received null entity`);
        this.tiles.delete(id);
        return;
      }
      tile.entity = entity;
      tile.stage = 'ready';
      try {
        // Static (=1): visible + collider DISABLED. Mid-range tile meshes
        // are visual-only; the player walks on the close-range
        // TerrainEntity (which uses Physical=2). Keeping mid-range as
        // Static avoids accidental collisions when the promote/demote
        // boundary fires.
        entity.SetInteractionState?.(1);
        entity.SetVisibility?.(true);
        logInfo(`planet-v2 mesh ${id}: ready (visible, static)`);
      } catch (e) {
        logError(
          `planet-v2 mesh ${id}: enable failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }) as (...a: never[]) => void);

    try {
      w.MeshEntity.Create(
        null,                            // parent
        mesh.mesh_url,                   // glTF HTTP URL
        [],                              // meshResources — embedded
        new w.Vector3(worldX, 0, worldZ),
        w.Quaternion.identity,
        entityId,
        `${this.cbPrefix}${cbSuffix}`,   // bare global function name
        // checkForUpdateIfCached=true. Reason: WebVerse's gltfHandler
        // caches loaded prefabs by URL across MyWorldsApp page refreshes
        // (the C# process persists). After wos restarts produce a new
        // bake (e.g., during dev iteration), `false` would keep showing
        // the previous bake. `true` makes WebVerse re-fetch and rebuild
        // the prefab from the fresh URL bytes.
        true,                            // checkForUpdateIfCached
      );
      logInfo(
        `planet-v2 mesh ${id}: MeshEntity.Create dispatched ` +
          `bytes=${mesh.byte_size} resolution=${mesh.target_resolution} ` +
          `pos=(${worldX}, 0, ${worldZ})`,
      );
    } catch (e) {
      // Roll back: drop slot + free the global so we don't leak.
      unregisterCallbacks(this.cbPrefix, [cbSuffix]);
      this.tiles.delete(id);
      logError(
        `planet-v2 mesh ${id}: MeshEntity.Create threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private onFetchError(id: string, err: Error): void {
    // Drop the placeholder so the streamer retries on the next tick.
    this.tiles.delete(id);
    logError(`planet-v2 mesh ${id}: fetch failed: ${err.message}`);
  }
}
