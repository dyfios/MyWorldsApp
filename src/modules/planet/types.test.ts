// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect } from 'vitest';
import {
  chunkKeyString,
  RenderPhase,
  DEFAULT_BUDGET,
  WEBGL_BUDGET,
} from './types.js';

describe('chunkKeyString', () => {
  it('produces deterministic format usable as Map key', () => {
    expect(chunkKeyString({ face: 0, lod: 5, cx: 3, cy: 7 })).toBe('0:5:3:7');
  });

  it('different chunks produce different strings', () => {
    const a = chunkKeyString({ face: 0, lod: 5, cx: 3, cy: 7 });
    const b = chunkKeyString({ face: 0, lod: 5, cx: 3, cy: 8 });
    expect(a).not.toBe(b);
  });

  it('same chunk produces same string (hash stability for Map keys)', () => {
    const k1 = { face: 2, lod: 4, cx: 1, cy: 2 } as const;
    const k2 = { face: 2 as const, lod: 4, cx: 1, cy: 2 };
    expect(chunkKeyString(k1)).toBe(chunkKeyString(k2));
  });
});

describe('streaming budgets', () => {
  it('WebGL budget is more conservative than default', () => {
    expect(WEBGL_BUDGET.lruCap).toBeLessThan(DEFAULT_BUDGET.lruCap);
    expect(WEBGL_BUDGET.loadRadiusMeters).toBeLessThan(DEFAULT_BUDGET.loadRadiusMeters);
    expect(WEBGL_BUDGET.unloadRadiusMeters).toBeLessThan(DEFAULT_BUDGET.unloadRadiusMeters);
  });

  it('unload radius exceeds load radius (hysteresis prevents thrashing)', () => {
    expect(DEFAULT_BUDGET.unloadRadiusMeters).toBeGreaterThan(DEFAULT_BUDGET.loadRadiusMeters);
    expect(WEBGL_BUDGET.unloadRadiusMeters).toBeGreaterThan(WEBGL_BUDGET.loadRadiusMeters);
  });
});

describe('RenderPhase enum', () => {
  it('covers the 4-layer pipeline plus unloaded', () => {
    expect(RenderPhase.Impostor).toBe('impostor');
    expect(RenderPhase.TileMesh).toBe('tilemesh');
    expect(RenderPhase.TerrainEntity).toBe('terrainentity');
    expect(RenderPhase.Unloaded).toBe('unloaded');
  });
});
