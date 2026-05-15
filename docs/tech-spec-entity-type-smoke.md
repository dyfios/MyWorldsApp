# Tech Spec: Entity Type Smoke Test Harness

**Status:** Draft
**Author:** Barry (Quick Flow)
**Date:** 2026-04-16
**Target:** `WorldHub/MyWorldsApp`

---

## 1. Problem

MyWorldsApp runs inside the Unity WebVerse-Runtime, not a browser, so standard browser/E2E test tooling doesn't reach it. The app's template/instance fetch goes through a WorldHub backend, and we don't have a good path to provision a dedicated "test kitchen" world on the backend. Yet we need to exercise every supported entity type end-to-end — `loadEntity` switch → WebVerse `Create` → per-type load callback — whenever a new type is added or the dispatch is refactored.

## 2. Goal

Ship an in-app smoke harness that, when activated via a query-param flag, spawns one instance of every supported entity type at a gridded layout, awaits each type's existing load callback, and emits a pass/fail/timeout report. Runs inside WebVerse alongside the real client — same sandbox, same code paths.

**Non-goals:**
- Replacing unit tests. Pure-logic tests (dispatch arg-mapping, compound expansion) can be added later via Vitest with WebVerse-global mocks — out of scope here.
- Automated CI. Human launches Unity WebVerse and reads the summary log. Unity batchmode automation is a future layer.
- Placement / REST / persistence. The harness bypasses those paths; it tests the spawn pipeline.
- Visual diff / screenshot validation.

## 3. Scope

| Area | In / Out |
|---|---|
| Query-param activation | In |
| Fixtures for the 3 existing types (mesh, automobile, airplane) | In |
| Runner with per-fixture timeout and summary report | In |
| Callback-wrapping approach (reuse real callbacks, don't mock) | In |
| Missing-asset handling (skip vs. fail) | In |
| Fixtures for new types (text, light, audio, etc.) | Out — added one per type as each lands |
| Compound-entity fixtures | Out — add after compound support ships |
| Visual correctness (is the light bright enough?) | Out — human eyeball only |

## 4. Design

### 4.1 Activation

Query param `testMode=entities`, read in `MyWorld.launch` after query-params parse and before the normal startup steps continue. When active:

1. Modules are constructed as normal (we need `EntityManager`, `Logging`, `Time`).
2. Login / REST template fetch / instance fetch / render-loop activation are **skipped**.
3. The harness runs, emits its summary, and the app idles (no exit — WebVerse keeps the world up so a human can walk the grid).

Rationale: bypassing login/REST keeps the test hermetic — no dependence on a backend being up or having templates defined.

### 4.2 File layout

```
src/testing/
├── EntityTypeSmokeTest.ts   # runner class, summary reporter
├── fixtures.ts              # EntityFixture[] — one per supported type
└── types.ts                 # EntityFixture, SmokeOutcome, SmokeResult
```

Dynamic-imported from `MyWorld.launch` so the harness isn't in the default bundle:

```ts
if (this.queryParams.get('testMode') === 'entities') {
  const { EntityTypeSmokeTest } = await import('./testing/EntityTypeSmokeTest');
  const { DEFAULT_FIXTURES } = await import('./testing/fixtures');
  await new EntityTypeSmokeTest(this.context).run(DEFAULT_FIXTURES);
  return;
}
```

### 4.3 Fixture shape

```ts
export type SmokeOutcome = 'pass' | 'fail' | 'timeout' | 'skipped';

export interface EntityFixture {
  name: string;                            // human-readable, used in report
  type: EntityType;                        // routes through loadEntity switch
  config: Partial<VariantConfig> & {
    // Type-specific fields inline. Kept loose; runner extracts what it needs.
    [key: string]: any;
  };
  /** The existing global callback name that fires when this entity type finishes loading. */
  expectedCallback: string;
  /** Optional gate — if set and returns false, fixture is skipped (e.g. missing asset URL). */
  skipIf?: () => boolean;
}

export interface FixtureResult {
  fixture: string;
  outcome: SmokeOutcome;
  reason?: string;       // for fail / timeout / skipped
  durationMs?: number;
}

export interface SmokeResult {
  total: number;
  pass: number;
  fail: number;
  timeout: number;
  skipped: number;
  results: FixtureResult[];
}
```

### 4.4 Runner

```ts
class EntityTypeSmokeTest {
  constructor(private context: ClientContext) {}

  async run(fixtures: EntityFixture[]): Promise<SmokeResult> {
    Logging.Log(`🧪 SMOKE: starting with ${fixtures.length} fixtures`);
    const results: FixtureResult[] = [];
    for (let i = 0; i < fixtures.length; i++) {
      const fx = fixtures[i];
      if (fx.skipIf && fx.skipIf()) {
        results.push({ fixture: fx.name, outcome: 'skipped', reason: 'skipIf returned true' });
        continue;
      }
      const pos = new Vector3(i * 4, 0, 0);
      const r = await this.spawnAndWait(fx, pos, 5000);
      results.push(r);
    }
    const summary = this.summarize(results);
    this.report(summary);
    return summary;
  }

  private spawnAndWait(fx, pos, timeoutMs): Promise<FixtureResult> {
    // 1. Save the original global[expectedCallback]
    // 2. Install a wrapper that resolves the promise with 'pass' and calls the original
    // 3. SetTimeout-based 'timeout' resolution at timeoutMs
    // 4. Call this.context.modules.entity.loadEntity(... fx.type / fx.config / pos ...)
    //    wrapped in try/catch — synchronous throw resolves with 'fail'
    // 5. In a finally step, restore the original callback and clear the timeout marker
  }

  private summarize(results): SmokeResult { /* counts by outcome */ }

  private report(summary: SmokeResult): void {
    Logging.Log(`🧪 SMOKE RESULT: ${summary.pass}/${summary.total} PASS`);
    for (const r of summary.results) {
      if (r.outcome === 'pass') continue;
      Logging.LogWarning(`🧪   ${r.outcome.toUpperCase()}: ${r.fixture}${r.reason ? ' — ' + r.reason : ''}`);
    }
    this.context.modules.ui.showToast(
      `Smoke: ${summary.pass}/${summary.total}${summary.fail || summary.timeout ? ' (see log)' : ''}`,
      (summary.fail + summary.timeout) > 0 ? 'error' : 'info'
    );
  }
}
```

### 4.5 Callback wrapping (critical correctness piece)

**Principle:** the harness does not install fake callbacks. It wraps the real callbacks registered by `EntityManager.setupGlobalCallbacks` so the real code path runs and the fixture observes the same signal the production pipeline does.

```ts
const orig = (globalThis as any)[fx.expectedCallback];
(globalThis as any)[fx.expectedCallback] = (...args: any[]) => {
  // Check this callback invocation is for *our* instance — compare id from args
  // if matchable. Otherwise assume first-fire-after-spawn is ours (fixtures run
  // sequentially so there is no concurrent spawn to confuse things).
  if (orig) { try { orig.apply(null, args); } catch (e) { Logging.LogError(`original callback threw: ${e}`); } }
  resolve({ fixture: fx.name, outcome: 'pass', durationMs: Date.now() - started });
};
// Restore in finally.
```

Because fixtures run **sequentially** (not concurrently), we don't need per-instance id matching in v1. Document this as an invariant.

### 4.6 Missing-asset handling

Fixtures that require asset URLs set `skipIf: () => !process.env.HAS_TEST_ASSETS` — but since there's no `process.env` in WebVerse, use a harness-level config flag instead:

```ts
// In fixtures.ts
const ASSETS_BASE = (globalThis as any).testAssetsBase as string | undefined;
const hasAssets = () => typeof ASSETS_BASE === 'string' && ASSETS_BASE.length > 0;

export const DEFAULT_FIXTURES: EntityFixture[] = [
  { name: 'basic mesh', type: 'mesh',
    config: { meshUrl: ASSETS_BASE + '/cube.glb' },
    expectedCallback: 'onMeshEntityLoadedGeneric',
    skipIf: () => !hasAssets() },
  // …
];
```

Set via a second query param: `?testMode=entities&testAssetsBase=https://…/`. If absent, asset-dependent fixtures are reported as `skipped` — the report distinguishes skip from fail. Engine-only types that need no external asset (e.g. `text`, `light`, `container` once those land) have no `skipIf` and run unconditionally.

### 4.7 Initial fixture list

```ts
{ name: 'basic mesh',    type: 'mesh',       expectedCallback: 'onMeshEntityLoadedGeneric',       skipIf: () => !hasAssets(), config: { meshUrl: ASSETS_BASE + '/cube.glb' } },
{ name: 'automobile',    type: 'automobile', expectedCallback: 'onAutomobileEntityLoadedGeneric', skipIf: () => !hasAssets(), config: { meshUrl: ASSETS_BASE + '/car.glb', wheels: [...], mass: 1000 } },
{ name: 'airplane',      type: 'airplane',   expectedCallback: 'onAirplaneEntityLoadedGeneric',   skipIf: () => !hasAssets(), config: { meshUrl: ASSETS_BASE + '/plane.glb', mass: 2000 } },
```

This list grows by one entry as each new type from the earlier entity-types spec lands.

## 5. Risks & open questions

| Risk | Mitigation |
|---|---|
| `loadEntity` requires `parentEntity` — what do we pass in smoke mode? | World root / tiledsurfacerenderer stub provides `getTerrainTileForIndex` returning null; pass null or a no-parent sentinel. Verify during impl — may require a tiny stub. |
| Load callback might fire synchronously, before the wrapper is installed | Install wrapper **before** calling `loadEntity`. Runner code enforces this ordering. |
| Concurrent spawns would confuse first-fire-after-spawn matching | v1 runs fixtures sequentially. Document the invariant. |
| Automobile/airplane need wheels/mass params | Provide sane defaults in fixtures. If absent, current `loadEntity` throws — runner's try/catch reports `fail` with the error message. Good — that's the surface we want exercised. |
| Bundle size bloat in production | Dynamic `import('./testing/*')` — code only loaded when `testMode=entities`. |
| Report only visible in log | Acceptable for v1. Toast gives a coarse pass/fail. Later: write structured result to `WorldStorage` so external tooling can poll. |
| No way to know which test assets exist | User passes `testAssetsBase` query param pointing at an accessible asset host. Fixtures without it report `skipped`. |

## 6. Acceptance criteria

- `?testMode=entities` skips normal startup; modules init but login/template/instance/render-loop steps don't run.
- With no `testAssetsBase`: all asset-dependent fixtures report `skipped`, harness emits `0/0 PASS (3 skipped)` without errors.
- With a working `testAssetsBase`: the 3 fixtures spawn on a grid (x = 0, 4, 8); each load callback fires; report shows `3/3 PASS`.
- Forcing a timeout (e.g. invalid mesh URL) yields `timeout` outcome for that fixture after 5s; other fixtures continue.
- Forcing a synchronous throw (e.g. missing `mass` for airplane) yields `fail` with the thrown message; other fixtures continue.
- `tsc --noEmit` passes.
- Dynamic import means `dist/myworlds-client.umd.js` without test-mode is no larger than before (sanity check: `wc -c` before/after).

## 7. Implementation plan (order)

1. **Scaffold** `src/testing/{types.ts, fixtures.ts, EntityTypeSmokeTest.ts}` with stubs. Compile clean.
2. **Runner** — fixture iteration, callback wrapping, timeout, summary. Console-only report.
3. **Fixtures** — the 3 existing-type entries with `skipIf` on asset base.
4. **`MyWorld.launch` wiring** — query-param branch with dynamic import.
5. **Toast wiring** — after runner returns, call `ui.showToast`.
6. **Manual test matrix** — run in WebVerse: no-assets, with-assets, forced-timeout (bad URL), forced-fail (missing param).

Each step ships independently. Steps 1–4 can land in one PR; 5–6 tighten it up.

## 8. Future work (explicitly deferred)

- Per-instance id matching when we need concurrent spawns.
- Compound-entity fixtures (post-compound-support merge).
- Vitest unit tests with WebVerse-global mocks for pure dispatch logic.
- Unity batchmode CI that launches WebVerse, loads the test URL, captures logs, exits with the pass count.
- Structured result into `WorldStorage` / a REST callback for external dashboarding.

---

**End of spec.** Ready for your review.
