/**
 * MyWorlds TypeScript Client
 * Main entry point and public API
 */

/// <reference path="./types/worldapi.d.ts" />

// Main client
export { MyWorld, default } from './myworld';

// Types
export * from './types/config';
export * from './types/entity';

// API
export { REST } from './api/REST';

// Modules
export { ClientContext, Modules } from './modules/ClientContext';
export { Identity } from './modules/Identity';
export { ConfigurationModule } from './modules/ConfigurationModule';
export { EntityManager, EntityPlacement } from './modules/EntityManager';
export { InputRouter } from './modules/InputRouter';
export { PlayerController } from './modules/PlayerController';
export { ScriptEngine } from './modules/ScriptEngine';
export { SyncManager, SyncMsgHandler } from './modules/SyncManager';
export type { SyncMsgHandlerDependencies } from './modules/SyncManager';
export { UIManager } from './modules/UIManager';
export type { UIUpdateData } from './modules/UIManager';
export {
  WorldRendererFactory,
  WorldRendering,
  StaticSurfaceRenderer,
  TiledSurfaceRenderer,
  GlobeRenderer,
  AtmosphereRenderer,
  OrbitalRenderer,
  StellarSystemRenderer,
  GalacticRenderer,
  SunController
} from './modules/WorldRendererFactory';
export { EnvironmentModifier } from './modules/EnvironmentModifier';

// Utils
export { ProcessQueryParams } from './utils/ProcessQueryParams';

// Auto-initialize for browser usage - import the main file to trigger launch
import './myworld';