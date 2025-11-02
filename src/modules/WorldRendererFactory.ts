/**
 * World Rendering subsystem - Supports multiple renderers for different spatial scales
 */

import { WorldConfig } from '../types/config';
import { REST } from '../api/REST';
import { ProcessQueryParams, WorldMetadata } from '../utils/ProcessQueryParams';
import { EntityManager } from './EntityManager';

/**
 * Entity instance format received from the server
 */
interface EntityInstance {
  instanceid: string;
  instancetag: string;
  entity_id: string;
  variant_id: string;
  entity_parent: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_x: number;
  rot_y: number;
  rot_z: number;
  rot_w: number;
  scl_x: number;
  scl_y: number;
  scl_z: number;
  state: string;
  owner: string | null;
  owner_read: string | null;
  owner_write: string | null;
  owner_use: string | null;
  owner_take: string | null;
  other_read: string | null;
  other_write: string | null;
  other_use: string | null;
  other_take: string | null;
}

/**
 * Abstract base class for world renderers
 */
export abstract class WorldRendering {
  protected config?: WorldConfig;

  abstract initialize(config: WorldConfig): Promise<void>;
  abstract render(deltaTime: number): void;
  abstract dispose(): void;
}

/**
 * Static surface renderer for fixed terrain
 */
export class StaticSurfaceRenderer extends WorldRendering {
  private restClient: REST;
  private queryParams: ProcessQueryParams;
  private worldMetadata?: WorldMetadata;
  private entityManager: EntityManager;

  constructor() {
    super();
    this.queryParams = new ProcessQueryParams();
    // Initialize with default, will be updated in initialize()
    this.restClient = new REST();
    this.entityManager = new EntityManager();
    this.setupGlobalCallbacks();
  }

  /**
   * Setup global callback functions for WebVerse entity loading
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for entity templates loading completion
    (globalThis as any).onEntityTemplatesComplete = (response: string) => {
      this.onEntityTemplatesComplete(response);
    };

    // Define global callback for entity templates loading error
    (globalThis as any).onEntityTemplatesError = (error: any) => {
      this.onEntityTemplatesError(error);
    };

    // Define global callback for entity instances loading completion
    (globalThis as any).onEntityInstancesComplete = (response: string) => {
      this.onEntityInstancesComplete(response);
    };

    // Define global callback for entity instances loading error
    (globalThis as any).onEntityInstancesError = (error: any) => {
      this.onEntityInstancesError(error);
    };
  }

  onEntityTemplatesComplete(response: string): void {
    try {
      Logging.Log('🎯 StaticSurfaceRenderer: onComplete callback invoked');
      const templates = JSON.parse(response);
      Logging.Log('📋 StaticSurfaceRenderer: Entity templates received: ' + templates);
      Logging.Log('✓ StaticSurfaceRenderer: Entity templates request completed successfully');
      Context.DefineContext('MW_ENTITY_TEMPLATES', templates);
      
      // Now that templates are complete, trigger entity instances loading
      Logging.Log('🔄 Triggering entity instances request after templates completion...');
      if (typeof (globalThis as any).triggerEntityInstancesAfterTemplates === 'function') {
        (globalThis as any).triggerEntityInstancesAfterTemplates();
      } else {
        Logging.LogError('triggerEntityInstancesAfterTemplates function not available');
      }
    } catch (error) {
      Logging.LogError('❌ StaticSurfaceRenderer: Failed to parse entity templates response: '  + error);
    }
  }

  onEntityTemplatesError(error: any): void {
    Logging.Log('🎯 StaticSurfaceRenderer: onError callback invoked');
    const errorMessage = error.message || 'Unknown error';
    Logging.LogError('❌ StaticSurfaceRenderer: Failed to request entity templates: ' + errorMessage);
  }

  onEntityInstancesComplete(response: string): void {
    try {
      Logging.Log('🎯 StaticSurfaceRenderer: onEntityInstancesComplete callback invoked');
      const instances = JSON.parse(response);
      Logging.Log('📦 StaticSurfaceRenderer: Entity instances received: ' + JSON.stringify(instances));
      Logging.Log('✓ StaticSurfaceRenderer: Entity instances request completed successfully');
      Context.DefineContext('MW_ENTITY_INSTANCES', instances);

      // Instantiate all entities using EntityManager
      const worldRendererFactoryWrapper = Context.GetContext('WorldRendererFactory');
      Logging.Log('🔍 WorldRendererFactory from context: ' + (worldRendererFactoryWrapper ? 'Found' : 'Not found'));
      
      if (worldRendererFactoryWrapper) {
        Logging.Log('🔍 WorldRendererFactory type: ' + typeof worldRendererFactoryWrapper);
        Logging.Log('🔍 Checking for getStaticSurfaceRenderer method: ' + (typeof worldRendererFactoryWrapper.getStaticSurfaceRenderer));
        
        if (worldRendererFactoryWrapper.getStaticSurfaceRenderer) {
          try {
            const staticRenderer = worldRendererFactoryWrapper.getStaticSurfaceRenderer();
            Logging.Log('🔍 StaticSurfaceRenderer retrieved: ' + (staticRenderer ? 'Found' : 'Not found'));
            
            if (staticRenderer) {
              Logging.Log('🔍 Checking for instantiateEntities method: ' + (typeof staticRenderer.instantiateEntities));
              
              if (staticRenderer.instantiateEntities) {
                Logging.Log('🎯 Calling instantiateEntities with ' + instances['assets'].length + ' instances');
                staticRenderer.instantiateEntities(instances['assets']);
              } else {
                Logging.LogError('❌ instantiateEntities method not found on StaticSurfaceRenderer');
              }
            } else {
              Logging.LogError('❌ StaticSurfaceRenderer not found');
            }
          } catch (error) {
            Logging.LogError('❌ Error calling getStaticSurfaceRenderer: ' + error);
          }
        } else {
          Logging.LogError('❌ getStaticSurfaceRenderer method not found on WorldRendererFactory wrapper');
        }
      } else {
        Logging.LogError('❌ WorldRendererFactory not found in context');
      }
    } catch (error) {
      Logging.LogError('❌ StaticSurfaceRenderer: Failed to parse entity instances response: ' + error);
    }
  }

  onEntityInstancesError(error: any): void {
    Logging.Log('🎯 StaticSurfaceRenderer: onEntityInstancesError callback invoked');
    const errorMessage = error.message || 'Unknown error';
    Logging.LogError('❌ StaticSurfaceRenderer: Failed to request entity instances: ' + errorMessage);
  }

  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    
    // Parse query parameters to ensure they're available
    this.queryParams.parse();
    
    // Parse world metadata from query parameters
    this.parseWorldMetadata();
    
    // Get world address from query parameters
    const worldAddress = this.queryParams.getWorldAddress();
    
    if (worldAddress) {
      Logging.Log('🌐 StaticSurfaceRenderer: Using world address: ' + worldAddress);
      // Create new REST client with the world address as base URL
      this.restClient = new REST(worldAddress);
    } else {
      Logging.Log('🌐 StaticSurfaceRenderer: No world address specified, using default API endpoint');
      // Keep the default REST client
    }
    
    Logging.Log('StaticSurfaceRenderer initialized');
    
    // Attempt to load entity templates if we have world metadata
    //if (this.worldMetadata && this.worldMetadata.id) {
    //  Logging.Log('🔄 StaticSurfaceRenderer: Auto-requesting entity templates during initialization');
    //  this.requestEntityTemplates();
    //}
  }

  render(_deltaTime: number): void {
    // Render static surface
  }

  /**
   * Parse world metadata from query parameters
   */
  private parseWorldMetadata(): void {
    try {
      Logging.Log('🌍 StaticSurfaceRenderer: Parsing world metadata...');
      
      // Try to get parsed world metadata first
      this.worldMetadata = this.queryParams.getWorldMetadata();
      
      if (this.worldMetadata) {
        Logging.Log('🌍 StaticSurfaceRenderer: World metadata parsed successfully:');
        Logging.Log('  - ID: ' + this.worldMetadata.id);
        Logging.Log('  - Name: ' + this.worldMetadata.name);
        Logging.Log('  - Description: ' + this.worldMetadata.description);
        Logging.Log('  - Owner: ' + this.worldMetadata.owner);
        Logging.Log('  - Permissions: ' + this.worldMetadata.permissions);
      } else {
        // If parsing failed, get the raw string for debugging
        const rawMetadata = this.queryParams.getWorldMetadataRaw();
        if (rawMetadata) {
          Logging.LogError('❌ StaticSurfaceRenderer: Failed to parse worldMetadata JSON');
          Logging.LogError('❌ StaticSurfaceRenderer: Raw worldMetadata value: ' + rawMetadata);
        } else {
          Logging.Log('🌍 StaticSurfaceRenderer: No worldMetadata parameter found');
        }
        this.worldMetadata = undefined;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ StaticSurfaceRenderer: Error parsing world metadata: ' + errorMessage);
      this.worldMetadata = undefined;
    }
  }

  /**
   * Get the parsed world metadata
   */
  getWorldMetadata(): WorldMetadata | undefined {
    return this.worldMetadata;
  }

  /**
   * Public method to trigger entity templates request
   * Useful for retrying after login completion
   */
  public loadEntityTemplates(): void {
    Logging.Log('🔄 StaticSurfaceRenderer: Manual entity templates request triggered');
    this.requestEntityTemplates();
  }

  /**
   * Public method to trigger entity instances request
   * Called after entity templates are successfully received
   */
  public loadEntityInstances(): void {
    Logging.Log('🔄 StaticSurfaceRenderer: Manual entity instances request triggered');
    this.requestEntityInstances();
  }

  /**
   * Register this renderer for post-login entity template loading
   */
  private registerForPostLoginLoading(): void {
    try {
      Logging.Log('📝 StaticSurfaceRenderer: Registering for post-login entity template loading...');
      
      // Set the global pending request variable
      (globalThis as any).pendingEntityTemplateRequest = this;
      
      Logging.Log('✓ StaticSurfaceRenderer: Registered for post-login loading');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ StaticSurfaceRenderer: Failed to register for post-login loading: ' + errorMessage);
    }
  }

  /**
   * Request entity templates from the server
   */
  requestEntityTemplates(): void {
    try {
      Logging.Log('🔍 StaticSurfaceRenderer: Requesting entity templates...');
      
      // Check authentication before making requests
      if (!this.isUserAuthenticated()) {
        Logging.Log('🔐 StaticSurfaceRenderer: User not authenticated - registering for post-login loading...');
        this.registerForPostLoginLoading();
        this.startLoginProcess();
        return;
      }

      // Use the globally defined callback function names
      const onComplete = 'onEntityTemplatesComplete';
      const onError = 'onEntityTemplatesError';

      // Verify callbacks exist
      Logging.Log('🔧 StaticSurfaceRenderer: Using callback functions: ' + onComplete + ', ' + onError);
      
      // Get world ID from parsed metadata
      if (this.worldMetadata && this.worldMetadata.id) {
        Logging.Log('🌍 StaticSurfaceRenderer: Using world ID from metadata: ' + this.worldMetadata.id);
        
        // Get authenticated user credentials
        const userId = this.getUserId();
        const userToken = this.getUserToken();
        
        Logging.Log('👤 StaticSurfaceRenderer: Using authenticated user ID: ' + userId);
        Logging.Log('🔑 StaticSurfaceRenderer: Using authenticated user token: ' + (userToken ? '[PRESENT]' : '[MISSING]'));
        
        // Make the request with world ID, user credentials, and callbacks
        this.restClient.sendGetEntityTemplatesRequest(this.worldMetadata.id, userId, userToken, onComplete);
      } else {
        Logging.LogError('❌ StaticSurfaceRenderer: No world ID available in metadata - cannot request entity templates');
        return;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ StaticSurfaceRenderer: Failed to setup entity templates request: ' + errorMessage);
    }
  }

  /**
   * Request entity instances from the server
   */
  requestEntityInstances(): void {
    try {
      Logging.Log('🔍 StaticSurfaceRenderer: Requesting entity instances...');
      
      // Check authentication before making requests
      if (!this.isUserAuthenticated()) {
        Logging.LogError('❌ StaticSurfaceRenderer: User not authenticated - cannot request entity instances');
        return;
      }

      // Use the globally defined callback function names
      const onComplete = 'onEntityInstancesComplete';
      const onError = 'onEntityInstancesError';

      // Verify callbacks exist
      Logging.Log('🔧 StaticSurfaceRenderer: Using callback functions: ' + onComplete + ', ' + onError);
      
      if (this.worldMetadata && this.worldMetadata.id) {
        Logging.Log('🌍 StaticSurfaceRenderer: Using world ID from metadata: ' + this.worldMetadata.id)

        // Get authenticated user credentials
        const userId = this.getUserId();
        const userToken = this.getUserToken();

        Logging.Log('👤 StaticSurfaceRenderer: Using authenticated user ID: ' + userId)
        Logging.Log('🔑 StaticSurfaceRenderer: Using authenticated user token: ' + (userToken ? '[PRESENT]' : '[MISSING]'));
        
        // Make the request with world ID, user credentials, and callbacks
        this.restClient.sendGetEntityInstancesRequest(this.worldMetadata.id, userId, userToken, onComplete);
      } else {
        Logging.LogError('❌ StaticSurfaceRenderer: No world ID available in metadata - cannot request entity instances')
        return
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ StaticSurfaceRenderer: Failed to setup entity instances request: ' + errorMessage);
    }
  }

  /**
   * Instantiate entities from the received instances data
   */
  public instantiateEntities(instances: EntityInstance[]): void {
    Logging.Log('🏗️ StaticSurfaceRenderer: Instantiating ' + instances.length + ' entities...');
    
    if (!Array.isArray(instances)) {
      Logging.LogError('❌ StaticSurfaceRenderer: Expected instances to be an array, got: ' + typeof instances);
      return;
    }

    instances.forEach((instance, index) => {
      try {
        Logging.Log(`🎯 StaticSurfaceRenderer: Processing entity ${index + 1}/${instances.length}: ${instance.instanceid || 'unknown'}`);
        
        // Extract entity data from instance
        const instanceId = instance.instanceid;
        const instanceTag = instance.instancetag; // May be used later for entity tagging
        const entityId = instance.entity_id;
        const variantId = instance.variant_id;
        const entityParent = instance.entity_parent; // May be used later for hierarchical entities
        
        // Parse position from separate x, y, z fields
        const position = new Vector3(
          instance.pos_x || 0,
          instance.pos_y || 0,
          instance.pos_z || 0
        );

        // Parse rotation from separate x, y, z, w fields
        const rotation = new Quaternion(
          instance.rot_x || 0,
          instance.rot_y || 0,
          instance.rot_z || 0,
          instance.rot_w || 1
        );

        // Parse scale from separate x, y, z fields
        const scale = new Vector3(
          instance.scl_x || 1,
          instance.scl_y || 1,
          instance.scl_z || 1
        );
        
        let type = 'mesh';
        let meshObject = "";
        let meshResources: string[] = [];

        const templates = Context.GetContext("MW_ENTITY_TEMPLATES");
        if (templates == null) {
          Logging.LogError('❌ StaticSurfaceRenderer: No entity templates available - cannot instantiate entities');
          return;
        }
        for (const template of templates['templates']) {
          if (template.entity_id === entityId && template.variant_id === variantId) {
            if (this.worldMetadata == null) {
              Logging.LogError("❌ StaticSurfaceRenderer: No world metadata available - cannot construct mesh URL for entity " + instanceId);
              return;
            }

            meshObject = this.queryParams.getWorldAddress() + "/get-asset/" +
              this.worldMetadata.id + "/" + JSON.parse(template["assets"]).model_path;
            meshResources = [ meshObject ];
            type = template.type;

            if (type != 'mesh') {
              Logging.Log("Unsupported entity type: " + type + " for entity " + instanceId);
              type = 'mesh';
            }
          }
        }

        Logging.Log(`📍 Entity ${instanceId}: pos(${position.x}, ${position.y}, ${position.z}), rot(${rotation.x}, ${rotation.y}, ${rotation.z}, ${rotation.w}), scale(${scale})`);
        
        // Load entity using EntityManager with correct parameters
        const loadedInstanceId = this.entityManager.MW_Entity_LoadEntity(
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
          meshResources
        );
        
        Logging.Log(`✅ StaticSurfaceRenderer: Successfully instantiated entity ${entityId} with loaded instance ID ${loadedInstanceId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logging.LogError(`❌ StaticSurfaceRenderer: Failed to instantiate entity ${index}: ${errorMessage}`);
      }
    });
    
    Logging.Log(`🎉 StaticSurfaceRenderer: Completed instantiating ${instances.length} entities`);
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
   * Check if user is authenticated
   * @returns True if user has valid authentication credentials
   */
  private isUserAuthenticated(): boolean {
    try {
      const contextUser = Context.GetContext('MW_TOP_LEVEL_CONTEXT');
      const hasValidAuth = contextUser && contextUser.userID && contextUser.token;
      
      if (hasValidAuth) {
        Logging.Log('✅ StaticSurfaceRenderer: User is authenticated');
        return true;
      } else {
        Logging.Log('❌ StaticSurfaceRenderer: User is not authenticated');
        return false;
      }
    } catch (error) {
      Logging.LogWarning('🔍 StaticSurfaceRenderer: Could not check authentication status: ' + error);
      return false;
    }
  }

  /**
   * Start the login process using the Identity module
   */
  private startLoginProcess(): void {
    try {
      Logging.Log('🔐 StaticSurfaceRenderer: Starting login process...');
      
      // Import Identity module dynamically to avoid circular dependencies
      import('./Identity').then(({ Identity }) => {
        Logging.Log('🔐 StaticSurfaceRenderer: Identity module loaded, starting login...');
        
        Identity.startUserLogin();
        Logging.Log('🔐 StaticSurfaceRenderer: Login process initiated (completion handled by global callbacks)');
        
      }).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logging.LogError('❌ StaticSurfaceRenderer: Failed to import Identity module: ' + errorMessage);
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ StaticSurfaceRenderer: Failed to start login process: ' + errorMessage);
    }
  }

  dispose(): void {
    Logging.Log('StaticSurfaceRenderer disposed');
  }
}

/**
 * Tiled surface renderer for large terrains
 */
export class TiledSurfaceRenderer extends WorldRendering {
  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    Logging.Log('TiledSurfaceRenderer initialized');
  }

  render(_deltaTime: number): void {
    // Render tiled surface
  }

  dispose(): void {
    Logging.Log('TiledSurfaceRenderer disposed');
  }
}

/**
 * Globe renderer for planetary scale
 */
export class GlobeRenderer extends WorldRendering {
  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    Logging.Log('GlobeRenderer initialized');
  }

  render(_deltaTime: number): void {
    // Render globe
  }

  dispose(): void {
    Logging.Log('GlobeRenderer disposed');
  }
}

/**
 * Atmosphere renderer
 */
export class AtmosphereRenderer extends WorldRendering {
  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    Logging.Log('AtmosphereRenderer initialized');
  }

  render(_deltaTime: number): void {
    // Render atmosphere
  }

  dispose(): void {
    Logging.Log('AtmosphereRenderer disposed');
  }
}

/**
 * Orbital renderer for space scale
 */
export class OrbitalRenderer extends WorldRendering {
  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    Logging.Log('OrbitalRenderer initialized');
  }

  render(_deltaTime: number): void {
    // Render orbital view
  }

  dispose(): void {
    Logging.Log('OrbitalRenderer disposed');
  }
}

/**
 * Stellar system renderer
 */
export class StellarSystemRenderer extends WorldRendering {
  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    Logging.Log('StellarSystemRenderer initialized');
  }

  render(_deltaTime: number): void {
    // Render stellar system
  }

  dispose(): void {
    Logging.Log('StellarSystemRenderer disposed');
  }
}

/**
 * Galactic renderer
 */
export class GalacticRenderer extends WorldRendering {
  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    Logging.Log('GalacticRenderer initialized');
  }

  render(_deltaTime: number): void {
    // Render galaxy
  }

  dispose(): void {
    Logging.Log('GalacticRenderer disposed');
  }
}

/**
 * Sun controller for lighting
 */
export class SunController extends WorldRendering {
  async initialize(config: WorldConfig): Promise<void> {
    this.config = config;
    Logging.Log('SunController initialized');
  }

  render(_deltaTime: number): void {
    // Update sun position based on time
  }

  setTimeOfDay(hours: number): void {
    Logging.Log(`Time of day set to ${hours % 24}`);
  }

  dispose(): void {
    Logging.Log('SunController disposed');
  }
}

/**
 * Factory for creating world renderers
 */
export class WorldRendererFactory {
  private renderers: WorldRendering[] = [];

  async createAndLoadRenderers(config: WorldConfig): Promise<void> {
    // Create appropriate renderers based on config
    const staticRenderer = new StaticSurfaceRenderer();
    await staticRenderer.initialize(config);
    this.renderers.push(staticRenderer);

    const sunController = new SunController();
    await sunController.initialize(config);
    this.renderers.push(sunController);

    Logging.Log('All renderers loaded');
  }

  renderFrame(deltaTime: number): void {
    this.renderers.forEach(renderer => renderer.render(deltaTime));
  }

  /**
   * Get the StaticSurfaceRenderer instance
   */
  getStaticSurfaceRenderer(): StaticSurfaceRenderer | null {
    const staticRenderer = this.renderers.find(renderer => renderer instanceof StaticSurfaceRenderer);
    return staticRenderer as StaticSurfaceRenderer || null;
  }

  dispose(): void {
    this.renderers.forEach(renderer => renderer.dispose());
    this.renderers = [];
  }
}
