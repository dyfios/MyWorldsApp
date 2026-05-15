# Tech Spec: New Entity Types — Phase 1 (world-space)

**Status:** Draft
**Author:** Barry (Quick Flow)
**Date:** 2026-04-16
**Target:** `WorldHub/MyWorldsApp`

---

## 1. Problem

`EntityManager.loadEntity` supports only `mesh`, `automobile`, and `airplane`. The WebVerse Script API exposes many more entity classes (`LightEntity`, `AudioEntity`, `ContainerEntity`, `VoxelEntity`, `TextEntity`, `ImageEntity`, `ButtonEntity`, `InputEntity`, `DropdownEntity`, `WaterEntity`, `WaterBlockerEntity`). Users authoring worlds have no way to place any of them, limiting world expressiveness.

## 2. Goal

Ship a first batch of new placeable types that mirror the existing `mesh` pipeline: a `loadEntity` case, per-type load callback, template schema support, and a smoke-test fixture. Start with types that drop into world space at a `Vector3` — no canvas nesting required.

**Non-goals:**
- Canvas-nested types (`text`, `image`, `button`, `input`, `dropdown`). They're implicitly compound (need a `CanvasEntity` host) — deferred to Phase 1b after compound support lands.
- In-world property editors. V1 uses prefab-style variants where the template bakes type-specific params.
- Server-side template schema changes beyond additive fields. The existing `/list-entity-templates` response gains optional per-type properties.
- Backwards-incompatible changes to `loadEntity` signature.

## 3. Scope

| Type | WebVerse class | Create signature shape | Post-create setup | Phase 1? |
|---|---|---|---|---|
| `light` | `LightEntity` | `(parent, position, rotation, ...)` | color, intensity, range, lightType via props | ✅ |
| `audio` | `AudioEntity` | `(parent, position, rotation, ...)` | clip URL, loop, volume via props | ✅ |
| `container` | `ContainerEntity` | `(parent, position, rotation, scale, ...)` | none | ✅ |
| `voxel` | `VoxelEntity` | `(parent, position, rotation, scale, ...)` | voxel data via props | ✅ |
| `water` | `WaterEntity` | jsonEntity-only | complex — deferred | ❌ Phase 2 |
| `text` / `image` / UI | canvas-nested | `positionPercent`/`sizePercent` | needs canvas host | ❌ Phase 1b (compound) |

## 4. Design

### 4.1 Type system changes (`src/types/entity.ts`)

Extend the union and add per-type data interfaces:

```ts
export type EntityType =
  | 'mesh' | 'automobile' | 'airplane'
  | 'light' | 'audio' | 'container' | 'voxel';

export interface LightEntityData extends BaseEntity {
  type: 'light';
  lightType?: 'point' | 'spot' | 'directional';
  color?: { r: number; g: number; b: number; a?: number };
  intensity?: number;
  range?: number;
}

export interface AudioEntityData extends BaseEntity {
  type: 'audio';
  clipUrl?: string;
  loop?: boolean;
  volume?: number;
  autoplay?: boolean;
}

export interface ContainerEntityData extends BaseEntity {
  type: 'container';
}

export interface VoxelEntityData extends BaseEntity {
  type: 'voxel';
  /** Opaque voxel-data blob — exact format matches WebVerse VoxelEntity serialization. */
  data?: string;
}

export type EntityData =
  | MeshEntityData | AutomobileEntityData | AirplaneEntityData
  | LightEntityData | AudioEntityData | ContainerEntityData | VoxelEntityData;
```

### 4.2 Template schema (`src/types/config.ts`)

Extend `VariantConfig` with optional type-specific fields. Loose on purpose; each `loadEntity` case reads what it needs:

```ts
export interface VariantConfig {
  variantId: string;
  name: string;
  orientations?: OrientationConfig[];
  meshUrl?: string;
  scriptUrl?: string;
  // Phase 1 additions — all optional, used by specific types
  lightType?: 'point' | 'spot' | 'directional';
  color?: { r: number; g: number; b: number; a?: number };
  intensity?: number;
  range?: number;
  clipUrl?: string;
  loop?: boolean;
  volume?: number;
  autoplay?: boolean;
  voxelData?: string;
}
```

Server-side: the `/list-entity-templates` response just passes these fields through unchanged on `VariantConfig`. No endpoint version bump.

### 4.3 `EntityManager.loadEntity` signature

Adding per-type params inline would explode the signature (already 19 params). Instead, add **one** new optional param at the end:

```ts
loadEntity(
  ...existing 19 params...,
  frozen: boolean = false,
  typeExtras?: Record<string, any>   // new — type-specific fields pulled from VariantConfig
): string
```

Callers that already pass `VariantConfig` to the global `loadEntity` pass `variantConfig` or a subset as `typeExtras`. Existing call sites (pre-Phase-1 paths) pass `undefined` — fully backwards-compatible.

### 4.4 `createEntityByType` helper (extracted)

Extract the current switch body from `loadEntity` into a private helper. This is also what future compound-child instantiation will call, so do the extraction now:

```ts
private createEntityByType(
  parentEntity: BaseEntity | null,
  type: string,
  instanceId: string,
  instanceTag: string | undefined,
  position: Vector3,
  rotation: Quaternion,
  scale: Vector3,
  meshObject: string,
  meshResources: string[],
  wheels: AutomobileEntityWheel[] | undefined,
  mass: number | undefined,
  autoType: AutomobileType | undefined,
  placingEntity: boolean,
  typeExtras?: Record<string, any>,
): void {
  switch (type) {
    case 'mesh': /* unchanged */ break;
    case 'automobile': /* unchanged */ break;
    case 'airplane': /* unchanged */ break;
    case 'light':
      LightEntity.Create(parentEntity, position, rotation, instanceId, instanceTag,
        'onLightEntityLoadedGeneric');
      // light-type / color / intensity / range applied in the load callback
      break;
    case 'audio':
      AudioEntity.Create(parentEntity, position, rotation, instanceId, instanceTag,
        'onAudioEntityLoadedGeneric');
      break;
    case 'container':
      ContainerEntity.Create(parentEntity, position, rotation, scale, false, instanceId, instanceTag,
        'onContainerEntityLoadedGeneric');
      break;
    case 'voxel':
      VoxelEntity.Create(parentEntity, position, rotation, scale, instanceId, instanceTag,
        'onVoxelEntityLoadedGeneric');
      break;
    default:
      throw new Error(`Unknown entity type: ${type}`);
  }
}
```

**Important:** the three new types' `Create` signatures take **no** type-specific params (color, intensity, clip URL, etc.). Those are applied via entity methods/properties after the load callback fires, inside the per-type `onXxxEntityLoadedGeneric` handler, by reading from `typeExtras` stashed in `pendingPlacements[instanceId]` — same pattern already used for automobile wheels/mass.

### 4.5 Per-type load callbacks

Mirror the existing `onMeshEntityLoadedGeneric` (non-placing variant only for Phase 1; placing-variant is a follow-up once dock UX supports the new types). Each handler:

1. Pulls `typeExtras` + placement metadata from `(globalThis as any).pendingPlacements[entity.id]`.
2. Applies type-specific props (color/intensity for light, clip for audio, voxel-data for voxel).
3. Calls the common `finishLoadingPlacedEntity` pipeline (terrain snap, script attach).

Example (`onLightEntityLoadedGeneric`):

```ts
(globalThis as any).onLightEntityLoadedGeneric = (entity: LightEntity) => {
  const meta = (globalThis as any).pendingPlacements?.[entity.id.ToString()];
  const x = meta?.typeExtras;
  if (x) {
    if (x.lightType) entity.SetLightType(x.lightType);           // verify method name in d.ts
    if (x.color) entity.SetColor(x.color);
    if (typeof x.intensity === 'number') entity.SetIntensity(x.intensity);
    if (typeof x.range === 'number') entity.SetRange(x.range);
  }
  this.finishLoadingPlacedEntity(entity.id.ToString());
};
```

Exact method names (`SetLightType`, `SetColor`, etc.) will be confirmed against `worldapi.d.ts` during implementation. If a property setter is missing, log a warning and continue — don't fail the load.

### 4.6 Smoke test fixtures

Add four fixtures to `src/testing/fixtures.ts` — no asset dependency, so no `skipIf`:

```ts
{ name: 'point light',  type: 'light',     expectedCallback: 'onLightEntityLoadedGeneric',
  config: { lightType: 'point', color: { r: 1, g: 0.8, b: 0.4 }, intensity: 3, range: 5 } },
{ name: 'audio source', type: 'audio',     expectedCallback: 'onAudioEntityLoadedGeneric',
  config: { clipUrl: url('ambient.mp3'), loop: true, volume: 0.5 }, skipIf: () => !hasAssets() },
{ name: 'container',    type: 'container', expectedCallback: 'onContainerEntityLoadedGeneric',
  config: {} },
{ name: 'voxel',        type: 'voxel',     expectedCallback: 'onVoxelEntityLoadedGeneric',
  config: {} },
```

Light and container run without `testAssetsBase`. Audio skips without assets. Voxel runs but stays empty without voxelData.

### 4.7 Smoke test runner update

`EntityTypeSmokeTest.invokeLoadEntity` needs to pass the new `typeExtras` param. Tiny diff — splat `fx.config` into `typeExtras`, existing fields (meshUrl, wheels, mass) continue being read positionally.

### 4.8 Dock UX

Out of scope for Phase 1. Templates of new types appear in the dock via the existing `addTool` flow as soon as the server returns them — but clicking a light-template from the dock won't work properly until `placingEntity=true` is wired for the new types (Phase 1 follow-up). Authors seed new-type instances via `instances.json` or the smoke harness for now.

## 5. Risks & open questions

| Risk | Mitigation |
|---|---|
| Exact WebVerse property-setter names (e.g. `SetLightType` vs `SetType`) | **Confirmed during pre-impl review:** `LightEntity` uses `SetLightType(LightType enum)` + composite `SetLightProperties(color, temperature, intensity)` — no per-property setters. `AudioEntity` uses direct property assignment (`loop`, `volume`, `pitch`) + `LoadAudioClipFromWAV(path)`. |
| `VoxelEntity` data format | **No opaque loader exists.** `VoxelEntity` is authored via per-block `SetBlock(x,y,z,type,subType)` + `SetBlockInfo(id, info)`. Phase 1 creates an **empty voxel entity** — authoring flow is separate. Removed `voxelData` from config. |
| Audio clip format | `LoadAudioClipFromWAV` only supports `.wav`. MP3/OGG unsupported at this API level. Fixture updated to use `.wav`. |
| Color value range | `Color` uses 0–1 floats (inferred from static constants like `red = (1,0,0,1)` despite docstring saying 0–255). Config feeds 0–1 as documented. |
| `LightType` is a numeric enum | Map string `'point' | 'spot' | 'directional'` to `LightType.Point / Spot / Directional` in the callback. |
| `Create` for new types returns the entity synchronously but load callback may or may not fire | Verify per-type; if no callback fires, treat creation itself as success in the smoke test (pass immediately). Document per-type. |
| Placing-variant callbacks not implemented | Dock UX for new types is deferred. Using the edit toolbar on a light-template in Phase 1 will log an error. Acceptable — authored via instances.json. |
| Extra fields on `VariantConfig` break existing config parse | All new fields optional; no validator changes. |
| Compounds will reuse `createEntityByType` | Extraction done here primes it. Compound spec can reference this helper. |

## 6. Acceptance criteria

- `tsc --noEmit` passes.
- `loadEntity(null, null, <id>, 'smoke', 'e', 'v', undefined, 'light', pos, Quaternion.identity, Vector3.one, '', [], undefined, undefined, undefined, undefined, false, false, { lightType: 'point', color: {...}, intensity: 3 })` creates a `LightEntity` with those props applied.
- Same for `audio`, `container`, `voxel` (with type-appropriate extras).
- Smoke test with `?testMode=entities` and no `testAssetsBase` reports `2/4 PASS (2 skipped)` — light, container pass; audio skipped; voxel depends on whether empty-voxel load fires callback (verify).
- With `testAssetsBase`: all 4 pass (plus the 3 existing).
- Existing `mesh` / `automobile` / `airplane` paths unaffected (regression check via existing fixtures).
- `VariantConfig` parse of a template with the new optional fields doesn't reject or warn.

## 7. Implementation plan (order)

1. **Type system** — extend `EntityType` union, add per-type data interfaces, extend `VariantConfig`.
2. **Extract `createEntityByType`** — refactor existing switch out of `loadEntity` into the new helper, keep behavior identical. Run existing smoke fixtures to confirm no regression.
3. **Add `typeExtras` param** to `loadEntity` and thread through to the helper + `pendingPlacements`.
4. **New cases** — one type at a time, wired end-to-end (case + callback + fixture):
   - `light`
   - `container`
   - `audio`
   - `voxel`
5. **Smoke runner** — pass `typeExtras` from `fx.config`.
6. **Manual test** — run `?testMode=entities` in WebVerse, confirm grid shows the new entities, logs show `N/N PASS`.

Each step a separable PR. Step 2 is the one to verify most carefully — pure refactor, zero behavior change.

## 8. Future work (explicitly deferred)

- **Phase 1b:** canvas-nested types (`text`, `image`) once compound support ships.
- **Phase 2:** `water`, `water-blocker` (environmental, more complex schema).
- **Phase 3:** interactive UI types (`button`, `input`, `dropdown`) — need script-binding story and in-world property editor UX.
- **Placing variants** (`onXxxEntityLoadedGenericPlacing`) for the new types — enables dock placement UX.
- **Server-side:** templates admin UI to author new-type variants. Out of scope here.

---

**End of spec.** Ready for your review.
