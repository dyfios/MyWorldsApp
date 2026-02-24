/**
 * Core configuration types for MyWorlds
 */

export interface WorldConfig {
  entities?: EntityConfig[];
  terrain?: TerrainConfig;
  worldUri?: string;
}

export interface EntityConfig {
  entityId: string;
  name: string;
  variants: VariantConfig[];
}

export interface VariantConfig {
  variantId: string;
  name: string;
  orientations?: OrientationConfig[];
  meshUrl?: string;
  scriptUrl?: string;
}

export interface OrientationConfig {
  name: string;
  rotation: number;
}

export interface TerrainConfig {
  layers: TerrainLayerConfig[];
  heightScale?: number;
  baseLevel?: number;
}

export interface TerrainLayerConfig {
  type: string;
  url?: string;
  scale?: number;
  offset?: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface EntityPlacementData {
  entityId: string;
  variantId: string;
  position: Position;
  rotation?: Rotation;
  scale?: number;
}

export interface SpawnConfig {
  /** Default spawn position for the world */
  position: Position;
  /** Optional facing direction at spawn */
  rotation?: Rotation;
}

export interface SkyConfig {
  /** Sky rendering mode. Default: 'day-night' */
  type?: 'day-night' | 'constant-color' | 'solid-color' | 'texture';
  /** Named preset for day-night or constant-color modes */
  preset?: string;
  /** Texture URI for 'texture' mode */
  texture?: string;
  /** Color for 'solid-color' mode */
  color?: { r: number; g: number; b: number; a?: number };
  /** Optional fog settings (applies to all sky modes) */
  fog?: {
    enabled: boolean;
    color?: { r: number; g: number; b: number; a?: number };
    density?: number;
  };
}
