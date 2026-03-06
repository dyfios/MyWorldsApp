/**
 * Player Controller - Manages player state and movement
 */

import { Position, Rotation } from '../types/config';
import { AvatarSettings } from '../utils/ProcessQueryParams';

export interface PlayerState {
  position: Position;
  rotation: Rotation;
  velocity: Position;
  isGrounded: boolean;
}

export enum MotionMode {
  Free,
  Physical
}

export class PlayerController {
  public internalCharacterEntity: CharacterEntity;
  public motionMode: MotionMode = MotionMode.Physical;
  public inVehicle: boolean = false;
  public inVR: boolean = false;
  public activeVehicle: AutomobileEntity | AirplaneEntity | null = null;
  private maintenanceFunctionID: UUID | null = null;
  public cameraMode: 'firstPerson' | 'thirdPerson' = 'thirdPerson';
  public characterLoaded: boolean = false;
  private _maintenanceCount: number = 0;
  private avatarSettings: AvatarSettings | null = null;
  private avatarBaseUrl: string | null = null;

  constructor(initialPosition: Vector3, characterName: string, characterId: string | undefined) {
    this.setupGlobalCallbacks();
    (globalThis as any).playerController = this;
    this.internalCharacterEntity = CharacterEntity.Create(null, initialPosition,
      Quaternion.identity, Vector3.one, false, characterName, characterId,
      "onPlayerCharacterEntityLoaded");
    this.startMaintenance();
  }

  startMaintenance(): void {
    Logging.Log('Starting PlayerController maintenance interval function');
    this.maintenanceFunctionID = Time.SetInterval("globalThis.playercontroller_maintenance();", 0.03);
  }

  stopMaintenance(): void {
    if (this.maintenanceFunctionID != null) {
      Time.StopInterval(this.maintenanceFunctionID.ToString());
      this.maintenanceFunctionID = null;
    }
  }

  maintenance(): void {
    try {
      // Don't do anything until the character entity is fully loaded
      if (!this.characterLoaded || this.internalCharacterEntity == null) {
        return;
      }
      
      // Debug: Log every 100th maintenance call to track activity
      this._maintenanceCount++;
      if (this._maintenanceCount % 100 === 0) {
        Logging.Log('🔧 PlayerController.maintenance() call #' + this._maintenanceCount);
      }
      
      // Debug: Monitor gravity state changes
      const currentGravity = Input.gravityEnabled;
      const currentFixHeight = this.internalCharacterEntity.fixHeight;
      if ((globalThis as any)._lastGravityState !== currentGravity) {
        Logging.Log('🚨 GRAVITY CHANGED! gravityEnabled: ' + (globalThis as any)._lastGravityState + ' -> ' + currentGravity);
        (globalThis as any)._lastGravityState = currentGravity;
      }
      if ((globalThis as any)._lastFixHeightState !== currentFixHeight) {
        Logging.Log('🚨 FIXHEIGHT CHANGED! fixHeight: ' + (globalThis as any)._lastFixHeightState + ' -> ' + currentFixHeight);
        (globalThis as any)._lastFixHeightState = currentFixHeight;
      }

      if (this.inVR) {
        if (!Input.IsVR) {
          this.enterNonVRMode();
        }
      } else {
        if (Input.IsVR) {
          this.enterVRMode();
        }
      }

      if (this.inVehicle && this.activeVehicle != null) {
        // Update player position to match vehicle position
        this.internalCharacterEntity.SetPosition(new Vector3(0, 1, -4), true, false);
      }

      // Handle mobile control flying (shift=up, space=down) or jump
      const shiftDown = (globalThis as any).mobileControlShiftDown === true;
      const spaceDown = (globalThis as any).mobileControlSpaceDown === true;
      
      if (!Input.gravityEnabled) {
        // Flying mode - move at constant speed using position offset
        const flySpeed = 0.1; // Units per frame
        
        if (shiftDown) {
          // Move up
          const currentPos = this.internalCharacterEntity.GetPosition(false);
          if (currentPos) {
            this.internalCharacterEntity.SetPosition(
              new Vector3(currentPos.x, currentPos.y + flySpeed, currentPos.z), 
              false, 
              false
            );
          }
        } else if (spaceDown) {
          // Move down
          const currentPos = this.internalCharacterEntity.GetPosition(false);
          if (currentPos) {
            this.internalCharacterEntity.SetPosition(
              new Vector3(currentPos.x, currentPos.y - flySpeed, currentPos.z), 
              false, 
              false
            );
          }
        }
        // When neither pressed, do nothing - stay at current position
      } else {
        // Walking mode - space triggers jump
        if (spaceDown && Input.jumpEnabled) {
          // Trigger jump and clear the flag to prevent continuous jumping
          Logging.Log('📱 PlayerController: JUMPING!');
          this.internalCharacterEntity.Jump(1);
          (globalThis as any).mobileControlSpaceDown = false;
        }
      }
    } catch (e) {
      // Silently ignore maintenance errors to prevent log spam
    }
  }

  /**
   * Setup global callback functions for WebVerse entity loading
  */
  private setupGlobalCallbacks(): void {
    // Define global callback for player controller maintenance
    (globalThis as any).playercontroller_maintenance = () => {
      this.maintenance();
    };
    
    // Define global callback for character entity loading completion
    (globalThis as any).onPlayerCharacterEntityLoaded = (entity: any) => {
      this.onPlayerCharacterEntityLoaded(entity);
    };

    // Define global callback for placing player in automobile entity
    (globalThis as any).placePlayerInAutomobileEntity = (automobileEntity: any) => {
      this.placePlayerInAutomobileEntity(automobileEntity);
    };

    // Define global callback for placing player in airplane entity
    (globalThis as any).placePlayerInAirplaneEntity = (airplaneEntity: any) => {
      this.placePlayerInAirplaneEntity(airplaneEntity);
    };

    // Define global callback for exiting vehicle
    (globalThis as any).exitVehicle = () => {
      this.exitVehicle();
    };

    // Define global callback for starting vehicle engine
    (globalThis as any).startVehicleEngine = () => {
      this.startVehicleEngine();
    };

    // Define global callback for stopping vehicle engine
    (globalThis as any).stopVehicleEngine = () => {
      this.stopVehicleEngine();
    };

    // Define global callback for pitching vehicle up
    (globalThis as any).pitchVehicleUp = () => {
      this.pitchVehicleUp();
    };

    // Define global callback for pitching vehicle down
    (globalThis as any).pitchVehicleDown = () => {
      this.pitchVehicleDown();
    };

    // Define global callback for moving vehicle forward
    (globalThis as any).moveVehicleForward = () => {
      this.moveVehicleForward();
    };

    // Define global callback for moving vehicle backward
    (globalThis as any).moveVehicleBackward = () => {
      this.moveVehicleBackward();
    };

    // Define global callback for stopping vehicle movement
    (globalThis as any).stopMovingVehicle = () => {
      this.stopMovingVehicle();
    };

    // Define global callback for steering vehicle left
    (globalThis as any).steerVehicleLeft = () => {
      this.steerVehicleLeft();
    };

    // Define global callback for steering vehicle right
    (globalThis as any).steerVehicleRight = () => {
      this.steerVehicleRight();
    };

    // Define global callback for stopping vehicle steering
    (globalThis as any).stopSteeringVehicle = () => {
      this.stopSteeringVehicle();
    };

    // Define global callback for rolling vehicle left
    (globalThis as any).rollVehicleLeft = () => {
      this.rollVehicleLeft();
    };

    // Define global callback for rolling vehicle right
    (globalThis as any).rollVehicleRight = () => {
      this.rollVehicleRight();
    };

    // Define global callback for throttling vehicle up
    (globalThis as any).throttleVehicleUp = () => {
      this.throttleVehicleUp();
    };

    // Define global callback for throttling vehicle down
    (globalThis as any).throttleVehicleDown = () => {
      this.throttleVehicleDown();
    };

    // Define global callback for yawing vehicle left
    (globalThis as any).yawVehicleLeft = () => {
      this.yawVehicleLeft();
    };

    // Define global callback for yawing vehicle right
    (globalThis as any).yawVehicleRight = () => {
      this.yawVehicleRight();
    };

    // Define global callback for pausing for UI
    (globalThis as any).pauseForUI = () => {
      this.pauseForUI();
    };

    // Define global callback for unpausing for UI
    (globalThis as any).unpauseForUI = () => {
      this.unpauseForUI();
    };

    // Define global callback for setting camera mode to first person
    (globalThis as any).setCameraModeFirstPerson = () => {
      this.setCameraModeFirstPerson();
    };

    // Define global callback for setting camera mode to third person
    (globalThis as any).setCameraModeThirdPerson = () => {
      this.setCameraModeThirdPerson();
    };

    // Define global callback for setting motion speed
    (globalThis as any).setMotionSpeed = (speed: number) => {
      this.setMotionSpeed(speed);
    };

    // Define global callback for setting look speed
    (globalThis as any).setLookSpeed = (sensitivity: number) => {
      this.setLookSpeed(sensitivity);
    };

    // Define global callback for setting flying mode
    (globalThis as any).setFlyingMode = (enabled: boolean) => {
      this.setFlyingMode(enabled);
    };

    // Define global callback for setting character position
    (globalThis as any).setCharacterPosition = (newPosition: Vector3) => {
      this.setCharacterPosition(newPosition);
    };

    // Define global callback for setting motion mode to free
    (globalThis as any).setMotionModeFree = () => {
      this.setMotionModeFree();
    };

    // Define global callback for setting character tag/name
    (globalThis as any).setCharacterTag = (tag: string) => {
      this.setCharacterTag(tag);
    };
  }

  /**
   * Callback when player character entity is loaded
   */
  onPlayerCharacterEntityLoaded(entity: any): void {
    if (entity == null) {
      Logging.LogError('❌ PlayerController: onPlayerCharacterEntityLoaded received null entity');
      return;
    }
    Logging.Log(`✓ Player character entity loaded successfully: ${entity.id}`);
    // Don't set InteractionState here - let enterNonVRMode handle it based on gravity setting
    entity.SetVisibility(true);
    (globalThis as any).playerController.internalCharacterEntity = entity;
    this.characterLoaded = true;
    (globalThis as any).playerController.characterLoaded = true;
    
    // Apply avatar model if avatarSettings contains a model path
    this.applyAvatarModel();
    
    this.enterNonVRMode();
    // Note: enterNonVRMode now respects worldDefaultGravity setting and sets appropriate InteractionState
  }

  /**
   * Set avatar settings for this player controller
   */
  setAvatarSettings(settings: AvatarSettings, baseUrl?: string): void {
    this.avatarSettings = settings;
    this.avatarBaseUrl = baseUrl || null;
    Logging.Log('🧑 PlayerController: Avatar settings set: ' + JSON.stringify(settings));
    
    // If character is already loaded, apply the model immediately
    if (this.characterLoaded && this.internalCharacterEntity) {
      this.applyAvatarModel();
    }
  }

  /**
   * Apply avatar model to the character entity
   */
  private applyAvatarModel(): void {
    if (!this.avatarSettings || !this.internalCharacterEntity) {
      return;
    }

    // Get model path from avatarSettings (supports both legacy 'model' and new 'avatar_model_path')
    const modelPath = this.avatarSettings.avatar_model_path || this.avatarSettings.model;
    if (!modelPath) {
      Logging.Log('🧑 PlayerController: No avatar model path specified in avatarSettings');
      return;
    }

    // Construct full model URL
    let fullModelUrl = modelPath;
    if (this.avatarBaseUrl && !modelPath.startsWith('http')) {
      fullModelUrl = this.avatarBaseUrl + '/avatars/' + modelPath;
    }
    Logging.Log('🧑 PlayerController: Loading avatar model: ' + fullModelUrl);

    // Get offset, rotation, and label offset from settings
    const offset = this.avatarSettings.offset || { x: 0, y: 0, z: 0 };
    const rotation = this.avatarSettings.rotation || { x: 0, y: 0, z: 0, w: 1 };
    const labelOffset = this.avatarSettings.labelOffset || { x: 0, y: 2, z: 0 };

    const meshOffset = new Vector3(offset.x, offset.y, offset.z);
    const meshRotation = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const labelOffsetVec = new Vector3(labelOffset.x, labelOffset.y, labelOffset.z);

    const success = this.internalCharacterEntity.SetCharacterModel(
      fullModelUrl,
      meshOffset,
      meshRotation,
      labelOffsetVec
    );

    if (success) {
      Logging.Log('✓ PlayerController: Avatar model applied successfully');
    } else {
      Logging.LogWarning('⚠️ PlayerController: Failed to apply avatar model');
    }
  }

  /**
   * Set the character's tag/name (used for display and identification)
   */
  setCharacterTag(tag: string): void {
    if (this.internalCharacterEntity) {
      this.internalCharacterEntity.tag = tag;
      Logging.Log(`✓ Player character tag set to: ${tag}`);
    } else {
      Logging.LogWarning('Cannot set character tag - character entity not initialized');
    }
  }

  setCharacterPosition(newPosition: Vector3): void {
    Logging.Log('📍 setCharacterPosition() called: (' + newPosition.x + ', ' + newPosition.y + ', ' + newPosition.z + ') motionMode=' + this.motionMode);
    if (this.internalCharacterEntity != null) {
        var currentTransform = this.internalCharacterEntity.GetTransform();
        Logging.Log('📍 setCharacterPosition() current: (' + currentTransform.position.x + ', ' + currentTransform.position.y + ', ' + currentTransform.position.z + ')');
        var newMotion = new Vector3(newPosition.x - currentTransform.position.x,
            newPosition.y - currentTransform.position.y, newPosition.z - currentTransform.position.z);
        if (this.motionMode == MotionMode.Physical) {
            Logging.Log('📍 setCharacterPosition() using Move() for physical mode');
            this.internalCharacterEntity.Move(new Vector3(newMotion.x, newMotion.y, newMotion.z));
        } else {
            Logging.Log('📍 setCharacterPosition() using SetPosition() for free mode');
            this.internalCharacterEntity.SetPosition(newPosition, false);
        }
    }
  }

  /**
   * Set motion mode to free
   */
  setMotionModeFree(): void {
    Logging.Log('🎮 setMotionModeFree() START');
    if ((globalThis as any).playerController.characterLoaded) {
      const props = new EntityPhysicalProperties(null, null, null, false, null);
      (globalThis as any).playerController.internalCharacterEntity.SetPhysicalProperties(props);
      (globalThis as any).playerController.internalCharacterEntity.fixHeight = false;
      // Use Static interaction state to prevent ground snapping
      (globalThis as any).playerController.internalCharacterEntity.SetInteractionState(InteractionState.Static);
      Logging.Log('🎮 setMotionModeFree() Set InteractionState.Static, fixHeight=false, physics=false');
    }
    Input.wasdMotionEnabled = true;
    Input.gravityEnabled = false;
    Input.jumpEnabled = true; // Keep enabled so space key works for descending
    Input.mouseLookEnabled = true;
    (globalThis as any).playerController.motionMode = MotionMode.Free;
    Logging.Log('🎮 setMotionModeFree() END - Input.gravityEnabled=' + Input.gravityEnabled);
  }

  /**
   * Set motion mode to physical
   */
  setMotionModePhysical(): void {
    // Log stack trace to find caller
    Logging.Log('🎮 setMotionModePhysical() START - CALLER TRACE:');
    try { throw new Error('trace'); } catch (e: any) { Logging.Log('🎮 Stack: ' + (e.stack || 'no stack')); }
    if ((globalThis as any).playerController.characterLoaded) {
      const props = new EntityPhysicalProperties(null, null, null, true, null);
      (globalThis as any).playerController.internalCharacterEntity.SetPhysicalProperties(props);
      Logging.Log('🎮 setMotionModePhysical() setting fixHeight=true');
      (globalThis as any).playerController.internalCharacterEntity.fixHeight = true;
      // Use Physical interaction state for ground interaction
      Logging.Log('🎮 setMotionModePhysical() setting InteractionState.Physical');
      (globalThis as any).playerController.internalCharacterEntity.SetInteractionState(InteractionState.Physical);
    }
    Input.wasdMotionEnabled = true;
    Input.gravityEnabled = true;
    Input.jumpEnabled = true;
    Input.mouseLookEnabled = true;
    (globalThis as any).playerController.motionMode = MotionMode.Physical;
    Logging.Log('🎮 setMotionModePhysical() END');
  }

  setCameraModeFirstPerson(): void {
    Camera.SetPosition(new Vector3(0, 0.79, 0), true);
    this.internalCharacterEntity.SetVisibility(false, false);
    this.cameraMode = 'firstPerson';
  }

  setCameraModeThirdPerson(): void {
    Camera.SetPosition(new Vector3(0, 1.5, -2.75), true);
    this.internalCharacterEntity.SetVisibility(true, false);
    this.cameraMode = 'thirdPerson';
  }

  enterVRMode(): void {
    Input.AddRigFollower((globalThis as any).playerController.internalCharacterEntity);
    this.inVR = true;
    Input.gravityEnabled = false; // Rig handles gravity in VR
    this.internalCharacterEntity.SetVisibility(false, false);
  }

  setMotionSpeed(speed: number): void {
    Input.movementSpeed = speed * 4;
  }

  setLookSpeed(sensitivity: number): void {
    Input.lookSpeed = sensitivity / 10;
  }

  setFlyingMode(enabled: boolean): void {
    Logging.Log('✈️ PlayerController.setFlyingMode called with: ' + enabled);
    Logging.Log('✈️ PlayerController: Before - Input.gravityEnabled = ' + Input.gravityEnabled);
    
    // If world default gravity is false, never enable gravity
    const worldGravity = (globalThis as any).worldDefaultGravity;
    if (worldGravity === false) {
      Logging.Log('✈️ PlayerController: worldDefaultGravity is false, keeping gravity disabled');
      Input.gravityEnabled = false;
    } else {
      Input.gravityEnabled = !enabled;
    }
    Logging.Log('✈️ PlayerController: After - Input.gravityEnabled = ' + Input.gravityEnabled);
  }

  enterNonVRMode(): void {
    Logging.Log('🎮 enterNonVRMode() START');
    (globalThis as any).playerController.internalCharacterEntity.PlaceCameraOn();
    Input.SetAvatarEntityByTag((globalThis as any).playerController.internalCharacterEntity.tag);
    Input.SetRigOffset(new Vector3(0, 1.5, -2.75));
    this.internalCharacterEntity.SetRotation(Quaternion.identity, true, false);
    
    // Respect world default gravity setting instead of always enabling physical mode
    const gravityDefault = (globalThis as any).worldDefaultGravity;
    Logging.Log('🎮 enterNonVRMode() gravityDefault = ' + gravityDefault + ' (type: ' + typeof gravityDefault + ')');
    Logging.Log('🎮 enterNonVRMode() gravityDefault === false ? ' + (gravityDefault === false));
    if (gravityDefault === false) {
      Logging.Log('🎮 enterNonVRMode() calling setMotionModeFree()');
      this.setMotionModeFree();
    } else {
      Logging.Log('🎮 enterNonVRMode() calling setMotionModePhysical() because gravityDefault is not false');
      this.setMotionModePhysical();
    }
    
    this.setCameraModeThirdPerson();
    this.inVR = false;
    Logging.Log('🎮 enterNonVRMode() END');
  }

  jump(amount: number): void {
    (globalThis as any).playerController.internalCharacterEntity.Jump(amount);
  }

  placePlayerInAutomobileEntity(automobileEntity: AutomobileEntity): void {
    this.internalCharacterEntity.SetParent(automobileEntity);
    this.internalCharacterEntity.SetPosition(new Vector3(0, 1, -4), true, false);
    this.internalCharacterEntity.SetRotation(Quaternion.identity, true, false);
    this.internalCharacterEntity.SetInteractionState(InteractionState.Static);
    this.internalCharacterEntity.fixHeight = false;
    this.internalCharacterEntity.SetPhysicalProperties(new EntityPhysicalProperties(null, null, null, false, null));
    this.internalCharacterEntity.SetVisibility(false, false);
    this.inVehicle = true;
    this.activeVehicle = automobileEntity;
    Input.wasdMotionEnabled = false;
  }

  placePlayerInAirplaneEntity(airplaneEntity: AirplaneEntity): void {
    this.internalCharacterEntity.SetParent(airplaneEntity);
    this.internalCharacterEntity.SetPosition(new Vector3(0, 1, -4), true, false);
    this.internalCharacterEntity.SetRotation(Quaternion.identity, true, false);
    this.internalCharacterEntity.SetInteractionState(InteractionState.Static);
    this.internalCharacterEntity.fixHeight = false;
    this.internalCharacterEntity.SetPhysicalProperties(new EntityPhysicalProperties(null, null, null, false, null));
    this.internalCharacterEntity.SetVisibility(false, false);
    this.inVehicle = true;
    this.activeVehicle = airplaneEntity;
    Input.wasdMotionEnabled = false;
  }

  exitVehicle(): void {
    if (this.inVehicle && this.activeVehicle != null) {
        var vehiclePosition = this.activeVehicle.GetPosition(false);
        this.internalCharacterEntity.SetParent(null);
        this.internalCharacterEntity.SetPosition(new Vector3(
            vehiclePosition.x, vehiclePosition.y + 2, vehiclePosition.z), true, false);
        this.internalCharacterEntity.SetRotation(Quaternion.identity, true, false);
        this.internalCharacterEntity.SetInteractionState(InteractionState.Physical);
        this.internalCharacterEntity.fixHeight = true;
        this.internalCharacterEntity.SetPhysicalProperties(new EntityPhysicalProperties(null, null, null, true, null));
        this.internalCharacterEntity.SetVisibility(true, false);
        this.inVehicle = false;
        this.activeVehicle = null;
        // Place the camera on the character.
        this.internalCharacterEntity.PlaceCameraOn();
        Camera.SetPosition(new Vector3(0, 1.5, -2.75), true);
        this.cameraMode = 'thirdPerson';
        Input.wasdMotionEnabled = true;
    }
    else {
        Logging.LogError("[ThirdPersonCharacter] Cannot exit vehicle, not in a vehicle.");
    }
  }

  startVehicleEngine(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AutomobileEntity) {
        this.activeVehicle.engineStartStop = true;
      } else if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.StartEngine();
      }
    }
  }

  stopVehicleEngine(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AutomobileEntity) {

      } else if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.StopEngine();
      }
    }
  }

  pitchVehicleUp(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.pitch += 1;
      }
    }
  }

  pitchVehicleDown(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.pitch -= 1;
      }
    }
  }

  moveVehicleForward(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AutomobileEntity) {
        this.activeVehicle.brake = 0;
        this.activeVehicle.throttle = 1;
      }
    }
  }

  moveVehicleBackward(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AutomobileEntity) {
        this.activeVehicle.brake = 1;
        this.activeVehicle.throttle = 0;
      }
    }
  }

  stopMovingVehicle(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AutomobileEntity) {
        this.activeVehicle.brake = 0;
        this.activeVehicle.throttle = 0;
      }
    }
  }

  steerVehicleLeft(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AutomobileEntity) {
        this.activeVehicle.steer = -1;
      }
    }
  }

  steerVehicleRight(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AutomobileEntity) {
        this.activeVehicle.steer = 1;
      }
    }
  }

  stopSteeringVehicle(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AutomobileEntity) {
        this.activeVehicle.steer = 0;
      }
    }
  }

  rollVehicleLeft(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.roll -= 1;
      }
    }
  }

  rollVehicleRight(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.roll += 1;
      }
    }
  }

  throttleVehicleUp(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.throttle += 1;
      }
    }
  }

  throttleVehicleDown(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.throttle -= 1;
      }
    }
  }

  yawVehicleLeft(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.yaw -= 1;
      }
    }
  }

  yawVehicleRight(): void {
    if (this.activeVehicle != null) {
      if (this.activeVehicle instanceof AirplaneEntity) {
        this.activeVehicle.yaw += 1;
      }
    }
  }

  pauseForUI(): void {
    Logging.Log("Pausing player controls for UI");
    Input.wasdMotionEnabled = false;
    Input.mouseLookEnabled = false;
    Input.jumpEnabled = false;
  }

  unpauseForUI(): void {
    Logging.Log("Unpausing player controls after UI");
    Input.wasdMotionEnabled = true;
    Input.mouseLookEnabled = true;
    if (this.motionMode === MotionMode.Physical) {
      Input.jumpEnabled = true;
    } else {
      Input.jumpEnabled = false;
    }
  }
}