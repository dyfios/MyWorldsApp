// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.
import { describe, it, expect } from 'vitest';
import { ImpostorSphere } from './ImpostorSphere.js';
import type { PlanetSceneConfig } from './types.js';

const cfg: PlanetSceneConfig = {
  planetId: 'p1',
  radiusMeters: 25_000,
  nExponent: 5,
  biomeMapUrl: 'https://example/biome.png',
  chunkServiceBaseUrl: 'https://example/chunks',
};

describe('ImpostorSphere', () => {
  it('starts inactive before initialize', () => {
    const sphere = new ImpostorSphere(cfg);
    expect(sphere.isActive()).toBe(false);
  });

  it('becomes active after initialize', async () => {
    const sphere = new ImpostorSphere(cfg);
    await sphere.initialize();
    expect(sphere.isActive()).toBe(true);
  });

  it('setVisible toggles active flag without re-initializing', async () => {
    const sphere = new ImpostorSphere(cfg);
    await sphere.initialize();
    sphere.setVisible(false);
    expect(sphere.isActive()).toBe(false);
    sphere.setVisible(true);
    expect(sphere.isActive()).toBe(true);
  });

  it('dispose deactivates', async () => {
    const sphere = new ImpostorSphere(cfg);
    await sphere.initialize();
    sphere.dispose();
    expect(sphere.isActive()).toBe(false);
  });

  it('exposes the biome map URL from config', () => {
    const sphere = new ImpostorSphere(cfg);
    expect(sphere.getBiomeMapUrl()).toBe('https://example/biome.png');
  });
});
