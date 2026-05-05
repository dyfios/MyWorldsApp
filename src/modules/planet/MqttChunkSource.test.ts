// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MqttChunkSource } from './MqttChunkSource.js';
import type { ChunkData } from './MqttChunkSource.js';

// ---- Test doubles for WebVerse globals -------------------------------------

interface RecordedConstructorArgs {
  host: string;
  port: number;
  useTLS: boolean;
  transport: string;
  onConnected: string;
  onDisconnected: string;
  onStateChanged: string;
  onError: string;
  path: string;
}

interface RecordedSubscribe {
  topic: string;
  onAcknowledged: string;
  onMessage: string;
}

interface RecordedPublish {
  topic: string;
  message: string;
}

class FakeMQTTClient {
  static lastInstance: FakeMQTTClient | null = null;
  static instances: FakeMQTTClient[] = [];

  readonly ctor: RecordedConstructorArgs;
  connectCalls = 0;
  disconnectCalls = 0;
  readonly subscribes: RecordedSubscribe[] = [];
  readonly publishes: RecordedPublish[] = [];

  constructor(
    host: string,
    port: number,
    useTLS: boolean,
    transport: string,
    onConnected: string,
    onDisconnected: string,
    onStateChanged: string,
    onError: string,
    path = '/mqtt',
  ) {
    this.ctor = {
      host,
      port,
      useTLS,
      transport,
      onConnected,
      onDisconnected,
      onStateChanged,
      onError,
      path,
    };
    FakeMQTTClient.lastInstance = this;
    FakeMQTTClient.instances.push(this);
  }

  Connect(): boolean {
    this.connectCalls++;
    return true;
  }
  Disconnect(): boolean {
    this.disconnectCalls++;
    return true;
  }
  Subscribe(topic: string, onAcknowledged: string, onMessage: string): boolean {
    this.subscribes.push({ topic, onAcknowledged, onMessage });
    return true;
  }
  UnSubscribe(_topic: string, _onAcknowledged: string): boolean {
    return true;
  }
  Publish(topic: string, message: string): boolean {
    this.publishes.push({ topic, message });
    return true;
  }
}

let uuidCounter = 0;
const FakeUUID = {
  NewUUID: () => {
    uuidCounter++;
    const id = `00000000-0000-0000-0000-${String(uuidCounter).padStart(12, '0')}`;
    return { ToString: () => id };
  },
};

function fireGlobal(name: string, ...args: unknown[]): void {
  const g = globalThis as Record<string, unknown>;
  const fn = g[name];
  if (typeof fn !== 'function') {
    throw new Error(`global '${name}' is not a function (got ${typeof fn})`);
  }
  (fn as (...a: unknown[]) => unknown)(...args);
}

beforeEach(() => {
  uuidCounter = 0;
  FakeMQTTClient.lastInstance = null;
  FakeMQTTClient.instances = [];
  const g = globalThis as Record<string, unknown>;
  g.MQTTClient = FakeMQTTClient;
  g.UUID = FakeUUID;
  g.Logging = {
    Log: () => {},
    LogWarning: () => {},
    LogError: () => {},
  };
});

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.MQTTClient;
  delete g.UUID;
  delete g.Logging;
});

// ---- Tests -----------------------------------------------------------------

/**
 * `dispose()` rejects any in-flight connect promise — tests that don't await
 * connect to completion must attach a no-op .catch so the rejection isn't
 * surfaced as Unhandled.
 */
function silenceUnhandled<T>(p: Promise<T>): Promise<T> {
  p.catch(() => { /* expected: dispose-induced rejection */ });
  return p;
}

describe('MqttChunkSource.connect', () => {
  it('constructs MQTTClient with provided host/port/transport and dispatches Connect', () => {
    const src = new MqttChunkSource({
      planetId: 'p1',
      mqttHost: '192.168.1.143',
      mqttPort: 9001,
      mqttTransport: 'websockets',
    });
    silenceUnhandled(src.connect());
    const m = FakeMQTTClient.lastInstance!;
    expect(m).not.toBeNull();
    expect(m.ctor.host).toBe('192.168.1.143');
    expect(m.ctor.port).toBe(9001);
    expect(m.ctor.transport).toBe('websockets');
    expect(m.ctor.useTLS).toBe(false);
    expect(m.connectCalls).toBe(1);
    src.dispose();
  });

  it('defaults transport to websockets when not specified', () => {
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    silenceUnhandled(src.connect());
    expect(FakeMQTTClient.lastInstance!.ctor.transport).toBe('websockets');
    src.dispose();
  });

  it('subscribes to a unique response topic when broker fires onConnected', async () => {
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    const p = src.connect();
    const m = FakeMQTTClient.lastInstance!;
    fireGlobal(m.ctor.onConnected); // simulate broker connect event
    expect(m.subscribes.length).toBe(1);
    expect(m.subscribes[0].topic).toMatch(/^mwapp\/planet\/response\//);
    fireGlobal(m.subscribes[0].onAcknowledged, 'ok');
    await expect(p).resolves.toBeUndefined();
    src.dispose();
  });

  it('rejects connect promise on disconnect before subscribe-ack', async () => {
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    const p = src.connect();
    const m = FakeMQTTClient.lastInstance!;
    fireGlobal(m.ctor.onDisconnected, 128, 'TCP closed by remote peer');
    await expect(p).rejects.toThrow(/disconnected.*128.*TCP closed/);
    src.dispose();
  });

  it('returns the same promise on repeated connect() calls', () => {
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    const p1 = silenceUnhandled(src.connect());
    const p2 = silenceUnhandled(src.connect());
    expect(p1).toBe(p2);
    src.dispose();
  });

  it('rejects connect after dispose', async () => {
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.dispose();
    await expect(src.connect()).rejects.toThrow(/disposed/);
  });
});

describe('MqttChunkSource.requestChunk', () => {
  // Helper: connect + subscribe-ack the source so requestChunk is usable.
  async function connectedSource(): Promise<{ src: MqttChunkSource; mqtt: FakeMQTTClient }> {
    const src = new MqttChunkSource({
      planetId: 'smoke-planet',
      mqttHost: 'h',
      mqttPort: 9001,
      requestTimeoutMs: 50,
    });
    const p = src.connect();
    const mqtt = FakeMQTTClient.lastInstance!;
    fireGlobal(mqtt.ctor.onConnected);
    fireGlobal(mqtt.subscribes[0].onAcknowledged, 'ok');
    await p;
    return { src, mqtt };
  }

  it('publishes to the planet request topic with face/lod/cx/cy + correlation-id', async () => {
    const { src, mqtt } = await connectedSource();
    silenceUnhandled(src.requestChunk(0, 2, 1, 1));
    expect(mqtt.publishes.length).toBe(1);
    expect(mqtt.publishes[0].topic).toBe('wos/planet/smoke-planet/chunk/request');
    const sent = JSON.parse(mqtt.publishes[0].message);
    expect(sent.face).toBe(0);
    expect(sent.lod).toBe(2);
    expect(sent.cx).toBe(1);
    expect(sent.cy).toBe(1);
    expect(typeof sent['correlation-id']).toBe('string');
    expect(sent['response-topic']).toMatch(/^mwapp\/planet\/response\//);
    src.dispose();
  });

  it('resolves with chunk data when a matching success response arrives', async () => {
    const { src, mqtt } = await connectedSource();
    const promise = src.requestChunk(0, 2, 0, 0);
    const corrId = JSON.parse(mqtt.publishes[0].message)['correlation-id'];
    const chunk: ChunkData = {
      planetId: 'smoke-planet',
      face: 0,
      lod: 2,
      cx: 0,
      cy: 0,
      length: 9817,
      width: 9817,
      height: 1500,
      heights: [
        [0, 1],
        [2, 3],
      ],
    };
    fireGlobal(mqtt.subscribes[0].onMessage, '', '', JSON.stringify({
      'correlation-id': corrId,
      success: true,
      chunk,
    }));
    await expect(promise).resolves.toMatchObject({ planetId: 'smoke-planet', face: 0 });
    src.dispose();
  });

  it('rejects when the response indicates an error', async () => {
    const { src, mqtt } = await connectedSource();
    const promise = src.requestChunk(0, 2, 0, 0);
    const corrId = JSON.parse(mqtt.publishes[0].message)['correlation-id'];
    fireGlobal(mqtt.subscribes[0].onMessage, '', '', JSON.stringify({
      'correlation-id': corrId,
      success: false,
      error: { code: 'NOT_FOUND', message: 'planet not found' },
    }));
    await expect(promise).rejects.toThrow(/NOT_FOUND.*planet not found/);
    src.dispose();
  });

  it('ignores responses with unknown correlation-id', async () => {
    const { src, mqtt } = await connectedSource();
    // Track settlement with a single .then handler that catches both branches
    // — guarantees the pending rejection is handled even if dispose() fires
    // before any other consumer is attached.
    let outcome: { status: 'fulfilled' | 'rejected'; reason?: unknown } | null = null;
    src.requestChunk(0, 2, 0, 0).then(
      () => { outcome = { status: 'fulfilled' }; },
      (e: unknown) => { outcome = { status: 'rejected', reason: e }; },
    );

    fireGlobal(mqtt.subscribes[0].onMessage, '', '', JSON.stringify({
      'correlation-id': 'not-mine',
      success: true,
      chunk: { planetId: 'x', face: 0, lod: 0, cx: 0, cy: 0, length: 1, width: 1, height: 1, heights: [[0]] },
    }));
    // Yield: confirm the unknown response did NOT settle the request.
    await new Promise((r) => setTimeout(r, 5));
    expect(outcome).toBeNull();

    src.dispose();
    // Allow microtask to deliver the rejection to our handler.
    await new Promise((r) => setTimeout(r, 0));
    expect(outcome).not.toBeNull();
    expect(outcome!.status).toBe('rejected');
    expect((outcome!.reason as Error).message).toMatch(/disposed/);
  });

  it('rejects with timeout when no response arrives in requestTimeoutMs', async () => {
    const { src } = await connectedSource();
    const promise = src.requestChunk(0, 2, 0, 0);
    await expect(promise).rejects.toThrow(/timeout/);
    src.dispose();
  });

  it('rejects all pending requests on disconnect', async () => {
    const { src, mqtt } = await connectedSource();
    const p = src.requestChunk(0, 2, 0, 0);
    fireGlobal(mqtt.ctor.onDisconnected, 128, 'TCP closed');
    await expect(p).rejects.toThrow(/disconnected/);
    src.dispose();
  });

  it('rejects requestChunk before connect() completes', async () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    await expect(src.requestChunk(0, 2, 0, 0)).rejects.toThrow(/not connected/);
    src.dispose();
  });
});

describe('MqttChunkSource.dispose', () => {
  it('clears global callbacks', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    silenceUnhandled(src.connect());
    const mqtt = FakeMQTTClient.lastInstance!;
    const cbName = mqtt.ctor.onConnected;
    expect(typeof (globalThis as Record<string, unknown>)[cbName]).toBe('function');
    src.dispose();
    expect((globalThis as Record<string, unknown>)[cbName]).toBeUndefined();
  });

  it('disconnects the MQTT client', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    silenceUnhandled(src.connect());
    const mqtt = FakeMQTTClient.lastInstance!;
    src.dispose();
    expect(mqtt.disconnectCalls).toBe(1);
  });

  it('two simultaneous instances use distinct response topics + callback names', () => {
    const a = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    const b = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    silenceUnhandled(a.connect());
    const ma = FakeMQTTClient.instances[0];
    silenceUnhandled(b.connect());
    const mb = FakeMQTTClient.instances[1];
    expect(ma.ctor.onConnected).not.toBe(mb.ctor.onConnected);
    a.dispose();
    b.dispose();
  });

  it('dispose is idempotent', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    silenceUnhandled(src.connect());
    src.dispose();
    expect(() => src.dispose()).not.toThrow();
  });
});
