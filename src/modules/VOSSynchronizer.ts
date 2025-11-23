/**
 * VOSSynchronizer - TypeScript wrapper for WebVerse WorldSync API
 * Provides high-level abstraction for WorldSync protocol communication
 */

import { SyncManager } from "./SyncManager";

export interface VOSSynchronizerConfig {
    host: string;
    port: number;
    tls: boolean;
    sessionId: string;
    sessionTag: string;
    transport?: VSSTransport;
}

export interface VOSMessage {
    type: string;
    data?: any;
    sessionId?: string;
    entityId?: string;
    timestamp?: number;
}

export interface VOSSessionMessage extends VOSMessage {
    sessionId: string;
}

export interface VOSEntityMessage extends VOSMessage {
    entityId: string;
    position?: Vector3;
    rotation?: { x: number; y: number; z: number; w: number };
    scale?: Vector3;
}

export class VOSSynchronizer {
    public onConnected = null;
    public onJoinSession = null;
    public onMessage = null;
    private config: VOSSynchronizerConfig;
    private isConnected: boolean = false;
    private messageHandlers: Map<string, ((message: VOSMessage) => void)[]> = new Map();
    private sessionMessageHandlers: Map<string, ((message: VOSSessionMessage) => void)[]> = new Map();
    private entitySyncCallbacks: Map<string, (entity: any) => void> = new Map();

    constructor(config: VOSSynchronizerConfig, onConnected = null, onJoinSession = null, onMessage: any = null) {
        this.config = config;
        this.onConnected = onConnected;
        this.onJoinSession = onJoinSession;
        this.onMessage = onMessage;
        (globalThis as any).wsync_instance = this; // TODO: clean up, this will get overwritten for each instance.
    }

    /**
     * Connect to the VOS server
     * @returns Promise that resolves when connection is established
     */
    public async Connect(): Promise<boolean> {
        try {
            const userId: string = this.getUserId();
            const userToken: string = this.getUserToken();

            const onJoinAction = `
                if (this.wsync_instance.onConnected != null) {
                    this.wsync_instance.onConnected();
                }
                
                if (this.wsync_instance.onMessage != null) {
                    VOSSynchronization.RegisterMessageCallback(this.wsync_instance.config.sessionId, this.wsync_instance.onMessage);
                }

                Logging.Log('[VOSSynchronization:Connect] Joined Session');
                if (this.wsync_instance.onJoinSession != null) {
                    this.wsync_instance.onJoinSession();
                }
            `;

            VOSSynchronization.JoinSession(this.config.host, this.config.port,
                this.config.tls, this.config.sessionId, this.config.sessionTag,
                onJoinAction, this.config.transport, userId, userToken);
            
            return true;
        } catch (error) {
            console.error('VOSSynchronizer: Connection error:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Disconnect from the VOS server
     */
    public Disconnect(): void {
        this.isConnected = false;
        this.messageHandlers.clear();
        this.sessionMessageHandlers.clear();
        this.entitySyncCallbacks.clear();
        console.log('VOSSynchronizer: Disconnected');
    }

    /**
     * Check if connected to VOS server
     */
    public IsConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Send a message through the VOS protocol
     * @param message The message to send
     */
    public SendMessage(topic: string, message: string): boolean {
        return VOSSynchronization.SendMessage(this.config.sessionId, "CONSOLE." + topic, message);
    }

    /**
     * Send a session-specific message
     * @param message The session message to send
     */
    public SendSessionMessage(messageType: string, content: string): boolean {
        if (!this.config.sessionId) {
            console.warn('VOSSynchronizer: Cannot send session message - no session to send message to');
            return false;
        }

        // For CMD type, send the command with '/' prefix, for MSG type send as-is
        const messageContent = messageType === "CMD" ? "/" + content : content;

        const userId: string = this.getUserId();
        const userToken: string = this.getUserToken();

        const messageData = {
            "client-id": userId,
            "client-token": userToken,
            "topic": "chat",
            "message": messageContent
        };

        return VOSSynchronization.SendMessage(this.config.sessionId, "MESSAGE.CREATE", JSON.stringify(messageData));
    }

    public AddEntity(entityID: string, deleteWithClient: boolean = false, resources: string[] | undefined = undefined) {
        VOSSynchronization.StartSynchronizingEntity(this.config.sessionId, entityID, deleteWithClient, undefined, resources);
    }

    public SendEntityAddUpdate(sessionID: string, entityID: string, position: Vector3, rotation: Quaternion) {
        var messageInfo = {
            id: entityID,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: rotation.x,
                y: rotation.y,
                z: rotation.z,
                w: rotation.w
            }
        };

        VOSSynchronization.SendMessage(sessionID, "ENTITY.ADD", JSON.stringify(messageInfo));
    }

    public SendEntityDeleteUpdate(sessionID: string, entityID: string) {
        var messageInfo = {
            id: entityID
        };
        
        VOSSynchronization.SendMessage(sessionID, "ENTITY.DELETE", JSON.stringify(messageInfo));
    }

    public SendEntityMoveUpdate(sessionID: string, entityID: string, position: Vector3, rotation: Quaternion) {
        var messageInfo = {
            id: entityID,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: rotation.x,
                y: rotation.y,
                z: rotation.z,
                w: rotation.w
            }
        };
        
        VOSSynchronization.SendMessage(sessionID, "ENTITY.MOVE", JSON.stringify(messageInfo));
    }

    public SendTerrainDigUpdate(sessionID: string, position: Vector3, brushType: string, lyr: number) {
        var messageInfo = {
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            brushType: "'" + brushType + "'",
            lyr: lyr
        };
        
        VOSSynchronization.SendMessage(sessionID, "TERRAIN.EDIT.DIG", JSON.stringify(messageInfo));
    }

    public SendTerrainBuildUpdate(sessionID: string, position: Vector3, brushType: string, lyr: number) {
        var messageInfo = {
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            brushType: "'" + brushType + "'",
            lyr: lyr
        };
        
        VOSSynchronization.SendMessage(sessionID, "TERRAIN.EDIT.BUILD", JSON.stringify(messageInfo));
    }

    public SendGlobalMessage(content: any) {
        var globalSync = ((globalThis as any).syncManager as SyncManager).globalSynchronizer;

        if (!globalSync) {
            console.warn('VOSSynchronizer: Cannot send global message - no global synchronizer available');
            return;
        }

        const messageData = {
            "client-id": globalSync?.getUserId(),
            "client-token": globalSync?.getUserToken(),
            "client-tag": globalSync?.getUserTag(),
            "topic": "chat",
            "message": content
        };
        
        VOSSynchronization.SendMessage(globalSync.config.sessionId,
            "MESSAGE.CREATE", JSON.stringify(messageData));
    }

    public SendGlobalCommand(command: any) {
        var globalSync = ((globalThis as any).syncManager as SyncManager).globalSynchronizer;

        if (!globalSync) {
            console.warn('VOSSynchronizer: Cannot send global message - no global synchronizer available');
            return;
        }

        const messageData = {
            "client-id": globalSync?.getUserId(),
            "client-token": globalSync?.getUserToken(),
            "topic": "chat",
            "message": "/" + command
        };
        
        VOSSynchronization.SendMessage(globalSync.config.sessionId,
            "MESSAGE.CREATE", JSON.stringify(messageData));
    }

    /**
     * Register a handler for incoming messages of a specific type
     * @param messageType The type of message to handle
     * @param handler The handler function
     */
    public OnMessage(messageType: string, handler: (message: VOSMessage) => void): void {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType)!.push(handler);
    }

    /**
     * Register a handler for incoming session messages of a specific type
     * @param messageType The type of session message to handle
     * @param handler The handler function
     */
    public OnSessionMessage(messageType: string, handler: (message: VOSSessionMessage) => void): void {
        if (!this.sessionMessageHandlers.has(messageType)) {
            this.sessionMessageHandlers.set(messageType, []);
        }
        this.sessionMessageHandlers.get(messageType)!.push(handler);
    }

    /**
     * Register a callback for entity synchronization
     * @param entityId The ID of the entity to sync
     * @param callback The callback function
     */
    public RegisterEntitySync(entityId: string, callback: (entity: any) => void): void {
        this.entitySyncCallbacks.set(entityId, callback);
    }

    /**
     * Unregister entity synchronization
     * @param entityId The ID of the entity to stop syncing
     */
    public UnregisterEntitySync(entityId: string): void {
        this.entitySyncCallbacks.delete(entityId);
    }

    /**
     * Handle incoming entity updates
     * @param entityId The ID of the entity
     * @param entityData The updated entity data
     */
    public HandleEntityUpdate(entityId: string, entityData: any): void {
        const callback = this.entitySyncCallbacks.get(entityId);
        if (callback) {
            callback(entityData);
        }
    }

    /**
     * Get current session configuration
     */
    public GetConfig(): VOSSynchronizerConfig {
        return { ...this.config };
    }

    /**
     * Update session configuration
     * @param newConfig Partial configuration to update
     */
    public UpdateConfig(newConfig: Partial<VOSSynchronizerConfig>): void {
        this.config = { ...this.config, ...newConfig };
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
   * Get user Tag for API requests
   * @returns User Tag from Identity module if authenticated
   */
    private getUserTag(): string {
      // Access Identity from global context if available
      try {
        const contextUser = Context.GetContext('MW_TOP_LEVEL_CONTEXT');
        if (contextUser && contextUser.userTag) {
          return contextUser.userTag;
        }
      } catch (error) {
        Logging.LogWarning('🔍 StaticSurfaceRenderer: Could not get user Tag from context: ' + error);
      }
  
      // Return empty string if not authenticated (no fallback)
      return "";
    }
}

export default VOSSynchronizer;