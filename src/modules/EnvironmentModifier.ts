/**
 * Environment Modifier - Handles environmental changes and effects
 */

import { VOSSynchronizer } from "./VOSSynchronizer";
import { TiledSurfaceRenderer } from "./WorldRendererFactory";
import { ScriptEngine } from "./ScriptEngine";

export class EnvironmentModifier {
  private interactionMode: string = "HAND";
    private lastTouchedEntity: BaseEntity | null = null;

  constructor() {
        (globalThis as any).environmentModifier = this;
    this.setupGlobalCallbacks();
        this.startTouchHoverTracking();
  }

  /**
   * Setup global callback functions for input routing
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for handling left button press
    (globalThis as any).handleLeftPress = () => {
      this.handleLeftPress();
    };

    // Define global callback for handling right button press
    (globalThis as any).handleRightPress = () => {
      this.handleRightPress();
    };

    // Define global callback for performing rotation
    (globalThis as any).performRotate = (direction: string, negative: boolean) => {
      this.performRotate(direction, negative);
    };

    // Define global callback for processing grip press
    (globalThis as any).processGripPress = () => {
      this.processGripPress();
    };

    // Define global callback for processing trigger press
    (globalThis as any).processTriggerPress = () => {
      this.processTriggerPress();
    };

    // Define global callback for setting interaction mode
    (globalThis as any).setInteractionMode = (mode: string) => {
      this.setInteractionMode(mode);
    };

        (globalThis as any).processTouchHover = () => {
            this.processTouchHover();
        };

    // Define global callback for terrain dig REST response
    (globalThis as any).onTerrainDigRESTResponse = (response: any) => {
        this.onTerrainDigRESTResponse(response);
    };

    // Define global callback for terrain build REST response
    (globalThis as any).onTerrainBuildRESTResponse = (response: any) => {
        this.onTerrainBuildRESTResponse(response);
    };
  }

  /**
   * Set the current interaction mode
   */
  setInteractionMode(mode: string): void {
        if (this.interactionMode === "HAND" && mode !== "HAND") {
            this.clearTouchedEntity();
        }
    this.interactionMode = mode;
  }

    private startTouchHoverTracking(): void {
        Time.SetInterval("globalThis.processTouchHover();", 0.1);
    }

    private getScriptEngine(): ScriptEngine | null {
        const scriptEngine = (globalThis as any).scriptEngine as ScriptEngine | undefined;
        if (!scriptEngine) {
            return null;
        }
        return scriptEngine;
    }

    private isScriptableEntity(entity: BaseEntity | null): entity is BaseEntity {
        if (entity == null) {
            return false;
        }
        const isMesh = typeof MeshEntity !== 'undefined' && entity instanceof MeshEntity;
        const isAutomobile = typeof AutomobileEntity !== 'undefined' && entity instanceof AutomobileEntity;
        const isAirplane = typeof AirplaneEntity !== 'undefined' && entity instanceof AirplaneEntity;
        return isMesh || isAutomobile || isAirplane;
    }

    private getInteractionHitInfo(pointerIndex?: number): RaycastHitInfo | null {
        const isFullClient = (globalThis as any).uiManager?.clientType === 'full';
        if (isFullClient) {
            const isVR = (globalThis as any).playerController?.inVR === true;
            const idx = (pointerIndex != null && isVR) ? pointerIndex : 0;
            return Input.GetPointerRaycast(Vector3.forward, idx);
        }

        // Browser/lite mode often needs camera center raycast.
        return Camera.GetRaycast();
    }

    private clearTouchedEntity(): void {
        if (this.lastTouchedEntity == null) {
            return;
        }

        const scriptEngine = this.getScriptEngine();
        if (scriptEngine) {
            scriptEngine.runOnUntouchScript(this.lastTouchedEntity);
        }
        this.lastTouchedEntity = null;
    }

    processTouchHover(): void {
        if (this.interactionMode !== "HAND") {
            this.clearTouchedEntity();
            return;
        }

        const scriptEngine = this.getScriptEngine();
        if (!scriptEngine) {
            return;
        }

        const hitInfo = this.getInteractionHitInfo(1);
        const touchedEntity = this.isScriptableEntity(hitInfo?.entity ?? null) ? hitInfo!.entity : null;

        if (this.lastTouchedEntity?.id?.ToString() === touchedEntity?.id?.ToString()) {
            return;
        }

        if (this.lastTouchedEntity != null) {
            scriptEngine.runOnUntouchScript(this.lastTouchedEntity);
        }

        this.lastTouchedEntity = touchedEntity;
        if (this.lastTouchedEntity != null) {
            scriptEngine.runOnTouchScript(this.lastTouchedEntity);
        }
    }

    private tryRunUseScriptOnHitEntity(hitInfo: RaycastHitInfo | null): void {
        if (this.interactionMode !== "HAND" || !hitInfo || !this.isScriptableEntity(hitInfo.entity)) {
            return;
        }

                Logging.Log('[use] HAND: target=' + hitInfo.entity.id
                    + ' tag=' + ((hitInfo.entity as any)?.tag || '(none)')
                    + ' type=' + hitInfo.entity.constructor?.name);

        const scriptEngine = this.getScriptEngine();
        if (scriptEngine) {
            scriptEngine.runOnUseScript(hitInfo.entity);
        } else {
            Logging.LogWarning('[use] HAND: scriptEngine unavailable for ' + hitInfo.entity.id);
        }
    }

  /**
   * Handle left mouse button press
   */
  private handleLeftPress(): void {
    const isFirstPerson = (globalThis as any).playerController?.cameraMode === 'firstPerson';
    var hitInfo = isFirstPerson ? Camera.GetRaycast() : Input.GetPointerRaycast(Vector3.forward);

    if (this.interactionMode == "HAND") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo instanceof AutomobileEntity) {
                    
                }
                else if (hitInfo.entity instanceof AirplaneEntity) {
                    
                }

                this.tryRunUseScriptOnHitEntity(hitInfo);
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-1") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-2") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 2);
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-4") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 4);
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-8") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 8);
                }
            }
        }
    }
    else if (this.interactionMode == "SLEDGE-HAMMER") {
        Logging.Log('[SLEDGE] hitInfo=' + (hitInfo != null) + ' entity=' + (hitInfo?.entity != null) + ' entityType=' + (hitInfo?.entity?.constructor?.name || 'unknown') + ' isMesh=' + (hitInfo?.entity instanceof MeshEntity) + ' isAuto=' + (hitInfo?.entity instanceof AutomobileEntity) + ' isAir=' + (hitInfo?.entity instanceof AirplaneEntity));
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof MeshEntity ||
                    hitInfo.entity instanceof AutomobileEntity || hitInfo.entity instanceof AirplaneEntity) {
                    this.deleteEntity(hitInfo.entity);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-0") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 0);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-1") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-2") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 2);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-3") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 3);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-4") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 4);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-5") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 5);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-6") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 6);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-7") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 7);
                }
            }
        }
    }
    else if (this.interactionMode == "ENTITY-PLACING") {
        Logging.Log('[handleLeftPress] ENTITY-PLACING: hitInfo=' + (hitInfo != null ? 'non-null' : 'null'));
        if (hitInfo != null) {
            Logging.Log('[handleLeftPress] hitInfo.entity=' + (hitInfo.entity != null ? hitInfo.entity.id + ' type=' + hitInfo.entity.constructor?.name : 'null'));
            if (hitInfo.entity != null) {
                const isTE = hitInfo.entity instanceof TerrainEntity;
                const isME = hitInfo.entity instanceof MeshEntity;
                const isAE = hitInfo.entity instanceof AutomobileEntity;
                const isAP = hitInfo.entity instanceof AirplaneEntity;
                Logging.Log('[handleLeftPress] instanceof: TE=' + isTE + ' ME=' + isME + ' AE=' + isAE + ' AP=' + isAP);
                if (isTE || isME || isAE || isAP) {
                    Logging.Log('[handleLeftPress] Calling stopPlacing()');
                    (globalThis as any).stopPlacing();
                } else {
                    Logging.LogWarning('[handleLeftPress] Entity hit but not a valid placement surface type');
                }
            } else {
                Logging.LogWarning('[handleLeftPress] hitInfo.entity is null (hit non-entity geometry)');
            }
        } else if ((globalThis as any).entityPlacementComponent?.placingEntity != null) {
            // Fallback for browser mode: entity is already positioned by placementUpdate
            Logging.Log('[handleLeftPress] hitInfo null but placingEntity exists - calling stopPlacing()');
            (globalThis as any).stopPlacing();
        } else {
            Logging.LogWarning('[handleLeftPress] hitInfo null AND no placingEntity - cannot place');
        }
    }
  }

  onTerrainDigRESTResponse(response: any): void {
    if (response != null) {
        var parsedResponse = JSON.parse(response);
        if (parsedResponse != null) {
            if (parsedResponse["accepted"] === true) {
                Logging.Log('Terrain dig operation accepted by server');
            } else {
                Logging.LogError('Terrain dig operation rejected by server: ' + parsedResponse["response"]);
            }
        }
    }
  }

  onTerrainBuildRESTResponse(response: any): void {
    if (response != null) {
        var parsedResponse = JSON.parse(response);
        if (parsedResponse != null) {
            if (parsedResponse["accepted"] === true) {
                Logging.Log('Terrain build operation accepted by server');
            } else {
                Logging.LogError('Terrain build operation rejected by server: ' + parsedResponse["response"]);
            }
        }
    }
  }

  /**
   * Perform digging action on a terrain entity
   */
  performDig(terrainEntity: TerrainEntity, hitInfo: RaycastHitInfo, brushSize: number): void {
    Logging.Log('Performing dig operation on terrain entity "' + terrainEntity.id +
      '" with brush size ' + brushSize + ' at position ' + hitInfo.hitPoint.toString());

    try {
      var brushMinHeight: number = 0;
      var gridSize: number = 1;

      var terrainIndex: Vector2Int = (globalThis as any).tiledsurfacerenderer_getIndexForTerrainTile(terrainEntity);

      // Align the hit point to the grid
      var alignedHitPoint = new Vector3(
        Math.round(hitInfo.hitPoint.x / gridSize) * gridSize,
        Math.round(hitInfo.hitPoint.y / gridSize) * gridSize,
        Math.round(hitInfo.hitPoint.z / gridSize) * gridSize);

      // Check if the dig position is above minimum height
      if (alignedHitPoint.y >= brushMinHeight) {
        var layerToUse = (globalThis as any).tiledsurfacerenderer_getMaterialForDigging(terrainIndex, alignedHitPoint.y);
        
        Logging.Log("Executing dig at aligned position: " + alignedHitPoint.toString() + 
                    " with brush size: " + brushSize + " and layer: " + layerToUse);
        
        // Perform the dig operation using roundedCube brush type
        var digSuccess = terrainEntity.Dig(alignedHitPoint,
            TerrainEntityBrushType.roundedCube, layerToUse, brushSize, true);

        const userId = this.getUserId();
        const userToken = this.getUserToken();

        var tsr = (globalThis as any).tiledsurfacerenderer as TiledSurfaceRenderer;

        // REST API call to notify server of terrain dig
        if (tsr && tsr.stateServiceClient) {
            tsr.stateServiceClient.sendTerrainDigRequest(
                terrainIndex, alignedHitPoint, layerToUse, brushSize,
                userId, userToken, "onTerrainDigRESTResponse");
        }

        // Synchronize with server about the dig operation
        var wsync = (globalThis as any).wsync_instance as VOSSynchronizer;
        if (tsr && wsync) {
            wsync.SendTerrainDigUpdate(tsr.regionSynchronizers[terrainIndex.x + '.' + terrainIndex.y],
                alignedHitPoint, "roundedcube", layerToUse); // TODO add brush size
        }
        
        if (digSuccess) {
            Logging.Log("Dig operation completed successfully");
        } else {
            Logging.LogError("Dig operation failed");
        }
      } else {
        Logging.Log("Dig position below minimum height (" + brushMinHeight + "), operation cancelled");
      }
    } catch (error) {
      Logging.LogError("Error during dig operation: " + error);
    }
  }

  /**
   * Perform building action on a terrain entity
   */
  performBuild(terrainEntity: TerrainEntity, hitInfo: RaycastHitInfo, layer: number): void {
    var brushSize: number = 1;
    Logging.Log('Performing build operation on terrain entity "' + terrainEntity.id +
      '" with brush size ' + brushSize + ' at position ' + hitInfo.hitPoint.toString());

    try {
      var brushMinHeight: number = 0;
      var gridSize: number = 1;

      var terrainIndex: Vector2Int = (globalThis as any).tiledsurfacerenderer_getIndexForTerrainTile(terrainEntity);

      // Align the hit point to the grid
      var alignedHitPoint = new Vector3(
        Math.round(hitInfo.hitPoint.x / gridSize) * gridSize,
        Math.round(hitInfo.hitPoint.y / gridSize) * gridSize,
        Math.round(hitInfo.hitPoint.z / gridSize) * gridSize);

      // Check if the build position is above minimum height
      if (alignedHitPoint.y >= brushMinHeight) {
        Logging.Log("Executing build at aligned position: " + alignedHitPoint.toString() + 
                    " with brush size: " + brushSize + " and layer: " + layer);
        
        // Perform the build operation using roundedCube brush type
        var buildSuccess = terrainEntity.Build(alignedHitPoint,
            TerrainEntityBrushType.roundedCube, layer, brushSize, true);

        const userId = this.getUserId();
        const userToken = this.getUserToken();

        var tsr = (globalThis as any).tiledsurfacerenderer as TiledSurfaceRenderer;

        // REST API call to notify server of terrain dig
        if (tsr && tsr.stateServiceClient) {
            tsr.stateServiceClient.sendTerrainBuildRequest(
                terrainIndex, alignedHitPoint, layer, brushSize,
                userId, userToken, "onTerrainBuildRESTResponse");
        }

        // Synchronize with server about the dig operation
        var wsync = (globalThis as any).wsync_instance as VOSSynchronizer;
        if (tsr && wsync) {
            wsync.SendTerrainBuildUpdate(tsr.regionSynchronizers[terrainIndex.x + '.' + terrainIndex.y],
                alignedHitPoint, "roundedcube", layer); // TODO add brush size
        }
        
        if (buildSuccess) {
            Logging.Log("Build operation completed successfully");
        } else {
            Logging.LogError("Build operation failed");
        }
      } else {
        Logging.Log("Build position below minimum height (" + brushMinHeight + "), operation cancelled");
      }
    } catch (error) {
      Logging.LogError("Error during build operation: " + error);
    }
  }

  /**
   * Delete an entity
   */
  deleteEntity(entity: BaseEntity): void {
    const entityId = entity.id?.ToString();
    Logging.Log('🔨 deleteEntity called for entityId: ' + entityId);
    
    const entityManager = (globalThis as any).entityManager;
    if (!entityManager) {
      Logging.LogWarning('🔨 EntityManager not found on globalThis');
    } else {
      const isFrozen = entityManager.isEntityFrozen(entityId);
      Logging.Log('🔨 isEntityFrozen(' + entityId + ') = ' + isFrozen);
    }
    
    if (entityId && entityManager?.isEntityFrozen(entityId)) {
      Logging.Log('🔒 Cannot delete frozen entity: ' + entityId);
      return;
    }

        if (entityId && typeof entityManager?.removeScriptEntity === 'function') {
            entityManager.removeScriptEntity(entityId);
        }

    Logging.Log('Deleting entity "' + entity.id + '"');

    // Sync deletion to other clients via custom message
    var tsr = (globalThis as any).tiledsurfacerenderer;
    var syncId = tsr?.regionSynchronizers?.['0.0'];
    if (syncId && entityId) {
      Logging.Log('[deleteEntity] Sending ENTITY.DELETE sync for ' + entityId);
      VOSSynchronization.SendMessage(syncId, "ENTITY.DELETE", JSON.stringify({ id: entityId }));
    }

    entity.Delete(true);
  }

  /**
   * Process grip press events
   */
  processGripPress(): void {
    var hitInfo = Input.GetPointerRaycast(Vector3.forward, 1);

    if (this.interactionMode == "HAND") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo instanceof AutomobileEntity) {
                    (globalThis as any).placePlayerInAutomobileEntity(hitInfo.entity);
                }
                else if (hitInfo.entity instanceof AirplaneEntity) {
                    (globalThis as any).placePlayerInAirplaneEntity(hitInfo.entity);
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-1") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-2") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-4") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-8") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "SLEDGE-HAMMER") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof MeshEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-0") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-1") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-2") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-3") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-4") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-5") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-6") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-7") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "ENTITY-PLACING") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity || hitInfo.entity instanceof MeshEntity) {
                    (globalThis as any).cancelPlacing();
                }
            }
        }
    }
  }

  processTriggerPress(): void {
    var hitInfo = Input.GetPointerRaycast(Vector3.forward, 1);

    if (this.interactionMode == "HAND") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo instanceof AutomobileEntity) {
                    
                }
                else if (hitInfo.entity instanceof AirplaneEntity) {
                    
                }

                this.tryRunUseScriptOnHitEntity(hitInfo);
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-1") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-2") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 2);
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-4") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 4);
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-8") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 8);
                }
            }
        }
    }
    else if (this.interactionMode == "SLEDGE-HAMMER") {
        Logging.Log('[SLEDGE] hitInfo=' + (hitInfo != null) + ' entity=' + (hitInfo?.entity != null) + ' entityType=' + (hitInfo?.entity?.constructor?.name || 'unknown') + ' isMesh=' + (hitInfo?.entity instanceof MeshEntity) + ' isAuto=' + (hitInfo?.entity instanceof AutomobileEntity) + ' isAir=' + (hitInfo?.entity instanceof AirplaneEntity));
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof MeshEntity ||
                    hitInfo.entity instanceof AutomobileEntity || hitInfo.entity instanceof AirplaneEntity) {
                    this.deleteEntity(hitInfo.entity);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-0") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 0);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-1") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-2") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 2);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-3") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 3);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-4") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 4);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-5") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 5);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-6") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 6);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-7") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performBuild(hitInfo.entity, hitInfo, 7);
                }
            }
        }
    }
    else if (this.interactionMode == "ENTITY-PLACING") {
        Logging.Log('[handleLeftPress] ENTITY-PLACING: hitInfo=' + (hitInfo != null ? 'non-null' : 'null'));
        if (hitInfo != null) {
            Logging.Log('[handleLeftPress] hitInfo.entity=' + (hitInfo.entity != null ? hitInfo.entity.id + ' type=' + hitInfo.entity.constructor?.name : 'null'));
            if (hitInfo.entity != null) {
                const isTE = hitInfo.entity instanceof TerrainEntity;
                const isME = hitInfo.entity instanceof MeshEntity;
                const isAE = hitInfo.entity instanceof AutomobileEntity;
                const isAP = hitInfo.entity instanceof AirplaneEntity;
                Logging.Log('[handleLeftPress] instanceof: TE=' + isTE + ' ME=' + isME + ' AE=' + isAE + ' AP=' + isAP);
                if (isTE || isME || isAE || isAP) {
                    Logging.Log('[handleLeftPress] Calling stopPlacing()');
                    (globalThis as any).stopPlacing();
                } else {
                    Logging.LogWarning('[handleLeftPress] Entity hit but not a valid placement surface type');
                }
            } else {
                Logging.LogWarning('[handleLeftPress] hitInfo.entity is null (hit non-entity geometry)');
            }
        } else if ((globalThis as any).entityPlacementComponent?.placingEntity != null) {
            // Fallback for browser mode: entity is already positioned by placementUpdate
            Logging.Log('[handleLeftPress] hitInfo null but placingEntity exists - calling stopPlacing()');
            (globalThis as any).stopPlacing();
        } else {
            Logging.LogWarning('[handleLeftPress] hitInfo null AND no placingEntity - cannot place');
        }
    }
}

  /**
   * Perform rotation on an entity
   */
  private performRotate(direction: string, negative: boolean): void {
    (globalThis as any).rotateOneStep(direction, negative);
  }

  /**
   * Place character in automobile
   */
  private placeCharacterInAutomobile(entity: AutomobileEntity): void {
    (globalThis as any).placePlayerInAutomobileEntity(entity);
  }

  /**
   * Place character in airplane
   */
  private placeCharacterInAirplane(entity: AirplaneEntity): void {
    (globalThis as any).placePlayerInAirplaneEntity(entity);
  }

  /**
   * Handle right mouse button press
   */
  private handleRightPress(): void {
    const isFullClient = (globalThis as any).uiManager?.clientType === 'full';
    var hitInfo = Input.GetPointerRaycast(Vector3.forward);
    Logging.Log('[handleRightPress] mode=' + this.interactionMode + ' fullClient=' + isFullClient + ' pointerHit=' + (hitInfo != null ? 'non-null' : 'null'));
    // In browser/lite mode, pointer position isn't reliable (defaults to 0,0);
    // use Camera.GetRaycast() for entity placing instead
    if (!isFullClient && this.interactionMode == "ENTITY-PLACING") {
      hitInfo = Camera.GetRaycast();
      Logging.Log('[handleRightPress] ENTITY-PLACING camera raycast=' + (hitInfo != null ? 'non-null' : 'null'));
    } else if (hitInfo == null && this.interactionMode == "ENTITY-PLACING") {
      hitInfo = Camera.GetRaycast();
      Logging.Log('[handleRightPress] ENTITY-PLACING fallback camera raycast=' + (hitInfo != null ? 'non-null' : 'null'));
    }

    if (this.interactionMode == "HAND") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                Logging.Log('[handleRightPress] HAND target=' + hitInfo.entity.id + ' type=' + hitInfo.entity.constructor?.name);
                this.tryRunUseScriptOnHitEntity(hitInfo);

                if (hitInfo.entity instanceof AutomobileEntity) {
                    Logging.Log('[handleRightPress] HAND vehicle branch -> automobile');
                    this.placeCharacterInAutomobile(hitInfo.entity);
                }
                else if (hitInfo.entity instanceof AirplaneEntity) {
                    Logging.Log('[handleRightPress] HAND vehicle branch -> airplane');
                    this.placeCharacterInAirplane(hitInfo.entity);
                }
                else {
                    Logging.Log('[handleRightPress] HAND target was not a vehicle; use dispatch only');
                }
            } else {
                Logging.LogWarning('[handleRightPress] HAND hitInfo.entity is null');
            }
        } else {
            Logging.LogWarning('[handleRightPress] HAND hitInfo is null');
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-1") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-2") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-4") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "SQUARE-SHOVEL-8") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "SLEDGE-HAMMER") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof MeshEntity) {
                    
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-0") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-1") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-2") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-3") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-4") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-5") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-6") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "TERRAIN-LAYER-7") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity) {
                    this.performDig(hitInfo.entity, hitInfo, 1);
                }
            }
        }
    }
    else if (this.interactionMode == "ENTITY-PLACING") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity || hitInfo.entity instanceof MeshEntity) {
                    (globalThis as any).cancelPlacing();
                }
            }
        }
    }
  }

  /**
 * Get user ID for API requests
 * @returns User ID from Identity module if authenticated
 */
  private getUserId(): string {
    // Access Identity from global context if available
    try {
      const contextUser = Context.GetContext('MW_TOP_LEVEL_CONTEXT');
      if (contextUser && contextUser.userID) {
        return contextUser.userID;
      }
    } catch (error) {
      Logging.LogWarning('🔍 StaticSurfaceRenderer: Could not get user ID from context: ' + error);
    }

    // Return empty string if not authenticated (no fallback)
    return "";
  }

  /**
   * Get user token for API requests
   * @returns User token from Identity module or fallback value
   */
  private getUserToken(): string {
    // Access Identity from global context if available
    try {
      const contextUser = Context.GetContext('MW_TOP_LEVEL_CONTEXT');
      if (contextUser && contextUser.token) {
        return contextUser.token;
      }
    } catch (error) {
      Logging.LogWarning('🔍 StaticSurfaceRenderer: Could not get user token from context: ' + error);
    }

    // Return empty string if not authenticated (no fallback)
    return "";
  }
}