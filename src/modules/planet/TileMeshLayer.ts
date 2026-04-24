// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * TileMeshLayer (Story 6.5).
 *
 * Loads server-baked glTF 2.0 + Draco tile meshes for the mid-range band
 * (~2–15km). Also the only layer used for cube-corner tiles at close range
 * (Story 6.7) where the TerrainEntity layer is disabled.
 */

import { ChunkKey, chunkKeyString, PlanetSceneConfig } from './types.js';

interface LoadedTile {
  key: ChunkKey;
  meshEntityId: string | null;
}

export class TileMeshLayer {
  private readonly cfg: PlanetSceneConfig;
  private readonly tiles = new Map<string, LoadedTile>();

  constructor(cfg: PlanetSceneConfig) {
    this.cfg = cfg;
  }

  /** Build a URL for the chunk's glTF asset. */
  tileUrl(key: ChunkKey): string {
    return `${this.cfg.chunkServiceBaseUrl}/planet/${this.cfg.planetId}` +
      `/tile/${key.face}/${key.lod}/${key.cx}/${key.cy}.glb`;
  }

  async load(key: ChunkKey): Promise<void> {
    const id = chunkKeyString(key);
    if (this.tiles.has(id)) return;
    this.tiles.set(id, { key, meshEntityId: null });
    // Runtime-gated: actual MeshEntity.LoadFromUrl call lives in the WebVerse
    // integration layer; this scaffold only tracks the slot.
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
