/**
 * World Rendering subsystem - Supports multiple renderers for different spatial scales
 */

import { WorldConfig } from '../types/config';
import { REST } from '../api/REST';
import { ProcessQueryParams, WorldMetadata } from '../utils/ProcessQueryParams';
import { EntityManager } from './EntityManager';
import { DockButtonInfo } from './UIManager';
import { Identity } from './Identity';

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
  private identityModule: Identity;

  constructor() {
    super();
    this.queryParams = new ProcessQueryParams();
    this.identityModule = new Identity();
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

    // Define global callback for triggering entity templates loading after login
    (globalThis as any).triggerEntityTemplatesAfterLogin = () => {
      this.triggerEntityTemplatesAfterLogin();
    };
  }

  onEntityTemplatesComplete(response: string): void {
    try {
      Logging.Log('🎯 StaticSurfaceRenderer: onComplete callback invoked');
      const templates = JSON.parse(response);
      Logging.Log('📋 StaticSurfaceRenderer: Entity templates received: ' + templates);
      Logging.Log('✓ StaticSurfaceRenderer: Entity templates request completed successfully');
      Context.DefineContext('MW_ENTITY_TEMPLATES', templates);

      let dockButtons: DockButtonInfo[] = [];
      for (const template of templates['templates']) {
        dockButtons.push({
          name: template.entity_tag + "_" + template.variant_tag,
          thumbnail: template.entity_tag,
          onClick: `ENTITY_TEMPLATE.ENTITY_SELECTED('${template.entity_id}','${template.variant_id}');`
        });
        Time.SetTimeout("addEditToolbarButton('" + template.entity_tag + "_" +
          template.variant_tag + "', '" + template.entity_tag +
          "', 'ENTITY_TEMPLATE.ENTITY_SELECTED(" + template.entity_id + "," +
          template.variant_id + ");')", 3000);
      }

      // Now that templates are complete, trigger entity instances loading
      Logging.Log('🔄 Triggering entity instances request after templates completion...');
      if (typeof (globalThis as any).triggerEntityInstancesAfterTemplates === 'function') {
        (globalThis as any).triggerEntityInstancesAfterTemplates();
      } else {
        Logging.LogError('triggerEntityInstancesAfterTemplates function not available');
      }
    } catch (error) {
      Logging.LogError('❌ StaticSurfaceRenderer: Failed to parse entity templates response: ' + error);
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
      Logging.Log('🔍 WorldRendererFactory from context: '
        + (worldRendererFactoryWrapper ? 'Found' : 'Not found'));

      if (worldRendererFactoryWrapper) {
        Logging.Log('🔍 WorldRendererFactory type: ' + typeof worldRendererFactoryWrapper);
        Logging.Log('🔍 Checking for getStaticSurfaceRenderer method: '
          + (typeof worldRendererFactoryWrapper.getStaticSurfaceRenderer));

        if (worldRendererFactoryWrapper.getStaticSurfaceRenderer) {
          try {
            const staticRenderer = worldRendererFactoryWrapper.getStaticSurfaceRenderer();
            Logging.Log('🔍 StaticSurfaceRenderer retrieved: ' + (staticRenderer ? 'Found' : 'Not found'));

            if (staticRenderer) {
              Logging.Log('🔍 Checking for instantiateEntities method: '
                + (typeof staticRenderer.instantiateEntities));

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

  async initialize(): Promise<void> {
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
   * Get the state service address from world metadata
   * Used for tiled surface renderer state management
   */
  getStateService(): string | undefined {
    return this.worldMetadata?.stateService;
  }

  triggerEntityTemplatesAfterLogin(): void {
    Logging.Log('🎯 triggerEntityTemplatesAfterLogin: Called after successful authentication');
    (globalThis as any).uiManager.initializeEditToolbar();
    if ((globalThis as any).pendingEntityTemplateRequest &&
      typeof (globalThis as any).pendingEntityTemplateRequest.loadEntityTemplates === 'function') {
      Logging.Log('🔄 Executing pending entity templates request...');
      (globalThis as any).pendingEntityTemplateRequest.loadEntityTemplates();
      (globalThis as any).pendingEntityTemplateRequest = null;
    } else {
      Logging.Log('⚠️ No pending entity template request found');
    }
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

      // Verify callbacks exist
      Logging.Log('🔧 StaticSurfaceRenderer: Using callback function: ' + onComplete);

      // Get world ID from parsed metadata
      if (this.worldMetadata && this.worldMetadata.id) {
        Logging.Log('🌍 StaticSurfaceRenderer: Using world ID from metadata: ' + this.worldMetadata.id);

        // Get authenticated user credentials
        const userId = this.getUserId();
        const userToken = this.getUserToken();

        Logging.Log('👤 StaticSurfaceRenderer: Using authenticated user ID: ' + userId);
        Logging.Log('🔑 StaticSurfaceRenderer: Using authenticated user token: '
          + (userToken ? '[PRESENT]' : '[MISSING]'));

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

      // Verify callbacks exist
      Logging.Log('🔧 StaticSurfaceRenderer: Using callback function: ' + onComplete);

      if (this.worldMetadata && this.worldMetadata.id) {
        Logging.Log('🌍 StaticSurfaceRenderer: Using world ID from metadata: ' + this.worldMetadata.id)

        // Get authenticated user credentials
        const userId = this.getUserId();
        const userToken = this.getUserToken();

        Logging.Log('👤 StaticSurfaceRenderer: Using authenticated user ID: ' + userId)
        Logging.Log('🔑 StaticSurfaceRenderer: Using authenticated user token: '
          + (userToken ? '[PRESENT]' : '[MISSING]'));

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
            meshResources = [meshObject];
            type = template.type;

            if (type != 'mesh') {
              Logging.Log("Unsupported entity type: " + type + " for entity " + instanceId);
              type = 'mesh';
            }
          }
        }

        Logging.Log(`📍 Entity ${instanceId}: pos(${position.x}, ${position.y}, ${position.z}), rot(${rotation.x}, ${rotation.y}, ${rotation.z}, ${rotation.w}), scale(${scale})`);

        // Load entity using EntityManager with correct parameters
        const loadedInstanceId = this.entityManager.loadEntity(
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

      Logging.Log('🔐 StaticSurfaceRenderer: Identity module loaded, starting login...');

      this.identityModule.startUserLogin(this.triggerEntityTemplatesAfterLogin);
      Logging.Log('🔐 StaticSurfaceRenderer: Login process initiated (completion handled by global callbacks)');
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
  private restClient: REST;
  private stateServiceClient: REST;
  private queryParams: ProcessQueryParams;
  private entityManager: EntityManager;
  private worldConfig: any;
  private entitiesConfig: any;
  private terrainConfig: any;
  private biomesConfig: any;
  private worldAddress: string | undefined;
  private maintenanceFunctionID: UUID | null = null;
  private timeFunctionID: UUID | null = null;
  private startPos: Vector3 = Vector3.zero;
  private characterInitialized: boolean = false;
  private currentRegion: Vector2Int = new Vector2Int(0, 0);
  private water: WaterEntity | null = null;
  private regionLoadInProgress: boolean = false;
  private terrainTiles: { [key: string]: TerrainEntity | string } = {};
  private biomeMap: { [key: string]: any } = {};
  private characterSynchronizer: string | null = null;
  private regionSynchronizers: { [key: string]: string } = {};
  private regionSize: number = 512;
  private regionScale: number = 2;
  private numRegions: number = 256; // Number of regions along one axis
  private identityModule: Identity;
  private sun: SunController | null = null;

  constructor() {
    super();
    this.queryParams = new ProcessQueryParams();
    // Initialize with default, will be updated in initialize()
    this.restClient = new REST();
    this.stateServiceClient = new REST();
    this.entityManager = new EntityManager();
    this.identityModule = new Identity();
    this.setupGlobalCallbacks();
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

  startMaintenance(): void {
    Logging.Log('Starting TiledSurfaceRenderer maintenance interval function');
    this.maintenanceFunctionID = Time.SetInterval("tiledsurfacerenderer_maintenance();", 0.5);
    this.timeFunctionID = Time.SetInterval("tiledsurfacerenderer_timeUpdate();", 5);
  }

  stopMaintenance(): void {
    if (this.maintenanceFunctionID != null) {
      Time.StopInterval(this.maintenanceFunctionID.ToString());
      this.maintenanceFunctionID = null;
    }
    if (this.timeFunctionID != null) {
      Time.StopInterval(this.timeFunctionID.ToString());
      this.timeFunctionID = null;
    }
  }

  maintenance(): void {
    var renderedPos = Vector3.zero;
    if ((globalThis as any).playerController.internalCharacterEntity != null) {
      renderedPos = (globalThis as any).playerController.internalCharacterEntity.GetPosition(false);
      if (!this.characterInitialized) {
        Environment.SetTrackedCharacterEntity((globalThis as any).playerController.internalCharacterEntity);
        this.characterInitialized = true;
      }
    }
    var newRegion = this.getRegionIndexForWorldPos(this.getWorldPositionForRenderedPosition(renderedPos));
    if (this.currentRegion != newRegion) {
      this.currentRegion = newRegion;
    }

    this.ensureRegionsAreLoaded(this.currentRegion);
    this.unloadUnnecessaryRegions(this.currentRegion);

    this.ensureCharacterIsInCorrectSession();

    // For now, keep water near user, will want to make more sophisticated
    if (this.water != null) {
      this.water.SetPosition(new Vector3(
        renderedPos.x, 127, renderedPos.z), false);
    }
  }

  getWrappedNeighbors(centerIdx: Vector2Int, numRegions: number): Vector2Int[] {
    const neighbors: Vector2Int[] = [];

    const wrapX = (xi: number) => (xi + numRegions) % numRegions;

    const wrapY = (yi: number) => {
      if (yi >= 0 && yi < numRegions) return yi;
      const delta = Math.abs(yi - (numRegions - 1));
      return Math.max(0, Math.min(numRegions - 1, delta));
    };

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = wrapX(centerIdx.x + dx);
        const ny = wrapY(centerIdx.y + dy);
        neighbors.push(new Vector2Int(nx, ny));
      }
    }

    return neighbors;
  }

  ensureRegionsAreLoaded(centerRegionIdx: Vector2Int) {
    if (this.regionLoadInProgress == true) {
      return;
    }

    const neighbors = this.getWrappedNeighbors(centerRegionIdx, this.numRegions);
    for (const neighborIdx of neighbors) {
      if (this.terrainTiles[neighborIdx.x + "." + neighborIdx.y] == null) {
        this.loadRegion(neighborIdx);
        return;
      }
    }
  }

  unloadUnnecessaryRegions(centerRegionIdx: Vector2Int) {
    const neighbors = this.getWrappedNeighbors(centerRegionIdx, this.numRegions);

    var tileIsValid = false;
    for (const tile in this.terrainTiles) {
      tileIsValid = false;
      for (const neighborIdx of neighbors) {
        if (tile == neighborIdx.x + "." + neighborIdx.y) {
          tileIsValid = true;
        }
      }
      if (!tileIsValid) {
        if (this.terrainTiles[tile] != null) {
          if (typeof this.terrainTiles[tile] === 'string') {

          }
          else {
            this.terrainTiles[tile].Delete(false);
          }
        }
        delete this.terrainTiles[tile];
      }
    }
  }

  ensureCharacterIsInCorrectSession() {
    if ((globalThis as any).playerController.internalCharacterEntity === null) {
      return;
    }

    if (this.characterSynchronizer == null) {
      if (this.regionSynchronizers[this.currentRegion.x
        + "." + this.currentRegion.y] == null) {
        return;
      }

      if (!VOSSynchronization.IsSessionEstablished(
        this.regionSynchronizers[this.currentRegion.x
        + "." + this.currentRegion.y])) {
        return;
      }

      VOSSynchronization.StartSynchronizingEntity(
        this.regionSynchronizers[this.currentRegion.x
        + "." + this.currentRegion.y], (globalThis as any).playerController.internalCharacterEntity.id, true);
      this.characterSynchronizer
        = this.currentRegion.x + "." + this.currentRegion.y;
    }
    else if (this.characterSynchronizer
      != this.currentRegion.x + "." + this.currentRegion.y) {
      VOSSynchronization.StopSynchronizingEntity(
        this.regionSynchronizers[this.characterSynchronizer],
        (globalThis as any).playerController.internalCharacterEntity.id);

      if (!VOSSynchronization.IsSessionEstablished(
        this.regionSynchronizers[this.currentRegion.x
        + "." + this.currentRegion.y])) {
        return;
      }
      this.characterSynchronizer = null;

      VOSSynchronization.StartSynchronizingEntity(
        this.regionSynchronizers[this.currentRegion.x
        + "." + this.currentRegion.y], (globalThis as any).playerController.internalCharacterEntity.id, true);
      this.characterSynchronizer
        = this.currentRegion.x + "." + this.currentRegion.y;
    }
  }

  loadWorldManifest(): void {
    Logging.Log('TiledSurfaceRenderer: Loading world manifest...');

    // Check authentication before making requests
    if (!this.isUserAuthenticated()) {
      Logging.Log('🔐 TiledSurfaceRenderer: User not authenticated - registering for post-login loading...');
      this.registerForPostLoginLoading();
      this.startLoginProcess();
      return;
    }
  }

  loadRegion(regionIdx: Vector2Int): void {
    Logging.Log('TiledSurfaceRenderer: Loading region at index: ' + regionIdx);

    const onComplete = 'onTerrainReceived';

    this.terrainTiles[regionIdx.x + "." + regionIdx.y] = "loading";

    // Check authentication before making requests
    if (!this.isUserAuthenticated()) {
      Logging.LogError('❌ TiledSurfaceRenderer: User not authenticated - cannot load region');
      return;
    }

    const userId = this.getUserId();
    const userToken = this.getUserToken();

    this.regionLoadInProgress = true;

    this.stateServiceClient.sendGetTerrainRequest(regionIdx, userId, userToken, onComplete);
  }

  validateWorldConfig(config: WorldConfig): boolean {
    Logging.Log("Validating World Config...");
    if (config == null) {
      // Making TypeScript happy for now.
    }
    return true;
  }

  validateEntitiesConfig(config: any): boolean {
    Logging.Log("Validating Entities Config...");
    if (config == null) {
      // Making TypeScript happy for now.
    }
    return true;
  }

  validateTerrainConfig(config: any): boolean {
    Logging.Log("Validating Terrain Config...");
    if (config == null) {
      // Making TypeScript happy for now.
    }
    return true;
  }

  validateBiomesConfig(config: any): boolean {
    Logging.Log("Validating Biomes Config...");
    if (config == null) {
      // Making TypeScript happy for now.
    }
    return true;
  }

  applyEntitiesConfig(): void {
    Logging.Log("Applying Entities Config...");

    for (var entity in this.entitiesConfig) {
      if (this.entitiesConfig[entity].id == null) {
        Logging.LogError("applyEntitiesConfig: Invalid entity config: " + entity + " missing id");
      }
      else {
        WorldStorage.SetItem("METAWORLD.CONFIGURATION.ENTITYID." + this.entitiesConfig[entity].id, entity);
      }

      if (this.entitiesConfig[entity].variants == null) {
        Logging.LogError("applyEntitiesConfig: Invalid entity config: " + entity + " missing variants");
      }

      for (var variant in this.entitiesConfig[entity].variants) {
        if (this.entitiesConfig[entity].variants[variant].variant_id == null) {
          Logging.LogError("applyEntitiesConfig: Invalid entity variant: " + entity
            + ":" + variant + " missing variant_id");
        }
        else {
          WorldStorage.SetItem("METAWORLD.CONFIGURATION.VARIANTID." + this.entitiesConfig[entity].id
            + "." + this.entitiesConfig[entity].variants[variant].variant_id, variant);
        }

        if (this.entitiesConfig[entity].variants[variant].model == null) {
          Logging.LogError("applyEntitiesConfig: Invalid entity variant: " + entity
            + ":" + variant + " missing model");
        }
        else if (this.entitiesConfig[entity].variants[variant].display_name == null) {
          Logging.LogError("applyEntitiesConfig: Invalid entity variant: " + entity
            + ":" + variant + " missing display_name");
        }
        else if (this.entitiesConfig[entity].variants[variant].thumbnail == null) {
          Logging.LogError("applyEntitiesConfig: Invalid entity variant: " + entity
            + ":" + variant + " missing thumbnail");
        }
        else {
          this.entitiesConfig[entity].variants[variant].model =
            this.worldAddress + "/" + this.worldConfig["entities-directory"] + "/"
            + this.entitiesConfig[entity].variants[variant].model;
          this.entitiesConfig[entity].variants[variant].thumbnail =
            this.worldAddress + "/" + this.worldConfig["entities-directory"] + "/"
            + this.entitiesConfig[entity].variants[variant].thumbnail;
          Time.SetTimeout(`
            try {
              addTool('${this.entitiesConfig[entity].variants[variant].display_name}', '${this.entitiesConfig[entity].variants[variant].thumbnail}', 'TOOL.ADD_DOCK_BUTTON(ENTITY.${entity}.${variant}, ${this.entitiesConfig[entity].variants[variant].display_name}, ${this.entitiesConfig[entity].variants[variant].thumbnail})');
            }
            catch (error) {
              Logging.LogError('Error adding entity: ' + error);
            }
          `, 6000);
        }

        for (var valid_orientation in this.entitiesConfig[entity].variants[variant].valid_orientations) {
          var curr_orientation = this.entitiesConfig[entity].variants[variant].valid_orientations[valid_orientation];
          if (curr_orientation.model_offset == null || curr_orientation.model_offset.x == null
            || curr_orientation.model_offset.y == null || curr_orientation.model_offset.z == null) {
            Logging.LogError("applyEntitiesConfig: Invalid entity variant: "
              + entity + ":" + variant + " invalid valid_orientation model_offset.");
          }
          if (curr_orientation.model_rotation == null || curr_orientation.model_rotation.x == null
            || curr_orientation.model_rotation.y == null || curr_orientation.model_rotation.z == null
            || curr_orientation.model_rotation.w == null) {
            Logging.LogError("applyEntitiesConfig: Invalid entity variant: "
              + entity + ":" + variant + " invalid valid_orientation model_rotation.");
          }
          if (curr_orientation.placement_offset == null || curr_orientation.placement_offset.x == null
            || curr_orientation.placement_offset.y == null || curr_orientation.placement_offset.z == null) {
            Logging.LogError("applyEntitiesConfig: Invalid entity variant: "
              + entity + ":" + variant + " invalid valid_orientation placement_offset.");
          }
        }

        if (this.entitiesConfig[entity].variants[variant].model.startsWith("/") ||
          this.entitiesConfig[entity].variants[variant].model[1] == ":") {
          this.entitiesConfig[entity].variants[variant].model = "file://" +
            this.entitiesConfig[entity].variants[variant].model;
        }
      }
    }

    if (this.terrainConfig != null && this.entitiesConfig != null && this.biomesConfig != null) {
      // Connect to global synchronizer, update toolbar buttons, start loading world around user.
      this.startMaintenance();
    }
  }

  applyTerrainConfig(): void {
    Logging.Log("Applying Terrain Config...");

    if (this.terrainConfig["grid-size"] === null) {
      Logging.LogError("applyTerrainConfig: Invalid terrain config: missing grid-size");
    }

    if (this.terrainConfig.layers === null) {
      Logging.LogError("applyTerrainConfig: Invalid terrain config: missing layers");
    }
    else {
      for (var terrainLayer in this.terrainConfig.layers) {
        if (this.terrainConfig.layers[terrainLayer].layer == null) {
          Logging.LogError("applyTerrainConfig: Invalid terrain config: " + terrainLayer + " missing layer");
        }

        if (this.terrainConfig.layers[terrainLayer].color_texture == null) {
          Logging.LogError("applyTerrainConfig: Invalid terrain config: " + terrainLayer
            + " missing color_texture");
        }
        else {
          this.terrainConfig.layers[terrainLayer].color_texture = this.worldAddress + "/"
            + this.worldConfig["terrain-directory"]
            + "/" + this.terrainConfig.layers[terrainLayer].color_texture;
        }

        if (this.terrainConfig.layers[terrainLayer].color_texture.startsWith("/") ||
          this.terrainConfig.layers[terrainLayer].color_texture[1] == ":") {
          this.terrainConfig.layers[terrainLayer].color_texture = "file://"
            + this.terrainConfig.layers[terrainLayer].color_texture;
        }

        if (this.terrainConfig.layers[terrainLayer].normal_texture == null) {
          Logging.LogError("applyTerrainConfig: Invalid terrain config: " + terrainLayer
            + " missing normal_texture");
        }
        else {
          this.terrainConfig.layers[terrainLayer].normal_texture = this.worldAddress
            + "/" + this.worldConfig["terrain-directory"]
            + "/" + this.terrainConfig.layers[terrainLayer].normal_texture;
        }

        if (this.terrainConfig.layers[terrainLayer].normal_texture.startsWith("/") ||
          this.terrainConfig.layers[terrainLayer].normal_texture[1] == ":") {
          this.terrainConfig.layers[terrainLayer].normal_texture = "file://"
            + this.terrainConfig.layers[terrainLayer].normal_texture;
        }
      }
    }

    if (this.terrainConfig != null && this.entitiesConfig != null && this.biomesConfig != null) {
      // Connect to global synchronizer, update toolbar buttons, start loading world around user.
      this.startMaintenance();
    }
  }

  applyBiomesConfig(): void {
    Logging.Log("Applying Biomes Config...");

    if (this.terrainConfig != null && this.entitiesConfig != null && this.biomesConfig != null) {
      // Connect to global synchronizer, update toolbar buttons, start loading world around user.
      this.startMaintenance();
    }
  }

  onEntitiesManifestReceived(response: string): void {
    try {
      Logging.Log('🎯 TiledSurfaceRenderer: onEntitiesManifestReceived callback invoked');

      if (response != null) {
        this.entitiesConfig = JSON.parse(response);
        if (this.validateEntitiesConfig(this.entitiesConfig) != true) {
          Logging.LogError("applyEntitiesConfig: Invalid Entities Config. Aborting.");
        } else {
          this.applyEntitiesConfig();
        }
      }

      Logging.Log('✓ TiledSurfaceRenderer: Entities manifest request completed successfully');
    } catch (error) {
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to parse entities manifest response: ' + error);
    }
  }

  onTerrainManifestReceived(response: string): void {
    try {
      Logging.Log('🎯 TiledSurfaceRenderer: onTerrainManifestReceived callback invoked');
      this.terrainConfig = JSON.parse(response);
      Logging.Log('📋 TiledSurfaceRenderer: Terrain manifest received: ' + this.terrainConfig);

      if (this.validateTerrainConfig(this.terrainConfig) != true) {
        Logging.LogError("MetaWorld->GotTerrainConfig: Invalid Terrain Config. Aborting.");
      } else {
        this.applyTerrainConfig();
      }

      Logging.Log('✓ TiledSurfaceRenderer: Terrain manifest request completed successfully');
    } catch (error) {
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to parse terrain manifest response: ' + error);
    }
  }

  onBiomeManifestReceived(response: string): void {
    try {
      Logging.Log('🎯 TiledSurfaceRenderer: onBiomeManifestReceived callback invoked');
      this.biomesConfig = JSON.parse(response);
      Logging.Log('📋 TiledSurfaceRenderer: Biome manifest received: ' + this.biomesConfig);

      if (this.validateBiomesConfig(this.biomesConfig) != true) {
        Logging.LogError("MetaWorld->GotBiomeConfig: Invalid Biome Config. Aborting.");
      } else {
        this.applyBiomesConfig();
      }

      Logging.Log('✓ TiledSurfaceRenderer: Biome manifest request completed successfully');
    } catch (error) {
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to parse biome manifest response: ' + error);
    }
  }

  enableWater(water: WaterEntity): void {
    Logging.Log("Enabling Water...");
    water.SetInteractionState(InteractionState.Static);
    water.SetVisibility(true);
    this.water = water;
    (globalThis as any).playerController.setMotionModeFree();
    var adjustedPos = this.getRenderedPositionForWorldPosition(this.startPos);
    (globalThis as any).playerController.setCharacterPosition(adjustedPos);
    (globalThis as any).playerController.setMotionModePhysical();
  }

  applyWorldConfig(): void {
    Logging.Log("Applying World Config...");

    // Set up sun controller
    this.sun = new SunController(this.worldConfig["base-light-intensity"] || 0.3,
      this.worldConfig["sun-light-intensity"] || 1.0);
    
    // Initialize the sun controller
    this.sun.initialize(this.worldConfig).then(() => {
      Logging.Log("✅ Sun controller initialized successfully");
      
    // Set up sky (placeholder for future sky configuration)
    var sunEntity = this.sun?.getSunEntity();
    if (sunEntity == null) {
      Logging.LogError("❌ applyWorldConfig: Sun entity is null, cannot set sky");
      return;
    }
    Environment.SetLiteDayNightSky(sunEntity);
      
    }).catch(error => {
      Logging.LogError("❌ Failed to initialize sun controller: " + error);
    });

    WaterEntity.CreateWaterBody(null, Color.cyan, new Color(0, 66 / 255, 102 / 255, 1),
      Color.white, Color.blue, -2, 6, 32, 0.675, 1, 0.1, 0.5, 0.25, 1, 128, 1,
      new Vector3(512, 127, 512), Quaternion.identity, new Vector3(16384, 1, 16384),
      undefined, undefined, "tiledsurfacerenderer_enableWater");

    this.restClient.sendWorldEntitiesManifestRequest('onEntitiesManifestReceived');
    this.restClient.sendWorldTerrainManifestRequest('onTerrainManifestReceived');
    this.stateServiceClient.sendBiomeManifestRequest('onBiomeManifestReceived');
  }

  onWorldManifestReceived(response: string): void {
    try {
      Logging.Log('🎯 TiledSurfaceRenderer: onWorldManifestReceived callback invoked');
      const manifest = JSON.parse(response);
      Logging.Log('📋 TiledSurfaceRenderer: World manifest received: ' + manifest);

      if (response != null) {
        this.worldConfig = JSON.parse(response);
        if (this.validateWorldConfig(this.worldConfig) != true) {
          Logging.LogError("MetaWorld->GotWorldConfig: Invalid World Config. Aborting.");
        } else {
          this.applyWorldConfig();
        }
      }

      Logging.Log('✓ TiledSurfaceRenderer: World manifest request completed successfully');
    } catch (error) {
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to parse world manifest response: ' + error);
    }
  }

  onTerrainLoaded(terrain: TerrainEntity) {
    if (terrain == null) {
      Logging.LogError('❌ TiledSurfaceRenderer: onTerrainLoaded received null terrain');
      return;
    }
    Logging.Log('✓ TiledSurfaceRenderer: Terrain loaded successfully: ' + terrain);

    terrain.SetInteractionState(InteractionState.Physical);
    terrain.SetVisibility(true);

    var terrainIndex = this.getIndexForTerrainTile(terrain) as Vector2Int;
    this.biomeMap[terrainIndex.x + "." + terrainIndex.y] =
      this.getBiomeIDForTerrainTile(terrain);
    this.terrainTiles[terrainIndex.x + "." + terrainIndex.y] = terrain;

    terrain.SetPosition(this.getRenderedPositionForWorldPosition(this.getWorldPosForRegionIndex(
      new Vector2Int(terrainIndex.x, terrainIndex.y))), false);

    // Check authentication before making requests
    if (!this.isUserAuthenticated()) {
      Logging.LogError('❌ TiledSurfaceRenderer: User not authenticated - cannot load region entities');
      return;
    }

    const userId = this.getUserId();
    const userToken = this.getUserToken();

    // Set up entities.
    this.regionLoadInProgress = false;
    this.stateServiceClient.sendGetEntitiesRequest(terrainIndex, userId,
      userToken, "onEntitiesReceived");
    this.stateServiceClient.sendGetRegionInfoRequest(terrainIndex, userId,
      userToken, "onRegionInfoReceived");
    //this.terrainHasBeenLoaded = true;
  }

  onTerrainReceived(response: string): void {
    try {
      Logging.Log('🎯 TiledSurfaceRenderer: onTerrainReceived callback invoked');

      TerrainEntity.Create(response, undefined, "onTerrainLoaded");

      Logging.Log('✓ TiledSurfaceRenderer: Terrain request completed successfully');
      this.regionLoadInProgress = false;
    } catch (error) {
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to parse terrain response: ' + error);
    }
  }

  onEntitiesReceived(entityInfo: string): void {
    try {
      Logging.Log('🎯 TiledSurfaceRenderer: onEntitiesReceived callback invoked');
      const entities = JSON.parse(entityInfo);
      Logging.Log('📋 TiledSurfaceRenderer: Entities received: ' + entities);

      if (entities["region_x"] == null) {
        Logging.LogError("MW_Rend_OnEntitiesReceived: Unable to get region X index.");
        return;
      }

      if (entities["region_y"] == null) {
        Logging.LogError("MW_Rend_OnEntitiesReceived: Unable to get region Y index.");
        return;
      }

      var terrainTile = this.terrainTiles[entities["region_x"] + "." + entities["region_y"]];
      if (terrainTile == null) {
        Logging.LogError("MW_Rend_OnEntitiesReceived: Unable to get terrain tile.");
        return;
      }

      var entityColl = entities["mesh-entities"];
      for (var entity in entityColl) {
        var entityName = WorldStorage.GetItem("METAWORLD.CONFIGURATION.ENTITYID." +
          entityColl[entity].entityid) as string;
        var variantName = WorldStorage.GetItem("METAWORLD.CONFIGURATION.VARIANTID."
          + entityColl[entity].entityid + "." + entityColl[entity].variantid) as string;
        var entityPos =
          new Vector3(entityColl[entity].xposition, entityColl[entity].yposition,
            entityColl[entity].zposition);
        var entityType = this.entitiesConfig[entityName].variants[variantName].type;
        if (entityType == null || entityType == "") {
          entityType = "mesh";
        }
        this.entityManager.loadEntity(entityColl[entity].instanceid, undefined, entityColl[entity].entityid,
          entityColl[entity].variantid, undefined, entityType, entityPos,
          new Quaternion(entityColl[entity].xrotation, entityColl[entity].yrotation,
            entityColl[entity].zrotation, entityColl[entity].wrotation), Vector3.one,
          this.entitiesConfig[entityName].variants[variantName].model,
          [this.entitiesConfig[entityName].variants[variantName].model],
          this.entitiesConfig[entityName].variants[variantName].wheels,
          this.entitiesConfig[entityName].variants[variantName].mass,
          AutomobileType.Car,
          this.entitiesConfig[entityName].variants[variantName].scripts);
      }
      //this.worldLoaded = true;

      Logging.Log('✓ TiledSurfaceRenderer: Entities request completed successfully');
    } catch (error) {
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to parse entities response: ' + error);
    }
  }

  onRegionInfoReceived(regionInfo: string): void {
    try {
      Logging.Log('🎯 TiledSurfaceRenderer: onRegionInfoReceived callback invoked');
      const region = JSON.parse(regionInfo);
      Logging.Log('📋 TiledSurfaceRenderer: Region info received: ' + region);

      if (region == null) {
        Logging.LogError("MW_Rend_OnRegionInfoReceived: Unable to get region info.");
        return;
      }

      if (region["synchronizer_id"] == null || region["synchronizer_id"] == "") {
        Logging.LogError("MW_Rend_OnRegionInfoReceived: Unable to get synchronizer id.");
        return;
      }

      if (region["synchronizer_tag"] == null || region["synchronizer_tag"] == "") {
        Logging.LogError("MW_Rend_OnRegionInfoReceived: Unable to get synchronizer tag.");
        return;
      }

      // Get authenticated user credentials
        const userId = this.getUserId();
        const userToken = this.getUserToken();

      VOSSynchronization.JoinSession(this.worldConfig["vos-synchronization-service"]["host"],
        this.worldConfig["vos-synchronization-service"]["port"],
        this.worldConfig["vos-synchronization-service"].tls,
        region["synchronizer_id"], region["synchronizer_tag"], Environment.GetWorldOffset(), undefined,
        this.worldConfig["vos-synchronization-service"].transport == "tcp" ?
          VSSTransport.TCP : VSSTransport.WebSocket, userId, userToken);
      this.regionSynchronizers[region["region_x"] + "." + region["region_y"]]
        = region["synchronizer_id"];

      Logging.Log('✓ TiledSurfaceRenderer: Region info request completed successfully');

    } catch (error) {
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to parse region info response: ' + error);
    }
  }

  getIndexForTerrainTile(terrainTile: TerrainEntity): Vector2Int | undefined {
    var terrainTileTag = terrainTile.tag;
    var terrainIndexStart = terrainTileTag.indexOf("-");
    if (terrainIndexStart == -1) {
      Logging.LogError("getIndexForTerrainTile: Unable to get index of terrain tile.");
      return;
    }

    var terrainIndexParts = terrainTileTag.substring(terrainIndexStart + 1).split(".");
    if (terrainIndexParts.length != 3) {
      Logging.LogError("getIndexForTerrainTile: Invalid terrain tile index.");
      return;
    }

    return new Vector2Int(parseInt(terrainIndexParts[0]), parseInt(terrainIndexParts[1]));
  }

  getBiomeIDForTerrainTile(terrainTile: TerrainEntity): number | undefined {
    var terrainTileTag = terrainTile.tag;
    var terrainIndexStart = terrainTileTag.indexOf("-");
    if (terrainIndexStart == -1) {
      Logging.LogError("getBiomeIDForTerrainTile: Unable to get index of terrain tile.");
      return;
    }

    var terrainIndexParts = terrainTileTag.substring(terrainIndexStart + 1).split(".");
    if (terrainIndexParts.length != 3) {
      Logging.LogError("getBiomeIDForTerrainTile: Invalid terrain tile index.");
      return;
    }

    return parseInt(terrainIndexParts[2]);
  }

  getWorldPosForRegionPos(regionPos: Vector3, regionIdx: Vector2Int): Vector3 {
    var regionSize_meters = this.regionSize * this.regionScale;
    return new Vector3(regionIdx.x * regionSize_meters + regionPos.x, regionPos.y,
      regionIdx.y * regionSize_meters + regionPos.z);
  }

  getRegionPosForWorldPos(worldPos: Vector3, regionIdx: Vector2Int): Vector3 {
    var regionSize_meters = this.regionSize * this.regionScale;
    return new Vector3(worldPos.z - regionIdx.y * regionSize_meters, worldPos.y,
      worldPos.x - regionIdx.x * regionSize_meters);
  }

  getRegionIndexForWorldPos(worldPos: Vector3): Vector2Int {
    var regionSize_meters = this.regionSize * this.regionScale;
    return new Vector2Int(Math.floor(worldPos.x / regionSize_meters),
      Math.floor(worldPos.z / regionSize_meters));
  }

  getWorldPosForRegionIndex(regionIdx: Vector2Int): Vector3 {
    var regionSize_meters = this.regionSize * this.regionScale;
    return new Vector3(regionIdx.x * regionSize_meters, 0, regionIdx.y * regionSize_meters);
  }

  getWorldPositionForRenderedPosition(renderedPos: Vector3): Vector3 {
    return new Vector3(renderedPos.z, renderedPos.y, renderedPos.x);
  }

  getRenderedPositionForWorldPosition(worldPos: Vector3): Vector3 {
    return new Vector3(worldPos.z, worldPos.y, worldPos.x);
  }

  getTerrainTileForIndex(index: Vector2Int): TerrainEntity {
    return Entity.GetByTag("TerrainTile-" + index.x + "." + index.y) as TerrainEntity;
  }

  getTerrainTileIndexForEntity(entity: TerrainEntity): Vector2Int | undefined {
    var parentTerrain = entity.GetParent();
    if (parentTerrain == null) {
      Logging.Log("getTerrainTileIndexForEntity: Unable to get parent terrain.");
      return undefined;
    }

    if (!(parentTerrain instanceof TerrainEntity)) {
      Logging.Log("getTerrainTileIndexForEntity: Parent entity not terrain.");
      return undefined;
    }

    return this.getIndexForTerrainTile(parentTerrain);
  }

  getMaterialForDigging(regionIdx: Vector2Int, height: number) {
    var biomeID = this.biomeMap[regionIdx.x + "." + regionIdx.y];
    if (biomeID == null) {
      Logging.LogError("getMaterialForDigging: Unable to get biome ID.");
      return;
    }

    var terrainLayers = this.biomesConfig[biomeID]["terrain-layers"];

    var diggingLayer = 0;
    for (var i = 0; i < Object.keys(terrainLayers).length; i++) {
      var terrainLayer = terrainLayers[Object.keys(terrainLayers)[i]];
      if (terrainLayer["max-height"] <= height) {
        diggingLayer = Object.keys(terrainLayers)[i] as unknown as number;
      }
    }

    var randomizer = Math.random();
    if (randomizer < 0.125) {
      if (diggingLayer - 1 < 0) {
        return diggingLayer;
      }
      else {
        return diggingLayer - 1;
      }
    }
    else if (randomizer < 0.875) {
      return diggingLayer;
    }
    else {
      if (diggingLayer + 1 >= Object.keys(terrainLayers).length) {
        return diggingLayer;
      }
      else {
        return diggingLayer + 1;
      }
    }
  }

  /**
   * Setup global callback functions for WebVerse entity loading
   */
  private setupGlobalCallbacks(): void {
    // Define global function for loading world manifest
    (globalThis as any).loadWorldManifest = () => {
      this.loadWorldManifest();
    };

    // Define global callback for world manifest completion
    (globalThis as any).onWorldManifestReceived = (response: string) => {
      this.onWorldManifestReceived(response);
    }

    // Define global callback for terrain manifest completion
    (globalThis as any).onEntitiesManifestReceived = (response: string) => {
      this.onEntitiesManifestReceived(response);
    };

    // Define global callback for terrain manifest completion
    (globalThis as any).onTerrainManifestReceived = (response: string) => {
      this.onTerrainManifestReceived(response);
    };

    // Define global callback for biome manifest completion
    (globalThis as any).onBiomeManifestReceived = (response: string) => {
      this.onBiomeManifestReceived(response);
    };

    // Define global function for enabling water
    (globalThis as any).tiledsurfacerenderer_enableWater = (water: WaterEntity) => {
      this.enableWater(water);
    };

    // Define global function for tiled surface renderer maintenance
    (globalThis as any).tiledsurfacerenderer_maintenance = () => {
      this.maintenance();
    };

    // Define global callback for terrain loading completion
    (globalThis as any).onTerrainReceived = (response: string) => {
      this.onTerrainReceived(response);
    };

    // Define global callback for entities loading completion
    (globalThis as any).onEntitiesReceived = (response: string) => {
      this.onEntitiesReceived(response);
    };

    // Define global callback for region info loading completion
    (globalThis as any).onRegionInfoReceived = (response: string) => {
      this.onRegionInfoReceived(response);
    };

    (globalThis as any).onTerrainLoaded = (terrain: TerrainEntity) => {
      this.onTerrainLoaded(terrain);
    };

    (globalThis as any).tiledsurfacerenderer_timeUpdate = () => {
      this.timeUpdate();
    }

    (globalThis as any).tiledsurfacerenderer_updateTimeOfDay = (timeInfo: string) => {
      this.updateTimeOfDay(timeInfo);
    };

    (globalThis as any).tiledsurfacerenderer_getTerrainTileForIndex = (index: Vector2Int) => {
      return this.getTerrainTileForIndex(index);
    };

    (globalThis as any).tiledsurfacerenderer_getTerrainTileIndexForEntity = (entity: TerrainEntity) => {
      return this.getTerrainTileIndexForEntity(entity);
    };

    (globalThis as any).tiledsurfacerenderer_getIndexForTerrainTile = (terrainTile: TerrainEntity) => {
      return this.getIndexForTerrainTile(terrainTile);
    };

    (globalThis as any).tiledsurfacerenderer_getMaterialForDigging = (regionIdx: Vector2Int, height: number) => {
      return this.getMaterialForDigging(regionIdx, height);
    };
  }

  async initialize(): Promise<void> {
    // Parse query parameters to ensure they're available
    this.queryParams.parse();

    // Get start position from query parameters
    this.startPos = this.queryParams.getUserPosition();

    // Get world address from query parameters
    this.worldAddress = this.queryParams.getWorldAddress();

    // Get state service address from world metadata if available
    let stateServiceAddress: string | undefined;
    if (this.queryParams.getWorldMetadata() != null) {
      stateServiceAddress = this.queryParams.getWorldMetadata()?.stateService;
    }

    if (this.worldAddress) {
      Logging.Log('🌐 TiledSurfaceRenderer: Using world address: ' + this.worldAddress +
        ' and state service address: ' + stateServiceAddress);
      // Create new REST client with the world address as base URL
      this.restClient = new REST(this.worldAddress);
      this.stateServiceClient = new REST(stateServiceAddress);
    } else {
      Logging.Log('🌐 TiledSurfaceRenderer: No world address specified, using default API endpoint');
      // Keep the default REST client
    }

    Logging.Log('TiledSurfaceRenderer initialized');
  }

  render(_deltaTime: number): void {
    // Render tiled surface
  }

  /**
   * Start the login process using the Identity module
   */
  private startLoginProcess(): void {
    try {
      Logging.Log('🔐 TiledSurfaceRenderer: Starting login process...');

      Logging.Log('🔐 TiledSurfaceRenderer: Identity module loaded, starting login...');

      this.identityModule.startUserLogin(() => {
        this.restClient.sendWorldManifestRequest('onWorldManifestReceived');
      });
      Logging.Log('🔐 TiledSurfaceRenderer: Login process initiated (completion handled by global callbacks)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to start login process: ' + errorMessage);
    }
  }

  /**
   * Register this renderer for post-login entity template loading
   */
  private registerForPostLoginLoading(): void {
    try {
      Logging.Log('📝 TiledSurfaceRenderer: Registering for post-login entity template loading...');

      // Set the global pending request variable
      (globalThis as any).pendingEntityTemplateRequest = this;

      Logging.Log('✓ TiledSurfaceRenderer: Registered for post-login loading');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ TiledSurfaceRenderer: Failed to register for post-login loading: ' + errorMessage);
    }
  }

  /**
   * Get the sun controller instance
   */
  getSunController(): SunController | null {
    return this.sun;
  }

  timeUpdate(): void {
    this.stateServiceClient.sendTimeRequest('tiledsurfacerenderer_updateTimeOfDay');
  }

  /**
   * Update time of day
   * @param timeOfDaySecs Time of day in seconds
   */
  updateTimeOfDay(timeInfo: string): void {
    if (this.sun) {
      var time = JSON.parse(timeInfo);
      
      if (time.day === null || time.seconds === null) {
          Logging.LogError("MW_Rend_OnTimeReceived: Invalid time received.");
          return;
      }
      
      this.sun.updateTimeOfDay(time.seconds);
    } else {
      Logging.LogWarning('TiledSurfaceRenderer: Sun controller not available for time update');
    }
  }

  dispose(): void {
    this.stopMaintenance();
    
    if (this.sun) {
      this.sun.dispose();
      this.sun = null;
    }
    
    Logging.Log('TiledSurfaceRenderer disposed');
  }
}

/**
 * Globe renderer for planetary scale
 */
export class GlobeRenderer extends WorldRendering {
  async initialize(): Promise<void> {
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
  async initialize(): Promise<void> {
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
  async initialize(): Promise<void> {
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
  async initialize(): Promise<void> {
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
  async initialize(): Promise<void> {
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
 * Sun controller for lighting and time of day management
 */
export class SunController extends WorldRendering {
  private baseLightIntensity: number;
  private sunLightIntensity: number;
  private baseLightEntity: LightEntity | null = null;
  private sunEntity: LightEntity | null = null;
  private worldConfig: any;

  constructor(baseLightIntensity: number = 0.3, sunLightIntensity: number = 1.0) {
    super();
    this.baseLightIntensity = baseLightIntensity;
    this.sunLightIntensity = sunLightIntensity;
    this.setupGlobalCallbacks();
  }

  /**
   * Setup global callback functions for WebVerse light entity creation
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for base light entity creation
    (globalThis as any).MW_Rend_Sun_OnBaseLightEntityCreated = (entity: LightEntity) => {
      this.onBaseLightEntityCreated(entity);
    };

    // Define global callback for sun light entity creation
    (globalThis as any).MW_Rend_Sun_OnSunLightEntityCreated = (entity: LightEntity) => {
      this.onSunLightEntityCreated(entity);
    };

    // Define global function for updating sun time of day
    (globalThis as any).MW_Rend_Sun_UpdateSunTimeOfDay = (timeOfDaySecs: number) => {
      this.updateTimeOfDay(timeOfDaySecs);
    };
  }

  async initialize(worldConfig: any): Promise<void> {
    Logging.Log('SunController initializing...');

    this.worldConfig = worldConfig;
    
    // Create sun directional light
    LightEntity.Create(null, Vector3.zero, Quaternion.identity, undefined, "Sun",
      "MW_Rend_Sun_OnSunLightEntityCreated");
    
    Logging.Log('SunController initialized');
  }

  /**
   * Callback for base light entity creation
   */
  private onBaseLightEntityCreated(entity: LightEntity): void {
    try {
      Logging.Log('🌟 SunController: Base light entity created');
      
      entity.SetVisibility(true);
      entity.SetInteractionState(InteractionState.Static);
      entity.SetLightType(LightType.Directional);
      entity.SetLightProperties(Color.white, 1000, this.baseLightIntensity);
      
      this.baseLightEntity = entity;
      
      Logging.Log('✅ SunController: Base light entity configured successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ SunController: Failed to configure base light entity: ' + errorMessage);
    }
  }

  /**
   * Callback for sun light entity creation
   */
  private onSunLightEntityCreated(entity: LightEntity): void {
    try {
      Logging.Log('☀️ SunController: Sun light entity created');
      
      entity.SetVisibility(true);
      entity.SetInteractionState(InteractionState.Static);
      entity.SetLightType(LightType.Directional);
      entity.SetLightProperties(Color.white, 1000, this.sunLightIntensity);
      
      this.sunEntity = entity;
      
      Logging.Log('✅ SunController: Sun light entity configured successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ SunController: Failed to configure sun light entity: ' + errorMessage);
    }
  }

  /**
   * Update the time of day by rotating the sun
   * @param timeOfDaySecs Time of day in seconds
   */
  updateTimeOfDay(timeOfDaySecs: number): void {
    try {
      const dayLength = this.worldConfig['day-length'];
      if (!dayLength) {
        Logging.LogError('❌ SunController: Day length not configured');
        return;
      }

      if (timeOfDaySecs < 0 || timeOfDaySecs > dayLength) {
        Logging.LogError('❌ SunController: Invalid timeOfDaySecs: ' + timeOfDaySecs
          + ' (must be between 0 and ' + dayLength + ')');
        return;
      }

      if (!this.sunEntity) {
        Logging.LogError('❌ SunController: Sun entity not set');
        return;
      }

      // Calculate sun rotation: 360 degrees over day length, starting at -90 (sunrise in east)
      const rotationDegrees = (360 * (timeOfDaySecs / dayLength)) - 90;
      const sunRotation = new Vector3(rotationDegrees, 0, 0);
      
      this.sunEntity.SetEulerRotation(sunRotation, false);
      
      Logging.Log('☀️ SunController: Updated sun rotation to ' + rotationDegrees
        + ' degrees (time: ' + timeOfDaySecs + 's)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ SunController: Failed to update time of day: ' + errorMessage);
    }
  }

  render(_deltaTime: number): void {
    // Sun controller doesn't need continuous rendering
    // Time updates are handled through explicit updateTimeOfDay calls
  }

  /**
   * Set time of day using hours (0-24)
   * @param hours Time of day in hours (0-24)
   */
  setTimeOfDay(hours: number): void {
    if (!this.worldConfig || !this.worldConfig['day-length']) {
      Logging.LogError('❌ SunController: Day length not configured, cannot set time of day');
      return;
    }

    // Convert hours to seconds
    const normalizedHours = hours % 24;
    const dayLength = this.worldConfig['day-length'];
    const timeOfDaySecs = (normalizedHours / 24) * dayLength;
    
    Logging.Log(`🕐 SunController: Setting time of day to ${normalizedHours} hours (${timeOfDaySecs} seconds)`);
    this.updateTimeOfDay(timeOfDaySecs);
  }

  /**
   * Get current sun entity
   */
  getSunEntity(): LightEntity | null {
    return this.sunEntity;
  }

  /**
   * Get current base light entity
   */
  getBaseLightEntity(): LightEntity | null {
    return this.baseLightEntity;
  }

  /**
   * Update light intensities
   */
  updateLightIntensities(baseLightIntensity?: number, sunLightIntensity?: number): void {
    if (baseLightIntensity !== undefined) {
      this.baseLightIntensity = baseLightIntensity;
      if (this.baseLightEntity) {
        this.baseLightEntity.SetLightProperties(Color.white, 1000, this.baseLightIntensity);
      }
    }

    if (sunLightIntensity !== undefined) {
      this.sunLightIntensity = sunLightIntensity;
      if (this.sunEntity) {
        this.sunEntity.SetLightProperties(Color.white, 1000, this.sunLightIntensity);
      }
    }

    Logging.Log('🌟 SunController: Updated light intensities - Base: ' + this.baseLightIntensity
      + ', Sun: ' + this.sunLightIntensity);
  }

  dispose(): void {
    if (this.baseLightEntity) {
      this.baseLightEntity.Delete(false);
      this.baseLightEntity = null;
    }
    
    if (this.sunEntity) {
      this.sunEntity.Delete(false);
      this.sunEntity = null;
    }
    
    Logging.Log('SunController disposed');
  }
}

/**
 * Factory for creating world renderers
 */
export class WorldRendererFactory {
  private renderers: WorldRendering[] = [];

  async createAndLoadRenderers(): Promise<void> {
    // Create appropriate renderers based on config
    const staticRenderer = new StaticSurfaceRenderer();
    await staticRenderer.initialize();
    this.renderers.push(staticRenderer);

    const sunController = new SunController();
    await sunController.initialize(null);
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