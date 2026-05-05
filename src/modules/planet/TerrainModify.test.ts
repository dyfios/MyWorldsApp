// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect, beforeEach } from 'vitest';
import { TerrainModify, type ITerrainTransport, type TerrainDelta } from './TerrainModify.js';
import type { ChunkKey } from './types.js';

const k = (face: 0 | 1 | 2 | 3 | 4 | 5, lod: number, cx: number, cy: number): ChunkKey => ({
  face,
  lod,
  cx,
  cy,
});

const makeDelta = (
  region: ChunkKey,
  points: TerrainDelta['points'] = [{ x: 0, y: 0, z: 0, height: 100 }],
): TerrainDelta => ({
  region,
  points,
});

interface FakeTransport extends ITerrainTransport {
  calls: Array<{ topic: string; body: Record<string, unknown> }>;
  nextResponse: Record<string, unknown> | (() => Promise<Record<string, unknown>>);
}

function makeTransport(): FakeTransport {
  const t: FakeTransport = {
    calls: [],
    nextResponse: { success: true, revision: 1 },
    async submit(topic, body) {
      t.calls.push({ topic, body });
      const r = t.nextResponse;
      return typeof r === 'function' ? r() : r;
    },
  };
  return t;
}

describe('TerrainModify — input validation', () => {
  let transport: FakeTransport;
  let mod: TerrainModify;

  beforeEach(() => {
    transport = makeTransport();
    mod = new TerrainModify({ planetId: 'p1', transport });
  });

  it('rejects cube-corner regions with INVALID_INPUT (FR26)', async () => {
    // Corner: lod>=1 with cx and cy at 0 or max.
    const result = await mod.submit(makeDelta(k(0, 5, 0, 0)));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.message).toMatch(/terraforming unavailable/i);
    }
    // Transport must NOT have been called — client-side rejection.
    expect(transport.calls).toHaveLength(0);
  });

  it('rejects empty points array', async () => {
    const result = await mod.submit(makeDelta(k(0, 5, 1, 1), []));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.message).toMatch(/non-empty/);
    }
    expect(transport.calls).toHaveLength(0);
  });
});

describe('TerrainModify — submit happy path', () => {
  it('calls the correct topic with all required body fields', async () => {
    const transport = makeTransport();
    transport.nextResponse = { success: true, revision: 42 };
    const mod = new TerrainModify({
      planetId: 'p7',
      transport,
      userId: 'user-abc',
      correlationIdFactory: () => 'fixed-corr-id',
    });
    const delta = makeDelta(k(2, 5, 3, 4), [
      { x: 100, y: 0, z: 200, height: 50, layer_masks: 'm', layer_heights: 'h' },
    ]);
    const result = await mod.submit(delta);
    expect(result).toEqual({ success: true, revision: 42 });
    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].topic).toBe('wos/planet/p7/terrain/modify');
    expect(transport.calls[0].body).toMatchObject({
      'correlation-id': 'fixed-corr-id',
      'user-id': 'user-abc',
      face: 2,
      lod: 5,
      cx: 3,
      cy: 4,
      points: delta.points,
    });
  });

  it('uses the default correlation-id factory when none provided (unique per call)', async () => {
    const transport = makeTransport();
    const mod = new TerrainModify({ planetId: 'p1', transport });
    await mod.submit(makeDelta(k(0, 5, 1, 1)));
    await mod.submit(makeDelta(k(0, 5, 1, 1)));
    const id1 = transport.calls[0].body['correlation-id'] as string;
    const id2 = transport.calls[1].body['correlation-id'] as string;
    expect(id1).toMatch(/^tm-/);
    expect(id2).toMatch(/^tm-/);
    expect(id1).not.toBe(id2);
  });

  it('defaults revision to 0 when server omits it on success', async () => {
    const transport = makeTransport();
    transport.nextResponse = { success: true };
    const mod = new TerrainModify({ planetId: 'p1', transport });
    const result = await mod.submit(makeDelta(k(0, 5, 1, 1)));
    expect(result).toEqual({ success: true, revision: 0 });
  });
});

describe('TerrainModify — server error mapping', () => {
  it('maps server error envelope to TerrainSubmitOutcome', async () => {
    const transport = makeTransport();
    transport.nextResponse = {
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'not your tile' },
    };
    const mod = new TerrainModify({ planetId: 'p1', transport });
    const result = await mod.submit(makeDelta(k(0, 5, 1, 1)));
    expect(result).toEqual({
      success: false,
      code: 'PERMISSION_DENIED',
      message: 'not your tile',
    });
  });

  it('falls back to UNKNOWN code when server omits error envelope', async () => {
    const transport = makeTransport();
    transport.nextResponse = { success: false };
    const mod = new TerrainModify({ planetId: 'p1', transport });
    const result = await mod.submit(makeDelta(k(0, 5, 1, 1)));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('server rejected modification');
    }
  });

  it('catches transport throws and returns TRANSPORT_ERROR with the message', async () => {
    const transport = makeTransport();
    transport.nextResponse = () => Promise.reject(new Error('mqtt offline'));
    const mod = new TerrainModify({ planetId: 'p1', transport });
    const result = await mod.submit(makeDelta(k(0, 5, 1, 1)));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('TRANSPORT_ERROR');
      expect(result.message).toBe('mqtt offline');
    }
  });

  it('handles non-Error throws by stringifying', async () => {
    const transport = makeTransport();
    transport.nextResponse = () => Promise.reject('plain string failure');
    const mod = new TerrainModify({ planetId: 'p1', transport });
    const result = await mod.submit(makeDelta(k(0, 5, 1, 1)));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('TRANSPORT_ERROR');
      expect(result.message).toBe('plain string failure');
    }
  });
});
