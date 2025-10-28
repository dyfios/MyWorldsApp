/**
 * MyWorld Client Entry Point
 * Orchestrates the client startup sequence
 */

import { ClientContext } from './modules/ClientContext';
import { ProcessQueryParams } from './utils/ProcessQueryParams';

export class MyWorld {
  private static readonly MOCK_LOGIN_DELAY_MS = 100;
  private context: ClientContext;
  private queryParams: ProcessQueryParams;

  constructor() {
    this.context = new ClientContext();
    this.queryParams = new ProcessQueryParams();
  }

  /**
   * Launch the MyWorld client
   */
  async launch(): Promise<void> {
    try {
      console.log('🌐 Launching MyWorld Client...');

      // 1. Parse query parameters
      const params = this.queryParams.parse();
      console.log('✓ Query parameters processed');

      // 2. Trigger login via Identity module
      await this.startUserLogin();
      console.log('✓ User login completed');

      // 3. Initialize all core modules into ClientContext
      await this.context.initializeModules();
      console.log('✓ Modules initialized');

      // 4. Load world configuration
      const worldUri = params.worldUri as string | undefined;
      const worldConfig = await this.context.modules.config.loadWorldConfig(worldUri);
      console.log('✓ World configuration loaded');

      // 5. Connect to synchronization sessions
      await this.context.modules.sync.connectToSynchronizers();
      console.log('✓ Connected to synchronizers');

      // 6. Instantiate and load world renderers
      await this.context.modules.worldRendering.createAndLoadRenderers(worldConfig);
      console.log('✓ World renderers loaded');

      // 7. Activate UI editing tools
      this.context.modules.ui.initializeEditToolbar();
      console.log('✓ UI editing tools activated');

      console.log('🎉 MyWorld Client launched successfully!');

      // Start render loop
      this.startRenderLoop();
    } catch (error) {
      console.error('❌ Failed to launch MyWorld Client:', error);
      throw error;
    }
  }

  /**
   * Start user login process
   */
  private async startUserLogin(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.context.modules.identity.StartLogin(() => {
        resolve();
      });
      
      // Auto-resolve for now (in real app, would wait for actual login)
      setTimeout(() => resolve(), MyWorld.MOCK_LOGIN_DELAY_MS);
    });
  }

  /**
   * Start the render loop
   */
  private startRenderLoop(): void {
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Update modules
      this.context.modules.player.update(deltaTime);
      this.context.modules.script.update(deltaTime);
      this.context.modules.environmentModifier.update(deltaTime);

      // Render frame
      this.context.modules.worldRendering.renderFrame(deltaTime);

      // Schedule next frame
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  /**
   * Dispose of the client
   */
  dispose(): void {
    this.context.dispose();
  }
}

// Auto-launch when in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const myworld = new MyWorld();
    myworld.launch().catch(error => {
      console.error('Failed to launch MyWorld:', error);
    });
    
    // Make available globally for debugging
    (window as any).myworld = myworld;
  });
}

export default MyWorld;
