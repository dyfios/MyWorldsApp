// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * ImpostorSphere (planet-v2) — STUB.
 *
 * Real implementation requires Story 6.4: a single textured sphere centered
 * on the planet, using the planet's biome PNG as its diffuse map. Draw call
 * count = 1; suppresses other layers when active.
 *
 * v2's first pass focuses on close-range walking (TerrainEntityLayer); the
 * impostor is part of the far-field experience and depends on planet-config
 * carrying a real `biomeMapUrl`. Throws on `initialize()` so the gap stays
 * visible if anything tries to use it before it's real.
 */

import type { PlanetSceneConfig } from './types.js';

export class ImpostorSphere {
  private readonly cfg: PlanetSceneConfig;
  private active = false;

  constructor(cfg: PlanetSceneConfig) {
    this.cfg = cfg;
    void this.cfg;
  }

  initialize(): void {
    throw new Error(
      'planet-v2 ImpostorSphere.initialize: not implemented — requires Story 6.4 ' +
        '(far-field textured sphere using biomeMapUrl). v2 first pass is close-range only.',
    );
  }

  setVisible(_v: boolean): void {
    this.active = false;
    void this.active;
    // No-op. Real impl toggles the mesh's renderer.
  }

  isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    // No-op.
  }
}
