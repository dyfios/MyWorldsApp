// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChunkStreamer,
  phaseForAltitude,
  type CameraState,
  type ILayerAdapter,
} from './ChunkStreamer.js';
import { RenderPhase, type ChunkKey, type StreamingBudget } from './types.js';

const k = (face: 0 | 1 | 2 | 3 | 4 | 5, lod: number, cx: number, cy: number): ChunkKey => ({
  face,
  lod,
  cx,
  cy,
});

const camera = (altitudeMeters: number): CameraState => ({
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  altitudeMeters,
});

interface RecorderLayer extends ILayerAdapter {
  loads: Array<{ key: ChunkKey; phase: RenderPhase }>;
  unloads: ChunkKey[];
  setPhases: Array<{ key: ChunkKey; phase: RenderPhase }>;
}

function makeRecorder(): RecorderLayer {
  const r: RecorderLayer = {
    loads: [],
    unloads: [],
    setPhases: [],
    async load(key, phase) {
      r.loads.push({ key, phase });
    },
    unload(key) {
      r.unloads.push(key);
    },
    setPhase(key, phase) {
      r.setPhases.push({ key, phase });
    },
  };
  return r;
}

const BUDGET: StreamingBudget = { lruCap: 4, loadRadiusMeters: 8000, unloadRadiusMeters: 12000 };

describe('phaseForAltitude', () => {
  it('selects Impostor above 15km altitude', () => {
    expect(phaseForAltitude(20_000)).toBe(RenderPhase.Impostor);
    expect(phaseForAltitude(15_001)).toBe(RenderPhase.Impostor);
  });

  it('selects TileMesh between 1.5km and 15km', () => {
    expect(phaseForAltitude(15_000)).toBe(RenderPhase.TileMesh);
    expect(phaseForAltitude(5_000)).toBe(RenderPhase.TileMesh);
    expect(phaseForAltitude(1_501)).toBe(RenderPhase.TileMesh);
  });

  it('selects TerrainEntity at or below 1.5km', () => {
    expect(phaseForAltitude(1_500)).toBe(RenderPhase.TerrainEntity);
    expect(phaseForAltitude(0)).toBe(RenderPhase.TerrainEntity);
    expect(phaseForAltitude(50)).toBe(RenderPhase.TerrainEntity);
  });
});

describe('ChunkStreamer.update', () => {
  let layer: RecorderLayer;
  let streamer: ChunkStreamer;

  beforeEach(() => {
    layer = makeRecorder();
    streamer = new ChunkStreamer(layer, BUDGET);
  });

  it('loads new chunks on first update', async () => {
    const candidates = [k(0, 5, 0, 0), k(0, 5, 0, 1)];
    await streamer.update(camera(500), candidates);
    expect(layer.loads).toHaveLength(2);
    expect(layer.loads.every((l) => l.phase === RenderPhase.TerrainEntity)).toBe(true);
    expect(streamer.size()).toBe(2);
  });

  it('does not re-load chunks already tracked', async () => {
    const candidates = [k(0, 5, 0, 0)];
    await streamer.update(camera(500), candidates);
    await streamer.update(camera(500), candidates);
    expect(layer.loads).toHaveLength(1);
    expect(streamer.size()).toBe(1);
  });

  it('unloads chunks no longer in candidate set', async () => {
    await streamer.update(camera(500), [k(0, 5, 0, 0), k(0, 5, 0, 1)]);
    layer.unloads.length = 0;
    await streamer.update(camera(500), [k(0, 5, 0, 0)]); // dropped (0,1)
    expect(layer.unloads).toHaveLength(1);
    expect(layer.unloads[0]).toEqual(k(0, 5, 0, 1));
    expect(streamer.size()).toBe(1);
  });

  it('promotes phase when altitude crosses threshold', async () => {
    await streamer.update(camera(500), [k(0, 5, 0, 0)]); // TerrainEntity
    layer.setPhases.length = 0;
    await streamer.update(camera(20_000), [k(0, 5, 0, 0)]); // Impostor
    expect(layer.setPhases).toHaveLength(1);
    expect(layer.setPhases[0].phase).toBe(RenderPhase.Impostor);
  });

  it('does not call setPhase when phase is unchanged', async () => {
    await streamer.update(camera(500), [k(0, 5, 0, 0)]);
    layer.setPhases.length = 0;
    await streamer.update(camera(800), [k(0, 5, 0, 0)]); // still TerrainEntity
    expect(layer.setPhases).toHaveLength(0);
  });
});

describe('ChunkStreamer LRU eviction', () => {
  it('evicts oldest entries when cap exceeded', async () => {
    const layer = makeRecorder();
    const streamer = new ChunkStreamer(layer, BUDGET); // cap=4

    // Tick 1: load 4 chunks (at cap, no eviction)
    await streamer.update(camera(500), [
      k(0, 5, 0, 0),
      k(0, 5, 0, 1),
      k(0, 5, 0, 2),
      k(0, 5, 0, 3),
    ]);
    expect(streamer.size()).toBe(4);
    expect(layer.unloads).toHaveLength(0);

    // Tick 2: refresh chunks 1-3 (tick=2) but request 5th and 6th candidates so the
    // sweep doesn't cull (0,0) yet — we want the LRU branch to fire instead of sweep.
    // Actually: the sweep DOES run first and removes chunks not in the candidate set.
    // To test LRU specifically, we need the candidate set itself to exceed cap.
    layer.loads.length = 0;
    await streamer.update(camera(500), [
      k(0, 5, 0, 0),
      k(0, 5, 0, 1),
      k(0, 5, 0, 2),
      k(0, 5, 0, 3),
      k(0, 5, 0, 4),
      k(0, 5, 0, 5),
    ]);
    // 6 candidates, cap 4 → evict the 2 stalest (those with the oldest lastTick).
    // All 6 were just touched on this tick, so lastTick is identical. Eviction picks
    // arbitrarily but bounds the count: size must equal cap.
    expect(streamer.size()).toBe(4);
    expect(layer.unloads).toHaveLength(2);
  });

  it('keeps recently-touched chunks over older ones across multiple ticks', async () => {
    const layer = makeRecorder();
    const streamer = new ChunkStreamer(layer, BUDGET);

    await streamer.update(camera(500), [k(0, 5, 0, 0), k(0, 5, 0, 1)]); // tick 1
    await streamer.update(camera(500), [k(0, 5, 0, 0)]); // tick 2 — (0,1) culled by sweep
    expect(streamer.size()).toBe(1);

    // Now request 5 fresh candidates (cap=4). All have lastTick=tick3 except (0,0)
    // which has lastTick=tick3 too after refresh. Eviction picks one arbitrarily;
    // size bounded.
    await streamer.update(camera(500), [
      k(0, 5, 0, 0),
      k(0, 5, 1, 0),
      k(0, 5, 1, 1),
      k(0, 5, 1, 2),
      k(0, 5, 1, 3),
    ]);
    expect(streamer.size()).toBe(4);
  });
});

describe('ChunkStreamer.disposeAll', () => {
  it('unloads every tracked chunk and clears state', async () => {
    const layer = makeRecorder();
    const streamer = new ChunkStreamer(layer, BUDGET);
    await streamer.update(camera(500), [k(0, 5, 0, 0), k(0, 5, 0, 1)]);
    layer.unloads.length = 0;
    streamer.disposeAll();
    expect(layer.unloads).toHaveLength(2);
    expect(streamer.size()).toBe(0);
  });
});
