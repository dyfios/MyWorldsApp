// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * Shared types for planet-v2.
 *
 * The 4-layer pipeline (far → near):
 *   ImpostorSphere → TileMesh → TerrainEntity
 *
 * Architecture: only the chunk the player is *standing on* uses
 * TerrainEntity (Unity Terrain — collidable, diggable, can't be rotated).
 * Neighbor chunks at mid-range use TileMesh (server-baked glTF). Far view
 * is the impostor sphere. v2 currently ships only TerrainEntity for the
 * single player-chunk; TileMesh + Impostor are stubbed visibly so the gap
 * is loud, not silent.
 */

/* ──────────────────────────── Chunk identity ─────────────────────────── */

export type CubeFace = 0 | 1 | 2 | 3 | 4 | 5;

/** A single terrain chunk's grid identity at some LOD. */
export interface ChunkKey {
  face: CubeFace;
  lod: number;
  cx: number;
  cy: number;
}

export function chunkKeyString(k: ChunkKey): string {
  return `${k.face}:${k.lod}:${k.cx}:${k.cy}`;
}

/** Number of cells along one cube-face edge at a given LOD (= 2^lod). */
export function cellsPerEdgeAtLod(lod: number): number {
  return 1 << lod;
}

/* ──────────────────────────── Chunk payload ──────────────────────────── */

/**
 * Chunk data returned by `wos-plugin-planet`'s chunk-request endpoint.
 * Heights are in real meters (negatives possible for ocean floor — caller
 * shifts before passing to TerrainEntity).
 */
export interface ChunkData {
  planetId: string;
  face: CubeFace;
  lod: number;
  cx: number;
  cy: number;
  /** World-space side length in meters. */
  length: number;
  /** World-space side width in meters. */
  width: number;
  /** Vertical envelope in meters (max altitude the plugin guarantees). */
  height: number;
  /**
   * Row-major heights matrix in meters. heights[r=V][c=U]. Optional in
   * V2 because the chunk handler now ships heights as a pre-formatted
   * JSON string (`heights_json`) for the async TerrainEntity.Create
   * code path. Kept here as `number[][]` for callers (e.g. v1 client,
   * tests) that need a parsed matrix.
   */
  heights?: number[][];
  /**
   * Heights matrix encoded as a raw JSON string, **with WebVerse-Runtime
   * SetHeights bug compensation already applied** ((raw + 300) / 1.5 per
   * cell). The TerrainEntityLayer embeds this string verbatim into the
   * envelope passed to `TerrainEntity.Create(jsonString, …)`. Embedding
   * as a raw segment means JS never parses or stringifies the 1M-element
   * heights matrix — the heavy deserialization runs on a C# background
   * thread inside JSONEntityHandler. Optional for backward compat with
   * older server responses; v2 server always populates it.
   */
  heights_json?: string;
  revision?: number;
  planet_config_hash?: string;
  terrainType?: string;
}

/* ──────────────────────────── Chunk source ───────────────────────────── */

/** Callback pair for chunk-heights fetches. Promise-free on purpose (JINT). */
export interface ChunkRequestCallbacks {
  onSuccess: (chunk: ChunkData) => void;
  onError?: (err: Error) => void;
}

/**
 * Quality hint for chunk-mesh requests. 'mid-range' → 65² mesh (~10 KB
 * Draco-compressed), 'far' → 17² mesh (~3 KB). Defaults server-side to
 * 'mid-range' when omitted.
 */
export type MeshQuality = 'mid-range' | 'far';

/**
 * Mesh-shaped chunk response from `wos/planet/{id}/chunk/mesh/request`.
 * `mesh_url` is a `data:application/gltf-binary;base64,...` URL that the
 * client passes directly to `MeshEntity.Create` — self-contained, no HTTP.
 */
export interface ChunkMeshData {
  planetId: string;
  face: CubeFace;
  lod: number;
  cx: number;
  cy: number;
  /** Always 'gltf-binary' for V1. */
  format: 'gltf-binary';
  /** Pre-base64 byte size. */
  byte_size: number;
  /** Vertices per side in the baked mesh (17 or 65 in V1). */
  target_resolution: number;
  /** data: URL ready for MeshEntity.Create. */
  mesh_url: string;
  revision?: number;
  planet_config_hash?: string;
  expires_at?: string | null;
}

export interface ChunkMeshRequestCallbacks {
  onSuccess: (mesh: ChunkMeshData) => void;
  onError?: (err: Error) => void;
}

/**
 * Chunk-fetching backend. Callback-driven so JINT's microtask scheduler
 * doesn't have to resume awaiters across the network boundary. Disposable.
 *
 * Two surfaces:
 *   - `requestChunk` returns the heights matrix for `TerrainEntityLayer`.
 *   - `requestChunkMesh` returns a baked glTF mesh for `TileMeshLayer`.
 *
 * Both go through the same MQTT connection / response topic — the source
 * dispatches by correlation-id internally.
 */
export interface IChunkSource {
  /** Whether the source is ready to accept requests. */
  isConnected(): boolean;

  /** Publish a chunk-heights request. Results delivered via callbacks. */
  requestChunk(
    face: CubeFace,
    lod: number,
    cx: number,
    cy: number,
    callbacks: ChunkRequestCallbacks,
  ): void;

  /** Publish a chunk-mesh request. Results delivered via callbacks. */
  requestChunkMesh(
    face: CubeFace,
    lod: number,
    cx: number,
    cy: number,
    callbacks: ChunkMeshRequestCallbacks,
    quality?: MeshQuality,
  ): void;

  dispose(): void;
}

/* ──────────────────────────── Render phases ──────────────────────────── */

export enum RenderPhase {
  Impostor = 'impostor',
  TileMesh = 'tilemesh',
  TerrainEntity = 'terrainentity',
  Unloaded = 'unloaded',
}

/* ──────────────────────────── Streaming budget ───────────────────────── */

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

/* ──────────────────────────── Camera state ───────────────────────────── */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  /** World position of the camera / player. */
  position: Vec3;
  /** Recent velocity (m/s). Zero is acceptable for v1 single-chunk scope. */
  velocity: Vec3;
  /** Height above sphere surface in meters — drives `phaseForAltitude`. */
  altitudeMeters: number;
}

/* ──────────────────────────── Layer adapter ──────────────────────────── */

/**
 * Layer adapter interface used by the streamer. Synchronous — actual async
 * work is callback-driven and fire-and-forget. Returns `boolean` so the
 * streamer can leave a slot un-tracked when the layer can't accept yet
 * (e.g., chunk source not connected) and retry next tick.
 */
export interface ILayer {
  /** True if this key is renderable by THIS layer at all (e.g. corners). */
  canHandle(key: ChunkKey): boolean;

  /**
   * Kick off loading. Returns true if the load was accepted (layer is now
   * tracking this slot), false if upstream isn't ready (streamer retries).
   */
  load(key: ChunkKey, chunk: ChunkData): boolean;

  /** Free any resources for this key; idempotent. */
  unload(key: ChunkKey): void;

  /** Free everything; safe to call before initialize completes. */
  dispose(): void;
}

/* ──────────────────────────── Planet config ──────────────────────────── */

/** Configuration handed to GlobeRenderer at initialize. */
export interface PlanetSceneConfig {
  planetId: string;
  /** Sphere radius in meters. V1 = 25000m. */
  radiusMeters: number;
  /**
   * Maximum LOD exponent — number of subdivisions per cube face edge is
   * 2^nExponent. V1 = 5 → 32 cells per edge.
   */
  nExponent: number;
  /** URL of the baked biome map (for Impostor). May be empty in V1. */
  biomeMapUrl: string;
  /**
   * URL of the server-baked impostor glb (UV sphere with biome PNG embedded
   * as diffuse texture). Story 6.4. When empty the ImpostorSphere falls
   * back to a flat-coloured primitive sphere so the planet has SOMETHING
   * visible from altitude.
   */
  impostorUrl?: string;
  /**
   * HTTP-style base URL for chunk-mesh assets. May be empty in V1. Reserved
   * for the Story 5.7 mesh-delivery work.
   */
  chunkServiceBaseUrl: string;
  /** Optional: chunk used as world-origin reference for tile placement. */
  originChunk?: { face: CubeFace; cx: number; cy: number };
}

/* ──────────────────────────── Phase selection ────────────────────────── */

/**
 * Render phase from altitude. Thresholds match v1 / architecture:
 *   altitude > 15km   → Impostor
 *   altitude > 1.5km  → TileMesh
 *   else              → TerrainEntity (close range)
 */
export function phaseForAltitude(altitudeMeters: number): RenderPhase {
  if (altitudeMeters > 15_000) return RenderPhase.Impostor;
  if (altitudeMeters > 1_500) return RenderPhase.TileMesh;
  return RenderPhase.TerrainEntity;
}
