/**
 * Entity module - Manages entity creation, placement, and terrain alignment
 */

import { EntityPlacementData, Position, Rotation } from '../types/config';
import { EntityType, EntityData, MeshEntityData, AutomobileEntityData, AirplaneEntityData } from '../types/entity';

export class EntityPlacement {
  private placementData: Map<string, EntityPlacementData> = new Map();

  store(entityId: string, data: EntityPlacementData): void {
    this.placementData.set(entityId, data);
  }

  retrieve(entityId: string): EntityPlacementData | undefined {
    return this.placementData.get(entityId);
  }

  remove(entityId: string): void {
    this.placementData.delete(entityId);
  }
}

export class EntityManager {
  entityPlacement: EntityPlacement;
  private entities: Map<string, EntityData> = new Map();
  private worldStorage: Map<string, any> = new Map();

  constructor() {
    this.entityPlacement = new EntityPlacement();
  }

  /**
   * Load an entity into the world
   */
  MW_Entity_LoadEntity(
    entityId: string,
    variantId: string,
    type: EntityType,
    position: Position,
    rotation?: Rotation,
    scale: number = 1
  ): string {
    const instanceId = this.generateEntityId();
    
    // Store placement metadata
    this.worldStorage.set(instanceId, {
      entityId,
      variantId,
      type,
      position,
      rotation,
      scale
    });

    // Create entity based on type
    let entity: EntityData;
    
    switch (type) {
      case 'mesh':
        entity = this.createMeshEntity(instanceId, position, rotation || { x: 0, y: 0, z: 0 }, scale);
        break;
      case 'automobile':
        entity = this.createAutomobileEntity(instanceId, position, rotation || { x: 0, y: 0, z: 0 }, scale);
        break;
      case 'airplane':
        entity = this.createAirplaneEntity(instanceId, position, rotation || { x: 0, y: 0, z: 0 }, scale);
        break;
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }

    this.entities.set(instanceId, entity);
    this.MW_Entity_FinishLoadingPlacingEntity(instanceId);

    return instanceId;
  }

  /**
   * Snap entity to terrain
   */
  MW_Entity_SnapEntityToTerrain(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      console.warn(`Entity ${entityId} not found for terrain snapping`);
      return;
    }

    // Terrain snapping logic would go here
    // For now, just log the action
    console.log(`Snapping entity ${entityId} to terrain at position`, entity.position);
  }

  /**
   * Finish loading and placing an entity
   */
  MW_Entity_FinishLoadingPlacingEntity(entityId: string): void {
    const metadata = this.worldStorage.get(entityId);
    if (!metadata) {
      console.warn(`No metadata found for entity ${entityId}`);
      return;
    }

    // Snap to terrain
    this.MW_Entity_SnapEntityToTerrain(entityId);

    // Add to script engine (would integrate with ScriptEngine module)
    console.log(`Entity ${entityId} loading complete`);
  }

  /**
   * Finish loading a placed entity
   */
  MW_Entity_FinishLoadingPlacedEntity(entityId: string): void {
    console.log(`Entity ${entityId} placement complete`);
  }

  private createMeshEntity(id: string, position: Position, rotation: Rotation, scale: number): MeshEntityData {
    return {
      id,
      type: 'mesh',
      position,
      rotation,
      scale,
      meshUrl: '' // Would be set from config
    };
  }

  private createAutomobileEntity(id: string, position: Position, rotation: Rotation, scale: number): AutomobileEntityData {
    return {
      id,
      type: 'automobile',
      position,
      rotation,
      scale,
      speed: 0,
      direction: 0
    };
  }

  private createAirplaneEntity(id: string, position: Position, rotation: Rotation, scale: number): AirplaneEntityData {
    return {
      id,
      type: 'airplane',
      position,
      rotation,
      scale,
      altitude: position.y,
      speed: 0,
      heading: 0
    };
  }

  private generateEntityId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
