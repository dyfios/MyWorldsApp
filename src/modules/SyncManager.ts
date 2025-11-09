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
  private listeners: ((diff: SyncDiff) => void)[] = [];
  private connected: boolean = false;
  private vosSynchronizer?: VOSSynchronizer;
  private syncConfig?: VOSSynchronizerConfig;

  constructor(syncConfig?: VOSSynchronizerConfig) {
    this.syncConfig = syncConfig;
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
            timestamp: message.timestamp || Date.now()
          });
        });
        
        this.vosSynchronizer.OnMessage('player_update', (message: VOSMessage) => {
          this.handleSyncMessage({
            type: 'player_update',
            data: message.data,
            timestamp: message.timestamp || Date.now()
          });
        });
        
        this.vosSynchronizer.OnMessage('ui_update', (message: VOSMessage) => {
          this.handleSyncMessage({
            type: 'ui_update',
            data: message.data,
            timestamp: message.timestamp || Date.now()
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
