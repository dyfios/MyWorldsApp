/**
 * Script Engine - Executes entity scripts
 */

export interface ScriptEntity {
  entityId: string;
  onCreate?: () => void;
  onUpdate?: (deltaTime: number) => void;
  onDestroy?: () => void;
  intervals?: Array<{
    callback: () => void;
    intervalMs: number;
    handle?: number;
  }>;
}

export class ScriptEngine {
  private scriptEntities: Map<string, ScriptEntity> = new Map();

  /**
   * Add a script entity
   */
  addScriptEntity(entity: ScriptEntity): void {
    this.scriptEntities.set(entity.entityId, entity);
    this.runOnCreateScript(entity);
    this.addIntervalScripts(entity);
  }

  /**
   * Remove a script entity
   */
  removeScriptEntity(entityId: string): void {
    const entity = this.scriptEntities.get(entityId);
    if (entity) {
      this.runOnDestroyScript(entity);
      this.clearIntervalScripts(entity);
      this.scriptEntities.delete(entityId);
    }
  }

  /**
   * Run onCreate script
   */
  private runOnCreateScript(entity: ScriptEntity): void {
    if (entity.onCreate) {
      try {
        entity.onCreate();
      } catch (error) {
        console.error(`Error running onCreate script for ${entity.entityId}:`, error);
      }
    }
  }

  /**
   * Run onDestroy script
   */
  private runOnDestroyScript(entity: ScriptEntity): void {
    if (entity.onDestroy) {
      try {
        entity.onDestroy();
      } catch (error) {
        console.error(`Error running onDestroy script for ${entity.entityId}:`, error);
      }
    }
  }

  /**
   * Add interval scripts
   */
  private addIntervalScripts(entity: ScriptEntity): void {
    if (entity.intervals) {
      entity.intervals.forEach(interval => {
        interval.handle = window.setInterval(interval.callback, interval.intervalMs);
      });
    }
  }

  /**
   * Clear interval scripts
   */
  private clearIntervalScripts(entity: ScriptEntity): void {
    if (entity.intervals) {
      entity.intervals.forEach(interval => {
        if (interval.handle !== undefined) {
          clearInterval(interval.handle);
        }
      });
    }
  }

  /**
   * Update all script entities
   */
  update(deltaTime: number): void {
    this.scriptEntities.forEach(entity => {
      if (entity.onUpdate) {
        try {
          entity.onUpdate(deltaTime);
        } catch (error) {
          console.error(`Error running onUpdate script for ${entity.entityId}:`, error);
        }
      }
    });
  }

  /**
   * Clean up all scripts
   */
  dispose(): void {
    this.scriptEntities.forEach(entity => {
      this.runOnDestroyScript(entity);
      this.clearIntervalScripts(entity);
    });
    this.scriptEntities.clear();
  }
}
