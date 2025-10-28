/**
 * Entity types for MyWorlds
 */

import { Position, Rotation } from './config';

export type EntityType = 'mesh' | 'automobile' | 'airplane';

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
