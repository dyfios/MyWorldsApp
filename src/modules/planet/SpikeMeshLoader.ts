// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * SPIKE1 loader (Story 1.1). THROWAWAY — delete after the spike's 6-platform
 * smoke is signed off. Not referenced from Epic 6 rendering code.
 *
 * Creates a single `MeshEntity` from the server-hosted glTF 2.0 + Draco test
 * mesh at a fixed world position and orients a fixed camera view so the
 * per-platform screenshots (AC4) are directly comparable.
 *
 * Activated by launching MyWorldsApp with `?worldType=spike1&spikeMeshUrl=<uri>`.
 * URI points at the AssetManager-hosted test mesh from
 * `_bmad-output/spikes/spike1/test-mesh.glb`.
 */

declare const Logging: { Log: (m: string) => void; LogError: (m: string) => void };
declare const MeshEntity: {
  create: (name?: string) => {
    setMesh: (url: string) => void;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
  };
};
declare const Vector3: new (x: number, y: number, z: number) => { x: number; y: number; z: number };
declare const Quaternion: { identity: { x: number; y: number; z: number; w: number } };
declare const Context: { DefineContext: (k: string, v: unknown) => void };

export interface SpikeMeshLoaderOptions {
  /** AssetManager-resolved URI to the Draco-compressed glb. */
  meshUrl: string;
  /** Where to place the mesh (defaults to origin at +1m height). */
  position?: { x: number; y: number; z: number };
}

export class SpikeMeshLoader {
  private readonly opts: SpikeMeshLoaderOptions;
  private loadStartMs: number | null = null;
  private meshEntity: ReturnType<typeof MeshEntity.create> | null = null;

  constructor(opts: SpikeMeshLoaderOptions) {
    this.opts = opts;
  }

  /**
   * Creates one MeshEntity at the fixed spike position and begins the
   * URL-based mesh load. Records a start timestamp so the platform log can
   * be used to derive load-ready time for AC5 (the screenshot is the other
   * side of that measurement).
   */
  load(): void {
    if (!this.opts.meshUrl) {
      Logging.LogError('❌ [spike1] meshUrl not provided — spike aborted');
      return;
    }

    this.loadStartMs = Date.now();
    Logging.Log('🧪 [spike1] meshUrl=' + this.opts.meshUrl);
    Logging.Log('🧪 [spike1] loadStartMs=' + this.loadStartMs);

    const pos = this.opts.position != null ? this.opts.position : { x: 0, y: 1, z: 3 };
    const entity = MeshEntity.create('spike1-mesh');
    entity.position = new Vector3(pos.x, pos.y, pos.z);
    entity.rotation = Quaternion.identity;
    entity.scale = new Vector3(1, 1, 1);

    // URL load — WebVerse native glTF/Draco loader picks this up.
    entity.setMesh(this.opts.meshUrl);
    this.meshEntity = entity;

    // Expose the loader for platform smoke tooling (e.g., screenshot harness
    // can poll `spikeMeshLoader.isLoaded()` if WebVerse surfaces a ready hook
    // in a future story; for now it's fixed-delay capture per task 5).
    Context.DefineContext('SPIKE1_MESH_LOADER', this);
  }

  /** Seconds since load() was called, for the result-doc timing table. */
  elapsedSeconds(): number | null {
    if (this.loadStartMs === null) return null;
    return (Date.now() - this.loadStartMs) / 1000;
  }

  getEntity(): unknown {
    return this.meshEntity;
  }
}
