// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * Planet MVP loader (Phase 2 follow-up — local end-to-end smoke).
 *
 * THROWAWAY in spirit (mirrors SpikeMeshLoader): proves the chain
 *   client → MQTT → @worldos/plugin-planet → chunk heights → TerrainEntity
 * works end-to-end against a real WOS server, without yet wiring up the
 * full GlobeRenderer + ChunkStreamer pipeline.
 *
 * What it does:
 *   1. Connect to wos2's MQTT-over-WebSocket on port 9001.
 *   2. Subscribe to a unique per-request response topic.
 *   3. Publish a single chunk request for face=0, lod=2, cx=0, cy=0.
 *   4. On response, call `TerrainEntity.CreateHeightmap(...)` with the
 *      received heights matrix. The terrain becomes visible at the spawn.
 *
 * Activated by `?worldType=planet-mvp&planetId=<id>&mqttHost=...&mqttPort=9001`.
 *
 * Not exported from `./index.ts` — kept off the public surface like the
 * SPIKE1 loader.
 */

declare const Logging: {
  Log: (m: string) => void;
  LogError: (m: string) => void;
  LogWarning: (m: string) => void;
};
// MQTTClient comes from worldapi.d.ts. After this session's WebVerse fix
// (MQTTClient.cs aligned with HTTPNetworking's pattern), callbacks are bare
// global function names — invoked via timeHandler.CallAsynchronously with
// positional args. No `(?)` syntax needed.
declare const TerrainEntity: {
  CreateHeightmap: (
    parent: unknown | null,
    length: number,
    width: number,
    height: number,
    heights: number[][],
    layers: unknown[],
    layerMasks: unknown,
    position: unknown,
    rotation: unknown,
    id?: string,
    tag?: string,
    onLoaded?: string,
    stitchTerrains?: boolean,
  ) => unknown;
};
declare const Vector3: new (x: number, y: number, z: number) => unknown;
declare const Quaternion: { identity: unknown };
declare const UUID: { NewUUID: () => { ToString: () => string } };
declare const Color: new (r: number, g: number, b: number, a: number) => unknown;

export interface PlanetMvpOptions {
  planetId: string;
  mqttHost: string;
  mqttPort: number;
  /** "tcp" or "websockets". TCP avoids the Best.MQTT WebSocket layer entirely. */
  mqttTransport?: string;
  /** Optional: which chunk to request. Default face=0, lod=2, cx=0, cy=0. */
  face?: number;
  lod?: number;
  cx?: number;
  cy?: number;
}

export class PlanetMvpLoader {
  private readonly opts: PlanetMvpOptions;
  private client: MQTTClient | null = null;
  private responseTopic: string;
  private correlationId: string;
  private terrainEntity: unknown = null;

  constructor(opts: PlanetMvpOptions) {
    this.opts = opts;
    // Unique response topic per loader instance so we don't clobber other listeners.
    const correlationSuffix = UUID.NewUUID().ToString();
    this.correlationId = correlationSuffix;
    this.responseTopic = `mwapp/planet-mvp/response/${correlationSuffix}`;
  }

  load(): void {
    Logging.Log('mvp step 1: connecting MQTTClient host=' + this.opts.mqttHost + ' port=' + this.opts.mqttPort);

    // Register globals BEFORE construction. The wrapper invokes by bare name
    // via timeHandler.CallAsynchronously with positional args (HTTPNetworking
    // pattern). Args per the d.ts:
    //   onConnected:     ()
    //   onDisconnected:  (code: number, msg: string)
    //   onStateChanged:  (from: string, to: string)
    //   onError:         (msg: string)
    //   onAcknowledged:  (ackMsg: string)
    //   onMessage:       (topic, topicName, payload) — payload is UTF-8 string
    const g = globalThis as Record<string, unknown>;

    g['onPlanetMvpConnect'] = () => this.onConnect();
    g['onPlanetMvpMessage'] = (_topic: string, _topicName: string, payload: string) => {
      this.onMessage(payload);
    };
    g['onPlanetMvpTerrainLoaded'] = (entity: {
      SetVisibility?: (v: boolean) => void;
      SetInteractionState?: (s: number) => void;
    } | null) => {
      Logging.Log('mvp step 8: TerrainEntity onLoaded — entity=' + (entity == null ? 'null' : 'present'));
      if (entity) {
        // SetVisibility(true) only flips terrain.drawHeightmap — the Unity
        // Terrain component itself starts with `enabled=false`. SetInteractionState
        // (Static=1) calls MakeStatic which sets terrain.enabled = true, making
        // the terrain actually render.
        try {
          if (entity.SetInteractionState) {
            // Physical (=2): terrain.enabled = true AND terrainCollider.enabled = true.
            // Static (=1) renders but disables the collider, so the character falls through.
            entity.SetInteractionState(2);
            Logging.Log('mvp step 9a: SetInteractionState(Physical) on terrain');
          }
          if (entity.SetVisibility) {
            entity.SetVisibility(true);
            Logging.Log('mvp step 9b: SetVisibility(true) on terrain');
          }
        } catch (e) {
          Logging.Log('mvp FAIL @ enable terrain: ' + ((e as Error).message || String(e)));
        }
      }
      this.terrainEntity = entity;
    };
    g['onPlanetMvpDisconnect'] = (code: number, msg: string) => {
      Logging.Log('mvp event: disconnected code=' + code + ' msg=' + msg);
    };
    g['onPlanetMvpStateChange'] = (from: string, to: string) => {
      Logging.Log('mvp event: state ' + from + ' -> ' + to);
    };
    g['onPlanetMvpError'] = (msg: string) => {
      Logging.Log('mvp event: error ' + msg);
    };
    g['onPlanetMvpSubAck'] = (ackMsg: string) => {
      Logging.Log('mvp event: subscribe acknowledged: ' + ackMsg);
    };

    let c: MQTTClient | null = null;
    try {
      const transport = this.opts.mqttTransport ?? 'tcp';
      Logging.Log('mvp probe: transport=' + transport + ' port=' + this.opts.mqttPort);
      c = new MQTTClient(
        this.opts.mqttHost,            // host
        this.opts.mqttPort,            // port
        false,                         // useTLS
        transport,                     // 'tcp' or 'websockets'
        'onPlanetMvpConnect',          // bare global function name
        'onPlanetMvpDisconnect',
        'onPlanetMvpStateChange',
        'onPlanetMvpError',
        '/mqtt',                       // path (websockets only)
      );
      Logging.Log('mvp probe: constructed; typeof c.Connect=' + typeof c.Connect);
    } catch (e) {
      Logging.Log('mvp FAIL @ new MQTTClient(): ' + ((e as Error).message || String(e)));
      return;
    }
    try {
      const ok = c.Connect();
      this.client = c;
      Logging.Log('mvp step 2: Connect() returned ' + ok + ', awaiting onConnect');
    } catch (e) {
      Logging.Log('mvp FAIL @ Connect: ' + ((e as Error).message || String(e)));
    }
  }

  private onConnect(): void {
    Logging.Log('mvp step 3: onConnect fired, subscribing to ' + this.responseTopic);
    if (!this.client) {
      Logging.LogError('mvp: client null in onConnect — should not happen');
      return;
    }
    // Subscribe(topic, onAcknowledged, onMessage) — bare function names.
    try {
      this.client.Subscribe(this.responseTopic, 'onPlanetMvpSubAck', 'onPlanetMvpMessage');
      Logging.Log('mvp step 4: Subscribe dispatched; publishing chunk request');
    } catch (e) {
      Logging.Log('mvp FAIL @ Subscribe: ' + ((e as Error).message || String(e)));
      return;
    }

    const face = this.opts.face ?? 0;
    const lod = this.opts.lod ?? 2;
    const cx = this.opts.cx ?? 0;
    const cy = this.opts.cy ?? 0;
    const requestTopic = 'wos/planet/' + this.opts.planetId + '/chunk/request';
    const payload = JSON.stringify({
      'correlation-id': this.correlationId,
      'response-topic': this.responseTopic,
      face,
      lod,
      cx,
      cy,
    });
    try {
      this.client.Publish(requestTopic, payload);
      Logging.Log('mvp step 5: published to ' + requestTopic + ' face=' + face + ' lod=' + lod + ' cx=' + cx + ' cy=' + cy);
    } catch (e) {
      Logging.Log('mvp FAIL @ Publish: ' + ((e as Error).message || String(e)));
    }
  }

  private onMessage(rawMessage: string): void {
    Logging.Log('mvp step 6: response received, ' + rawMessage.length + ' bytes');
    let parsed: { success?: boolean; error?: { message?: string }; chunk?: ChunkResponseShape } | null;
    try {
      parsed = JSON.parse(rawMessage);
    } catch (e) {
      Logging.Log('mvp FAIL @ JSON.parse: ' + ((e as Error).message || String(e)));
      return;
    }
    if (!parsed || parsed.success !== true || !parsed.chunk) {
      Logging.LogWarning('mvp: response not success — ' + (parsed?.error?.message || 'no chunk in response'));
      return;
    }
    const c = parsed.chunk;
    // Compute min/max so we can see whether the chunk is ocean (h <= 0) or
    // continent (h > 0). Unity clamps negative heights to the floor, so an
    // ocean chunk renders as a flat plane.
    let hMin = Infinity;
    let hMax = -Infinity;
    for (let r = 0; r < c.heights.length; r++) {
      const row = c.heights[r];
      for (let i = 0; i < row.length; i++) {
        const v = row[i]!;
        if (v < hMin) hMin = v;
        if (v > hMax) hMax = v;
      }
    }
    Logging.Log('mvp step 7: chunk parsed length=' + c.length + ' width=' + c.width + ' height=' + c.height +
      ' heights[' + c.heights.length + '][' + (c.heights[0]?.length ?? '?') + ']' +
      ' min=' + hMin.toFixed(2) + ' max=' + hMax.toFixed(2));

    // WebVerse normalizes heights to [0..1] and clamps negatives to 0 — so a
    // chunk with min=-34 max=+19 would only show the +19m portion as a flat
    // ledge. Shift heights so the chunk's local floor is 0, then place the
    // terrain at world Y=hMin so absolute world elevation is preserved.
    // For the MVP single-chunk smoke. The full GlobeRenderer will use a global
    // sea-level baseline + per-chunk vertical placement to keep neighbours
    // consistent.
    const yOffset = hMin < 0 ? hMin : 0;
    if (yOffset < 0) {
      const shift = -yOffset;
      for (let r = 0; r < c.heights.length; r++) {
        const row = c.heights[r];
        for (let i = 0; i < row.length; i++) {
          row[i]! += shift;
        }
      }
      Logging.Log('mvp: shifted heights by +' + shift.toFixed(2) + 'm so min=0; terrain placed at y=' + yOffset.toFixed(2));
    }
    // Sanity probe: pick several positions across the matrix and log their
    // values so we can verify (a) the shift actually persists in c.heights
    // and (b) the matrix has spatial variation, not just two outlier spikes.
    const N = c.heights.length;
    const probe = (label: string, r: number, i: number): string =>
      label + '=' + c.heights[r]![i]!.toFixed(2);
    Logging.Log('mvp probe heights: ' +
      probe('[0,0]', 0, 0) + ' ' +
      probe('[mid,mid]', N >> 1, N >> 1) + ' ' +
      probe('[end,end]', N - 1, N - 1) + ' ' +
      probe('[0,end]', 0, N - 1) + ' ' +
      probe('[end,0]', N - 1, 0));
    // Tighten the height envelope to the chunk's actual range so Unity uses
    // its full [0..1] resolution for the relief that's actually present
    // (instead of mapping ~50m into 1/1500 of the scale).
    const tightHeight = Math.max(1, hMax - yOffset + 1);

    // TerrainEntity.Initialize early-returns if layers is empty, so we must
    // pass at least one stub layer. Field names match the C# struct
    // (TerrainEntityLayer.cs), NOT the older d.ts which has wrong names.
    // `specular` must be a real WorldTypes.Color instance — Jint won't auto-
    // construct it from a plain {r,g,b,a} object literal (throws "No valid
    // constructors found for type ...Color").
    const stubLayer = {
      diffuseTexture: '',
      normalTexture: '',
      maskTexture: '',
      specular: new Color(0.5, 0.5, 0.5, 1),
      metallic: 0,
      smoothness: 0,
      sizeFactor: 1,
    };

    try {
      // Place the terrain in front of the avatar at world-(0, 0, 0).
      // length/width/height are in meters per the plugin's protocol.
      TerrainEntity.CreateHeightmap(
        null,                                              // parent
        c.length,                                          // length
        c.width,                                           // width
        tightHeight,                                       // vertical scale fitted to chunk range
        c.heights,                                         // heights matrix (shifted to [0, range])
        [stubLayer],                                       // at least one layer (untextured)
        {},                                                // layerMasks — none for MVP
        new Vector3(0, yOffset, 0),                        // position (preserve absolute world elevation)
        Quaternion.identity,                               // rotation
        UUID.NewUUID().ToString(),                         // id
        'planet-mvp-tile',                                 // tag
        'onPlanetMvpTerrainLoaded',                        // onLoaded callback
        false,                                             // stitchTerrains
      );
      Logging.Log('mvp step 7b: TerrainEntity.CreateHeightmap dispatched');
    } catch (e) {
      Logging.Log('mvp FAIL @ CreateHeightmap: ' + ((e as Error).message || String(e)));
      if ((e as Error).stack) {
        Logging.Log('mvp stack: ' + (e as Error).stack);
      }
    }
  }

  getEntity(): unknown {
    return this.terrainEntity;
  }
}

interface ChunkResponseShape {
  planetId: string;
  face: number;
  lod: number;
  cx: number;
  cy: number;
  length: number;
  width: number;
  height: number;
  heights: number[][];
}

