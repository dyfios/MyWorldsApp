/**
 * Entity module - Manages entity creation, placement, and terrain alignment
 */

import { EntityPlacementData, Position, Rotation } from '../types/config';
import { EntityData } from '../types/entity';

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
    this.setupGlobalCallbacks();
  }

  /**
   * Setup global callback functions for WebVerse entity loading
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for mesh entity loading completion
    (globalThis as any).onMeshEntityLoadedGeneric = (entity: any) => {
      this.onMeshEntityLoadedGeneric(entity);
    };

    (globalThis as any).triggerEntityTemplatesAfterLogin = () => {
      this.triggerEntityTemplatesAfterLogin();
    };

    (globalThis as any).triggerEntityInstancesAfterTemplates = () => {
      this.triggerEntityInstancesAfterTemplates();
    };
  }

  /**
   * Load an entity into the world
   */
  MW_Entity_LoadEntity(
    instanceId: string,
    instanceTag: string,
    entityId: string,
    variantId: string,
    entityParent: string,
    type: string,
    position: Vector3,
    rotation: Quaternion,
    scale: Vector3 = new Vector3(1, 1, 1),
    meshObject: string,
    meshResources: string[],
    wheels: AutomobileEntityWheel[] | undefined = undefined,
    mass: number | undefined = undefined,
    autoType: AutomobileType | undefined = undefined
  ): string {
    let parentEntity = null;
    if (entityParent != null && entityParent !== "" && entityParent != "null") {
      parentEntity = Entity.Get(entityParent);
    }
if (entityId == null || variantId == null || scale == null) {

}
    switch (type) {
      case 'mesh':
        MeshEntity.Create(parentEntity, meshObject, meshResources, position, rotation, instanceId,
          'onMeshEntityLoadedGeneric', false);
        break;
      case 'automobile':
        if (!wheels || mass === undefined || !autoType) {
          throw new Error('Missing automobile parameters: wheels, mass, or autoType');
        }
        Logging.Log("meshobject " + meshObject);
        AutomobileEntity.Create(parentEntity, meshObject, meshResources, position, rotation, wheels,
          mass, autoType, instanceId, instanceTag, 'onAutomobileEntityLoadedGeneric', false);
        break;
      case 'airplane':
        if (mass === undefined) {
          throw new Error('Missing airplane parameter: mass');
        }

        AirplaneEntity.Create(parentEntity, meshObject, meshResources, position, rotation, mass,
          instanceId, instanceTag, 'onAirplaneEntityLoadedGeneric', false);
        break;
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }

    this.MW_Entity_FinishLoadingPlacingEntity(instanceId);

    return instanceId;
  }

  /**
   * Snap entity to terrain
   */
  MW_Entity_SnapEntityToTerrain(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      Logging.LogWarning(`Entity ${entityId} not found for terrain snapping`);
      return;
    }

    // Terrain snapping logic would go here
    // For now, just log the action
    Logging.Log(`Snapping entity ${entityId} to terrain at position ` + JSON.stringify(entity.position));
  }

  /**
   * Finish loading and placing an entity
   */
  MW_Entity_FinishLoadingPlacingEntity(entityId: string): void {
    const metadata = this.worldStorage.get(entityId);
    if (!metadata) {
      Logging.LogWarning(`No metadata found for entity ${entityId}`);
      return;
    }

    // Snap to terrain
    this.MW_Entity_SnapEntityToTerrain(entityId);

    // Add to script engine (would integrate with ScriptEngine module)
    Logging.Log(`Entity ${entityId} loading complete`);
  }

  /**
   * Finish loading a placed entity
   */
  MW_Entity_FinishLoadingPlacedEntity(entityId: string): void {
    Logging.Log(`Entity ${entityId} placement complete`);
  }

  onMeshEntityLoadedGeneric(entity: any): void {
    Logging.Log(`✓ Mesh entity loaded successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);
  }

  triggerEntityTemplatesAfterLogin(): void {
    Logging.Log('🎯 triggerEntityTemplatesAfterLogin: Called after successful authentication');
    if ((globalThis as any).pendingEntityTemplateRequest &&
      typeof (globalThis as any).pendingEntityTemplateRequest.loadEntityTemplates === 'function') {
      Logging.Log('🔄 Executing pending entity templates request...');
      (globalThis as any).pendingEntityTemplateRequest.loadEntityTemplates();
      (globalThis as any).pendingEntityTemplateRequest = null;
    } else {
      Logging.Log('⚠️ No pending entity template request found');
    }
  }

  triggerEntityInstancesAfterTemplates(): void {
    Logging.Log('🎯 triggerEntityInstancesAfterTemplates: Called after successful templates loading');
    if ((globalThis as any).pendingEntityInstanceRequest &&
      typeof (globalThis as any).pendingEntityInstanceRequest.requestEntityInstances === 'function') {
      Logging.Log('🔄 Executing pending entity instances request...');
      (globalThis as any).pendingEntityInstanceRequest.requestEntityInstances();
      (globalThis as any).pendingEntityInstanceRequest = null;
    } else {
      Logging.Log('⚠️ No pending entity instances request found');
    }
  }

  /**
   * Get a WebVerse entity by its ID
   */
  getWebVerseEntity(entityId: string): any {
    return this.worldStorage.get(`entity_${entityId}`);
  }

  /**
   * Update the position of a mesh entity using WebVerse API
   */
  updateEntityPosition(entityId: string, position: Position): boolean {
    const webVerseEntity = this.getWebVerseEntity(entityId);
    if (webVerseEntity) {
      const worldPosition = new Vector3(position.x, position.y, position.z);
      const success = webVerseEntity.SetPosition(worldPosition);
      if (success) {
        // Update our local data as well
        const entityData = this.entities.get(entityId);
        if (entityData) {
          entityData.position = position;
        }
        Logging.Log(`✓ Updated entity ${entityId} position to (${position.x}, ${position.y}, ${position.z})`);
      }
      return success;
    }
    Logging.LogWarning(`Entity ${entityId} not found for position update`);
    return false;
  }

  /**
   * Update the rotation of a mesh entity using WebVerse API
   */
  updateEntityRotation(entityId: string, rotation: Rotation): boolean {
    const webVerseEntity = this.getWebVerseEntity(entityId);
    if (webVerseEntity) {
      const worldRotation = Quaternion.FromEulerAngles(rotation.x, rotation.y, rotation.z);
      const success = webVerseEntity.SetRotation(worldRotation);
      if (success) {
        // Update our local data as well
        const entityData = this.entities.get(entityId);
        if (entityData) {
          entityData.rotation = rotation;
        }
        Logging.Log(`✓ Updated entity ${entityId} rotation to (${rotation.x}, ${rotation.y}, ${rotation.z})`);
      }
      return success;
    }
    Logging.LogWarning(`Entity ${entityId} not found for rotation update`);
    return false;
  }

  /**
   * Delete a mesh entity using WebVerse API
   */
  deleteEntity(entityId: string): boolean {
    const webVerseEntity = this.getWebVerseEntity(entityId);
    if (webVerseEntity) {
      const success = webVerseEntity.Delete();
      if (success) {
        // Clean up our local storage
        this.entities.delete(entityId);
        this.worldStorage.delete(`entity_${entityId}`);
        this.worldStorage.delete(entityId);
        Logging.Log(`✓ Deleted entity ${entityId}`);
      }
      return success;
    }
    Logging.LogWarning(`Entity ${entityId} not found for deletion`);
    return false;
  }
}
