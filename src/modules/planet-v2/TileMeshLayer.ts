// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * TileMeshLayer (planet-v2) — STUB.
 *
 * Real implementation requires:
 *   - Story 5.6 (MeshBaker — server-side glTF baking from heights matrix)
 *   - Story 5.7 (chunkMeshHandler — MQTT endpoint returning baked mesh URL)
 *   - Story 6.5 (this layer — fetch via MeshEntity.Create + place at world
 *     position using the same origin pin as TerrainEntityLayer)
 *
 * Until those are real, this stub `throw`s on `load()`. v2's first pass
 * intentionally renders only the player's chunk via TerrainEntityLayer; the
 * GlobeRenderer never tries to load anything in this layer in single-chunk
 * mode. If it does, the throw makes the gap loud — explicit failure rather
 * than silently scaffolded.
 */

import type {
  ChunkData,
  ChunkKey,
  ILayer,
  PlanetSceneConfig,
} from './types.js';

export class TileMeshLayer implements ILayer {
  private readonly cfg: PlanetSceneConfig;

  constructor(cfg: PlanetSceneConfig) {
    this.cfg = cfg;
    void this.cfg; // suppress unused — real impl will use planetId, chunkServiceBaseUrl
  }

  canHandle(_key: ChunkKey): boolean {
    // Per Story 6.7, TileMesh handles cube-corners + everything mid-range.
    // Until the layer is implemented, declare we CAN handle to keep the
    // intent visible — but `load` will throw, surfacing the gap.
    return true;
  }

  load(_key: ChunkKey, _chunk: ChunkData): boolean {
    throw new Error(
      'planet-v2 TileMeshLayer.load: not implemented — requires Story 5.6 ' +
        '(MeshBaker server-side), Story 5.7 (chunkMeshHandler MQTT endpoint), ' +
        'and Story 6.5 (client mesh fetch + render via MeshEntity.Create). ' +
        'See _bmad-output/planning-artifacts/addendum-tile-mesh-baking.md.',
    );
  }

  unload(_key: ChunkKey): void {
    // No-op — nothing to clean up while stubbed.
  }

  dispose(): void {
    // No-op.
  }
}
