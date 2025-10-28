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
  private state: PlayerState;

  constructor() {
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      isGrounded: true
    };
  }

  /**
   * Get current player state
   */
  getState(): PlayerState {
    return { ...this.state };
  }

  /**
   * Update player position
   */
  setPosition(position: Position): void {
    this.state.position = { ...position };
  }

  /**
   * Update player rotation
   */
  setRotation(rotation: Rotation): void {
    this.state.rotation = { ...rotation };
  }

  /**
   * Update player velocity
   */
  setVelocity(velocity: Position): void {
    this.state.velocity = { ...velocity };
  }

  /**
   * Update player state from sync
   */
  applyPlayerState(newState: Partial<PlayerState>): void {
    Object.assign(this.state, newState);
  }

  /**
   * Update player physics
   */
  update(deltaTime: number): void {
    // Apply velocity to position
    this.state.position.x += this.state.velocity.x * deltaTime;
    this.state.position.y += this.state.velocity.y * deltaTime;
    this.state.position.z += this.state.velocity.z * deltaTime;

    // Apply gravity if not grounded
    if (!this.state.isGrounded) {
      this.state.velocity.y -= 9.8 * deltaTime;
    }
  }
}
