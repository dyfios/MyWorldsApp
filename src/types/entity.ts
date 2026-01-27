/**
 * Entity types for MyWorlds
 */

import { Position, Rotation } from './config';

export type EntityType = 'mesh' | 'automobile' | 'airplane';

/**
 * Entity template definition from the API
 */
export interface EntityTemplate {
  entity_id: string;
  variant_id: string;
  entity_tag: string;
  variant_tag: string;
  type: EntityType;
  assets: string; // JSON string containing model_path etc.
  style?: string; // Optional style field for visual styling
  thumbnail?: string; // Thumbnail image URL for the variant
}

/**
 * Container for entity templates from API response
 */
export interface EntityTemplatesResponse {
  templates: EntityTemplate[];
}

export interface BaseEntity {
  id: string;
  type: EntityType;
  position: Position;
  rotation: Rotation;
  scale: number;
}

export interface MeshEntityData extends BaseEntity {
  type: 'mesh';
  meshUrl: string;
  webVerseEntity?: any; // Reference to the actual WebVerse MeshEntity
}

export interface AutomobileEntityData extends BaseEntity {
  type: 'automobile';
  speed?: number;
  direction?: number;
}

export interface AirplaneEntityData extends BaseEntity {
  type: 'airplane';
  altitude?: number;
  speed?: number;
  heading?: number;
}

export type EntityData = MeshEntityData | AutomobileEntityData | AirplaneEntityData;
