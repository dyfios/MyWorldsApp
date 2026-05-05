// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReconnectManager,
  type BroadcastModification,
  type IReconnectTransport,
} from './ReconnectManager.js';
import type { ChunkKey } from './types.js';

const makeMod = (revision: number, planetId = 'p1'): BroadcastModification => ({
  planet_id: planetId,
  revision,
  region: { face: 0, lod: 5, cx: 0, cy: 0 } as ChunkKey,
  points: [{ x: 0, y: 0, z: 0, height: 100 }],
  received_at: Date.now(),
});

interface FakeTransport extends IReconnectTransport {
  publish: (topic: string, payload: unknown) => void;
  subscriptions: Map<string, Array<(p: unknown) => void>>;
  pendingResponses: Array<Record<string, unknown>>;
  lastRequest: { topic: string; body: Record<string, unknown> } | null;
}

function makeFakeTransport(): FakeTransport {
  const subs = new Map<string, Array<(p: unknown) => void>>();
  const responses: Array<Record<string, unknown>> = [];
  const transport: FakeTransport = {
    subscriptions: subs,
    pendingResponses: responses,
    lastRequest: null,
    subscribe(topic, handler) {
      const list = subs.get(topic) ?? [];
      list.push(handler);
      subs.set(topic, list);
      return () => {
        const cur = subs.get(topic);
        if (!cur) return;
        const idx = cur.indexOf(handler);
        if (idx >= 0) cur.splice(idx, 1);
      };
    },
    request(topic, body) {
      transport.lastRequest = { topic, body };
      const next = responses.shift();
      if (!next) return Promise.reject(new Error('no queued response'));
      return Promise.resolve(next);
    },
    publish(topic, payload) {
      const list = subs.get(topic) ?? [];
      for (const h of list) h(payload);
    },
  };
  return transport;
}

describe('ReconnectManager — broadcast tracking', () => {
  let transport: FakeTransport;
  let received: BroadcastModification[];
  let softResetCalls: number[];
  let mgr: ReconnectManager;

  beforeEach(() => {
    transport = makeFakeTransport();
    received = [];
    softResetCalls = [];
    mgr = new ReconnectManager({
      planetId: 'p1',
      transport,
      onModification: (mod) => received.push(mod),
      onSoftReset: (rev) => softResetCalls.push(rev),
    });
  });

  it('start() subscribes to the broadcast topic for the planet', () => {
    mgr.start();
    expect(transport.subscriptions.has('wos/planet/p1/broadcast/modification')).toBe(true);
  });

  it('applies broadcast modifications and tracks revision', () => {
    mgr.start();
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(1));
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(2));
    expect(received).toHaveLength(2);
    expect(mgr.getRevision()).toBe(2);
  });

  it('dedupes out-of-order or replayed broadcasts (revision <= lastRevision)', () => {
    mgr.start();
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(5));
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(3)); // late arrival
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(5)); // replay
    expect(received).toHaveLength(1);
    expect(received[0].revision).toBe(5);
    expect(mgr.getRevision()).toBe(5);
  });

  it('ignores malformed payloads without throwing', () => {
    mgr.start();
    transport.publish('wos/planet/p1/broadcast/modification', null);
    transport.publish('wos/planet/p1/broadcast/modification', { not_a: 'modification' });
    transport.publish('wos/planet/p1/broadcast/modification', { revision: 'not a number' });
    expect(received).toHaveLength(0);
    expect(mgr.getRevision()).toBe(0);
  });

  it('stop() unsubscribes (no further broadcasts received)', () => {
    mgr.start();
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(1));
    mgr.stop();
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(2));
    expect(received).toHaveLength(1);
  });

  it('stop() is idempotent', () => {
    mgr.start();
    expect(() => {
      mgr.stop();
      mgr.stop();
      mgr.stop();
    }).not.toThrow();
  });
});

describe('ReconnectManager — resync', () => {
  let transport: FakeTransport;
  let received: BroadcastModification[];
  let softResetCalls: number[];
  let mgr: ReconnectManager;

  beforeEach(() => {
    transport = makeFakeTransport();
    received = [];
    softResetCalls = [];
    mgr = new ReconnectManager({
      planetId: 'p1',
      transport,
      onModification: (mod) => received.push(mod),
      onSoftReset: (rev) => softResetCalls.push(rev),
    });
  });

  it('issues request to the resync topic with current revision', async () => {
    mgr.start();
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(7));
    transport.pendingResponses.push({ success: true, modifications: [] });
    await mgr.resync();
    expect(transport.lastRequest).toEqual({
      topic: 'wos/planet/p1/sync/resync',
      body: { since_revision: 7 },
    });
  });

  it('applies replay modifications strictly after lastRevision', async () => {
    mgr.start();
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(5));
    received.length = 0; // reset; we only care about replay deltas below
    transport.pendingResponses.push({
      success: true,
      modifications: [makeMod(4), makeMod(5), makeMod(6), makeMod(7)],
      latest_revision: 7,
    });
    await mgr.resync();
    // 4 and 5 are deduped (≤ lastRevision); 6 and 7 applied.
    expect(received.map((m) => m.revision)).toEqual([6, 7]);
    expect(mgr.getRevision()).toBe(7);
  });

  it('soft_reset triggers onSoftReset and updates revision to latest', async () => {
    mgr.start();
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(3));
    transport.pendingResponses.push({
      success: true,
      soft_reset: true,
      latest_revision: 42,
    });
    await mgr.resync();
    expect(softResetCalls).toEqual([42]);
    expect(mgr.getRevision()).toBe(42);
    // No replay modifications applied during soft reset.
    expect(received).toHaveLength(1); // only the original broadcast
  });

  it('soft_reset without latest_revision keeps current revision', async () => {
    mgr.start();
    transport.publish('wos/planet/p1/broadcast/modification', makeMod(9));
    transport.pendingResponses.push({ success: true, soft_reset: true });
    await mgr.resync();
    expect(softResetCalls).toEqual([9]);
    expect(mgr.getRevision()).toBe(9);
  });

  it('failed resync logs warning, does not throw or apply mods', async () => {
    let warnCalls = 0;
    const mgrWithLogger = new ReconnectManager({
      planetId: 'p1',
      transport,
      onModification: (m) => received.push(m),
      onSoftReset: (r) => softResetCalls.push(r),
      logger: { warn: () => warnCalls++ },
    });
    mgrWithLogger.start();
    transport.pendingResponses.push({
      success: false,
      error: { code: 'PLANET_NOT_FOUND', message: 'gone' },
    });
    await mgrWithLogger.resync();
    expect(warnCalls).toBe(1);
    expect(received).toHaveLength(0);
  });

  it('latest_revision in non-soft-reset response advances revision past empty replay', async () => {
    mgr.start();
    // Server says "you missed nothing applicable, but the world is at revision 100".
    transport.pendingResponses.push({
      success: true,
      modifications: [],
      latest_revision: 100,
    });
    await mgr.resync();
    expect(mgr.getRevision()).toBe(100);
  });
});
