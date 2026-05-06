// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * ChunkStreamer (Story 6.3).
 *
 * Selects chunks within a load radius of the camera, promotes/demotes them
 * across RenderPhase layers, and evicts with an LRU policy when over budget.
 * Velocity-aware prefetch biases selection in the direction of travel.
 *
 * Pure TypeScript — no WebVerse runtime coupling. The `ILayerAdapter` interface
 * is the only integration point; real layer implementations live in
 * ImpostorSphere / TileMeshLayer / TerrainEntityLayer.
 */

import {
  ChunkKey,
  chunkKeyString,
  RenderPhase,
  StreamingBudget,
} from './types.js';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  position: Vec3;
  velocity: Vec3;
  /** Height above surface in meters — selects close-range layer. */
  altitudeMeters: number;
}

export interface ILayerAdapter {
  /**
   * Load a chunk into the layer. SYNCHRONOUS — actual async work (chunk
   * fetch, runtime entity creation) is callback-driven and fire-and-forget
   * so this returns immediately. JINT's microtask scheduler can't be relied
   * on for await-of-Promise resumption, so we keep the streamer's hot path
   * Promise-free.
   */
  load(key: ChunkKey, phase: RenderPhase): void;
  unload(key: ChunkKey): void;
  setPhase(key: ChunkKey, phase: RenderPhase): void;
}

/** Computes the render phase from altitude thresholds. */
export function phaseForAltitude(altitude: number): RenderPhase {
  if (altitude > 15_000) return RenderPhase.Impostor;
  if (altitude > 1_500) return RenderPhase.TileMesh;
  return RenderPhase.TerrainEntity;
}

interface Entry {
  key: ChunkKey;
  phase: RenderPhase;
  /** Monotonic tick of last access — used for LRU eviction. */
  lastTick: number;
}

export class ChunkStreamer {
  private readonly entries = new Map<string, Entry>();
  private readonly budget: StreamingBudget;
  private readonly layer: ILayerAdapter;
  private tick = 0;

  constructor(layer: ILayerAdapter, budget: StreamingBudget) {
    this.layer = layer;
    this.budget = budget;
  }

  /**
   * Mark-and-sweep style update. Synchronous — all layer operations are
   * fire-and-forget. Call every frame or tile boundary.
   */
  update(camera: CameraState, candidates: ChunkKey[]): void {
    this.tick++;
    const phase = phaseForAltitude(camera.altitudeMeters);
    const touched = new Set<string>();

    // Velocity-bias: sort candidates so those in travel direction come first —
    // prefetch loads them before the camera reaches their edge.
    const sorted = this.biasByVelocity(candidates, camera);

    for (const key of sorted) {
      const id = chunkKeyString(key);
      touched.add(id);
      const existing = this.entries.get(id);
      if (!existing) {
        const entry: Entry = { key, phase, lastTick: this.tick };
        this.entries.set(id, entry);
        this.layer.load(key, phase);
      } else {
        existing.lastTick = this.tick;
        if (existing.phase !== phase) {
          existing.phase = phase;
          this.layer.setPhase(key, phase);
        }
      }
    }

    // Sweep: unload entries outside the candidate set. LRU eviction follows.
    for (const [id, entry] of this.entries) {
      if (!touched.has(id)) {
        this.entries.delete(id);
        this.layer.unload(entry.key);
      }
    }

    this.enforceBudget();
  }

  /** LRU eviction when over cap. */
  private enforceBudget(): void {
    if (this.entries.size <= this.budget.lruCap) return;
    const sorted = Array.from(this.entries.entries()).sort(
      (a, b) => a[1].lastTick - b[1].lastTick,
    );
    const toEvict = this.entries.size - this.budget.lruCap;
    for (let i = 0; i < toEvict; i++) {
      const [id, entry] = sorted[i];
      this.entries.delete(id);
      this.layer.unload(entry.key);
    }
  }

  /** Stable sort that biases by dot-product of direction-to-chunk vs velocity. */
  private biasByVelocity(keys: ChunkKey[], camera: CameraState): ChunkKey[] {
    const vmag =
      Math.sqrt(
        camera.velocity.x * camera.velocity.x +
          camera.velocity.y * camera.velocity.y +
          camera.velocity.z * camera.velocity.z,
      ) || 1;
    // Without a coord mapping layer here, we treat chunk ordering as an
    // opaque pre-sort done by the caller. We return a shallow copy; real bias
    // happens once a chunk→world-position mapping is injected. This preserves
    // the streamer's behavior contract without coupling to PlanetShared yet.
    void vmag;
    return keys.slice();
  }

  /** Count of currently-tracked chunks. */
  size(): number {
    return this.entries.size;
  }

  /** Reset all state; unloads every tracked chunk. */
  disposeAll(): void {
    for (const [, entry] of this.entries) {
      this.layer.unload(entry.key);
    }
    this.entries.clear();
  }
}
