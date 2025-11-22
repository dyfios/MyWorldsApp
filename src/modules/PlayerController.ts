/**
 * Player Controller - Manages player state and movement
 */

import { Position, Rotation } from '../types/config';

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
  public activeVehicle: AutomobileEntity | AirplaneEntity | null = null;
  private maintenanceFunctionID: UUID | null = null;
  // private cameraMode: 'firstPerson' | 'thirdPerson' = 'thirdPerson'; // Reserved for future camera mode switching

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
    this.maintenanceFunctionID = Time.SetInterval("playercontroller_maintenance();", 0.5);
  }

  stopMaintenance(): void {
    if (this.maintenanceFunctionID != null) {
      Time.StopInterval(this.maintenanceFunctionID.ToString());
      this.maintenanceFunctionID = null;
    }
  }

  maintenance(): void {
    if (this.inVehicle && this.activeVehicle != null) {
      // Update player position to match vehicle position
      this.internalCharacterEntity.SetPosition(new Vector3(0, 1, -4), true, false);
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
  }

  /**
   * Callback when player character entity is loaded
   */
  onPlayerCharacterEntityLoaded(entity: any): void {
    Logging.Log(`✓ Player character entity loaded successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Physical);
    entity.SetVisibility(true);
    (globalThis as any).playerController.internalCharacterEntity = entity;
    this.enterNonVRMode();
  }

  setCharacterPosition(newPosition: Vector3): void {
    if (this.internalCharacterEntity != null) {
        var currentTransform = this.internalCharacterEntity.GetTransform();
        var newMotion = new Vector3(newPosition.x - currentTransform.position.x,
            newPosition.y - currentTransform.position.y, newPosition.z - currentTransform.position.z);
        if (this.motionMode == MotionMode.Physical) {
            this.internalCharacterEntity.Move(new Vector3(newMotion.x, newMotion.y, newMotion.z));
        } else {
            this.internalCharacterEntity.SetPosition(newPosition, false);
        }
    }
  }

  /**
   * Set motion mode to free
   */
  setMotionModeFree(): void {
    const props = new EntityPhysicalProperties(null, null, null, false, null);
    (globalThis as any).playerController.internalCharacterEntity.SetPhysicalProperties(props);
    Input.wasdMotionEnabled = true;
    Input.gravityEnabled = false;
    Input.jumpEnabled = false;
    Input.mouseLookEnabled = true;
    (globalThis as any).playerController.motionMode = MotionMode.Free;
  }

  /**
   * Set motion mode to physical
   */
  setMotionModePhysical(): void {
    const props = new EntityPhysicalProperties(null, null, null, true, null);
    (globalThis as any).playerController.internalCharacterEntity.SetPhysicalProperties(props);
    Input.wasdMotionEnabled = true;
    Input.gravityEnabled = true;
    Input.jumpEnabled = true;
    Input.mouseLookEnabled = true;
    (globalThis as any).playerController.motionMode = MotionMode.Physical;
  }

  setCameraModeFirstPerson(): void {
    Camera.SetPosition(new Vector3(0, 0.79, 0), true);
    this.internalCharacterEntity.SetVisibility(false, false);
  }

  setCameraModeThirdPerson(): void {
    Camera.SetPosition(new Vector3(0, 1.5, -2.75), true);
    this.internalCharacterEntity.SetVisibility(true, false);
  }

  enterVRMode(): void {
    Input.AddRigFollower((globalThis as any).playerController.internalCharacterEntity);
  }

  setMotionSpeed(speed: number): void {
    Input.movementSpeed = speed * 4;
  }

  setLookSpeed(sensitivity: number): void {
    Input.lookSpeed = sensitivity / 10;
  }

  setFlyingMode(enabled: boolean): void {
    Input.gravityEnabled = !enabled;
  }

  enterNonVRMode(): void {
    (globalThis as any).playerController.internalCharacterEntity.PlaceCameraOn();
    Input.SetAvatarEntityByTag((globalThis as any).playerController.internalCharacterEntity.tag);
    Input.SetRigOffset(new Vector3(0, 1.5, -2.75));
    this.setMotionModePhysical();
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