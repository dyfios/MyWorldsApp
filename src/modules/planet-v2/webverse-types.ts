// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * WebVerse runtime type declarations used by planet-v2.
 *
 * **Source-of-truth verified against C#**, not against `worldapi.d.ts`. The
 * d.ts has historically lied about field names and signatures; corrections
 * surfaced 2026-05-04 by reading the actual bindings under
 * `WebVerse-Runtime/Assets/Runtime/Handlers/JavascriptHandler/APIs/`.
 *
 * Keep this file narrow: only the types planet-v2 actually consumes. Adding
 * a new global here is a chance to verify its real signature against C#.
 */

/* ──────────────────────────── Logging ────────────────────────────────── */

/** WebVerse logging surface. Bound globally; always available. */
export interface LoggingApi {
  Log(message: string): void;
  LogWarning(message: string): void;
  LogError(message: string): void;
}

/* ──────────────────────────── Time ───────────────────────────────────── */

/**
 * WebVerse Time class — verified against
 *   Assets/Runtime/Handlers/JavascriptHandler/APIs/WorldBrowserUtilities/Scripts/Time.cs
 * and
 *   Assets/Runtime/Handlers/TimeHandler/Scripts/TimeHandler.cs
 *
 * **CRITICAL UNIT QUIRK** — `SetTimeout` takes MILLISECONDS while
 * `SetInterval` takes SECONDS. Verified in:
 *   - SetTimeout → JavascriptHandler.RunScriptAfterTimeout(script, timeout) →
 *     ExecutionTask { millisecondsRemaining: int = timeout }
 *   - SetInterval → TimeHandler.StartInvoking(function, interval: float) →
 *     IntervalFunction.currentElapsed += UnityEngine.Time.deltaTime (seconds)
 */
export interface TimeApi {
  /**
   * Run a string-of-logic at a recurring interval.
   * @param functionName Bare global function name OR a snippet of JS.
   * @param intervalSeconds Interval in **SECONDS** (note: different unit
   *   from SetTimeout).
   * @returns A UUID-shaped object identifying the registered interval, or null.
   */
  SetInterval(functionName: string, intervalSeconds: number): UUIDLike | null;

  /** Stop a registered interval. */
  StopInterval(id: string | null): boolean;

  /**
   * Run a string-of-logic once after a delay.
   * @param logic A snippet of JS to evaluate when the timer fires.
   * @param timeoutMs Delay in **MILLISECONDS** (note: different unit from
   *   SetInterval).
   */
  SetTimeout(logic: string, timeoutMs: number): boolean;

  /** Schedule a function to be called on the next available frame. */
  CallAsynchronously(functionName: string): boolean;
}

interface UUIDLike {
  ToString(): string;
}

/* ──────────────────────────── UUID ───────────────────────────────────── */

export interface UUIDApi {
  /** Generate a new UUID. ToString() returns canonical string form. */
  NewUUID(): UUIDLike;
}

/* ──────────────────────────── Math primitives ────────────────────────── */

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}
export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}
export interface ColorLike {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type Vector3Ctor = new (x: number, y: number, z: number) => Vector3Like;
export type ColorCtor = new (r: number, g: number, b: number, a: number) => ColorLike;
export interface QuaternionApi {
  /** Quaternion.identity returns a {0,0,0,1} instance. */
  identity: QuaternionLike;
}

/* ──────────────────────────── MQTT client ────────────────────────────── */

/**
 * MQTTClient — verified against
 *   Assets/Runtime/Handlers/JavascriptHandler/APIs/Networking/Scripts/MQTTClient.cs
 * (post 2026-05-03 alignment with HTTPNetworking pattern).
 *
 * - Constructor takes 9 args; transport is "tcp" or "websockets".
 * - Callback args (onConnected etc.) are BARE GLOBAL FUNCTION NAMES; the C#
 *   wrapper invokes them via `timeHandler.CallAsynchronously(name, [args])`.
 *   **No** `?`-substitution like the older API. Bare strings only.
 * - `onDisconnected(code: number, msg: string)`
 * - `onStateChanged(from: string, to: string)`
 * - `onError(msg: string)`
 * - `Subscribe(topic, onAcknowledged, onMessage)` — onMessage receives
 *   `(topic, topicName, payload: string)` where payload is UTF-8 decoded.
 */
export interface MQTTClientCtor {
  new (
    host: string,
    port: number,
    useTLS: boolean,
    transport: 'tcp' | 'websockets',
    onConnected: string,
    onDisconnected: string,
    onStateChanged: string,
    onError: string,
    path?: string,
  ): MQTTClientInstance;
}

export interface MQTTClientInstance {
  Connect(): boolean;
  Disconnect(): boolean;
  Subscribe(topic: string, onAcknowledged: string, onMessage: string): boolean;
  UnSubscribe(topic: string, onAcknowledged: string): boolean;
  Publish(topic: string, message: string): boolean;
}

/* ──────────────────────────── TerrainEntity ──────────────────────────── */

/**
 * TerrainEntity — verified against
 *   Assets/Runtime/Handlers/JavascriptHandler/APIs/Entity/Scripts/TerrainEntity.cs
 *   Assets/Runtime/Handlers/JavascriptHandler/APIs/Entity/Scripts/TerrainEntityLayer.cs
 *   Assets/Runtime/StraightFour/Entity/Terrain/Scripts/TerrainEntity.cs
 *
 * Quirks:
 * - `layers` parameter must contain **at least one** layer. Empty array
 *   makes Initialize early-return with "must be initialized with at least
 *   one layer" — the heights never get applied.
 * - The struct field names are `diffuseTexture` / `normalTexture` /
 *   `maskTexture` / `sizeFactor` (NOT what the d.ts says).
 * - `specular` must be a real `new Color(...)` instance — Jint does NOT
 *   auto-construct from `{r,g,b,a}` literals. Throws "No valid constructors
 *   found for type ...Color" if you try.
 * - Heights are stored normalized to [0..1] internally; values >= 0 only.
 *   Negative values clamp to 0. Caller must shift before passing.
 * - Loaded entities are HIDDEN by default. `SetVisibility(true)` toggles
 *   `terrain.drawHeightmap` but does NOT enable the Unity Terrain component.
 *   Must call `SetInteractionState(2)` (Physical) for renderer + collider.
 */
export interface TerrainEntityLayerStub {
  diffuseTexture: string;
  normalTexture: string;
  maskTexture: string;
  specular: ColorLike;
  metallic: number;
  smoothness: number;
  sizeFactor: number;
}

export interface TerrainEntityApi {
  CreateHeightmap(
    parent: unknown | null,
    length: number,
    width: number,
    height: number,
    heights: number[][],
    layers: TerrainEntityLayerStub[],
    layerMasks: unknown,
    position: Vector3Like,
    rotation: QuaternionLike,
    id?: string,
    tag?: string,
    onLoaded?: string,
    stitchTerrains?: boolean,
  ): unknown;
  /**
   * Async path via `JSONEntityHandler.LoadTerrainEntityFromJSONAsync`
   * (verified against TerrainEntity.cs:136 + JSONEntityHandler.cs:2682).
   * The handler parses + normalizes the JSON on a background thread;
   * only the final Unity terrain build runs on the main thread, so the
   * 1M-element heights deserialization no longer freezes the render
   * loop. See `reference_webverse_terrain_json` memo for the canonical
   * shape (terrainType, length/width/height, heights, layers, etc.).
   *
   * `onLoaded` is a bare global function name; called with the loaded
   * TerrainEntity instance once Unity finishes the synchronous
   * SetHeights/build phase.
   */
  Create(jsonEntity: string, parent?: unknown | null, onLoaded?: string): void;
}

/** Runtime entity instance returned to the onLoaded callback. */
export interface TerrainEntityInstance {
  /** Toggle `terrain.drawHeightmap`. Doesn't enable the Terrain component. */
  SetVisibility?(visible: boolean): boolean;
  /**
   * Interaction state:
   *   0 = Hidden — gameObject inactive
   *   1 = Static — terrain.enabled = true; collider DISABLED
   *   2 = Physical — terrain.enabled = true; collider ENABLED (walkable)
   *   3 = Placing — N/A for terrain
   * Use `2` (Physical) so the player can walk on the terrain.
   */
  SetInteractionState?(state: 0 | 1 | 2 | 3): boolean;
  Delete?(): boolean;
}

/* ──────────────────────────── MeshEntity ──────────────────────────────── */

/**
 * MeshEntity — verified against
 *   Assets/Runtime/Handlers/JavascriptHandler/APIs/Entity/Scripts/MeshEntity.cs
 *
 * Quirks:
 * - Loads from a URL string (`meshObject`). Supports `http://` and
 *   `https://` URLs ONLY — fetched via libcurl.
 * - **`data:application/gltf-binary;base64,...` URLs do NOT work.** libcurl
 *   rejects them with "URL rejected: Port number was not a decimal number
 *   between 0 and 65535". Confirmed empirically 2026-05-09. SPIKE1's
 *   round-trip used HTTP delivery (`serve.mjs` on :8080), not data URLs —
 *   the earlier comment claiming data-URL support here was speculative.
 *   plugin-planet's `MeshHttpServer` is the production HTTP delivery path
 *   for baked chunk meshes.
 * - `meshResources` is for additional asset URLs (textures, etc.) that
 *   aren't embedded. For our baked meshes (textures embedded in the glb)
 *   pass an empty array.
 * - `id` must be a System.Guid string — use `UUID.NewUUID().ToString()`.
 * - Loaded entities are HIDDEN by default (same as TerrainEntity). Caller's
 *   `onLoaded` callback must `SetVisibility(true)` and pick an interaction
 *   state.
 */
export interface MeshEntityApi {
  Create(
    parent: unknown | null,
    meshObject: string,
    meshResources: string[],
    position: Vector3Like,
    rotation: QuaternionLike,
    id?: string,
    onLoaded?: string,
    checkForUpdateIfCached?: boolean,
  ): unknown;
  /**
   * Primitive sphere with a solid color material. Diameter 1.0 by default;
   * use `SetScale` on the instance to size it. Used for Story 6.4
   * ImpostorSphere (planet at altitude).
   * Verified against MeshEntity.cs:242 in WebVerse-Runtime.
   */
  CreateSphere?(
    parent: unknown | null,
    color: ColorLike,
    position: Vector3Like,
    rotation: QuaternionLike,
    id?: string,
    onLoaded?: string,
  ): unknown;
}

/** Runtime mesh-entity instance returned to the onLoaded callback. */
export interface MeshEntityInstance {
  /** Show/hide the rendered mesh. */
  SetVisibility?(visible: boolean): boolean;
  /**
   * Interaction state — same enum as TerrainEntity:
   *   1 = Static (visible, no collider)
   *   2 = Physical (visible + collider)
   * Mid-range tile meshes are visual-only; player walks on the
   * close-range TerrainEntity. Use `1` (Static).
   */
  SetInteractionState?(state: 0 | 1 | 2 | 3): boolean;
  /**
   * Scale the entity. Primitive meshes (CreateSphere etc.) start at
   * Unity primitive default diameter 1.0; the ImpostorSphere scales by
   * 2·radius to fill the planet's actual size.
   * Verified against BaseEntity.cs:416 in WebVerse-Runtime.
   */
  SetScale?(scale: Vector3Like, synchronizeChange?: boolean): boolean;
  /**
   * Set the entity position. `local` = true sets localPosition (relative
   * to parent); false sets world transform.position. Used by
   * ImpostorSphere to force absolute world placement after Create
   * because Create always uses local=true internally.
   * Verified against BaseEntity.cs:309 in WebVerse-Runtime.
   */
  SetPosition?(position: Vector3Like, local: boolean, synchronizeChange?: boolean): boolean;
  Delete?(): boolean;
}

/* ──────────────────────────── Globals access helper ──────────────────── */

/** Shape of `globalThis` from planet-v2's perspective. */
export interface WebVerseGlobals {
  Logging?: LoggingApi;
  Time?: TimeApi;
  UUID?: UUIDApi;
  Vector3?: Vector3Ctor;
  Quaternion?: QuaternionApi;
  Color?: ColorCtor;
  MQTTClient?: MQTTClientCtor;
  TerrainEntity?: TerrainEntityApi;
  MeshEntity?: MeshEntityApi;
}

/** Typed accessor for the WebVerse globals. */
export function webverse(): WebVerseGlobals {
  return globalThis as unknown as WebVerseGlobals;
}
