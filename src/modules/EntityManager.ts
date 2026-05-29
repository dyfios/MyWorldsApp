/**
 * Entity module - Manages entity creation, placement, and terrain alignment
 */

import { Position, Rotation } from '../types/config';
import { EntityData } from '../types/entity';
import { EntityScriptMap } from '../types/scripts';
import { ScriptEngine } from './ScriptEngine';
import { VOSSynchronizer } from './VOSSynchronizer';
import { TiledSurfaceRenderer } from './WorldRendererFactory';

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
  public scripts: EntityScriptMap = {};
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
      scripts: EntityScriptMap, instanceId: string) => {
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
    // Logging.Log('🔵 placementUpdate() START');
    try {
      const normalPlacementThreshold = 0.5;
      
      if (this.placingEntity == null) {
        return;
      }
      
      if (this.modelOffset == null) {
        return;
      }
      
      if (this.modelOffset.x == null || this.modelOffset.y == null || this.modelOffset.z == null) {
        return;
      }

    // Logging.Log('🔵 placementUpdate() A - before raycast');
    const isThirdPerson = (globalThis as any).playerController?.cameraMode === 'thirdPerson';
    const isFullClient = (globalThis as any).uiManager?.clientType === 'full';
    const hitInfo = (isThirdPerson && isFullClient)
      ? Input.GetPointerRaycast(Vector3.forward)
      : Camera.GetRaycast();
    // Logging.Log('🔵 placementUpdate() B - after raycast');
    if (hitInfo != null && hitInfo.entity != null) {
      // Logging.Log('🔵 placementUpdate() C - hitInfo valid');
      if (hitInfo.entity !== this.placingEntity) {
        let gridSnappedPosition: Vector3;
        
        if (this.gridEnabled) {
          // Logging.Log('🔵 placementUpdate() D - grid enabled, accessing hitPoint');
          gridSnappedPosition = new Vector3(
            Math.round(hitInfo.hitPoint.x / this.gridSize) * this.gridSize + this.modelOffset.x,
            Math.round(hitInfo.hitPoint.y / this.gridSize) * this.gridSize + this.modelOffset.y,
            Math.round(hitInfo.hitPoint.z / this.gridSize) * this.gridSize + this.modelOffset.z
          );
          // Logging.Log('🔵 placementUpdate() E - after hitPoint access');

          // Adjust position based on surface normal
          // Logging.Log('🔵 placementUpdate() F - accessing hitPointNormal');
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
          // Logging.Log('🔵 placementUpdate() G - after hitPointNormal access');
        } else {
          gridSnappedPosition = new Vector3(
            hitInfo.hitPoint.x + this.modelOffset.x,
            hitInfo.hitPoint.y + this.modelOffset.y,
            hitInfo.hitPoint.z + this.modelOffset.z
          );
        }
        
        // Logging.Log('🔵 placementUpdate() H - before SetPosition');
        this.placingEntity.SetPosition(gridSnappedPosition, false, false);
        // Logging.Log('🔵 placementUpdate() I - after SetPosition');
      }
    }
    } catch (e) {
      // Silently ignore to prevent log spam
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
    scripts: EntityScriptMap,
    instanceID: string,
    offset?: Vector3,
    rotation?: Quaternion,
    placementOffset?: Vector3
  ): void {
    //WorldStorage.SetItem("TERRAIN-EDIT-LAYER", "-1");

    // Pre-placement permission gate: if the world is private and the current
    // user is not the owner, refuse to enter placement mode. This prevents
    // visual preview + REST round-trip for placements the server will reject.
    if (!this.canPlaceEntities()) {
      Logging.LogWarning('[EntityPlacer] startPlacing denied by permission gate — world is private and current user is not the owner');
      this.notifyPlacementDenied();
      // Destroy the spawned preview entity so it doesn't leak into the scene.
      if (entityToPlace != null) {
        try { entityToPlace.Delete(); } catch (_e) { /* best-effort */ }
      }
      return;
    }

    this.exitDeleteMode();
    
    if (this.placingEntity != null) {
      Logging.LogWarning("[EntityPlacer] Placing Entity already assigned. Placing Entity must be stopped.");
      return;
    }
    
    if (entityToPlace == null) {
      Logging.LogWarning("[EntityPlacer] Invalid entity to place.");
      return;
    }
    
    Logging.Log('[startPlacing] entityID=' + entityID + ' variantID=' + variantID + ' entityIndex=' + entityIndex + ' variantIndex=' + variantIndex + ' instanceID=' + instanceID);
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
    // Switch to Placing interaction state — toggles to preview mesh and (per WebVerse fix)
    // disables colliders so the placement raycast passes through the entity to hit world
    // geometry instead of being blocked by the entity's own colliders.
    entityToPlace.SetInteractionState(InteractionState.Placing);

    const placementScriptKeys = Object.keys(this.scripts || {});
    const placementPreview = placementScriptKeys.slice(0, 16);
    Logging.Log('[PlacementRegistration] startPlacing entityInstance=' + (entityToPlace.id?.ToString ? entityToPlace.id.ToString() : entityToPlace.id)
      + ' entityID=' + entityID
      + ' variantID=' + variantID
      + ' keyCount=' + placementScriptKeys.length
      + ' keysPreview=' + (placementPreview.length > 0 ? placementPreview.join(',') : '(none)'));

    if (this.scripts != null && Object.keys(this.scripts).length > 0) {
      Logging.Log('[PlacementRegistration] startPlacing addScriptEntity for ' + (entityToPlace.id?.ToString ? entityToPlace.id.ToString() : entityToPlace.id));
      ((globalThis as any).scriptEngine as ScriptEngine).addScriptEntity(entityToPlace, this.scripts);
      ((globalThis as any).scriptEngine as ScriptEngine).runOnPickupScript(entityToPlace);
    }
    // Input.TurnLocomotionMode = Input.VRTurnLocomotionMode.None; // VR-specific, commented out
  }

  stopPlacing(): void {
    Logging.Log('[stopPlacing] Called. placingEntity=' + (this.placingEntity != null ? this.placingEntity.id : 'null'));
    Logging.Log('[stopPlacing] State: entityID=' + this.entityID + ' variantID=' + this.variantID + ' instanceID=' + this.instanceID + ' keepSpawning=' + this.keepSpawning);
    if (this.placingEntity == null) {
      Logging.Log('[stopPlacing] placingEntity is null - early return path');
      if (this.keepSpawning === true && this.entityType && this.entityIndex !== null && 
        this.variantIndex !== null && this.entityID && this.variantID) {
        const instanceID = UUID.NewUUID().ToString();
        Logging.Log('[stopPlacing] keepSpawning: loading next entity with instanceID=' + instanceID);
        (globalThis as any).loadEntity(this.entityIndex, this.variantIndex, instanceID,
          this.entityIndex + "." + this.variantIndex + "." + instanceID, this.entityID, this.variantID,
          null, this.entityType, Vector3.zero, Quaternion.identity, Vector3.one, this.modelPath,
          [ this.modelPath ], this.wheels, this.mass, AutomobileType.Default, this.scripts, true);
      } else {
        Logging.LogWarning('[stopPlacing] Cannot respawn: keepSpawning=' + this.keepSpawning + ' entityType=' + this.entityType + ' entityIndex=' + this.entityIndex + ' variantIndex=' + this.variantIndex + ' entityID=' + this.entityID + ' variantID=' + this.variantID);
      }
      return;
    }
    
    //if (this.placementLocked === true) {
    //  return;
    //}
    
    const rawPos: Vector3 = this.placingEntity.GetPosition(false);
    const rot: Quaternion = this.placingEntity.GetRotation(false);
    Logging.Log('[stopPlacing] rawPos=' + rawPos + ' rawPos.x=' + rawPos.x + ' rawPos.y=' + rawPos.y + ' rawPos.z=' + rawPos.z);
    Logging.Log('[stopPlacing] rot=' + rot + ' rot.x=' + rot.x + ' rot.y=' + rot.y + ' rot.z=' + rot.z + ' rot.w=' + rot.w);

    // Determine position and region info based on renderer type
    const hasTiledHelpers = typeof (globalThis as any).tiledsurfacerenderer_getWorldPositionForRenderedPosition === 'function';
    const pos: Vector3 = hasTiledHelpers
      ? (globalThis as any).tiledsurfacerenderer_getWorldPositionForRenderedPosition(rawPos)
      : rawPos;
    const terrainIndex: Vector2Int | null = hasTiledHelpers
      ? (globalThis as any).tiledsurfacerenderer_getRegionIndexForWorldPos(pos)
      : null;
    const regionPos: Vector3 = hasTiledHelpers && terrainIndex
      ? (globalThis as any).tiledsurfacerenderer_getRegionPosForWorldPos(pos, terrainIndex)
      : pos;

    // Send REST request to persist entity placement
    Logging.Log('[stopPlacing] regionPos=' + regionPos + ' regionPos.x=' + regionPos.x + ' regionPos.y=' + regionPos.y + ' regionPos.z=' + regionPos.z);
    Logging.Log('[stopPlacing] typeof regionPos.x=' + typeof regionPos.x + ' Number(regionPos.x)=' + Number(regionPos.x));
    Logging.Log('[stopPlacing] REST check: instanceID=' + this.instanceID + ' entityID=' + this.entityID + ' variantID=' + this.variantID);
    if (this.instanceID && this.entityID && this.variantID) {
      // Safety-net permission gate: even if startPlacing was somehow bypassed,
      // refuse to send the create-entity-instance REST request when the user
      // does not have write permission for this world.
      if (!this.canPlaceEntities()) {
        Logging.LogWarning('[stopPlacing] denied by permission gate — destroying preview and skipping REST request');
        this.notifyPlacementDenied();
        try { this.placingEntity.Delete(); } catch (_e) { /* best-effort */ }
        this.placingEntity = null;
        this.entityBeingPlaced = false;
        this.keepSpawning = false;
        return;
      }
      var tsr = (globalThis as any).tiledsurfacerenderer as TiledSurfaceRenderer;
      const userId = this.getUserId();
      const userToken = this.getUserToken();
      const worldId = (globalThis as any).tiledsurfacerenderer?.worldId || '';
      Logging.Log('[stopPlacing] tsr=' + (tsr ? 'exists' : 'null') + ' tsr.restClient=' + (tsr?.restClient ? 'exists' : 'null') + ' worldId=' + worldId + ' userId=' + userId + ' userToken=' + (userToken ? 'present' : 'empty'));
      if (tsr && tsr.restClient && worldId) {
        Logging.Log('[stopPlacing] Sending REST create-entity-instance request: pos=' + regionPos.x + ',' + regionPos.y + ',' + regionPos.z);
        tsr.restClient.sendPositionEntityRequest(
          worldId, this.entityID, this.variantID,
          this.instanceID, regionPos, rot, userId, userToken, null);
        // VOS sync only available in planet/tiled mode
        var wsync = (globalThis as any).wsync_instance as VOSSynchronizer;
        if (wsync && terrainIndex && tsr.regionSynchronizers
            && tsr.regionSynchronizers[terrainIndex.x + '.' + terrainIndex.y]) {
          wsync.SendEntityAddUpdate(tsr.regionSynchronizers[terrainIndex.x + '.' + terrainIndex.y],
            this.instanceID, regionPos, rot);
        }
      }
      Logging.Log(`[EntityPlacer] Placing entity at position: ${pos.x}, ${pos.y}, ${pos.z}`);
    }
    
    // Handle scripts if present
    if (this.scripts != null && Object.keys(this.scripts).length > 0) {
      const placeScriptKeys = Object.keys(this.scripts);
      const placePreview = placeScriptKeys.slice(0, 16);
      Logging.Log('[PlacementRegistration] stopPlacing addScriptEntity entity=' + (this.placingEntity.id?.ToString ? this.placingEntity.id.ToString() : this.placingEntity.id)
        + ' keyCount=' + placeScriptKeys.length
        + ' keysPreview=' + (placePreview.length > 0 ? placePreview.join(',') : '(none)'));
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

      ((globalThis as any).scriptEngine as ScriptEngine).runOnPlaceScript(this.placingEntity);
    }

    // Finalize placement
    if (terrainIndex && (globalThis as any).tiledsurfacerenderer?.getTerrainTileForIndex) {
      const terrainTile = (globalThis as any).tiledsurfacerenderer.getTerrainTileForIndex(terrainIndex);
      if (terrainTile) {
        this.placingEntity.SetParent(terrainTile);
      }
    }
    this.placingEntity.SetHighlight(false);
    if (this.placingEntity instanceof AutomobileEntity || this.placingEntity instanceof AirplaneEntity) {
      this.placingEntity.SetInteractionState(InteractionState.Physical);
    } else {
      this.placingEntity.SetInteractionState(InteractionState.Static);
    }
    this.placingEntity = null;
    
    Logging.Log('[stopPlacing] Finalized. keepSpawning=' + this.keepSpawning + ' entityID=' + this.entityID + ' variantID=' + this.variantID);
    if (this.keepSpawning === true && this.entityID && this.variantID) {
      const instanceID = UUID.NewUUID().ToString();
      Logging.Log('[stopPlacing] keepSpawning: loading next entity with instanceID=' + instanceID);
      (globalThis as any).loadEntity(this.entityIndex, this.variantIndex, instanceID,
        this.entityIndex + "." + this.variantIndex + "." + instanceID, this.entityID, this.variantID,
        null, this.entityType, Vector3.zero, Quaternion.identity, Vector3.one, this.modelPath,
        [ this.modelPath ], this.wheels, this.mass, AutomobileType.Default, this.scripts, true);
    } else {
      Logging.Log('[stopPlacing] NOT respawning: keepSpawning=' + this.keepSpawning + ' entityID=' + this.entityID + ' variantID=' + this.variantID);
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

  /**
   * Pre-placement permission gate.
   *
   * Returns true if the current user is allowed to place entities in this
   * world. Rules (matching the server-side model in MyWorldsServer):
   *   - world is "public"          → anyone may place
   *   - current user is the owner  → may place
   *   - otherwise                  → denied
   *
   * Fail-open if world metadata or current-user identity is unavailable: we
   * don't want to block legitimate placements just because metadata hasn't
   * been wired yet. The server remains the authoritative check.
   */
  canPlaceEntities(): boolean {
    try {
      const tsr: any = (globalThis as any).tiledsurfacerenderer;
      if (!tsr) return true;

      const permissionsRaw: any = tsr.worldPermissions;
      const owner: string | null | undefined = tsr.worldOwner;

      // Normalize permissions to a lowercase string when possible. Server
      // schemas vary: sometimes a simple string ('public'), sometimes an
      // object map. We only recognize the simple string form here.
      let permStr = '';
      if (typeof permissionsRaw === 'string') {
        permStr = permissionsRaw.toLowerCase().trim();
      }

      // Public worlds: anyone may place.
      if (permStr === 'public') return true;

      // No usable owner info → we can't make an ownership decision.
      // Fail-open and let the server be the authoritative check, rather
      // than blocking legitimate placements in worlds whose metadata
      // doesn't carry an owner field.
      if (!owner || typeof owner !== 'string') {
        Logging.Log('[EntityPlacer] permission check: no owner in metadata, failing open'
          + ' (permissions=' + JSON.stringify(permissionsRaw) + ')');
        return true;
      }

      // Pull both userID and userTag from the identity context — different
      // worlds may store either form as the owner field.
      let userId = '';
      let userTag = '';
      try {
        const ctx: any = Context.GetContext('MW_TOP_LEVEL_CONTEXT');
        if (ctx) {
          userId = ctx.userID || '';
          userTag = ctx.userTag || '';
        }
      } catch (_e) { /* ignore */ }

      const ownerNorm = owner.toLowerCase().trim();
      const userIdNorm = userId.toLowerCase().trim();
      const userTagNorm = userTag.toLowerCase().trim();

      Logging.Log('[EntityPlacer] permission check: permissions=' + JSON.stringify(permissionsRaw)
        + ' owner=' + owner + ' userID=' + userId + ' userTag=' + userTag);

      if (ownerNorm === userIdNorm || ownerNorm === userTagNorm) {
        return true;
      }

      return false;
    } catch (e) {
      Logging.LogWarning('[EntityPlacer] canPlaceEntities check threw, failing open: ' + e);
      return true;
    }
  }

  /**
   * Show a chat-console notification when a placement is denied. Best-effort:
   * if the chat console isn't available yet, the warning log is still emitted
   * by the caller.
   */
  private notifyPlacementDenied(): void {
    try {
      const ui: any = (globalThis as any).uiManager;
      if (ui && typeof ui.addRemoteConsoleMessage === 'function') {
        const d: any = (Date as any).now;
        const pad = function (n: number): string {
          const s = String(n);
          return s.length < 2 ? '0' + s : s;
        };
        const timestamp = pad(d.hour) + ':' + pad(d.minute) + ':' + pad(d.second);
        ui.addRemoteConsoleMessage(timestamp, 'System',
          'You do not have permission to place entities in this world.');
      }
    } catch (_e) { /* best-effort */ }
  }
}

export class EntityManager {
  entityPlacement: EntityPlacement;
  private entities: Map<string, EntityData> = new Map();
  private worldStorage: Map<string, any> = new Map();
  private frozenEntities: Set<string> = new Set();

  private currentEntityIndex: string = "";
  private currentVariantIndex: string = "";
  private currentEntityId: string = "";
  private currentVariantId: string = "";
  private currentModelPath: string = "";
  private currentWheels: any | undefined = undefined;
  private currentMass: number | undefined = undefined;
  private currentScripts: EntityScriptMap | undefined = undefined;

  private ensureEntityScriptsByInstanceId(): any {
    if (!(globalThis as any).entityScriptsByInstanceId) {
      (globalThis as any).entityScriptsByInstanceId = {};
    }
    return (globalThis as any).entityScriptsByInstanceId;
  }

  private normalizeScriptsPayload(rawScripts: any, instanceId: string): EntityScriptMap | undefined {
    if (rawScripts == null) {
      Logging.Log('[EntityManager] Scripts payload missing for instanceId=' + instanceId);
      return undefined;
    }

    if (typeof rawScripts === 'string') {
      const trimmed = rawScripts.trim();
      if (trimmed === '') {
        Logging.LogWarning('[EntityManager] Empty scripts string for instanceId=' + instanceId);
        return undefined;
      }

      try {
        const parsed = JSON.parse(trimmed);
        return this.normalizeScriptsPayload(parsed, instanceId);
      } catch (_error) {
        // Treat non-JSON script strings as an on_use body.
        Logging.LogWarning('[EntityManager] Non-JSON scripts string for instanceId=' + instanceId + ' - treating as on_use');
        return { on_use: trimmed };
      }
    }

    if (Array.isArray(rawScripts)) {
      const arr = rawScripts as any[];
      const preview = JSON.stringify(arr).slice(0, 400);
      Logging.LogWarning('[EntityManager] Array scripts payload for instanceId=' + instanceId
        + ' length=' + arr.length
        + ' preview=' + preview);

      // Case A: ["on_use", "script body"] or ["0_25_update", "..."]
      if (arr.length === 2 && typeof arr[0] === 'string' && typeof arr[1] === 'string') {
        const key = arr[0].trim();
        const value = arr[1];
        if (key !== '') {
          Logging.LogWarning('[EntityManager] Coercing 2-item scripts array to object for instanceId=' + instanceId + ' key=' + key);
          const coerced: EntityScriptMap = {};
          (coerced as any)[key] = value;
          return coerced;
        }
      }

      // Case B: [["on_use","..."], ["on_touch","..."]] style entries array
      if (arr.every((item) => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && typeof item[1] === 'string')) {
        const coerced: EntityScriptMap = {};
        for (const [key, value] of arr as Array<[string, string]>) {
          if (key && key.trim() !== '') {
            (coerced as any)[key] = value;
          }
        }
        const keys = Object.keys(coerced);
        if (keys.length > 0) {
          Logging.LogWarning('[EntityManager] Coerced entry-array scripts for instanceId=' + instanceId + ' keys=' + keys.join(','));
          return coerced;
        }
      }

      // Case C: ["script body"] -> treat as on_use for backward compatibility
      if (arr.length === 1 && typeof arr[0] === 'string' && arr[0].trim() !== '') {
        Logging.LogWarning('[EntityManager] Coercing single-item scripts array to on_use for instanceId=' + instanceId);
        return { on_use: arr[0] };
      }

      Logging.LogError('[EntityManager] Invalid scripts payload (array) for instanceId=' + instanceId + ' - unable to coerce');
      return undefined;
    }

    if (typeof rawScripts !== 'object') {
      Logging.LogError('[EntityManager] Invalid scripts payload type for instanceId=' + instanceId + ': ' + typeof rawScripts);
      return undefined;
    }

    const normalized = rawScripts as EntityScriptMap;
    const keys = Object.keys(normalized);
    if (keys.length === 0) {
      return undefined;
    }

    const numericOnlyKeys = keys.every((k) => k.length > 0 && Array.from(k).every((ch) => ch >= '0' && ch <= '9'));
    if (numericOnlyKeys) {
      Logging.LogError('[EntityManager] Invalid scripts payload keys for instanceId=' + instanceId + ': ' + keys.join(',') + ' (numeric-only)');
      return undefined;
    }

    return normalized;
  }

  private registerScriptsForInstance(instanceId: string, scripts: EntityScriptMap | undefined): void {
    if (!instanceId) {
      return;
    }

    const registry = this.ensureEntityScriptsByInstanceId();
    if (scripts && Object.keys(scripts).length > 0) {
      registry[instanceId] = scripts;
      Logging.Log('[EntityManager] Registered scripts for instanceId=' + instanceId);
    } else {
      delete registry[instanceId];
      Logging.Log('[EntityManager] Cleared scripts for instanceId=' + instanceId + ' (none)');
    }
  }

  private ensurePendingEntityLoads(): any {
    if (!(globalThis as any).pendingEntityLoads) {
      (globalThis as any).pendingEntityLoads = {};
    }
    return (globalThis as any).pendingEntityLoads;
  }

  private registerPendingEntityLoad(instanceId: string, scripts: EntityScriptMap | undefined, type: string): void {
    const pendingEntityLoads = this.ensurePendingEntityLoads();
    pendingEntityLoads[instanceId] = {
      scripts,
      type
    };
    const scriptKeys = scripts ? Object.keys(scripts).join(',') : '';
    Logging.Log('[loadEntity] pendingEntityLoad instanceId=' + instanceId
      + ' type=' + type
      + ' scripts=' + (scripts ? 'yes' : 'no')
      + ' keys=' + (scriptKeys || '(none)'));
  }

  private consumePendingEntityLoad(instanceId: string): { scripts?: EntityScriptMap; type?: string } | null {
    const pendingEntityLoads = this.ensurePendingEntityLoads();
    const pending = pendingEntityLoads[instanceId] || null;
    if (pending) {
      delete pendingEntityLoads[instanceId];
    }
    return pending;
  }

  constructor() {
    this.entityPlacement = new EntityPlacement();
    this.setupGlobalCallbacks();
    // Expose entityManager globally for frozen checks
    (globalThis as any).entityManager = this;
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
      scripts: EntityScriptMap | undefined,
      placingEntity: boolean | undefined,
      frozen: boolean | undefined
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
        placingEntity,
        frozen
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
    scripts: EntityScriptMap | undefined = undefined,
    placingEntity: boolean = false,
    frozen: boolean = false
  ): string {
    // Store frozen status for this entity
    Logging.Log('🔒 loadEntity: instanceId=' + instanceId + ', frozen param=' + frozen);
    if (frozen) {
      this.frozenEntities.add(instanceId);
      Logging.Log('🔒 Entity ' + instanceId + ' added to frozenEntities set. Set size now: ' + this.frozenEntities.size);
    }

    let parentEntity = null;
    if (entityParent != null && entityParent != undefined && entityParent !== "" && entityParent != "null") {
      parentEntity = Entity.Get(entityParent);
    }
    if (entityId == null || variantId == null || scale == null) {

    }
    const rawScripts: any = scripts as any;
    let scriptsShape = 'null';
    if (rawScripts == null) {
      scriptsShape = 'null';
    } else if (Array.isArray(rawScripts)) {
      scriptsShape = 'array(len=' + rawScripts.length + ')';
    } else if (typeof rawScripts === 'string') {
      scriptsShape = 'string(len=' + rawScripts.length + ')';
    } else if (typeof rawScripts === 'object') {
      scriptsShape = 'object(keys=' + Object.keys(rawScripts).join(',') + ')';
    } else {
      scriptsShape = typeof rawScripts;
    }
    Logging.Log('[loadEntity] instanceId=' + instanceId
      + ' entityId=' + entityId
      + ' variantId=' + variantId
      + ' type=' + type
      + ' placingEntity=' + placingEntity
      + ' scriptsShape=' + scriptsShape);
    this.currentEntityIndex = entityIndex || "";
    this.currentVariantIndex = variantIndex || "";
    this.currentEntityId = entityId;
    this.currentVariantId = variantId || "";
    Logging.Log('[loadEntity] stored currentEntityId=' + this.currentEntityId + ' currentVariantId=' + this.currentVariantId);
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

    const normalizedScripts = this.normalizeScriptsPayload(scripts, instanceId);
    const normalizedKeys = normalizedScripts ? Object.keys(normalizedScripts) : [];
    const normalizedPreview = normalizedKeys.slice(0, 16);
    Logging.Log('[loadEntity] normalized scripts for instanceId=' + instanceId
      + ' normalizedKeyCount=' + normalizedKeys.length
      + ' normalizedKeysPreview=' + (normalizedPreview.length > 0 ? normalizedPreview.join(',') : '(none)'));
    this.currentScripts = normalizedScripts;
    this.registerScriptsForInstance(instanceId, normalizedScripts);

    this.registerPendingEntityLoad(instanceId, normalizedScripts, type);

    // Store placement metadata globally keyed by instanceId so async callbacks
    // can retrieve it regardless of which EntityManager instance they fire on
    if (placingEntity) {
      if (!(globalThis as any).pendingPlacements) {
        (globalThis as any).pendingPlacements = {};
      }
      (globalThis as any).pendingPlacements[instanceId] = {
        entityIndex: entityIndex || "",
        variantIndex: variantIndex || "",
        entityId: entityId,
        variantId: variantId || "",
        modelPath: meshObject,
        wheels: wheels,
        mass: mass,
        scripts: normalizedScripts,
        type: type
      };
      Logging.Log('[loadEntity] Stored pending placement for instanceId=' + instanceId
        + ' normalizedScriptKeyCount=' + normalizedKeys.length);
    }
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
        MeshEntity.Create(parentEntity, meshObject, meshResources, position, rotation, scale, false, instanceId,
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
    if (entity == null) {
      Logging.LogError('❌ EntityManager: onMeshEntityLoadedGeneric received null entity');
      return;
    }
    Logging.Log(`✓ Mesh entity loaded successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);
    const instanceId = entity.id?.ToString ? (entity.id.ToString() || '') : String(entity.id || '');
    const pendingLoad = this.consumePendingEntityLoad(instanceId);
    var scripts = (pendingLoad?.scripts ?? this.currentScripts) as any;
    this.registerScriptsForInstance(instanceId, scripts);
    Logging.Log('[onMeshEntityLoadedGeneric] instanceId=' + instanceId
      + ' scriptsFrom=' + (pendingLoad ? 'pendingEntityLoads' : 'currentScripts')
      + ' scripts=' + (scripts ? 'yes' : 'no'));
    if (scripts != null) {
      const scriptKeys = Object.keys(scripts);
      Logging.Log('[EntityManager] Registering mesh scripts for ' + instanceId
        + ' keyCount=' + scriptKeys.length
        + ' keys=' + (scriptKeys.length > 0 ? scriptKeys.join(',') : '(none)'));
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
    if (entity == null) {
      Logging.LogError('❌ EntityManager: onMeshEntityLoadedGenericPlacing received null entity');
      return;
    }
    Logging.Log(`✓ Mesh entity loaded for placement successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);

    // Retrieve placement metadata from global map (avoids cross-instance issues)
    const entityIdStr: string = String(entity.id || '');
    const pending = entityIdStr ? (globalThis as any).pendingPlacements?.[entityIdStr] : null;
    const instanceIdStr: string = (entity.id?.ToString ? entity.id.ToString() : String(entity.id || '')) || '';
    if (pending) {
      const pendingScriptKeys = Object.keys((pending.scripts || {}) as any);
      const pendingPreview = pendingScriptKeys.slice(0, 16);
      Logging.Log('[PlacementRegistration] pending->startPlacing mesh instanceId=' + instanceIdStr
        + ' entityId=' + pending.entityId
        + ' variantId=' + pending.variantId
        + ' keyCount=' + pendingScriptKeys.length
        + ' keysPreview=' + (pendingPreview.length > 0 ? pendingPreview.join(',') : '(none)'));
      (globalThis as any).startPlacing(entity, "mesh", pending.entityIndex, pending.variantIndex, pending.entityId,
        pending.variantId, pending.modelPath, pending.wheels, pending.mass, pending.scripts, instanceIdStr);
      delete (globalThis as any).pendingPlacements[entityIdStr];
    } else {
      Logging.LogWarning('[onMeshEntityLoadedGenericPlacing] No pending placement found for ' + entity.id + ', falling back to current* fields');
      (globalThis as any).startPlacing(entity, "mesh", this.currentEntityIndex, this.currentVariantIndex, this.currentEntityId,
        this.currentVariantId, this.currentModelPath, this.currentWheels, this.currentMass, this.currentScripts, instanceIdStr);
    }
  }

  onAutomobileEntityLoadedGeneric(entity: AutomobileEntity): void {
    if (entity == null) {
      Logging.LogError('❌ EntityManager: onAutomobileEntityLoadedGeneric received null entity');
      return;
    }
    Logging.Log(`✓ Automobile entity loaded successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);
    const instanceId = entity.id?.ToString ? (entity.id.ToString() || '') : String(entity.id || '');
    const pendingLoad = this.consumePendingEntityLoad(instanceId);
    var scripts = (pendingLoad?.scripts ?? this.currentScripts) as any;
    this.registerScriptsForInstance(instanceId, scripts);
    Logging.Log('[onAutomobileEntityLoadedGeneric] instanceId=' + instanceId
      + ' scriptsFrom=' + (pendingLoad ? 'pendingEntityLoads' : 'currentScripts')
      + ' scripts=' + (scripts ? 'yes' : 'no'));
    if (scripts != null) {
      const scriptKeys = Object.keys(scripts);
      Logging.Log('[EntityManager] Registering automobile scripts for ' + instanceId
        + ' keyCount=' + scriptKeys.length
        + ' keys=' + (scriptKeys.length > 0 ? scriptKeys.join(',') : '(none)'));
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
    if (entity == null) {
      Logging.LogError('❌ EntityManager: onAutomobileEntityLoadedGenericPlacing received null entity');
      return;
    }
    Logging.Log(`✓ Automobile entity loaded for placement successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Static);
    entity.SetVisibility(true);

    // Retrieve placement metadata from global map (avoids cross-instance issues)
    const entityIdStr: string = String(entity.id || '');
    const pending = entityIdStr ? (globalThis as any).pendingPlacements?.[entityIdStr] : null;
    const instanceIdStr: string = (entity.id?.ToString ? entity.id.ToString() : String(entity.id || '')) || '';
    if (pending) {
      Logging.Log('[onAutomobileEntityLoadedGenericPlacing] Using pending placement data: entityId=' + pending.entityId + ' variantId=' + pending.variantId + ' instanceId=' + instanceIdStr);
      (globalThis as any).startPlacing(entity, "automobile", pending.entityIndex, pending.variantIndex, pending.entityId,
        pending.variantId, pending.modelPath, pending.wheels, pending.mass, pending.scripts, instanceIdStr);
      delete (globalThis as any).pendingPlacements[entityIdStr];
    } else {
      Logging.LogWarning('[onAutomobileEntityLoadedGenericPlacing] No pending placement found for ' + entity.id + ', falling back to current* fields');
      (globalThis as any).startPlacing(entity, "automobile", this.currentEntityIndex, this.currentVariantIndex, this.currentEntityId,
        this.currentVariantId, this.currentModelPath, this.currentWheels, this.currentMass, this.currentScripts, instanceIdStr);
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
   * Check if an entity is frozen (not editable/deletable)
   */
  isEntityFrozen(entityId: string): boolean {
    const frozen = this.frozenEntities.has(entityId);
    Logging.Log('🔒 isEntityFrozen(' + entityId + ') = ' + frozen + ', frozenEntities size = ' + this.frozenEntities.size);
    return frozen;
  }

  /**
   * Delete a mesh entity using WebVerse API
   */
  deleteEntity(entityId: string): boolean {
    if (this.isEntityFrozen(entityId)) {
      Logging.LogWarning('🔒 Cannot delete frozen entity: ' + entityId);
      return false;
    }
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