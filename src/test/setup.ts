// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * Test setup - Mock WebVerse runtime APIs that don't exist in test environment
 */

import { vi, beforeEach } from 'vitest';

// Mock Logging global
(globalThis as any).Logging = {
  Log: vi.fn(),
  LogError: vi.fn(),
  LogWarning: vi.fn(),
};

// Mock WorldStorage global
(globalThis as any).WorldStorage = {
  SetItem: vi.fn(),
  GetItem: vi.fn(),
};

// Mock Entity global with a registry so Entity.Get can return entities created by CanvasEntity.Create / HTMLEntity.Create
const _entityRegistry = new Map<string, any>();
(globalThis as any)._entityRegistry = _entityRegistry;
(globalThis as any).Entity = {
  Get: vi.fn((id: string) => _entityRegistry.get(id) || null),
  Create: vi.fn(),
};

// Mock HTMLEntity class — instances can ExecuteJavaScript, LoadFromURL, Delete, etc.
class MockHTMLEntity {
  id: string;
  ExecuteJavaScript: ReturnType<typeof vi.fn>;
  LoadFromURL: ReturnType<typeof vi.fn>;
  LoadHTML: ReturnType<typeof vi.fn>;
  Delete: ReturnType<typeof vi.fn>;
  SetVisibility: ReturnType<typeof vi.fn>;
  SetInteractionState: ReturnType<typeof vi.fn>;
  constructor(id?: string) {
    this.id = id || 'html-' + Math.random();
    this.ExecuteJavaScript = vi.fn().mockReturnValue(true);
    this.LoadFromURL = vi.fn().mockReturnValue(true);
    this.LoadHTML = vi.fn().mockReturnValue(true);
    this.Delete = vi.fn().mockReturnValue(true);
    this.SetVisibility = vi.fn().mockReturnValue(true);
    this.SetInteractionState = vi.fn().mockReturnValue(true);
  }
}
(MockHTMLEntity as any).Create = vi.fn((...args: any[]) => {
  // Support both overloads: (parent, pos, rot, scale, isSize, id, ...) and (parent, posPercent, sizePercent, id, ...)
  const id = typeof args[3] === 'string' ? args[3] : (typeof args[5] === 'string' ? args[5] : undefined);
  const entity = new MockHTMLEntity(id);
  if (id) _entityRegistry.set(id, entity);
  return entity;
});
(globalThis as any).HTMLEntity = MockHTMLEntity;

// Mock CanvasEntity class
class MockCanvasEntity {
  id: string;
  MakeScreenCanvas: ReturnType<typeof vi.fn>;
  MakeWorldCanvas: ReturnType<typeof vi.fn>;
  SetInteractionState: ReturnType<typeof vi.fn>;
  SetVisibility: ReturnType<typeof vi.fn>;
  SetSize: ReturnType<typeof vi.fn>;
  Delete: ReturnType<typeof vi.fn>;
  constructor(id?: string) {
    this.id = id || 'canvas-' + Math.random();
    this.MakeScreenCanvas = vi.fn();
    this.MakeWorldCanvas = vi.fn();
    this.SetInteractionState = vi.fn();
    this.SetVisibility = vi.fn();
    this.SetSize = vi.fn();
    this.Delete = vi.fn().mockReturnValue(true);
  }
}
(MockCanvasEntity as any).Create = vi.fn((...args: any[]) => {
  const id = typeof args[5] === 'string' ? args[5] : undefined;
  const entity = new MockCanvasEntity(id);
  if (id) _entityRegistry.set(id, entity);
  return entity;
});
(globalThis as any).CanvasEntity = MockCanvasEntity;

// Mock Quaternion global
(globalThis as any).Quaternion = class Quaternion {
  x: number; y: number; z: number; w: number;
  constructor(x: number, y: number, z: number, w: number) {
    this.x = x; this.y = y; this.z = z; this.w = w;
  }
  static get identity() { return new (globalThis as any).Quaternion(0, 0, 0, 1); }
  static FromEulerAngles = vi.fn((x: number, y: number, z: number) => new (globalThis as any).Quaternion(x, y, z, 1));
  static CreateLookRotation = vi.fn((_forward: any, _up?: any) => new (globalThis as any).Quaternion(0, 0, 0, 1));
};

// Mock Context global
(globalThis as any).Context = {
  DefineContext: vi.fn(),
  GetContext: vi.fn(),
};

// Mock InteractionState global
(globalThis as any).InteractionState = {
  Static: 0,
  Interactable: 1,
};

// Mock Vector2 global
(globalThis as any).Vector2 = class Vector2 {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
};

// Mock Vector3 global
(globalThis as any).Vector3 = class Vector3 {
  x: number;
  y: number;
  z: number;
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  static get zero() {
    return new (globalThis as any).Vector3(0, 0, 0);
  }
  static get forward() {
    return new (globalThis as any).Vector3(0, 0, 1);
  }
  static get one() {
    return new (globalThis as any).Vector3(1, 1, 1);
  }
  static get up() {
    return new (globalThis as any).Vector3(0, 1, 0);
  }
};

// Mock Input global
(globalThis as any).Input = {
  leftVRPointerMode: 0,
  joystickMotionEnabled: true,
  IsVR: false,
  GetPointerRaycast: vi.fn(),
  VRPointerMode: {
    None: 0,
    Teleport: 1,
  },
  SetLook: vi.fn(),
};

// Mock Camera global (GetPosition / GetRotation — GetForward does NOT exist in WebVerse)
(globalThis as any).Camera = {
  GetPosition: vi.fn((_local?: boolean) => new (globalThis as any).Vector3(0, 1.7, 0)),
  GetRotation: vi.fn((_local?: boolean) => new (globalThis as any).Quaternion(0, 0, 0, 1)),
};

// Mock ContainerEntity class
class MockContainerEntity {
  id: string;
  Delete: ReturnType<typeof vi.fn>;
  SetVisibility: ReturnType<typeof vi.fn>;
  constructor(id?: string) {
    this.id = id || 'container-' + Math.random();
    this.Delete = vi.fn().mockReturnValue(true);
    this.SetVisibility = vi.fn().mockReturnValue(true);
  }
}
(MockContainerEntity as any).Create = vi.fn((...args: any[]) => {
  const id = typeof args[5] === 'string' ? args[5] : undefined;
  const entity = new MockContainerEntity(id);
  if (id) _entityRegistry.set(id, entity);
  return entity;
});
(globalThis as any).ContainerEntity = MockContainerEntity;

// Mock Time global
const mockIntervalUUID = { ToString: () => 'mock-interval-uuid' };
(globalThis as any).Time = {
  SetTimeout: vi.fn(),
  SetInterval: vi.fn().mockReturnValue(mockIntervalUUID),
  StopInterval: vi.fn().mockReturnValue(true),
};

// Mock entity instance data store (for frozen/locked lookups)
(globalThis as any)._entityInstanceDataStore = new Map<string, any>();

// Mock entity type hierarchy (for instanceof checks)
class MockBaseEntity {
  id: string;
  _highlight: boolean = false;
  SetHighlight: ReturnType<typeof vi.fn>;
  GetHighlight: ReturnType<typeof vi.fn>;
  SetPosition: ReturnType<typeof vi.fn>;
  SetRotation: ReturnType<typeof vi.fn>;
  SetEulerRotation: ReturnType<typeof vi.fn>;
  GetEulerRotation: ReturnType<typeof vi.fn>;
  SetScale: ReturnType<typeof vi.fn>;
  GetScale: ReturnType<typeof vi.fn>;
  Delete: ReturnType<typeof vi.fn>;
  constructor(id?: string) {
    this.id = id || 'entity-' + Math.random();
    this.SetHighlight = vi.fn((h: boolean) => { this._highlight = h; return true; });
    this.GetHighlight = vi.fn(() => this._highlight);
    this.SetPosition = vi.fn().mockReturnValue(true);
    this.SetRotation = vi.fn().mockReturnValue(true);
    this.SetEulerRotation = vi.fn().mockReturnValue(true);
    this.GetEulerRotation = vi.fn(() => new (globalThis as any).Vector3(0, 0, 0));
    this.SetScale = vi.fn().mockReturnValue(true);
    this.GetScale = vi.fn(() => new (globalThis as any).Vector3(1, 1, 1));
    this.Delete = vi.fn().mockReturnValue(true);
  }
}

class MockMeshEntity extends MockBaseEntity {}
class MockAutomobileEntity extends MockBaseEntity {}
class MockAirplaneEntity extends MockBaseEntity {}
class MockTerrainEntity extends MockBaseEntity {}
class MockLightEntity extends MockBaseEntity {}
class MockAudioEntity extends MockBaseEntity {}
class MockCharacterEntity extends MockBaseEntity {}

(globalThis as any).BaseEntity = MockBaseEntity;
(globalThis as any).MeshEntity = MockMeshEntity;
(globalThis as any).AutomobileEntity = MockAutomobileEntity;
(globalThis as any).AirplaneEntity = MockAirplaneEntity;
(globalThis as any).TerrainEntity = MockTerrainEntity;
(globalThis as any).LightEntity = MockLightEntity;
(globalThis as any).AudioEntity = MockAudioEntity;
(globalThis as any).CharacterEntity = MockCharacterEntity;

// Mock UUID global — generates unique IDs so entity registry entries don't collide
let _uuidCounter = 0;
(globalThis as any).UUID = {
  NewUUID: vi.fn(() => {
    const id = `mock-uuid-${++_uuidCounter}`;
    return { ToString: () => id };
  }),
};

// Mock Date extensions used by WebVerse
(globalThis as any).Date.Now = {
  ToTimeString: vi.fn(() => '12:00:00'),
};

// Mock World global
(globalThis as any).World = {
  GetQueryParam: vi.fn().mockReturnValue(null),
  LoadWorld: vi.fn(),
  GetWorldLoadState: vi.fn().mockReturnValue('loadedworld'),
};

// Scope-boundary spies
(globalThis as any).fetch = vi.fn();
(globalThis as any).VOSSynchronization = {
  SendMessage: vi.fn(),
  IsSessionEstablished: vi.fn().mockReturnValue(true),
};

// Mock HTTPNetworking global
class MockFetchRequestOptions {
  body: string = '';
  cache: string = '';
  credentials: string = '';
  headers: string[] = [];
  keepalive: boolean = false;
  method: string = 'GET';
  mode: string = '';
  priority: string = '';
  redirect: string = '';
  referrer: string = '';
  referrerPolicy: string = '';
}
(globalThis as any).HTTPNetworking = {
  Fetch: vi.fn(),
  Post: vi.fn(),
  FetchRequestOptions: MockFetchRequestOptions,
};

// Global per-test cleanup
beforeEach(() => {
  _entityRegistry.clear();
  (globalThis as any)._entityInstanceDataStore.clear();

  (globalThis as any).Camera.GetPosition.mockImplementation(
    (_local?: boolean) => new (globalThis as any).Vector3(0, 1.7, 0),
  );
  (globalThis as any).Camera.GetRotation.mockImplementation(
    (_local?: boolean) => new (globalThis as any).Quaternion(0, 0, 0, 1),
  );

  // Reset platform indicators so each test starts on desktop unless it
  // explicitly opts in to VR / touch.
  const g = globalThis as any;
  g.Input.IsVR = false;
  delete g.isTouchPlatform;
  delete g.mobileControlShiftDown;
});
