/**
 * UI Manager - Manages UI elements and edit toolbar
 */

export interface UIUpdateData {
  type: string;
  payload?: any;
}

export class DockButtonInfo {
  name: string;
  thumbnail: string;
  onClick: string;

  constructor(name: string, thumbnail: string, onClick: string) {
    this.name = name;
    this.thumbnail = thumbnail;
    this.onClick = onClick;
  }
}

export class UIManager {
  private static instance: UIManager | null = null;
  
  private editToolbar?: HTMLElement;
  private isInitialized: boolean = false;

  constructor() {
    // Set the singleton instance
    UIManager.instance = this;
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

    (globalThis as any).enableEditToolbar = () => {
      this.enableEditToolbar();
    };

    (globalThis as any).disableEditToolbar = () => {
      this.disableEditToolbar();
    };

    (globalThis as any).messageEditToolbar = (msg: string) => {
      this.handleToolbarMessage(msg);
    };

    (globalThis as any).addEditToolbarButton = (name: string, thumbnail: string, onClick: string) => {
      this.addEditToolbarButton(name, thumbnail, onClick);
    };

    // Tools API global callbacks
    (globalThis as any).addTool = (name: string, thumbnail: string, onClick: string) => {
      this.addTool(name, thumbnail, onClick);
    };

    (globalThis as any).removeTool = (toolId: string) => {
      this.removeTool(toolId);
    };

    (globalThis as any).clearTools = () => {
      this.clearTools();
    };

    // Expose the UI manager instance and retry method globally for Time.SetTimeout callbacks
    (globalThis as any).uiManager = this;
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

      switch (msg) {
        case 'CHAT_INPUT.OPENED()':
        case 'CHAT_HISTORY.OPENED()':
        case 'POPUP_MENU.OPENED()':
          (globalThis as any).pauseForUI();
          break;
        case 'CHAT_INPUT.CLOSED()':
        case 'CHAT_HISTORY.CLOSED()':
        case 'POPUP_MENU.CLOSED()':
          (globalThis as any).unpauseForUI();
          break;
        default:
          // Handle UI Settings messages
          if (msg.startsWith('UI_SETTINGS.')) {
            this.handleUISettingsMessage(msg);
            return;
          }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error handling toolbar message: ' + errorMessage);
    }
  }

  /**
   * Handle UI Settings related messages from the UI space
   */
  private handleUISettingsMessage(msg: string): void {
    try {
      Logging.Log('🎛️ UIManager: Processing UI Settings message: ' + msg);

      if (msg.startsWith('UI_SETTINGS.APPLY(') && msg.endsWith(')')) {
        // Extract JSON data from message
        const jsonStart = msg.indexOf('(') + 1;
        const jsonEnd = msg.lastIndexOf(')');
        const jsonData = msg.substring(jsonStart, jsonEnd);
        
        try {
          const settings = JSON.parse(jsonData);
          this.applyUISettings(settings);
        } catch (parseError) {
          Logging.LogError('❌ UIManager: Failed to parse UI Settings JSON: ' + parseError);
        }
      } else {
        Logging.LogWarning('🎛️ UIManager: Unknown UI Settings message format: ' + msg);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error handling UI Settings message: ' + errorMessage);
    }
  }

  /**
   * Apply UI settings to the world/player systems
   */
  private applyUISettings(settings: any): void {
    try {
      Logging.Log('🎛️ UIManager: Applying UI Settings to world systems: ' + JSON.stringify(settings));

      // Apply camera mode
      if (settings.cameraMode && (globalThis as any).playerController) {
        const playerController = (globalThis as any).playerController;
        if (settings.cameraMode === 'firstPerson') {
          if (typeof playerController.setCameraModeFirstPerson === 'function') {
            playerController.setCameraModeFirstPerson();
            Logging.Log('📷 UIManager: Applied camera mode: first person');
          }
        } else if (settings.cameraMode === 'thirdPerson') {
          if (typeof playerController.setCameraModeThirdPerson === 'function') {
            playerController.setCameraModeThirdPerson();
            Logging.Log('📷 UIManager: Applied camera mode: third person');
          }
        }
      }

      // Apply movement speed
      if (settings.movementSpeed && (globalThis as any).playerController) {
        const playerController = (globalThis as any).playerController;
        if (typeof playerController.setMotionSpeed === 'function') {
          playerController.setMotionSpeed(settings.movementSpeed);
          Logging.Log('🏃 UIManager: Applied movement speed: ' + settings.movementSpeed);
        }
      }

      // Apply look speed
      if (settings.lookSpeed && (globalThis as any).playerController) {
        const playerController = (globalThis as any).playerController;
        if (typeof playerController.setLookSpeed === 'function') {
          playerController.setLookSpeed(settings.lookSpeed);
          Logging.Log('👀 UIManager: Applied look speed: ' + settings.lookSpeed);
        }
      }

      // Apply flying mode
      if (settings.hasOwnProperty('flying') && (globalThis as any).playerController) {
        const playerController = (globalThis as any).playerController;
        if (typeof playerController.setFlyingMode === 'function') {
          playerController.setFlyingMode(settings.flying);
          Logging.Log('✈️ UIManager: Applied flying mode: ' + settings.flying);
        }
      }

      Logging.Log('✅ UIManager: UI Settings applied successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error applying UI Settings: ' + errorMessage);
    }
  }

  /**
   * Add a tool to the Tools tab
   */
  addTool(name: string, thumbnail: string, onClick: string): void {
    try {
      Logging.Log('🔧 UIManager: Adding tool to Tools tab: ' + name);

      const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
      if (!mainToolbarId) {
        Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found, cannot add tool');
        return;
      }

      const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
      if (!mainToolbar) {
        Logging.LogError('❌ UIManager: Main toolbar entity not found, cannot add tool');
        return;
      }

      // Call the Tools iframe directly via popupMenuAPI
      const jsCommand = `
        if (window.popupMenuAPI && window.popupMenuAPI.sendMessageToTab) {
          const toolsTabs = window.popupMenuAPI.getTabs().filter(tab => tab.name === 'Tools');
          if (toolsTabs.length > 0) {
            window.popupMenuAPI.sendMessageToTab(toolsTabs[0].id, {
              type: 'add-tool',
              data: { name: '${name}', thumbnail: '${thumbnail}', onClick: '${onClick}' }
            });
          }
        }
      `;
      
      mainToolbar.ExecuteJavaScript(jsCommand, '');
      Logging.Log('✅ UIManager: Tool add command sent to UI space: ' + name);

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error adding tool: ' + errorMessage);
    }
  }

  /**
   * Remove a tool from the Tools tab
   */
  removeTool(toolId: string): void {
    try {
      Logging.Log('🔧 UIManager: Removing tool from Tools tab: ' + toolId);

      const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
      if (!mainToolbarId) {
        Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found, cannot remove tool');
        return;
      }

      const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
      if (!mainToolbar) {
        Logging.LogError('❌ UIManager: Main toolbar entity not found, cannot remove tool');
        return;
      }

      // Call the Tools iframe directly via popupMenuAPI
      const jsCommand = `
        if (window.popupMenuAPI && window.popupMenuAPI.sendMessageToTab) {
          const toolsTabs = window.popupMenuAPI.getTabs().filter(tab => tab.name === 'Tools');
          if (toolsTabs.length > 0) {
            window.popupMenuAPI.sendMessageToTab(toolsTabs[0].id, {
              type: 'remove-tool',
              data: { toolId: '${toolId}' }
            });
          }
        }
      `;
      
      mainToolbar.ExecuteJavaScript(jsCommand, '');
      Logging.Log('✅ UIManager: Tool remove command sent to UI space: ' + toolId);

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error removing tool: ' + errorMessage);
    }
  }

  /**
   * Clear all tools from the Tools tab
   */
  clearTools(): void {
    try {
      Logging.Log('🔧 UIManager: Clearing all tools from Tools tab');

      const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
      if (!mainToolbarId) {
        Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found, cannot clear tools');
        return;
      }

      const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
      if (!mainToolbar) {
        Logging.LogError('❌ UIManager: Main toolbar entity not found, cannot clear tools');
        return;
      }

      // Call the Tools iframe directly via popupMenuAPI
      const jsCommand = `
        if (window.popupMenuAPI && window.popupMenuAPI.sendMessageToTab) {
          const toolsTabs = window.popupMenuAPI.getTabs().filter(tab => tab.name === 'Tools');
          if (toolsTabs.length > 0) {
            window.popupMenuAPI.sendMessageToTab(toolsTabs[0].id, {
              type: 'clear-tools',
              data: {}
            });
          }
        }
      `;
      
      mainToolbar.ExecuteJavaScript(jsCommand, '');
      Logging.Log('✅ UIManager: Clear tools command sent to UI space');

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error clearing tools: ' + errorMessage);
    }
  }

  messageEditToolbar(msg: string): void {
    Logging.Log('🎯 UIManager: messageEditToolbar invoked with: ' + msg);
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
   * Set up edit toolbar buttons
   */
  private addEditToolbarButton(name: string, thumbnail: string, onClick: string): void {
    Logging.Log('🎨 UIManager: Setting up edit toolbar buttons...');
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

      const jsCommand = `window.buttonDockAPI.addButton('${name}', '${thumbnail}', '${onClick}');`;
      mainToolbar.ExecuteJavaScript(jsCommand, '');
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
   * Initialize UI Settings for supported world types
   * Called from myworld.ts when world type is determined
   */
  initializeUISettingsForWorldType(worldType: string): void {
    try {
      Logging.Log('🎛️ UIManager: Scheduling UI Settings initialization for world type: ' + worldType);
      
      // Use a single delayed call to allow UI to fully load
      Time.SetTimeout(`
        try {
          const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
          if (!mainToolbarId) {
            Logging.LogWarning('UIManager: MAIN-TOOLBAR-ID not found after delay');
            return;
          }

          const mainToolbar = Entity.Get(mainToolbarId);
          if (!mainToolbar) {
            Logging.LogWarning('UIManager: Main toolbar entity not found after delay');
            return;
          }

          const jsCommand = \`
            if (typeof window.initializeUISettings === 'function') {
              console.log('UIManager: UI Settings function found, calling initializeUISettings...');
              window.initializeUISettings('${worldType}');
            } else {
              console.warn('UIManager: initializeUISettings function not available in UI space');
            }
          \`;
          
          mainToolbar.ExecuteJavaScript(jsCommand, '');
          Logging.Log('UIManager: Sent UI Settings initialization command to UI space');
        } catch (error) {
          Logging.LogError('UIManager: Error in delayed UI Settings initialization: ' + (error instanceof Error ? error.message : String(error)));
        }
      `, 5000);
      
      Logging.Log('✅ UIManager: UI Settings initialization scheduled for 5 seconds');

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error scheduling UI Settings initialization: ' + errorMessage);
    }
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

  /**
   * Static methods for external access
   */
  
  /**
   * Public method to initialize UI Settings for a specific world type
   */
  static initializeUISettingsForWorldType(worldType: string): void {
    if (UIManager.instance) {
      UIManager.instance.initializeUISettingsForWorldType(worldType);
    } else {
      Logging.Log('⚠️ UIManager: Cannot initialize UI Settings - UIManager not initialized');
    }
  }

  /**
   * Public method to add a tool to the Tools tab
   */
  static addTool(name: string, thumbnail: string, onClick: string): void {
    if (UIManager.instance) {
      UIManager.instance.addTool(name, thumbnail, onClick);
    } else {
      Logging.Log('⚠️ UIManager: Cannot add tool - UIManager not initialized');
    }
  }

  /**
   * Public method to remove a tool from the Tools tab
   */
  static removeTool(toolId: string): void {
    if (UIManager.instance) {
      UIManager.instance.removeTool(toolId);
    } else {
      Logging.Log('⚠️ UIManager: Cannot remove tool - UIManager not initialized');
    }
  }

  /**
   * Public method to clear all tools from the Tools tab
   */
  static clearTools(): void {
    if (UIManager.instance) {
      UIManager.instance.clearTools();
    } else {
      Logging.Log('⚠️ UIManager: Cannot clear tools - UIManager not initialized');
    }
  }
}