// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * MqttChunkSource — request/response client for wos-plugin-planet chunks.
 *
 * **Callback-based** to match MyWorldsApp's overall pattern (HTTPNetworking,
 * MQTTClient, Time.SetInterval all use global-function-name callbacks).
 * No Promise/async-await crossing the network boundary — JINT's microtask
 * scheduling for callback-resolved Promises is unreliable in WebVerse, which
 * is what was hanging the world earlier.
 *
 * Lifecycle:
 *   const src = new MqttChunkSource(opts);
 *   src.connect();                          // fire-and-forget; subscribes to response topic
 *   src.requestChunk(face, lod, cx, cy, {   // returns immediately; callbacks fire later
 *     onSuccess: (chunk) => { ... },
 *     onError:   (err)   => { ... },        // optional
 *   });
 *   src.dispose();
 *
 * Multiple instances may coexist; each gets its own UUID-suffixed response
 * topic + global callback names so they don't collide.
 */

import type { ChunkData, ChunkRequestCallbacks, IChunkSource } from './types.js';

declare const Logging: { Log: (m: string) => void; LogWarning: (m: string) => void };
declare const UUID: { NewUUID: () => { ToString: () => string } };

// Re-export so existing callers (`import { ChunkData } from './MqttChunkSource'`)
// keep working — these types are canonical in `./types`.
export type { ChunkData, ChunkRequestCallbacks, IChunkSource };

export interface MqttChunkSourceOptions {
  planetId: string;
  mqttHost: string;
  mqttPort: number;
  /** Default 'websockets' since raw TCP currently fails from WebVerse hosts. */
  mqttTransport?: 'tcp' | 'websockets';
  /** Per-request timeout. Default 15000ms. */
  requestTimeoutMs?: number;
  /** Connect timeout (TCP/WS handshake + SUBACK). Default 10000ms. */
  connectTimeoutMs?: number;
}

interface PendingRequest {
  callbacks: ChunkRequestCallbacks;
  timerId: ReturnType<typeof setTimeout> | null;
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
  /** Identifying tag for log lines so multiple sources are distinguishable. */
  private readonly tag: string;
  private connectStarted = false;
  private subscribed = false;
  private disposed = false;
  private connectTimerId: ReturnType<typeof setTimeout> | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  /** Optional one-shot listeners for the next connect outcome. */
  private onConnectedListeners: Array<() => void> = [];
  private onConnectErrorListeners: Array<(err: Error) => void> = [];

  constructor(opts: MqttChunkSourceOptions) {
    this.opts = opts;
    const id = UUID.NewUUID().ToString();
    this.responseTopic = `mwapp/planet/response/${id}`;
    // Callback names must be valid JS identifiers — strip dashes from UUID.
    this.cbPrefix = `__mwapp_planet_${id.replace(/-/g, '')}_`;
    this.tag = `MqttChunkSource[${id.slice(0, 8)}]`;
  }

  /**
   * Open the MQTT connection and subscribe to the response topic.
   * Fire-and-forget. Optional `onConnected` / `onError` listeners receive a
   * one-shot notification when the subscribe completes (or fails).
   * Subsequent calls are no-ops if connect has already been initiated.
   */
  connect(onConnected?: () => void, onError?: (err: Error) => void): void {
    if (this.disposed) {
      onError?.(new Error(`${this.tag}: disposed`));
      return;
    }
    if (onConnected) this.onConnectedListeners.push(onConnected);
    if (onError) this.onConnectErrorListeners.push(onError);
    if (this.connectStarted) {
      // If already subscribed, fire onConnected immediately (next tick).
      if (this.subscribed) {
        this.fireOnConnected();
      }
      return;
    }
    this.connectStarted = true;

    this.installCallbacks();

    const connectTimeoutMs = this.opts.connectTimeoutMs ?? 10000;
    this.connectTimerId = setTimeout(() => {
      this.failConnect(new Error(`${this.tag}: connect timeout after ${connectTimeoutMs}ms (broker unreachable?)`));
    }, connectTimeoutMs);

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
  }

  /** True once the response-topic SUBACK has been received. */
  isConnected(): boolean {
    return this.subscribed && !this.disposed;
  }

  /**
   * Publish a chunk request. Returns immediately. Exactly one of
   * `callbacks.onSuccess` or `callbacks.onError` will fire later (or never,
   * if dispose() runs before the response arrives — pending requests are
   * rejected on dispose).
   *
   * Rejects synchronously via onError if the source isn't connected yet —
   * caller decides whether to retry on the next tick.
   */
  requestChunk(
    face: number,
    lod: number,
    cx: number,
    cy: number,
    callbacks: ChunkRequestCallbacks,
  ): void {
    if (this.disposed) {
      callbacks.onError?.(new Error(`${this.tag}: disposed`));
      return;
    }
    if (!this.client || !this.subscribed) {
      callbacks.onError?.(new Error(`${this.tag}: not connected`));
      return;
    }

    const correlationId = UUID.NewUUID().ToString();
    const timeoutMs = this.opts.requestTimeoutMs ?? 15000;
    const pending: PendingRequest = { callbacks, timerId: null };
    pending.timerId = setTimeout(() => {
      this.pending.delete(correlationId);
      callbacks.onError?.(new Error(
        `${this.tag}: request timeout for face=${face} lod=${lod} cx=${cx} cy=${cy}`,
      ));
    }, timeoutMs);
    this.pending.set(correlationId, pending);

    const requestTopic = `wos/planet/${this.opts.planetId}/chunk/request`;
    const payload = JSON.stringify({
      'correlation-id': correlationId,
      'response-topic': this.responseTopic,
      face, lod, cx, cy,
    });
    try {
      this.client.Publish(requestTopic, payload);
    } catch (e) {
      if (pending.timerId !== null) clearTimeout(pending.timerId);
      this.pending.delete(correlationId);
      callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * IChunkSource compatibility shim — wraps the callback API in a Promise.
   * GlobeRenderer's hot path uses `requestChunk` with callbacks directly to
   * avoid the JINT microtask hazard; this exists so existing IChunkSource
   * consumers (tests, future non-WebVerse callers) still work.
   */
  requestChunkPromise(face: number, lod: number, cx: number, cy: number): Promise<ChunkData> {
    return new Promise<ChunkData>((resolve, reject) => {
      this.requestChunk(face, lod, cx, cy, {
        onSuccess: resolve,
        onError: reject,
      });
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    for (const [, pending] of this.pending) {
      if (pending.timerId !== null) clearTimeout(pending.timerId);
      pending.callbacks.onError?.(new Error(`${this.tag}: disposed`));
    }
    this.pending.clear();

    if (this.connectTimerId !== null) {
      clearTimeout(this.connectTimerId);
      this.connectTimerId = null;
    }
    // Drain pending connect listeners with an error.
    const listeners = this.onConnectErrorListeners.slice();
    this.onConnectedListeners = [];
    this.onConnectErrorListeners = [];
    for (const l of listeners) {
      try { l(new Error(`${this.tag}: disposed before connection completed`)); }
      catch (_e) { /* best-effort */ }
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
    if (this.connectTimerId !== null) {
      clearTimeout(this.connectTimerId);
      this.connectTimerId = null;
    }
    Logging.Log(`${this.tag}: subscribed; ready for requests`);
    this.fireOnConnected();
  }

  private fireOnConnected(): void {
    const listeners = this.onConnectedListeners.slice();
    this.onConnectedListeners = [];
    this.onConnectErrorListeners = [];
    for (const l of listeners) {
      try { l(); } catch (_e) { /* best-effort */ }
    }
  }

  private onDisconnected(code: number, msg: string): void {
    const err = new Error(`${this.tag}: disconnected code=${code} msg=${msg}`);
    this.failConnect(err);
    for (const [, pending] of this.pending) {
      if (pending.timerId !== null) clearTimeout(pending.timerId);
      pending.callbacks.onError?.(err);
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
    if (pending.timerId !== null) clearTimeout(pending.timerId);

    if (parsed.success !== true || !parsed.chunk) {
      const code = parsed.error?.code ?? 'UNKNOWN';
      const message = parsed.error?.message ?? 'no chunk in response';
      pending.callbacks.onError?.(new Error(`${this.tag}: chunk request failed (${code}): ${message}`));
      return;
    }

    try { pending.callbacks.onSuccess(parsed.chunk); }
    catch (e) {
      Logging.LogWarning(`${this.tag}: onSuccess callback threw: ${(e as Error).message}`);
    }
  }

  private failConnect(err: Error): void {
    if (this.connectTimerId !== null) {
      clearTimeout(this.connectTimerId);
      this.connectTimerId = null;
    }
    const listeners = this.onConnectErrorListeners.slice();
    this.onConnectedListeners = [];
    this.onConnectErrorListeners = [];
    for (const l of listeners) {
      try { l(err); } catch (_e) { /* best-effort */ }
    }
  }
}
