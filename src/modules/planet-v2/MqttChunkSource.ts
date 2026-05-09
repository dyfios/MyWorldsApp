// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * MqttChunkSource (planet-v2) — callback-based chunk fetcher.
 *
 * Talks to `wos-plugin-planet`'s `wos/planet/{planetId}/chunk/request` topic.
 * Subscribes to a unique-per-instance response topic; correlation-id
 * matches request to response.
 *
 * **Promise-free across the network boundary.** JINT's microtask scheduler
 * does not reliably resume awaiters that suspend on callback-resolved
 * Promises. v2 mirrors WebVerse's existing renderers (TiledSurfaceRenderer,
 * StaticSurfaceRenderer) and `PlanetMvpLoader` — every async surface uses
 * bare global function names + the `timeHandler.CallAsynchronously` wrapper
 * the C# MQTTClient binds to.
 */

import {
  callbackPrefix,
  installSetTimeoutPolyfill,
  logInfo,
  logWarn,
} from './jint-runtime.js';
import { webverse } from './webverse-types.js';
import type { MQTTClientInstance } from './webverse-types.js';
import type {
  ChunkData,
  ChunkMeshData,
  ChunkMeshRequestCallbacks,
  ChunkRequestCallbacks,
  CubeFace,
  IChunkSource,
  MeshQuality,
} from './types.js';

export interface MqttChunkSourceOptions {
  planetId: string;
  mqttHost: string;
  mqttPort: number;
  /**
   * 'tcp' or 'websockets'. Defaults to 'websockets' — raw TCP currently
   * fails outbound from the WebVerse host's network path on this LAN
   * (proven empirically; root cause not pinned). 'websockets' on 9001
   * works.
   */
  mqttTransport?: 'tcp' | 'websockets';
  /** Per-request timeout in **milliseconds**. Default 60s. */
  requestTimeoutMs?: number;
  /** Connect timeout in **milliseconds**. Default 10s. */
  connectTimeoutMs?: number;
}

/**
 * Discriminator for the pending map. The MQTT response topic is shared
 * across both request kinds; the source matches each response back to its
 * pending entry by correlation-id and dispatches by `kind`.
 */

interface PendingChunk {
  kind: 'chunk';
  callbacks: ChunkRequestCallbacks;
  timerId: number | null;
}

interface PendingChunkMesh {
  kind: 'chunkMesh';
  callbacks: ChunkMeshRequestCallbacks;
  timerId: number | null;
}

type PendingRequest = PendingChunk | PendingChunkMesh;

interface ChunkResponseEnvelope {
  'correlation-id'?: string;
  success?: boolean;
  error?: { code?: string; message?: string };
  /** Present on chunk-heights responses. */
  chunk?: ChunkData;
  /** Present on chunk-mesh responses. */
  chunk_mesh?: ChunkMeshData;
}

/**
 * Suffixes used in callback names for this source. Listed once so install +
 * uninstall stay in sync.
 */
const CB_SUFFIXES = [
  'connect',
  'disconnect',
  'stateChange',
  'error',
  'subAck',
  'message',
] as const;

type CallbackSuffix = (typeof CB_SUFFIXES)[number];

export class MqttChunkSource implements IChunkSource {
  private readonly opts: MqttChunkSourceOptions;
  private readonly responseTopic: string;
  private readonly cbPrefix: string;
  /** Short tag for log-line disambiguation across multiple sources. */
  private readonly tag: string;
  private client: MQTTClientInstance | null = null;
  private connectStarted = false;
  private subscribed = false;
  private disposed = false;
  private connectTimerId: number | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private onConnectedListeners: Array<() => void> = [];
  private onConnectErrorListeners: Array<(err: Error) => void> = [];

  constructor(opts: MqttChunkSourceOptions) {
    this.opts = opts;
    installSetTimeoutPolyfill();
    const w = webverse();
    const id = w.UUID?.NewUUID?.()?.ToString() ?? `nouuid-${Date.now()}`;
    this.responseTopic = `mwapp/planet-v2/response/${id}`;
    this.cbPrefix = callbackPrefix(`mqttsrc_${this.opts.planetId}`);
    this.tag = `MqttChunkSource[${id.slice(0, 8)}]`;
  }

  /**
   * Open MQTT, subscribe to response topic. Fire-and-forget. Optional
   * notifications fire when the SUBACK arrives (or earlier on error).
   * Subsequent calls are no-ops if connect has already been initiated.
   */
  connect(onConnected?: () => void, onError?: (err: Error) => void): void {
    if (this.disposed) {
      onError?.(new Error(`${this.tag}: disposed`));
      return;
    }
    if (onConnected) this.onConnectedListeners.push(onConnected);
    if (onError) this.onConnectErrorListeners.push(onError);
    if (this.subscribed) {
      this.fireConnected();
      return;
    }
    if (this.connectStarted) return;
    this.connectStarted = true;

    this.installCallbacks();

    const connectTimeoutMs = this.opts.connectTimeoutMs ?? 10_000;
    this.connectTimerId = setTimeout(() => {
      this.failConnect(
        new Error(
          `${this.tag}: connect timeout after ${connectTimeoutMs}ms (broker unreachable?)`,
        ),
      );
    }, connectTimeoutMs) as unknown as number;

    const w = webverse();
    if (!w.MQTTClient) {
      this.failConnect(new Error(`${this.tag}: MQTTClient global is not available`));
      return;
    }
    const transport = this.opts.mqttTransport ?? 'websockets';
    try {
      this.client = new w.MQTTClient(
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
      logInfo(
        `${this.tag}: Connect() dispatched (${transport} ${this.opts.mqttHost}:${this.opts.mqttPort})`,
      );
    } catch (e) {
      this.failConnect(e instanceof Error ? e : new Error(String(e)));
    }
  }

  isConnected(): boolean {
    return this.subscribed && !this.disposed;
  }

  requestChunk(
    face: CubeFace,
    lod: number,
    cx: number,
    cy: number,
    callbacks: ChunkRequestCallbacks,
  ): void {
    this.publishRequest(
      `wos/planet/${this.opts.planetId}/chunk/request`,
      { face, lod, cx, cy },
      { kind: 'chunk', callbacks, timerId: null },
      callbacks,
      `face=${face} lod=${lod} cx=${cx} cy=${cy}`,
    );
  }

  requestChunkMesh(
    face: CubeFace,
    lod: number,
    cx: number,
    cy: number,
    callbacks: ChunkMeshRequestCallbacks,
    quality?: MeshQuality,
  ): void {
    this.publishRequest(
      `wos/planet/${this.opts.planetId}/chunk/mesh/request`,
      { face, lod, cx, cy, ...(quality !== undefined ? { quality } : {}) },
      { kind: 'chunkMesh', callbacks, timerId: null },
      callbacks,
      `face=${face} lod=${lod} cx=${cx} cy=${cy} mesh`,
    );
  }

  /**
   * Shared publish path for both request kinds. Sets up the pending entry,
   * arms the timeout, builds the payload, publishes, and rolls back on
   * synchronous publish failure. Pre-flight rejection (disposed / not
   * connected) fires the supplied callback's onError immediately.
   */
  private publishRequest(
    requestTopic: string,
    extraFields: Record<string, unknown>,
    pending: PendingRequest,
    callbacks: ChunkRequestCallbacks | ChunkMeshRequestCallbacks,
    timeoutDescription: string,
  ): void {
    if (this.disposed) {
      callbacks.onError?.(new Error(`${this.tag}: disposed`));
      return;
    }
    if (!this.client || !this.subscribed) {
      callbacks.onError?.(new Error(`${this.tag}: not connected`));
      return;
    }

    const w = webverse();
    const correlationId =
      w.UUID?.NewUUID?.()?.ToString() ?? `ad-hoc-${Date.now()}-${Math.random()}`;
    const timeoutMs = this.opts.requestTimeoutMs ?? 60_000;

    pending.timerId = setTimeout(() => {
      this.pending.delete(correlationId);
      callbacks.onError?.(
        new Error(`${this.tag}: request timeout for ${timeoutDescription}`),
      );
    }, timeoutMs) as unknown as number;
    this.pending.set(correlationId, pending);

    const payload = JSON.stringify({
      'correlation-id': correlationId,
      'response-topic': this.responseTopic,
      ...extraFields,
    });
    try {
      this.client.Publish(requestTopic, payload);
    } catch (e) {
      if (pending.timerId !== null) clearTimeout(pending.timerId);
      this.pending.delete(correlationId);
      callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
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
    const errListeners = this.onConnectErrorListeners.slice();
    this.onConnectedListeners = [];
    this.onConnectErrorListeners = [];
    for (const l of errListeners) {
      try {
        l(new Error(`${this.tag}: disposed before connection completed`));
      } catch (_e) {
        /* best-effort */
      }
    }

    try {
      this.client?.Disconnect();
    } catch (_e) {
      /* best-effort */
    }
    this.client = null;
    this.uninstallCallbacks();
  }

  /* ──────────────────── Callback wiring ──────────────────────────────── */

  private cbName(suffix: CallbackSuffix): string {
    return `${this.cbPrefix}${suffix}`;
  }

  private installCallbacks(): void {
    const g = globalThis as Record<string, unknown>;
    g[this.cbName('connect')] = (): void => this.onConnected();
    g[this.cbName('disconnect')] = (code: number, msg: string): void =>
      this.onDisconnected(code, msg);
    g[this.cbName('stateChange')] = (_from: string, _to: string): void => {
      /* no-op */
    };
    g[this.cbName('error')] = (msg: string): void => this.onErrorEvent(msg);
    g[this.cbName('subAck')] = (_msg: string): void => this.onSubAck();
    g[this.cbName('message')] = (
      _topic: string,
      _topicName: string,
      payload: string,
    ): void => this.onMessage(payload);
  }

  private uninstallCallbacks(): void {
    const g = globalThis as Record<string, unknown>;
    for (const s of CB_SUFFIXES) {
      delete g[this.cbName(s)];
    }
  }

  private onConnected(): void {
    if (!this.client || this.disposed) return;
    logInfo(`${this.tag}: connected; subscribing to ${this.responseTopic}`);
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
    logInfo(`${this.tag}: subscribed; ready for requests`);
    this.fireConnected();
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

  private onErrorEvent(msg: string): void {
    logWarn(`${this.tag}: error event ${msg}`);
    // Don't fail anything here — the disconnect callback is authoritative
    // for connection loss. Generic error events can be transient.
  }

  private onMessage(payload: string): void {
    let parsed: ChunkResponseEnvelope | null;
    try {
      parsed = JSON.parse(payload) as ChunkResponseEnvelope;
    } catch (e) {
      logWarn(`${this.tag}: malformed JSON in response (${(e as Error).message})`);
      return;
    }
    if (!parsed) return;
    const corrId = parsed['correlation-id'];
    if (!corrId) {
      logWarn(`${this.tag}: response missing correlation-id`);
      return;
    }
    const pending = this.pending.get(corrId);
    if (!pending) return; // late / duplicate — ignore silently
    this.pending.delete(corrId);
    if (pending.timerId !== null) clearTimeout(pending.timerId);

    // Error envelope handling is identical regardless of request kind.
    if (parsed.success !== true) {
      const code = parsed.error?.code ?? 'UNKNOWN';
      const message = parsed.error?.message ?? 'no payload in response';
      pending.callbacks.onError?.(
        new Error(`${this.tag}: request failed (${code}): ${message}`),
      );
      return;
    }

    // Dispatch the success body by request kind. Chunk-heights responses
    // carry `chunk`; mesh responses carry `chunk_mesh`. A mismatched
    // response (e.g., heights-shaped reply for a mesh request) fires
    // onError so the caller can retry / log meaningfully.
    if (pending.kind === 'chunk') {
      if (!parsed.chunk) {
        pending.callbacks.onError?.(
          new Error(`${this.tag}: chunk response missing 'chunk' field`),
        );
        return;
      }
      try {
        pending.callbacks.onSuccess(parsed.chunk);
      } catch (e) {
        logWarn(`${this.tag}: chunk onSuccess threw: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }
    // pending.kind === 'chunkMesh'
    if (!parsed.chunk_mesh) {
      pending.callbacks.onError?.(
        new Error(`${this.tag}: mesh response missing 'chunk_mesh' field`),
      );
      return;
    }
    try {
      pending.callbacks.onSuccess(parsed.chunk_mesh);
    } catch (e) {
      logWarn(`${this.tag}: chunk_mesh onSuccess threw: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private fireConnected(): void {
    const ok = this.onConnectedListeners.slice();
    this.onConnectedListeners = [];
    this.onConnectErrorListeners = [];
    for (const l of ok) {
      try {
        l();
      } catch (_e) {
        /* best-effort */
      }
    }
  }

  private failConnect(err: Error): void {
    if (this.connectTimerId !== null) {
      clearTimeout(this.connectTimerId);
      this.connectTimerId = null;
    }
    const errListeners = this.onConnectErrorListeners.slice();
    this.onConnectedListeners = [];
    this.onConnectErrorListeners = [];
    for (const l of errListeners) {
      try {
        l(err);
      } catch (_e) {
        /* best-effort */
      }
    }
  }
}
