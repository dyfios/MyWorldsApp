// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * TerrainModify — client-side bridge for sending terrain deltas to the server.
 *
 * Digger Pro (and any other terrain editor) is part of WebVerse; we do NOT
 * integrate Digger directly. Instead, callers hand us resolved heightmap
 * deltas (the points that changed, in world meters) and we route them to the
 * server's `wos/planet/{planetId}/terrain/modify` MQTT topic via REST.
 *
 * Cube-corner tiles are rejected client-side (Story 7.4 FR26) with a friendly
 * message — the server enforces the same rule defensively.
 */

import { ChunkKey } from './types.js';
import { isCubeCornerTile } from './CubeCornerPolicy.js';

export interface TerrainDelta {
  region: ChunkKey;
  points: Array<{
    x: number;
    y: number;
    z: number;
    height: number;
    layer_masks?: string;
    layer_heights?: string;
  }>;
}

export type TerrainSubmitOutcome =
  | { success: true; revision: number }
  | { success: false; code: string; message: string };

/** Transport hook — the caller supplies whatever REST/MQTT bridge is in play. */
export interface ITerrainTransport {
  submit(topic: string, body: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface TerrainModifyOptions {
  planetId: string;
  transport: ITerrainTransport;
  userId?: string;
  correlationIdFactory?: () => string;
}

export class TerrainModify {
  private readonly planetId: string;
  private readonly transport: ITerrainTransport;
  private readonly userId?: string;
  private readonly correlationIdFactory: () => string;

  constructor(opts: TerrainModifyOptions) {
    this.planetId = opts.planetId;
    this.transport = opts.transport;
    this.userId = opts.userId;
    this.correlationIdFactory =
      opts.correlationIdFactory ??
      (() => `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }

  /** Submit a delta. Resolves with success or the server's error envelope. */
  async submit(delta: TerrainDelta): Promise<TerrainSubmitOutcome> {
    if (isCubeCornerTile(delta.region)) {
      return {
        success: false,
        code: 'INVALID_INPUT',
        message: 'terraforming unavailable in this area',
      };
    }
    if (!delta.points || delta.points.length === 0) {
      return {
        success: false,
        code: 'INVALID_INPUT',
        message: 'points must be non-empty',
      };
    }
    const correlationId = this.correlationIdFactory();
    const topic = `wos/planet/${this.planetId}/terrain/modify`;
    const body = {
      'correlation-id': correlationId,
      'user-id': this.userId,
      face: delta.region.face,
      lod: delta.region.lod,
      cx: delta.region.cx,
      cy: delta.region.cy,
      points: delta.points,
    };
    try {
      const res = (await this.transport.submit(topic, body)) as {
        success?: boolean;
        revision?: number;
        error?: { code?: string; message?: string };
      };
      if (res.success) {
        return { success: true, revision: res.revision ?? 0 };
      }
      return {
        success: false,
        code: res.error?.code ?? 'UNKNOWN',
        message: res.error?.message ?? 'server rejected modification',
      };
    } catch (err) {
      return {
        success: false,
        code: 'TRANSPORT_ERROR',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
