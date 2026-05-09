// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * planet-v2 public surface.
 *
 * Exports the orchestrator + types needed by the worldType=planet-v2 wiring
 * in `myworld.ts`. Internal helpers (jint-runtime, webverse-types) are
 * imported directly by submodules but not re-exported here — keep the
 * external shape narrow.
 */

export { GlobeRenderer, type GlobeRendererDeps } from './GlobeRenderer.js';
export { MqttChunkSource, type MqttChunkSourceOptions } from './MqttChunkSource.js';
export { TerrainEntityLayer } from './TerrainEntityLayer.js';
export { TileMeshLayer } from './TileMeshLayer.js';
export { ImpostorSphere } from './ImpostorSphere.js';
export { ChunkStreamer } from './ChunkStreamer.js';
export {
  isCubeCornerChunk,
  shouldUseTerrainEntity,
} from './CubeCornerPolicy.js';
export {
  cellsPerEdgeAtLod,
  chunkKeyString,
  phaseForAltitude,
  RenderPhase,
  DEFAULT_BUDGET,
  WEBGL_BUDGET,
  type CameraState,
  type ChunkData,
  type ChunkKey,
  type ChunkRequestCallbacks,
  type CubeFace,
  type IChunkSource,
  type ILayer,
  type PlanetSceneConfig,
  type StreamingBudget,
  type Vec3,
} from './types.js';
