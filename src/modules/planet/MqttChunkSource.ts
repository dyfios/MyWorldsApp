// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * MqttChunkSource — request/response client for wos-plugin-planet chunks.
 *
 * Wraps a single WebVerse MQTTClient instance and exposes a Promise-based
 * `requestChunk(face, lod, cx, cy)` that publishes to the planet's request
 * topic, waits for a correlated response on a per-instance unique topic,
 * and resolves with the parsed chunk payload (or rejects on timeout / error
 * response / disconnection).
 *
 * Lifecycle: `connect()` → `requestChunk()` (any number of times) → `dispose()`.
 * Multiple instances may coexist; each gets its own response topic + global
 * callback names (UUID-suffixed) so they don't collide.
 *
 * Designed for production use by TerrainEntityLayer / TileMeshLayer; the
 * throwaway PlanetMvpLoader stays in place as a debug-friendly variant for
 * single-shot smoke tests.
 */

import type { ChunkData, IChunkSource } from './types.js';

declare const Logging: { Log: (m: string) => void; LogWarning: (m: string) => void };
declare const UUID: { NewUUID: () => { ToString: () => string } };

// Re-export so existing callers (`import { ChunkData } from './MqttChunkSource'`)
// keep working — `IChunkSource` and `ChunkData` are canonical in `./types`.
export type { ChunkData, IChunkSource };

export interface MqttChunkSourceOptions {
  planetId: string;
  mqttHost: string;
  mqttPort: number;
  /** Default 'websockets' since raw TCP currently fails from WebVerse hosts. */
  mqttTransport?: 'tcp' | 'websockets';
  /** Per-request timeout. Default 15000ms. */
  requestTimeoutMs?: number;
}

interface PendingRequest {
  resolve: (c: ChunkData) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ChunkResponseMessage {
  'correlation-id'?: string;
  success?: boolean;
  error?: { code?: string; message?: string };
  chunk?: ChunkData;
}

export class MqttChunkSource implements IChunkSource {
  private readonly opts: MqttChunkSourceOptions;
  private client: MQTTClient | null = null;
  private readonly responseTopic: string;
  private readonly cbPrefix: string;
  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((err: Error) => void) | null = null;
  private subscribed = false;
  private disposed = false;
  private readonly pending = new Map<string, PendingRequest>();
  /** Identifying tag for log lines so multiple sources are distinguishable. */
  private readonly tag: string;

  constructor(opts: MqttChunkSourceOptions) {
    this.opts = opts;
    const id = UUID.NewUUID().ToString();
    this.responseTopic = `mwapp/planet/response/${id}`;
    // Callback names must be valid JS identifiers — strip dashes from UUID.
    this.cbPrefix = `__mwapp_planet_${id.replace(/-/g, '')}_`;
    this.tag = `MqttChunkSource[${id.slice(0, 8)}]`;
  }

  /**
   * Connects to the broker and subscribes to the response topic. Resolves
   * after the SUBSCRIBE acknowledgement so the caller can immediately publish
   * requests without racing the broker's subscription registration.
   */
  connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;
    if (this.disposed) return Promise.reject(new Error(`${this.tag}: disposed`));

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
    });

    this.installCallbacks();

    const transport = this.opts.mqttTransport ?? 'websockets';
    try {
      this.client = new MQTTClient(
        this.opts.mqttHost,
        this.opts.mqttPort,
        false, // useTLS
        transport,
        this.cbName('connect'),
        this.cbName('disconnect'),
        this.cbName('stateChange'),
        this.cbName('error'),
        '/mqtt',
      );
      this.client.Connect();
      Logging.Log(`${this.tag}: Connect() dispatched (${transport} ${this.opts.mqttHost}:${this.opts.mqttPort})`);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.failConnect(err);
    }

    return this.connectPromise;
  }

  /**
   * Publishes a chunk request and resolves with the response chunk data.
   * Rejects on timeout, error response from the plugin, or disposal.
   */
  requestChunk(face: number, lod: number, cx: number, cy: number): Promise<ChunkData> {
    if (this.disposed) return Promise.reject(new Error(`${this.tag}: disposed`));
    if (!this.client || !this.subscribed) {
      return Promise.reject(new Error(`${this.tag}: not connected — call connect() first`));
    }

    const correlationId = UUID.NewUUID().ToString();
    const timeoutMs = this.opts.requestTimeoutMs ?? 15000;

    return new Promise<ChunkData>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(correlationId);
        reject(new Error(`${this.tag}: request timeout for face=${face} lod=${lod} cx=${cx} cy=${cy}`));
      }, timeoutMs);

      this.pending.set(correlationId, { resolve, reject, timer });

      const requestTopic = `wos/planet/${this.opts.planetId}/chunk/request`;
      const payload = JSON.stringify({
        'correlation-id': correlationId,
        'response-topic': this.responseTopic,
        face,
        lod,
        cx,
        cy,
      });
      try {
        this.client!.Publish(requestTopic, payload);
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(correlationId);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(`${this.tag}: disposed`));
    }
    this.pending.clear();

    if (this.connectReject) {
      this.connectReject(new Error(`${this.tag}: disposed before connection completed`));
      this.connectReject = null;
      this.connectResolve = null;
    }

    try {
      this.client?.Disconnect();
    } catch (_e) {
      /* ignore — disposal is best-effort */
    }
    this.client = null;

    this.uninstallCallbacks();
  }

  // ---- Callback wiring ---------------------------------------------------

  private cbName(suffix: string): string {
    return `${this.cbPrefix}${suffix}`;
  }

  private installCallbacks(): void {
    const g = globalThis as Record<string, unknown>;
    g[this.cbName('connect')] = (): void => this.onConnected();
    g[this.cbName('disconnect')] = (code: number, msg: string): void =>
      this.onDisconnected(code, msg);
    g[this.cbName('stateChange')] = (_from: string, _to: string): void => {
      /* no-op — connect/disconnect callbacks already cover what we care about */
    };
    g[this.cbName('error')] = (msg: string): void => this.onError(msg);
    g[this.cbName('subAck')] = (_msg: string): void => this.onSubAck();
    g[this.cbName('message')] = (_topic: string, _topicName: string, payload: string): void =>
      this.onMessage(payload);
  }

  private uninstallCallbacks(): void {
    const g = globalThis as Record<string, unknown>;
    delete g[this.cbName('connect')];
    delete g[this.cbName('disconnect')];
    delete g[this.cbName('stateChange')];
    delete g[this.cbName('error')];
    delete g[this.cbName('subAck')];
    delete g[this.cbName('message')];
  }

  private onConnected(): void {
    if (!this.client || this.disposed) return;
    Logging.Log(`${this.tag}: connected; subscribing to ${this.responseTopic}`);
    try {
      this.client.Subscribe(this.responseTopic, this.cbName('subAck'), this.cbName('message'));
    } catch (e) {
      this.failConnect(e instanceof Error ? e : new Error(String(e)));
    }
  }

  private onSubAck(): void {
    this.subscribed = true;
    if (this.connectResolve) {
      this.connectResolve();
      this.connectResolve = null;
      this.connectReject = null;
      Logging.Log(`${this.tag}: subscribed; ready for requests`);
    }
  }

  private onDisconnected(code: number, msg: string): void {
    const err = new Error(`${this.tag}: disconnected code=${code} msg=${msg}`);
    this.failConnect(err);
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pending.clear();
    this.subscribed = false;
  }

  private onError(msg: string): void {
    Logging.LogWarning(`${this.tag}: error event ${msg}`);
    // Don't fail pending requests on a generic error event — the disconnect
    // callback is the authoritative signal for connection loss.
  }

  private onMessage(payload: string): void {
    let parsed: ChunkResponseMessage | null;
    try {
      parsed = JSON.parse(payload) as ChunkResponseMessage;
    } catch (e) {
      Logging.LogWarning(`${this.tag}: malformed JSON in response (${(e as Error).message})`);
      return;
    }
    if (!parsed) return;
    const corrId = parsed['correlation-id'];
    if (!corrId) {
      Logging.LogWarning(`${this.tag}: response missing correlation-id`);
      return;
    }
    const pending = this.pending.get(corrId);
    if (!pending) {
      // Late response or duplicate — ignore silently.
      return;
    }
    this.pending.delete(corrId);
    clearTimeout(pending.timer);

    if (parsed.success !== true || !parsed.chunk) {
      const code = parsed.error?.code ?? 'UNKNOWN';
      const message = parsed.error?.message ?? 'no chunk in response';
      pending.reject(new Error(`${this.tag}: chunk request failed (${code}): ${message}`));
      return;
    }

    pending.resolve(parsed.chunk);
  }

  private failConnect(err: Error): void {
    if (this.connectReject) {
      this.connectReject(err);
      this.connectReject = null;
      this.connectResolve = null;
    }
  }
}
