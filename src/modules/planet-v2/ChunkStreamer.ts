// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * ChunkStreamer (planet-v2) — synchronous mark-and-sweep + LRU.
 *
 * Drives load/unload of chunks based on a per-tick candidate list. Sync —
 * no async/await crosses the streamer surface. Layers' `load()` returns
 * boolean; the streamer only adds an entry on `true` so deferred loads
 * (chunk source not yet connected, etc.) get retried on the next tick
 * instead of being marked-as-loaded with empty content.
 *
 * Phase selection is per-chunk via the dispatcher passed in by the
 * orchestrator (GlobeRenderer): the streamer doesn't know about render
 * phases directly, only about an `ILayerDispatcher` that resolves a key
 * to "which layer + accept/reject". This keeps Story 6.6's promote/demote
 * logic (player chunk = TerrainEntity, others = TileMesh) layered cleanly
 * on top.
 */

import type { ChunkKey, StreamingBudget, CameraState } from './types.js';
import { chunkKeyString } from './types.js';

/**
 * The streamer asks a dispatcher for: "given this key + camera, which
 * layer should own the slot?" Returns null if no layer applies (e.g.,
 * candidate is outside any active phase).
 */
export interface ILayerDispatcher {
  /**
   * Resolve a key to a layer. Returning null is a soft skip (no slot).
   */
  layerFor(key: ChunkKey, camera: CameraState): ILayerEndpoint | null;
}

/**
 * Subset of ILayer that the streamer interacts with — load returns boolean,
 * unload is sync. Mirrors `ILayer` in `types.ts` but avoids importing the
 * full one to keep the streamer's surface narrow.
 */
export interface ILayerEndpoint {
  /** Stable identifier for this layer instance (used to detect promote/demote). */
  readonly id: string;
  load(key: ChunkKey, camera: CameraState): boolean;
  unload(key: ChunkKey): void;
}

interface Entry {
  key: ChunkKey;
  /** Which layer currently owns this slot. */
  layerId: string;
  /** Monotonic tick count at last touch — for LRU eviction. */
  lastTick: number;
}

export class ChunkStreamer {
  private readonly entries = new Map<string, Entry>();
  private readonly budget: StreamingBudget;
  private readonly dispatcher: ILayerDispatcher;
  private tick = 0;
  /** All distinct layers we've ever seen, for unload during promote/demote. */
  private readonly knownLayers = new Map<string, ILayerEndpoint>();

  constructor(dispatcher: ILayerDispatcher, budget: StreamingBudget) {
    this.dispatcher = dispatcher;
    this.budget = budget;
  }

  /** Update — call every frame or tile boundary. Synchronous. */
  update(camera: CameraState, candidates: ChunkKey[]): void {
    this.tick++;
    const touched = new Set<string>();

    for (const key of candidates) {
      const id = chunkKeyString(key);
      const layer = this.dispatcher.layerFor(key, camera);
      if (!layer) continue;
      this.knownLayers.set(layer.id, layer);

      const existing = this.entries.get(id);
      if (!existing) {
        // Fresh slot — try to load. On reject, leave entry untracked so we
        // retry next tick (chunk source might not be connected yet).
        if (layer.load(key, camera)) {
          this.entries.set(id, { key, layerId: layer.id, lastTick: this.tick });
          touched.add(id);
        }
      } else if (existing.layerId !== layer.id) {
        // Phase change — demote from old layer, promote to new. The old
        // layer's `unload` is synchronous + idempotent.
        const oldLayer = this.knownLayers.get(existing.layerId);
        oldLayer?.unload(key);
        if (layer.load(key, camera)) {
          existing.layerId = layer.id;
          existing.lastTick = this.tick;
          touched.add(id);
        } else {
          this.entries.delete(id); // failed to promote; retry next tick
        }
      } else {
        existing.lastTick = this.tick;
        touched.add(id);
      }
    }

    // Sweep: unload entries no longer in the candidate set.
    for (const [id, entry] of this.entries) {
      if (!touched.has(id)) {
        this.entries.delete(id);
        this.knownLayers.get(entry.layerId)?.unload(entry.key);
      }
    }

    this.enforceBudget();
  }

  private enforceBudget(): void {
    if (this.entries.size <= this.budget.lruCap) return;
    const sorted = Array.from(this.entries.entries()).sort(
      (a, b) => a[1].lastTick - b[1].lastTick,
    );
    const toEvict = this.entries.size - this.budget.lruCap;
    for (let i = 0; i < toEvict; i++) {
      const [id, entry] = sorted[i]!;
      this.entries.delete(id);
      this.knownLayers.get(entry.layerId)?.unload(entry.key);
    }
  }

  size(): number {
    return this.entries.size;
  }

  /** Snapshot of current slots, for diagnostic dumps. Returns an array
   *  (not a generator) — JINT 5.x doesn't support generators. */
  snapshot(): Array<{ key: ChunkKey; layerId: string }> {
    const out: Array<{ key: ChunkKey; layerId: string }> = [];
    for (const entry of this.entries.values()) {
      out.push({ key: entry.key, layerId: entry.layerId });
    }
    return out;
  }

  /** Unload everything; idempotent. */
  disposeAll(): void {
    for (const [, entry] of this.entries) {
      this.knownLayers.get(entry.layerId)?.unload(entry.key);
    }
    this.entries.clear();
    this.knownLayers.clear();
  }
}
