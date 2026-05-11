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

// Position deep inside the player chunk (sideMeters/2) so the Story 6.6
// approach-zone pre-fetch in `tick` doesn't fire requests for neighbours
// the test isn't asserting about. sideMeters at lod=5/r=25000 is ~1227m;
// 600 puts us comfortably inside (>50m from any boundary). Tests that
// specifically exercise approach pre-fetch override `position`.
const cam: CameraState = {
  position: { x: 600, y: 0, z: 600 },
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
      requestChunkMesh: () => {},
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
      requestChunkMesh: () => {},
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

  it('pre-fetches heights for the player chunk only (not the whole candidate ring)', () => {
    // Heights are ~6 MB each on the wire; we only pre-fetch them where
    // they might be needed for a (hidden) TerrainEntity — the player
    // chunk now and any chunk in the approach zone. Mesh fetches for
    // the rest of the candidate ring happen separately via
    // TileMeshLayer.load → requestChunkMesh.
    const requests: ChunkKey[] = [];
    const fakeSource: IChunkSource = {
      isConnected: () => true,
      requestChunk: (face, lod, cx, cy) => {
        requests.push({ face, lod, cx, cy } as ChunkKey);
      },
      requestChunkMesh: () => {},
      dispose: () => {},
    };
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, {
      isWebGL: false,
      chunkSource: fakeSource,
      candidateProvider: () => [
        { face: 0, lod: 5, cx: 15, cy: 15 },
        { face: 0, lod: 5, cx: 16, cy: 15 },
        { face: 0, lod: 5, cx: 17, cy: 15 },
      ],
      playerChunkProvider: () => ({ face: 0, lod: 5, cx: 15, cy: 15 }),
    });
    r.tick(cam); // cam is deep inside player chunk → no approach pre-fetch
    expect(requests).toContainEqual({ face: 0, lod: 5, cx: 15, cy: 15 });
    expect(requests).not.toContainEqual({ face: 0, lod: 5, cx: 16, cy: 15 });
    expect(requests).not.toContainEqual({ face: 0, lod: 5, cx: 17, cy: 15 });
    r.dispose();
  });

  it('routes player chunks at cube corners through TileMesh, not TerrainEntity', () => {
    // Story 6.7 (Phase 1): cube-corner chunks (cx ∈ {0, last} AND cy ∈
    // {0, last}) can't render as Unity Terrains — their grid doesn't
    // tile cleanly. The dispatcher must downgrade them to TileMesh
    // even when the player is standing on them. We observe this by
    // watching for a mesh fetch (TileMesh path) rather than a heights
    // fetch (TE path). At nExp=5 the last index is 31, so (0, 0) is a
    // corner chunk; we set the origin to (0, 0) and place the player
    // there. WebVerse globals are stubbed so TileMeshLayer.load reaches
    // requestChunkMesh.
    const g = globalThis as Record<string, unknown>;
    g.MeshEntity = { Create: () => {} };
    g.Vector3 = function Vector3(this: unknown) { /* stub */ } as unknown as object;
    g.Quaternion = { identity: {} };
    g.UUID = { NewUUID: () => ({ ToString: () => 'test-uuid' }) };
    try {
      const meshFetches: ChunkKey[] = [];
      const fakeSource: IChunkSource = {
        isConnected: () => true,
        requestChunk: () => {},
        requestChunkMesh: (face, lod, cx, cy) => {
          meshFetches.push({ face, lod, cx, cy } as ChunkKey);
        },
        dispose: () => {},
      };
      const r = new GlobeRenderer();
      r.initialize(
        { ...minimalConfig, originChunk: { face: 0, cx: 0, cy: 0 } },
        {
          isWebGL: false,
          chunkSource: fakeSource,
          candidateProvider: () => [{ face: 0, lod: 5, cx: 0, cy: 0 }],
          playerChunkProvider: () => ({ face: 0, lod: 5, cx: 0, cy: 0 }),
        },
      );
      r.tick(cam);
      expect(meshFetches).toContainEqual({ face: 0, lod: 5, cx: 0, cy: 0 });
      r.dispose();
    } finally {
      delete g.MeshEntity;
      delete g.Vector3;
      delete g.Quaternion;
      delete g.UUID;
    }
  });

  it('pre-fetches the cross-face neighbor when player is approaching the east edge of the face', () => {
    // Story 6.7 Phase 2a: equator traversal. From face 0 (POS_X) the
    // east neighbor of the rightmost column (cx=31) is face 5 (NEG_Z)
    // cx=0. When the player is within 50m of that east boundary, the
    // approach pre-fetch should target NEG_Z, not "off the edge" with
    // a clamp+drop. sideMeters at lod=5 / r=25000m ≈ 1227m. Origin at
    // (face=0, cx=15). To place the player on (face=0, cx=31, cy=15)
    // near its east edge: position.x ≈ 17 * sideMeters - 50.
    const requests: ChunkKey[] = [];
    const fakeSource: IChunkSource = {
      isConnected: () => true,
      requestChunk: (face, lod, cx, cy) => {
        requests.push({ face, lod, cx, cy } as ChunkKey);
      },
      requestChunkMesh: () => {},
      dispose: () => {},
    };
    const r = new GlobeRenderer();
    const sideMeters = (Math.PI * 25_000) / (2 * 32);
    r.initialize(minimalConfig, {
      isWebGL: false,
      chunkSource: fakeSource,
      candidateProvider: () => [{ face: 0, lod: 5, cx: 31, cy: 15 }],
      playerChunkProvider: () => ({ face: 0, lod: 5, cx: 31, cy: 15 }),
    });
    r.tick({
      position: { x: 17 * sideMeters - 10, y: 0, z: 600 },
      velocity: { x: 0, y: 0, z: 0 },
      altitudeMeters: 100,
    });
    expect(requests).toContainEqual({ face: 5, lod: 5, cx: 0, cy: 15 });
    r.dispose();
  });

  it('pre-fetches the -X neighbor when the player is within 50m of the chunk boundary', () => {
    const requests: ChunkKey[] = [];
    const fakeSource: IChunkSource = {
      isConnected: () => true,
      requestChunk: (face, lod, cx, cy) => {
        requests.push({ face, lod, cx, cy } as ChunkKey);
      },
      requestChunkMesh: () => {},
      dispose: () => {},
    };
    const r = new GlobeRenderer();
    r.initialize(minimalConfig, {
      isWebGL: false,
      chunkSource: fakeSource,
      // Just the player chunk as a candidate so the only requests we see
      // are the pre-fetch calls (plus the player chunk's own load).
      candidateProvider: () => [{ face: 0, lod: 5, cx: 15, cy: 15 }],
      playerChunkProvider: () => ({ face: 0, lod: 5, cx: 15, cy: 15 }),
    });
    // Player at world X=10 — within 50m of the player chunk's -X edge.
    r.tick({
      position: { x: 10, y: 0, z: 600 },
      velocity: { x: 0, y: 0, z: 0 },
      altitudeMeters: 100,
    });
    // Expect: player chunk request + (14, 15) pre-fetch.
    expect(requests).toContainEqual({ face: 0, lod: 5, cx: 15, cy: 15 });
    expect(requests).toContainEqual({ face: 0, lod: 5, cx: 14, cy: 15 });
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

describe('Stub layers — visible failure modes', () => {
  it('TileMeshLayer.load returns false (defers) when chunkSource is not connected', async () => {
    const { TileMeshLayer } = await import('./TileMeshLayer.js');
    const layer = new TileMeshLayer(minimalConfig, {
      chunkSource: {
        isConnected: () => false,
        requestChunk: () => {},
        requestChunkMesh: () => {},
        dispose: () => {},
      },
    });
    const stub: ChunkData = {
      planetId: 'p', face: 0, lod: 5, cx: 0, cy: 0,
      length: 1, width: 1, height: 1, heights: [[0]],
    };
    expect(layer.load({ face: 0, lod: 5, cx: 0, cy: 0 }, stub)).toBe(false);
    expect(layer.size()).toBe(0);
  });

  it('ImpostorSphere.initialize throws with Story 6.4', async () => {
    const { ImpostorSphere } = await import('./ImpostorSphere.js');
    const s = new ImpostorSphere(minimalConfig);
    expect(() => s.initialize()).toThrow(/not implemented.*Story 6\.4/);
  });
});
