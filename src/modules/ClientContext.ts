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
    this.api = new REST();
    this.config = new ConfigurationModule();
    this.identity = new Identity();
    this.entity = new EntityManager();
    this.input = new InputRouter();
    this.player = new PlayerController();
    this.script = new ScriptEngine();
    this.sync = new SyncManager();
    this.ui = new UIManager();
    this.worldRendering = new WorldRendererFactory();
    this.environmentModifier = new EnvironmentModifier();
  }

  /**
   * Initialize all modules
   */
  async initialize(): Promise<void> {
    console.log('Initializing modules...');
    this.input.initialize();
    console.log('All modules initialized');
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
