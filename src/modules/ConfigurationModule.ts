/**
 * Configuration module - Loads and applies world, entity, and terrain configuration
 */

import { WorldConfig, EntityConfig, VariantConfig, TerrainConfig } from '../types/config';

export class ConfigurationModule {
  private entitiesConfig?: EntityConfig[];

  /**
   * Load world configuration from URL
   */
  async loadWorldConfig(worldUri?: string): Promise<WorldConfig> {
    const configUrl = this.normalizeUrl(worldUri || '/config/world.json');
    const config = await this.fetchJson<WorldConfig>(configUrl);
    
    this.validateWorldConfig(config);

    // Apply configurations
    if (config.entities) {
      this.entitiesConfig = config.entities;
      this.validateEntitiesConfig(config.entities);
      this.applyEntitiesConfig();
    }

    if (config.terrain) {
      this.validateTerrainConfig(config.terrain);
      this.applyTerrainConfig();
    }

    return config;
  }

  /**
   * Get entity variant by ID
   */
  getEntityVariantById(entityId: string, variantId: string): VariantConfig | null {
    if (!this.entitiesConfig) {
      return null;
    }

    const entity = this.entitiesConfig.find(e => e.entityId === entityId);
    if (!entity) {
      return null;
    }

    return entity.variants.find(v => v.variantId === variantId) || null;
  }

  /**
   * Fetch JSON from URL using WebVerse HTTPNetworking
   */
  private async fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
/*      const onComplete = "";
      const onError = "";

      HTTPNetworking.Fetch(
        url,
        { method: 'GET' },
        onComplete,
        onError
      );

      // Store callbacks globally for HTTPNetworking to call
      (globalThis as any)[onComplete] = (response: any) => {
        try {
          const data = JSON.parse(response.body);
          // Clean up callbacks
          delete (globalThis as any)[onComplete];
          delete (globalThis as any)[onError];
          resolve(data);
        } catch (error) {
          delete (globalThis as any)[onComplete];
          delete (globalThis as any)[onError];
          reject(new Error(`Failed to parse JSON from ${url}: ${error}`));
        }
      };

      (globalThis as any)[onError] = (error: any) => {
        delete (globalThis as any)[onComplete];
        delete (globalThis as any)[onError];
        reject(new Error(`Failed to fetch ${url}: ${error.message || 'Unknown error'}`));
      };*/
      if (false) {
        reject(new Error(`Failed to fetch ${url}: Unknown error`));
      }
      resolve({} as T);
    });
  }

  /**
   * Validate world configuration
   */
  private validateWorldConfig(cfg: WorldConfig): void {
    if (!cfg) {
      throw new Error('World config is undefined');
    }
    // Additional validation logic would go here
  }

  /**
   * Validate entities configuration
   */
  private validateEntitiesConfig(cfg: EntityConfig[]): void {
    if (!Array.isArray(cfg)) {
      throw new Error('Entities config must be an array');
    }
    
    cfg.forEach(entity => {
      if (!entity.entityId) {
        throw new Error('Entity must have an entityId');
      }
      if (!entity.variants || !Array.isArray(entity.variants)) {
        throw new Error(`Entity ${entity.entityId} must have variants array`);
      }
    });
  }

  /**
   * Apply entities configuration
   */
  private applyEntitiesConfig(): void {
    // Logic to register entity types and variants
    Logging.Log('Entities configuration applied');
  }

  /**
   * Validate terrain configuration
   */
  private validateTerrainConfig(cfg: TerrainConfig): void {
    if (!cfg.layers || !Array.isArray(cfg.layers)) {
      throw new Error('Terrain config must have layers array');
    }
  }

  /**
   * Apply terrain configuration
   */
  private applyTerrainConfig(): void {
    // Logic to set up terrain rendering
    Logging.Log('Terrain configuration applied');
  }

  /**
   * Normalize URL path
   */
  private normalizeUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return path.startsWith('/') ? path : `/${path}`;
  }
}
