// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * ImpostorSphere (Story 6.4).
 *
 * Far-field renderer: a single textured sphere positioned at the planet
 * center, using the server-baked biome PNG as its diffuse map. Draw call
 * count = 1; layers behind this are suppressed when the impostor is active.
 */

import type { PlanetSceneConfig } from './types.js';

export class ImpostorSphere {
  private readonly cfg: PlanetSceneConfig;
  private active = false;

  constructor(cfg: PlanetSceneConfig) {
    this.cfg = cfg;
  }

  /** Create the textured sphere mesh entity via WebVerse MeshEntity. */
  async initialize(): Promise<void> {
    // Runtime-gated: actual mesh construction uses MeshEntity + Material APIs.
    // Intentionally stubbed here — the orchestrator wires the concrete call
    // path once running inside WebVerse.
    this.active = true;
  }

  /** Show/hide without destroying the mesh. */
  setVisible(v: boolean): void {
    this.active = v;
  }

  isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.active = false;
  }

  /** Expose the biome-map URL for tests and debugging. */
  getBiomeMapUrl(): string {
    return this.cfg.biomeMapUrl;
  }
}
