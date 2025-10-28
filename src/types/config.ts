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
}

export interface EntityPlacementData {
  entityId: string;
  variantId: string;
  position: Position;
  rotation?: Rotation;
  scale?: number;
}
