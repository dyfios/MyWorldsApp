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

export class PlayerController {
  private internalCharacterEntity: CharacterEntity;
  // private cameraMode: 'firstPerson' | 'thirdPerson' = 'thirdPerson'; // Reserved for future camera mode switching

  constructor(initialPosition: Vector3, characterName: string, characterId: string | undefined) {
    this.setupGlobalCallbacks();
    this.internalCharacterEntity = CharacterEntity.Create(null, initialPosition,
      Quaternion.identity, Vector3.one, false, characterName, characterId,
      "onPlayerCharacterEntityLoaded");
    this.setMotionModeFree();
  }

   /**
   * Setup global callback functions for WebVerse entity loading
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for character entity loading completion
    (globalThis as any).onPlayerCharacterEntityLoaded = (entity: any) => {
      this.onPlayerCharacterEntityLoaded(entity);
    };
  }

  /**
   * Callback when player character entity is loaded
   */
  onPlayerCharacterEntityLoaded(entity: any): void {
    Logging.Log(`✓ Player character entity loaded successfully: ${entity.id}`);
    entity.SetInteractionState(InteractionState.Physical);
    entity.SetVisibility(true);
  }

  /**
   * Set motion mode to free
   */
  setMotionModeFree(): void {
    const props = new EntityPhysicalProperties(null, null, null, false, null);
    this.internalCharacterEntity.SetPhysicalProperties(props);
  }

  /**
   * Set motion mode to physical
   */
  setMotionModePhysical(): void {
    const props = new EntityPhysicalProperties(null, null, null, true, null);
    this.internalCharacterEntity.SetPhysicalProperties(props);
  }

  enterVRMode(): void {
    

  }

  enterNonVRMode(): void {
    this.internalCharacterEntity.PlaceCameraOn();
  }
}