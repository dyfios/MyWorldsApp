# planet-v2 — clean Epic 6 client implementation

Second-attempt at the MyWorlds Planet System client. Coexists with `../planet/`
so the v1 implementation stays available for reference / fallback while v2
matures. Activated via `?worldType=planet-v2&...`.

## Why v2

v1 was built before the runtime constraints of WebVerse's JINT JS engine were
fully understood. By the time we'd characterized them, v1 had async/await
threaded through the chunk-fetch / streamer / tick path and was deeply coupled
to a Promise-based mental model that JINT's microtask scheduler doesn't
support reliably. v2 starts from those characterized constraints and applies
the lessons.

## Lessons baked in (with the cost they imposed on v1)

1. **Callback-driven, not Promise-driven, across the IO boundary.** JINT's
   microtask scheduler does not reliably resume awaiters that suspend on
   callback-resolved Promises. v2 uses callbacks (global function names +
   `timeHandler.CallAsynchronously`) for every async surface: MQTT
   request/response, terrain-load completion, mesh-load completion. The same
   idiom WebVerse's own `TiledSurfaceRenderer` and `StaticSurfaceRenderer`
   use, and the same idiom that made `PlanetMvpLoader` work end-to-end while
   v1 `MqttChunkSource` (Promise-based) hung silently.

2. **Synchronous streamer and tick.** No async/await. `tick(camera)` and
   `streamer.update(camera, candidates)` complete in the calling frame; layer
   loads kick off callback-registered work and return immediately.

3. **Real types from C#, not from `worldapi.d.ts`.** The d.ts has lied about
   `MQTTClient` (constructor signature, callback contract), `TerrainEntityLayer`
   (field names: real names are `diffuseTexture` / `normalTexture` /
   `maskTexture` / `sizeFactor`, not `diffuse` / `normal` / `mask` / `tileSize`),
   and `MeshEntity`. v2's type declarations live in `webverse-types.ts` and
   were verified against the actual C# source; the d.ts is reference-only.

4. **JINT runtime gotchas catalogued in one place.** `jint-runtime.ts` holds
   the polyfills + reference comments:
   - `Time.SetTimeout(logic: string, **milliseconds**: int)` — NOT seconds.
     `Time.SetInterval(logic: string, **seconds**: float)` — yes, different
     units. v1 had a `setTimeout` polyfill that divided by 1000 and fired
     every timer 1000× too fast.
   - `Date.now` is missing — use `new Date().getTime()`.
   - `setTimeout` / `clearTimeout` are missing — polyfilled here.
   - Callback contracts are bare global function names; WebVerse invokes via
     `timeHandler.CallAsynchronously(name, [args])` (HTTPNetworking.cs:343
     pattern). The earlier `Run(expr.Replace("?", varName))` pattern only
     ever worked when the substituted variable name was a JS global, which
     it usually wasn't.

5. **Visible stubs, not silent scaffolds.** `TileMeshLayer.load` and
   `ImpostorSphere.initialize` throw `Error('not implemented — Story 5.6 +
   5.7 + 6.5')`. Tests that exercise them assert that throw. v1 marked
   Story 6.5 done with green tests for URL-builder + slot-tracker code that
   never actually rendered a mesh; the resulting "9 Unity Terrains tiled in
   XZ" mess flowed directly from that false-positive.

6. **Match the architecture, don't speculate around it.** When the
   `_bmad-output/planning-artifacts/architecture-myworlds-planet-system.md`
   says "lazy mesh bake, in-memory LRU cache 256, glTF 2.0 + Draco",
   v2 follows the contract. The mesh-baking work itself is the addendum
   `addendum-tile-mesh-baking.md` (Stories 5.6 + 5.7) — out of scope for v2's
   first pass, in scope for v2's second.

7. **Single-chunk end-to-end before multi-chunk.** v1 jumped to a 3×3 ring
   before validating one chunk through the production code path; the
   resulting bugs were a mash of three issues (Promise hangs, sea-level
   fitting drift, position offsets) that only became separable after each
   was fixed. v2 ships single-chunk first, then adds multi-chunk + promote/
   demote (Story 6.6) once the single-chunk path is proven.

## What's in v2 today

- `webverse-types.ts` — type declarations verified against WebVerse C# source
- `jint-runtime.ts` — `setTimeout` / `clearTimeout` polyfills (ms units),
  unique-callback-name allocator, `safeLog` helpers
- `types.ts` — `ChunkKey`, `ChunkData`, `IChunkSource`, `RenderPhase`,
  `CameraState`, `StreamingBudget`, `PlanetSceneConfig`, `ILayer`
- `CubeCornerPolicy.ts` — corner detection (Story 6.7)
- `MqttChunkSource.ts` — callback-based chunk fetcher
- `TerrainEntityLayer.ts` — close-range Unity Terrain renderer (Story 6.6,
  single-chunk scope)
- `TileMeshLayer.ts` — STUBBED (throws — Story 6.5 / 5.6 / 5.7)
- `ImpostorSphere.ts` — STUBBED (throws — Story 6.4)
- `ChunkStreamer.ts` — sync mark-and-sweep + LRU (Story 6.3)
- `GlobeRenderer.ts` — orchestrator (Story 6.1, single-chunk scope)
- `*.test.ts` — Vitest, runtime-gated where the WebVerse globals matter

## What's NOT in v2 today (explicitly)

- Multi-chunk rendering. v2 currently loads only the chunk the player is on.
  3×3 candidate ring + promote/demote across boundaries is Story 6.6's
  follow-on once mesh layer is real.
- TileMesh rendering. Stub throws.
- Impostor sphere. Stub throws.
- Cube-sphere placement. v2 places the chunk at world (0, *, 0) — flat XZ,
  same simplification as v1. True sphere-tangent rotation is a future epic.
- MeshBaker server-side work. Stories 5.6 + 5.7 per the addendum.
- Floating-origin integration. Story 6.2 (re-port from v1's pattern).
- Reconnect manager, terrain modify, sync. Epics 7 + 8 — port forward
  once core renderer is stable.

## How to run

URL: `?worldType=planet-v2&planetId=<id>&mqttHost=<host>&mqttPort=9001&mqttTransport=websockets[&face=0&lod=5&cx=15&cy=15][&tileMeshDebug=cardinal]`

Defaults: `mqttPort=9001`, `mqttTransport=websockets`, single chunk at
face=0/lod=5/cx=15/cy=15. The chunk position is centered on world origin so
the player's spawn lands on it.

`tileMeshDebug` (optional, debug) — emit same-face neighbors as candidates
so the dispatcher routes them to TileMeshLayer (the player chunk still
goes to TerrainEntity). `cardinal` or `1` → 4 neighbors (N/E/S/W); `ring`
→ 8 neighbors (adds diagonals). Off-face neighbors are dropped (Story 6.7
handles cube-corner crossings). Lets you exercise the full chunk-mesh
fetch + MeshEntity.Create path before Story 6.6 multi-chunk lights up
properly.
