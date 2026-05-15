// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * ImpostorSphere (planet-v2, Story 6.4).
 *
 * Far-field renderer: a single solid-colored sphere positioned at the
 * planet centre, scaled to the planet's radius. Draw call count = 1.
 * Becomes visible when the player flies high enough that the per-tile
 * meshes (TileMeshLayer) and the player's TerrainEntity stop covering
 * the planet's silhouette — most relevant when looking down from
 * altitude or looking sideways from far above.
 *
 * Coordinate frame (planet-v2 tangent frame anchored at the player's
 * spawn chunk):
 *   - Player at world (0, 0, 0), on top of TerrainEntity.
 *   - World +Y is "up" along the planet's radial direction at spawn.
 *   - The planet's 3D centre sits at world (0, -radius, 0) — one
 *     radius below the player along the spawn-chunk's tangent normal.
 *
 * Visual fidelity: this is a flat-colour sphere. A texture-mapped
 * version using each planet's biome PNG (`cfg.biomeMapUrl`) is a
 * follow-on that needs a custom mesh and UV-unwrap; the architecture
 * doc lists it as the eventual real impostor but the solid-colour
 * approximation is good enough for "is the planet there?" at altitude.
 *
 * Active flag semantics:
 *   - `initialize()` dispatches the CreateSphere call. `active` flips
 *     to true immediately, but the entity is `null` until the onLoaded
 *     callback fires.
 *   - `setVisible(false)` hides without destroying; `setVisible(true)`
 *     shows (no-op if not yet loaded — visibility applied when entity
 *     arrives).
 *   - `dispose()` deletes and clears.
 *
 * Verified against WebVerse-Runtime MeshEntity.cs:242 (CreateSphere
 * static method) and BaseEntity.cs:416 (SetScale).
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
  /** True once `initialize()` has dispatched the CreateSphere call,
   *  even before the entity arrives. Tracks "should be visible."  */
  private active = false;
  /** Guards against double-init. */
  private creating = false;

  constructor(cfg: PlanetSceneConfig) {
    this.cfg = cfg;
    this.cbPrefix = callbackPrefix(`impostor_${cfg.planetId}`);
  }

  /**
   * Create the impostor sphere in WebVerse. Idempotent — calling again
   * while a previous init is in flight, or after the entity already
   * exists, is a no-op. Safe to call when the WebVerse runtime globals
   * aren't ready (test env etc.) — it returns silently.
   */
  initialize(): void {
    if (this.creating || this.entity) return;
    const w = webverse();
    if (
      !w.MeshEntity ||
      !w.MeshEntity.CreateSphere ||
      !w.Vector3 ||
      !w.Quaternion ||
      !w.UUID ||
      !w.Color
    ) {
      // Runtime missing — leave as inert. Tests rely on this no-throw
      // behaviour.
      return;
    }

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
          logError('planet-v2 impostor: onLoaded received null entity');
          return;
        }
        this.entity = entity;
        // Unity primitive sphere is diameter 1.0; scale to 2·radius so
        // the player at world origin lands on the surface of a sphere
        // centred at (0, -radius, 0).
        const diameter = 2 * this.cfg.radiusMeters;
        const w2 = webverse();
        if (w2.Vector3) {
          try {
            entity.SetScale?.(new w2.Vector3(diameter, diameter, diameter), false);
          } catch (e) {
            logError(
              `planet-v2 impostor: SetScale threw: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
        this.applyVisibility();
        logInfo(
          `planet-v2 impostor: ready (radius=${this.cfg.radiusMeters}m, ` +
            `centred at world (0, ${-this.cfg.radiusMeters}, 0))`,
        );
      }) as (...a: never[]) => void,
    );

    // Planet centre is one radius below the player along world +Y (the
    // spawn-chunk's tangent up direction). Player spawns at (0, 0, 0).
    const position = new w.Vector3(0, -this.cfg.radiusMeters, 0);
    const rotation = w.Quaternion.identity;
    // Tan/brown placeholder colour — readable as "land" from altitude.
    // Replace with biome-textured custom mesh once a sphere-glb with
    // UV-mapped biome PNG is available server-side.
    const color = new w.Color(0.65, 0.55, 0.40, 1);

    try {
      w.MeshEntity.CreateSphere(
        null,
        color,
        position,
        rotation,
        entityId,
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

  /** Toggle visibility without destroying the entity. */
  setVisible(v: boolean): void {
    this.active = v;
    this.applyVisibility();
  }

  /** Whether the impostor is intended to be visible. Returns true once
   *  `initialize()` is dispatched, regardless of load completion. */
  isActive(): boolean {
    return this.active;
  }

  /** Destroy the entity and reset the active flag. */
  dispose(): void {
    if (this.entity) {
      try {
        this.entity.Delete?.();
      } catch (_e) {
        /* best-effort */
      }
      this.entity = null;
    }
    this.active = false;
    this.creating = false;
  }

  /** Returns the biome map URL — exposed for tests/debug. */
  getBiomeMapUrl(): string {
    return this.cfg.biomeMapUrl;
  }

  private applyVisibility(): void {
    if (!this.entity) return;
    try {
      this.entity.SetVisibility?.(this.active);
      // Static (1) = visible + no collider; Hidden (0) = not visible,
      // GameObject inactive. The impostor is purely visual.
      this.entity.SetInteractionState?.(this.active ? 1 : 0);
    } catch (e) {
      logError(
        `planet-v2 impostor: applyVisibility threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
