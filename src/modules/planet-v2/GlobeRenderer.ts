// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * GlobeRenderer (planet-v2) — orchestrator.
 *
 * Owns the planet scene's lifecycle for one player session:
 *   - Constructs the 3 layers (Impostor / TileMesh / TerrainEntity) and a
 *     ChunkStreamer driven by a per-frame tick.
 *   - Routes each candidate to the appropriate layer based on the V1
 *     simplification "player chunk → TerrainEntity, all others → TileMesh,
 *     far → Impostor". v2 first pass renders single chunk only; multi-chunk
 *     promote/demote (Story 6.6) lights up once TileMeshLayer is real
 *     (Stories 5.6 + 5.7 + 6.5 — currently stubbed visibly).
 *   - Provides a sync `tick(camera)` entrypoint that the world-type's
 *     interval driver calls.
 *
 * No async/await on the hot path. Initialize is sync. Tick is sync. Layer
 * loads are sync (callback-driven for actual async work).
 */

import {
  ChunkStreamer,
  type ILayerDispatcher,
  type ILayerEndpoint,
} from './ChunkStreamer.js';
import { ImpostorSphere } from './ImpostorSphere.js';
import { TileMeshLayer } from './TileMeshLayer.js';
import { TerrainEntityLayer } from './TerrainEntityLayer.js';
import {
  DEFAULT_BUDGET,
  WEBGL_BUDGET,
  RenderPhase,
  phaseForAltitude,
  type CameraState,
  type ChunkData,
  type ChunkKey,
  type IChunkSource,
  type PlanetSceneConfig,
} from './types.js';
import { logError, logInfo, logWarn } from './jint-runtime.js';

export interface GlobeRendererDeps {
  isWebGL?: boolean;
  /** Player avatar entity for floating-origin (Story 6.2). Optional. */
  playerAvatarEntity?: unknown;
  /** Chunk-fetch backend. Without it the renderer runs in scaffold mode. */
  chunkSource?: IChunkSource;
  /** Override candidate list (tests + V1 single-chunk). */
  candidateProvider?: (camera: CameraState) => ChunkKey[];
  /**
   * Override which key is treated as "the chunk the player is standing on"
   * (forces TerrainEntity for that one). v2 first pass treats every
   * candidate as the player chunk if there's only one — multi-chunk +
   * dynamic detection comes with Story 6.6.
   */
  playerChunkProvider?: (camera: CameraState) => ChunkKey | null;
}

export class GlobeRenderer {
  private cfg: PlanetSceneConfig | null = null;
  private deps: GlobeRendererDeps = {};
  private streamer: ChunkStreamer | null = null;
  private impostor: ImpostorSphere | null = null;
  private tileMesh: TileMeshLayer | null = null;
  private terrainEntity: TerrainEntityLayer | null = null;
  /** Cache of fetched chunk data so the layer dispatcher's load() is sync. */
  private readonly chunkCache = new Map<string, ChunkData>();
  /** Keys for which a chunk fetch is in flight (prevents dup requests). */
  private readonly inflight = new Set<string>();
  private disposed = false;

  /** Synchronous initialize. */
  initialize(cfg: PlanetSceneConfig, deps: GlobeRendererDeps = {}): void {
    if (this.streamer) {
      throw new Error('GlobeRenderer.initialize: already initialized');
    }
    this.cfg = cfg;
    this.deps = deps;
    const isWebGL = deps.isWebGL ?? detectWebGL();
    const budget = isWebGL ? WEBGL_BUDGET : DEFAULT_BUDGET;

    this.terrainEntity = new TerrainEntityLayer(cfg, isWebGL);
    this.tileMesh = new TileMeshLayer(cfg);
    this.impostor = new ImpostorSphere(cfg);
    // ImpostorSphere.initialize() is currently a throwing stub — only call
    // it once Story 6.4 is live. v2 first pass leaves the impostor inactive.

    const dispatcher: ILayerDispatcher = {
      layerFor: (key, camera) => this.layerFor(key, camera),
    };
    this.streamer = new ChunkStreamer(dispatcher, budget);

    // Bootstrap floating-origin (Story 6.2). v2 deliberately takes the same
    // approach as v1: hand the avatar to WebVerse's auto-reorigin and let
    // the runtime's `worldOffsetUpdateThreshold` do the work.
    this.bootstrapFloatingOrigin();

    logInfo(
      `planet-v2 GlobeRenderer initialized planetId=${cfg.planetId} radius=${cfg.radiusMeters}m nExp=${cfg.nExponent} isWebGL=${isWebGL}`,
    );
  }

  /** Single tick. Sync. Called by the world-type's interval driver. */
  tick(camera: CameraState): void {
    if (!this.streamer || !this.cfg) return;
    const candidates = this.deps.candidateProvider
      ? this.deps.candidateProvider(camera)
      : [];
    this.streamer.update(camera, candidates);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.streamer?.disposeAll();
    this.streamer = null;
    this.impostor?.dispose();
    this.impostor = null;
    this.tileMesh?.dispose();
    this.tileMesh = null;
    this.terrainEntity?.dispose();
    this.terrainEntity = null;
    this.chunkCache.clear();
    this.inflight.clear();
    logInfo('planet-v2 GlobeRenderer disposed');
  }

  /* ──────────────────── Layer dispatch ───────────────────────────────── */

  private layerFor(key: ChunkKey, camera: CameraState): ILayerEndpoint | null {
    if (!this.terrainEntity || !this.tileMesh || !this.impostor) return null;
    const phase = phaseForAltitude(camera.altitudeMeters);
    const playerKey = this.deps.playerChunkProvider?.(camera) ?? null;
    const isPlayerChunk =
      !!playerKey &&
      playerKey.face === key.face &&
      playerKey.lod === key.lod &&
      playerKey.cx === key.cx &&
      playerKey.cy === key.cy;

    // v2 single-chunk first pass: only the player chunk uses TerrainEntity.
    // Mid-range candidates SHOULD use TileMesh — but that's stubbed and
    // throws. Until Stories 5.6/5.7/6.5 are real, candidates that aren't
    // the player chunk return null (no slot tracked, no render).
    if (phase === RenderPhase.TerrainEntity && isPlayerChunk) {
      return this.adaptTerrainEntity(this.terrainEntity);
    }
    if (phase === RenderPhase.TileMesh || (phase === RenderPhase.TerrainEntity && !isPlayerChunk)) {
      // Stub layer — return null instead of an endpoint that throws on load,
      // so the streamer simply doesn't track the slot. Logged once at debug.
      // Once TileMeshLayer is real, swap this to `this.adaptTileMesh(...)`.
      return null;
    }
    if (phase === RenderPhase.Impostor) {
      return null; // ImpostorSphere stubbed; same reasoning.
    }
    return null;
  }

  /**
   * Adapt the TerrainEntityLayer to the streamer's `ILayerEndpoint` contract.
   * The streamer wants `load(key, camera): boolean` but the layer needs
   * actual chunk data. We resolve that by checking the chunk cache:
   *   - cache hit → call layer.load with the data, return result
   *   - cache miss + not in flight → kick off a chunk fetch, return false
   *     (streamer retries next tick once data arrives)
   *   - cache miss + in flight → return false (streamer retries)
   */
  private adaptTerrainEntity(layer: TerrainEntityLayer): ILayerEndpoint {
    return {
      id: 'terrain-entity',
      load: (key, _camera): boolean => {
        const id = chunkKeyId(key);
        const cached = this.chunkCache.get(id);
        if (cached) {
          // One-shot: drop from cache so a future re-load fetches fresh.
          this.chunkCache.delete(id);
          return layer.load(key, cached);
        }
        // Cache miss — kick off fetch (idempotent on inflight set).
        this.kickChunkFetch(key);
        return false;
      },
      unload: (key) => layer.unload(key),
    };
  }

  private kickChunkFetch(key: ChunkKey): void {
    const id = chunkKeyId(key);
    if (this.inflight.has(id)) return;
    const source = this.deps.chunkSource;
    if (!source) return;
    if (!source.isConnected()) return;
    this.inflight.add(id);
    source.requestChunk(key.face, key.lod, key.cx, key.cy, {
      onSuccess: (chunk) => {
        this.inflight.delete(id);
        if (this.disposed) return;
        this.chunkCache.set(id, chunk);
        // Caller's next `tick()` will pick up the cached data. No need to
        // poke the streamer — the candidate provider re-supplies the same
        // key on every tick.
      },
      onError: (err) => {
        this.inflight.delete(id);
        logWarn(`planet-v2 chunk fetch failed for ${id}: ${err.message}`);
      },
    });
  }

  /* ──────────────────── Floating origin bootstrap ────────────────────── */

  private bootstrapFloatingOrigin(): void {
    const avatar = this.deps.playerAvatarEntity;
    if (!avatar) return;
    try {
      const env = (globalThis as unknown as {
        Environment?: { SetTrackedCharacterEntity?: (e: unknown) => void };
      }).Environment;
      env?.SetTrackedCharacterEntity?.(avatar);
      logInfo('planet-v2: tracked character entity registered for floating origin');
    } catch (err) {
      logError(
        `planet-v2: SetTrackedCharacterEntity failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function chunkKeyId(k: ChunkKey): string {
  return `${k.face}:${k.lod}:${k.cx}:${k.cy}`;
}

function detectWebGL(): boolean {
  try {
    return Boolean(
      (globalThis as unknown as { WEBVERSE_PLATFORM?: string }).WEBVERSE_PLATFORM === 'webgl',
    );
  } catch (_e) {
    return false;
  }
}
