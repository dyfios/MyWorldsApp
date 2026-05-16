// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * ImpostorSphere (planet-v2, Story 6.4).
 *
 * Far-field renderer: a single textured sphere at the planet centre,
 * scaled to the planet's radius. Draw call count = 1.
 *
 * Two paths:
 *   1. Preferred — `cfg.impostorUrl` resolves to a server-baked glb (UV
 *      sphere with biome PNG embedded as the diffuse texture). The client
 *      loads it via `MeshEntity.Create` and scales to the planet's radius.
 *   2. Fallback — when no `impostorUrl` is configured, fall back to
 *      `MeshEntity.CreateSphere` (a flat-coloured primitive sphere) so
 *      the planet still has SOMETHING visible from altitude. Useful
 *      pre-deploy and during local dev when the plugin's HTTP server
 *      isn't running.
 *
 * Coordinate frame (planet-v2 tangent frame anchored at the player's
 * spawn chunk):
 *   - Player at world (0, 0, 0), on top of TerrainEntity.
 *   - World +Y is "up" along the planet's radial direction at spawn.
 *   - The planet's 3D centre sits at world (0, -radius, 0) — one radius
 *     below the player along the spawn-chunk's tangent normal.
 *
 * Server side: plugin-planet's `MeshHttpServer` serves the impostor at
 * `/planet/{id}/impostor.glb`. The bake is cached in-memory per planet
 * for the plugin's lifetime (see `ImpostorBaker` + the cache map in
 * MeshHttpServer.ts).
 */

import {
  callbackPrefix,
  registerCallback,
  unregisterCallbacks,
  logError,
  logInfo,
} from './jint-runtime.js';
import { webverse } from './webverse-types.js';
import type { MeshEntityInstance } from './webverse-types.js';
import type { PlanetSceneConfig } from './types.js';

export class ImpostorSphere {
  private readonly cfg: PlanetSceneConfig;
  private readonly cbPrefix: string;
  private entity: MeshEntityInstance | null = null;
  /** True once `initialize()` has dispatched the Create call, even
   *  before the entity arrives. Tracks "should be visible." */
  private active = false;
  /** Guards against double-init. */
  private creating = false;

  constructor(cfg: PlanetSceneConfig) {
    this.cfg = cfg;
    this.cbPrefix = callbackPrefix(`impostor_${cfg.planetId}`);
  }

  /**
   * Create the impostor sphere in WebVerse. Idempotent. Safe to call
   * in the test env (no WebVerse globals) — it returns silently.
   */
  initialize(): void {
    if (this.creating || this.entity) return;
    const w = webverse();
    const missing: string[] = [];
    if (!w.MeshEntity) missing.push('MeshEntity');
    if (!w.Vector3) missing.push('Vector3');
    if (!w.Quaternion) missing.push('Quaternion');
    if (!w.UUID) missing.push('UUID');
    if (missing.length > 0) {
      logInfo(
        `planet-v2 impostor: skipped — missing WebVerse globals: [${missing.join(', ')}] ` +
          `(this is normal in the test env; in WebVerse it means the runtime hasn't initialized yet)`,
      );
      return;
    }

    if (this.cfg.impostorUrl && this.cfg.impostorUrl.length > 0) {
      logInfo(`planet-v2 impostor: initializing from URL ${this.cfg.impostorUrl}`);
      this.initializeFromUrl(this.cfg.impostorUrl);
    } else {
      logInfo(
        `planet-v2 impostor: initializing as flat-coloured primitive ` +
          `(no impostorUrl configured — pass &meshHttpBase=http://host:8090 to use the server-baked textured glb)`,
      );
      this.initializeFlatPrimitive();
    }
  }

  /** Toggle visibility without destroying the entity. */
  setVisible(v: boolean): void {
    this.active = v;
    this.applyVisibility();
  }

  /** Whether the impostor is intended to be visible. */
  isActive(): boolean {
    return this.active;
  }

  /** Destroy the entity and reset state. */
  dispose(): void {
    if (this.entity) {
      try { this.entity.Delete?.(); } catch (_e) { /* best-effort */ }
      this.entity = null;
    }
    this.active = false;
    this.creating = false;
  }

  /** Returns the biome map URL — exposed for tests/debug. */
  getBiomeMapUrl(): string {
    return this.cfg.biomeMapUrl;
  }

  /* ──────────────────── Internals ───────────────────────────────── */

  /**
   * Preferred path: load the server-baked impostor glb via
   * `MeshEntity.Create`. The bake is a unit-radius UV sphere with the
   * biome PNG embedded as the base-colour texture, so the client only
   * needs to scale to the planet's radius after load.
   */
  private initializeFromUrl(url: string): void {
    const w = webverse();
    if (!w.MeshEntity || !w.Vector3 || !w.Quaternion || !w.UUID) return;
    this.creating = true;
    const entityId = w.UUID.NewUUID().ToString();
    const cbSuffix = `loaded_${entityId.replace(/-/g, '')}`;

    registerCallback(
      this.cbPrefix,
      cbSuffix,
      ((entity: MeshEntityInstance | null): void => {
        unregisterCallbacks(this.cbPrefix, [cbSuffix]);
        this.creating = false;
        if (!entity) {
          logError('planet-v2 impostor: onLoaded received null entity (url path)');
          return;
        }
        this.entity = entity;
        this.applyScale();
        this.applyVisibility();
        logInfo(
          `planet-v2 impostor: ready from url (radius=${this.cfg.radiusMeters}m, url=${url})`,
        );
      }) as (...a: never[]) => void,
    );

    // Centre the sphere at the planet centre in player-tangent frame.
    const position = new w.Vector3(0, -this.cfg.radiusMeters, 0);
    const rotation = w.Quaternion.identity;

    try {
      w.MeshEntity.Create(
        null,
        url,
        [], // texture bytes are embedded in the glb
        position,
        rotation,
        entityId,
        `${this.cbPrefix}${cbSuffix}`,
        true, // checkForUpdateIfCached — re-fetch when server rebakes
      );
      this.active = true;
      logInfo(`planet-v2 impostor: MeshEntity.Create dispatched id=${entityId} url=${url}`);
    } catch (e) {
      unregisterCallbacks(this.cbPrefix, [cbSuffix]);
      this.creating = false;
      logError(
        `planet-v2 impostor: MeshEntity.Create threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /**
   * Fallback path: flat-coloured primitive sphere via
   * `MeshEntity.CreateSphere`. Used when `impostorUrl` is empty.
   */
  private initializeFlatPrimitive(): void {
    const w = webverse();
    const missing: string[] = [];
    if (!w.MeshEntity) missing.push('MeshEntity');
    if (!w.MeshEntity?.CreateSphere) missing.push('MeshEntity.CreateSphere');
    if (!w.Vector3) missing.push('Vector3');
    if (!w.Quaternion) missing.push('Quaternion');
    if (!w.UUID) missing.push('UUID');
    if (!w.Color) missing.push('Color');
    if (missing.length > 0) {
      logError(
        `planet-v2 impostor: flat-primitive path UNAVAILABLE — missing: [${missing.join(', ')}]. ` +
          `If MeshEntity.CreateSphere is the only missing one, this WebVerse build is older than ` +
          `the API surface (MeshEntity.cs:242). Pass &meshHttpBase=... to use the textured-glb path instead.`,
      );
      return;
    }
    // TypeScript narrowing — the missing[] check above already validated
    // each of these, but TS doesn't follow through the array form.
    const ME = w.MeshEntity!;
    const Vec = w.Vector3!;
    const Quat = w.Quaternion!;
    const Col = w.Color!;
    const Uid = w.UUID!;
    const CreateSphere = ME.CreateSphere!;

    this.creating = true;
    const entityId = Uid.NewUUID().ToString();
    const cbSuffix = `loaded_${entityId.replace(/-/g, '')}`;

    registerCallback(
      this.cbPrefix,
      cbSuffix,
      ((entity: MeshEntityInstance | null): void => {
        unregisterCallbacks(this.cbPrefix, [cbSuffix]);
        this.creating = false;
        if (!entity) {
          logError('planet-v2 impostor: onLoaded received null entity (primitive path)');
          return;
        }
        this.entity = entity;
        this.applyScale();
        this.applyVisibility();
        logInfo(
          `planet-v2 impostor: ready from primitive (radius=${this.cfg.radiusMeters}m, no impostorUrl)`,
        );
      }) as (...a: never[]) => void,
    );

    const position = new Vec(0, -this.cfg.radiusMeters, 0);
    const rotation = Quat.identity;
    const color = new Col(0.65, 0.55, 0.40, 1);

    try {
      CreateSphere(
        null, color, position, rotation, entityId,
        `${this.cbPrefix}${cbSuffix}`,
      );
      this.active = true;
      logInfo(`planet-v2 impostor: CreateSphere dispatched id=${entityId}`);
    } catch (e) {
      unregisterCallbacks(this.cbPrefix, [cbSuffix]);
      this.creating = false;
      logError(
        `planet-v2 impostor: CreateSphere threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private applyScale(): void {
    if (!this.entity) return;
    const w = webverse();
    if (!w.Vector3) return;
    // Unity primitive sphere AND our ImpostorBaker UV sphere are both
    // unit-radius. The glb is radius 1; scale to make it radius
    // `radiusMeters` (= diameter 2·radiusMeters).
    const diameter = 2 * this.cfg.radiusMeters;
    try {
      this.entity.SetScale?.(new w.Vector3(diameter, diameter, diameter), false);
    } catch (e) {
      logError(
        `planet-v2 impostor: SetScale threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private applyVisibility(): void {
    if (!this.entity) return;
    try {
      this.entity.SetVisibility?.(this.active);
      // Static (1) = visible + no collider; Hidden (0) = not visible.
      this.entity.SetInteractionState?.(this.active ? 1 : 0);
    } catch (e) {
      logError(
        `planet-v2 impostor: applyVisibility threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
