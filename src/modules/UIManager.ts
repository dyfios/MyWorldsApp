/**
 * UI Manager - Manages UI elements and edit toolbar
 */

export interface UIUpdateData {
  type: string;
  payload?: any;
}

export class UIManager {
  private editToolbar?: HTMLElement;
  private isInitialized: boolean = false;

  constructor() {
    this.setupGlobalCallbacks();
  }

  /**
   * Setup global callback functions for UI manager
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for toolbar setup completion
    (globalThis as any).finishToolbarSetup = () => {
      this.finishToolbarSetup();
    };

    (globalThis as any).finishMainToolbarCreation = () => {
      this.finishMainToolbarCreation();
    };

    (globalThis as any).handleToolbarMessage = (msg: string) => {
      this.handleToolbarMessage(msg);
    };
  }

  finishToolbarSetup(): void {
    Logging.Log('🎯 UIManager: finishToolbarSetup callback invoked');
    try {
      const context = Context.GetContext('mainToolbarContext');
      if (!context) {
        Logging.LogError('❌ UIManager: mainToolbarContext not found');
        return;
      }
      
      const toolbarCanvasId = WorldStorage.GetItem('TOOLBAR-CANVAS-ID');
      if (!toolbarCanvasId) {
        Logging.LogError('❌ UIManager: TOOLBAR-CANVAS-ID not found in storage');
        return;
      }
      
      const toolbarCanvas = Entity.Get(toolbarCanvasId) as CanvasEntity;
      if (!toolbarCanvas) {
        Logging.LogError('❌ UIManager: Toolbar canvas entity not found');
        return;
      }
      
      toolbarCanvas.SetInteractionState(InteractionState.Static);
      toolbarCanvas.MakeScreenCanvas();
      
      const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
      if (!mainToolbarId) {
        Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found in storage');
        return;
      }
      
      Logging.Log('🖼️ UIManager: Creating HTML entity for toolbar...');
      context.mainToolbar = HTMLEntity.Create(toolbarCanvas, new Vector2(0, 0),
        new Vector2(1, 1), mainToolbarId, 'Toolbar', 'handleToolbarMessage',
        'finishMainToolbarCreation');
      
      Logging.Log('✅ UIManager: Toolbar canvas setup completed');
      
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error in finishToolbarSetup: ' + errorMessage);
    }
  }

  finishMainToolbarCreation(): void {
    Logging.Log('🎯 UIManager: UI_FinishMainToolbarCreation callback invoked');
    try {
      const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
      if (!mainToolbarId) {
        Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found in storage');
        return;
      }
      
      const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
      if (!mainToolbar) {
        Logging.LogError('❌ UIManager: Main toolbar entity not found');
        return;
      }
      
      mainToolbar.SetInteractionState(InteractionState.Static);
      
      if (typeof mainToolbar.LoadFromURL === 'function') {
        mainToolbar.LoadFromURL('ui/build/index.html');
        Logging.Log('📄 UIManager: Loading toolbar HTML from URL');
        this.disableEditToolbar();
      } else {
        Logging.LogError('❌ UIManager: LoadFromURL method not available on toolbar entity');
      }
      
      Logging.Log('✅ UIManager: Main toolbar creation completed');
      
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error in UI_FinishMainToolbarCreation: ' + errorMessage);
    }
  }

  handleToolbarMessage(msg: string): void {
    Logging.Log('🎯 UIManager: UI_HandleToolbarMessage invoked with: ' + msg);
    try {
      Logging.Log('📨 UIManager: Processing toolbar message: ' + msg);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error handling toolbar message: ' + errorMessage);
    }
  }

  /**
   * Initialize edit toolbar
   */
  initializeEditToolbar(): void {
    if (this.isInitialized) {
      return;
    }

    this.createEditToolbar();
    this.isInitialized = true;
    Logging.Log('Edit toolbar initialized');
  }

  /**
   * Enable edit toolbar.
   */
  enableEditToolbar(): void {
    const toolbarCanvasId = WorldStorage.GetItem('TOOLBAR-CANVAS-ID');
    if (!toolbarCanvasId) {
      Logging.LogError('❌ UIManager: TOOLBAR-CANVAS-ID not found in storage');
      return;
    }

    const toolbarCanvas = Entity.Get(toolbarCanvasId) as CanvasEntity;
    if (!toolbarCanvas) {
      Logging.LogError('❌ UIManager: Toolbar canvas entity not found');
      return;
    }

    toolbarCanvas.SetVisibility(true);
  }

  /**
   * Disable edit toolbar.
   */
  disableEditToolbar(): void {
    const toolbarCanvasId = WorldStorage.GetItem('TOOLBAR-CANVAS-ID');
    if (!toolbarCanvasId) {
      Logging.LogError('❌ UIManager: TOOLBAR-CANVAS-ID not found in storage');
      return;
    }
    
    const toolbarCanvas = Entity.Get(toolbarCanvasId) as CanvasEntity;
    if (!toolbarCanvas) {
      Logging.LogError('❌ UIManager: Toolbar canvas entity not found');
      return;
    }

    if (!toolbarCanvas) {
      Logging.LogError('❌ UIManager: Edit toolbar canvas not initialized');
      return;
    }

    toolbarCanvas.SetVisibility(false);
  }

  /**
   * Create edit toolbar UI
   */
  private createEditToolbar(): void {
    try {
      Logging.Log('🎨 UIManager: Creating edit toolbar...');
      
      // Generate unique IDs for toolbar components
      const toolbarCanvasId = UUID.NewUUID().ToString();
      const mainToolbarId = UUID.NewUUID().ToString();
      
      if (!toolbarCanvasId || !mainToolbarId) {
        Logging.LogError('❌ UIManager: Failed to generate toolbar IDs');
        return;
      }
      
      // Store IDs in WorldStorage for later access
      WorldStorage.SetItem('TOOLBAR-CANVAS-ID', toolbarCanvasId);
      WorldStorage.SetItem('MAIN-TOOLBAR-ID', mainToolbarId);
      
      // Create context for toolbar management
      const mainToolbarContext = {
        toolbarCanvasId: toolbarCanvasId,
        mainToolbarId: mainToolbarId,
        setUpToolbars: null // Will be set after canvas creation
      };
      Context.DefineContext('mainToolbarContext', mainToolbarContext);
      
      // Create the toolbar canvas entity
      Logging.Log('🖼️ UIManager: Creating toolbar canvas entity...');
      const editToolbarCanvas = CanvasEntity.Create(
        undefined, // No parent
        Vector3.zero, // Position at origin
        Quaternion.identity, // No rotation
        Vector3.one, // Scale of 1
        false, // Not using size mode
        toolbarCanvasId,
        'ToolbarCanvas',
        'finishToolbarSetup' // Global callback function
      );

      Context.DefineContext('editToolbarCanvas', editToolbarCanvas);
      
      Logging.Log('✅ UIManager: Edit toolbar creation initiated');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ UIManager: Failed to create edit toolbar: ' + errorMessage);
    }
  }

  /**
   * Attach event listeners to toolbar buttons
   */
  /*private attachToolbarEventListeners(): void {
    const buttons = this.editToolbar?.querySelectorAll('.tool-btn');
    buttons?.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        this.handleToolSelection(target.id);
      });
    });
  }*/

  /**
   * Handle tool selection
   */
  /*private handleToolSelection(toolId: string): void {
    Logging.Log(`Tool selected: ${toolId}`);
    
    // Remove active class from all buttons
    const buttons = this.editToolbar?.querySelectorAll('.tool-btn');
    buttons?.forEach(btn => btn.classList.remove('active'));

    // Add active class to selected button
    //const selectedBtn = document.getElementById(toolId);
    //selectedBtn?.classList.add('active');
  }*/

  /**
   * Trigger UI updates from sync
   */
  triggerUIUpdates(data: UIUpdateData): void {
    Logging.Log('UI updates triggered: ' + JSON.stringify(data));
    // Update UI elements based on sync data
  }

  /**
   * Show/hide edit toolbar
   */
  toggleEditToolbar(visible: boolean): void {
    if (this.editToolbar) {
      this.editToolbar.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Clean up UI elements
   */
  dispose(): void {
    if (this.editToolbar) {
      this.editToolbar.remove();
      this.editToolbar = undefined;
    }
    this.isInitialized = false;
  }
}