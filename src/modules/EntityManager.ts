/**
 * Entity module - Manages entity creation, placement, and terrain alignment
 */

import { Position, Rotation } from '../types/config';
import { EntityData } from '../types/entity';
import { ScriptEngine } from './ScriptEngine';

// Local implementation of AutomobileType enum
enum AutomobileType {
  Car = 0,
  Truck = 1
}

export class EntityPlacement {
  public placingEntity: BaseEntity | null = null;
  public entityType: string | null = null;
  public modelOffset: Vector3 | null = null;
  public placingOffset: Vector3 | null = null;
  public placementLocked: boolean = false;
  public entityIndex: number | null = null;
  public variantIndex: number | null = null;
  public entityID: string | null = null;
  public variantID: string | null = null;
  public instanceID: string | null = null;
  public orientationIndex: number = 0;
  public scripts: { [key: string]: any } = {};
  public wheels: any = null;
  public mass: number = 0;
  public modelRotation: Quaternion | null = null;
  public modelPath: string | null = null;
  public entityBeingPlaced: boolean = false;
  public gridEnabled: boolean = true;
  public gridSize: number = 1;
  public rotationIncrement: number = 90;
  public keepSpawning: boolean = true;

  constructor() {
    // Store this instance in WebVerse Context
    Context.DefineContext("ENTITY_PLACEMENT_COMPONENT", this);
    
    // Set up placement update interval
    this.setupPlacementUpdateInterval();

    this.setupGlobalCallbacks();

    (globalThis as any).entityPlacementComponent = this;
  }

  /**
   * Setup global callback functions for entity placement
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for character entity loading completion
    (globalThis as any).startPlacing = (entityToPlace: BaseEntity, entityType: string,
      entityIndex: number, variantIndex: number, entityID: string, variantID: string,
      modelPath: string, wheels: any, mass: number,
      scripts: { [key: string]: any }, instanceId: string) => {
      this.startPlacing(entityToPlace, entityType, entityIndex, variantIndex, entityID,
        variantID, modelPath, wheels, mass, scripts, instanceId);
    };

    (globalThis as any).stopPlacing = () => {
      this.stopPlacing();
    };

    (globalThis as any).cancelPlacing = () => {
      this.cancelPlacing();
    };

    (globalThis as any).enterDeleteMode = () => {
      this.enterDeleteMode();
    };

    (globalThis as any).exitDeleteMode = () => {
      this.exitDeleteMode();
    };

    (globalThis as any).placementUpdate = () => {
      this.placementUpdate();
    };

    (globalThis as any).rotateOneStep = (axis: string, negative: boolean) => {
      this.rotateOneStep(axis, negative);
    };
  }

  private setupPlacementUpdateInterval(): void {
    Time.SetInterval(`globalThis.placementUpdate();`, 0.1);
  }

  placementUpdate(): void {
    const normalPlacementThreshold = 0.5;
    
    if (this.placingEntity == null) {
      return;
    }
    
    if (this.modelOffset == null) {
      Logging.LogError("[EntityPlacer] Model Offset is null.");
      return;
    }
    
    if (this.modelOffset.x == null || this.modelOffset.y == null || this.modelOffset.z == null) {
      Logging.LogError("[EntityPlacer] Model Offset invalid.");
      return;
    }

    const hitInfo = Input.GetPointerRaycast(Vector3.forward);
    if (hitInfo != null && hitInfo.entity != null) {
      if (hitInfo.entity !== this.placingEntity) {
        let gridSnappedPosition: Vector3;
        
        if (this.gridEnabled) {
          gridSnappedPosition = new Vector3(
            Math.round(hitInfo.hitPoint.x / this.gridSize) * this.gridSize + this.modelOffset.x,
            Math.round(hitInfo.hitPoint.y / this.gridSize) * this.gridSize + this.modelOffset.y,
            Math.round(hitInfo.hitPoint.z / this.gridSize) * this.gridSize + this.modelOffset.z
          );

          // Adjust position based on surface normal
          if (hitInfo.hitPointNormal.x >= normalPlacementThreshold) {
            gridSnappedPosition.x += this.gridSize;
          } else if (hitInfo.hitPointNormal.x <= -normalPlacementThreshold) {
            gridSnappedPosition.x -= this.gridSize;
          }
          
          if (hitInfo.hitPointNormal.y <= -normalPlacementThreshold) {
            gridSnappedPosition.y -= this.gridSize;
          }
          
          if (hitInfo.hitPointNormal.z <= -normalPlacementThreshold) {
            gridSnappedPosition.z -= this.gridSize;
          }
        } else {
          gridSnappedPosition = new Vector3(
            hitInfo.hitPoint.x + this.modelOffset.x,
            hitInfo.hitPoint.y + this.modelOffset.y,
            hitInfo.hitPoint.z + this.modelOffset.z
          );
        }
        
        this.placingEntity.SetPosition(gridSnappedPosition, false, false);
      }
    }
  }

  startPlacing(
    entityToPlace: BaseEntity,
    entityType: string,
    entityIndex: number,
    variantIndex: number,
    entityID: string,
    variantID: string,
    modelPath: string,
    wheels: any,
    mass: number,
    scripts: { [key: string]: any },
    instanceID: string,
    offset?: Vector3,
    rotation?: Quaternion,
    placementOffset?: Vector3
  ): void {
    //WorldStorage.SetItem("TERRAIN-EDIT-LAYER", "-1");
    
    this.exitDeleteMode();
    
    if (this.placingEntity != null) {
      Logging.LogWarning("[EntityPlacer] Placing Entity already assigned. Placing Entity must be stopped.");
      return;
    }
    
    if (entityToPlace == null) {
      Logging.LogWarning("[EntityPlacer] Invalid entity to place.");
      return;
    }
    
    this.entityType = entityType;
    this.modelOffset = offset || Vector3.zero;
    this.modelRotation = rotation || Quaternion.identity;
    this.placingOffset = placementOffset || Vector3.zero;
    this.placingEntity = entityToPlace;
    this.placementLocked = true;
    this.entityIndex = entityIndex;
    this.variantIndex = variantIndex;
    this.entityID = entityID;
    this.variantID = variantID;
    this.modelPath = modelPath;
    this.instanceID = instanceID;
    this.orientationIndex = 0;
    this.scripts = scripts || {};
    this.wheels = wheels;
    this.mass = mass;
    
    entityToPlace.SetHighlight(true);
    // Input.TurnLocomotionMode = Input.VRTurnLocomotionMode.None; // VR-specific, commented out
  }

  stopPlacing(): void {
    if (this.placingEntity == null) {
      if (this.keepSpawning === true && this.entityType && this.entityIndex !== null && 
        this.variantIndex !== null && this.entityID && this.variantID) {
        const instanceID = UUID.NewUUID().ToString();
        (globalThis as any).loadEntity(this.entityIndex, this.variantIndex, instanceID,
          this.entityIndex + "." + this.variantIndex + "." + instanceID, this.entityID, this.variantID,
          null, this.entityType, Vector3.zero, Quaternion.identity, Vector3.one, this.modelPath,
          [ this.modelPath ], this.wheels, this.mass, AutomobileType.Car, this.scripts, true);
      }
      return;
    }
    
    //if (this.placementLocked === true) {
    //  return;
    //}
    
    const pos: Vector3 = (globalThis as any).tiledsurfacerenderer_getWorldPositionForRenderedPosition(this.placingEntity.GetPosition(false));
    //const rot: Quaternion = this.placingEntity.GetRotation(false);
    const terrainIndex = (globalThis as any).tiledsurfacerenderer_getRegionIndexForWorldPos(pos);
    //const regionPos = (globalThis as any).tiledsurfacerenderer_getRegionPosForWorldPos(pos, terrainIndex);

    // Send REST request to add entity instance
    if (this.instanceID && this.entityID && this.variantID) {
      // This would integrate with your REST module
      Logging.Log(`[EntityPlacer] Placing entity at position: ${pos.x}, ${pos.y}, ${pos.z}`);
    }
    
    // Handle scripts if present
    if (this.scripts != null && Object.keys(this.scripts).length > 0) {
      Logging.Log("[EntityPlacer] Adding scripts to placed entity");
      ((globalThis as any).scriptEngine as ScriptEngine).addScriptEntity(this.placingEntity, this.scripts);

      ((globalThis as any).scriptEngine as ScriptEngine).runOnCreateScript(this.placingEntity);

      if (this.scripts["0_25_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add0_25IntervalScript(this.placingEntity, this.scripts["0_25_update"]);
      }

      if (this.scripts["0_5_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add0_5IntervalScript(this.placingEntity, this.scripts["0_5_update"]);
      }

      if (this.scripts["1_0_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add1_0IntervalScript(this.placingEntity, this.scripts["1_0_update"]);
      }

      if (this.scripts["2_0_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add2_0IntervalScript(this.placingEntity, this.scripts["2_0_update"]);
      }
    }

    // Finalize placement
    this.placingEntity.SetParent((globalThis as any).tiledsurfacerenderer.getTerrainTileForIndex(terrainIndex));
    this.placingEntity.SetHighlight(false);
    if (this.placingEntity instanceof AutomobileEntity || this.placingEntity instanceof AirplaneEntity) {
      this.placingEntity.SetInteractionState(InteractionState.Physical);
    }
    this.placingEntity = null;
    
    if (this.keepSpawning === true && this.entityID && this.variantID) {
      const instanceID = UUID.NewUUID().ToString();
      (globalThis as any).loadEntity(this.entityIndex, this.variantIndex, instanceID,
        this.entityIndex + "." + this.variantIndex + "." + instanceID, this.entityID, this.variantID,
        null, this.entityType, Vector3.zero, Quaternion.identity, Vector3.one, this.modelPath,
        [ this.modelPath ], this.wheels, this.mass, AutomobileType.Car, this.scripts, true);
    }

    this.entityBeingPlaced = false;
    // Input.TurnLocomotionMode = Input.VRTurnLocomotionMode.Snap; // VR-specific, commented out
  }

  cancelPlacing(): void {
    if (this.placingEntity != null) {
      this.placingEntity.Delete();
      this.placingEntity = null;
    }

    this.entityBeingPlaced = false;
    // Input.TurnLocomotionMode = Input.VRTurnLocomotionMode.Snap; // VR-specific, commented out
  }
  
  enterDeleteMode(): void {
    this.stopPlacing();
    WorldStorage.SetItem("ENTITY-DELETE-ENABLED", "TRUE");
  }
  
  exitDeleteMode(): void {
    WorldStorage.SetItem("ENTITY-DELETE-ENABLED", "FALSE");
  }
  
  toggleOrientation(): void {
    if (this.placingEntity == null) {
      return;
    }
    
    const configModule = Context.GetContext("CONFIGURATION_MODULE");
    if (!configModule || this.entityIndex === null || this.variantIndex === null) {
      return;
    }
    
    this.orientationIndex++;
    const validOrientations = configModule.entitiesConfig[this.entityIndex].variants[this.variantIndex].valid_orientations;
    if (this.orientationIndex > validOrientations.length - 1) {
      this.orientationIndex = 0;
    }
    
    const orientation = validOrientations[this.orientationIndex];
    this.placingEntity.SetPosition(new Vector3(
      orientation.model_offset.x,
      orientation.model_offset.y,
      orientation.model_offset.z
    ), false);
    
    this.placingEntity.SetRotation(new Quaternion(
      orientation.model_rotation.x,
      orientation.model_rotation.y,
      orientation.model_rotation.z,
      orientation.model_rotation.w
    ), false);
    
    this.modelOffset = orientation.model_offset;
    this.placingOffset = orientation.placement_offset;
    Context.DefineContext("ENTITY_PLACEMENT_COMPONENT", this);
  }
  
  rotateOneStep(axis: string, negative: boolean): void {
    if (this.placingEntity == null) {
      return;
    }
    
    const currentRot = this.placingEntity.GetEulerRotation(false);
    let rotIncrement = this.rotationIncrement;
    
    if (negative) {
      rotIncrement = -rotIncrement;
    }

    switch (axis) {
      case "x":
        this.placingEntity.SetEulerRotation(new Vector3(
          currentRot.x + rotIncrement, currentRot.y, currentRot.z), false);
        break;
      case "y":
        this.placingEntity.SetEulerRotation(new Vector3(
          currentRot.x, currentRot.y + rotIncrement, currentRot.z), false);
        break;
      case "z":
        this.placingEntity.SetEulerRotation(new Vector3(
          currentRot.x, currentRot.y, currentRot.z + rotIncrement), false);
        break;
      default:
        Logging.LogError("[EntityPlacer] Invalid placement axis.");
        return;
    }
  }
}

export class EntityManager {
  entityPlacement: EntityPlacement;
  private entities: Map<string, EntityData> = new Map();
  private worldStorage: Map<string, any> = new Map();

  private currentEntityIndex: string = "";
  private currentVariantIndex: string = "";
  private currentEntityId: string = "";
  private currentVariantId: string = "";
  private currentModelPath: string = "";
  private currentWheels: any | undefined = undefined;
  private currentMass: number | undefined = undefined;
  private currentScripts: string | undefined = undefined;

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

    (globalThis as any).onMeshEntityLoadedGenericPlacing = (entity: any) => {
      this.onMeshEntityLoadedGenericPlacing(entity);
    };

    (globalThis as any).onAutomobileEntityLoadedGeneric = (entity: AutomobileEntity) => {
      this.onAutomobileEntityLoadedGeneric(entity);
    };

    (globalThis as any).onAutomobileEntityLoadedGenericPlacing = (entity: AutomobileEntity) => {
      this.onAutomobileEntityLoadedGenericPlacing(entity);
    };

    (globalThis as any).triggerEntityInstancesAfterTemplates = () => {
      this.triggerEntityInstancesAfterTemplates();
    };

    (globalThis as any).loadEntity = (
      entityIndex: string,
      variantIndex: string,
      instanceId: string,
      instanceTag: string | undefined,
      entityId: string,
      variantId: string,
      entityParent: string | undefined,
      type: string,
      position: Vector3,
      rotation: Quaternion,
      scale: Vector3,
      meshObject: string,
      meshResources: string[],
      wheels: any | undefined,
      mass: number | undefined,
      autoType: AutomobileType | undefined,
      scripts: string | undefined,
      placingEntity: boolean | undefined
    ): string => {
      return this.loadEntity(
        entityIndex,
        variantIndex,
        instanceId,
        instanceTag,
        entityId,
        variantId,
        entityParent,
        type,
        position,
        rotation,
        scale,
        meshObject,
        meshResources,
        wheels,
        mass,
        autoType,
        scripts,
        placingEntity
      );
    };
  }

  /**
   * Load an entity into the world
   */
  loadEntity(
    entityIndex: string | null,
    variantIndex: string | null,
    instanceId: string,
    instanceTag: string | undefined,
    entityId: string,
    variantId: string,
    entityParent: string | undefined,
    type: string,
    position: Vector3,
    rotation: Quaternion,
    scale: Vector3 = new Vector3(1, 1, 1),
    meshObject: string,
    meshResources: string[],
    wheels: any | undefined = undefined,
    mass: number | undefined = undefined,
    autoType: AutomobileType | undefined = undefined,
    scripts: string | undefined = undefined,
    placingEntity: boolean = false
  ): string {
    let parentEntity = null;
    if (entityParent != null && entityParent != undefined && entityParent !== "" && entityParent != "null") {
      parentEntity = Entity.Get(entityParent);
    }
    if (entityId == null || variantId == null || scale == null) {

    }
    this.currentEntityIndex = entityIndex || "";
    this.currentVariantIndex = variantIndex || "";
    this.currentEntityId = entityId;
    this.currentVariantId = variantId || "";
    this.currentModelPath = meshObject;
    this.currentWheels = wheels;
    var automobileWheels: AutomobileEntityWheel[] = [];
    if (wheels != null && wheels != undefined) {
      for (var wheel in wheels) {
        automobileWheels.push(new AutomobileEntityWheel(wheels[wheel].name as string, wheels[wheel].radius as number));
      }
    }
    //this.currentWheels = automobileWheels;
    this.currentMass = mass;
    this.currentScripts = scripts;
    if (type == null || type === "") {
      type = "mesh";
    }
    switch (type) {
      case 'mesh':
        var onCompleteCallback = 'onMeshEntityLoadedGeneric';
        if (placingEntity) {
          onCompleteCallback = 'onMeshEntityLoadedGenericPlacing';
        } else {
          onCompleteCallback = 'onMeshEntityLoadedGeneric';
        }
        MeshEntity.Create(parentEntity, meshObject, meshResources, position, rotation, instanceId,
          onCompleteCallback, false);
        break;
      case 'automobile':
        if (!wheels || mass === undefined || autoType === undefined) {
          throw new Error('Missing automobile parameters: wheels, mass, or autoType');
        }
        if (placingEntity) {
          AutomobileEntity.Create(parentEntity, meshObject, meshResources, position, rotation, automobileWheels,
            mass, autoType, instanceId, instanceTag, 'onAutomobileEntityLoadedGenericPlacing', false);
          break;
        } else {
          AutomobileEntity.Create(parentEntity, meshObject, meshResources, position, rotation, automobileWheels,
            mass, autoType, instanceId, instanceTag, 'onAutomobileEntityLoadedGeneric', false);
        }
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

    return instanceId;
  }

  /**
   * Snap entity to terrain
   */
  snapEntityToTerrain(entityId: string): void {
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
   * Finish loading a placed entity
   */
  finishLoadingPlacedEntity(entityId: string): void {
    Logging.Log(`Entity ${entityId} placement complete`);
  }

  onMeshEntityLoadedGeneric(entity: MeshEntity): void {
    Logging.Log(`✓ Mesh entity loaded successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);
    var scripts = this.currentScripts as any;
    if (scripts != null) {
      ((globalThis as any).scriptEngine as ScriptEngine).addScriptEntity(entity, scripts);

      ((globalThis as any).scriptEngine as ScriptEngine).runOnCreateScript(entity);

      if (scripts["0_25_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add0_25IntervalScript(entity, scripts["0_25_update"]);
      }
      if (scripts["0_5_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add0_5IntervalScript(entity, scripts["0_5_update"]);
      }
      if (scripts["1_0_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add1_0IntervalScript(entity, scripts["1_0_update"]);
      }
      if (scripts["2_0_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add2_0IntervalScript(entity, scripts["2_0_update"]);
      }
    }
  }

  onMeshEntityLoadedGenericPlacing(entity: MeshEntity): void {
    Logging.Log(`✓ Mesh entity loaded for placement successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);
    var scripts = this.currentScripts;
    (globalThis as any).startPlacing(entity, "mesh", this.currentEntityIndex, this.currentVariantIndex, this.currentEntityId,
      this.currentVariantId, this.currentModelPath, this.currentWheels, this.currentMass, scripts, entity.id);
  }

  onAutomobileEntityLoadedGeneric(entity: AutomobileEntity): void {
    Logging.Log(`✓ Automobile entity loaded successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);
    var scripts = this.currentScripts as any;
    if (scripts != null) {
      ((globalThis as any).scriptEngine as ScriptEngine).addScriptEntity(entity, scripts);
      ((globalThis as any).scriptEngine as ScriptEngine).runOnCreateScript(entity);

      if (scripts["0_25_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add0_25IntervalScript(entity, scripts["0_25_update"]);
      }
      if (scripts["0_5_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add0_5IntervalScript(entity, scripts["0_5_update"]);
      }
      if (scripts["1_0_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add1_0IntervalScript(entity, scripts["1_0_update"]);
      }
      if (scripts["2_0_update"] != null) {
        ((globalThis as any).scriptEngine as ScriptEngine).add2_0IntervalScript(entity, scripts["2_0_update"]);
      }
    }
  }

  onAutomobileEntityLoadedGenericPlacing(entity: AutomobileEntity): void {
    Logging.Log(`✓ Automobile entity loaded for placement successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);
    var scripts = this.currentScripts;
    (globalThis as any).startPlacing(entity, "automobile", this.currentEntityIndex, this.currentVariantIndex, this.currentEntityId,
      this.currentVariantId, this.currentModelPath, this.currentWheels, this.currentMass, scripts, entity.id);
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

// Global helper functions for entity placement
export function onPositionEntityResponseReceived(response: string): void {
  if (response != null) {
    try {
      const parsedResponse = JSON.parse(response);
      if (parsedResponse != null) {
        if (parsedResponse["accepted"] === true) {
          Logging.Log("[EntityPlacer] Entity placement accepted by server");
        } else {
          Logging.Log("Position Entity Rejected: " + parsedResponse["response"]);
        }
      }
    } catch (error) {
      Logging.LogError("[EntityPlacer] Failed to parse placement response: " + error);
    }
  }
}