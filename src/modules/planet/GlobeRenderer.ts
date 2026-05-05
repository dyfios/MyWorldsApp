// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * GlobeRenderer — planet-world orchestrator (Stories 6.1 + 6.2).
 *
 * Owns the scene lifecycle for a single planet:
 *  - Constructs the 3 layers (Impostor / TileMesh / TerrainEntity) and a
 *    ChunkStreamer that drives them.
 *  - Hands precision to WebVerse via `Environment.SetTrackedCharacterEntity`
 *    (no custom floating-origin — the runtime's worldOffsetUpdateThreshold
 *    auto-reorigin is authoritative).
 *  - Cleans up every layer + streamer subscription on `dispose()`.
 *
 * Fits the existing `WorldRendering` abstract base in WorldRendererFactory.
 */

import { WorldRendering } from '../WorldRendererFactory';
import { WorldConfig } from '../../types/config';
import {
  PlanetSceneConfig,
  DEFAULT_BUDGET,
  WEBGL_BUDGET,
  RenderPhase,
  ChunkKey,
  IChunkSource,
} from './types.js';
import { ChunkStreamer, CameraState, ILayerAdapter } from './ChunkStreamer.js';
import { ImpostorSphere } from './ImpostorSphere.js';
import { TileMeshLayer } from './TileMeshLayer.js';
import { TerrainEntityLayer } from './TerrainEntityLayer.js';

declare const Logging: { Log: (m: string) => void; LogError: (m: string) => void };

export interface GlobeRendererDeps {
  /** Detects the WebGL runtime; defaults to a global flag provided by WebVerse. */
  isWebGL?: boolean;
  /** Player avatar entity for floating-origin tracking (Story 6.2). */
  playerAvatarEntity?: unknown;
  /** Override chunk candidates (tests only). */
  candidateProvider?: (camera: CameraState) => ChunkKey[];
  /**
   * Chunk-fetch backend. When provided, GlobeRenderer fetches chunk data
   * before passing heights to the close-range layer. Without it, layers
   * still track slot lifecycle but no real terrain renders (scaffold mode).
   * Production wiring constructs an MqttChunkSource here.
   */
  chunkSource?: IChunkSource;
}

export class GlobeRenderer extends WorldRendering {
  private streamer: ChunkStreamer | null = null;
  private impostor: ImpostorSphere | null = null;
  private tileMesh: TileMeshLayer | null = null;
  private terrainEntity: TerrainEntityLayer | null = null;
  private deps: GlobeRendererDeps = {};

  constructor(deps?: GlobeRendererDeps) {
    super();
    if (deps) this.deps = deps;
  }

  /**
   * Called by WorldRendererFactory once the world is confirmed planet-type.
   * `config` is the standard WorldConfig; the planet-specific fields are
   * read via `config.planet` (shape defined in types/config.ts).
   */
  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    const planet = (config as unknown as { planet?: PlanetSceneConfig }).planet;
    if (!planet) {
      throw new Error('GlobeRenderer: WorldConfig missing .planet section');
    }
    const isWebGL = this.deps.isWebGL ?? detectWebGL();
    const budget = isWebGL ? WEBGL_BUDGET : DEFAULT_BUDGET;

    this.impostor = new ImpostorSphere(planet);
    this.tileMesh = new TileMeshLayer(planet);
    this.terrainEntity = new TerrainEntityLayer(planet, isWebGL);

    await this.impostor.initialize();

    const layer: ILayerAdapter = {
      load: async (key, phase) => this.loadInLayer(key, phase),
      unload: (key) => this.unloadFromLayers(key),
      setPhase: (key, phase) => this.setPhaseInLayers(key, phase),
    };
    this.streamer = new ChunkStreamer(layer, budget);

    // Story 6.2 — hand precision to WebVerse's built-in floating origin.
    this.bootstrapFloatingOrigin();

    try {
      Logging?.Log(`GlobeRenderer initialized for planet ${planet.planetId}`);
    } catch (_e) { /* runtime may not be present in tests */ }
  }

  /** Single frame / tick entry point. Wired by WorldRendererFactory.maintenance. */
  async tick(camera: CameraState): Promise<void> {
    if (!this.streamer) return;
    const candidates = this.deps.candidateProvider
      ? this.deps.candidateProvider(camera)
      : [];
    await this.streamer.update(camera, candidates);
  }

  dispose(): void {
    this.streamer?.disposeAll();
    this.streamer = null;
    this.impostor?.dispose();
    this.impostor = null;
    this.tileMesh?.dispose();
    this.tileMesh = null;
    this.terrainEntity?.dispose();
    this.terrainEntity = null;
    try {
      Logging?.Log('GlobeRenderer disposed');
    } catch (_e) { /* ignore */ }
  }

  // ---- Internals ---------------------------------------------------------

  private async loadInLayer(key: ChunkKey, phase: RenderPhase): Promise<void> {
    switch (phase) {
      case RenderPhase.Impostor:
        this.impostor?.setVisible(true);
        return;
      case RenderPhase.TileMesh:
        await this.tileMesh?.load(key);
        return;
      case RenderPhase.TerrainEntity:
        if (this.terrainEntity?.canHandle(key)) {
          await this.fetchAndLoadTerrain(key);
        } else {
          await this.tileMesh?.load(key);
        }
        return;
      case RenderPhase.Unloaded:
        return;
    }
  }

  /**
   * Pulls a chunk from the injected source (when present) and hands its
   * heights to the close-range layer. Scaffold mode (no chunkSource) passes
   * an empty matrix — preserves existing layer-slot lifecycle so callers
   * without a real backend still get a valid streamer state machine.
   */
  private async fetchAndLoadTerrain(key: ChunkKey): Promise<void> {
    if (!this.terrainEntity) return;
    const source = this.deps.chunkSource;
    if (!source) {
      // Scaffold mode — no chunkSource means no real terrain to render.
      // Skip entirely so the world isn't littered with placeholder tiles.
      return;
    }
    try {
      const chunk = await source.requestChunk(key.face, key.lod, key.cx, key.cy);
      await this.terrainEntity.load(key, chunk);
    } catch (err) {
      try {
        Logging?.LogError?.(`GlobeRenderer: chunk fetch failed for ${key.face}:${key.lod}:${key.cx}:${key.cy} — ${(err as Error).message}`);
      } catch (_e) { /* runtime may not be present in tests */ }
    }
  }

  private unloadFromLayers(key: ChunkKey): void {
    this.tileMesh?.unload(key);
    this.terrainEntity?.unload(key);
  }

  private setPhaseInLayers(key: ChunkKey, phase: RenderPhase): void {
    if (phase !== RenderPhase.TileMesh) this.tileMesh?.unload(key);
    if (phase !== RenderPhase.TerrainEntity) this.terrainEntity?.unload(key);
    if (phase === RenderPhase.Impostor) this.impostor?.setVisible(true);
    else this.impostor?.setVisible(false);
  }

  private bootstrapFloatingOrigin(): void {
    const avatar = this.deps.playerAvatarEntity;
    if (!avatar) return;
    try {
      const env = (globalThis as unknown as { Environment?: {
        SetTrackedCharacterEntity?: (e: unknown) => void;
      } }).Environment;
      env?.SetTrackedCharacterEntity?.(avatar);
    } catch (err) {
      try {
        Logging?.LogError?.('SetTrackedCharacterEntity failed: ' + String(err));
      } catch (_e) { /* ignore */ }
    }
  }
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
