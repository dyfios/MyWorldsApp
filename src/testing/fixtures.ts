/**
 * Default fixtures for the entity-type smoke test.
 * Grows by one entry per supported entity type.
 */

import type { EntityFixture } from './types';

const ASSETS_BASE = (globalThis as any).testAssetsBase as string | undefined;
const hasAssets = (): boolean => typeof ASSETS_BASE === 'string' && ASSETS_BASE.length > 0;
const url = (path: string): string => {
  if (!ASSETS_BASE) return '';
  const base = ASSETS_BASE.endsWith('/') ? ASSETS_BASE.slice(0, -1) : ASSETS_BASE;
  return base + '/' + path;
};

export const DEFAULT_FIXTURES: EntityFixture[] = [
  {
    name: 'basic mesh',
    type: 'mesh',
    expectedCallback: 'onMeshEntityLoadedGeneric',
    skipIf: () => !hasAssets(),
    config: {
      meshUrl: url('cube.glb'),
    },
  },
  {
    name: 'automobile',
    type: 'automobile',
    expectedCallback: 'onAutomobileEntityLoadedGeneric',
    skipIf: () => !hasAssets(),
    config: {
      meshUrl: url('car.glb'),
      wheels: [
        { name: 'FL', radius: 0.35 },
        { name: 'FR', radius: 0.35 },
        { name: 'RL', radius: 0.35 },
        { name: 'RR', radius: 0.35 },
      ],
      mass: 1000,
    },
  },
  {
    name: 'airplane',
    type: 'airplane',
    expectedCallback: 'onAirplaneEntityLoadedGeneric',
    skipIf: () => !hasAssets(),
    config: {
      meshUrl: url('plane.glb'),
      mass: 2000,
    },
  },
  {
    name: 'point light',
    type: 'light',
    expectedCallback: 'onLightEntityLoadedGeneric',
    config: {
      lightType: 'point',
      color: { r: 1, g: 0.8, b: 0.4, a: 1 },
      intensity: 3,
      range: 5,
    },
  },
  {
    name: 'container',
    type: 'container',
    expectedCallback: 'onContainerEntityLoadedGeneric',
    config: {},
  },
  {
    name: 'audio source',
    type: 'audio',
    expectedCallback: 'onAudioEntityLoadedGeneric',
    skipIf: () => !hasAssets(),
    config: {
      clipUrl: url('ambient.wav'),
      loop: true,
      volume: 0.5,
      autoplay: false,
    },
  },
  {
    name: 'voxel',
    type: 'voxel',
    expectedCallback: 'onVoxelEntityLoadedGeneric',
    config: {},
  },
];
