/**
 * Environment Modifier - Handles environmental changes and effects
 */

export class EnvironmentModifier {
  private interactionMode: string = "HAND";

  constructor() {
    this.setupGlobalCallbacks();
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

    // Define global callback for setting interaction mode
    (globalThis as any).setInteractionMode = (mode: string) => {
      this.setInteractionMode(mode);
    };
  }

  /**
   * Set the current interaction mode
   */
  setInteractionMode(mode: string): void {
    this.interactionMode = mode;
  }

  /**
   * Handle left mouse button press
   */
  private handleLeftPress(): void {
    var hitInfo = Input.GetPointerRaycast(Vector3.forward);

    if (this.interactionMode == "HAND") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo instanceof AutomobileEntity) {
                    
                }
                else if (hitInfo.entity instanceof AirplaneEntity) {
                    
                }
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
        if (hitInfo != null) {
            if (hitInfo.entity != null) {Logging.Log("hit of type " + typeof hitInfo.entity);
                if (hitInfo.entity instanceof TerrainEntity || hitInfo.entity instanceof MeshEntity) {
                    (globalThis as any).stopPlacing();
                }
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

      var terrainIndex = (globalThis as any).tiledsurfacerenderer_getIndexForTerrainTile(terrainEntity);

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
    Logging.Log('Deleting entity "' + entity.id + '"');
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
                    (globalThis as any).CancelPlacing();
                }
            }
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
    (globalThis as any).MW_Input_EnvMod_PlaceCharacterInAutomobile(entity);
  }

  /**
   * Place character in airplane
   */
  private placeCharacterInAirplane(entity: AirplaneEntity): void {
    (globalThis as any).MW_Input_EnvMod_PlaceCharacterInAirplane(entity);
  }

  /**
   * Handle right mouse button press
   */
  private handleRightPress(): void {
    var hitInfo = Input.GetPointerRaycast(Vector3.forward);

    if (this.interactionMode == "HAND") {
        if (hitInfo != null) {
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof AutomobileEntity) {
                    this.placeCharacterInAutomobile(hitInfo.entity);
                }
                else if (hitInfo.entity instanceof AirplaneEntity) {
                    this.placeCharacterInAirplane(hitInfo.entity);
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
}