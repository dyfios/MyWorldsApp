# Tech Spec: Optimistic-with-Rollback REST Synchronization

**Status:** Draft
**Author:** Barry (Quick Flow)
**Date:** 2026-04-15
**Target:** `WorldHub/MyWorldsApp`

---

## 1. Problem

World mutations (entity place, entity delete, terrain dig/build) apply visually the instant the user acts. The REST call that persists the change is fire-and-forget — its reply is ignored. If the server rejects the request, drops it, or times out, the client and server diverge silently. A subsequent reload surfaces the inconsistency.

## 2. Goal

Keep the snappy visual feel (optimistic apply) while making every mutation server-authoritative: on ack commit, on reject/timeout roll back.

**Non-goals:**
- Pessimistic (ghost-preview) rendering.
- Reconciling conflicts between multiple clients — the existing `SyncManager`/`VOSSynchronizer` path owns that.
- Rewriting `REST.ts`.

## 3. Scope

| Operation | REST method | Module | Rollback strategy |
|---|---|---|---|
| Entity place | `sendPositionEntityRequest` | `EntityManager` | Destroy locally-spawned entity handle |
| Entity delete | `sendDeleteEntityRequest` | `EntityManager` | Hide-on-request, destroy-on-ack, un-hide-on-reject |
| Terrain dig | `sendTerrainDigRequest` | `EnvironmentModifier` | Re-apply cached heightmap patch |
| Terrain build | `sendTerrainBuildRequest` | `EnvironmentModifier` | Re-apply cached heightmap patch |

Out of scope for this spec: `AddEntityInstance`, metadata/read endpoints (they already resolve via promises or are idempotent reads).

## 4. Design

### 4.1 New module: `PendingOpRegistry`

Single source of truth for in-flight mutations. Owns per-request ids, timeout scheduling, and rollback invocation.

**File:** `src/modules/PendingOpRegistry.ts`

**Public shape:**

```ts
interface PendingOp {
  id: string;
  rollback: () => void;
  description: string; // for logging / toasts
}

class PendingOpRegistry {
  register(op: Omit<PendingOp, 'id'>, timeoutMs?: number): {
    id: string;
    onFinishedName: string;   // single global callback for HTTPNetworking
  };
  commit(id: string): void;   // drops entry, no rollback
  fail(id: string, reason: string): void; // invokes rollback
  dispose(): void;            // fail all pending
}
```

**Behavior:**
- `register()` generates a UUID via `UUID.NewUUID()`, wires `onHTTPDone_<id>` onto `globalThis`. The callback inspects `response.status`: 2xx → `commit(id)`; anything else → `fail(id, statusText)`.
- Schedules a non-cancellable `Time.SetTimeout` whose body calls `globalThis.onHTTPTimeout_<id>()`, which invokes `registry.timeoutCheck(id)` — a no-op if the op already committed/failed, otherwise `fail(id, 'timeout')`.
- Cleans up the globals on commit / fail / timeout — whichever fires first.

**Constraint discovered during review:** WebVerse's `HTTPNetworking.Fetch/Post` only accept a single `onFinished` callback string (no separate error callback), and `Time.SetTimeout` returns `boolean` (not cancellable). The shape above accommodates both.

**Why a registry, not per-op wrappers:** one place to audit stuck ops, one timeout budget, one lifecycle hook for `ClientContext.dispose()`.

### 4.2 Wiring into `ClientContext`

- Add `pendingOps: PendingOpRegistry` to `Modules` (between `sync` and `ui`, alphabetical-ish).
- Instantiate in `Modules` constructor, dispose in `Modules.dispose()`.
- Injected into `EntityManager` and `EnvironmentModifier` via a setter or via `ClientContext` reference.

### 4.3 Entity place

**Current flow:** `EntityManager.MW_Entity_LoadEntity` spawns the entity, then (presumably) calls `sendPositionEntityRequest`.

**New flow:**
1. Spawn entity locally, keep handle.
2. `registry.register({ rollback: () => destroyEntity(handle), description: 'place entity' })`.
3. Pass returned `onCompleteName` / `onErrorName` into `sendPositionEntityRequest` as the `onComplete` argument (REST.ts currently accepts only one callback name — see §6).
4. On commit, server-assigned instance id (from reply payload) is reconciled with the local handle's temporary id.

### 4.4 Entity delete — **DEFERRED**

**Discovery during implementation:** `sendDeleteEntityRequest` has zero callers in the codebase. `EnvironmentModifier.deleteEntity` calls `entity.Delete(true)` directly with no server persistence. The hide/unhide pattern can't be applied because there is no REST round-trip to gate against.

Prerequisite work before this task can land:
1. Define the delete REST contract (endpoint, response shape — match `accepted`/rejected pattern from create-entity).
2. Wire `EnvironmentModifier.deleteEntity` to call `sendDeleteEntityRequest` (or its successor).
3. Refactor `REST.sendDeleteEntityRequest` from Promise-based to callback-based to fit the registry.
4. Then apply hide-on-request → ack-on-success → un-hide-on-fail.

### 4.5 Terrain dig/build

**Current flow:** `EnvironmentModifier` applies the brush locally (`terrainEntity.Dig` / `.Build`), fires `sendTerrainDigRequest` / `sendTerrainBuildRequest`.

**v1 (shipped):** Inverse-operation rollback. On failure, the registry rolls back a `Dig` by calling `Build` at the same point/brush/layer, and vice versa. Tiny diff, uses existing API surface, no heightmap snapshot needed.

**Limitation accepted:** if the brush's neighbour-merge clamped against existing terrain, the inverse op won't restore the exact original heightmap. Visually close in most cases; bookkeeping correct (entity + sync state are not affected).

**v2 (deferred):**
1. Compute the AABB the brush touches: `(regionX, regionY, minX, minY, maxX, maxY)` derived from `hitPoint` + `brushSize`.
2. Snapshot pre-edit `float[][]` heights for that AABB only (~16×16 floats max ≈ 1KB).
3. Apply the brush locally; register rollback that calls a `restorePatch(region, aabb, snapshot)` helper.
4. Add per-AABB lock to reject overlapping strokes while one is pending.

v2 requires a WebVerse heightmap-write API beyond `Dig`/`Build` — verify before scheduling.

## 5. UX

- **Toast on failure:** `UIManager` exposes `showToast(message: string, severity: 'error' | 'info')`. Failure rollback fires a toast: "Couldn't place entity — try again" / "Terrain change rejected" / etc.
- **No success toast.** Silent ack = snappy feel preserved.
- **Timeout budget:** 8s default. Configurable per-op-type in the registry.

## 6. Changes to `REST.ts`

**None required.** Methods already accept `onComplete: string`; callers will pass the registry-supplied callback name. The registry's callback handles both success and failure dispatch internally by inspecting response status.

`sendDeleteEntityRequest` currently returns `Promise<void>` via an internal `delete()` helper that already does per-request-id callback wiring. Good prior art — `PendingOpRegistry` generalizes exactly this pattern. We may switch the delete path to go through the registry for consistency, but the existing signature stays.

## 7. Risks & open questions

| Risk | Mitigation |
|---|---|
| HTTPNetworking doesn't expose a distinct error callback | **Confirmed: single callback only.** Registry dispatches by inspecting `response.status` (2xx → commit, else → fail). |
| `Time.SetTimeout` is not cancellable | **Confirmed.** Timeout body calls `registry.timeoutCheck(id)` which is a no-op once the op resolved. |
| Timeout but server *did* persist (network blip on reply only) | User redoes action → duplicate on server. Acceptable for v1; server-side idempotency via `instanceid` already partly handles entity place. |
| Concurrent overlapping terrain strokes | v1: lock per-AABB while pending. v2: patch-stack rollback. |
| Timeout fires during tab background (Time.SetTimeout semantics) | Document; revisit if it bites. |
| Test coverage | Zero tests exist today. Spec assumes Quinn/GLaDOS do a follow-up pass on the registry unit tests before expanding coverage. |

## 8. Implementation plan (order)

1. **`PendingOpRegistry`** — standalone module, no callers yet. ~150 LOC.
2. **REST.ts** — add `onError` param to the four mutating methods.
3. **Entity place** — simplest payoff; server already returns canonical instance id.
4. **Entity delete** — hide/unhide wiring.
5. **Terrain dig/build** — patch snapshot + AABB lock.
6. **UIManager toast** — if not already present.

Each step ships independently; steps 3–5 can land in separate PRs.

## 9. Acceptance criteria

- All four mutations roll back cleanly on simulated 500/timeout (verified manually with devtools throttling + a mock failing endpoint).
- No `globalThis.onHTTPComplete_*` / `onHTTPError_*` leaks after 100 successful round-trips (inspected in console).
- Existing non-mutating REST calls unaffected.
- `ClientContext.dispose()` fails all pending ops and clears all timers.

---

**End of spec.** Ready for your review before I touch any code.
