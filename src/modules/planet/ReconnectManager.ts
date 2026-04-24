// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * ReconnectManager (Story 8.5).
 *
 * Tracks the last-applied revision, issues a `wos/planet/{id}/sync/resync`
 * request on reconnect, and applies the server's replay to local state.
 * If the server responds with `soft_reset: true`, the manager signals the
 * caller to forget cached chunks — they'll be re-fetched lazily as the
 * player streams terrain.
 *
 * Also subscribes to `wos/planet/{id}/broadcast/modification` (Story 8.1)
 * to track the latest revision during normal operation.
 */

import type { ChunkKey } from './types.js';

export interface BroadcastModification {
  planet_id: string;
  revision: number;
  region: ChunkKey;
  points: ReadonlyArray<{
    x: number;
    y: number;
    z: number;
    height: number;
    layer_masks?: string;
    layer_heights?: string;
  }>;
  received_at: number;
}

export interface IReconnectTransport {
  /** Subscribe to an MQTT topic, invoking handler per message. Returns an unsubscribe fn. */
  subscribe(topic: string, handler: (payload: unknown) => void): () => void;
  /** Issue a request/response MQTT roundtrip. */
  request(topic: string, body: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface ReconnectManagerOptions {
  planetId: string;
  transport: IReconnectTransport;
  /** Called for every applied modification (broadcast or replay). */
  onModification: (mod: BroadcastModification) => void;
  /** Called when server signals soft_reset — local chunk cache should drop. */
  onSoftReset: (latestRevision: number) => void;
  logger?: { warn?: (m: string, ctx?: unknown) => void };
}

export class ReconnectManager {
  private readonly opts: ReconnectManagerOptions;
  private lastRevision = 0;
  private unsubscribe: (() => void) | null = null;

  constructor(opts: ReconnectManagerOptions) {
    this.opts = opts;
  }

  /** Start tracking broadcasts. Call once when joining a planet. */
  start(): void {
    const topic = `wos/planet/${this.opts.planetId}/broadcast/modification`;
    this.unsubscribe = this.opts.transport.subscribe(topic, (payload) => {
      const mod = payload as BroadcastModification;
      if (!mod || typeof mod.revision !== 'number') return;
      if (mod.revision <= this.lastRevision) return; // deduped / out-of-order late arrival
      this.lastRevision = mod.revision;
      this.opts.onModification(mod);
    });
  }

  /** Stop tracking. Idempotent. */
  stop(): void {
    try {
      this.unsubscribe?.();
    } catch (e) {
      this.opts.logger?.warn?.('ReconnectManager: unsubscribe failed', { err: String(e) });
    }
    this.unsubscribe = null;
  }

  /** Latest known revision — exposed for tests and debug panels. */
  getRevision(): number {
    return this.lastRevision;
  }

  /** Called after transport reconnects. Requests everything since our revision. */
  async resync(): Promise<void> {
    const topic = `wos/planet/${this.opts.planetId}/sync/resync`;
    const res = (await this.opts.transport.request(topic, {
      since_revision: this.lastRevision,
    })) as {
      success?: boolean;
      soft_reset?: boolean;
      latest_revision?: number;
      modifications?: BroadcastModification[];
      error?: { code?: string; message?: string };
    };
    if (!res.success) {
      this.opts.logger?.warn?.('ReconnectManager: resync failed', {
        code: res.error?.code,
        message: res.error?.message,
      });
      return;
    }
    if (res.soft_reset) {
      const latest = res.latest_revision ?? this.lastRevision;
      this.lastRevision = latest;
      this.opts.onSoftReset(latest);
      return;
    }
    const mods = res.modifications ?? [];
    for (const mod of mods) {
      if (mod.revision > this.lastRevision) {
        this.lastRevision = mod.revision;
        this.opts.onModification(mod);
      }
    }
    if (typeof res.latest_revision === 'number' && res.latest_revision > this.lastRevision) {
      this.lastRevision = res.latest_revision;
    }
  }
}
