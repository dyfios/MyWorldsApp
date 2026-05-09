// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect } from 'vitest';
import {
  ChunkStreamer,
  type ILayerDispatcher,
  type ILayerEndpoint,
} from './ChunkStreamer.js';
import {
  DEFAULT_BUDGET,
  type CameraState,
  type ChunkKey,
  type StreamingBudget,
} from './types.js';

const k = (face: 0 | 1 | 2 | 3 | 4 | 5, lod: number, cx: number, cy: number): ChunkKey => ({
  face, lod, cx, cy,
});

const cam = (altitudeMeters: number): CameraState => ({
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  altitudeMeters,
});

interface Recorder extends ILayerEndpoint {
  loads: ChunkKey[];
  unloads: ChunkKey[];
  acceptOnLoad: boolean;
}

function recorder(id: string, accept = true): Recorder {
  const r: Recorder = {
    id,
    loads: [],
    unloads: [],
    acceptOnLoad: accept,
    load(key) {
      this.loads.push(key);
      return this.acceptOnLoad;
    },
    unload(key) {
      this.unloads.push(key);
    },
  };
  return r;
}

const SMALL_BUDGET: StreamingBudget = { lruCap: 4, loadRadiusMeters: 8000, unloadRadiusMeters: 12000 };

describe('ChunkStreamer.update', () => {
  it('routes each candidate to the dispatcher and tracks accepted loads', () => {
    const layer = recorder('A');
    const d: ILayerDispatcher = { layerFor: () => layer };
    const s = new ChunkStreamer(d, SMALL_BUDGET);
    s.update(cam(500), [k(0, 5, 0, 0), k(0, 5, 0, 1)]);
    expect(layer.loads).toHaveLength(2);
    expect(s.size()).toBe(2);
  });

  it('does NOT track an entry when load() returns false', () => {
    const layer = recorder('A', false);
    const d: ILayerDispatcher = { layerFor: () => layer };
    const s = new ChunkStreamer(d, SMALL_BUDGET);
    s.update(cam(500), [k(0, 5, 0, 0)]);
    expect(layer.loads).toHaveLength(1);
    expect(s.size()).toBe(0);
  });

  it('retries a rejected load on the next tick', () => {
    const layer = recorder('A', false);
    const d: ILayerDispatcher = { layerFor: () => layer };
    const s = new ChunkStreamer(d, SMALL_BUDGET);
    s.update(cam(500), [k(0, 5, 0, 0)]);
    expect(layer.loads).toHaveLength(1);
    layer.acceptOnLoad = true;
    s.update(cam(500), [k(0, 5, 0, 0)]);
    expect(layer.loads).toHaveLength(2);
    expect(s.size()).toBe(1);
  });

  it('does not double-load chunks already tracked by the same layer', () => {
    const layer = recorder('A');
    const d: ILayerDispatcher = { layerFor: () => layer };
    const s = new ChunkStreamer(d, SMALL_BUDGET);
    s.update(cam(500), [k(0, 5, 0, 0)]);
    s.update(cam(500), [k(0, 5, 0, 0)]);
    expect(layer.loads).toHaveLength(1);
  });

  it('unloads chunks no longer in the candidate set', () => {
    const layer = recorder('A');
    const d: ILayerDispatcher = { layerFor: () => layer };
    const s = new ChunkStreamer(d, SMALL_BUDGET);
    s.update(cam(500), [k(0, 5, 0, 0), k(0, 5, 0, 1)]);
    layer.unloads.length = 0;
    s.update(cam(500), [k(0, 5, 0, 0)]);
    expect(layer.unloads).toHaveLength(1);
    expect(layer.unloads[0]).toEqual(k(0, 5, 0, 1));
  });

  it('promotes a chunk from one layer to another when dispatcher changes', () => {
    const A = recorder('A');
    const B = recorder('B');
    let useB = false;
    const d: ILayerDispatcher = { layerFor: () => (useB ? B : A) };
    const s = new ChunkStreamer(d, SMALL_BUDGET);
    s.update(cam(500), [k(0, 5, 0, 0)]);
    expect(A.loads).toHaveLength(1);
    expect(B.loads).toHaveLength(0);

    useB = true;
    s.update(cam(500), [k(0, 5, 0, 0)]);
    expect(A.unloads).toHaveLength(1);
    expect(B.loads).toHaveLength(1);
    expect(s.size()).toBe(1);
  });

  it('skips candidates the dispatcher returns null for', () => {
    const d: ILayerDispatcher = { layerFor: () => null };
    const s = new ChunkStreamer(d, SMALL_BUDGET);
    s.update(cam(500), [k(0, 5, 0, 0), k(0, 5, 0, 1)]);
    expect(s.size()).toBe(0);
  });
});

describe('ChunkStreamer LRU eviction', () => {
  it('evicts oldest entries when over budget', () => {
    const layer = recorder('A');
    const d: ILayerDispatcher = { layerFor: () => layer };
    const s = new ChunkStreamer(d, SMALL_BUDGET);

    s.update(cam(500), [k(0, 5, 0, 0), k(0, 5, 0, 1), k(0, 5, 0, 2), k(0, 5, 0, 3)]);
    expect(s.size()).toBe(4);

    layer.unloads.length = 0;
    s.update(cam(500), [
      k(0, 5, 0, 0), k(0, 5, 0, 1), k(0, 5, 0, 2), k(0, 5, 0, 3), k(0, 5, 0, 4), k(0, 5, 0, 5),
    ]);
    expect(s.size()).toBe(4);
    expect(layer.unloads.length).toBe(2);
  });
});

describe('ChunkStreamer.disposeAll', () => {
  it('unloads everything and clears state', () => {
    const layer = recorder('A');
    const d: ILayerDispatcher = { layerFor: () => layer };
    const s = new ChunkStreamer(d, DEFAULT_BUDGET);
    s.update(cam(500), [k(0, 5, 0, 0), k(0, 5, 0, 1)]);
    layer.unloads.length = 0;
    s.disposeAll();
    expect(layer.unloads).toHaveLength(2);
    expect(s.size()).toBe(0);
  });
});
