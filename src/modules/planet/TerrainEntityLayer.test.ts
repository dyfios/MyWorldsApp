// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect } from 'vitest';
import { TerrainEntityLayer } from './TerrainEntityLayer.js';
import type { PlanetSceneConfig, ChunkKey } from './types.js';

const cfg: PlanetSceneConfig = {
  planetId: 'p1',
  radiusMeters: 25_000,
  nExponent: 5,
  biomeMapUrl: 'https://example/biome.png',
  chunkServiceBaseUrl: 'https://example/chunks',
};

const k = (face: 0 | 1 | 2 | 3 | 4 | 5, lod: number, cx: number, cy: number): ChunkKey => ({
  face,
  lod,
  cx,
  cy,
});

const HEIGHTS: number[][] = [[0, 1], [1, 0]];

describe('TerrainEntityLayer.canHandle', () => {
  it('returns false on WebGL platforms (AC 6.6)', () => {
    const layer = new TerrainEntityLayer(cfg, true);
    expect(layer.canHandle(k(0, 5, 15, 15))).toBe(false);
    expect(layer.canHandle(k(0, 5, 0, 0))).toBe(false);
  });

  it('returns false at cube corners on non-WebGL (Story 6.7)', () => {
    const layer = new TerrainEntityLayer(cfg, false);
    expect(layer.canHandle(k(0, 5, 0, 0))).toBe(false);
    expect(layer.canHandle(k(0, 5, 31, 31))).toBe(false);
  });

  it('returns true for non-corner tiles on non-WebGL', () => {
    const layer = new TerrainEntityLayer(cfg, false);
    expect(layer.canHandle(k(0, 5, 15, 15))).toBe(true);
  });
});

describe('TerrainEntityLayer.load', () => {
  it('loads a non-corner tile on non-WebGL', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    await layer.load(k(0, 5, 15, 15), HEIGHTS);
    expect(layer.size()).toBe(1);
  });

  it('refuses to load a cube-corner tile (canHandle returns false)', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    await layer.load(k(0, 5, 0, 0), HEIGHTS);
    expect(layer.size()).toBe(0);
  });

  it('refuses to load any tile on WebGL', async () => {
    const layer = new TerrainEntityLayer(cfg, true);
    await layer.load(k(0, 5, 15, 15), HEIGHTS);
    expect(layer.size()).toBe(0);
  });

  it('load is idempotent for the same chunk', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    await layer.load(k(0, 5, 15, 15), HEIGHTS);
    await layer.load(k(0, 5, 15, 15), HEIGHTS);
    expect(layer.size()).toBe(1);
  });

  it('unload removes the tile', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    await layer.load(k(0, 5, 15, 15), HEIGHTS);
    layer.unload(k(0, 5, 15, 15));
    expect(layer.size()).toBe(0);
  });

  it('dispose clears all loaded tiles', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    await layer.load(k(0, 5, 15, 15), HEIGHTS);
    await layer.load(k(0, 5, 14, 14), HEIGHTS);
    layer.dispose();
    expect(layer.size()).toBe(0);
  });
});
