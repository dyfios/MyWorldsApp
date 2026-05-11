// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * GlobeRenderer (planet-v2) — orchestrator.
 *
 * Owns the planet scene's lifecycle for one player session:
 *   - Constructs the 3 layers (Impostor / TileMesh / TerrainEntity) and a
 *     ChunkStreamer driven by a per-frame tick.
 *   - Routes each candidate to the appropriate layer based on the V1
 *     simplification "player chunk → TerrainEntity, all others → TileMesh,
 *     far → Impostor". v2 first pass renders single chunk only; multi-chunk
 *     promote/demote (Story 6.6) lights up once TileMeshLayer is real
 *     (Stories 5.6 + 5.7 + 6.5 — currently stubbed visibly).
 *   - Provides a sync `tick(camera)` entrypoint that the world-type's
 *     interval driver calls.
 *
 * No async/await on the hot path. Initialize is sync. Tick is sync. Layer
 * loads are sync (callback-driven for actual async work).
 */

import {
  ChunkStreamer,
  type ILayerDispatcher,
  type ILayerEndpoint,
} from './ChunkStreamer.js';
import { ImpostorSphere } from './ImpostorSphere.js';
import { TileMeshLayer } from './TileMeshLayer.js';
import { TerrainEntityLayer } from './TerrainEntityLayer.js';
import { shouldUseTerrainEntity } from './CubeCornerPolicy.js';
import { chunkAtOffset, chunkOffset } from './FaceTraversal.js';
import {
  DEFAULT_BUDGET,
  WEBGL_BUDGET,
  RenderPhase,
  phaseForAltitude,
  type CameraState,
  type ChunkData,
  type ChunkKey,
  type IChunkSource,
  type PlanetSceneConfig,
} from './types.js';
import { logError, logInfo, logWarn } from './jint-runtime.js';

export interface GlobeRendererDeps {
  isWebGL?: boolean;
  /** Player avatar entity for floating-origin (Story 6.2). Optional. */
  playerAvatarEntity?: unknown;
  /** Chunk-fetch backend. Without it the renderer runs in scaffold mode. */
  chunkSource?: IChunkSource;
  /** Override candidate list (tests + V1 single-chunk). */
  candidateProvider?: (camera: CameraState) => ChunkKey[];
  /**
   * Override which key is treated as "the chunk the player is standing on"
   * (forces TerrainEntity for that one). v2 first pass treats every
   * candidate as the player chunk if there's only one — multi-chunk +
   * dynamic detection comes with Story 6.6.
   */
  playerChunkProvider?: (camera: CameraState) => ChunkKey | null;
}

export class GlobeRenderer {
  private cfg: PlanetSceneConfig | null = null;
  private deps: GlobeRendererDeps = {};
  /** Resolved at initialize — `deps.isWebGL` falls back to `detectWebGL()` */
  private isWebGL = false;
  private streamer: ChunkStreamer | null = null;
  private impostor: ImpostorSphere | null = null;
  private tileMesh: TileMeshLayer | null = null;
  private terrainEntity: TerrainEntityLayer | null = null;
  /** Cache of fetched chunk data so the layer dispatcher's load() is sync. */
  private readonly chunkCache = new Map<string, ChunkData>();
  /** Keys for which a chunk fetch is in flight (prevents dup requests). */
  private readonly inflight = new Set<string>();
  /**
   * Story 6.6 (option 2): keys for which we've pre-loaded a hidden
   * TerrainEntity in approach-zone reconciliation. The streamer doesn't
   * own these slots — they're out-of-band, managed by tick()'s
   * reconcile pass. Promoted out (via setActive) when the player
   * crosses; disposed when the player walks out of the approach zone.
   */
  private readonly preCreated = new Set<string>();
  /**
   * Story 6.6 (option 2, mesh side): the chunk the player is currently
   * standing on, as of the last tick(). Kept so the TileMesh adapter's
   * unload (fired by the streamer when this chunk promotes to
   * TerrainEntity) can switch the mesh to hidden-but-resident instead
   * of disposing it. When the player crosses out, the hidden mesh
   * flips visible instantly — no fetch, no MeshEntity.Create cost at
   * the boundary.
   */
  private currentPlayerKey: ChunkKey | null = null;
  /**
   * The chunk the player MOST RECENTLY EXITED (set whenever
   * currentPlayerKey changes). The approach reconciliation skips this
   * key so we don't burn a fresh TerrainEntity init for the chunk we
   * just demoted off — the player is standing right at the boundary
   * immediately after crossing, so computeApproaches will always re-
   * propose it. Cleared once it drops out of the approach set (the
   * player has walked far enough that we no longer "see" it), so the
   * normal flow resumes if they later double back.
   */
  private lastPlayerKey: ChunkKey | null = null;
  private disposed = false;

  /** Synchronous initialize. */
  initialize(cfg: PlanetSceneConfig, deps: GlobeRendererDeps = {}): void {
    if (this.streamer) {
      throw new Error('GlobeRenderer.initialize: already initialized');
    }
    this.cfg = cfg;
    this.deps = deps;
    const isWebGL = deps.isWebGL ?? detectWebGL();
    this.isWebGL = isWebGL;
    const budget = isWebGL ? WEBGL_BUDGET : DEFAULT_BUDGET;

    this.terrainEntity = new TerrainEntityLayer(cfg, isWebGL);
    // TileMeshLayer needs the chunkSource to fetch baked meshes (Story 6.5).
    // When no source is configured (scaffold mode), pass a no-op stub so
    // construction doesn't throw — the dispatcher will still skip the layer
    // when it can't render anything useful.
    this.tileMesh = new TileMeshLayer(cfg, {
      chunkSource: deps.chunkSource ?? makeNullChunkSource(),
    });
    this.impostor = new ImpostorSphere(cfg);
    // ImpostorSphere.initialize() is currently a throwing stub — only call
    // it once Story 6.4 is live. v2 first pass leaves the impostor inactive.

    const dispatcher: ILayerDispatcher = {
      layerFor: (key, camera) => this.layerFor(key, camera),
    };
    this.streamer = new ChunkStreamer(dispatcher, budget);

    // Bootstrap floating-origin (Story 6.2). v2 deliberately takes the same
    // approach as v1: hand the avatar to WebVerse's auto-reorigin and let
    // the runtime's `worldOffsetUpdateThreshold` do the work.
    this.bootstrapFloatingOrigin();

    logInfo(
      `planet-v2 GlobeRenderer initialized planetId=${cfg.planetId} radius=${cfg.radiusMeters}m nExp=${cfg.nExponent} isWebGL=${isWebGL}`,
    );
  }

  private debugLogTick = 0;

  /** Single tick. Sync. Called by the world-type's interval driver. */
  tick(camera: CameraState): void {
    if (!this.streamer || !this.cfg) return;
    const candidates = this.deps.candidateProvider
      ? this.deps.candidateProvider(camera)
      : [];

    // Story 6.6 — pre-fetch heights ONLY for the player chunk and its
    // immediate cardinal neighbors (the chunks that might soon need a
    // hidden TerrainEntity for cross-the-boundary smoothing). Heights
    // payloads are ~6 MB each on the wire; pre-fetching the whole 25-
    // chunk candidate ring would push 150+ MB through MQTT at world
    // startup and stall the broker. Mesh fetches (handled by
    // TileMeshLayer.load when the streamer pushes a candidate into
    // TileMesh phase) are tiny by comparison (~15 KB each) and load
    // for the full outer ring without trouble.
    //
    // kickChunkFetch is idempotent on the inflight set — repeat calls
    // no-op once the request is in flight or cached.
    const playerKey = this.deps.playerChunkProvider?.(camera) ?? null;
    // Detect crossings: if the player chunk just changed, remember the
    // one we exited so reconcileApproachTerrains can skip it (we just
    // demoted its TerrainEntity; rebuilding a hidden replica next tick
    // would be wasted work).
    if (
      this.currentPlayerKey &&
      playerKey &&
      !chunkKeysEqual(this.currentPlayerKey, playerKey)
    ) {
      this.lastPlayerKey = this.currentPlayerKey;
    }
    // Stash before streamer.update so the TileMesh adapter's unload
    // (which fires when this chunk's slot phase-changes to TerrainEntity)
    // can read it and decide hide-vs-delete.
    this.currentPlayerKey = playerKey;
    if (playerKey) this.kickChunkFetch(playerKey);
    const approaches = playerKey ? this.computeApproaches(camera, playerKey) : [];
    for (const k of approaches) this.kickChunkFetch(k);

    this.streamer.update(camera, candidates);

    // Story 6.6 (option 2): reconcile pre-loaded hidden TerrainEntities
    // against the current approach set. Pre-create for new approaches
    // (where heights have arrived); dispose for keys that fell out of
    // the approach set without being promoted to active. Runs after
    // streamer.update so the active player chunk is already known by
    // the layer and won't be touched here.
    if (playerKey && this.terrainEntity) {
      this.reconcileApproachTerrains(approaches, playerKey);
    }

    // Story 6.6 (option 2, mesh side): the streamer just routed the
    // player chunk to TerrainEntity, so it never asks TileMesh to keep
    // a slot there. If we want a hidden mesh waiting for the inevitable
    // boundary crossing, we have to fire that load ourselves — out of
    // band, the same way reconcileApproachTerrains works for the TE
    // side. Idempotent: if a slot already exists, the layer no-ops.
    if (playerKey && this.tileMesh) {
      this.reconcilePlayerMesh(playerKey);
    }

    // Periodic debug dump — every ~10 ticks (~5s at 0.5s tick interval).
    // Prints the state of the streamer slots + each layer's tracked
    // tiles relative to the origin chunk. Helps correlate "no mesh
    // here" observations with which slot/layer thinks it owns that
    // chunk. Off by default; toggle via ?planetDebug=1.
    this.debugLogTick++;
    if (this.debugLogTick % 10 === 0) {
      const debugFlag = (globalThis as Record<string, unknown>).__pv2DebugDump;
      if (debugFlag) this.dumpDebugState(playerKey);
    }
  }

  private dumpDebugState(playerKey: ChunkKey | null): void {
    if (!this.cfg?.originChunk || !this.streamer) return;
    const ox = this.cfg.originChunk.cx;
    const oy = this.cfg.originChunk.cy;
    const dir = (cx: number, cy: number): string => {
      const dx = cx - ox;
      const dz = cy - oy;
      const fx = dx === 0 ? '0' : dx > 0 ? `+${dx}` : `${dx}`;
      const fz = dz === 0 ? '0' : dz > 0 ? `+${dz}` : `${dz}`;
      return `${fx},${fz}`;
    };
    const playerTag = playerKey ? dir(playerKey.cx, playerKey.cy) : '?';

    const streamerSlots: string[] = [];
    for (const { key, layerId } of this.streamer.snapshot()) {
      streamerSlots.push(`${dir(key.cx, key.cy)}=${layerId === 'terrain-entity' ? 'TE' : 'TM'}`);
    }
    streamerSlots.sort();

    const meshTiles: string[] = [];
    if (this.tileMesh) {
      for (const { key, stage, active } of this.tileMesh.snapshot()) {
        // letter = stage (f/c/r/u); uppercase if active, lowercase if hidden.
        // Lets us see at a glance whether the player chunk's pre-loaded mesh
        // is sitting around hidden (e.g. `0,0=r` lowercase = ready+hidden).
        const stageLetter = stage[0] ?? '?';
        const marker = active ? stageLetter.toUpperCase() : stageLetter.toLowerCase();
        meshTiles.push(`${dir(key.cx, key.cy)}=${marker}`);
      }
      meshTiles.sort();
    }
    const terrainTiles: string[] = [];
    if (this.terrainEntity) {
      for (const { key, active, ready } of this.terrainEntity.snapshot()) {
        terrainTiles.push(`${dir(key.cx, key.cy)}=${active ? 'A' : 'H'}${ready ? 'R' : 'L'}`);
      }
      terrainTiles.sort();
    }

    logInfo(
      `planet-v2 debug player=${playerTag} | ` +
      `streamer{${streamerSlots.join(' ')}} | ` +
      `mesh{${meshTiles.join(' ')}} | ` +
      `terrain{${terrainTiles.join(' ')}}`,
    );
  }

  /**
   * Reconcile the approach set with the layer's pre-loaded hidden
   * TerrainEntities. For each approach key with cached heights and no
   * existing tile: pre-load hidden. For each previously-pre-loaded key
   * not in the approach set (and not the active player chunk): dispose
   * via layer.unload — frees its Unity terrain memory.
   */
  private reconcileApproachTerrains(approaches: ChunkKey[], playerKey: ChunkKey): void {
    if (!this.terrainEntity) return;
    const approachIds = new Set(approaches.map((k) => chunkKeyId(k)));
    const playerId = chunkKeyId(playerKey);
    const lastId = this.lastPlayerKey ? chunkKeyId(this.lastPlayerKey) : null;

    // Clear lastPlayerKey once the player has walked far enough that the
    // just-exited chunk is no longer in the approach zone. After that we
    // want the normal flow back: if the player ever returns, a fresh
    // hidden TE rebuild is fine because we're no longer paying it
    // repeatedly per tick along a forward path.
    if (lastId && !approachIds.has(lastId)) {
      this.lastPlayerKey = null;
    }

    // Pre-create where missing. Skip lastPlayerKey — we just demoted its
    // TerrainEntity on the crossing tick; rebuilding a hidden replica
    // right behind the player is wasted Unity terrain init.
    for (const k of approaches) {
      const id = chunkKeyId(k);
      if (id === playerId) continue;
      if (lastId && id === lastId) continue;
      if (this.terrainEntity.hasTile(k)) continue;
      const cached = this.chunkCache.get(id);
      if (!cached) continue;
      // Heights arrive — pre-load hidden. Future tick: if the player
      // crosses, the adapter's load() finds hasTile and just calls
      // setActive() — instant.
      this.terrainEntity.load(k, cached, { startActive: false });
      this.preCreated.add(id);
    }

    // Dispose pre-loaded tiles that left the approach set without being
    // promoted. The streamer never tracked them, so their cleanup is
    // our responsibility.
    for (const id of Array.from(this.preCreated)) {
      if (id === playerId) {
        // Got promoted to player chunk via the adapter; preCreated entry
        // already removed there, but defensive.
        this.preCreated.delete(id);
        continue;
      }
      if (approachIds.has(id)) continue; // still approaching — keep
      // Player walked out of approach zone without crossing; reclaim memory.
      const tile = parseChunkKeyId(id);
      if (tile) {
        this.terrainEntity.unload(tile);
      }
      this.preCreated.delete(id);
    }
  }

  /**
   * Ensure the player's current chunk has a hidden TileMesh ready. The
   * streamer routes the player chunk to TerrainEntity, so it never asks
   * TileMesh to keep a slot there — but the moment the player crosses
   * out, the streamer will phase-change the chunk back to TileMesh and
   * expect the mesh to materialize instantly. Pre-loading hidden makes
   * the crossing a `setActive` flip instead of a fresh fetch.
   *
   * The hidden tile is disposed naturally: when the player crosses
   * away, the adapter's load() finds the slot and calls setActive; if
   * the player teleports out of range, the streamer's sweep on the
   * normal mesh-side path will unload it. (When the player IS standing
   * on it, the adapter's unload() flips to setHidden instead of
   * deleting — see adaptTileMesh below.)
   */
  private reconcilePlayerMesh(playerKey: ChunkKey): void {
    if (!this.tileMesh || !this.cfg) return;
    if (this.tileMesh.hasTile(playerKey)) return; // already tracked

    const sideMeters =
      (Math.PI * this.cfg.radiusMeters) / (2 * (1 << playerKey.lod));
    const placeholder: ChunkData = {
      planetId: this.cfg.planetId,
      face: playerKey.face,
      lod: playerKey.lod,
      cx: playerKey.cx,
      cy: playerKey.cy,
      length: sideMeters,
      width: sideMeters,
      height: 1500,
      heights: [],
    };
    this.tileMesh.load(playerKey, placeholder, { startActive: false });
  }

  /**
   * Identify chunks the player is currently approaching: any neighbor
   * whose shared boundary with the player chunk is within
   * `APPROACH_METERS` of the player's local-XZ position. Off-face
   * neighbors are dropped — Story 6.7 handles face crossings.
   *
   * Returns 0–4 keys. Used by tick() for two purposes: kick heights
   * pre-fetches (so the data is cached when needed) and then reconcile
   * pre-loaded hidden TerrainEntities (so the swap on cross is instant).
   */
  private computeApproaches(camera: CameraState, playerKey: ChunkKey): ChunkKey[] {
    if (!this.cfg?.originChunk) return [];
    const APPROACH_METERS = 50;
    const sideMeters = (Math.PI * this.cfg.radiusMeters) / (2 * (1 << playerKey.lod));
    // Use chunkOffset so the player's world position is computed relative
    // to the renderer's origin chunk even when they've crossed onto an
    // equator-neighbor face. Falling back to 0 means we treat the player
    // as on the origin chunk for offset purposes — only triggers when
    // they're somewhere FaceTraversal can't represent (off-equator N/S).
    const origin: ChunkKey = {
      face: this.cfg.originChunk.face,
      lod: playerKey.lod,
      cx: this.cfg.originChunk.cx,
      cy: this.cfg.originChunk.cy,
    };
    const off = chunkOffset(playerKey, origin) ?? { dx: 0, dz: 0 };
    const playerWorldX = off.dx * sideMeters;
    const playerWorldZ = off.dz * sideMeters;
    const localX = camera.position.x - playerWorldX;
    const localZ = camera.position.z - playerWorldZ;
    const out: ChunkKey[] = [];

    // Use chunkAtOffset so neighbours follow the equator wrap; null when
    // a ±1 hop would cross a rotated edge (Phase 2b) — silently dropped.
    const push = (dx: number, dz: number): void => {
      const k = chunkAtOffset(playerKey, dx, dz);
      if (k) out.push(k);
    };
    if (localX < APPROACH_METERS) push(-1, 0);
    if (localX > sideMeters - APPROACH_METERS) push(1, 0);
    if (localZ < APPROACH_METERS) push(0, -1);
    if (localZ > sideMeters - APPROACH_METERS) push(0, 1);
    return out;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.streamer?.disposeAll();
    this.streamer = null;
    this.impostor?.dispose();
    this.impostor = null;
    this.tileMesh?.dispose();
    this.tileMesh = null;
    this.terrainEntity?.dispose();
    this.terrainEntity = null;
    this.chunkCache.clear();
    this.inflight.clear();
    this.preCreated.clear();
    this.currentPlayerKey = null;
    this.lastPlayerKey = null;
    logInfo('planet-v2 GlobeRenderer disposed');
  }

  /* ──────────────────── Layer dispatch ───────────────────────────────── */

  private layerFor(key: ChunkKey, camera: CameraState): ILayerEndpoint | null {
    if (!this.terrainEntity || !this.tileMesh || !this.impostor) return null;
    const phase = phaseForAltitude(camera.altitudeMeters);
    const playerKey = this.deps.playerChunkProvider?.(camera) ?? null;
    const isPlayerChunk =
      !!playerKey &&
      playerKey.face === key.face &&
      playerKey.lod === key.lod &&
      playerKey.cx === key.cx &&
      playerKey.cy === key.cy;

    // Player's chunk → TerrainEntity (collidable + diggable) EXCEPT at the
    // 24 cube-corner chunks (Story 6.7): a corner chunk's grid doesn't
    // tile as a rectangular Unity Terrain, so it falls back to TileMesh
    // even though the player is standing on it. They lose collidable
    // dig-the-ground at the singular corner — acceptable tradeoff, and
    // the corner is geometrically a point anyway. Also catches WebGL
    // (no TerrainEntity at all per FR17). Other chunks and explicit
    // mid-range candidates → TileMesh (visual-only). Impostor is still
    // stubbed (Story 6.4).
    const teEligible = shouldUseTerrainEntity(key, this.isWebGL);
    if (phase === RenderPhase.TerrainEntity && isPlayerChunk && teEligible) {
      return this.adaptTerrainEntity(this.terrainEntity);
    }
    if (
      phase === RenderPhase.TileMesh ||
      (phase === RenderPhase.TerrainEntity && (!isPlayerChunk || !teEligible))
    ) {
      return this.adaptTileMesh(this.tileMesh);
    }
    if (phase === RenderPhase.Impostor) {
      return null; // ImpostorSphere stubbed (Story 6.4)
    }
    return null;
  }

  /**
   * Adapt the TerrainEntityLayer to the streamer's `ILayerEndpoint` contract.
   * The streamer wants `load(key, camera): boolean` but the layer needs
   * actual chunk data. We resolve that by checking the chunk cache:
   *   - cache hit → call layer.load with the data, return result
   *   - cache miss + not in flight → kick off a chunk fetch, return false
   *     (streamer retries next tick once data arrives)
   *   - cache miss + in flight → return false (streamer retries)
   */
  private adaptTerrainEntity(layer: TerrainEntityLayer): ILayerEndpoint {
    return {
      id: 'terrain-entity',
      load: (key, _camera): boolean => {
        // Story 6.6 (option 2): if the layer already has a tile for this
        // key, it was pre-loaded hidden during approach. Just activate
        // it — instant flip from hidden to visible+collidable, no Unity
        // terrain init wait. If onLoaded hasn't fired yet, setActive
        // queues the activation for when it does.
        if (layer.hasTile(key)) {
          layer.setActive(key);
          this.preCreated.delete(chunkKeyId(key)); // promoted out of pre-loaded set
          return true;
        }
        const id = chunkKeyId(key);
        const cached = this.chunkCache.get(id);
        if (cached) {
          return layer.load(key, cached);
        }
        // Cache miss — kick off fetch (idempotent on inflight set).
        this.kickChunkFetch(key);
        return false;
      },
      unload: (key) => {
        // Streamer's eviction or phase-change demote. Drop from any
        // out-of-band tracking too.
        this.preCreated.delete(chunkKeyId(key));
        layer.unload(key);
      },
    };
  }

  /**
   * Adapt the TileMeshLayer to the streamer's `ILayerEndpoint` contract.
   * Unlike TerrainEntity (which needs the heights matrix on load),
   * TileMesh fetches its own glTF mesh from the chunk source via
   * `requestChunkMesh` — so we don't need a chunk-data cache here. The
   * load just hands the layer a placeholder ChunkData with `length`/
   * `width` derived from the chunk geometry; the layer uses those for
   * world-space positioning, ignores `heights`.
   */
  private adaptTileMesh(layer: TileMeshLayer): ILayerEndpoint {
    return {
      id: 'tile-mesh',
      load: (key, _camera): boolean => {
        if (!this.cfg) return false;
        // length/width from the same formula plugin-planet uses
        // (computeChunkMeters with V1 radius). The chunk's geometry is
        // baked server-side; the client just needs to position the
        // resulting MeshEntity at the right world-space anchor.
        const sideMeters =
          (Math.PI * this.cfg.radiusMeters) / (2 * (1 << key.lod));
        const placeholder: ChunkData = {
          planetId: this.cfg.planetId,
          face: key.face,
          lod: key.lod,
          cx: key.cx,
          cy: key.cy,
          length: sideMeters,
          width: sideMeters,
          height: 1500, // matches MeshBaker's envelope; heights matrix unused
          heights: [], // unused by TileMeshLayer.load
        };
        // The layer's load is idempotent — for the player chunk the slot
        // already exists (pre-loaded hidden in reconcilePlayerMesh), and
        // the layer flips it active. For neighbors this is a fresh load.
        return layer.load(key, placeholder);
      },
      unload: (key) => {
        // Story 6.6 (option 2, mesh side): if the streamer is unloading
        // the chunk the player is now standing on (because that chunk
        // just promoted to TerrainEntity), keep the mesh resident but
        // hidden. When the player crosses back out, the adapter's load
        // path turns it visible again — no fetch, no Create cost. For
        // every other key (neighbor that fell out of range, eviction,
        // etc.), this is a normal dispose.
        if (this.currentPlayerKey && chunkKeysEqual(key, this.currentPlayerKey)) {
          layer.setHidden(key);
          return;
        }
        layer.unload(key);
      },
    };
  }

  private kickChunkFetch(key: ChunkKey): void {
    const id = chunkKeyId(key);
    if (this.inflight.has(id)) return;
    const source = this.deps.chunkSource;
    if (!source) return;
    if (!source.isConnected()) return;
    this.inflight.add(id);
    source.requestChunk(key.face, key.lod, key.cx, key.cy, {
      onSuccess: (chunk) => {
        this.inflight.delete(id);
        if (this.disposed) return;
        this.chunkCache.set(id, chunk);
        // Caller's next `tick()` will pick up the cached data. No need to
        // poke the streamer — the candidate provider re-supplies the same
        // key on every tick.
      },
      onError: (err) => {
        this.inflight.delete(id);
        logWarn(`planet-v2 chunk fetch failed for ${id}: ${err.message}`);
      },
    });
  }

  /* ──────────────────── Floating origin bootstrap ────────────────────── */

  private bootstrapFloatingOrigin(): void {
    const avatar = this.deps.playerAvatarEntity;
    if (!avatar) return;
    try {
      const env = (globalThis as unknown as {
        Environment?: { SetTrackedCharacterEntity?: (e: unknown) => void };
      }).Environment;
      env?.SetTrackedCharacterEntity?.(avatar);
      logInfo('planet-v2: tracked character entity registered for floating origin');
    } catch (err) {
      logError(
        `planet-v2: SetTrackedCharacterEntity failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function parseChunkKeyId(id: string): ChunkKey | null {
  const parts = id.split(':');
  if (parts.length !== 4) return null;
  const [face, lod, cx, cy] = parts.map((p) => Number(p));
  if (![face, lod, cx, cy].every((n) => Number.isFinite(n))) return null;
  return { face: face as ChunkKey['face'], lod: lod!, cx: cx!, cy: cy! };
}

function chunkKeyId(k: ChunkKey): string {
  return `${k.face}:${k.lod}:${k.cx}:${k.cy}`;
}

function chunkKeysEqual(a: ChunkKey, b: ChunkKey): boolean {
  return a.face === b.face && a.lod === b.lod && a.cx === b.cx && a.cy === b.cy;
}

function detectWebGL(): boolean {
  try {
    return Boolean(
      (globalThis as unknown as { WEBVERSE_PLATFORM?: string }).WEBVERSE_PLATFORM === 'webgl',
    );
  } catch (_e) {
    return false;
  }
}

/**
 * No-op chunk source for scaffold mode. Returns isConnected=false so
 * TileMeshLayer never accepts a slot, requestChunk* fire onError if
 * called anyway. Lets the renderer construct cleanly when the caller
 * didn't supply a real source.
 */
function makeNullChunkSource(): IChunkSource {
  return {
    isConnected: () => false,
    requestChunk: (_f, _l, _x, _y, cb) =>
      cb.onError?.(new Error('GlobeRenderer: no chunkSource configured (scaffold mode)')),
    requestChunkMesh: (_f, _l, _x, _y, cb) =>
      cb.onError?.(new Error('GlobeRenderer: no chunkSource configured (scaffold mode)')),
    dispose: () => {},
  };
}
