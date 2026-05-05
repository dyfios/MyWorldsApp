// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect, beforeEach } from 'vitest';
import { TileMeshLayer } from './TileMeshLayer.js';
import type { PlanetSceneConfig, ChunkKey } from './types.js';

const cfg: PlanetSceneConfig = {
  planetId: 'world42',
  radiusMeters: 25_000,
  nExponent: 5,
  biomeMapUrl: 'https://example/biome.png',
  chunkServiceBaseUrl: 'https://chunks.example',
};

const k = (face: 0 | 1 | 2 | 3 | 4 | 5, lod: number, cx: number, cy: number): ChunkKey => ({
  face,
  lod,
  cx,
  cy,
});

describe('TileMeshLayer.tileUrl', () => {
  it('formats the chunk URL with planet, face, lod, cx, cy', () => {
    const layer = new TileMeshLayer(cfg);
    expect(layer.tileUrl(k(2, 5, 7, 3))).toBe(
      'https://chunks.example/planet/world42/tile/2/5/7/3.glb',
    );
  });
});

describe('TileMeshLayer lifecycle', () => {
  let layer: TileMeshLayer;

  beforeEach(() => {
    layer = new TileMeshLayer(cfg);
  });

  it('starts empty', () => {
    expect(layer.size()).toBe(0);
  });

  it('load adds a tile slot', async () => {
    await layer.load(k(0, 5, 0, 0));
    expect(layer.size()).toBe(1);
  });

  it('load is idempotent for the same chunk key', async () => {
    await layer.load(k(0, 5, 0, 0));
    await layer.load(k(0, 5, 0, 0));
    expect(layer.size()).toBe(1);
  });

  it('unload removes the tile', async () => {
    await layer.load(k(0, 5, 0, 0));
    layer.unload(k(0, 5, 0, 0));
    expect(layer.size()).toBe(0);
  });

  it('unload of unknown chunk is a no-op', () => {
    expect(() => layer.unload(k(0, 5, 9, 9))).not.toThrow();
    expect(layer.size()).toBe(0);
  });

  it('dispose clears all tracked tiles', async () => {
    await layer.load(k(0, 5, 0, 0));
    await layer.load(k(0, 5, 1, 1));
    layer.dispose();
    expect(layer.size()).toBe(0);
  });
});
