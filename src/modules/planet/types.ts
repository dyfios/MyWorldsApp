// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * Shared types for the client planet rendering pipeline.
 *
 * The 4-layer pipeline (far → near): ImpostorSphere → TileMesh → TerrainEntity.
 * Each layer owns a subset of chunks selected by distance-based phase.
 */

export type CubeFace = 0 | 1 | 2 | 3 | 4 | 5;

/** A single terrain chunk identifier at some LOD. */
export interface ChunkKey {
  face: CubeFace;
  lod: number;
  cx: number;
  cy: number;
}

/** String form used as Map key. */
export function chunkKeyString(k: ChunkKey): string {
  return `${k.face}:${k.lod}:${k.cx}:${k.cy}`;
}

/** Render phase selected per chunk by the streamer based on camera distance. */
export enum RenderPhase {
  Impostor = 'impostor',
  TileMesh = 'tilemesh',
  TerrainEntity = 'terrainentity',
  Unloaded = 'unloaded',
}

/** Planet-scene context passed into GlobeRenderer. */
export interface PlanetSceneConfig {
  planetId: string;
  radiusMeters: number;
  nExponent: number;
  biomeMapUrl: string;
  chunkServiceBaseUrl: string;
}

/** LRU streaming budget. Halved on WebGL per AC 6.3. */
export interface StreamingBudget {
  lruCap: number;
  loadRadiusMeters: number;
  unloadRadiusMeters: number;
}

export const DEFAULT_BUDGET: StreamingBudget = {
  lruCap: 64,
  loadRadiusMeters: 8000,
  unloadRadiusMeters: 12000,
};

export const WEBGL_BUDGET: StreamingBudget = {
  lruCap: 32,
  loadRadiusMeters: 6000,
  unloadRadiusMeters: 9000,
};
