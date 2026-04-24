/**
 * Entity-type smoke test runner.
 *
 * Exercises every supported entity type end-to-end (loadEntity switch →
 * WebVerse Create → load callback) without going through login / REST /
 * placement UX / persistence. Bypasses normal startup when activated via
 * `?testMode=entities`.
 *
 * See docs/tech-spec-entity-type-smoke.md.
 */

import type { ClientContext } from '../modules/ClientContext';
import type { EntityFixture, FixtureResult, SmokeResult } from './types';

const DEFAULT_TIMEOUT_MS = 5000;
const GRID_SPACING = 4;

export class EntityTypeSmokeTest {
  constructor(private context: ClientContext) {}

  async run(fixtures: EntityFixture[]): Promise<SmokeResult> {
    Logging.Log(`🧪 SMOKE: starting with ${fixtures.length} fixtures`);
    const results: FixtureResult[] = [];
    for (let i = 0; i < fixtures.length; i++) {
      const fx = fixtures[i];
      if (fx.skipIf && fx.skipIf()) {
        Logging.Log(`🧪   [${i + 1}/${fixtures.length}] SKIP ${fx.name}`);
        results.push({ fixture: fx.name, outcome: 'skipped', reason: 'skipIf returned true' });
        continue;
      }
      const pos = new Vector3(i * GRID_SPACING, 0, 0);
      Logging.Log(`🧪   [${i + 1}/${fixtures.length}] RUN ${fx.name} at x=${pos.x}`);
      const r = await this.spawnAndWait(fx, pos, DEFAULT_TIMEOUT_MS);
      results.push(r);
    }
    const summary = this.summarize(results);
    this.report(summary);
    return summary;
  }

  private spawnAndWait(fx: EntityFixture, pos: Vector3, timeoutMs: number): Promise<FixtureResult> {
    return new Promise<FixtureResult>((resolve) => {
      const started = Date.now();
      let settled = false;
      const settle = (r: FixtureResult) => {
        if (settled) return;
        settled = true;
        (globalThis as any)[fx.expectedCallback] = original;
        resolve(r);
      };

      // Wrap the real callback so the production code path still executes.
      const original = (globalThis as any)[fx.expectedCallback];
      (globalThis as any)[fx.expectedCallback] = (...args: any[]) => {
        if (original) {
          try { original.apply(null, args); }
          catch (e) { Logging.LogError(`🧪 original callback threw: ${e}`); }
        }
        settle({
          fixture: fx.name,
          outcome: 'pass',
          durationMs: Date.now() - started,
        });
      };

      // Timeout bounded by SetTimeout (non-cancellable; settle() guards re-entry).
      Time.SetTimeout(
        `globalThis.__smokeTimeout_${sanitize(fx.name)} && globalThis.__smokeTimeout_${sanitize(fx.name)}()`,
        timeoutMs,
      );
      (globalThis as any)[`__smokeTimeout_${sanitize(fx.name)}`] = () => {
        settle({
          fixture: fx.name,
          outcome: 'timeout',
          reason: `no callback within ${timeoutMs}ms`,
          durationMs: Date.now() - started,
        });
        delete (globalThis as any)[`__smokeTimeout_${sanitize(fx.name)}`];
      };

      // Kick off the spawn. A synchronous throw counts as fail.
      try {
        this.invokeLoadEntity(fx, pos);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        settle({
          fixture: fx.name,
          outcome: 'fail',
          reason: msg,
          durationMs: Date.now() - started,
        });
      }
    });
  }

  private invokeLoadEntity(fx: EntityFixture, pos: Vector3): void {
    const cfg: any = fx.config;
    const instanceId = UUID.NewUUID().ToString() || `smoke_${fx.name}_${Date.now()}`;
    const instanceTag = `smoke_${fx.name}`;
    const rotation = Quaternion.identity;
    const scale = new Vector3(1, 1, 1);
    const meshUrl: string = cfg.meshUrl || '';
    const meshResources: string[] = meshUrl ? [meshUrl] : [];

    this.context.modules.entity.loadEntity(
      null,                // entityIndex
      null,                // variantIndex
      instanceId,
      instanceTag,
      `smoke_${fx.name}_entity`,   // entityId
      `smoke_${fx.name}_variant`,  // variantId
      undefined,           // entityParent
      fx.type,
      pos,
      rotation,
      scale,
      meshUrl,
      meshResources,
      cfg.wheels,
      cfg.mass,
      cfg.autoType,
      cfg.scripts,
      false,               // placingEntity
      false,               // frozen
      cfg,                 // typeExtras — loadEntity reads what it needs by key
    );
  }

  private summarize(results: FixtureResult[]): SmokeResult {
    const by = (o: FixtureResult['outcome']) => results.filter((r) => r.outcome === o).length;
    return {
      total: results.length,
      pass: by('pass'),
      fail: by('fail'),
      timeout: by('timeout'),
      skipped: by('skipped'),
      results,
    };
  }

  private report(summary: SmokeResult): void {
    Logging.Log(`🧪 SMOKE RESULT: ${summary.pass}/${summary.total} PASS` +
      (summary.skipped ? ` (${summary.skipped} skipped)` : '') +
      (summary.fail ? ` (${summary.fail} fail)` : '') +
      (summary.timeout ? ` (${summary.timeout} timeout)` : ''));
    for (const r of summary.results) {
      if (r.outcome === 'pass') continue;
      const tag = r.outcome.toUpperCase();
      const detail = r.reason ? ` — ${r.reason}` : '';
      if (r.outcome === 'skipped') {
        Logging.Log(`🧪   ${tag}: ${r.fixture}${detail}`);
      } else {
        Logging.LogWarning(`🧪   ${tag}: ${r.fixture}${detail}`);
      }
    }
    const bad = summary.fail + summary.timeout;
    this.context.modules.ui.showToast(
      `Smoke: ${summary.pass}/${summary.total}${bad ? ' (see log)' : ''}`,
      bad > 0 ? 'error' : 'info',
    );
  }
}

function sanitize(name: string): string {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const ch = name.charAt(i);
    const code = name.charCodeAt(i);
    const isAlnum = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95;
    result += isAlnum ? ch : '_';
  }
  return result;
}
