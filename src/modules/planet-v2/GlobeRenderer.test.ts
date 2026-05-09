// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GlobeRenderer } from './GlobeRenderer.js';
import type {
  CameraState,
  ChunkData,
  ChunkKey,
  IChunkSource,
  PlanetSceneConfig,
} from './types.js';

const cam: CameraState = {
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  altitudeMeters: 100, // → TerrainEntity phase
};

const minimalConfig: PlanetSceneConfig = {
  planetId: 'test-planet',
  radiusMeters: 25_000,
  nExponent: 5,
  biomeMapUrl: '',
  chunkServiceBaseUrl: '',
  originChunk: { face: 0, cx: 15, cy: 15 },
};

beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  g.Logging = { Log: () => {}, LogWarning: () => {}, LogError: () => {} };
});

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.Logging;
  delete g.Environment;
});

describe('GlobeRenderer.initialize', () => {
  it('initializes synchronously without throwing', () => {
    const r = new GlobeRenderer();
    expect(() => r.initialize(minimalConfig, { isWebGL: false })).not.toThrow();
    r.dispose();
  });

  it('throws if initialized twice', () => {
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, { isWebGL: false });
    expect(() => r.initialize(minimalConfig, { isWebGL: false })).toThrow(/already initialized/);
    r.dispose();
  });

  it('calls Environment.SetTrackedCharacterEntity when avatar is provided', () => {
    const calls: unknown[] = [];
    (globalThis as Record<string, unknown>).Environment = {
      SetTrackedCharacterEntity: (e: unknown) => calls.push(e),
    };
    const avatar = { id: 'avatar-1' };
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, { isWebGL: false, playerAvatarEntity: avatar });
    expect(calls).toEqual([avatar]);
    r.dispose();
  });
});

describe('GlobeRenderer.tick', () => {
  it('is a no-op before initialize', () => {
    const r = new GlobeRenderer();
    expect(() => r.tick(cam)).not.toThrow();
  });

  it('passes candidates from candidateProvider through to the dispatcher', () => {
    let providerCalls = 0;
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, {
      isWebGL: false,
      candidateProvider: () => {
        providerCalls++;
        return [{ face: 0, lod: 5, cx: 15, cy: 15 } as ChunkKey];
      },
    });
    r.tick(cam);
    expect(providerCalls).toBe(1);
    r.dispose();
  });

  it('requests the player chunk via chunkSource on first tick (cache miss)', () => {
    const requests: Array<[number, number, number, number]> = [];
    const fakeSource: IChunkSource = {
      isConnected: () => true,
      requestChunk: (face, lod, cx, cy, _cb) => {
        requests.push([face, lod, cx, cy]);
      },
      dispose: () => {},
    };
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, {
      isWebGL: false,
      chunkSource: fakeSource,
      candidateProvider: () => [{ face: 0, lod: 5, cx: 15, cy: 15 }],
      playerChunkProvider: () => ({ face: 0, lod: 5, cx: 15, cy: 15 }),
    });
    r.tick(cam);
    expect(requests).toEqual([[0, 5, 15, 15]]);
    r.dispose();
  });

  it('does NOT request a chunk when source is not connected', () => {
    let called = 0;
    const fakeSource: IChunkSource = {
      isConnected: () => false,
      requestChunk: () => { called++; },
      dispose: () => {},
    };
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, {
      isWebGL: false,
      chunkSource: fakeSource,
      candidateProvider: () => [{ face: 0, lod: 5, cx: 15, cy: 15 }],
      playerChunkProvider: () => ({ face: 0, lod: 5, cx: 15, cy: 15 }),
    });
    r.tick(cam);
    expect(called).toBe(0);
    r.dispose();
  });

  it('returns null layer (no slot tracked) for non-player-chunk candidates in single-chunk mode', () => {
    // Two candidates, only one is the player chunk. Source records requests
    // for both (driven by the player-chunk one only).
    const requests: ChunkKey[] = [];
    const fakeSource: IChunkSource = {
      isConnected: () => true,
      requestChunk: (face, lod, cx, cy) => {
        requests.push({ face, lod, cx, cy } as ChunkKey);
      },
      dispose: () => {},
    };
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, {
      isWebGL: false,
      chunkSource: fakeSource,
      candidateProvider: () => [
        { face: 0, lod: 5, cx: 15, cy: 15 },
        { face: 0, lod: 5, cx: 16, cy: 15 },
      ],
      playerChunkProvider: () => ({ face: 0, lod: 5, cx: 15, cy: 15 }),
    });
    r.tick(cam);
    expect(requests).toEqual([{ face: 0, lod: 5, cx: 15, cy: 15 }]);
    r.dispose();
  });
});

describe('GlobeRenderer.dispose', () => {
  it('is safe before initialize', () => {
    const r = new GlobeRenderer();
    expect(() => r.dispose()).not.toThrow();
  });

  it('is idempotent', () => {
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, { isWebGL: false });
    expect(() => {
      r.dispose();
      r.dispose();
    }).not.toThrow();
  });

  it('subsequent ticks are no-ops after dispose', () => {
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, { isWebGL: false });
    r.dispose();
    expect(() => r.tick(cam)).not.toThrow();
  });
});

describe('Stub layers throw with explicit story references', () => {
  it('TileMeshLayer.load throws with Story 5.6 / 5.7 / 6.5', async () => {
    const { TileMeshLayer } = await import('./TileMeshLayer.js');
    const layer = new TileMeshLayer(minimalConfig);
    const stub: ChunkData = {
      planetId: 'p', face: 0, lod: 5, cx: 0, cy: 0,
      length: 1, width: 1, height: 1, heights: [[0]],
    };
    expect(() => layer.load({ face: 0, lod: 5, cx: 0, cy: 0 }, stub)).toThrow(
      /not implemented.*Story 5\.6.*5\.7.*6\.5/s,
    );
  });

  it('ImpostorSphere.initialize throws with Story 6.4', async () => {
    const { ImpostorSphere } = await import('./ImpostorSphere.js');
    const s = new ImpostorSphere(minimalConfig);
    expect(() => s.initialize()).toThrow(/not implemented.*Story 6\.4/);
  });
});
