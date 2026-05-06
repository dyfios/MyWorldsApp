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

describe('MqttChunkSource.connect', () => {
  it('constructs MQTTClient with provided host/port/transport and dispatches Connect', () => {
    const src = new MqttChunkSource({
      planetId: 'p1',
      mqttHost: '192.168.1.143',
      mqttPort: 9001,
      mqttTransport: 'websockets',
    });
    src.connect();
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
    src.connect();
    expect(FakeMQTTClient.lastInstance!.ctor.transport).toBe('websockets');
    src.dispose();
  });

  it('fires onConnected once SUBACK arrives', () => {
    let connected = false;
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.connect(() => { connected = true; });
    const m = FakeMQTTClient.lastInstance!;
    fireGlobal(m.ctor.onConnected);
    expect(m.subscribes.length).toBe(1);
    expect(m.subscribes[0].topic).toMatch(/^mwapp\/planet\/response\//);
    fireGlobal(m.subscribes[0].onAcknowledged, 'ok');
    expect(connected).toBe(true);
    expect(src.isConnected()).toBe(true);
    src.dispose();
  });

  it('fires onError when broker disconnects before SUBACK', () => {
    let errMsg: string | null = null;
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.connect(undefined, (e) => { errMsg = e.message; });
    const m = FakeMQTTClient.lastInstance!;
    fireGlobal(m.ctor.onDisconnected, 128, 'TCP closed by remote peer');
    expect(errMsg).toMatch(/disconnected.*128.*TCP closed/);
    src.dispose();
  });

  it('fires onConnected immediately if already connected when called again', () => {
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.connect();
    const m = FakeMQTTClient.lastInstance!;
    fireGlobal(m.ctor.onConnected);
    fireGlobal(m.subscribes[0].onAcknowledged, 'ok');
    expect(src.isConnected()).toBe(true);

    let secondConnectFired = false;
    src.connect(() => { secondConnectFired = true; });
    expect(secondConnectFired).toBe(true);
    // No second MQTTClient instance was created.
    expect(FakeMQTTClient.instances.length).toBe(1);
    src.dispose();
  });

  it('fires onError immediately when called after dispose', () => {
    let errMsg: string | null = null;
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.dispose();
    src.connect(undefined, (e) => { errMsg = e.message; });
    expect(errMsg).toMatch(/disposed/);
  });

  it('fires onError on configurable connect timeout when broker never SUBACKs', async () => {
    let errMsg: string | null = null;
    const src = new MqttChunkSource({
      planetId: 'p1',
      mqttHost: 'h',
      mqttPort: 9001,
      connectTimeoutMs: 20,
    });
    src.connect(undefined, (e) => { errMsg = e.message; });
    // Don't fire onConnected/onSubAck — simulate unreachable broker.
    await new Promise((r) => setTimeout(r, 40));
    expect(errMsg).toMatch(/connect timeout/);
    src.dispose();
  });
});

describe('MqttChunkSource.requestChunk', () => {
  // Helper: connect + subscribe-ack the source so requestChunk is usable.
  function connectedSource(opts: Partial<{ requestTimeoutMs: number }> = {}): { src: MqttChunkSource; mqtt: FakeMQTTClient } {
    const src = new MqttChunkSource({
      planetId: 'smoke-planet',
      mqttHost: 'h',
      mqttPort: 9001,
      requestTimeoutMs: opts.requestTimeoutMs ?? 50,
    });
    src.connect();
    const mqtt = FakeMQTTClient.lastInstance!;
    fireGlobal(mqtt.ctor.onConnected);
    fireGlobal(mqtt.subscribes[0].onAcknowledged, 'ok');
    return { src, mqtt };
  }

  it('publishes to the planet request topic with face/lod/cx/cy + correlation-id', () => {
    const { src, mqtt } = connectedSource();
    src.requestChunk(0, 2, 1, 1, { onSuccess: () => {} });
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

  it('fires onSuccess with chunk data when matching response arrives', () => {
    const { src, mqtt } = connectedSource();
    let received: ChunkData | null = null;
    src.requestChunk(0, 2, 0, 0, { onSuccess: (c) => { received = c; } });
    const corrId = JSON.parse(mqtt.publishes[0].message)['correlation-id'];
    const chunk: ChunkData = {
      planetId: 'smoke-planet',
      face: 0, lod: 2, cx: 0, cy: 0,
      length: 9817, width: 9817, height: 1500,
      heights: [[0, 1], [2, 3]],
    };
    fireGlobal(mqtt.subscribes[0].onMessage, '', '', JSON.stringify({
      'correlation-id': corrId,
      success: true,
      chunk,
    }));
    expect(received).not.toBeNull();
    expect(received!.planetId).toBe('smoke-planet');
    expect(received!.face).toBe(0);
    src.dispose();
  });

  it('fires onError when response indicates an error', () => {
    const { src, mqtt } = connectedSource();
    let errMsg: string | null = null;
    src.requestChunk(0, 2, 0, 0, {
      onSuccess: () => {},
      onError: (e) => { errMsg = e.message; },
    });
    const corrId = JSON.parse(mqtt.publishes[0].message)['correlation-id'];
    fireGlobal(mqtt.subscribes[0].onMessage, '', '', JSON.stringify({
      'correlation-id': corrId,
      success: false,
      error: { code: 'NOT_FOUND', message: 'planet not found' },
    }));
    expect(errMsg).toMatch(/NOT_FOUND.*planet not found/);
    src.dispose();
  });

  it('ignores responses with unknown correlation-id', () => {
    const { src, mqtt } = connectedSource();
    let settled = false;
    src.requestChunk(0, 2, 0, 0, {
      onSuccess: () => { settled = true; },
      onError: () => { settled = true; },
    });
    fireGlobal(mqtt.subscribes[0].onMessage, '', '', JSON.stringify({
      'correlation-id': 'not-mine',
      success: true,
      chunk: { planetId: 'x', face: 0, lod: 0, cx: 0, cy: 0, length: 1, width: 1, height: 1, heights: [[0]] },
    }));
    expect(settled).toBe(false);
    src.dispose();
  });

  it('fires onError after configurable request timeout', async () => {
    const { src } = connectedSource({ requestTimeoutMs: 10 });
    let errMsg: string | null = null;
    src.requestChunk(0, 2, 0, 0, {
      onSuccess: () => {},
      onError: (e) => { errMsg = e.message; },
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(errMsg).toMatch(/timeout/);
    src.dispose();
  });

  it('fires onError on every pending request when broker disconnects', () => {
    const { src, mqtt } = connectedSource();
    let errMsg: string | null = null;
    src.requestChunk(0, 2, 0, 0, {
      onSuccess: () => {},
      onError: (e) => { errMsg = e.message; },
    });
    fireGlobal(mqtt.ctor.onDisconnected, 128, 'TCP closed');
    expect(errMsg).toMatch(/disconnected/);
    src.dispose();
  });

  it('fires onError synchronously when called before connect completes', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    let errMsg: string | null = null;
    src.requestChunk(0, 2, 0, 0, {
      onSuccess: () => {},
      onError: (e) => { errMsg = e.message; },
    });
    expect(errMsg).toMatch(/not connected/);
    src.dispose();
  });
});

describe('MqttChunkSource.dispose', () => {
  it('clears global callbacks', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    src.connect();
    const mqtt = FakeMQTTClient.lastInstance!;
    const cbName = mqtt.ctor.onConnected;
    expect(typeof (globalThis as Record<string, unknown>)[cbName]).toBe('function');
    src.dispose();
    expect((globalThis as Record<string, unknown>)[cbName]).toBeUndefined();
  });

  it('disconnects the MQTT client', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    src.connect();
    const mqtt = FakeMQTTClient.lastInstance!;
    src.dispose();
    expect(mqtt.disconnectCalls).toBe(1);
  });

  it('two simultaneous instances use distinct response topics + callback names', () => {
    const a = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    const b = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    a.connect();
    const ma = FakeMQTTClient.instances[0];
    b.connect();
    const mb = FakeMQTTClient.instances[1];
    expect(ma.ctor.onConnected).not.toBe(mb.ctor.onConnected);
    a.dispose();
    b.dispose();
  });

  it('dispose is idempotent', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    src.connect();
    src.dispose();
    expect(() => src.dispose()).not.toThrow();
  });

  it('fires pending request onError with disposed message', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    src.connect();
    const mqtt = FakeMQTTClient.lastInstance!;
    fireGlobal(mqtt.ctor.onConnected);
    fireGlobal(mqtt.subscribes[0].onAcknowledged, 'ok');
    let errMsg: string | null = null;
    src.requestChunk(0, 2, 0, 0, {
      onSuccess: () => {},
      onError: (e) => { errMsg = e.message; },
    });
    src.dispose();
    expect(errMsg).toMatch(/disposed/);
  });
});

describe('MqttChunkSource.requestChunkPromise (Promise wrapper)', () => {
  it('resolves on success response', async () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    src.connect();
    const mqtt = FakeMQTTClient.lastInstance!;
    fireGlobal(mqtt.ctor.onConnected);
    fireGlobal(mqtt.subscribes[0].onAcknowledged, 'ok');

    const promise = src.requestChunkPromise(0, 2, 0, 0);
    const corrId = JSON.parse(mqtt.publishes[0].message)['correlation-id'];
    fireGlobal(mqtt.subscribes[0].onMessage, '', '', JSON.stringify({
      'correlation-id': corrId,
      success: true,
      chunk: { planetId: 'p', face: 0, lod: 2, cx: 0, cy: 0, length: 1, width: 1, height: 1, heights: [[0]] },
    }));
    await expect(promise).resolves.toMatchObject({ planetId: 'p' });
    src.dispose();
  });
});
