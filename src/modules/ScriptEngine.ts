/**
 * Script Engine - Executes entity scripts
 */

import { EntityScriptMap } from '../types/scripts';

export class ScriptEngine {
  private scripts: Map<string, [ BaseEntity, EntityScriptMap ]> = new Map();
  private _0_25IntervalScripts: Map<string, [ BaseEntity, string ]> = new Map();
  private _0_5IntervalScripts: Map<string, [ BaseEntity, string ]> = new Map();
  private _1_0IntervalScripts: Map<string, [ BaseEntity, string ]> = new Map();
  private _2_0IntervalScripts: Map<string, [ BaseEntity, string ]> = new Map();
  private useDebounceMs: number = 200;
  private lastUseByEntityId: Map<string, number> = new Map();

  /**
   * Run a script with `self` bound to the entity that owns the script.
   * This keeps entity scripts simple and avoids relying on implicit Jint globals.
   */
  private runScriptWithSelf(entity: BaseEntity, script: string | undefined, context: string, logErrors: boolean = true): void {
    if (script == null || script.trim() === '') {
      if (logErrors) {
        Logging.LogWarning(`[ScriptEngine] skipped ${context}: empty script`);
      }
      return;
    }

    const entityId = entity.id.ToString();
    if (entityId == null || entityId === '') {
      if (logErrors) {
        Logging.LogError(`Failed to run ${context} script: invalid entity ID`);
      }
      return;
    }

    const selfEntity = Entity.Get(entityId);
    if (selfEntity == null) {
      if (logErrors) {
        Logging.LogWarning(`[ScriptEngine] preflight ${context}: Entity.Get(${entityId}) returned null; continuing`);
      }
    }

    const escapedEntityId = entityId.split('\\').join('\\\\').split('"').join('\\"');
    const wrappedScript = `(function() {\n`
      + `  var self = Entity.Get("${escapedEntityId}");\n`
      + `  if (self == null) { return; }\n`
      + `${script}\n`
      + `})();`;

    try {
      Logging.Log('[ScriptEngine] dispatch ' + context + ' for entity=' + entityId);
      Scripting.RunScript(wrappedScript);
      Logging.Log('[ScriptEngine] completed ' + context + ' for entity=' + entityId);
    } catch (error) {
      if (logErrors) {
        Logging.LogError(`Error running ${context} script for ${entityId}: ` + error);
      }
    }
  }

  constructor() {
    (globalThis as any).scriptEngine = this;

    // One-command runtime helpers for animation smoke testing.
    (globalThis as any).MW_AnimationSmokeTest = (entityTag: string, animationName: string = 'Idle', speed: number = 1, stopAfterSeconds: number = 0) => {
      this.runAnimationSmokeTest(entityTag, animationName, speed, stopAfterSeconds);
    };
    (globalThis as any).MW_AnimationSelfSmoke = (entityTag: string, animationName: string = 'Idle', speed: number = 1) => {
      this.runAnimationSelfSmoke(entityTag, animationName, speed);
    };

    (globalThis as any).MW_DumpScriptRegistration = (entityId?: string) => {
      this.dumpScriptRegistration(entityId);
    };

    Time.SetInterval("this.scriptEngine.handle0_25IntervalScripts();", 0.25);
    Time.SetInterval("this.scriptEngine.handle0_5IntervalScripts();", 0.5);
    Time.SetInterval("this.scriptEngine.handle1_0IntervalScripts();", 1);
    Time.SetInterval("this.scriptEngine.handle2_0IntervalScripts();", 2);
  }

  /**
   * Add a script entity
   */
  addScriptEntity(entity: BaseEntity, scripts: EntityScriptMap): void {
    var newScriptId = entity.id.ToString();

    if (newScriptId === null) {
      Logging.LogError('Failed to add script entity: invalid entity ID');
      return;
    }

    const hadExisting = this.scripts.has(newScriptId);
    const keys = Object.keys(scripts || {});
    const keyPreview = keys.slice(0, 16);
    Logging.Log('[ScriptEngine] register entity=' + newScriptId
      + ' hadExisting=' + hadExisting
      + ' keyCount=' + keys.length
      + ' keysPreview=' + (keyPreview.length > 0 ? keyPreview.join(',') : '(none)')
      + ' mapSizeBefore=' + this.scripts.size);

    this.scripts.set(newScriptId, [entity, scripts]);

    Logging.Log('[ScriptEngine] register complete entity=' + newScriptId + ' mapSizeAfter=' + this.scripts.size);
  }

  /**
   * Remove a script entity
   */
  removeScriptEntity(entityId: string): void {
    Logging.Log('[ScriptEngine] remove requested entity=' + entityId + ' mapSizeBefore=' + this.scripts.size);
    const scriptData = this.scripts.get(entityId);
    if (scriptData) {
      const [ entity ] = scriptData;
      this.runOnDestroyScript(entity);
      this.removeIntervalScripts(entity);
      this.scripts.delete(entityId);
      Logging.Log('[ScriptEngine] remove complete entity=' + entityId + ' mapSizeAfter=' + this.scripts.size);
      return;
    }

    Logging.LogWarning('[ScriptEngine] remove skipped: entity not registered ' + entityId);
  }

  /**
   * Run onCreate script
   */
  runOnCreateScript(entity: BaseEntity): void {
    if (this.scripts.has(entity.id.ToString()!)) {
      const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, EntityScriptMap ];
      if (scriptEntity && scriptEntity[1]["on_create"]) {
        this.runScriptWithSelf(entity, scriptEntity[1]["on_create"], 'onCreate');
      }
    }
  }

  /**
   * Run onDestroy script
   */
  runOnDestroyScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, EntityScriptMap ];
    if (scriptEntity && scriptEntity[1]["on_destroy"]) {
      this.runScriptWithSelf(entity, scriptEntity[1]["on_destroy"], 'onDestroy');
    }
  }

  /**
   * Run onPickup script
   */
  runOnPickupScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, EntityScriptMap ];
    if (scriptEntity && scriptEntity[1]["on_pickup"]) {
      this.runScriptWithSelf(entity, scriptEntity[1]["on_pickup"], 'onPickup');
    }
  }

  /**
   * Run onPlace script
   */
  runOnPlaceScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, EntityScriptMap ];
    if (scriptEntity && scriptEntity[1]["on_place"]) {
      this.runScriptWithSelf(entity, scriptEntity[1]["on_place"], 'onPlace');
    }
  }

  /**
   * Run onTouch script
   */
  runOnTouchScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, EntityScriptMap ];
    if (scriptEntity && scriptEntity[1]["on_touch"]) {
      this.runScriptWithSelf(entity, scriptEntity[1]["on_touch"], 'onTouch');
    }
  }

  /**
   * Run onUntouch script
   */
  runOnUntouchScript(entity: BaseEntity): void {
    const scriptEntity = this.scripts.get(entity.id.ToString()!) as [ BaseEntity, EntityScriptMap ];
    if (scriptEntity && scriptEntity[1]["on_untouch"]) {
      this.runScriptWithSelf(entity, scriptEntity[1]["on_untouch"], 'onUntouch');
    }
  }

  /**
   * Run onUse script
   */
  runOnUseScript(entity: BaseEntity): void {
    const entityId = entity.id.ToString()!;

    // WebVerse's Jint runtime exposes `Date.now` as a property returning a Date
    // object (NOT a callable function like browser JS). Compute a monotonic
    // millisecond-of-day value for debouncing.
    const d: any = (Date as any).now;
    const now = ((d.hour * 60 + d.minute) * 60 + d.second) * 1000 + d.millisecond;
    const last = this.lastUseByEntityId.get(entityId);
    if (last != null && (now - last) >= 0 && (now - last) < this.useDebounceMs) {
      Logging.Log('[ScriptEngine] runOnUseScript: debounced entity=' + entityId + ' deltaMs=' + (now - last));
      return;
    }
    this.lastUseByEntityId.set(entityId, now);

    Logging.Log('[ScriptEngine] runOnUseScript lookup entity=' + entityId + ' registered=' + this.scripts.has(entityId));
    let scriptEntity = this.scripts.get(entityId) as [ BaseEntity, EntityScriptMap ];
    if (!scriptEntity) {
      const scriptsByInstanceId = (globalThis as any).entityScriptsByInstanceId;
      const fallbackScripts = scriptsByInstanceId ? scriptsByInstanceId[entityId] as EntityScriptMap | undefined : undefined;
      if (fallbackScripts && Object.keys(fallbackScripts).length > 0) {
        Logging.Log('[ScriptEngine] runOnUseScript: lazy-registering from entityScriptsByInstanceId for ' + entityId);
        this.addScriptEntity(entity, fallbackScripts);
        scriptEntity = this.scripts.get(entityId) as [ BaseEntity, EntityScriptMap ];
      }
    }

    if (!scriptEntity) {
      const fallbackMap = ((globalThis as any).entityScriptsByInstanceId || {}) as Record<string, EntityScriptMap>;
      const fallbackKnown = fallbackMap[entityId] != null;
      const onUseRegisteredIds = Array.from(this.scripts.entries())
        .filter(([, value]) => {
          const scripts = value[1];
          return scripts != null && typeof scripts["on_use"] === 'string' && scripts["on_use"]!.trim() !== '';
        })
        .map(([id]) => id);
      const preview = onUseRegisteredIds.slice(0, 8).join(',');
      const entityTag = (entity as any)?.tag || '(none)';
      const entityType = (entity as any)?.constructor?.name || '(unknown)';
      Logging.LogWarning('[ScriptEngine] runOnUseScript miss entity=' + entityId
        + ' tag=' + entityTag
        + ' type=' + entityType
        + ' fallbackKnown=' + fallbackKnown
        + ' onUseRegisteredCount=' + onUseRegisteredIds.length
        + ' onUsePreview=' + (preview || '(none)'));
      return;
    }

    const onUseScript = scriptEntity[1]["on_use"];
    if (!onUseScript || onUseScript.trim() === '') {
      Logging.LogWarning('[ScriptEngine] runOnUseScript: on_use missing/empty for ' + entityId);
      return;
    }

    const onUsePreview = onUseScript.slice(0, 120);
    Logging.Log('[ScriptEngine] runOnUseScript payload entity=' + entityId
      + ' length=' + onUseScript.length
      + ' preview=' + onUsePreview);

    Logging.Log('[ScriptEngine] runOnUseScript: executing on_use for ' + entityId);
    this.runScriptWithSelf(entity, onUseScript, 'onUse');
  }

  private dumpScriptRegistration(entityId?: string): void {
    const scriptsByInstanceId = (globalThis as any).entityScriptsByInstanceId || {};
    const registeredKeys = Array.from(this.scripts.keys());
    const fallbackKeys = Object.keys(scriptsByInstanceId);

    Logging.Log('[ScriptEngine] dump registration: registeredCount=' + registeredKeys.length
      + ' fallbackCount=' + fallbackKeys.length);

    if (entityId && entityId.trim() !== '') {
      const inRegistered = this.scripts.has(entityId);
      const inFallback = scriptsByInstanceId[entityId] != null;
      const fallbackScript = scriptsByInstanceId[entityId] as EntityScriptMap | undefined;
      const fallbackScriptKeys = fallbackScript ? Object.keys(fallbackScript) : [];
      Logging.Log('[ScriptEngine] dump entity=' + entityId
        + ' inRegistered=' + inRegistered
        + ' inFallback=' + inFallback
        + ' fallbackKeys=' + (fallbackScriptKeys.length > 0 ? fallbackScriptKeys.join(',') : '(none)'));
      return;
    }

    const previewRegistered = registeredKeys.slice(0, 10);
    const previewFallback = fallbackKeys.slice(0, 10);
    Logging.Log('[ScriptEngine] dump registeredPreview=' + (previewRegistered.length > 0 ? previewRegistered.join(',') : '(none)'));
    Logging.Log('[ScriptEngine] dump fallbackPreview=' + (previewFallback.length > 0 ? previewFallback.join(',') : '(none)'));
  }

  /**
   * Add 0.25 second interval script
   */
  add0_25IntervalScript(entity: BaseEntity, script: string): void {
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
    // Logging.Log('🟢 handle0_25IntervalScripts() START');
    try {
      this._0_25IntervalScripts.forEach((value, _key) => {
        const [ entity, script ] = value;
        this.runScriptWithSelf(entity, script, '0.25s interval');
      });
    } catch (e) {
      // Silently ignore
    }
    // Logging.Log('🟢 handle0_25IntervalScripts() END');
  }

  /**
   * Add 0.5 second interval script
   */
  add0_5IntervalScript(entity: BaseEntity, script: string): void {
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
    // Logging.Log('🟡 handle0_5IntervalScripts() START');
    try {
      this._0_5IntervalScripts.forEach((value, _key) => {
        const [ entity, script ] = value;
        this.runScriptWithSelf(entity, script, '0.5s interval', false);
      });
    } catch (error) {
      // Silently ignore iteration errors
    }
    // Logging.Log('🟡 handle0_5IntervalScripts() END');
  }

  /**
   * Add 1 second interval script
   */
  add1_0IntervalScript(entity: BaseEntity, script: string): void {
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
    // Logging.Log('🟠 handle1_0IntervalScripts() START');
    try {
      this._1_0IntervalScripts.forEach((value, _key) => {
        const [ entity, script ] = value;
        this.runScriptWithSelf(entity, script, '1.0s interval', false);
      });
    } catch (error) {
      // Silently ignore iteration errors
    }
    // Logging.Log('🟠 handle1_0IntervalScripts() END');
  }

  /**
   * Add 2 second interval script
   */
  add2_0IntervalScript(entity: BaseEntity, script: string): void {
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
    // Logging.Log('🔴 handle2_0IntervalScripts() START');
    try {
      this._2_0IntervalScripts.forEach((value, _key) => {
        const [ entity, script ] = value;
        this.runScriptWithSelf(entity, script, '2.0s interval', false);
      });
    } catch (error) {
      // Silently ignore iteration errors
    }
    // Logging.Log('🔴 handle2_0IntervalScripts() END');
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

  /**
   * Runtime smoke test helper: directly animates an entity by tag.
   */
  runAnimationSmokeTest(entityTag: string, animationName: string = 'Idle', speed: number = 1, stopAfterSeconds: number = 0): boolean {
    if (!entityTag || !animationName) {
      Logging.LogError('MW_AnimationSmokeTest: entityTag and animationName are required');
      return false;
    }

    const entity = Entity.GetByTag(entityTag);
    if (entity == null) {
      Logging.LogError(`MW_AnimationSmokeTest: entity not found for tag ${entityTag}`);
      return false;
    }

    entity.SetAnimationSpeed(animationName, speed);
    const started = entity.PlayAnimation(animationName);
    Logging.Log(`MW_AnimationSmokeTest: tag=${entityTag} animation=${animationName} speed=${speed} started=${started}`);

    if (started && stopAfterSeconds > 0) {
      const escTag = entityTag.split('\\').join('\\\\').split('"').join('\\"');
      const escAnim = animationName.split('\\').join('\\\\').split('"').join('\\"');
      Time.SetTimeout(`
        var e = Entity.GetByTag("${escTag}");
        if (e != null) { e.StopAnimation("${escAnim}"); }
      `, stopAfterSeconds);
    }

    return started;
  }

  /**
   * Runtime smoke test helper: validates `self` injection by running a script body.
   */
  runAnimationSelfSmoke(entityTag: string, animationName: string = 'Idle', speed: number = 1): boolean {
    if (!entityTag || !animationName) {
      Logging.LogError('MW_AnimationSelfSmoke: entityTag and animationName are required');
      return false;
    }

    const entity = Entity.GetByTag(entityTag);
    if (entity == null) {
      Logging.LogError(`MW_AnimationSelfSmoke: entity not found for tag ${entityTag}`);
      return false;
    }

    const escapedAnimationName = animationName.split('\\').join('\\\\').split('"').join('\\"');
    const script = `self.SetAnimationSpeed("${escapedAnimationName}", ${speed}); self.PlayAnimation("${escapedAnimationName}");`;
    this.runScriptWithSelf(entity, script, 'animation self smoke test');
    Logging.Log(`MW_AnimationSelfSmoke: tag=${entityTag} animation=${animationName} speed=${speed}`);
    return true;
  }
}