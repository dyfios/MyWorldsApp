// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the WorldRendering base class — the planet-module GlobeRenderer is the
// only thing under test here, so we don't need to load 4000 lines of
// WorldRendererFactory + its UnityEngine/REST dependencies.
vi.mock('../WorldRendererFactory', () => ({
  WorldRendering: class WorldRendering {
    protected config?: unknown;
    initialize(_config: unknown): Promise<void> {
      return Promise.resolve();
    }
    dispose(): void {}
  },
}));

// WorldConfig is a structural type — the tests just hand a minimal object.
vi.mock('../../types/config', () => ({}));

import { GlobeRenderer } from './GlobeRenderer.js';
import type { CameraState } from './ChunkStreamer.js';

const camera: CameraState = {
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  altitudeMeters: 500,
};

const minimalPlanetConfig = {
  planet: {
    planetId: 'test-planet',
    radiusMeters: 25_000,
    nExponent: 5,
    biomeMapUrl: 'https://example/biome.png',
    chunkServiceBaseUrl: 'https://example/chunks',
  },
};

describe('GlobeRenderer.initialize', () => {
  let originalEnvironment: unknown;

  beforeEach(() => {
    originalEnvironment = (globalThis as { Environment?: unknown }).Environment;
  });

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete (globalThis as { Environment?: unknown }).Environment;
    } else {
      (globalThis as { Environment?: unknown }).Environment = originalEnvironment;
    }
  });

  it('throws when WorldConfig has no .planet section', async () => {
    const r = new GlobeRenderer();
    await expect(r.initialize({} as never)).rejects.toThrow(/missing .planet section/i);
  });

  it('initializes layers + streamer with default budget on non-WebGL', async () => {
    const r = new GlobeRenderer({ isWebGL: false });
    await r.initialize(minimalPlanetConfig as never);
    // After init, tick should not throw — proves streamer is wired.
    await expect(r.tick(camera)).resolves.toBeUndefined();
  });

  it('initializes with WEBGL_BUDGET when isWebGL=true', async () => {
    const r = new GlobeRenderer({ isWebGL: true });
    await r.initialize(minimalPlanetConfig as never);
    // Same surface — just confirming the flag path doesn't crash.
    await expect(r.tick(camera)).resolves.toBeUndefined();
  });
});

describe('GlobeRenderer.tick', () => {
  it('is a no-op before initialize (no streamer wired yet)', async () => {
    const r = new GlobeRenderer();
    await expect(r.tick(camera)).resolves.toBeUndefined();
  });

  it('passes candidates from candidateProvider through the streamer', async () => {
    const candidates = [{ face: 0 as const, lod: 5, cx: 1, cy: 1 }];
    let called = 0;
    const r = new GlobeRenderer({
      isWebGL: false,
      candidateProvider: () => {
        called++;
        return candidates;
      },
    });
    await r.initialize(minimalPlanetConfig as never);
    await r.tick(camera);
    expect(called).toBe(1);
  });

  it('fetches chunks from chunkSource for TerrainEntity-phase candidates', async () => {
    // Camera at altitude=500m → phaseForAltitude returns TerrainEntity. Pick
    // a non-corner chunk so canHandle is true.
    const requested: Array<[number, number, number, number]> = [];
    const fakeSource = {
      requestChunk: (face: number, lod: number, cx: number, cy: number) => {
        requested.push([face, lod, cx, cy]);
        return Promise.resolve({
          planetId: 'test-planet',
          face, lod, cx, cy,
          length: 1000, width: 1000, height: 100,
          heights: [[0]],
        });
      },
      dispose: () => {},
    };
    const r = new GlobeRenderer({
      isWebGL: false,
      chunkSource: fakeSource,
      candidateProvider: () => [{ face: 0, lod: 5, cx: 15, cy: 15 }],
    });
    await r.initialize(minimalPlanetConfig as never);
    await r.tick(camera);
    expect(requested).toEqual([[0, 5, 15, 15]]);
  });

  it('logs and continues when chunkSource.requestChunk rejects (does not throw)', async () => {
    const fakeSource = {
      requestChunk: () => Promise.reject(new Error('upstream gone')),
      dispose: () => {},
    };
    const r = new GlobeRenderer({
      isWebGL: false,
      chunkSource: fakeSource,
      candidateProvider: () => [{ face: 0, lod: 5, cx: 15, cy: 15 }],
    });
    await r.initialize(minimalPlanetConfig as never);
    await expect(r.tick(camera)).resolves.toBeUndefined();
  });
});

describe('GlobeRenderer.dispose', () => {
  it('is safe before initialize (no streamer / layers)', () => {
    const r = new GlobeRenderer();
    expect(() => r.dispose()).not.toThrow();
  });

  it('cleans up layers + streamer; further ticks become no-ops', async () => {
    const r = new GlobeRenderer({ isWebGL: false });
    await r.initialize(minimalPlanetConfig as never);
    r.dispose();
    // After dispose, streamer is null again — tick must short-circuit.
    await expect(r.tick(camera)).resolves.toBeUndefined();
  });

  it('is idempotent', async () => {
    const r = new GlobeRenderer({ isWebGL: false });
    await r.initialize(minimalPlanetConfig as never);
    expect(() => {
      r.dispose();
      r.dispose();
    }).not.toThrow();
  });
});

describe('GlobeRenderer floating-origin integration (Story 6.2)', () => {
  let originalEnvironment: unknown;

  beforeEach(() => {
    originalEnvironment = (globalThis as { Environment?: unknown }).Environment;
  });

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete (globalThis as { Environment?: unknown }).Environment;
    } else {
      (globalThis as { Environment?: unknown }).Environment = originalEnvironment;
    }
  });

  it('calls Environment.SetTrackedCharacterEntity with the avatar when one is provided', async () => {
    const calls: unknown[] = [];
    (globalThis as { Environment?: unknown }).Environment = {
      SetTrackedCharacterEntity: (e: unknown) => calls.push(e),
    };
    const fakeAvatar = { id: 'avatar-1' };
    const r = new GlobeRenderer({ isWebGL: false, playerAvatarEntity: fakeAvatar });
    await r.initialize(minimalPlanetConfig as never);
    expect(calls).toEqual([fakeAvatar]);
  });

  it('skips the call when no avatar is provided (no throw)', async () => {
    let called = false;
    (globalThis as { Environment?: unknown }).Environment = {
      SetTrackedCharacterEntity: () => (called = true),
    };
    const r = new GlobeRenderer({ isWebGL: false });
    await r.initialize(minimalPlanetConfig as never);
    expect(called).toBe(false);
  });

  it('swallows errors from SetTrackedCharacterEntity (does not abort initialize)', async () => {
    (globalThis as { Environment?: unknown }).Environment = {
      SetTrackedCharacterEntity: () => {
        throw new Error('runtime not ready');
      },
    };
    const r = new GlobeRenderer({ isWebGL: false, playerAvatarEntity: {} });
    await expect(r.initialize(minimalPlanetConfig as never)).resolves.toBeUndefined();
  });

  it('handles missing global Environment (test harness, headless contexts)', async () => {
    delete (globalThis as { Environment?: unknown }).Environment;
    const r = new GlobeRenderer({ isWebGL: false, playerAvatarEntity: {} });
    await expect(r.initialize(minimalPlanetConfig as never)).resolves.toBeUndefined();
  });
});
