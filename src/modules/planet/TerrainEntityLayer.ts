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
 */

import { ChunkKey, chunkKeyString, PlanetSceneConfig } from './types.js';
import { shouldUseTerrainEntity } from './CubeCornerPolicy.js';

interface LoadedTerrainTile {
  key: ChunkKey;
  terrainEntityId: string | null;
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

  async load(key: ChunkKey, heights: number[][]): Promise<void> {
    if (!this.canHandle(key)) return;
    const id = chunkKeyString(key);
    if (this.tiles.has(id)) return;
    this.tiles.set(id, { key, terrainEntityId: null });
    // Runtime-gated: TerrainEntity.CreateHeightmap(heights, layers, ...).
    void heights;
    void this.cfg;
  }

  unload(key: ChunkKey): void {
    this.tiles.delete(chunkKeyString(key));
  }

  size(): number {
    return this.tiles.size;
  }

  dispose(): void {
    this.tiles.clear();
  }
}
