/**
 * Synchronization module - Handles real-time updates across clients
 */

import { EntityManager } from './EntityManager';
import { PlayerController } from './PlayerController';
import { UIManager } from './UIManager';
import { WorldRendererFactory } from './WorldRendererFactory';
import VOSSynchronizer, { VOSSynchronizerConfig, VOSMessage } from './VOSSynchronizer';

export interface SyncDiff {
  type: string;
  data: any;
  timestamp: number;
}

export class SyncManager {
  public globalSynchronizer: VOSSynchronizer | null = null;
  private listeners: ((diff: SyncDiff) => void)[] = [];
  private connected: boolean = false;
  private vosSynchronizer?: VOSSynchronizer;
  private syncConfig?: VOSSynchronizerConfig;

  constructor(syncConfig?: VOSSynchronizerConfig) {
    this.syncConfig = syncConfig;
    (globalThis as any).syncManager = this;
  }

  connectToGlobalSynchronizer(worldConfig: any, onConnect: any, onJoinSession: any): void {
    const globalSyncConfig: VOSSynchronizerConfig = {
      host: worldConfig["vos-synchronization-service"]["host"],
      port: worldConfig["vos-synchronization-service"]["port"],
      tls: worldConfig["vos-synchronization-service"]["tls"],
      sessionId: worldConfig["vos-synchronization-service"]["global-session-id"],
      sessionTag: worldConfig["vos-synchronization-service"]["global-session-tag"],
      transport: worldConfig["vos-synchronization-service"]["transport"].toLowerCase() === 'tcp'
        ? VSSTransport.TCP : VSSTransport.WebSocket
    };
    
    try {
      this.globalSynchronizer = new VOSSynchronizer(globalSyncConfig, onConnect, onJoinSession, this.onVSSMessage);
      this.globalSynchronizer.Connect();
    } catch (error) {
      Logging.LogError('Failed to create global synchronizer: ' + error);
    }
  }

  onVSSMessage(topic: string, sender: string, msg: string): void {
    const clientID = this.getUserId();
    // Filter messages from this client.
    if (clientID == sender && !topic.startsWith("PLAYER")) {
        return;
    }
    
    if (topic === "TERRAIN.EDIT.DIG") {
        var msgFields = JSON.parse(msg);
        
        if (msgFields.position === null || msgFields.position.x === null || msgFields.position.y === null || msgFields.position.z === null) {
            Logging.LogError("OnVSSMessage: Terrain edit dig message missing position.");
            return;
        }
        
        if (msgFields.brushType === null) {
            Logging.LogError("OnVSSMessage: Terrain edit dig message missing brushType.");
            return;
        }
        
        if (msgFields.lyr === null) {
            Logging.LogError("OnVSSMessage: Terrain edit dig message missing lyr.");
            return;
        }
        
        var brushType = TerrainEntityBrushType.sphere;
        if (msgFields.brushType === "sphere") {
            brushType = TerrainEntityBrushType.sphere;
        }
        else if (msgFields.brushType === "roundedcube") {
            brushType = TerrainEntityBrushType.roundedCube;
        }

        var terrainEntity: TerrainEntity = (globalThis as any).tiledsurfacerenderer_getTerrainTileForIndex(
          (globalThis as any).tiledsurfacerenderer_getRegionIndexForWorldPos(
            new Vector3(msgFields.position.x, msgFields.position.y, msgFields.position.z)));
        var regionPos = (globalThis as any).tiledsurfacerenderer_getRegionPosForWorldPos(
          new Vector3(msgFields.position.x, msgFields.position.y, msgFields.position.z));
        terrainEntity.Dig(regionPos, brushType, msgFields.lyr, 1, false); // TODO handle brush size
    }
    else if (topic === "TERRAIN.EDIT.BUILD") {
        var msgFields = JSON.parse(msg);
        
        if (msgFields.position === null || msgFields.position.x === null || msgFields.position.y === null || msgFields.position.z === null) {
            Logging.LogError("OnVSSMessage: Terrain edit build message missing position.");
            return;
        }
        
        if (msgFields.brushType === null) {
            Logging.LogError("OnVSSMessage: Terrain edit build message missing brushType.");
            return;
        }
        
        if (msgFields.lyr === null) {
            Logging.LogError("OnVSSMessage: Terrain edit build message missing lyr.");
            return;
        }
        
        var brushType = TerrainEntityBrushType.sphere;
        if (msgFields.brushType === "sphere") {
            brushType = TerrainEntityBrushType.sphere;
        }
        else if (msgFields.brushType === "roundedcube") {
            brushType = TerrainEntityBrushType.roundedCube;
        }
        
        var terrainEntity: TerrainEntity = (globalThis as any).tiledsurfacerenderer_getTerrainTileForIndex(
          (globalThis as any).tiledsurfacerenderer_getRegionIndexForWorldPos(
            new Vector3(msgFields.position.x, msgFields.position.y, msgFields.position.z)));
        var regionPos = (globalThis as any).tiledsurfacerenderer_getRegionPosForWorldPos(
          new Vector3(msgFields.position.x, msgFields.position.y, msgFields.position.z));
        terrainEntity.Build(regionPos, brushType, msgFields.lyr, 1, false); // TODO handle brush size
    }
    else if (topic === "MESSAGE.CREATE") {
        msgFields = JSON.parse(msg);
        
        if (!msgFields.hasOwnProperty("message")) {
            Logging.LogError("OnVSSMessage: Message missing message field.");
            return;
        }
        
        if (!msgFields.hasOwnProperty("client-id")) {
            Logging.LogError("OnVSSMessage: Message missing client-id.");
            return;
        }
        
        var message = msgFields.message;
        var clientId = msgFields["client-id"];
        var clientTag = msgFields["client-tag"];

        // Check if this message is from the current client.
        if (clientId == clientID) {
            return;
        }

        var senderName = clientId === "system" ? "System" : `${clientTag}`;
        var timestamp = (Date as any).now.ToTimeString();
        
        // Check if this is a command response (sent by system)
        if (msgFields.hasOwnProperty("is-command-response") && msgFields["is-command-response"] === true) {
            // This is a command response, only show it to the original sender
            // The server already handles this, so just display it
            ((globalThis as any).uiManager as UIManager).addRemoteConsoleMessage(timestamp, senderName, message);
        } else {
            // Regular message, display to all
            ((globalThis as any).uiManager as UIManager).addRemoteConsoleMessage(timestamp, senderName, message);
        }
    }
    else if (topic === "SESSION.MESSAGE") {
        msgFields = JSON.parse(msg);
        
        if (!msgFields.hasOwnProperty("type")) {
            Logging.LogError("OnVSSMessage: Session message missing type.");
            return;
        }
        
        if (!msgFields.hasOwnProperty("content")) {
            Logging.LogError("OnVSSMessage: Session message missing content.");
            return;
        }
        
        if (!msgFields.hasOwnProperty("client-id")) {
            Logging.LogError("OnVSSMessage: Session message missing client-id.");
            return;
        }
        
        var messageType = msgFields.type.toUpperCase();
        var content = msgFields.content;
        var clientId = msgFields["client-id"];
        
        if (messageType === "MSG") {
            // Handle MSG messages by logging to console
            var senderName = clientId === "system" ? "System" : `Client ${clientId}`;
            var timestamp = (Date as any).now.ToTimeString();
            
            // Use the dedicated console message function
            ((globalThis as any).uiManager as UIManager).addRemoteConsoleMessage(timestamp, senderName, content);
        }
        // CMD messages are handled server-side and don't need client processing
    }
    else if (topic === "PLAYER.TELEPORT") {
        msgFields = JSON.parse(msg);
        
        if (!msgFields.hasOwnProperty("action") || msgFields.action !== "player-teleport") {
            Logging.LogError("OnVSSMessage: Invalid teleport message action.");
            return;
        }
        
        if (!msgFields.hasOwnProperty("position")) {
            Logging.LogError("OnVSSMessage: Teleport message missing position.");
            return;
        }
        
        if (!msgFields.hasOwnProperty("client-id")) {
            Logging.LogError("OnVSSMessage: Teleport message missing client-id.");
            return;
        }
        
        var position = msgFields.position;
        var clientId = msgFields["client-id"];
        
        // Validate position data
        if (typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
            Logging.LogError("OnVSSMessage: Invalid teleport position coordinates.");
            return;
        }
        
        // Get the current client context to check if this teleport is for us
        var vosContext = Context.GetContext("VOSSynchronizationContext");
        
        if (vosContext && vosContext.clientID === clientId) {
            // This teleport is for our client - update our position
            var playerModule = Context.GetContext("PLAYER_MODULE");
            
            if (playerModule && playerModule.thirdPersonCharacterController && playerModule.thirdPersonCharacterController.characterEntity) {
                // Convert world coordinates to rendered coordinates accounting for world offset
                var worldPosition = new Vector3(position.x, position.y, position.z);
                var renderedPosition = (globalThis as any).tiledsurfacerender.getRenderedPositionForWorldPosition(worldPosition);
                
                Logging.Log(`[Teleport] Moving player to world position: ${position.x}, ${position.y}, ${position.z} (rendered: ${renderedPosition.x}, ${renderedPosition.y}, ${renderedPosition.z})`);
                
                // Update character position using rendered coordinates
                (globalThis as any).setMotionModeFree();
                (globalThis as any).setCharacterPosition(renderedPosition);
                
                // Update camera if needed
                // Camera position will be automatically updated by the character controller
            } else {
                Logging.LogError("OnVSSMessage: Unable to teleport - player module or character not available.");
            }
        } else {
            // This teleport is for another client - we might want to update their representation
            // For now, just log it
            Logging.Log(`[Teleport] Client ${clientId} teleported to position: ${position.x}, ${position.y}, ${position.z}`);
        }
      }
  }

  /**
   * Connect to synchronization service
   */
  async connectToSynchronizers(): Promise<void> {
    Logging.Log('Connecting to synchronizers...');
    
    if (this.syncConfig) {
      try {
        this.vosSynchronizer = new VOSSynchronizer(this.syncConfig);
        
        // Setup message handlers
        this.vosSynchronizer.OnMessage('entity_update', (message: VOSMessage) => {
          this.handleSyncMessage({
            type: 'entity_update',
            data: message.data,
            timestamp: message.timestamp || (Date as any).now
          });
        });
        
        this.vosSynchronizer.OnMessage('player_update', (message: VOSMessage) => {
          this.handleSyncMessage({
            type: 'player_update',
            data: message.data,
            timestamp: message.timestamp || (Date as any).now
          });
        });
        
        this.vosSynchronizer.OnMessage('ui_update', (message: VOSMessage) => {
          this.handleSyncMessage({
            type: 'ui_update',
            data: message.data,
            timestamp: message.timestamp || (Date as any).now
          });
        });
        
        this.connected = await this.vosSynchronizer.Connect();
        
        if (this.connected) {
          Logging.Log('Connected to VOS synchronizers');
        } else {
          Logging.LogError('Failed to connect to VOS synchronizers');
        }
      } catch (error) {
        Logging.LogError('Error connecting to VOS synchronizers: ' + error);
        this.connected = false;
      }
    } else {
      // Fallback to simulation mode
      this.connected = true;
      Logging.Log('Connected to synchronizers (simulation mode)');
    }
  }

  /**
   * Subscribe to sync updates
   */
  subscribe(listener: (diff: SyncDiff) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Unsubscribe from sync updates
   */
  unsubscribe(listener: (diff: SyncDiff) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Publish a diff to other clients
   */
  publish(diff: SyncDiff): void {
    if (!this.connected) {
      Logging.LogWarning('Cannot publish: not connected to synchronizers');
      return;
    }
    
    if (this.vosSynchronizer) {
      // Send through VOS
      const vosMessage: VOSMessage = {
        type: diff.type,
        data: diff.data,
        timestamp: diff.timestamp
      };
      
      const success = this.vosSynchronizer.SendMessage(vosMessage);
      if (success) {
        Logging.Log('Published VOS sync diff: ' + JSON.stringify(diff));
      } else {
        Logging.LogError('Failed to publish VOS sync diff');
      }
    } else {
      // Fallback to simulation mode
      Logging.Log('Publishing sync diff (simulation): ' + JSON.stringify(diff));
      
      // For simulation, notify local listeners
      this.handleSyncMessage(diff);
    }
  }

  /**
   * Handle incoming sync message
   */
  private handleSyncMessage(diff: SyncDiff): void {
    this.listeners.forEach(listener => listener(diff));
  }

  /**
   * Disconnect from synchronizers
   */
  disconnect(): void {
    if (this.vosSynchronizer) {
      this.vosSynchronizer.Disconnect();
      this.vosSynchronizer = undefined;
    }
    
    this.connected = false;
    this.listeners = [];
    Logging.Log('Disconnected from synchronizers');
  }

  /**
   * Sync an entity through VOS
   */
  syncEntity(entityId: string, entityData: any): boolean {
    if (!this.connected || !this.vosSynchronizer) {
      Logging.LogWarning('Cannot sync entity: not connected to VOS');
      return false;
    }
    
    return this.vosSynchronizer.SyncEntity(entityId, entityData);
  }

  /**
   * Register entity sync callback
   */
  registerEntitySync(entityId: string, callback: (entity: any) => void): void {
    if (this.vosSynchronizer) {
      this.vosSynchronizer.RegisterEntitySync(entityId, callback);
    }
  }

  /**
   * Unregister entity sync callback
   */
  unregisterEntitySync(entityId: string): void {
    if (this.vosSynchronizer) {
      this.vosSynchronizer.UnregisterEntitySync(entityId);
    }
  }

  /**
   * Check if connected to VOS
   */
  isVOSConnected(): boolean {
    return this.vosSynchronizer?.IsConnected() || false;
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
}

export interface SyncMsgHandlerDependencies {
  entityManager?: EntityManager;
  playerController?: PlayerController;
  uiManager?: UIManager;
  worldRendererFactory?: WorldRendererFactory;
}

export class SyncMsgHandler {
  setDependencies(_deps: SyncMsgHandlerDependencies): void {
    // Dependencies would be stored for use in handlers
  }

  /**
   * Handle sync diff notification
   */
  notify(diff: SyncDiff): void {
    switch (diff.type) {
      case 'entity_update':
        this.applyEntityUpdates(diff.data);
        break;
      case 'player_update':
        this.applyPlayerState(diff.data);
        break;
      case 'ui_update':
        this.triggerUIUpdates(diff.data);
        break;
      default:
        Logging.LogWarning('Unknown sync diff type:' + diff.type);
    }
  }

  private applyEntityUpdates(data: any): void {
    Logging.Log('Applying entity updates: ' + JSON.stringify(data));
    // Would integrate with EntityManager
  }

  private applyPlayerState(data: any): void {
    Logging.Log('Applying player state: ' + JSON.stringify(data));
    // Would integrate with PlayerController
  }

  private triggerUIUpdates(data: any): void {
    Logging.Log('Triggering UI updates: ' + JSON.stringify(data));
    // Would integrate with UIManager
    this.scheduleFrameUpdate();
  }

  private scheduleFrameUpdate(): void {
    // Schedule next frame update
    requestAnimationFrame(() => {
      Logging.Log('Frame update scheduled');
    });
  }
}