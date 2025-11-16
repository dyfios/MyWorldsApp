/**
 * MyWorld Client Entry Point
 * Orchestrates the client startup sequence
 */

import { ClientContext } from './modules/ClientContext';
import { ProcessQueryParams } from './utils/ProcessQueryParams';
import { StaticSurfaceRenderer, TiledSurfaceRenderer } from './modules/WorldRendererFactory';
import { UIManager } from './modules/UIManager';

export class MyWorld {
  private context: ClientContext;
  private queryParams: ProcessQueryParams;
  private renderIntervalId: any = null;

  constructor() {
    try {
      Logging.Log('🚀 Step 0b1: Creating ClientContext...');
      this.context = new ClientContext();
      Logging.Log('🚀 Step 0b2: Creating ProcessQueryParams...');
      this.queryParams = new ProcessQueryParams();
      Logging.Log('🚀 Step 0b3: MyWorld constructor completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Error in MyWorld constructor: ' + errorMessage);
      throw error;
    }
  }

  /**
   * Launch the MyWorld client
   */
  async launch(): Promise<void> {
    try {
      Logging.Log('🌐 Launching MyWorld Client...');

      // 1. Parse query parameters
      Logging.Log('📊 Step 1: Starting query parameter parsing...');
      const params = this.queryParams.parse();
      Logging.Log('✓ Query parameters processed successfully');

      // 2. Trigger login via Identity module (non-blocking)
      Logging.Log('🔐 Step 2: Starting user login process (async)...');

      // 3. Initialize all core modules into ClientContext
      Logging.Log('⚙️ Step 3: Initializing core modules...');
      await this.context.initializeModules();
      Logging.Log('✓ Modules initialized successfully');

      // 4. Load world configuration
      Logging.Log('🌍 Step 4: Loading world configuration...');
      const worldUri = params.worldUri as string | undefined;
      Logging.Log('🌍 Step 4a: World URI = ' + (worldUri || 'default'));
      //const worldConfig = await this.context.modules.config.loadWorldConfig(worldUri);
      Logging.Log('✓ World configuration loaded successfully');

      // 5. Connect to synchronization sessions
      Logging.Log('🔄 Step 5: Connecting to synchronizers...');
      await this.context.modules.sync.connectToSynchronizers();
      Logging.Log('✓ Connected to synchronizers successfully');

      // 6. Instantiate and load world renderers
      Logging.Log('🎨 Step 6: Creating and loading world renderers...');
      await this.context.modules.worldRendering.createAndLoadRenderers();
      // Ensure WorldRendererFactory is available in context after renderers are loaded
      Logging.Log('🔍 Storing WorldRendererFactory in context. Type: ' + typeof this.context.modules.worldRendering);
      Logging.Log('🔍 Available methods: ' + Object.getOwnPropertyNames(Object.getPrototypeOf(this.context.modules.worldRendering)));
      
      // Store a wrapper object to preserve method bindings
      const worldRendererFactoryWrapper = {
        factory: this.context.modules.worldRendering,
        getStaticSurfaceRenderer: () => this.context.modules.worldRendering.getStaticSurfaceRenderer()
      };
      Context.DefineContext('WorldRendererFactory', worldRendererFactoryWrapper);
      Logging.Log('✓ World renderers loaded successfully');

      // 7. Activate UI editing tools
      Logging.Log('🖼️ Step 7: Activating UI editing tools...');
      this.context.modules.ui.initializeEditToolbar();
      Logging.Log('✓ UI editing tools activated successfully');

      Logging.Log('🎉 MyWorld Client launched successfully!');

      // Start render loop
      Logging.Log('🔄 Starting render loop...');
      await this.startRenderLoop();
      Logging.Log('✓ Render loop started successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? error.stack || error.message : String(error);
      Logging.LogError('❌ Failed to launch MyWorld Client: ' + errorMessage);
      Logging.LogError('❌ Full error details: ' + errorDetails);
      throw error;
    }
  }

  /**
   * Initialize world-type specific settings and configurations
   */
  private async initializeWorldTypeSettings(): Promise<void> {
    const worldType = this.queryParams.get('worldType') as string;
    Logging.Log('🌍 Checking world type for initialization...');
    
    switch (worldType) {
      case 'mini-world':
        Logging.Log('🏠 World Type: mini-world - Initializing for small-scale world rendering');
        await this.setupStaticSurfaceRenderer();
        // Initialize UI Settings for mini-world
        this.initializeUISettingsForWorldType('mini-world');
        break;
      case 'planet':
        Logging.Log('🌍 World Type: planet - Initializing for planetary-scale world rendering');
        await this.setupPlanetRenderer();
        // Initialize UI Settings for planet
        this.initializeUISettingsForWorldType('planet');
        break;
      case 'galaxy':
        Logging.Log('🌌 World Type: galaxy - Initializing for galactic-scale world rendering');
        // TODO: Add galaxy specific initialization here
        break;
      default:
        if (worldType) {
          throw new Error('❓ World Type: ' + worldType + ' - Unknown world type');
        } else {
          throw new Error('🌐 World Type: not specified');
        }
    }
  }

  /**
   * Initialize UI Settings for supported world types
   */
  private initializeUISettingsForWorldType(worldType: string): void {
    try {
      Logging.Log('🎛️ Initializing UI Settings for world type: ' + worldType);
      
      // Call the UIManager static method to initialize UI Settings in the ui/ space
      Logging.Log('🎛️ Calling UIManager.initializeUISettingsForWorldType...');
      UIManager.initializeUISettingsForWorldType(worldType);
      
      // Initialize default tools for this world type
      this.initializeDefaultTools(worldType);
      
      // Also call the global UI Settings initialization function if available (fallback)
      if (typeof (globalThis as any).initializeUISettings === 'function') {
        const success = (globalThis as any).initializeUISettings(worldType);
        if (success) {
          Logging.Log('✅ UI Settings initialized successfully for world type: ' + worldType);
        } else {
          Logging.Log('ℹ️ UI Settings not initialized (world type not supported): ' + worldType);
        }
      } else {
        Logging.Log('⚠️ UI Settings initialization function not available yet');
        // Retry after a short delay in case the UI hasn't loaded yet
        Time.SetTimeout(`
          if (typeof initializeUISettings === 'function') {
            initializeUISettings('${worldType}');
          }
        `, 1000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Error initializing UI Settings: ' + errorMessage);
    }
  }

  /**
   * Initialize default tools for supported world types
   */
  private initializeDefaultTools(worldType: string): void {
    try {
      Logging.Log('🔧 Initializing default tools for world type: ' + worldType);
      
      // Add a delay to ensure UI is loaded before adding tools
      Time.SetTimeout(`
        try {
          // Add default tools based on world type
          if ('${worldType}' === 'mini-world') {
            // Mini-world tools
            addTool('Hand', '🔨', 'TOOL.ADD_DOCK_BUTTON(HAND, \'Hand\', \'🔨\')');
            Logging.Log('Mini-world tools added successfully');
          } else if ('${worldType}' === 'planet') {
            // Planet tools
            addTool('Hand', '🏔️', 'TOOL.ADD_DOCK_BUTTON(HAND, \'Hand\', \'🏔️\')');
            addTool('Square Shovel', '🌊', 'TOOL.ADD_DOCK_BUTTON(SQUARE_SHOVEL_1, \'Square Shovel\', \'🌊\')');
            addTool('Square Shovel (2x)', '🌲', 'TOOL.ADD_DOCK_BUTTON(SQUARE_SHOVEL_2, \'Square Shovel (2x)\', \'🌲\')');
            addTool('Square Shovel (4x)', '🏙️', 'TOOL.ADD_DOCK_BUTTON(SQUARE_SHOVEL_4, \'Square Shovel (4x)\', \'🏙️\')');
            addTool('Square Shovel (8x)', '⛈️', 'TOOL.ADD_DOCK_BUTTON(SQUARE_SHOVEL_8, \'Square Shovel (8x)\', \'⛈️\')');
            addTool('Sledge Hammer', '⛏️', 'TOOL.ADD_DOCK_BUTTON(SLEDGE_HAMMER, \'Sledge Hammer\', \'⛏️\')');
            Logging.Log('Planet tools added successfully');
          }
        } catch (error) {
          Logging.LogError('Error adding default tools: ' + error);
        }
      `, 6000);
      
      Logging.Log('✅ Default tools initialization scheduled for world type: ' + worldType);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Error initializing default tools: ' + errorMessage);
    }
  }

  /**
   * Set up planet renderer for planet world type
   */
  private async setupPlanetRenderer(): Promise<void> {
    try {
      Logging.Log('🏗️ Setting up planet renderer for planet world type...');

      // Use the imported TiledSurfaceRenderer

      Logging.Log('🏗️ Step 1: Creating TiledSurfaceRenderer instance...');
      const tiledRenderer = new TiledSurfaceRenderer();

      Logging.Log('🏗️ Step 2: Initializing tiled surface renderer...');
      await tiledRenderer.initialize();

      Logging.Log('🏗️ Step 3: Loading world manifest...');
      tiledRenderer.loadWorldManifest();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Failed to setup planet renderer: ' + errorMessage);
      throw error;
    }
  }

  /**
   * Set up static surface renderer for mini-world type
   */
  private async setupStaticSurfaceRenderer(): Promise<void> {
    try {
      Logging.Log('🏗️ Setting up static surface renderer for mini-world...');
      
      // Use the imported StaticSurfaceRenderer
      
      // Create and initialize the static surface renderer
      Logging.Log('🏗️ Step 1: Creating StaticSurfaceRenderer instance...');
      const staticRenderer = new StaticSurfaceRenderer();

      Logging.Log('🏗️ Step 2: Initializing static surface renderer...');
      await staticRenderer.initialize();
      
      // Request entity templates
      Logging.Log('🏗️ Step 3: Requesting entity templates...');
      staticRenderer.requestEntityTemplates();
      
      // Register for entity instances trigger after templates complete
      Logging.Log('🏗️ Step 3a: Registering for entity instances trigger...');
      this.registerForEntityInstancesTrigger(staticRenderer);
      
      // The renderer is now initialized and ready to use
      Logging.Log('🏗️ Step 4: Static surface renderer ready for use');
      Logging.Log('🏗️ Note: Renderer will be used by WorldRendererFactory.renderFrame()');
      
      Logging.Log('✓ Static surface renderer setup completed for mini-world');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Failed to setup static surface renderer: ' + errorMessage);
      throw error;
    }
  }

  /**
   * Register for entity instances trigger after entity templates complete
   */
  private registerForEntityInstancesTrigger(staticRenderer: StaticSurfaceRenderer): void {
    try {
      Logging.Log('� Registering for entity instances trigger after templates completion...');
      
      // Set the global pending request that will be triggered after templates complete
      (globalThis as any).pendingEntityInstanceRequest = staticRenderer;
      
      Logging.Log('✅ Registered for entity instances trigger');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Error registering for entity instances trigger: ' + errorMessage);
    }
  }

  /**
   * Start the render loop
   */
  private async startRenderLoop(): Promise<void> {
    // Initialize world type specific settings
    await this.initializeWorldTypeSettings();
    
    // Set up global render function for WebVerse Time API
    const renderFunctionName = 'myWorldRenderLoop';
    
    // Store reference to this instance for the global function
    (globalThis as any).myWorldInstance = this;
    
    // Create global render function
    (globalThis as any)[renderFunctionName] = () => {
      try {
        const deltaTime = 1/60; // Fixed 60 FPS (0.0167 seconds per frame)
        
        // Update modules
        this.context.modules.script.update(deltaTime);

        // Render frame
        this.context.modules.worldRendering.renderFrame(deltaTime);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logging.LogError('❌ Error in render loop: ' + errorMessage);
      }
    };

    // Start the interval - 60 FPS = 1/60 seconds = ~0.0167 seconds
    const intervalSeconds = 1/60;
    Logging.Log('🔄 Setting up render loop with interval: ' + intervalSeconds + ' seconds');
    
    this.renderIntervalId = Time.SetInterval(renderFunctionName, intervalSeconds);
    
    if (this.renderIntervalId) {
      Logging.Log('✓ Render loop started with ID: ' + this.renderIntervalId);
    } else {
      Logging.LogError('❌ Failed to start render loop');
    }
  }

  /**
   * Dispose of the client
   */
  dispose(): void {
    // Stop the render loop
    if (this.renderIntervalId) {
      Logging.Log('🔄 Stopping render loop...');
      Time.StopInterval(this.renderIntervalId.ToString());
      this.renderIntervalId = null;
    }
    
    // Clean up global references
    try {
      delete (globalThis as any).myWorldInstance;
      delete (globalThis as any).myWorldRenderLoop;
    } catch (error) {
      // Ignore cleanup errors
    }
    
    this.context.dispose();
  }
}

    try {
      Logging.Log('🚀 Starting MyWorld application...');
      Logging.Log('🚀 Step 0a: Creating MyWorld instance...');
      const myworld = new MyWorld();
      Logging.Log('🚀 Step 0b: MyWorld instance created successfully');
      
      Logging.Log('🚀 Step 0c: Starting launch process...');
      myworld.launch().catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorDetails = error instanceof Error ? error.stack || error.message : String(error);
        Logging.LogError('❌ Failed to launch MyWorld: ' + errorMessage);
        Logging.LogError('❌ Full launch error details: ' + errorDetails);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Failed to create MyWorld instance: ' + errorMessage);
    }
    //(window as any).myworld = myworld;

export default MyWorld;