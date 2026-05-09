// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MqttChunkSource } from './MqttChunkSource.js';
import type { ChunkData } from './types.js';

/** Minimal fake of WebVerse's MQTTClient class. */
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
  static instances: FakeMQTTClient[] = [];
  static last(): FakeMQTTClient {
    return this.instances[this.instances.length - 1]!;
  }
  readonly host: string;
  readonly port: number;
  readonly transport: string;
  readonly cb: { onConnected: string; onDisconnected: string; onStateChanged: string; onError: string };
  connectCalls = 0;
  disconnectCalls = 0;
  readonly subscribes: RecordedSubscribe[] = [];
  readonly publishes: RecordedPublish[] = [];

  constructor(
    host: string,
    port: number,
    _useTLS: boolean,
    transport: string,
    onConnected: string,
    onDisconnected: string,
    onStateChanged: string,
    onError: string,
  ) {
    this.host = host;
    this.port = port;
    this.transport = transport;
    this.cb = { onConnected, onDisconnected, onStateChanged, onError };
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
  UnSubscribe(_t: string, _a: string): boolean {
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

function fire(name: string, ...args: unknown[]): void {
  const fn = (globalThis as Record<string, unknown>)[name];
  if (typeof fn !== 'function') throw new Error(`global '${name}' is not a function`);
  (fn as (...a: unknown[]) => void)(...args);
}

beforeEach(() => {
  uuidCounter = 0;
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

describe('MqttChunkSource.connect', () => {
  it('constructs MQTTClient with provided host/port/transport, dispatches Connect()', () => {
    const src = new MqttChunkSource({
      planetId: 'p1',
      mqttHost: '192.168.1.143',
      mqttPort: 9001,
      mqttTransport: 'websockets',
    });
    src.connect();
    const m = FakeMQTTClient.last();
    expect(m.host).toBe('192.168.1.143');
    expect(m.port).toBe(9001);
    expect(m.transport).toBe('websockets');
    expect(m.connectCalls).toBe(1);
    src.dispose();
  });

  it("defaults transport to 'websockets'", () => {
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.connect();
    expect(FakeMQTTClient.last().transport).toBe('websockets');
    src.dispose();
  });

  it('subscribes to a unique response topic and fires onConnected on SUBACK', () => {
    let connected = false;
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.connect(() => { connected = true; });
    const m = FakeMQTTClient.last();
    fire(m.cb.onConnected);
    expect(m.subscribes.length).toBe(1);
    expect(m.subscribes[0]!.topic).toMatch(/^mwapp\/planet-v2\/response\//);
    fire(m.subscribes[0]!.onAcknowledged, 'ok');
    expect(connected).toBe(true);
    expect(src.isConnected()).toBe(true);
    src.dispose();
  });

  it('fires onError on disconnect before SUBACK', () => {
    let errMsg: string | null = null;
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.connect(undefined, (e) => { errMsg = e.message; });
    const m = FakeMQTTClient.last();
    fire(m.cb.onDisconnected, 128, 'TCP closed');
    expect(errMsg).toMatch(/disconnected.*128.*TCP closed/);
    src.dispose();
  });

  it('fires onError on connect timeout', async () => {
    let errMsg: string | null = null;
    const src = new MqttChunkSource({
      planetId: 'p1',
      mqttHost: 'h',
      mqttPort: 9001,
      connectTimeoutMs: 20,
    });
    src.connect(undefined, (e) => { errMsg = e.message; });
    await new Promise((r) => setTimeout(r, 40));
    expect(errMsg).toMatch(/connect timeout/);
    src.dispose();
  });

  it('rejects connect after dispose', () => {
    let errMsg: string | null = null;
    const src = new MqttChunkSource({ planetId: 'p1', mqttHost: 'h', mqttPort: 9001 });
    src.dispose();
    src.connect(undefined, (e) => { errMsg = e.message; });
    expect(errMsg).toMatch(/disposed/);
  });
});

describe('MqttChunkSource.requestChunk', () => {
  function connected(): { src: MqttChunkSource; mqtt: FakeMQTTClient } {
    const src = new MqttChunkSource({
      planetId: 'smoke',
      mqttHost: 'h',
      mqttPort: 9001,
      requestTimeoutMs: 50,
    });
    src.connect();
    const mqtt = FakeMQTTClient.last();
    fire(mqtt.cb.onConnected);
    fire(mqtt.subscribes[0]!.onAcknowledged, 'ok');
    return { src, mqtt };
  }

  it('publishes to wos/planet/{planetId}/chunk/request with correlation-id + response-topic', () => {
    const { src, mqtt } = connected();
    src.requestChunk(0, 5, 1, 2, { onSuccess: () => {} });
    expect(mqtt.publishes.length).toBe(1);
    expect(mqtt.publishes[0]!.topic).toBe('wos/planet/smoke/chunk/request');
    const payload = JSON.parse(mqtt.publishes[0]!.message);
    expect(payload.face).toBe(0);
    expect(payload.lod).toBe(5);
    expect(payload.cx).toBe(1);
    expect(payload.cy).toBe(2);
    expect(typeof payload['correlation-id']).toBe('string');
    expect(payload['response-topic']).toMatch(/^mwapp\/planet-v2\/response\//);
    src.dispose();
  });

  it('fires onSuccess with the chunk on a matching success response', () => {
    const { src, mqtt } = connected();
    let received: ChunkData | null = null;
    src.requestChunk(0, 5, 0, 0, { onSuccess: (c) => { received = c; } });
    const corr = JSON.parse(mqtt.publishes[0]!.message)['correlation-id'];
    const chunk: ChunkData = {
      planetId: 'smoke',
      face: 0, lod: 5, cx: 0, cy: 0,
      length: 1227, width: 1227, height: 1500,
      heights: [[0, 1], [2, 3]],
    };
    fire(mqtt.subscribes[0]!.onMessage, '', '', JSON.stringify({
      'correlation-id': corr, success: true, chunk,
    }));
    expect(received).not.toBeNull();
    expect(received!.face).toBe(0);
    expect(received!.length).toBe(1227);
    src.dispose();
  });

  it('fires onError on a failure response', () => {
    const { src, mqtt } = connected();
    let errMsg: string | null = null;
    src.requestChunk(0, 5, 0, 0, {
      onSuccess: () => {},
      onError: (e) => { errMsg = e.message; },
    });
    const corr = JSON.parse(mqtt.publishes[0]!.message)['correlation-id'];
    fire(mqtt.subscribes[0]!.onMessage, '', '', JSON.stringify({
      'correlation-id': corr, success: false, error: { code: 'NOT_FOUND', message: 'no planet' },
    }));
    expect(errMsg).toMatch(/NOT_FOUND.*no planet/);
    src.dispose();
  });

  it('ignores responses with unknown correlation-id', () => {
    const { src, mqtt } = connected();
    let settled = false;
    src.requestChunk(0, 5, 0, 0, {
      onSuccess: () => { settled = true; },
      onError: () => { settled = true; },
    });
    fire(mqtt.subscribes[0]!.onMessage, '', '', JSON.stringify({
      'correlation-id': 'not-mine',
      success: true,
      chunk: { planetId: 'x', face: 0, lod: 0, cx: 0, cy: 0, length: 1, width: 1, height: 1, heights: [[0]] },
    }));
    expect(settled).toBe(false);
    src.dispose();
  });

  it('fires onError on per-request timeout', async () => {
    const { src } = connected();
    let errMsg: string | null = null;
    src.requestChunk(0, 5, 0, 0, {
      onSuccess: () => {},
      onError: (e) => { errMsg = e.message; },
    });
    await new Promise((r) => setTimeout(r, 80));
    expect(errMsg).toMatch(/request timeout/);
    src.dispose();
  });

  it('fires onError synchronously when called before connect completes', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    let errMsg: string | null = null;
    src.requestChunk(0, 5, 0, 0, {
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
    const m = FakeMQTTClient.last();
    expect(typeof (globalThis as Record<string, unknown>)[m.cb.onConnected]).toBe('function');
    src.dispose();
    expect((globalThis as Record<string, unknown>)[m.cb.onConnected]).toBeUndefined();
  });

  it('disconnects the MQTT client', () => {
    const src = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    src.connect();
    const m = FakeMQTTClient.last();
    src.dispose();
    expect(m.disconnectCalls).toBe(1);
  });

  it('two simultaneous instances use distinct callback names', () => {
    const a = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    const b = new MqttChunkSource({ planetId: 'p', mqttHost: 'h', mqttPort: 9001 });
    a.connect();
    const ma = FakeMQTTClient.instances[0]!;
    b.connect();
    const mb = FakeMQTTClient.instances[1]!;
    expect(ma.cb.onConnected).not.toBe(mb.cb.onConnected);
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
    const m = FakeMQTTClient.last();
    fire(m.cb.onConnected);
    fire(m.subscribes[0]!.onAcknowledged, 'ok');
    let errMsg: string | null = null;
    src.requestChunk(0, 5, 0, 0, {
      onSuccess: () => {},
      onError: (e) => { errMsg = e.message; },
    });
    src.dispose();
    expect(errMsg).toMatch(/disposed/);
  });
});
