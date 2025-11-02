/**
 * Client Context - Central container for all modules
 */

import { REST } from '../api/REST';
import { ConfigurationModule } from './ConfigurationModule';
import { Identity } from './Identity';
import { EntityManager } from './EntityManager';
import { InputRouter } from './InputRouter';
import { PlayerController } from './PlayerController';
import { ScriptEngine } from './ScriptEngine';
import { SyncManager } from './SyncManager';
import { UIManager } from './UIManager';
import { WorldRendererFactory } from './WorldRendererFactory';
import { EnvironmentModifier } from './EnvironmentModifier';

/**
 * Modules container
 */
export class Modules {
  api: REST;
  config: ConfigurationModule;
  identity: Identity;
  entity: EntityManager;
  input: InputRouter;
  player: PlayerController;
  script: ScriptEngine;
  sync: SyncManager;
  ui: UIManager;
  worldRendering: WorldRendererFactory;
  environmentModifier: EnvironmentModifier;

  constructor() {
    try {
      Logging.Log('⚙️ Step 3a: Creating REST API module...');
      this.api = new REST();
      Logging.Log('⚙️ Step 3b: Creating Configuration module...');
      this.config = new ConfigurationModule();
      Logging.Log('⚙️ Step 3c: Creating Identity module...');
      this.identity = new Identity();
      Logging.Log('⚙️ Step 3d: Creating Entity Manager module...');
      this.entity = new EntityManager();
      Logging.Log('⚙️ Step 3e: Creating Input Router module...');
      this.input = new InputRouter();
      Logging.Log('⚙️ Step 3f: Creating Player Controller module...');
      this.player = new PlayerController(Vector3.zero, "UNSET", undefined);
      Logging.Log('⚙️ Step 3g: Creating Script Engine module...');
      this.script = new ScriptEngine();
      Logging.Log('⚙️ Step 3h: Creating Sync Manager module...');
      this.sync = new SyncManager();
      Logging.Log('⚙️ Step 3i: Creating UI Manager module...');
      this.ui = new UIManager();
      Logging.Log('⚙️ Step 3j: Creating World Renderer Factory module...');
      this.worldRendering = new WorldRendererFactory();
      // Store WorldRendererFactory in global context for entity instantiation callbacks
      Context.DefineContext('WorldRendererFactory', this.worldRendering);
      Logging.Log('⚙️ Step 3k: Creating Environment Modifier module...');
      this.environmentModifier = new EnvironmentModifier();
      Logging.Log('⚙️ All modules created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Error creating modules: ' + errorMessage);
      throw error;
    }
  }

  /**
   * Initialize all modules
   */
  async initialize(): Promise<void> {
    try {
      Logging.Log('⚙️ Step 3l: Starting module initialization...');
      Logging.Log('⚙️ Step 3m: Initializing input router...');
      this.input.initialize();
      Logging.Log('⚙️ All modules initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logging.LogError('❌ Error initializing modules: ' + errorMessage);
      throw error;
    }
  }

  /**
   * Clean up all modules
   */
  dispose(): void {
    this.input.dispose();
    this.script.dispose();
    this.sync.disconnect();
    this.ui.dispose();
    this.worldRendering.dispose();
  }
}

/**
 * Client Context
 */
export class ClientContext {
  modules: Modules;

  constructor() {
    this.modules = new Modules();
  }

  /**
   * Initialize all modules in the context
   */
  async initializeModules(): Promise<void> {
    await this.modules.initialize();
  }

  /**
   * Clean up context
   */
  dispose(): void {
    this.modules.dispose();
  }
}
