/**
 * VOSSynchronizer - TypeScript wrapper for WebVerse WorldSync API
 * Provides high-level abstraction for WorldSync protocol communication
 */

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
    public SendMessage(message: VOSMessage): boolean {
        if (!this.isConnected) {
            console.warn('VOSSynchronizer: Cannot send message - not connected');
            return false;
        }

        try {
            // Add timestamp if not provided
            if (!message.timestamp) {
                message.timestamp = Date.now();
            }

            // Note: The WebVerse VOSSynchronization API may have additional methods
            // for sending messages that aren't exposed in the current API definition.
            // This implementation provides the structure for when those methods become available.
            
            console.log('VOSSynchronizer: Sending message:', message);
            
            // Trigger local handlers for testing/development
            this.handleIncomingMessage(message);
            
            return true;
        } catch (error) {
            console.error('VOSSynchronizer: Error sending message:', error);
            return false;
        }
    }

    /**
     * Send a session-specific message
     * @param message The session message to send
     */
    public SendSessionMessage(message: VOSSessionMessage): boolean {
        if (!this.isConnected) {
            console.warn('VOSSynchronizer: Cannot send session message - not connected');
            return false;
        }

        // Ensure session ID matches
        message.sessionId = this.config.sessionId;
        
        return this.SendMessage(message);
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
     * Sync an entity's state across the network
     * @param entityId The ID of the entity
     * @param entityData The entity data to sync
     */
    public SyncEntity(entityId: string, entityData: any): boolean {
        const message: VOSEntityMessage = {
            type: 'entity_sync',
            entityId,
            data: entityData,
            timestamp: Date.now()
        };

        if (entityData.position) {
            message.position = entityData.position;
        }
        if (entityData.rotation) {
            message.rotation = entityData.rotation;
        }
        if (entityData.scale) {
            message.scale = entityData.scale;
        }

        return this.SendMessage(message);
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
     * Handle incoming messages (internal processing)
     * @param message The incoming message
     */
    private handleIncomingMessage(message: VOSMessage): void {
        // Handle general message handlers
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(message);
                } catch (error) {
                    console.error('VOSSynchronizer: Error in message handler:', error);
                }
            });
        }

        // Handle session message handlers
        if (message.sessionId === this.config.sessionId) {
            const sessionHandlers = this.sessionMessageHandlers.get(message.type);
            if (sessionHandlers) {
                sessionHandlers.forEach(handler => {
                    try {
                        handler(message as VOSSessionMessage);
                    } catch (error) {
                        console.error('VOSSynchronizer: Error in session message handler:', error);
                    }
                });
            }
        }

        // Handle entity updates
        if (message.type === 'entity_sync' && message.entityId) {
            this.HandleEntityUpdate(message.entityId, message.data);
        }
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
}

export default VOSSynchronizer;