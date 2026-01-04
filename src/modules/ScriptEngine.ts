/**
 * Script Engine - Executes entity scripts
 */

export class ScriptEngine {
  private scripts: Map<string, [ BaseEntity, any ]> = new Map();
  private _0_25IntervalScripts: Map<string, any> = new Map();
  private _0_5IntervalScripts: Map<string, any> = new Map();
  private _1_0IntervalScripts: Map<string, any> = new Map();
  private _2_0IntervalScripts: Map<string, any> = new Map()

  constructor() {
    (globalThis as any).scriptEngine = this;

    Time.SetInterval("this.scriptEngine.handle0_25IntervalScripts();", 0.25);
    Time.SetInterval("this.scriptEngine.handle0_5IntervalScripts();", 0.5);
    Time.SetInterval("this.scriptEngine.handle1_0IntervalScripts();", 1);
    Time.SetInterval("this.scriptEngine.handle2_0IntervalScripts();", 2);
  }

  /**
   * Add a script entity
   */
  addScriptEntity(entity: BaseEntity, scripts: any): void {
    var newScriptId = entity.id.ToString();

    if (newScriptId === null) {
      Logging.LogError('Failed to add script entity: invalid entity ID');
      return;
    }
    this.scripts.set(newScriptId, [entity, scripts]);
  }

  /**
   * Remove a script entity
   */
  removeScriptEntity(entityId: string): void {
    const scriptData = this.scripts.get(entityId);
    if (scriptData) {
      const [ entity ] = scriptData;
      this.runOnDestroyScript(entity);
      this.removeIntervalScripts(entity);
      this.scripts.delete(entityId);
    }
  }

  /**
   * Run onCreate script
   */
  runOnCreateScript(entity: BaseEntity): void {
    if (this.scripts.has(entity.id.ToString()!)) {
      const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, any ];
      if (scriptEntity && scriptEntity[1]["on_create"]) {
        try {
          Scripting.RunScript(scriptEntity[1]["on_create"]);
        } catch (error) {
          Logging.LogError(`Error running onCreate script for ${entity.id.ToString()}:` + error);
        }
      }
    }
  }

  /**
   * Run onDestroy script
   */
  runOnDestroyScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, any ];
    if (scriptEntity && scriptEntity[1]["on_destroy"]) {
      try {
        Scripting.RunScript(scriptEntity[1]["on_destroy"]);
      } catch (error) {
        Logging.LogError(`Error running onDestroy script for ${entity.id.ToString()}:` + error);
      }
    }
  }

  /**
   * Run onPickup script
   */
  runOnPickupScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, any ];
    if (scriptEntity && scriptEntity[1]["on_pickup"]) {
      try {
        Scripting.RunScript(scriptEntity[1]["on_pickup"]);
      } catch (error) {
        Logging.LogError(`Error running onPickup script for ${entity.id.ToString()}:` + error);
      }
    }
  }

  /**
   * Run onPlace script
   */
  runOnPlaceScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, any ];
    if (scriptEntity && scriptEntity[1]["on_place"]) {
      try {
        Scripting.RunScript(scriptEntity[1]["on_place"]);
      } catch (error) {
        Logging.LogError(`Error running onPlace script for ${entity.id.ToString()}:` + error);
      }
    }
  }

  /**
   * Run onTouch script
   */
  runOnTouchScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, any ];
    if (scriptEntity && scriptEntity[1]["on_touch"]) {
      try {
        Scripting.RunScript(scriptEntity[1]["on_touch"]);
      } catch (error) {
        Logging.LogError(`Error running onTouch script for ${entity.id.ToString()}:` + error);
      }
    }
  }

  /**
   * Run onUntouch script
   */
  runOnUntouchScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, any ];
    if (scriptEntity && scriptEntity[1]["on_untouch"]) {
      try {
        Scripting.RunScript(scriptEntity[1]["on_untouch"]);
      } catch (error) {
        Logging.LogError(`Error running onUntouch script for ${entity.id.ToString()}:` + error);
      }
    }
  }

  /**
   * Add 0.25 second interval script
   */
  add0_25IntervalScript(entity: BaseEntity, script: any): void {
    var scriptId = entity.id.ToString();
    if (scriptId === null) {
      Logging.LogError('Failed to add 0.25 interval script: invalid entity ID');
      return;
    }
    this._0_25IntervalScripts.set(scriptId, [ entity, script ]);
  }

  /**
   * Remove 0.25 second interval script
   */
  remove0_25IntervalScript(entity: BaseEntity): void {
    var scriptId = entity.id.ToString();
    if (scriptId === null) {
      Logging.LogError('Failed to remove 0.25 interval script: invalid entity ID');
      return;
    }
    this._0_25IntervalScripts.delete(scriptId);
  }

  /**
   * Handle 0.25 second interval scripts
   */
  handle0_25IntervalScripts(): void {
    this._0_25IntervalScripts.forEach((value, key) => {
      const [ entity, script ] = value;
      try {
        Scripting.RunScript(script);
      } catch (error) {
        Logging.LogError(`Error running 0.25s interval script for ${key} ${entity.id.ToString()}:` + error);
      }
    });
  }

  /**
   * Add 0.5 second interval script
   */
  add0_5IntervalScript(entity: BaseEntity, script: any): void {
    var scriptId = entity.id.ToString();
    if (scriptId === null) {
      Logging.LogError('Failed to add 0.5 interval script: invalid entity ID');
      return;
    }
    this._0_5IntervalScripts.set(scriptId, [ entity, script ]);
  }

  /**
   * Remove 0.5 second interval script
   */
  remove0_5IntervalScript(entity: BaseEntity): void {
    var scriptId = entity.id.ToString();
    if (scriptId === null) {
      Logging.LogError('Failed to remove 0.5 interval script: invalid entity ID');
      return;
    }
    this._0_5IntervalScripts.delete(scriptId);
  }

  /**
   * Handle 0.5 second interval scripts
   */
  handle0_5IntervalScripts(): void {
    this._0_5IntervalScripts.forEach((value, key) => {
      const [ entity, script ] = value;
      try {
        Scripting.RunScript(script);
      } catch (error) {
        Logging.LogError(`Error running 0.5s interval script for ${key} ${entity.id.ToString()}:` + error);
      }
    });
  }

  /**
   * Add 1 second interval script
   */
  add1_0IntervalScript(entity: BaseEntity, script: any): void {
    var scriptId = entity.id.ToString();
    if (scriptId === null) {
      Logging.LogError('Failed to add 1.0 interval script: invalid entity ID');
      return;
    }
    this._1_0IntervalScripts.set(scriptId, [ entity, script ]);
  }

  /**
   * Remove 1 second interval script
   */
  remove1_0IntervalScript(entity: BaseEntity): void {
    var scriptId = entity.id.ToString();
    if (scriptId === null) {
      Logging.LogError('Failed to remove 1.0 interval script: invalid entity ID');
      return;
    }
    this._1_0IntervalScripts.delete(scriptId);
  }

  /**
   * Handle 1 second interval scripts
   */
  handle1_0IntervalScripts(): void {
    this._1_0IntervalScripts.forEach((value, key) => {
      const [ entity, script ] = value;
      try {
        Scripting.RunScript(script);
      } catch (error) {
        Logging.LogError(`Error running 1.0s interval script for ${key} ${entity.id.ToString()}:` + error);
      }
    });
  }

  /**
   * Add 2 second interval script
   */
  add2_0IntervalScript(entity: BaseEntity, script: any): void {
    var scriptId = entity.id.ToString();
    if (scriptId === null) {
      Logging.LogError('Failed to add 2.0 interval script: invalid entity ID');
      return;
    }
    this._2_0IntervalScripts.set(scriptId, [ entity, script ]);
  }

  /**
   * Remove 2 second interval script
   */
  remove2_0IntervalScript(entity: BaseEntity): void {
    var scriptId = entity.id.ToString();
    if (scriptId === null) {
      Logging.LogError('Failed to remove 2.0 interval script: invalid entity ID');
      return;
    }
    this._2_0IntervalScripts.delete(scriptId);
  }

  /**
   * Handle 2 second interval scripts
   */
  handle2_0IntervalScripts(): void {
    this._2_0IntervalScripts.forEach((value, key) => {
      const [ entity, script ] = value;
      try {
        Scripting.RunScript(script);
      } catch (error) {
        Logging.LogError(`Error running 2.0s interval script for ${key} ${entity.id.ToString()}:` + error);
      }
    });
  }

  /**
   * Remove interval scripts
   */
  removeIntervalScripts(entity: BaseEntity): void {
    this.remove0_25IntervalScript(entity);
    this.remove0_5IntervalScript(entity);
    this.remove1_0IntervalScript(entity);
    this.remove2_0IntervalScript(entity);
  }
}