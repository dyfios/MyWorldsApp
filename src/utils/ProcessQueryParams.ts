/**
 * Process Query Parameters utility
 */

export interface AvatarSettings {
  model?: string;
  offset?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number; w: number };
  labelOffset?: { x: number; y: number; z: number };
}

export interface UserPosition {
  x: number;
  y: number;
  z: number;
}

export interface WorldMetadata {
  id: string;
  name: string;
  description: string;
  owner: string;
  permissions: string;
  stateService?: string; // Used for tiled surface renderer
}

export interface QueryParams {
  // World parameters
  worldType?: string; // "mini-world", "planet", "galaxy"
  worldMetadata?: WorldMetadata | string;
  worldAddress?: string;
  
  // Client type for authentication
  client?: string; // "full", "lite"
  
  // Avatar settings as JSON structure
  avatarSettings?: AvatarSettings;
  
  // User position as JSON structure
  userPosition?: UserPosition;
  
  [key: string]: string | boolean | number | AvatarSettings | UserPosition | WorldMetadata | undefined;
}

export class ProcessQueryParams {
  private params: QueryParams = {};

  /**
   * Parse query parameters from URL
   */
  parse(): QueryParams {
    try {
      Logging.Log('📊 Step 1a: Initializing query params...');
      this.params = {};
      
      // Common query parameters to check
      const commonParams = [
        'worldType', 'worldMetadata', 'worldAddress', 'client', 'avatarSettings', 'userPosition'
      ];
      Logging.Log('📊 Step 1b: Starting to check common parameters: ' + commonParams.join(', '));
      
      commonParams.forEach((key, index) => {
        try {
          Logging.Log('📊 Step 1c.' + (index + 1) + ': Checking parameter: ' + key);
          const value = World.GetQueryParam(key);
          Logging.Log('📊 Step 1c.' + (index + 1) + 'a: World.GetQueryParam returned: ' + (value || 'null'));
          
          if (value !== null) {
            const decodedValue = decodeURIComponent(value); // Properly decode all URL-encoded characters
            // Convert to appropriate type based on parameter name
            if (key === 'avatarSettings') {
              try {
                this.params[key] = JSON.parse(decodedValue) as AvatarSettings;
                Logging.Log('📊 Step 1c.' + (index + 1) + 'b: Avatar settings parsed: ' + JSON.stringify(this.params[key]));
              } catch (error) {
                Logging.LogError('❌ Invalid JSON for avatarSettings: ' + decodedValue);
                this.params[key] = {}; // Default to empty object
              }
            } else if (key === 'userPosition') {
              try {
                this.params[key] = JSON.parse(decodedValue) as UserPosition;
                Logging.Log('📊 Step 1c.' + (index + 1) + 'b: User position parsed: ' + JSON.stringify(this.params[key]));
              } catch (error) {
                Logging.LogError('❌ Invalid JSON for userPosition: ' + decodedValue);
                this.params[key] = { x: 0, y: 0, z: 0 }; // Default to origin
              }
            } else if (key === 'worldMetadata') {
              try {
                this.params[key] = JSON.parse(decodedValue) as WorldMetadata;
                Logging.Log('📊 Step 1c.' + (index + 1) + 'b: World metadata parsed: ' + JSON.stringify(this.params[key]));
              } catch (error) {
                Logging.LogError('❌ Invalid JSON for worldMetadata: ' + decodedValue);
                this.params[key] = decodedValue; // Keep as string if JSON parsing fails
              }
            } else if (decodedValue.toLowerCase() === 'true') {
              this.params[key] = true;
            } else if (decodedValue.toLowerCase() === 'false') {
              this.params[key] = false;
            } else {
              this.params[key] = decodedValue;
            }
            
            if (key !== 'avatarSettings' && key !== 'userPosition' && key !== 'worldMetadata') {
              Logging.Log('📊 Step 1c.' + (index + 1) + 'b: Parameter ' + key + ' set to: ' + this.params[key]);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          Logging.LogError('❌ Error processing parameter ' + key + ': ' + errorMessage);
        }
      });

      Logging.Log('📊 Step 1d: Final parsed query parameters: ' + JSON.stringify(this.params));
      return this.params;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Error in parse(): ' + errorMessage);
      return this.params || {};
    }
  }

  /**
   * Get a specific parameter (first checks cached params, then queries World API)
   */
  get(key: string): string | boolean | number | AvatarSettings | UserPosition | WorldMetadata | undefined {
    // Check cached params first
    if (key in this.params) {
      return this.params[key];
    }
    
    // Query World API directly
    const value = World.GetQueryParam(key);
    if (value !== null) {
      // Convert to appropriate type and cache the result
      if (key === 'avatarSettings') {
        try {
          const parsed = JSON.parse(value) as AvatarSettings;
          this.params[key] = parsed;
          return parsed;
        } catch (error) {
          const defaultSettings: AvatarSettings = {};
          this.params[key] = defaultSettings;
          return defaultSettings;
        }
      } else if (key === 'userPosition') {
        try {
          const parsed = JSON.parse(value) as UserPosition;
          this.params[key] = parsed;
          return parsed;
        } catch (error) {
          const defaultPosition: UserPosition = { x: 0, y: 0, z: 0 };
          this.params[key] = defaultPosition;
          return new Vector3(defaultPosition.x, defaultPosition.y, defaultPosition.z);
        }
      } else if (key === 'worldMetadata') {
        try {
          const parsed = JSON.parse(value) as WorldMetadata;
          this.params[key] = parsed;
          return parsed;
        } catch (error) {
          // Keep as string if JSON parsing fails
          this.params[key] = value;
          return value;
        }
      } else if (value.toLowerCase() === 'true') {
        this.params[key] = true;
        return true;
      } else if (value.toLowerCase() === 'false') {
        this.params[key] = false;
        return false;
      } else {
        this.params[key] = value;
        return value;
      }
    }
    
    return undefined;
  }

  /**
   * Get all parameters
   */
  getAll(): QueryParams {
    return { ...this.params };
  }

  /**
   * Check if a parameter exists
   */
  has(key: string): boolean {
    return key in this.params || World.GetQueryParam(key) !== null;
  }

  /**
   * Static method to get a query parameter directly using World API
   */
  static getParam(key: string): string | null {
    return World.GetQueryParam(key);
  }

  /**
   * Static method to get a query parameter as boolean
   */
  static getParamAsBoolean(key: string): boolean | null {
    const value = World.GetQueryParam(key);
    if (value === null) return null;
    return value.toLowerCase() === 'true';
  }

  /**
   * Static method to get a query parameter as number
   */
  static getParamAsNumber(key: string): number | null {
    const value = World.GetQueryParam(key);
    if (value === null) return null;
    const numValue = parseFloat(value);
    return isNaN(numValue) ? null : numValue;
  }

  /**
   * Get avatar settings
   */
  getAvatarSettings(): AvatarSettings {
    const settings = this.get('avatarSettings') as AvatarSettings;
    return settings || {};
  }

  /**
   * Get avatar model
   */
  getAvatarModel(): string | undefined {
    return this.getAvatarSettings().model;
  }

  /**
   * Get avatar offset as a 3D vector
   */
  getAvatarOffset(): { x: number; y: number; z: number } {
    const offset = this.getAvatarSettings().offset;
    return offset || { x: 0, y: 0, z: 0 };
  }

  /**
   * Get avatar rotation as a quaternion
   */
  getAvatarRotation(): { x: number; y: number; z: number; w: number } {
    const rotation = this.getAvatarSettings().rotation;
    return rotation || { x: 0, y: 0, z: 0, w: 1 };
  }

  /**
   * Get avatar label offset as a 3D vector
   */
  getAvatarLabelOffset(): { x: number; y: number; z: number } {
    const labelOffset = this.getAvatarSettings().labelOffset;
    return labelOffset || { x: 0, y: 0, z: 0 };
  }

  /**
   * Get user position as a 3D vector
   */
  getUserPosition(): Vector3 {
    const position = this.get('userPosition') as Vector3;
    return position || new Vector3(0, 0, 0);
  }

  /**
   * Get world address
   */
  getWorldAddress(): string | undefined {
    return this.get('worldAddress') as string;
  }

  /**
   * Get state service address from world metadata
   * Used for tiled surface renderer state management
   */
  getStateService(): string | undefined {
    const metadata = this.getWorldMetadata();
    return metadata?.stateService;
  }

  /**
   * Get world metadata as parsed object
   */
  getWorldMetadata(): WorldMetadata | undefined {
    const metadata = this.get('worldMetadata');
    return metadata && typeof metadata === 'object' ? metadata as WorldMetadata : undefined;
  }

  /**
   * Get world metadata as raw string
   */
  getWorldMetadataRaw(): string | undefined {
    const metadata = this.get('worldMetadata');
    return typeof metadata === 'string' ? metadata : undefined;
  }
}
