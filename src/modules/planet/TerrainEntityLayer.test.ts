// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect } from 'vitest';
import { TerrainEntityLayer } from './TerrainEntityLayer.js';
import type { PlanetSceneConfig, ChunkKey, ChunkData } from './types.js';

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

const chunk = (key: ChunkKey, heights: number[][] = [[0, 1], [1, 0]]): ChunkData => ({
  planetId: 'p1',
  face: key.face,
  lod: key.lod,
  cx: key.cx,
  cy: key.cy,
  length: 1000,
  width: 1000,
  height: 100,
  heights,
});

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
    const key = k(0, 5, 15, 15);
    await layer.load(key, chunk(key));
    expect(layer.size()).toBe(1);
  });

  it('refuses to load a cube-corner tile (canHandle returns false)', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    const key = k(0, 5, 0, 0);
    await layer.load(key, chunk(key));
    expect(layer.size()).toBe(0);
  });

  it('refuses to load any tile on WebGL', async () => {
    const layer = new TerrainEntityLayer(cfg, true);
    const key = k(0, 5, 15, 15);
    await layer.load(key, chunk(key));
    expect(layer.size()).toBe(0);
  });

  it('load is idempotent for the same chunk', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    const key = k(0, 5, 15, 15);
    await layer.load(key, chunk(key));
    await layer.load(key, chunk(key));
    expect(layer.size()).toBe(1);
  });

  it('unload removes the tile', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    const key = k(0, 5, 15, 15);
    await layer.load(key, chunk(key));
    layer.unload(key);
    expect(layer.size()).toBe(0);
  });

  it('dispose clears all loaded tiles', async () => {
    const layer = new TerrainEntityLayer(cfg, false);
    const k1 = k(0, 5, 15, 15);
    const k2 = k(0, 5, 14, 14);
    await layer.load(k1, chunk(k1));
    await layer.load(k2, chunk(k2));
    layer.dispose();
    expect(layer.size()).toBe(0);
  });
});

describe('TerrainEntityLayer with WebVerse runtime globals', () => {
  // These tests inject mocks for TerrainEntity / Color / Vector3 / Quaternion /
  // UUID so we exercise the real-rendering branch. afterEach cleans them up.

  interface MockEntity {
    visible: boolean;
    interactionState: number | null;
    deleted: boolean;
    SetVisibility: (v: boolean) => void;
    SetInteractionState: (s: number) => void;
    Delete: () => void;
  }

  interface CreateCall {
    length: number;
    width: number;
    height: number;
    heights: number[][];
    layers: unknown[];
    position: { x: number; y: number; z: number };
    onLoaded: string;
  }

  let createCalls: CreateCall[] = [];
  let lastEntity: MockEntity | null = null;

  const installRuntime = (): void => {
    const g = globalThis as Record<string, unknown>;
    g.TerrainEntity = {
      CreateHeightmap: (
        _parent: unknown,
        length: number,
        width: number,
        height: number,
        heights: number[][],
        layers: unknown[],
        _layerMasks: unknown,
        position: { x: number; y: number; z: number },
        _rotation: unknown,
        _id?: string,
        _tag?: string,
        onLoaded?: string,
      ) => {
        createCalls.push({ length, width, height, heights, layers, position, onLoaded: onLoaded ?? '' });
        const entity: MockEntity = {
          visible: false,
          interactionState: null,
          deleted: false,
          SetVisibility(v) { this.visible = v; },
          SetInteractionState(s) { this.interactionState = s; },
          Delete() { this.deleted = true; },
        };
        lastEntity = entity;
        // Synchronously fire the onLoaded callback to mimic the runtime.
        if (onLoaded) {
          const cb = (globalThis as Record<string, unknown>)[onLoaded];
          if (typeof cb === 'function') (cb as (e: unknown) => void)(entity);
        }
        return entity;
      },
    };
    g.Color = class { constructor(public r: number, public g: number, public b: number, public a: number) {} };
    g.Vector3 = class { constructor(public x: number, public y: number, public z: number) {} };
    g.Quaternion = { identity: { x: 0, y: 0, z: 0, w: 1 } };
    let ctr = 0;
    g.UUID = { NewUUID: () => { ctr++; return { ToString: () => `00000000-0000-0000-0000-${String(ctr).padStart(12, '0')}` }; } };
  };

  const uninstallRuntime = (): void => {
    const g = globalThis as Record<string, unknown>;
    delete g.TerrainEntity;
    delete g.Color;
    delete g.Vector3;
    delete g.Quaternion;
    delete g.UUID;
    createCalls = [];
    lastEntity = null;
  };

  it('shifts heights by fixed sea-level offset and positions tile in XZ grid', async () => {
    installRuntime();
    try {
      const layer = new TerrainEntityLayer(cfg, false);
      const key = k(0, 5, 17, 16); // non-corner; cx=17, cy=16
      const heightsBeforeShift = [[-34, -10], [5, 18]];
      const c0 = chunk(key, heightsBeforeShift);
      c0.length = 1227; c0.width = 1227; c0.height = 1500;
      await layer.load(key, c0);
      expect(createCalls.length).toBe(1);
      const c = createCalls[0]!;
      // FIXED offset (300m) applied to every value — adjacent tiles align.
      expect(Math.min(...c.heights.flat())).toBe(-34 + 300);
      expect(Math.max(...c.heights.flat())).toBe(18 + 300);
      // Envelope = chunk's declared height (plugin's CHUNK_HEIGHT_ENVELOPE).
      expect(c.height).toBe(1500);
      // Position: cx*length on X, -300 on Y, cy*width on Z.
      expect((c.position as { x: number; y: number; z: number }).x).toBe(17 * 1227);
      expect(c.position.y).toBe(-300);
      expect((c.position as { x: number; y: number; z: number }).z).toBe(16 * 1227);
      expect(c.layers.length).toBe(1);
    } finally {
      uninstallRuntime();
    }
  });

  it('onLoaded callback enables visibility + Physical interaction state', async () => {
    installRuntime();
    try {
      const layer = new TerrainEntityLayer(cfg, false);
      const key = k(0, 5, 15, 15);
      await layer.load(key, chunk(key));
      expect(lastEntity).not.toBeNull();
      expect(lastEntity!.visible).toBe(true);
      expect(lastEntity!.interactionState).toBe(2);
    } finally {
      uninstallRuntime();
    }
  });

  it('unload calls Delete on the runtime entity', async () => {
    installRuntime();
    try {
      const layer = new TerrainEntityLayer(cfg, false);
      const key = k(0, 5, 15, 15);
      await layer.load(key, chunk(key));
      const entity = lastEntity!;
      expect(entity.deleted).toBe(false);
      layer.unload(key);
      expect(entity.deleted).toBe(true);
      expect(layer.size()).toBe(0);
    } finally {
      uninstallRuntime();
    }
  });
});
