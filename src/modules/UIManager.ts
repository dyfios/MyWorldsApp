/**
 * UI Manager - Manages UI elements and edit toolbar
 */

import { SyncManager } from './SyncManager';

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
  public clientType: string;

  private static instance: UIManager | null = null;
  
  private editToolbar?: HTMLElement;
  private vrToolbar: any = null;
  private isInitialized: boolean = false;
  private vrToolbarInitialized: boolean = false;

  public defaultToolPath: string = "assets/images/tool-default.png";
  public defaultEntityPath: string = "assets/images/entity-default.png";
  public defaultTerrainPath: string = "assets/images/terrain-default.png";
  public handPath: string = "assets/images/hand.png";
  public squareShovelx1Path: string = "assets/images/square-shovel.png";
  public squareShovelx2Path: string = "assets/images/square-shovel-x2.png";
  public squareShovelx4Path: string = "assets/images/square-shovel-x4.png";
  public squareShovelx8Path: string = "assets/images/square-shovel-x8.png";
  public sledgeHammerPath: string = "assets/images/sledgehammer.png";

  constructor(clientType?: string) {
    this.clientType = clientType? clientType : 'lite';
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
      Logging.Log('🎯🎯🎯 GLOBAL handleToolbarMessage INVOKED with: ' + msg);
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

    (globalThis as any).toggleLoadingPanel = (show: boolean) => {
      this.toggleLoadingPanel(show);
    };

    // VR Toolbar global callbacks
    (globalThis as any).finishVRToolbarPanelSetup = () => {
      this.finishVRToolbarPanelSetup();
    };

    (globalThis as any).finishVRToolbarSetup = () => {
      this.finishVRToolbarSetup();
    };

    (globalThis as any).finishVRToolbarCreation = () => {
      this.finishVRToolbarCreation();
    };

    (globalThis as any).finishVRToolbarContainerSetup = () => {
      this.finishVRToolbarContainerSetup();
    };

    (globalThis as any).handleVRToolbarMessage = (msg: string) => {
      this.handleVRToolbarMessage(msg);
    };

    (globalThis as any).enableVRToolbar = () => {
      this.enableVRToolbar();
    };

    (globalThis as any).disableVRToolbar = () => {
      this.disableVRToolbar();
    };

    (globalThis as any).toggleEditToolbar = () => {
      this.toggleEditToolbar();
    };

    (globalThis as any).toggleVRToolbar = () => {
      this.toggleVRToolbar();
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
      toolbarCanvas.SetVisibility(true); // Ensure canvas is visible
      
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
        // Enable the toolbar after loading (it should be visible after authentication)
        this.enableEditToolbar();
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
        case 'UNFOCUS_PANEL()':
          // Handle background click - unfocus the HTML panel
          Logging.Log('🔲 UIManager: Unfocusing panel (background clicked)');
          const unfocusToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
          if (unfocusToolbarId) {
            const toolbarEntity = Entity.Get(unfocusToolbarId) as HTMLEntity;
            if (toolbarEntity && typeof toolbarEntity.UnfocusPanel === 'function') {
              toolbarEntity.UnfocusPanel();
              Logging.Log('🔲 UIManager: Panel unfocused successfully');
            }
          }
          break;
        default:
          // Handle UI Settings messages
          if (msg.startsWith('UI_SETTINGS.')) {
            this.handleUISettingsMessage(msg);
            return;
          } else if (msg.startsWith('TOOL.ADD_DOCK_BUTTON(')) {
            // Extract parameters from TOOL.ADD_DOCK_BUTTON(type, tag, icon)
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const paramString = msg.substring(paramStart, paramEnd);
              const params = paramString.split(',').map(param => param.trim().split("'").join("").split('"').join(""));
              
              if (params.length === 3) {
                const [type, tag, icon] = params;
                Logging.Log('🔧 UIManager: Adding dock button - type: ' + type + ', tag: ' + tag + ', icon: ' + icon);
                
                // Add button to ButtonDock using the existing method
                this.addEditToolbarButton(tag, icon, 'TOOL.DOCK_BUTTON_CLICKED(' + type + ')');
              } else {
                Logging.LogError('❌ UIManager: Invalid TOOL.ADD_DOCK_BUTTON parameters count: ' + params.length);
              }
            } else {
              Logging.LogError('❌ UIManager: Invalid TOOL.ADD_DOCK_BUTTON message format: ' + msg);
            }
          } else if (msg.startsWith('TOOL.DOCK_BUTTON_CLICKED(')) {
            // Handle dock button click - extract type parameter
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const buttonType = msg.substring(paramStart, paramEnd).trim().split("'").join("").split('"').join("");
              Logging.Log('🔧 UIManager: Dock button clicked - type: ' + buttonType);
              
              // Handle the button click based on type
              this.handleDockButtonClick(buttonType);
            } else {
              Logging.LogError('❌ UIManager: Invalid TOOL.DOCK_BUTTON_CLICKED message format: ' + msg);
            }
          } else if (msg.startsWith('CHAT_INPUT.MESSAGE(')) {
            // Handle chat message input - extract message parameter
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const message = msg.substring(paramStart, paramEnd).trim().split("'").join("").split('"').join("");
              Logging.Log('💬 UIManager: Chat message received - message: ' + message);

              const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
              if (!mainToolbarId) {
                Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found, cannot send chat message');
                return;
              }

              const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
              if (!mainToolbar) {
                Logging.LogError('❌ UIManager: Main toolbar entity not found, cannot send chat message');
                return;
              }
              
              const jsCommand = `window.chatConsoleAPI.addMessage("${(Date as any).Now.ToTimeString()} [You] ${message}");`;
              
              mainToolbar.ExecuteJavaScript(jsCommand, '');

              const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
              if (vrToolbarHTMLId) {
                const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId) as HTMLEntity;
                vrToolbarHTMLEntity.ExecuteJavaScript(jsCommand, '');
              }

              ((globalThis as any).syncManager as SyncManager).globalSynchronizer?.SendGlobalMessage(message);
            }
          } else if (msg.startsWith('CHAT_INPUT.COMMAND(')) {
            // Handle chat command input - extract command parameter
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');

            if (paramStart > 0 && paramEnd > paramStart) {
              const command = msg.substring(paramStart, paramEnd).trim().split("'").join("").split('"').join("");
              Logging.Log('💬 UIManager: Chat command received - command: ' + command);
              ((globalThis as any).syncManager as SyncManager).globalSynchronizer?.SendGlobalMessage(command);
            }
          } else if (msg.startsWith('ENTITY_TEMPLATE.ENTITY_SELECTED(')) {
            // Handle entity template selection for placement
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const paramString = msg.substring(paramStart, paramEnd);
              // Parse entity_id and variant_id - format: 'entity_id','variant_id' or entity_id,variant_id
              const params = paramString.split(',').map(param => param.trim().split("'").join("").split('"').join(""));
              
              if (params.length >= 2) {
                const entityId = params[0];
                const variantId = params[1];
                
                Logging.Log('🏗️ UIManager: Entity template selected - entityId: ' + entityId + ', variantId: ' + variantId);
                
                // Set interaction mode for entity placing
                (globalThis as any).setInteractionMode('ENTITY-PLACING');
                
                // Get entity templates from context
                const templates = Context.GetContext('MW_ENTITY_TEMPLATES');
                if (!templates || !templates.templates) {
                  Logging.LogError('❌ UIManager: No entity templates found in context');
                  return;
                }
                
                // Find the matching template
                let foundTemplate = null;
                for (const template of templates.templates) {
                  if (template.entity_id === entityId && template.variant_id === variantId) {
                    foundTemplate = template;
                    break;
                  }
                }
                
                if (!foundTemplate) {
                  Logging.LogError('❌ UIManager: Entity template not found for entityId: ' + entityId + ', variantId: ' + variantId);
                  return;
                }
                
                // Get world metadata for constructing mesh URL
                const worldRendererFactory = Context.GetContext('WorldRendererFactory');
                const staticRenderer = worldRendererFactory?.getStaticSurfaceRenderer?.();
                const worldMetadata = staticRenderer?.getWorldMetadata?.();
                const worldAddress = staticRenderer?.queryParams?.getWorldAddress?.();
                
                if (!worldMetadata || !worldAddress) {
                  Logging.LogError('❌ UIManager: World metadata or address not available');
                  return;
                }
                
                // Parse the assets JSON to get model path
                let modelPath = '';
                try {
                  const assets = JSON.parse(foundTemplate.assets);
                  modelPath = worldAddress + '/public-assets/' + assets.model_path;
                } catch (e) {
                  Logging.LogError('❌ UIManager: Failed to parse template assets: ' + e);
                  return;
                }
                
                const instanceId = UUID.NewUUID().ToString() || Date.now().toString();
                const entityType = foundTemplate.type || 'mesh';
                
                Logging.Log('🏗️ UIManager: Loading entity for placement - model: ' + modelPath);
                
                // Cancel any existing placement
                (globalThis as any).cancelPlacing?.();
                
                // Load the entity for placement using the renderer's entity manager
                const entityManager = staticRenderer.getEntityManager();
                entityManager.loadEntity(
                  foundTemplate.entity_tag,     // entityIndex
                  foundTemplate.variant_tag,    // variantIndex
                  instanceId,                   // instanceId
                  foundTemplate.entity_tag + '_' + foundTemplate.variant_tag + '_' + instanceId, // instanceTag
                  entityId,                     // entityId
                  variantId,                    // variantId
                  undefined,                    // entityParent
                  entityType,                   // type
                  Vector3.zero,                 // position
                  Quaternion.identity,          // rotation
                  Vector3.one,                  // scale
                  modelPath,                    // meshObject
                  [modelPath],                  // meshResources
                  undefined,                    // wheels
                  undefined,                    // mass
                  undefined,                    // autoType
                  undefined,                    // scripts
                  true                          // placingEntity = true
                );
              } else {
                Logging.LogError('❌ UIManager: Invalid ENTITY_TEMPLATE.ENTITY_SELECTED parameters: ' + paramString);
              }
            }
          } else if (msg.startsWith('MOBILE_KEY.DOWN(')) {
            // Handle mobile control key press - for flying up/down
            Logging.Log('📱 UIManager: MOBILE_KEY.DOWN detected in message');
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const key = msg.substring(paramStart, paramEnd).trim().toLowerCase();
              Logging.Log('📱 UIManager: Mobile control key down: ' + key);
              
              // Echo back to browser for debugging
              const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
              if (mainToolbarId) {
                const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
                if (mainToolbar && typeof mainToolbar.ExecuteJavaScript === 'function') {
                  mainToolbar.ExecuteJavaScript(`console.log('[UIManager] Received MOBILE_KEY.DOWN: ${key}');`, '');
                }
              }
              
              // Store the key state for continuous movement
              if (key === 'shift') {
                (globalThis as any).mobileControlShiftDown = true;
                Logging.Log('📱 UIManager: mobileControlShiftDown set to TRUE');
              } else if (key === 'space') {
                (globalThis as any).mobileControlSpaceDown = true;
                Logging.Log('📱 UIManager: mobileControlSpaceDown set to TRUE');
              }
            } else {
              Logging.Log('📱 UIManager: Failed to parse MOBILE_KEY params');
            }
          } else if (msg.startsWith('MOBILE_KEY.UP(')) {
            // Handle mobile control key release
            Logging.Log('📱 UIManager: MOBILE_KEY.UP detected in message');
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const key = msg.substring(paramStart, paramEnd).trim().toLowerCase();
              Logging.Log('📱 UIManager: Mobile control key up: ' + key);
              
              // Clear the key state
              if (key === 'shift') {
                (globalThis as any).mobileControlShiftDown = false;
                Logging.Log('📱 UIManager: mobileControlShiftDown set to FALSE');
              } else if (key === 'space') {
                (globalThis as any).mobileControlSpaceDown = false;
                Logging.Log('📱 UIManager: mobileControlSpaceDown set to FALSE');
              }
            } else {
              Logging.Log('📱 UIManager: Failed to parse MOBILE_KEY.UP params');
            }
          } else if (msg.startsWith('MOBILE_FLY.VERTICAL(')) {
            // Handle mobile flight vertical speed control
            Logging.Log('📱 UIManager: MOBILE_FLY.VERTICAL detected in message');
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            Logging.Log('📱 UIManager: paramStart=' + paramStart + ', paramEnd=' + paramEnd);
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const speedStr = msg.substring(paramStart, paramEnd).trim();
              Logging.Log('📱 UIManager: speedStr=' + speedStr);
              const speed = parseFloat(speedStr);
              
              if (!isNaN(speed)) {
                // Store the vertical speed for continuous movement (-1 to 1)
                (globalThis as any).mobileFlightVerticalSpeed = speed;
                Logging.Log('📱 UIManager: mobileFlightVerticalSpeed set to ' + speed);
              } else {
                Logging.Log('📱 UIManager: Invalid MOBILE_FLY.VERTICAL speed: ' + speedStr);
              }
            } else {
              Logging.Log('📱 UIManager: Failed to parse MOBILE_FLY.VERTICAL params');
            }
          } else if (msg.startsWith('MOBILE_MOVE(')) {
            // Handle mobile movement input - x,y values from -1 to 1
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const paramString = msg.substring(paramStart, paramEnd);
              const params = paramString.split(',').map(p => parseFloat(p.trim()));
              
              if (params.length >= 2 && !isNaN(params[0]) && !isNaN(params[1])) {
                const moveX = params[0]; // Left/right (-1 to 1)
                const moveY = params[1]; // Forward/backward (-1 to 1)
                
                // Call Input.SetMovement with the movement vector
                Input.SetMovement(new Vector2(moveX, moveY));
              } else {
                Logging.Log('📱 UIManager: Invalid MOBILE_MOVE params: ' + paramString);
              }
            } else {
              Logging.Log('📱 UIManager: Failed to parse MOBILE_MOVE params');
            }
          } else if (msg.startsWith('MOBILE_LOOK(')) {
            // Handle mobile look input - x,y delta values
            const paramStart = msg.indexOf('(') + 1;
            const paramEnd = msg.lastIndexOf(')');
            
            if (paramStart > 0 && paramEnd > paramStart) {
              const paramString = msg.substring(paramStart, paramEnd);
              const params = paramString.split(',').map(p => parseFloat(p.trim()));
              
              if (params.length >= 2 && !isNaN(params[0]) && !isNaN(params[1])) {
                const lookX = params[0]; // Horizontal look delta
                const lookY = params[1]; // Vertical look delta
                
                // Call Input.SetLook with the look vector
                Input.SetLook(new Vector2(lookX, lookY));
              } else {
                Logging.Log('📱 UIManager: Invalid MOBILE_LOOK params: ' + paramString);
              }
            } else {
              Logging.Log('📱 UIManager: Failed to parse MOBILE_LOOK params');
            }
          }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error handling toolbar message: ' + errorMessage);
    }
  }

  /**
   * Handle dock button click events
   */
  private handleDockButtonClick(buttonType: string): void {
    try {
      Logging.Log('🔧 UIManager: Processing dock button click for type: ' + buttonType);
      
      switch (buttonType) {
        case 'HAND':
          Logging.Log('🔨 UIManager: Hand button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('HAND');
          break;
        case 'SQUARE_SHOVEL_1':
          Logging.Log('🎨 UIManager: Square Shovel 1 button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('SQUARE-SHOVEL-1');
          break;
        case 'SQUARE_SHOVEL_2':
          Logging.Log('📦 UIManager: Square Shovel 2 button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('SQUARE-SHOVEL-2');
          break;
        case 'SQUARE_SHOVEL_4':
          Logging.Log('🗑️ UIManager: Square Shovel 4 button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('SQUARE-SHOVEL-4');
          break;
        case 'SQUARE_SHOVEL_8':
          Logging.Log('🗑️ UIManager: Square Shovel 8 button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('SQUARE-SHOVEL-8');
          break;
        case 'SLEDGE_HAMMER':
          Logging.Log('🔨 UIManager: Sledgehammer button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('SLEDGE-HAMMER');
          break;
        case 'ROUND_SHOVEL_1':
          Logging.Log('🎨 UIManager: Round Shovel 1 button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('ROUND-SHOVEL-1');
          break;
        case 'ROUND_SHOVEL_2':
          Logging.Log('📦 UIManager: Round Shovel 2 button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('ROUND-SHOVEL-2');
          break;
        case 'ROUND_SHOVEL_4':
          Logging.Log('🗑️ UIManager: Round Shovel 4 button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('ROUND-SHOVEL-4');
          break;
        case 'ROUND_SHOVEL_8':
          Logging.Log('🗑️ UIManager: Round Shovel 8 button clicked');
          (globalThis as any).cancelPlacing();
          (globalThis as any).setInteractionMode('ROUND-SHOVEL-8');
          break;
        default:
          if (buttonType.startsWith('ENTITY.')) {
            (globalThis as any).setInteractionMode('ENTITY-PLACING');
            const parts = buttonType.split('.');
            if (parts.length >= 3) {
              const entityName = parts[1];
              const variantName = parts[2].split(',')[0]; // Remove comma and everything after it
              const instanceID = UUID.NewUUID().ToString();
              
              Logging.Log('🏗️ UIManager: Entity button clicked - entityID: ' + entityName + ', variantID: ' + variantName);
              
              (globalThis as any).cancelPlacing();
              for (var entity in (globalThis as any).tiledsurfacerenderer.entitiesConfig) {
                if (entity == entityName) {
                  for (var variant in (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].variants) {
                    if (variant == variantName) {
                      (globalThis as any).loadEntity(entity, variant, instanceID,
                        entity + "." + variant + "." + instanceID,
                        (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].id,
                        (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].variants[variant].variant_id, null,
                        (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].variants[variant].type,
                        Vector3.zero, Quaternion.identity, Vector3.one,
                        (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].variants[variant].model,
                        [ (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].variants[variant].model ],
                        (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].variants[variant].wheels,
                        (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].variants[variant].mass,
                        AutomobileType.Default,
                        (globalThis as any).tiledsurfacerenderer.entitiesConfig[entity].variants[variant].scripts,
                        true);
                      return;
                    }
                  }
                }
              }
            } else {
              Logging.LogError('❌ UIManager: Invalid ENTITY button format: ' + buttonType + ' (expected ENTITY.<entityID>.<variantID>)');
            }
          } else if (buttonType.startsWith('TERRAIN.')) {
              const parts = buttonType.split('.');
              if (parts.length >= 2) {
                const layerName = parts[1].split(',')[0]; // Remove comma and everything after it
                
                Logging.Log('⛏️ UIManager: Terrain button clicked - layerName: ' + layerName);

                const layerNum = (globalThis as any).tiledsurfacerenderer.terrainConfig.layers[layerName]["layer"] as number;
                (globalThis as any).cancelPlacing();
                (globalThis as any).setInteractionMode('TERRAIN-LAYER-' + layerNum);
              }
            } else {
            Logging.Log('🔧 UIManager: Unknown button type clicked: ' + buttonType);
          }
          // Handle unknown button types
          break;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error handling dock button click: ' + errorMessage);
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
      Logging.Log('🎛️ UIManager: playerController available: ' + !!(globalThis as any).playerController);

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
        Logging.Log('✈️ UIManager: Flying mode in settings: ' + settings.flying + ', setFlyingMode available: ' + (typeof playerController.setFlyingMode === 'function'));
        if (typeof playerController.setFlyingMode === 'function') {
          Logging.Log('✈️ UIManager: Calling setFlyingMode with: ' + settings.flying);
          playerController.setFlyingMode(settings.flying);
          Logging.Log('✈️ UIManager: After setFlyingMode, Input.gravityEnabled = ' + Input.gravityEnabled);
        }
      } else {
        Logging.Log('✈️ UIManager: Flying mode NOT applied - hasOwnProperty: ' + settings.hasOwnProperty('flying') + ', playerController: ' + !!(globalThis as any).playerController);
      }

      Logging.Log('✅ UIManager: UI Settings applied successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error applying UI Settings: ' + errorMessage);
    }
  }

  toggleLoadingPanel(show: boolean): void {
    try {
      const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
      if (!mainToolbarId) {
        Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found, cannot toggle loading panel');
        return;
      }

      const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
      if (!mainToolbar) {
        Logging.LogError('❌ UIManager: Main toolbar entity not found, cannot toggle loading panel');
        return;
      }

      // Call the loading panel API
      const jsCommand = `
        if (window.loadingPanelAPI && window.loadingPanelAPI.show && window.loadingPanelAPI.hide) {
          if (${show}) {
            window.loadingPanelAPI.show();
          } else {
            window.loadingPanelAPI.hide();
          }
        }
      `;
      
      mainToolbar.ExecuteJavaScript(jsCommand, '');
      Logging.Log('✅ UIManager: Loading panel toggle command sent to UI space: ' + show);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error in toggleLoadingPanel: ' + errorMessage);
    }
  }

  /**
   * Add a tool to the Tools tab
   */
  addTool(name: string, thumbnail: string, onClick: string): void {
    try {
      Logging.Log('🔧 UIManager: Adding tool to Tools tab: ' + name);
      Logging.Log('🔧 UIManager: Client type: ' + this.clientType);

      const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
      if (!mainToolbarId) {
        Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found, cannot add tool');
        return;
      }
      
      Logging.Log('🔧 UIManager: MAIN-TOOLBAR-ID: ' + mainToolbarId);

      const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
      if (!mainToolbar) {
        Logging.LogError('❌ UIManager: Main toolbar entity not found, cannot add tool');
        return;
      }
      
      Logging.Log('🔧 UIManager: Main toolbar entity found');
      Logging.Log('🔧 UIManager: ExecuteJavaScript available: ' + (typeof mainToolbar.ExecuteJavaScript === 'function'));

      // Call the Tools iframe directly via popupMenuAPI
      const jsCommand = `
        console.log('UIManager addTool JS: Starting execution');
        console.log('UIManager addTool JS: popupMenuAPI exists:', !!window.popupMenuAPI);
        console.log('UIManager addTool JS: sendMessageToTab exists:', window.popupMenuAPI ? !!window.popupMenuAPI.sendMessageToTab : 'N/A');
        if (window.popupMenuAPI && window.popupMenuAPI.sendMessageToTab) {
          const toolsTabs = window.popupMenuAPI.getTabs().filter(tab => tab.name === 'Tools');
          console.log('UIManager addTool JS: Tools tabs found:', toolsTabs.length);
          if (toolsTabs.length > 0) {
            console.log('UIManager addTool JS: Sending message to tab:', toolsTabs[0].id);
            window.popupMenuAPI.sendMessageToTab(toolsTabs[0].id, {
              type: 'add-tool',
              data: { name: '${name}', thumbnail: '${thumbnail}', onClick: '${onClick}' }
            });
            console.log('UIManager addTool JS: Message sent successfully');
          } else {
            console.warn('UIManager addTool JS: No Tools tab found');
          }
        } else {
          console.warn('UIManager addTool JS: popupMenuAPI or sendMessageToTab not available');
        }
      `;
      
      if (typeof mainToolbar.ExecuteJavaScript === 'function') {
        mainToolbar.ExecuteJavaScript(jsCommand, '');
        Logging.Log('✅ UIManager: Tool add command sent to UI space: ' + name);
      } else {
        Logging.LogError('❌ UIManager: ExecuteJavaScript not available on main toolbar entity');
      }

      // Also send to VR toolbar if it exists
      const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
      if (vrToolbarHTMLId) {
        const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId) as HTMLEntity;
        if (vrToolbarHTMLEntity) {
          vrToolbarHTMLEntity.ExecuteJavaScript(jsCommand, '');
          Logging.Log('✅ UIManager: Tool add command sent to VR toolbar: ' + name);
        }
      }

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

      // Also send to VR toolbar if it exists
      const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
      if (vrToolbarHTMLId) {
        const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId) as HTMLEntity;
        if (vrToolbarHTMLEntity) {
          vrToolbarHTMLEntity.ExecuteJavaScript(jsCommand, '');
          Logging.Log('✅ UIManager: Tool remove command sent to VR toolbar: ' + toolId);
        }
      }

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

      // Also send to VR toolbar if it exists
      const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
      if (vrToolbarHTMLId) {
        const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId) as HTMLEntity;
        if (vrToolbarHTMLEntity) {
          vrToolbarHTMLEntity.ExecuteJavaScript(jsCommand, '');
          Logging.Log('✅ UIManager: Clear tools command sent to VR toolbar');
        }
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error clearing tools: ' + errorMessage);
    }
  }

  messageEditToolbar(msg: string): void {
    Logging.Log('🎯 UIManager: messageEditToolbar invoked with: ' + msg);
  }

  toggleEditToolbar(): void {
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
    mainToolbar.ExecuteJavaScript('window.popupMenuAPI.toggleMenu();', '');
  }

  toggleVRToolbar(): void {
    const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
    if (!vrToolbarHTMLId) {
      Logging.LogError('❌ UIManager: VR-TOOLBAR-HTML-ID not found in storage');
      return;
    }
    const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId) as HTMLEntity;
    if (!vrToolbarHTMLEntity) {
      Logging.LogError('❌ UIManager: VR toolbar entity not found');
      return;
    }
    vrToolbarHTMLEntity.ExecuteJavaScript('window.popupMenuAPI.toggleMenu();', '');
  }

  /**
   * Initialize edit toolbar
   */
  initializeEditToolbar(): void {
    if (this.isInitialized) {
      return;
    }

    this.createEditToolbar();
    this.createVRToolbar();
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
    Logging.Log('🎨 UIManager: Button details - name: ' + name + ', thumbnail: ' + thumbnail + ', onClick: ' + onClick);
    
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

      const jsCommand = `
        console.log('UIManager: Adding button to ButtonDock - name: ${name}, onClick: ${onClick}');
        if (window.buttonDockAPI && typeof window.buttonDockAPI.addButton === 'function') {
          window.buttonDockAPI.addButton('${name}', '${thumbnail}', '${onClick}');
          console.log('UIManager: Button added successfully');
        } else {
          console.warn('UIManager: buttonDockAPI not available');
        }
      `;
      mainToolbar.ExecuteJavaScript(jsCommand, '');

      const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
      if (vrToolbarHTMLId) {
        const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId) as HTMLEntity;
        vrToolbarHTMLEntity.ExecuteJavaScript(jsCommand, '');
        Logging.Log('✅ UIManager: Button add command sent to VR toolbar');
      }

      Logging.Log('✅ UIManager: Button add command sent to UI space');
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
  // @ts-ignore: Reserved for future use
  private attachToolbarEventListeners(): void {
    const buttons = this.editToolbar?.querySelectorAll('.tool-btn');
    buttons?.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        this.handleToolSelection(target.id);
      });
    });
  }

  /**
   * Handle tool selection
   */
  private handleToolSelection(toolId: string): void {
    Logging.Log(`Tool selected: ${toolId}`);
    
    // Remove active class from all buttons
    const buttons = this.editToolbar?.querySelectorAll('.tool-btn');
    buttons?.forEach(btn => btn.classList.remove('active'));

    // Add active class to selected button
    //const selectedBtn = document.getElementById(toolId);
    //selectedBtn?.classList.add('active');
  }

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

          const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
          if (vrToolbarHTMLId) {
            const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId);
            if (vrToolbarHTMLEntity) {
              vrToolbarHTMLEntity.ExecuteJavaScript(jsCommand, '');
            }
          }

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

  addRemoteConsoleMessage(timestamp: any, sender: any, content: any): void {
    try {
      const mainToolbarId = WorldStorage.GetItem('MAIN-TOOLBAR-ID');
      if (!mainToolbarId) {
        Logging.LogError('❌ UIManager: MAIN-TOOLBAR-ID not found, cannot add remote console message');
        return;
      }

      const mainToolbar = Entity.Get(mainToolbarId) as HTMLEntity;
      if (!mainToolbar) {
        Logging.LogError('❌ UIManager: Main toolbar entity not found, cannot add remote console message');
        return;
      }

      // Call the Add Message API
      const jsCommand = `window.chatConsoleAPI.addMessage("${timestamp} [${sender}] ${content}");`;
      
      mainToolbar.ExecuteJavaScript(jsCommand, '');

      const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
      if (vrToolbarHTMLId) {
        const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId) as HTMLEntity;
        if (vrToolbarHTMLEntity) {
          vrToolbarHTMLEntity.ExecuteJavaScript(jsCommand, '');
        }
      }

      Logging.Log('✅ UIManager: Add remote console message command sent to UI space');
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      Logging.LogError('❌ UIManager: Error in addRemoteConsoleMessage: ' + errorMessage);
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

  /**
   * Public method to enable VR toolbar
   */
  static enableVRToolbar(): void {
    if (UIManager.instance) {
      UIManager.instance.enableVRToolbar();
    } else {
      Logging.Log('⚠️ UIManager: Cannot enable VR toolbar - UIManager not initialized');
    }
  }

  /**
   * Public method to disable VR toolbar
   */
  static disableVRToolbar(): void {
    if (UIManager.instance) {
      UIManager.instance.disableVRToolbar();
    } else {
      Logging.Log('⚠️ UIManager: Cannot disable VR toolbar - UIManager not initialized');
    }
  }

  // VR Toolbar methods
  public createVRToolbar(): void {
    if (this.clientType !== "full") {
      Logging.Log('VR toolbar creation skipped - not in VR client');
      return;
    }

    if (this.vrToolbar) {
      Logging.Log('VR toolbar already exists');
      return;
    }

    Logging.Log('Creating VR toolbar...');
    
    try {
      var containerId = UUID.NewUUID().ToString();

      if (!containerId) {
        Logging.LogError('Failed to generate VR toolbar container ID');
        return;
      }

      WorldStorage.SetItem("VR-TOOLBAR-CONTAINER-ID", containerId);

      ContainerEntity.Create(null, Vector3.zero, Quaternion.identity,
        new Vector3(0.1, 0.1, 0.1), false, null, containerId, "finishVRToolbarContainerSetup");
    } catch (error) {
      Logging.LogError('Error creating VR toolbar container: ' + error);
    }
  }

  public finishVRToolbarContainerSetup(): void {
    Logging.Log('Finishing VR toolbar container setup...');

    try {
      const containerId = WorldStorage.GetItem('VR-TOOLBAR-CONTAINER-ID');
      if (!containerId) {
        Logging.LogError('VR toolbar container ID not found');
        return;
      }

      const container = Entity.Get(containerId) as ContainerEntity;
      if (!container) {
        Logging.LogError('Failed to find VR toolbar container');
        return;
      }

      container.SetVisibility(true);

      const vrToolbarCanvasId = UUID.NewUUID().ToString();
      
      if (!vrToolbarCanvasId) {
        Logging.LogError('Failed to generate VR toolbar canvas ID');
        return;
      }

      WorldStorage.SetItem('VR-TOOLBAR-CANVAS-ID', vrToolbarCanvasId);
      
      // Create canvas entity for the VR toolbar
      const vrToolbarCanvas = CanvasEntity.Create(
        container,
        new Vector3(0, 1, 0.79),
        new Quaternion(0.3827, 0, 0, 0.9239),
        new Vector3(0.0038, 0.003, 0.004),
        false,
        vrToolbarCanvasId,
        'VRToolbar',
        'finishVRToolbarPanelSetup'
      );
      
      this.vrToolbar = vrToolbarCanvas; // Store reference for enable/disable
      
    } catch (error) {
      Logging.LogError('Error creating VR toolbar: ' + error);
    }
  }

  private finishVRToolbarPanelSetup(): void {
    if (this.vrToolbarInitialized) {
      return;
    }
    
    this.vrToolbarInitialized = true;
    
    try {
      const vrToolbarCanvasId = WorldStorage.GetItem('VR-TOOLBAR-CANVAS-ID');
      if (!vrToolbarCanvasId) {
        Logging.LogError('VR toolbar canvas ID not found');
        return;
      }
      
      const vrToolbarCanvas = Entity.Get(vrToolbarCanvasId) as CanvasEntity;
      if (!vrToolbarCanvas) {
        Logging.LogError('Failed to find VR toolbar canvas');
        return;
      }

      vrToolbarCanvas.SetInteractionState(InteractionState.Static);
      vrToolbarCanvas.MakeWorldCanvas();
      vrToolbarCanvas.SetVisibility(true);
      vrToolbarCanvas.SetSize(new Vector2(1000, 1079));
      Input.AddLeftHandFollower(vrToolbarCanvas.GetParent() as BaseEntity);
      
      const vrToolbarHTMLId = UUID.NewUUID().ToString();
      
      if (!vrToolbarHTMLId) {
        Logging.LogError('Failed to generate VR toolbar HTML ID');
        return;
      }

      WorldStorage.SetItem('VR-TOOLBAR-HTML-ID', vrToolbarHTMLId);
      
      HTMLEntity.Create(vrToolbarCanvas, new Vector2(0, 0),
        new Vector2(1, 1), vrToolbarHTMLId, 'VRToolbar', 'handleToolbarMessage',
        'finishVRToolbarCreation');
      
    } catch (error) {
      Logging.LogError('Error setting up VR toolbar HTML entity: ' + error);
    }
  }

  private finishVRToolbarSetup(): void {
    Logging.Log('Finishing VR toolbar setup...');
    
    setTimeout(() => {
      (globalThis as any).finishVRToolbarCreation();
    }, 500);
  }

  private finishVRToolbarCreation(): void {
    Logging.Log('Finalizing VR toolbar creation...');
    
    try {
      const vrToolbarHTMLId = WorldStorage.GetItem('VR-TOOLBAR-HTML-ID');
      if (!vrToolbarHTMLId) {
        Logging.LogError('VR toolbar HTML ID not found');
        return;
      }
      
      const vrToolbarHTMLEntity = Entity.Get(vrToolbarHTMLId) as HTMLEntity;
      if (!vrToolbarHTMLEntity) {
        Logging.LogError('VR toolbar HTML entity not found');
        return;
      }

      vrToolbarHTMLEntity.SetInteractionState(InteractionState.Static);      
      
      // Load the tools HTML page
      vrToolbarHTMLEntity.LoadFromURL('ui/build/index.html');
      
      Logging.Log('VR toolbar created and positioned successfully');
    } catch (error) {
      Logging.LogError('Error finalizing VR toolbar creation: ' + error);
    }
  }

  private handleVRToolbarMessage(msg: string): void {
    Logging.Log('VR toolbar message: ' + msg);
    
    try {
      const data = JSON.parse(msg);
      
      switch (data.action) {
        case 'ToggleFly':
          // Handle VR fly toggle
          Logging.Log('VR toggle fly mode');
          break;
        case 'Teleport':
          // Handle VR teleport
          Logging.Log('VR teleport action');
          break;
        case 'ObjectManipulation':
          // Handle VR object manipulation
          Logging.Log('VR object manipulation');
          break;
        default:
          Logging.Log('Unknown VR toolbar action: ' + data.action);
          break;
      }
    } catch (error) {
      Logging.LogError('Error parsing VR toolbar message: ' + error);
    }
  }

  public enableVRToolbar(): void {
    if (!this.vrToolbar) {
      this.createVRToolbar();
    } else {
      this.vrToolbar.SetActive(true);
    }
    Logging.Log('VR toolbar enabled');
  }

  public disableVRToolbar(): void {
    if (this.vrToolbar) {
      this.vrToolbar.SetActive(false);
    }
    Logging.Log('VR toolbar disabled');
  }
}