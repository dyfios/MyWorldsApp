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
  // private cameraMode: 'firstPerson' | 'thirdPerson' = 'thirdPerson'; // Reserved for future camera mode switching

  constructor(initialPosition: Vector3, characterName: string, characterId: string | undefined) {
    this.setupGlobalCallbacks();
    (globalThis as any).playerController = this;
    this.internalCharacterEntity = CharacterEntity.Create(null, initialPosition,
      Quaternion.identity, Vector3.one, false, characterName, characterId,
      "onPlayerCharacterEntityLoaded");
  }

   /**
   * Setup global callback functions for WebVerse entity loading
   */
  private setupGlobalCallbacks(): void {
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

    // Define global callback for pausing for UI
    (globalThis as any).pauseForUI = () => {
      this.pauseForUI();
    };

    // Define global callback for unpausing for UI
    (globalThis as any).unpauseForUI = () => {
      this.unpauseForUI();
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

  enterVRMode(): void {
    Input.AddRigFollower((globalThis as any).playerController.internalCharacterEntity);
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
    var context = Context.GetContext("THIRD_PERSON_CHARACTER_CONTROLLER");

    context.characterEntity.SetParent(automobileEntity);
    context.characterEntity.SetPosition(new Vector3(0, 1, -4), true, false);
    context.characterEntity.SetRotation(Quaternion.identity, true, false);
    context.characterEntity.SetInteractionState(InteractionState.Static);
    context.characterEntity.fixHeight = false;
    context.characterEntity.SetPhysicalProperties(new EntityPhysicalProperties(null, null, null, false, null));
    context.characterEntity.SetVisibility(false, false);
    context.inVehicle = true;
    (globalThis as any).playerController.activeVehicle = automobileEntity;

    Context.DefineContext("THIRD_PERSON_CHARACTER_CONTROLLER", context);
  }

  placePlayerInAirplaneEntity(airplaneEntity: AirplaneEntity): void {
    var context = Context.GetContext("THIRD_PERSON_CHARACTER_CONTROLLER");

    context.characterEntity.SetParent(airplaneEntity);
    context.characterEntity.SetPosition(new Vector3(0, 1, -4), true, false);
    context.characterEntity.SetRotation(Quaternion.identity, true, false);
    context.characterEntity.SetInteractionState(InteractionState.Static);
    context.characterEntity.fixHeight = false;
    context.characterEntity.SetPhysicalProperties(new EntityPhysicalProperties(null, null, null, false, null));
    context.characterEntity.SetVisibility(false, false);
    context.inVehicle = true;
    (globalThis as any).playerController.activeVehicle = airplaneEntity;

    Context.DefineContext("THIRD_PERSON_CHARACTER_CONTROLLER", context);
  };

  exitVehicle(): void {
    var context = Context.GetContext("THIRD_PERSON_CHARACTER_CONTROLLER");
    if (context.inVehicle && (globalThis as any).playerController.activeVehicle != null) {
        var vehiclePosition = (globalThis as any).playerController.activeVehicle.GetPosition(false);
        context.characterEntity.SetParent(null);
        context.characterEntity.SetPosition(new Vector3(
            vehiclePosition.x, vehiclePosition.y + 2, vehiclePosition.z), true, false);
        context.characterEntity.SetRotation(Quaternion.identity, true, false);
        context.characterEntity.SetInteractionState(InteractionState.Physical);
        context.characterEntity.fixHeight = true;
        context.characterEntity.SetPhysicalProperties(new EntityPhysicalProperties(null, null, null, true, null));
        context.characterEntity.SetVisibility(true, false);
        context.inVehicle = false;
        (globalThis as any).playerController.activeVehicle = null;
        Context.DefineContext("THIRD_PERSON_CHARACTER_CONTROLLER", context);
        // Place the camera on the character.
        context.characterEntity.PlaceCameraOn();
        Context.DefineContext("THIRD_PERSON_CHARACTER_CONTROLLER", context);
        Camera.SetPosition(new Vector3(0, 1.5, -2.75), true);
    }
    else {
        Logging.LogError("[ThirdPersonCharacter] Cannot exit vehicle, not in a vehicle.");
    }
  }

  startVehicleEngine(): void {
    if ((globalThis as any).playerController.activeVehicle != null) {
        (globalThis as any).playerController.activeVehicle.engineStartStop = true;
    }
  }

  moveVehicleForward(): void {
    if ((globalThis as any).playerController.activeVehicle != null) {
        (globalThis as any).playerController.activeVehicle.brake = 0;
        (globalThis as any).playerController.activeVehicle.throttle = 1;
    }
  }

  moveVehicleBackward(): void {
    if ((globalThis as any).playerController.activeVehicle != null) {
        (globalThis as any).playerController.activeVehicle.brake = 1;
        (globalThis as any).playerController.activeVehicle.throttle = 0;
    }
  }

  stopMovingVehicle(): void {
    if ((globalThis as any).playerController.activeVehicle != null) {
        (globalThis as any).playerController.activeVehicle.brake = 0;
        (globalThis as any).playerController.activeVehicle.throttle = 0;
    }
  }

  steerVehicleLeft(): void {
    if ((globalThis as any).playerController.activeVehicle != null) {
        (globalThis as any).playerController.activeVehicle.steer = -1;
    }
  }

  steerVehicleRight(): void {
    if ((globalThis as any).playerController.activeVehicle != null) {
        (globalThis as any).playerController.activeVehicle.steer = 1;
    }
  }

  stopSteeringVehicle(): void {
    if ((globalThis as any).playerController.activeVehicle != null) {
        (globalThis as any).playerController.activeVehicle.steer = 0;
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