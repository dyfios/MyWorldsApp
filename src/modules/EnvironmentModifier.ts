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
            if (hitInfo.entity != null) {
                if (hitInfo.entity instanceof TerrainEntity || hitInfo.entity instanceof MeshEntity) {
                    WorldStorage.SetItem("ENTITY-KEEP-SPAWNING", "TRUE");
                    (globalThis as any).StopPlacing();
                }
            }
        }
    }
  }

  /**
   * Perform digging action on a terrain entity
   */
  performDig(terrainEntity: TerrainEntity, hitInfo: RaycastHitInfo, layer: number): void {
    Logging.Log('Digging on terrain entity "' + terrainEntity.id +
      '" at layer ' + layer + ' at position ' + hitInfo.hitPoint.toString());
  }

  /**
   * Perform building action on a terrain entity
   */
  performBuild(terrainEntity: TerrainEntity, hitInfo: RaycastHitInfo, layer: number): void {
    Logging.Log('Building on terrain entity "' + terrainEntity.id +
      '" at layer ' + layer + ' at position ' + hitInfo.hitPoint.toString());
  }

  /**
   * Delete an entity
   */
  deleteEntity(entity: BaseEntity): void {
    Logging.Log('Deleting entity "' + entity.id + '"');
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
   * Handle right mouse button press
   */
  private handleRightPress(): void {
    Logging.Log('Right mouse button pressed');
  }
}