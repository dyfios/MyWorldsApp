import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScriptEngine } from '../modules/ScriptEngine';
import { EnvironmentModifier } from '../modules/EnvironmentModifier';
import { EntityPlacement } from '../modules/EntityManager';

class MockUUID {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  ToString(): string {
    return this.value;
  }
}

class MockVector3 {
  static zero = new MockVector3(0, 0, 0);
  static one = new MockVector3(1, 1, 1);
  static forward = new MockVector3(0, 0, 1);

  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class MockQuaternion {
  static identity = new MockQuaternion(0, 0, 0, 1);

  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x: number, y: number, z: number, w: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
}

class MockBaseEntity {
  id: MockUUID;
  tag: string;

  constructor(id: string) {
    this.id = new MockUUID(id);
    this.tag = id;
  }

  SetAnimationSpeed = vi.fn(() => true);
  PlayAnimation = vi.fn(() => true);
  StopAnimation = vi.fn(() => true);
  SetHighlight = vi.fn(() => true);
  SetInteractionState = vi.fn(() => true);
  SetPosition = vi.fn(() => true);
  SetRotation = vi.fn(() => true);
  SetParent = vi.fn(() => true);
  SetVisibility = vi.fn(() => true);
  Delete = vi.fn(() => true);

  GetPosition = vi.fn(() => new MockVector3(1, 2, 3));
  GetRotation = vi.fn(() => new MockQuaternion(0, 0, 0, 1));
}

class MockMeshEntity extends MockBaseEntity {}
class MockAutomobileEntity extends MockBaseEntity {}
class MockAirplaneEntity extends MockBaseEntity {}
class MockTerrainEntity extends MockBaseEntity {}

describe('script event wiring', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    (globalThis as any).Logging = {
      Log: vi.fn(),
      LogError: vi.fn(),
      LogWarning: vi.fn()
    };

    (globalThis as any).Time = {
      SetInterval: vi.fn(() => new MockUUID('interval-id')),
      SetTimeout: vi.fn(),
      StopInterval: vi.fn()
    };

    (globalThis as any).Scripting = {
      RunScript: vi.fn()
    };

    (globalThis as any).Entity = {
      Get: vi.fn(),
      GetByTag: vi.fn()
    };

    (globalThis as any).Input = {
      GetPointerRaycast: vi.fn(() => null)
    };

    (globalThis as any).Camera = {
      GetPosition: vi.fn(() => new MockVector3(0, 1.7, 0)),
      GetRotation: vi.fn(() => new MockQuaternion(0, 0, 0, 1)),
      GetRaycast: vi.fn(() => null)
    };

    const storage = new Map<string, string>();
    (globalThis as any).WorldStorage = {
      GetItem: vi.fn((key: string) => storage.get(key) ?? null),
      SetItem: vi.fn((key: string, value: string) => storage.set(key, value))
    };

    (globalThis as any).Context = {
      DefineContext: vi.fn(),
      GetContext: vi.fn(() => ({}))
    };

    (globalThis as any).InteractionState = {
      Hidden: 0,
      Static: 1,
      Physical: 2,
      Placing: 3
    };

    (globalThis as any).Vector3 = MockVector3;
    (globalThis as any).Quaternion = MockQuaternion;
    (globalThis as any).UUID = {
      NewUUID: () => new MockUUID('generated-id')
    };

    (globalThis as any).MeshEntity = MockMeshEntity;
    (globalThis as any).AutomobileEntity = MockAutomobileEntity;
    (globalThis as any).AirplaneEntity = MockAirplaneEntity;
    (globalThis as any).TerrainEntity = MockTerrainEntity;

    (globalThis as any).tiledsurfacerenderer = null;
  });

  it('runs on_use scripts with self injection', () => {
    const engine = new ScriptEngine();
    const entity = new MockMeshEntity('door-1') as unknown as BaseEntity;

    engine.addScriptEntity(entity, { on_use: 'self.PlayAnimation("Open");' });
    engine.runOnUseScript(entity);

    const runScript = (globalThis as any).Scripting.RunScript as ReturnType<typeof vi.fn>;
    expect(runScript).toHaveBeenCalledTimes(1);
    const payload = runScript.mock.calls[0][0] as string;
    expect(payload).toContain('var self = Entity.Get("door-1");');
    expect(payload).toContain('self.PlayAnimation("Open");');
  });

  it('dispatches use scripts from mouse and trigger presses', () => {
    const scriptEngine = {
      runOnUseScript: vi.fn(),
      runOnTouchScript: vi.fn(),
      runOnUntouchScript: vi.fn()
    };
    (globalThis as any).scriptEngine = scriptEngine;

    const env = new EnvironmentModifier();
    (globalThis as any).setInteractionMode('HAND');

    const door = new MockMeshEntity('door-2');
    (globalThis as any).Input.GetPointerRaycast = vi.fn(() => ({ entity: door }));

    (globalThis as any).handleLeftPress();
    (globalThis as any).handleRightPress();
    env.processTriggerPress();

    expect(scriptEngine.runOnUseScript).toHaveBeenCalledTimes(3);
    expect(scriptEngine.runOnUseScript).toHaveBeenCalledWith(door);
  });

  it('dispatches touch and untouch only on hover transitions', () => {
    const scriptEngine = {
      runOnUseScript: vi.fn(),
      runOnTouchScript: vi.fn(),
      runOnUntouchScript: vi.fn()
    };
    (globalThis as any).scriptEngine = scriptEngine;

    const env = new EnvironmentModifier();
    (globalThis as any).setInteractionMode('HAND');
    (globalThis as any).uiManager = { clientType: 'full' };

    const doorA = new MockMeshEntity('door-a');
    const doorB = new MockMeshEntity('door-b');

    let currentHit: any = { entity: doorA };
    (globalThis as any).Input.GetPointerRaycast = vi.fn(() => currentHit);

    env.processTouchHover();
    env.processTouchHover();
    currentHit = { entity: doorB };
    env.processTouchHover();
    currentHit = null;
    env.processTouchHover();

    expect(scriptEngine.runOnTouchScript).toHaveBeenCalledTimes(2);
    expect(scriptEngine.runOnTouchScript).toHaveBeenNthCalledWith(1, doorA);
    expect(scriptEngine.runOnTouchScript).toHaveBeenNthCalledWith(2, doorB);

    expect(scriptEngine.runOnUntouchScript).toHaveBeenCalledTimes(2);
    expect(scriptEngine.runOnUntouchScript).toHaveBeenNthCalledWith(1, doorA);
    expect(scriptEngine.runOnUntouchScript).toHaveBeenNthCalledWith(2, doorB);
  });

  it('runs on_pickup and on_place scripts during placement flow', () => {
    const scriptEngine = {
      addScriptEntity: vi.fn(),
      runOnCreateScript: vi.fn(),
      runOnPickupScript: vi.fn(),
      runOnPlaceScript: vi.fn(),
      add0_25IntervalScript: vi.fn(),
      add0_5IntervalScript: vi.fn(),
      add1_0IntervalScript: vi.fn(),
      add2_0IntervalScript: vi.fn()
    };
    (globalThis as any).scriptEngine = scriptEngine;

    const placement = new EntityPlacement();
    placement.keepSpawning = false;

    const entity = new MockMeshEntity('placement-door') as unknown as BaseEntity;

    placement.startPlacing(
      entity,
      'mesh',
      1,
      1,
      'entity-id',
      'variant-id',
      'door.glb',
      null,
      0,
      { on_pickup: 'self.PlayAnimation("Lift");', on_place: 'self.PlayAnimation("Drop");' },
      'instance-1'
    );

    expect(scriptEngine.runOnPickupScript).toHaveBeenCalledTimes(1);
    expect(scriptEngine.runOnPickupScript).toHaveBeenCalledWith(entity);

    placement.stopPlacing();

    expect(scriptEngine.runOnPlaceScript).toHaveBeenCalledTimes(1);
    expect(scriptEngine.runOnPlaceScript).toHaveBeenCalledWith(entity);
  });

  it('runs on_destroy path before deleting entity', () => {
    const removeScriptEntity = vi.fn();
    (globalThis as any).entityManager = {
      isEntityFrozen: () => false,
      removeScriptEntity
    };

    const env = new EnvironmentModifier();
    const entity = new MockMeshEntity('door-delete') as unknown as BaseEntity;

    env.deleteEntity(entity);

    expect(removeScriptEntity).toHaveBeenCalledTimes(1);
    expect(removeScriptEntity).toHaveBeenCalledWith('door-delete');
    expect((entity as any).Delete).toHaveBeenCalledWith(true);
  });
});
